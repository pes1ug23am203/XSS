// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';

import labRoutes from './routes/lab.routes';
import elggRoutes from './routes/elgg.routes';
import workshopRoutes from './routes/workshop.routes';
import terminalRoutes from './routes/terminal.routes';

const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();

// Trust proxy (for docker-compose / nginx reverse proxy setups)
const trustProxyEnv = process.env.TRUST_PROXY;
if (typeof trustProxyEnv !== 'undefined') {
  const parsed = Number(trustProxyEnv);
  const val =
    trustProxyEnv === 'true' ? true
    : trustProxyEnv === 'false' ? false
    : Number.isInteger(parsed) ? parsed
    : trustProxyEnv;
  app.set('trust proxy', val);
} else {
  app.set('trust proxy', 1);
}

// Security — disable CSP so the lab frontend can load without conflicts
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — allow credentials only from explicitly configured local app origins.
const defaultCorsOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
];
const configuredCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin && origin !== '*');
const allowedCorsOrigins = new Set(
  configuredCorsOrigins.length ? configuredCorsOrigins : defaultCorsOrigins
);

app.use((req, res, next) => {
  const origin = req.header('Origin');
  if (origin && !allowedCorsOrigins.has(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedCorsOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// ── Routes ────────────────────────────────────────────────────────────────────
// Serve static files and index.html
app.use(express.static(path.join(__dirname, '../public')));

// Root route - serve index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Lab session management (start, answer, hint, complete, set-task)
app.use('/api/lab', labRoutes);

// Simulated Elgg social network (login, profile view/edit, friends, activity)
app.use('/api/elgg', elggRoutes);

// Attack Workshop — simulate XSS payload execution against Elgg
app.use('/api/workshop', workshopRoutes);

// Terminal — in-browser terminal for command execution and netcat listening
app.use('/api/terminal', terminalRoutes);

// AI Chat — Claude integration for task assistance
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system,
      messages,
    });
    res.json(response);
  } catch (err: any) {
    console.error('Chat API error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

// Gemini API proxy — bypass CORS by routing through backend
app.post('/api/gemini', async (req, res) => {
  try {
    const { model, contents, systemInstruction } = req.body as {
      model?: string;
      contents?: unknown;
      systemInstruction?: string;
    };
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey || !model) {
      return res.status(400).json({
        error: { message: 'Gemini API key not configured on backend or model missing' }
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;

    const payload: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = systemInstruction;
    }

    console.log(`[Gemini] Calling model ${model}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok) {
      console.error('[Gemini] Error response:', data);
      return res.status(response.status).json(data);
    }

    console.log('[Gemini] Response received:', !!data?.candidates);
    res.json(data);
  } catch (err: any) {
    console.error('Gemini API error:', err.message);
    res.status(500).json({ error: { message: err.message } });
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
