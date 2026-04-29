import express from "express";
import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID);
const RPC = process.env.SOLANA_RPC || "https://api.devnet.solana.com";

const IDL = {"address":"Di3vEFGxT7LJbSfpXyyZTeo2PEHEb8oXK4xRuMCY7Qdd","metadata":{"name":"asa","version":"0.1.0","spec":"0.1.0"},"instructions":[{"name":"initPolicy","discriminator":[45,234,110,100,209,146,191,86],"accounts":[{"name":"owner","writable":true,"signer":true},{"name":"policy","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,111,108,105,99,121]},{"kind":"account","path":"owner"}]}},{"name":"systemProgram","address":"11111111111111111111111111111111"}],"args":[{"name":"agent","type":"pubkey"},{"name":"maxBuySol","type":"u64"},{"name":"stopLossBps","type":"u16"},{"name":"takeProfitBps","type":"u16"},{"name":"dailyLimitSol","type":"u64"}]},{"name":"approveTrade","discriminator":[7,254,199,234,17,251,210,183],"accounts":[{"name":"agent","signer":true},{"name":"policy","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,111,108,105,99,121]},{"kind":"account","path":"policy.owner"}]}}],"args":[{"name":"amountLamports","type":"u64"}]},{"name":"updatePolicy","discriminator":[212,245,246,7,163,151,18,57],"accounts":[{"name":"owner","signer":true},{"name":"policy","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,111,108,105,99,121]},{"kind":"account","path":"owner"}]}}],"args":[{"name":"maxBuySol","type":"u64"},{"name":"dailyLimitSol","type":"u64"},{"name":"isActive","type":"bool"}]}],"accounts":[{"name":"agentPolicy","discriminator":[148,193,218,129,21,96,195,77]}],"types":[{"name":"agentPolicy","type":{"kind":"struct","fields":[{"name":"owner","type":"pubkey"},{"name":"agent","type":"pubkey"},{"name":"maxBuySol","type":"u64"},{"name":"stopLossBps","type":"u16"},{"name":"takeProfitBps","type":"u16"},{"name":"dailyLimitSol","type":"u64"},{"name":"dailySpent","type":"u64"},{"name":"lastReset","type":"i64"},{"name":"tradeCount","type":"u32"},{"name":"isActive","type":"bool"},{"name":"bump","type":"u8"}]}}],"errors":[{"code":6000,"name":"Unauthorized","msg":"Unauthorized"},{"code":6001,"name":"PolicyInactive","msg":"Policy tidak aktif"},{"code":6002,"name":"ExceedsMaxBuy","msg":"Amount melebihi max buy per trade"},{"code":6003,"name":"ExceedsDailyLimit","msg":"Amount melebihi daily limit"}]};

function getProgram() {
  const connection = new Connection(RPC, "confirmed");
  const rawKey = JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8"));
  const owner = Keypair.fromSecretKey(new Uint8Array(rawKey));
  const wallet = new anchor.Wallet(owner);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);
  return { program: new anchor.Program(IDL, provider), owner };
}

// GET /policy — lihat policy sekarang
app.get("/policy", async (req, res) => {
  try {
    const { program, owner } = getProgram();
    const [policyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), owner.publicKey.toBuffer()], PROGRAM_ID
    );
    const policy = await program.account.agentPolicy.fetch(policyPda);
    res.json({
      owner: policy.owner.toBase58(),
      agent: policy.agent.toBase58(),
      maxBuySol: policy.maxBuySol.toString(),
      dailyLimitSol: policy.dailyLimitSol.toString(),
      dailySpent: policy.dailySpent.toString(),
      tradeCount: policy.tradeCount,
      isActive: policy.isActive,
      stopLossBps: policy.stopLossBps,
      takeProfitBps: policy.takeProfitBps,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /approve-trade — bot minta izin trade
app.post("/approve-trade", async (req, res) => {
  const { amount_lamports, token } = req.body;
  if (!amount_lamports) return res.status(400).json({ error: "amount_lamports required" });

  try {
    const { program, owner } = getProgram();
    const [policyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), owner.publicKey.toBuffer()], PROGRAM_ID
    );

    
    const tx = await program.methods
      .approveTrade(new (anchor.BN || anchor.default?.BN)(amount_lamports))
      .accounts({ agent: owner.publicKey, policy: policyPda })
      .rpc();

    console.log(`✅ Trade approved: ${amount_lamports} lamports (${token}) | tx: ${tx}`);
    res.json({ approved: true, tx, amount_lamports, token });
  } catch (e) {
    const rejected = e.message?.includes("ExceedsMaxBuy") || e.message?.includes("ExceedsDailyLimit") || e.message?.includes("PolicyInactive");
    console.log(`❌ Trade rejected: ${e.message}`);
    res.status(rejected ? 403 : 500).json({ approved: false, error: e.message });
  }
});

// POST /update-policy — update rules
app.post("/update-policy", async (req, res) => {
  const { max_buy_sol, daily_limit_sol, is_active } = req.body;
  try {
    const { program, owner } = getProgram();
    const [policyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("policy"), owner.publicKey.toBuffer()], PROGRAM_ID
    );
    
    const tx = await program.methods
      .updatePolicy(new (anchor.BN || anchor.default?.BN)(max_buy_sol), new (anchor.BN || anchor.default?.BN)(daily_limit_sol), is_active)
      .accounts({ owner: owner.publicKey, policy: policyPda })
      .rpc();
    res.json({ success: true, tx });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 ASA Guard bridge server running on port ${PORT}`));
