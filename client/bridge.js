import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import dotenv from "dotenv";
dotenv.config();

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";

const IDL = {
  address: "Di3vEFGxT7LJbSfpXyyZTeo2PEHEb8oXK4xRuMCY7Qdd",
  metadata: { name: "asa", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "initPolicy",
      discriminator: [45,234,110,100,209,146,191,86],
      accounts: [
        { name: "owner", writable: true, signer: true },
        { name: "policy", writable: true, pda: { seeds: [{ kind: "const", value: [112,111,108,105,99,121] }, { kind: "account", path: "owner" }] } },
        { name: "systemProgram", address: "11111111111111111111111111111111" },
      ],
      args: [
        { name: "agent", type: "pubkey" },
        { name: "maxBuySol", type: "u64" },
        { name: "stopLossBps", type: "u16" },
        { name: "takeProfitBps", type: "u16" },
        { name: "dailyLimitSol", type: "u64" },
      ],
    },
    {
      name: "approveTrade",
      discriminator: [7,254,199,234,17,251,210,183],
      accounts: [
        { name: "agent", signer: true },
        { name: "policy", writable: true, pda: { seeds: [{ kind: "const", value: [112,111,108,105,99,121] }, { kind: "account", path: "policy.owner" }] } },
      ],
      args: [{ name: "amountLamports", type: "u64" }],
    },
    {
      name: "updatePolicy",
      discriminator: [212,245,246,7,163,151,18,57],
      accounts: [
        { name: "owner", signer: true },
        { name: "policy", writable: true, pda: { seeds: [{ kind: "const", value: [112,111,108,105,99,121] }, { kind: "account", path: "owner" }] } },
      ],
      args: [
        { name: "maxBuySol", type: "u64" },
        { name: "dailyLimitSol", type: "u64" },
        { name: "isActive", type: "bool" },
      ],
    },
  ],
  accounts: [
    {
      name: "agentPolicy",
      discriminator: [148,193,218,129,21,96,195,77],
    },
  ],
  types: [
    {
      name: "agentPolicy",
      type: {
        kind: "struct",
        fields: [
          { name: "owner", type: "pubkey" },
          { name: "agent", type: "pubkey" },
          { name: "maxBuySol", type: "u64" },
          { name: "stopLossBps", type: "u16" },
          { name: "takeProfitBps", type: "u16" },
          { name: "dailyLimitSol", type: "u64" },
          { name: "dailySpent", type: "u64" },
          { name: "lastReset", type: "i64" },
          { name: "tradeCount", type: "u32" },
          { name: "isActive", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
  ],
  errors: [
    { code: 6000, name: "Unauthorized", msg: "Unauthorized" },
    { code: 6001, name: "PolicyInactive", msg: "Policy tidak aktif" },
    { code: 6002, name: "ExceedsMaxBuy", msg: "Amount melebihi max buy per trade" },
    { code: 6003, name: "ExceedsDailyLimit", msg: "Amount melebihi daily limit" },
  ],
};

async function main() {
  const connection = new Connection(RPC, "confirmed");
  const rawKey = JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"));
  const owner = Keypair.fromSecretKey(new Uint8Array(rawKey));
  console.log("👤 Owner:", owner.publicKey.toBase58());

  const wallet = new anchor.Wallet(owner);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(IDL, provider);

  const [policyPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("policy"), owner.publicKey.toBuffer()],
    PROGRAM_ID
  );
  console.log("📋 Policy PDA:", policyPda.toBase58());

  try {
    const policy = await program.account.agentPolicy.fetch(policyPda);
    console.log("✅ Policy exists:");
    console.log("   Max buy:", policy.maxBuySol.toString(), "lamports");
    console.log("   Daily limit:", policy.dailyLimitSol.toString(), "lamports");
    console.log("   Daily spent:", policy.dailySpent.toString(), "lamports");
    console.log("   Trade count:", policy.tradeCount);
    console.log("   Active:", policy.isActive);
  } catch {
    console.log("⚠️  Policy not found, initializing...");
    const tx = await program.methods
      .initPolicy(
        owner.publicKey,
        new (anchor.BN || anchor.default.BN)(1_000_000_000),
        500,
        2000,
        new (anchor.BN || anchor.default.BN)(5_000_000_000)
      )
      .accounts({ owner: owner.publicKey, policy: policyPda })
      .rpc();
    console.log("✅ Policy initialized! Tx:", tx);
  }

  console.log("\n🔄 Testing approve_trade (0.1 SOL)...");
  try {
    const tx = await program.methods
      .approveTrade(new (anchor.BN || anchor.default.BN)(100_000_000))
      .accounts({ agent: owner.publicKey, policy: policyPda })
      .rpc();
    console.log("✅ Trade APPROVED! Tx:", tx);
    console.log("\n📡 Next: gRPC sign via Ika");
    console.log("   Endpoint: https://pre-alpha-dev-1.ika.ika-network.net:443");
  } catch (e) {
    console.log("❌ Trade REJECTED:", e.message);
  }
}

main().catch(console.error);
