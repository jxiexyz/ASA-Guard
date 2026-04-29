import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

const dupStr = `  const messageDigest = Buffer.from(signResp_digest || createHash('sha256').update(Buffer.from(\`ASA Guard: approve trade \${amountLamports} lamports\`)).digest('hex'), 'hex');`;

const first = code.indexOf(dupStr);
const second = code.indexOf(dupStr, first + 1);

if (second === -1) {
  console.log('No duplicate found');
  process.exit(1);
}

code = code.slice(0, second) + code.slice(second + dupStr.length + 1);
writeFileSync('ika-bridge.js', code);
console.log('✅ Duplicate removed');
