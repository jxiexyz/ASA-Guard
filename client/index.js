import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { IkaClient, getNetworkConfig } from "@ika.xyz/sdk";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });
  const ikaConfig = getNetworkConfig("testnet");

  const ikaClient = new IkaClient({
    suiClient,
    config: ikaConfig,
    network: "testnet",
  });

  await ikaClient.initialize();
  console.log("✅ Ika client initialized!");

  const encKey = await ikaClient.getLatestNetworkEncryptionKey();
  console.log("🔑 Network encryption key ID:", encKey.id);
  console.log("✅ Ika network live dan responsive!");
}

main().catch(console.error);
