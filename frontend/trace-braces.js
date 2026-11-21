const fs = require('fs');
const lines = fs.readFileSync('XssLab_v2.jsx', 'utf8').split('\n');

// Focus on lines 1040-1090 and count braces per line
let totalBraces = 0;
for (let i = 1039; i < 1090 && i < lines.length; i++) {
  const line = lines[i];
  let lineBraces = 0;
  let inString = false, stringChar = '';
  
  for (const ch of line) {
    if ((ch === '"' || ch === "'" || ch === '`') && !inString) {
      inString = true;
      stringChar = ch;
    } else if (ch === stringChar && inString) {
      inString = false;
    } else if (!inString) {
      if (ch === '{') lineBraces++;
      if (ch === '}') lineBraces--;
    }
  }
  
  totalBraces += lineBraces;
  if (lineBraces !== 0 || (i >= 1045 && i <= 1088)) {
    const sign = lineBraces > 0 ? '+' : '';
    console.log(`Line ${i+1}: lineBraces=${sign}${lineBraces}, totalBraces=${totalBraces}`);
  }
}
