import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { IkaClient, IkaTransaction, UserShareEncryptionKeys, getNetworkConfig, Curve, prepareDKGAsync } from "@ika.xyz/sdk";
import { Transaction } from "@mysten/sui/transactions";
import dotenv from "dotenv";
dotenv.config();

const RPC_URLS = [
  "https://fullnode.testnet.sui.io",
  "https://fullnode.testnet.sui.io",
];

async function getSuiClient() {
  for (const url of RPC_URLS) {
    try {
      const client = new SuiClient({ url });
      await client.getChainIdentifier();
      console.log("✅ Connected to RPC:", url);
      return client;
    } catch {
      console.log("❌ Failed:", url);
    }
  }
  throw new Error("All RPC URLs failed");
}

async function main() {
  const suiClient = await getSuiClient();
  const ikaConfig = getNetworkConfig("testnet");
  const ikaClient = new IkaClient({ suiClient, config: ikaConfig, network: "testnet" });
  await ikaClient.initialize();
  console.log("✅ Ika client initialized!");

  const keypair = Ed25519Keypair.fromSecretKey(process.env.SUI_PRIVATE_KEY);
  const address = keypair.getPublicKey().toSuiAddress();
  console.log("🔑 Using address:", address);

  // Split SUI coin
  console.log("💸 Splitting SUI coin...");
  const splitTx = new Transaction();
  const [newCoin] = splitTx.splitCoins(splitTx.gas, [100_000_000]);
  splitTx.transferObjects([newCoin], address);
  const splitResult = await suiClient.signAndExecuteTransaction({
    transaction: splitTx, signer: keypair, options: { showObjectChanges: true },
  });
  console.log("✅ Split done:", splitResult.digest);
  await new Promise(r => setTimeout(r, 3000));

  const suiCoins = await suiClient.getCoins({ owner: address, coinType: "0x2::sui::SUI" });
  const suiCoin = suiCoins.data[0];
  const ikaCoins = await suiClient.getCoins({ owner: address, coinType: `${ikaConfig.packages.ikaPackage}::ika::IKA` });
  const ikaCoin = ikaCoins.data[0];

  const curve = Curve.SECP256K1;
  const seed = keypair.getSecretKey().slice(0, 32);
  const userShareEncryptionKeys = await UserShareEncryptionKeys.fromRootSeedKey(seed, curve);
  console.log("✅ User share encryption keys created!");

  // Buat tx dulu biar sessionIdentifier sama
  const tx = new Transaction();
  const ikaTx = new IkaTransaction({ ikaClient, transaction: tx, userShareEncryptionKeys });
  await ikaTx.registerEncryptionKey({ curve });
  const sessionIdentifier = ikaTx.createSessionIdentifier();

  // Pakai sessionIdentifier yang SAMA untuk prepareDKGAsync
  const dkgRequestInput = await prepareDKGAsync(ikaClient, curve, userShareEncryptionKeys, sessionIdentifier, address);
  console.log("✅ DKG input prepared!");

  const encKey = await ikaClient.getLatestNetworkEncryptionKey();

  const [dWalletCap] = await ikaTx.requestDWalletDKG({
    dkgRequestInput,
    curve,
    dwalletNetworkEncryptionKeyId: encKey.id,
    sessionIdentifier,
    keypair,
    ikaCoin: tx.objectRef({ objectId: ikaCoin.coinObjectId, version: ikaCoin.version, digest: ikaCoin.digest }),
    suiCoin: tx.objectRef({ objectId: suiCoin.coinObjectId, version: suiCoin.version, digest: suiCoin.digest }),
  });

  tx.transferObjects([dWalletCap], address);

  console.log("📡 Executing transaction...");
  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx, signer: keypair,
    options: { showObjectChanges: true, showEffects: true },
  });

  console.log("✅ Transaction executed!");
  console.log("Digest:", result.digest);

  const dwalletCap = result.objectChanges?.find(o => o.objectType?.includes("DWalletCap") && o.type === "created");
  const dwallet = result.objectChanges?.find(o => o.objectType?.includes("::DWallet") && o.type === "created");
  const encryptedShare = result.objectChanges?.find(o => o.objectType?.includes("EncryptedUserSecretKeyShare") && o.type === "created");

  console.log("\n📋 Simpan ke .env:");
  console.log(`DWALLET_CAP_ID=${dwalletCap?.objectId}`);
  console.log(`DWALLET_ID=${dwallet?.objectId}`);
  console.log(`ENCRYPTED_SHARE_ID=${encryptedShare?.objectId}`);
}

main().catch(console.error);
