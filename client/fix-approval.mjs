import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

// Find both const approvalTx
let idx = 0;
let positions = [];
while (true) {
  idx = code.indexOf('const approvalTx', idx);
  if (idx === -1) break;
  positions.push(idx);
  idx++;
}
console.log('found at positions:', positions);

// Rename second one to approvalTx2
if (positions.length === 2) {
  code = code.slice(0, positions[1]) + 'const approvalTx2' + code.slice(positions[1] + 'const approvalTx'.length);
  // Also fix the console.log after it
  code = code.replace('("✅ MessageApproval PDA created! Tx:", approvalTx);', '("✅ MessageApproval PDA created! Tx:", approvalTx2);');
  writeFileSync('ika-bridge.js', code);
  console.log('✅ Fixed');
} else {
  console.log('unexpected count:', positions.length);
}
