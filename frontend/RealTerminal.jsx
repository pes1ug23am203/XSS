// RealTerminal Component - integrates with XssLab_v2.jsx
// Add to XssLab_v2.jsx near the top level component definitions

const RealTerminal = ({ studentId = 'default' }) => {
  const termRef = React.useRef(null);
  const xtermRef = React.useRef(null);
  const wsRef = React.useRef(null);
  const fitAddonRef = React.useRef(null);
  const [connected, setConnected] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Dynamically load xterm library from CDN
    if (!window.Terminal) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/xterm@5.2.0/lib/xterm.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/xterm@5.2.0/css/xterm.css';
        document.head.appendChild(link);
        initializeTerminal();
      };
      document.head.appendChild(script);
    } else {
      initializeTerminal();
    }

    const initializeTerminal = () => {
      if (!termRef.current) return;

      const term = new window.Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
        letterSpacing: 0,
        lineHeight: 1.2,
        scrollback: 1000,
        theme: {
          background: '#0d1117',
          foreground: '#e6edf3',
          cursor: '#00d4aa',
          cursorAccent: '#0d1117',
          selection: 'rgba(0,212,170,0.2)',
          black: '#0d1117',
          red: '#f85149',
          green: '#3fb950',
          yellow: '#d29922',
          blue: '#58a6ff',
          magenta: '#bc8cff',
          cyan: '#00d4aa',
          white: '#e6edf3',
          brightBlack: '#6e7681',
          brightRed: '#f85149',
          brightGreen: '#3fb950',
          brightYellow: '#d29922',
          brightBlue: '#58a6ff',
          brightMagenta: '#bc8cff',
          brightCyan: '#00d4aa',
          brightWhite: '#ffffff',
        }
      });

      term.open(termRef.current);
      setTimeout(() => {
        term.fit?.();
      }, 100);
      xtermRef.current = term;

      // Connect WebSocket to backend
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//localhost:3001/terminal?student=${encodeURIComponent(studentId)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        term.writeln(`\x1b[32m● Connected to container: xss-lab-${studentId}\x1b[0m`);
        term.writeln('\x1b[90mType commands below. Try: ls, nc -lknv 5555, etc\x1b[0m');
        term.writeln('');
      };

      ws.onmessage = (event) => {
        term.write(event.data);
      };

      ws.onerror = () => {
        setError('Cannot connect to terminal server. Make sure terminal-server.js is running on port 3001.');
        term.writeln('\x1b[31m● Connection failed. Run: node terminal-server.js\x1b[0m');
      };

      ws.onclose = () => {
        setConnected(false);
        term.writeln('\x1b[31m● Disconnected\x1b[0m');
      };

      // Send typed input to server
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'input', data }));
        }
      });

      // Handle terminal resize
      if (term.onResize) {
        term.onResize(({ cols, rows }) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'resize', cols, rows }));
          }
        });
      }

      return () => {
        term.dispose?.();
        ws.close();
      };
    };
  }, []);

  const sendCommand = (cmd) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: cmd + '\n' }));
    }
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1117',
      padding: 16,
      gap: 10
    }}>
      {/* Status bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 8,
        padding: '8px 14px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: connected ? '#3fb950' : '#f85149' }}>●</span>
          <span style={{ fontSize: 12, color: '#e6edf3', fontWeight: 700 }}>
            SEED Labs Terminal
          </span>
          <span style={{ fontSize: 11, color: '#8b949e' }}>
            — xss-lab-{studentId}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{
            fontSize: 10,
            padding: '2px 8px',
            background: connected ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
            border: `1px solid ${connected ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
            color: connected ? '#3fb950' : '#f85149',
            borderRadius: 4
          }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          background: 'rgba(248,81,73,0.08)',
          border: '1px solid rgba(248,81,73,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          color: '#f85149',
          flexShrink: 0
        }}>
          ⚠️ {error}
          <div style={{ marginTop: 6, color: '#8b949e', fontSize: 11 }}>
            Run <code style={{ background: '#161b22', padding: '1px 6px', borderRadius: 3 }}>node terminal-server.js</code> in your project root, then refresh.
          </div>
        </div>
      )}

      {/* Terminal window */}
      <div style={{
        flex: 1,
        border: '1px solid #30363d',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#0d1117'
      }}>
        {/* Window chrome */}
        <div style={{
          background: '#161b22',
          borderBottom: '1px solid #30363d',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#f85149', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#d29922', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3fb950', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#8b949e', marginLeft: 8 }}>
            seed@xss-lab-terminal: ~
          </span>
        </div>
        <div ref={termRef} style={{ height: 'calc(100% - 37px)' }} />
      </div>

      {/* Quick commands */}
      <div style={{
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        {[
          { label: 'ls', cmd: 'ls' },
          { label: 'pwd', cmd: 'pwd' },
          { label: 'whoami', cmd: 'whoami' },
          { label: 'docker ps', cmd: 'docker ps' },
          { label: 'nc listener', cmd: 'nc -lknv 5555' },
        ].map(({ label, cmd }) => (
          <button
            key={label}
            onClick={() => sendCommand(cmd)}
            style={{
              background: '#161b22',
              border: '1px solid #30363d',
              color: '#8b949e',
              borderRadius: 6,
              padding: '5px 12px',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'monospace',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.target.style.borderColor = '#00d4aa';
              e.target.style.color = '#00d4aa';
            }}
            onMouseLeave={e => {
              e.target.style.borderColor = '#30363d';
              e.target.style.color = '#8b949e';
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};