import "dotenv/config";
import { db } from "../db";
import { users } from "../db/schema";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  
  await db.insert(users).values([
    {
      name: "Dr. Vance",
      email: "medecin@cabinet.com",
      password: passwordHash,
      role: "doctor",
    },
    {
      name: "Assistante Sarah",
      email: "assistante@cabinet.com",
      password: passwordHash,
      role: "assistant",
    }
  ]).onConflictDoNothing({ target: users.email });
  
  console.log("Comptes créés avec succès !");
}

main().catch(console.error);
