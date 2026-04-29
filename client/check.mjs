import { createHash } from "crypto";
for (const name of ["global:init_policy","global:approve_trade","global:update_policy"]) {
  const d = createHash("sha256").update(name).digest().slice(0,8);
  console.log(name, JSON.stringify([...d]));
}
