import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { IkaClient, IkaTransaction, UserShareEncryptionKeys, getNetworkConfig, Curve } from "@ika.xyz/sdk";
import { Transaction } from "@mysten/sui/transactions";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const suiClient = new SuiClient({ url: "https://sui-testnet-rpc.publicnode.com" });
  const ikaConfig = getNetworkConfig("testnet");
  const ikaClient = new IkaClient({ suiClient, config: ikaConfig, network: "testnet" });
  await ikaClient.initialize();
  console.log("✅ Ika client initialized!");

  const keypair = Ed25519Keypair.fromSecretKey(process.env.SUI_PRIVATE_KEY);
  const address = keypair.getPublicKey().toSuiAddress();

  const curve = Curve.SECP256K1;
  const seed = keypair.getSecretKey().slice(0, 32);
  const userShareEncryptionKeys = await UserShareEncryptionKeys.fromRootSeedKey(seed, curve);

  // Fetch dWallet state dari chain
  const dWallet = await ikaClient.getDWallet(process.env.DWALLET_ID);
  console.log("✅ dWallet fetched, state:", dWallet.state.$kind);
  console.log("userPublicOutput length:", dWallet.user_public_output?.length);

  const encryptedShareId = process.env.ENCRYPTED_SHARE_ID || 
    "0x3bf836e4ac8d3bf4166bc8b213f37055bf700a75fd67bef5f156096dd8f138be";

  const suiCoins = await suiClient.getCoins({ owner: address, coinType: "0x2::sui::SUI" });
  const suiCoin = suiCoins.data[0];

  const tx = new Transaction();
  const ikaTx = new IkaTransaction({ ikaClient, transaction: tx, userShareEncryptionKeys });

  await ikaTx.acceptEncryptedUserShare({
    dWallet,
    userPublicOutput: dWallet.user_public_output,
    encryptedUserSecretKeyShareId: encryptedShareId,
  });

  console.log("📡 Executing acceptEncryptedUserShare...");
  const result = await suiClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showObjectChanges: true, showEffects: true },
  });

  console.log("✅ Done! Digest:", result.digest);
  console.log("Effects status:", result.effects?.status);
}

main().catch(console.error);
