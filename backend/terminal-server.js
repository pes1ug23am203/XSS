const express = require('express');
const { WebSocketServer } = require('ws');
const pty = require('node-pty');
const http = require('http');
const os = require('os');
const { execSync } = require('child_process');
const proxy = require('express-http-proxy');
const url = require('url');

const app = express();
const server = http.createServer(app);
const defaultOrigins = [
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(origin => origin && origin !== '*');
const allowedOrigins = new Set(configuredOrigins.length ? configuredOrigins : defaultOrigins);

// Separate WS servers in noServer mode - we'll handle upgrades manually
const wss = new WebSocketServer({ noServer: true });
const headerWss = new WebSocketServer({ noServer: true });

// Track active student containers and shells
const studentShells = new Map(); // studentId -> shell process
const studentWsSessions = new Map(); // studentId -> Set of WebSocket connections (terminal)
const headerClients = new Map(); // studentId -> Set of WebSocket connections (headers panel)
const capturedRequests = new Map(); // studentId -> array of captured requests

// Handle headers panel WebSocket connections
headerWss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const studentId = url.searchParams.get('student') || 'default';
  console.log(`[Headers WS] Panel connected for student: ${studentId}`);
  if (!headerClients.has(studentId)) headerClients.set(studentId, new Set());
  headerClients.get(studentId).add(ws);
  ws.on('close', () => {
    headerClients.get(studentId)?.delete(ws);
    console.log(`[Headers WS] Panel disconnected for student: ${studentId}`);
  });
  ws.on('error', (err) => console.error(`[Headers WS] Error for student ${studentId}:`, err));
});

// Middleware - Skip for WebSocket paths
app.use((req, res, next) => {
  // Skip all middleware for WebSocket upgrade requests
  if (req.headers.upgrade === 'websocket') {
    return next();
  }
  next();
});

app.use(express.json());

// CORS configuration to allow requests from web server
app.use((req, res, next) => {
  // Skip CORS for WebSocket upgrade requests (they use Upgrade header)
  if (req.headers.upgrade === 'websocket') {
    return next();
  }

  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.sendStatus(403);
  }

  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Student-ID');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ── HTTP CAPTURE SYSTEM ─────────────────────────────────────────────────────
// Capture HTTP requests and responses for display in HttpHeadersPanel
function captureHttpRequest(studentId, method, url, requestHeaders, requestBody, responseStatus, responseHeaders) {
  const capture = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    method,
    url,
    requestHeaders,
    requestBody: requestBody ? (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)) : null,
    responseStatus,
    responseHeaders,
    type: url.includes('friends/add') ? 'ADD_FRIEND'
        : url.includes('profile/edit') ? 'PROFILE_EDIT'
        : url.includes('steal') ? 'COOKIE_STEAL'
        : 'XHR',
  };
  
  // Store in map
  if (!capturedRequests.has(studentId)) {
    capturedRequests.set(studentId, []);
  }
  capturedRequests.get(studentId).push(capture);
  
  // Broadcast to all WebSocket clients for this student
  broadcastCaptureToStudent(studentId, capture);
  
  return capture;
}

// Broadcast HTTP capture to all headers panel WebSocket clients for a student
function broadcastCaptureToStudent(studentId, capture) {
  headerClients.get(studentId)?.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: 'http_capture', data: capture }));
    }
  });
}

// ── ELGG PROXY ROUTES ───────────────────────────────────────────────────────────────────────────
// Proxy /elgg/* requests to real Elgg backend, capturing headers for HttpHeadersPanel
app.use('/elgg', (req, res, next) => {
  // Skip for WebSocket upgrade requests
  if (req.headers.upgrade === 'websocket') {
    return next();
  }
  
  const studentId = req.query.student || req.headers['x-student-id'] || 'default';
  const method = req.method;
  const targetUrl = 'http://www.seed-server.com' + req.url.replace('/elgg', '');
  const reqHeaders = { ...req.headers };
  const reqBody = req.body ? new URLSearchParams(req.body).toString() : null;

  const capture = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    method,
    url: targetUrl,
    requestHeaders: reqHeaders,
    requestBody: reqBody,
    responseStatus: '…',
    responseHeaders: {},
    type: targetUrl.includes('friends/add') ? 'ADD_FRIEND'
        : targetUrl.includes('profile/edit') ? 'PROFILE_EDIT'
        : 'XHR',
  };

  // Store and broadcast immediately so panel sees it even if proxy fails
  if (!capturedRequests.has(studentId)) capturedRequests.set(studentId, []);
  capturedRequests.get(studentId).push(capture);
  headerClients.get(studentId)?.forEach(ws => {
    if (ws.readyState === ws.OPEN)
      ws.send(JSON.stringify({ type: 'http_capture', data: capture }));
  });

  // Hook res.on('finish') to update status after proxy responds
  res.on('finish', () => {
    capture.responseStatus = res.statusCode;
    capture.responseHeaders = res.getHeaders();
    // Re-broadcast updated capture with real response status
    headerClients.get(studentId)?.forEach(ws => {
      if (ws.readyState === ws.OPEN)
        ws.send(JSON.stringify({ type: 'http_capture_update', data: capture }));
    });
  });

  next();
}, proxy(process.env.ELGG_PROXY_TARGET || 'http://localhost:8080', {
  proxyReqPathResolver: (req) => {
    const path = req.url.replace('/elgg', '') || '/';
    return path;
  },
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['Host'] = 'www.app.local';
    return proxyReqOpts;
  },
}));

// ── GET ALL CAPTURED REQUESTS ───────────────────────────────────────────────
app.get('/api/captures', (req, res) => {
  const studentId = req.query.student || 'default';
  const captures = capturedRequests.get(studentId) || [];
  res.json({ success: true, studentId, captures, count: captures.length });
});

// ── CLEAR CAPTURES ──────────────────────────────────────────────────────────
app.post('/api/captures/clear', (req, res) => {
  const studentId = req.query.student || req.body.student || 'default';
  capturedRequests.delete(studentId);
  res.json({ success: true, message: `Cleared captures for student ${studentId}` });
});


// Sanitise a studentId string so it's safe as a Docker container name
// Input: "AM203_Pooja" → "AM203_Pooja"  (already clean)
// Docker names: [a-zA-Z0-9][a-zA-Z0-9_.-]*
function sanitiseContainerId(raw) {
  return (raw || 'default').replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^[^a-zA-Z0-9]/, 'x');
}

// Ensure student Docker container exists and is running
function ensureStudentContainer(studentId) {
  const safeId = sanitiseContainerId(studentId);
  const containerName = `xss-lab-${safeId}`;
  
  try {
    // Check if container exists using docker ps -a
    const listOutput = execSync(`docker ps -a --filter "name=${containerName}" --format "{{.ID}}"`).toString().trim();
    
    if (listOutput) {
      // Container exists, check if it's running
      const runningOutput = execSync(`docker ps --filter "name=${containerName}" --format "{{.ID}}"`).toString().trim();
      
      if (runningOutput) {
        console.log(`Container ${containerName} already running`);
        return containerName;
      } else {
        // Container exists but not running, start it
        console.log(`Starting existing container ${containerName}`);
        execSync(`docker start ${containerName}`);
        return containerName;
      }
    } else {
      // Container doesn't exist, create and run it
      console.log(`Creating new container ${containerName}`);
      execSync(`docker run -d --name ${containerName} xss-lab-terminal sleep 999999`);
      console.log(`Container ${containerName} created and started`);
      return containerName;
    }
  } catch (err) {
    console.error(`Failed to manage container ${containerName}:`, err.message);
    throw new Error(`Docker container creation failed. Make sure 'docker build -t xss-lab-terminal -f Dockerfile .' was run first.`);
  }
}

// REST endpoint: Initialize student container
app.post('/api/student/:studentId/init', (req, res) => {
  try {
    const { studentId } = req.params;
    const containerName = ensureStudentContainer(studentId);
    res.json({ 
      success: true, 
      studentId, 
      container: containerName,
      message: `Container initialized for student ${studentId}`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// REST endpoint: Get student container status
app.get('/api/student/:studentId/status', (req, res) => {
  const { studentId } = req.params;
  const containerName = `xss-lab-${sanitiseContainerId(studentId)}`;
  
  try {
    const status = execSync(`docker inspect --format='{{.State.Running}}' ${containerName} 2>/dev/null`, { encoding: 'utf8' }).trim();
    const isRunning = status === 'true';
    
    res.json({
      success: true,
      studentId,
      container: containerName,
      running: isRunning
    });
  } catch {
    res.json({
      success: false,
      studentId,
      container: containerName,
      running: false,
      error: 'Container not found'
    });
  }
});

// REST endpoint: Stop/cleanup student container (optional)
app.delete('/api/student/:studentId/cleanup', (req, res) => {
  try {
    const { studentId } = req.params;
    const containerName = `xss-lab-${sanitiseContainerId(studentId)}`;
    
    // Kill any active shells for this student
    if (studentShells.has(studentId)) {
      const shell = studentShells.get(studentId);
      shell.kill();
      studentShells.delete(studentId);
    }
    
    // Close all WebSocket connections for this student
    if (studentWsSessions.has(studentId)) {
      studentWsSessions.get(studentId).forEach(ws => ws.close());
      studentWsSessions.delete(studentId);
    }
    
    // Stop and remove container
    try {
      execSync(`docker stop ${containerName} 2>/dev/null`);
      execSync(`docker rm ${containerName} 2>/dev/null`);
    } catch {}
    
    res.json({ success: true, message: `Cleaned up student ${studentId}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// WebSocket: Handle terminal connections per student
wss.on('connection', (ws, req) => {
  // Extract student ID from query parameter or header
  const url = new URL(req.url, `http://${req.headers.host}`);
  const studentId = url.searchParams.get('student') || 'default';
  
  console.log(`Terminal connection from student: ${studentId}`);
  
  try {
    // Ensure container exists for this student
    const containerName = ensureStudentContainer(studentId);
    
    // Track this WebSocket session
    if (!studentWsSessions.has(studentId)) {
      studentWsSessions.set(studentId, new Set());
    }
    studentWsSessions.get(studentId).add(ws);
    
    // Spawn shell for this student's container
    let shell;
    try {
      shell = pty.spawn('docker', [
        'exec', '-it', containerName, '/bin/bash'
      ], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          STUDENT_ID: studentId
        }
      });
    } catch (spawnErr) {
      console.error(`Failed to spawn PTY for student ${studentId}:`, spawnErr.message);
      ws.send(`\x1b[31m✗ Terminal initialization failed\x1b[0m\r\n`);
      ws.send(`\x1b[31mError: ${spawnErr.message}\x1b[0m\r\n`);
      ws.close();
      return;
    }
    
    // Store shell reference
    studentShells.set(studentId, shell);
    
    // Handle shell errors
    shell.on('error', (err) => {
      console.error(`Shell error for student ${studentId}:`, err.message);
      if (ws.readyState === ws.OPEN) {
        ws.send(`\x1b[31m✗ Terminal error: ${err.message}\x1b[0m\r\n`);
        ws.close();
      }
    });
    
    // Send welcome message
    ws.send(`\x1b[32m● Connected to Student Container ${studentId}\x1b[0m\r\n`);
    ws.send(`\x1b[32m● Container: ${containerName}\x1b[0m\r\n`);
    ws.send('\x1b[90mYour attacks and changes are isolated to this container\x1b[0m\r\n');

    // Stream output to browser
    shell.onData((data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data);
      }
    });

    shell.onExit(({ exitCode }) => {
      console.log(`Shell for student ${studentId} exited:`, exitCode);
      ws.close();
    });

    // Receive input and resize events from browser
    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg);
        if (data.type === 'resize') {
          shell.resize(data.cols, data.rows);
          return;
        }
        if (data.type === 'input') {
          shell.write(data.data);
          return;
        }
      } catch(e) {
        // Raw input (not JSON)
        shell.write(msg.toString());
      }
    });

    ws.on('close', () => {
      console.log(`Closing terminal for student ${studentId}`);
      shell.kill();
      // Remove from tracked sessions
      if (studentWsSessions.has(studentId)) {
        studentWsSessions.get(studentId).delete(ws);
      }
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error for student ${studentId}:`, err);
    });

  } catch (err) {
    console.error(`Failed to initialize terminal for student ${studentId}:`, err.message);
    ws.send(`\x1b[31m✗ Error: ${err.message}\x1b[0m\r\n`);
    ws.send('\x1b[31mMake sure Docker is running and container image exists.\x1b[0m\r\n');
    ws.send('\x1b[33mRun: docker build -t xss-lab-terminal -f Dockerfile .\x1b[0m\r\n');
    ws.close();
  }
});

// HELPER: Broadcast message to all WebSocket sessions for a student
function broadcastToStudent(studentId, message) {
  if (studentWsSessions.has(studentId)) {
    studentWsSessions.get(studentId).forEach(ws => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }
}

// REST endpoint: STEAL - receives cookies from victim's img tag, broadcasts to terminal
app.get('/steal', (req, res) => {
  const cookie = req.query.c || '';
  const studentId = req.query.student || 'default';
  
  // Simulate real nc source port
  const srcPort = Math.floor(40000 + Math.random() * 10000);
  const decoded = decodeURIComponent(cookie);
  
  // Format output EXACTLY like real netcat
  const output = [
    `\r\n\x1b[32mConnection received on 10.9.0.5 ${srcPort}\x1b[0m`,
    `\r\n\x1b[36mGET /?c=${cookie} HTTP/1.1\x1b[0m`,
    `\r\nHost: 10.9.0.1:5555`,
    `\r\nUser-Agent: Mozilla/5.0`,
    `\r\nReferer: http://www.seed-server.com/profile/samy`,
    `\r\nConnection: keep-alive`,
    `\r\n`,
    `\r\n\x1b[33m🍪 Cookie captured: \x1b[31m${decoded}\x1b[0m`,
    `\r\n`,
  ].join('');
  
  // Broadcast to all terminal connections for this student
  broadcastToStudent(studentId, output);
  
  // Also broadcast as structured http_capture to the headers panel
  const stealCapture = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    method: 'GET',
    url: `http://10.9.0.1:5555?c=${cookie}`,
    requestHeaders: {
      'User-Agent': 'Mozilla/5.0',
      'Referer': 'http://www.seed-server.com/profile/samy',
      'Cookie': decodeURIComponent(cookie).slice(0, 60) + '…',
    },
    requestBody: null,
    responseStatus: '200 (gif)',
    responseHeaders: { 'Content-Type': 'image/gif' },
    type: 'COOKIE_STEAL',
  };
  headerClients.get(studentId)?.forEach(ws => {
    if (ws.readyState === ws.OPEN)
      ws.send(JSON.stringify({ type: 'http_capture', data: stealCapture }));
  });
  
  // Log it
  console.log(`[STEAL] Student ${studentId} captured cookie: ${decoded}`);
  
  // Return transparent gif so img tag doesn't show broken image
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': gif.length });
  res.end(gif);
});

// ── WEBSOCKET UPGRADE HANDLER ───────────────────────────────────────────
server.on('upgrade', (req, socket, head) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  
  if (parsedUrl.pathname === '/terminal') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else if (parsedUrl.pathname === '/headers') {
    headerWss.handleUpgrade(req, socket, head, (ws) => {
      headerWss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

// Server startup
const terminalHost = process.env.TERMINAL_HOST || '127.0.0.1';
server.listen(3001, terminalHost, () => {
  console.log('='.repeat(60));
  console.log(`Terminal Server Running on ${terminalHost}:3001`);
  console.log('='.repeat(60));
  console.log('');
  console.log('Multi-Student Docker Container Setup:');
  console.log('');
  console.log('✓ Each student gets an isolated container');
  console.log('✓ Container name: xss-lab-[SRN_SUFFIX_Name]  e.g. xss-lab-AM203_Pooja');
  console.log('✓ Automatically created on first connection');
  console.log('');
  console.log('REST API Endpoints:');
  console.log('  POST   /api/student/:studentId/init     - Initialize container');
  console.log('  GET    /api/student/:studentId/status   - Check container status');
  console.log('  DELETE /api/student/:studentId/cleanup  - Stop & remove container');
  console.log('');
  console.log('WebSocket Connections:');
  console.log('  ws://localhost:3001/terminal?student=[studentId]  ← PTY shell');
  console.log('  ws://localhost:3001/headers?student=[studentId]   ← HTTP captures');
  console.log('');
  console.log('='.repeat(60));
});