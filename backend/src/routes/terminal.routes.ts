// src/routes/terminal.routes.ts
/**
 * Terminal API Routes
 * 
 * This module provides terminal command execution endpoints for the XSS Lab.
 * Students can run commands like `nc -lknv 5555` to listen for exfiltrated cookies.
 */

import express, { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { LabSession } from '../types';

const router = Router();

// Store active terminal sessions and netcat listeners
interface TerminalSession {
  token: string;
  sessionId: string;
  process: any;
  output: string[];
  isRunning: boolean;
  command: string;
  startTime: number;
  listeningPort?: number;
  capturedRequests: Array<{ time: number; url: string; cookies: string }>;
}

const terminalSessions = new Map<string, TerminalSession>();

/**
 * POST /api/terminal/start
 * Start a terminal session (e.g., netcat listener for cookie exfiltration)
 * 
 * Body: {
 *   labToken: string,      // Lab session token
 *   command: string,       // Command to execute (e.g., "nc -lknv 5555")
 *   sessionId: string      // Terminal session identifier
 * }
 */
router.post('/start', (req: Request, res: Response) => {
  const { labToken, command, sessionId } = req.body;

  if (!labToken || !command || !sessionId) {
    return res.status(400).json({ success: false, message: 'Missing labToken, command, or sessionId' });
  }

  // Check if session already exists
  if (terminalSessions.has(sessionId)) {
    return res.status(400).json({ success: false, message: 'Terminal session already active' });
  }

  const terminalSession: TerminalSession = {
    token: labToken,
    sessionId,
    process: null,
    output: [],
    isRunning: true,
    command,
    startTime: Date.now(),
    capturedRequests: [],
  };

  // Parse netcat command: nc -lknv 5555
  const ncMatch = command.match(/nc\s+.*?(\d+)/);
  if (ncMatch) {
    terminalSession.listeningPort = parseInt(ncMatch[1], 10);
    terminalSession.output.push(`$ ${command}`);
    terminalSession.output.push(`Listening on 0.0.0.0:${terminalSession.listeningPort}`);
    
    // Log to Node.js console so it appears in the REAL terminal
    console.log(`\n[NETCAT LISTENER STARTED]`);
    console.log(`$ ${command}`);
    console.log(`Listening on 0.0.0.0:${terminalSession.listeningPort}\n`);
  } else {
    terminalSession.output.push(`$ ${command}`);
    console.log(`\n[TERMINAL SESSION STARTED]\n$ ${command}\n`);
  }

  terminalSessions.set(sessionId, terminalSession);

  res.json({
    success: true,
    message: 'Terminal session started',
    sessionId,
    output: terminalSession.output,
  });
});

/**
 * POST /api/terminal/stop
 * Stop a terminal session
 */
router.post('/stop', (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Missing sessionId' });
  }

  const terminalSession = terminalSessions.get(sessionId);
  if (!terminalSession) {
    return res.status(404).json({ success: false, message: 'Terminal session not found' });
  }

  terminalSession.isRunning = false;
  terminalSession.output.push('');
  terminalSession.output.push('$ Stopped.');

  res.json({ success: true, message: 'Terminal session stopped', output: terminalSession.output });
});

/**
 * GET /api/terminal/output/:sessionId
 * Get terminal output and captured data
 */
router.get('/output/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const terminalSession = terminalSessions.get(sessionId);
  if (!terminalSession) {
    return res.status(404).json({ success: false, message: 'Terminal session not found' });
  }

  res.json({
    success: true,
    sessionId,
    isRunning: terminalSession.isRunning,
    output: terminalSession.output,
    capturedRequests: terminalSession.capturedRequests,
    port: terminalSession.listeningPort,
  });
});

/**
 * POST /api/terminal/input
 * Send input/command to terminal
 */
router.post('/input', (req: Request, res: Response) => {
  const { sessionId, input } = req.body;

  if (!sessionId || !input) {
    return res.status(400).json({ success: false, message: 'Missing sessionId or input' });
  }

  const terminalSession = terminalSessions.get(sessionId);
  if (!terminalSession) {
    return res.status(404).json({ success: false, message: 'Terminal session not found' });
  }

  // Simulate command execution
  terminalSession.output.push(`$ ${input}`);

  if (input === 'exit' || input === 'quit') {
    terminalSession.isRunning = false;
    terminalSession.output.push('$ Exited.');
  }

  res.json({
    success: true,
    output: terminalSession.output,
  });
});

/**
 * POST /api/terminal/capture-cookie
 * REAL attack: Netcat receives an exfiltrated cookie
 * Logs to both backend and Node.js console for real terminal visibility
 * (Called by Elgg attack when victim visits infected profile)
 */
router.post('/capture-cookie', (req: Request, res: Response) => {
  const { sessionId, from, cookie, remoteIp } = req.body;

  if (!sessionId || !from || !cookie) {
    return res.status(400).json({ success: false, message: 'Missing sessionId, from, or cookie' });
  }

  const terminalSession = terminalSessions.get(sessionId);
  if (!terminalSession) {
    const port = 5555;
    const timestamp = new Date().toLocaleTimeString();
    const clientIp = remoteIp || '10.9.0.5';
    const portNum = Math.floor(Math.random() * 60000) + 5535;

    console.log(`\n[ATTACK CAPTURED] ${timestamp}`);
    console.log(`Connection received on ${clientIp} ${portNum}`);
    console.log(`GET /?c=${encodeURIComponent(cookie)} HTTP/1.1`);
    console.log(`Host: 10.9.0.1:${port}`);
    console.log(`User-Agent: Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:83.0)`);
    console.log(`Referer: http://www.seed-server.com/profile/samy`);
    console.log(`🍪 Cookie captured from **${from}**: ${cookie}`);
    console.log(`✅ ${from}'s session token exfiltrated to attacker.\n`);

    return res.status(404).json({
      success: false,
      message: 'Terminal session not found (but attack was logged to console)',
      attackLogged: true,
    });
  }

  const listeningPort = terminalSession.listeningPort ?? 5555;

  const portNum = Math.floor(Math.random() * 60000) + 5535;
  const timestamp = new Date().toLocaleTimeString();
  const clientIp = remoteIp || '10.9.0.5';

  const requestInfo = {
    time: Date.now(),
    url: `http://10.9.0.1:${listeningPort}/?c=${cookie}`,
    cookies: cookie,
    from,
  };

  terminalSession.capturedRequests.push(requestInfo);

  // Format as real netcat output
  terminalSession.output.push(`Connection received on ${clientIp} ${portNum}`);
  terminalSession.output.push(`GET /?c=${encodeURIComponent(cookie)} HTTP/1.1`);
  terminalSession.output.push(`Host: 10.9.0.1:${terminalSession.listeningPort || 5555}`);
  terminalSession.output.push(`User-Agent: Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:83.0)`);
  terminalSession.output.push(`Referer: http://www.seed-server.com/profile/samy`);
  terminalSession.output.push('');
  terminalSession.output.push(`🍪 Cookie captured from **${from}**: ${cookie}`);
  terminalSession.output.push('');

  // IMPORTANT: Log to Node.js console so it appears in the REAL terminal where the server is running
  console.log(`\n[XSS ATTACK CAPTURED] ${timestamp}`);
  console.log(`Connection received on ${clientIp} ${portNum}`);
  console.log(`GET /?c=${encodeURIComponent(cookie)} HTTP/1.1`);
  console.log(`Host: 10.9.0.1:${terminalSession.listeningPort || 5555}`);
  console.log(`User-Agent: Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:83.0)`);
  console.log(`Referer: http://www.seed-server.com/profile/samy`);
  console.log(`🍪 Cookie captured from **${from}**: ${cookie}`);
  console.log(`✅ ${from}'s session token exfiltrated to attacker (10.9.0.1:${terminalSession.listeningPort || 5555})\n`);

  res.json({
    success: true,
    message: 'Cookie captured',
    capturedRequests: terminalSession.capturedRequests,
    output: terminalSession.output,
  });
});

/**
 * POST /api/terminal/clear
 * Clear terminal session
 */
router.post('/clear', (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Missing sessionId' });
  }

  const terminalSession = terminalSessions.get(sessionId);
  if (!terminalSession) {
    return res.status(404).json({ success: false, message: 'Terminal session not found' });
  }

  terminalSession.output = [];
  terminalSession.capturedRequests = [];

  res.json({ success: true, message: 'Terminal cleared', output: terminalSession.output });
});

/**
 * DELETE /api/terminal/cleanup
 * Clean up old terminal sessions (manual cleanup)
 */
router.delete('/cleanup', (_req: Request, res: Response) => {
  const now = Date.now();
  const ttl = 1 * 60 * 60 * 1000; // 1 hour

  let cleaned = 0;
  for (const [sessionId, session] of terminalSessions.entries()) {
    if (now - session.startTime > ttl) {
      terminalSessions.delete(sessionId);
      cleaned++;
    }
  }

  res.json({ success: true, cleaned, remaining: terminalSessions.size });
});

export default router;
