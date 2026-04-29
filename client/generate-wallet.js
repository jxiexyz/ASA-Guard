import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const keypair = new Ed25519Keypair();
console.log("Address:", keypair.getPublicKey().toSuiAddress());
console.log("Private key (base64):", keypair.getSecretKey());
