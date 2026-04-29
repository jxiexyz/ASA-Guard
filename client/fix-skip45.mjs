import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

// Find dan remove seluruh step 4.5
const start = code.indexOf(`  // 4.5. Create MessageApproval PDA via Anchor`);
const end = code.indexOf(`  // 5. Sign`);

if (start === -1 || end === -1) {
  console.log('markers not found', start, end);
  process.exit(1);
}

code = code.slice(0, start) + code.slice(end);
writeFileSync('ika-bridge.js', code);
console.log('✅ Step 4.5 removed');
