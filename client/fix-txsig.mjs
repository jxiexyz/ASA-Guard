import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

const oldStr = `        transaction_signature: Array.from(Buffer.from(txSig, "base64")),`;
const newStr = `        transaction_signature: Array.from(bs58.decode(txSig)),`;

if (!code.includes(oldStr)) {
  console.log('NOT FOUND');
  process.exit(1);
}

// Add bs58 import if not there
if (!code.includes('bs58')) {
  code = code.replace(`import dotenv from "dotenv";`, `import dotenv from "dotenv";\nimport bs58 from "bs58";`);
}

code = code.replace(oldStr, newStr);
writeFileSync('ika-bridge.js', code);
console.log('✅ Fixed');
