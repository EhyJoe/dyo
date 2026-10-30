import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB;

if (uri && !databaseName) {
  throw new Error("MONGODB_DB must be set when MONGODB_URI is configured.");
}

declare global {
  // Reuse the connection during Next.js hot reloads in development.
  var dyoMongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

export function isMongoConfigured() {
  return Boolean(uri && databaseName);
}

export async function getMongoClient() {
  if (!uri) throw new Error("MongoDB is not configured. Set MONGODB_URI.");
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      // Surface Atlas DNS/network/allowlist failures promptly instead of
      // keeping sign-in and session checks waiting on the driver's long
      // default server selection window.
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    clientPromise = client.connect();
    clientPromise.catch(() => {
      if (process.env.NODE_ENV !== "production") global.dyoMongoClientPromise = undefined;
      clientPromise = undefined;
    });
    if (process.env.NODE_ENV !== "production") global.dyoMongoClientPromise = clientPromise;
  }
  if (process.env.NODE_ENV !== "production" && global.dyoMongoClientPromise) {
    clientPromise = global.dyoMongoClientPromise;
  }
  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  if (!databaseName) throw new Error("MongoDB is not configured. Set MONGODB_DB.");
  const client = await getMongoClient();
  return client.db(databaseName);
}
