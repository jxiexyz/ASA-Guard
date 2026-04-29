import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

// Step 4.5 harus pakai message yang sama persis dengan step Sign
// Ganti messageDigest di 4.5 jadi hash dari message yang sama
const oldStr = `  const messageDigest = createHash('sha256').update(Buffer.from(\`ASA Guard: approve trade \${amountLamports} lamports\`)).digest();`;
const newStr = `  const signMessage = Buffer.from(\`ASA Guard: approve trade \${amountLamports} lamports\`);
  const messageDigest = createHash('sha256').update(signMessage).digest();`;

if (!code.includes(oldStr)) {
  console.log('NOT FOUND');
  process.exit(1);
}
code = code.replace(oldStr, newStr);

// Step Sign pakai signMessage yang sama
const oldMsg = `  const message = Buffer.from(\`ASA Guard: approve trade \${amountLamports} lamports\`);`;
if (code.includes(oldMsg)) {
  code = code.replace(oldMsg, `  // message already defined as signMessage above`);
  code = code.replace(`Array.from(message),`, `Array.from(signMessage),`);
}

writeFileSync('ika-bridge.js', code);
console.log('✅ Fixed');
