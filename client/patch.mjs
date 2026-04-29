import { readFileSync, writeFileSync } from 'fs';

let code = readFileSync('ika-bridge.js', 'utf8');

const oldStr = `  // 5. Sign
  console.log("\\n✍️  Signing`;

const newStr = `  // 4.5. Create MessageApproval PDA via Anchor
  console.log("\\n📝 Creating MessageApproval PDA on-chain...");
  const messageDigest = Buffer.from(signResp_digest || createHash('sha256').update(Buffer.from(\`ASA Guard: approve trade \${amountLamports} lamports\`)).digest('hex'), 'hex');
  const DWALLET_PROGRAM_ID = new PublicKey('87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY');
  const [cpiAuthority] = PublicKey.findProgramAddressSync([Buffer.from('__ika_cpi_authority')], PROGRAM_ID);
  const [messageApprovalPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('message_approval'), messageDigest],
    DWALLET_PROGRAM_ID
  );
  const approvalTx = await program.methods
    .requestDwalletSign(Array.from(messageDigest), 6)
    .accounts({
      agent: owner.publicKey,
      policy: policyPda,
      coordinator: new PublicKey('11111111111111111111111111111111'),
      messageApproval: messageApprovalPda,
      dwallet: new PublicKey('11111111111111111111111111111111'),
      cpiAuthority,
      payer: owner.publicKey,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
      dwalletProgram: DWALLET_PROGRAM_ID,
    })
    .rpc();
  console.log("✅ MessageApproval PDA created! Tx:", approvalTx);

  // 5. Sign
  console.log("\\n✍️  Signing`;

if (!code.includes(oldStr)) {
  console.log('NOT FOUND');
  process.exit(1);
}
code = code.replace(oldStr, newStr);
writeFileSync('ika-bridge.js', code);
console.log('✅ Done');
