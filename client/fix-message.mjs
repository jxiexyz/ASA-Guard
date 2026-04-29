import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

const oldStr = `  const message = Buffer.from(\`ASA Guard: approve trade \${amountLamports} lamports\`);
  const messageDigest = createHash('sha256').update(message).digest();`;

const newStr = `  const messageDigest = createHash('sha256').update(Buffer.from(\`ASA Guard: approve trade \${amountLamports} lamports\`)).digest();`;

if (!code.includes(oldStr)) {
  console.log('NOT FOUND');
  process.exit(1);
}
code = code.replace(oldStr, newStr);
writeFileSync('ika-bridge.js', code);
console.log('✅ Fixed');
