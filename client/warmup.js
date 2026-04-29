import { SuiClient } from "@mysten/sui/client";
import { IkaClient, getNetworkConfig, Curve } from "@ika.xyz/sdk";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const suiClient = new SuiClient({ url: "https://sui-testnet-rpc.publicnode.com" });
  const ikaConfig = getNetworkConfig("testnet");
  const ikaClient = new IkaClient({ suiClient, config: ikaConfig, network: "testnet" });
  
  console.log("Initializing...");
  await ikaClient.initialize();
  
  console.log("Fetching protocol public parameters (ini yang berat)...");
  const pp = await ikaClient.getProtocolPublicParameters(undefined, Curve.SECP256K1);
  console.log("✅ Protocol public parameters fetched! Length:", pp.length);
  
  const encKey = await ikaClient.getLatestNetworkEncryptionKey();
  console.log("✅ Encryption key:", encKey.id);
}

main().catch(console.error);
