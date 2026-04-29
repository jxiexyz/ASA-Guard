import { Connection } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

const connection = new Connection("https://api.devnet.solana.com");
const idl = await Program.fetchIdl("Di3vEFGxT7LJbSfpXyyZTeo2PEHEb8oXK4xRuMCY7Qdd", { connection });
console.log(JSON.stringify(idl, null, 2));
