import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

// Find all const declarations that are duplicated in step 4.5
const toRemove = [
  `  const DWALLET_PROGRAM_ID = new PublicKey('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');`,
  `  const [cpiAuthority] = PublicKey.findProgramAddressSync([Buffer.from('__ika_cpi_authority')], PROGRAM_ID);`,
  `  const [messageApprovalPda] = PublicKey.findProgramAddressSync(\n    [Buffer.from('message_approval'), messageDigest],\n    DWALLET_PROGRAM_ID\n  );`,
];

for (const str of toRemove) {
  const first = code.indexOf(str);
  if (first === -1) { console.log('not found:', str.slice(0,40)); continue; }
  const second = code.indexOf(str, first + 1);
  if (second === -1) { console.log('no dup:', str.slice(0,40)); continue; }
  code = code.slice(0, second) + code.slice(second + str.length + 1);
  console.log('✅ removed dup:', str.slice(0,40));
}

writeFileSync('ika-bridge.js', code);
console.log('✅ Done');
