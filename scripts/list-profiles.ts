import "./load-env";
import { MongoClient } from "mongodb";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(2);
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB ?? "dyo");
    const profiles = await db.collection("profiles").find({}, { projection: { _id: 0, id: 1, email: 1, full_name: 1, role: 1, managed_archdeaconry: 1, admin_sections: 1 } }).toArray();
    console.log(JSON.stringify(profiles, null, 2));
  } finally {
    await client.close();
  }
}

main();