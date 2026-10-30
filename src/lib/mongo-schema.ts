import type { Db, IndexDescription } from "mongodb";

/**
 * Collection names discovered in the current app. Indexes here are deliberately
 * non-unique until any imported legacy data has been inspected.
 */
export const COLLECTIONS = [
  "users", "profiles", "archdeaconries", "site_pages", "announcements", "home_popup",
  "leadership", "blog_posts", "gallery_images", "gallery_albums", "carousel_slides",
  "programmes", "programme_registrations", "registrations", "village_mission",
  "ignition_attendance", "products", "product_variants", "orders", "order_items",
  "payments", "donations", "sponsorships", "item_sponsorships", "body_payments",
  "vouchers", "tournaments", "tournament_teams", "tournament_fields",
  "tournament_registrations", "fixtures", "player_stats", "match_events",
  "lucky_draws", "draw_entries", "audit_log", "page_views",
] as const;

const indexes: Record<string, IndexDescription[]> = {
  users: [{ key: { email: 1 }, unique: true, name: "unique_user_email" }],
  profiles: [{ key: { email: 1 } }, { key: { role: 1, managed_archdeaconry: 1 } }],
  archdeaconries: [{ key: { slug: 1 } }, { key: { sort_order: 1 } }],
  site_pages: [{ key: { slug: 1 } }, { key: { is_published: 1, in_menu: 1, sort_order: 1 } }],
  announcements: [{ key: { is_published: 1, created_at: -1 } }],
  leadership: [{ key: { is_active: 1, tier: 1, sort_order: 1 } }],
  blog_posts: [{ key: { slug: 1 } }, { key: { is_published: 1, created_at: -1 } }],
  programmes: [{ key: { slug: 1 } }, { key: { is_published: 1, starts_at: 1 } }],
  programme_registrations: [{ key: { programme_id: 1, user_id: 1 } }, { key: { payment_status: 1 } }],
  products: [{ key: { slug: 1 } }, { key: { is_active: 1, created_at: -1 } }],
  orders: [{ key: { user_id: 1, created_at: -1 } }, { key: { status: 1, fulfilment: 1 } }],
  payments: [{ key: { registration_id: 1 } }, { key: { reference: 1 } }],
  donations: [{ key: { reference: 1 } }, { key: { created_at: -1 } }],
  tournaments: [{ key: { slug: 1 } }, { key: { status: 1 } }],
  fixtures: [{ key: { tournament_id: 1, kickoff_at: 1 } }],
  lucky_draws: [{ key: { status: 1, created_at: -1 } }],
  vouchers: [{ key: { code: 1 } }, { key: { programme_id: 1, created_at: 1 } }],
  audit_log: [{ key: { created_at: -1 } }, { key: { actor_id: 1, created_at: -1 } }],
  page_views: [{ key: { path: 1, viewed_at: -1 } }],
};

export async function ensureMongoIndexes(db: Db) {
  for (const collection of COLLECTIONS) {
    const definitions = indexes[collection];
    if (definitions?.length) await db.collection(collection).createIndexes(definitions);
  }
}
