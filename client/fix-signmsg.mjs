import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

const oldStr = `  // message already defined as signMessage above`;
const newStr = `  const signMessage = Buffer.from(\`ASA Guard: approve trade \${amountLamports} lamports\`);`;

if (!code.includes(oldStr)) {
  console.log('NOT FOUND');
  process.exit(1);
}
code = code.replace(oldStr, newStr);
writeFileSync('ika-bridge.js', code);
console.log('✅ Fixed');
