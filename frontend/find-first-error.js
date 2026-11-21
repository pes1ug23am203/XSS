const fs = require('fs');
const code = fs.readFileSync('XssLab_v2.jsx', 'utf8');
const lines = code.split('\n');

// Check balance more carefully
let braces = 0;
let inString = false, stringChar = '';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inTemplate = false;
  
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    const prev = j > 0 ? line[j-1] : '';
    
    if (ch === '`' && prev !== '\\') inTemplate = !inTemplate;
    if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
      if (!inString) { inString = true; stringChar = ch; }
      else if (stringChar === ch) inString = false;
    }
    
    if (!inString && !inTemplate) {
      if (ch === '{') braces++;
      if (ch === '}') braces--;
    }
  }
  
  // Print lines where balance first goes negative
  if (braces < 0) {
    console.log(`Line ${i+1}: balance = ${braces}, content:`);
    console.log(`  ${line}`);
    if (i > 0) {
      console.log(`  prev: ${lines[i-1]}`);
    }
    if (braces < -3) break; // Stop after first few errors
  }
}
