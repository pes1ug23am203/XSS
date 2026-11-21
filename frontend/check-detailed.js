const fs = require('fs');
const code = fs.readFileSync('XssLab_v2.jsx', 'utf8');
const lines = code.split('\n');

// Track bracket balance line by line
let braces = 0, parens = 0, brackets = 0;
let inString = false, inTemplate = false, stringChar = '';

const issues = [];

for (let i = 0; i < code.length; i++) {
  const ch = code[i];
  const prev = code[i-1];
  
  if (ch === '`' && prev !== '\\') inTemplate = !inTemplate;
  if ((ch === '"' || ch === "'" || ch === '`') && prev !== '\\') {
    if (!inString) { inString = true; stringChar = ch; }
    else if (stringChar === ch) inString = false;
  }
  
  if (!inString && !inTemplate) {
    if (ch === '{') {
      braces++;
    }
    if (ch === '}') {
      braces--;
      if (braces < 0) {
        // Find line number
        const upToNow = code.substring(0, i);
        const lineNum = upToNow.split('\n').length;
        issues.push(`Line ${lineNum}: Extra closing brace, balance: ${braces}`);
      }
    }
    if (ch === '(') parens++;
    if (ch === ')') {
      parens--;
      if (parens < 0) {
        const upToNow = code.substring(0, i);
        const lineNum = upToNow.split('\n').length;
        issues.push(`Line ${lineNum}: Extra closing paren, balance: ${parens}`);
      }
    }
    if (ch === '[') brackets++;
    if (ch === ']') {
      brackets--;
      if (brackets < 0) {
        const upToNow = code.substring(0, i);
        const lineNum = upToNow.split('\n').length;
        issues.push(`Line ${lineNum}: Extra closing bracket, balance: ${brackets}`);
      }
    }
  }
}

console.log('\n=== BRACKET BALANCE ISSUES ===\n');
if (issues.length > 0) {
  issues.forEach(issue => console.log(issue));
}

console.log('\nFinal balance:');
console.log('  Braces: ' + braces + ' (' + (braces > 0 ? braces + ' unclosed' : braces < 0 ? -braces + ' extra closing' : 'balanced') + ')');
console.log('  Parens: ' + parens + ' (' + (parens > 0 ? parens + ' unclosed' : parens < 0 ? -parens + ' extra closing' : 'balanced') + ')');
console.log('  Brackets: ' + brackets + ' (' + (brackets > 0 ? brackets + ' unclosed' : brackets < 0 ? -brackets + ' extra closing' : 'balanced') + ')');
