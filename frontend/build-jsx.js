const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const jsxFilePath = path.join(__dirname, 'XssLab_v2.jsx');
const jsFilePath = path.join(__dirname, 'XssLab_v2.js');

try {
  const code = fs.readFileSync(jsxFilePath, 'utf-8');
  
  const result = babel.transformSync(code, {
    presets: ['@babel/preset-react'],
    filename: 'XssLab_v2.jsx'
  });
  
  fs.writeFileSync(jsFilePath, result.code);
  console.log('✓ JSX transpiled successfully to XssLab_v2.js');
} catch (error) {
  console.error('✗ Error transpiling JSX:', error.message);
  process.exit(1);
}
