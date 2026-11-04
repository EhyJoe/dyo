import "./load-env";
import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in .env.local");
    process.exit(2);
  }
  console.log("Connecting to", uri.replace(/:[^:@/]+@/, ":***@"));
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000, connectTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB ?? "dyo");
    const admin = await db.admin().ping();
    console.log("CONNECTED. ping:", JSON.stringify(admin));
    const cols = await db.listCollections().toArray();
    console.log("Collections:", cols.map((c) => c.name).join(", ") || "(none)");
    const usersCount = await db.collection("users").countDocuments();
    const profilesCount = await db.collection("profiles").countDocuments();
    console.log(`users=${usersCount} profiles=${profilesCount}`);
  } catch (error) {
    console.error("CONNECTION FAILED:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();