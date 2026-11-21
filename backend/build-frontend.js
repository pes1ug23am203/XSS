const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// Paths
const frontendDir = path.join(__dirname, '../frontend');
const publicDir = path.join(__dirname, 'public');
const jsxFile = path.join(frontendDir, 'XssLab_v2.jsx');
const realTerminalFile = path.join(frontendDir, 'RealTerminal.jsx');
const indexHtmlSrc = path.join(frontendDir, 'public', 'index.html');

// Ensure public directory exists
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('✓ Created backend/public directory');
}

// Copy index.html
try {
  fs.copyFileSync(indexHtmlSrc, path.join(publicDir, 'index.html'));
  console.log('✓ Copied index.html');
} catch (error) {
  console.error('✗ Error copying index.html:', error.message);
  process.exit(1);
}

// Transpile XssLab_v2.jsx
try {
  const code = fs.readFileSync(jsxFile, 'utf-8');
  const result = babel.transformSync(code, {
    presets: ['@babel/preset-react'],
    filename: 'XssLab_v2.jsx'
  });
  
  // Write both .jsx (for Babel standalone) and .js (transpiled)
  fs.writeFileSync(path.join(publicDir, 'XssLab_v2.jsx'), code);
  fs.writeFileSync(path.join(publicDir, 'XssLab_v2.js'), result.code);
  console.log('✓ Transpiled XssLab_v2.jsx');
} catch (error) {
  console.error('✗ Error transpiling XssLab_v2.jsx:', error.message);
  process.exit(1);
}

// Copy RealTerminal.jsx as-is (for reference, though index.html loads from build)
try {
  const terminalCode = fs.readFileSync(realTerminalFile, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'RealTerminal.jsx'), terminalCode);
  console.log('✓ Copied RealTerminal.jsx');
} catch (error) {
  console.error('✗ Error copying RealTerminal.jsx:', error.message);
}

console.log('\n✓ Frontend build complete!');
