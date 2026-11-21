const fs = require('fs');
const code = fs.readFileSync('XssLab_v2.jsx', 'utf8');
const lines = code.split('\n');

let totalBraces = 0;
let firstNegative = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inString = false, stringChar = '';
  
  for (const ch of line) {
    if ((ch === '"' || ch === "'" || ch === '`') && !inString) {
      inString = true;
      stringChar = ch;
    } else if (ch === stringChar && inString) {
      inString = false;
    } else if (!inString) {
      if (ch === '{') totalBraces++;
      if (ch === '}') totalBraces--;
    }
  }
  
  if (totalBraces < 0 && firstNegative === -1) {
    firstNegative = i + 1;
    console.log(`FIRST NEGATIVE at Line ${i+1}: totalBraces=${totalBraces}`);
  }
  
  if (i >= Math.max(1080, firstNegative ? firstNegative - 5 : 0) && i < 1090) {
    console.log(`Line ${i+1}: totalBraces=${totalBraces}`);
  }
}

console.log(`\nFinal balance: ${totalBraces}`);
