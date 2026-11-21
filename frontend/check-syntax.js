const fs = require('fs');
const code = fs.readFileSync('XssLab_v2.jsx', 'utf8');

// Very basic syntax check - count braces and parens
let braces = 0, parens = 0, brackets = 0;
let inString = false, inTemplate = false, stringChar = '';

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  const prev = code[i-1];
  
  if (ch === '`' && prev !== '\\') inTemplate = !inTemplate;
  if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
    if (!inString) { inString = true; stringChar = ch; }
    else if (stringChar === ch) inString = false;
  }
  
  if (!inString && !inTemplate) {
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '(') parens++;
    if (ch === ')') parens--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }
}

console.log('Braces: ' + braces + ' (should be 0)');
console.log('Parens: ' + parens + ' (should be 0)');
console.log('Brackets: ' + brackets + ' (should be 0)');
if (braces === 0 && parens === 0 && brackets === 0) {
  console.log('✓ Basic bracket balance is OK');
} else {
  console.log('✗ Bracket balance ERROR');
}
