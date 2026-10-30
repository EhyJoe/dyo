import nextEnv from "@next/env";
import { MongoClient } from "mongodb";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB;
if (!uri || !databaseName) {
  console.error("Set MONGODB_URI and MONGODB_DB in .env.local before initializing MongoDB.");
  process.exit(1);
}

const collections = [
  "users", "profiles", "archdeaconries", "site_pages", "announcements", "home_popup",
  "leadership", "blog_posts", "gallery_images", "gallery_albums", "carousel_slides",
  "programmes", "programme_registrations", "registrations", "village_mission",
  "ignition_attendance", "products", "product_variants", "orders", "order_items",
  "payments", "donations", "sponsorships", "item_sponsorships", "body_payments",
  "vouchers", "tournaments", "tournament_teams", "tournament_fields",
  "tournament_registrations", "fixtures", "player_stats", "match_events",
  "lucky_draws", "draw_entries", "audit_log", "page_views",
];

const indexes = {
  users: [[{ email: 1 }, { unique: true, name: "unique_user_email" }]],
  profiles: [[{ email: 1 }, {}], [{ role: 1, managed_archdeaconry: 1 }, {}]],
  archdeaconries: [[{ slug: 1 }, {}], [{ sort_order: 1 }, {}]],
  site_pages: [[{ slug: 1 }, {}], [{ is_published: 1, in_menu: 1, sort_order: 1 }, {}]],
  announcements: [[{ is_published: 1, created_at: -1 }, {}]],
  leadership: [[{ is_active: 1, tier: 1, sort_order: 1 }, {}]],
  blog_posts: [[{ slug: 1 }, {}], [{ is_published: 1, created_at: -1 }, {}]],
  programmes: [[{ slug: 1 }, {}], [{ is_published: 1, starts_at: 1 }, {}]],
  programme_registrations: [[{ programme_id: 1, user_id: 1 }, {}], [{ payment_status: 1 }, {}]],
  products: [[{ slug: 1 }, {}], [{ is_active: 1, created_at: -1 }, {}]],
  orders: [[{ user_id: 1, created_at: -1 }, {}], [{ status: 1, fulfilment: 1 }, {}]],
  payments: [[{ registration_id: 1 }, {}], [{ reference: 1 }, {}]],
  donations: [[{ reference: 1 }, {}], [{ created_at: -1 }, {}]],
  tournaments: [[{ slug: 1 }, {}], [{ status: 1 }, {}]],
  fixtures: [[{ tournament_id: 1, kickoff_at: 1 }, {}]],
  lucky_draws: [[{ status: 1, created_at: -1 }, {}]],
  vouchers: [[{ code: 1 }, {}], [{ programme_id: 1, created_at: 1 }, {}]],
  audit_log: [[{ created_at: -1 }, {}], [{ actor_id: 1, created_at: -1 }, {}]],
  page_views: [[{ path: 1, viewed_at: -1 }, {}]],
};

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(databaseName);
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name));
  const created = [];
  for (const name of collections) {
    if (!existing.has(name)) {
      await db.createCollection(name);
      created.push(name);
    }
    const definitions = indexes[name] ?? [];
    if (definitions.length) await db.collection(name).createIndexes(definitions.map(([key, options]) => ({ key, ...options })));
  }
  console.log(`MongoDB initialized: ${collections.length} collections, ${created.length} newly created, ${Object.values(indexes).flat().length} indexes ensured.`);
} finally {
  await client.close();
}
