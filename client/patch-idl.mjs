import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

const oldStr = `"isActive","type":"bool"}]}],"accounts":[{"name":"agentPolicy"`;

const newStr = `"isActive","type":"bool"}]},{"name":"requestDwalletSign","discriminator":[53,234,189,111,17,197,66,178],"accounts":[{"name":"agent","signer":true},{"name":"policy","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,111,108,105,99,121]},{"kind":"account","path":"policy.owner"}]}},{"name":"coordinator"},{"name":"messageApproval","writable":true},{"name":"dwallet"},{"name":"cpiAuthority"},{"name":"payer","writable":true,"signer":true},{"name":"systemProgram","address":"11111111111111111111111111111111"},{"name":"dwalletProgram"}],"args":[{"name":"messageDigest","type":{"array":["u8",32]}},{"name":"signatureScheme","type":"u16"}]}],"accounts":[{"name":"agentPolicy"`;

if (!code.includes(oldStr)) {
  console.log('NOT FOUND');
  process.exit(1);
}
code = code.replace(oldStr, newStr);
writeFileSync('ika-bridge.js', code);
console.log('✅ IDL patched');
