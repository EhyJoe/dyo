#!/usr/bin/env node
/**
 * Seed a real super-admin account into MongoDB.
 *
 * Run this ONCE before deploying (or after removing the temporary local admin
 * bypass) so there is a way to log in:
 *
 *   npx tsx scripts/seed-admin.ts --email admin@dyoyouth.org --password "changeme123"
 *
 * The password is hashed with bcrypt (cost factor 12, matching app/api/auth/signup).
 * This script never touches the app's source code or commits anything.
 */
import "./load-env";
import { hash } from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDatabase } from "@/lib/mongodb";
import { ensureMongoIndexes } from "@/lib/mongo-schema";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1] ?? "";
      args[key] = value;
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email ?? "").trim().toLowerCase();
  const password = String(args.password ?? "");
  const fullName = String(args.full_name ?? "Super Admin").trim();
  if (!email || !password) {
    console.error("Usage: tsx scripts/seed-admin.ts --email <email> --password <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const db = await getDatabase();
  await ensureMongoIndexes(db);

  const users = db.collection("users");
  const profiles = db.collection("profiles");

  const existing = await users.findOne({ email }, { projection: { _id: 1 } });
  if (existing) {
    console.error(`An account already exists for ${email}. Nothing was changed.`);
    process.exit(1);
  }

  const id = new ObjectId();
  const now = new Date().toISOString();
  const passwordHash = await hash(password, 12);

  await users.insertOne({ _id: id, email, password_hash: passwordHash, created_at: now, updated_at: now });
  try {
    await profiles.insertOne({
      _id: id,
      id: id.toHexString(),
      email,
      full_name: fullName,
      gender: null,
      date_of_birth: null,
      archdeaconry: null,
      church: null,
      occupation: null,
      educational_qualification: null,
      phone: null,
      address: null,
      photo_url: null,
      role: "super_admin",
      managed_archdeaconry: null,
      admin_sections: [],
      created_at: now,
      updated_at: now,
    });
  } catch (error) {
    await users.deleteOne({ _id: id });
    throw error;
  }

  console.log(`Super-admin created for ${email} (id: ${id.toHexString()})`);
}

main().catch((error) => {
  console.error("Failed to seed admin:", error);
  process.exit(1);
});