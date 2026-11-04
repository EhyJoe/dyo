import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { Filter, Document } from "mongodb";
import { getSessionUserId } from "@/lib/auth-session";
import { getDatabase } from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECTION_BY_COLLECTION: Record<string, string> = {
  programmes: "programmes", products: "store", announcements: "announcements",
  gallery_images: "gallery", gallery_albums: "gallery", blog_posts: "blog",
  carousel_slides: "carousel", leadership: "leadership", site_pages: "pages",
  tournaments: "tournaments", tournament_teams: "tournaments", tournament_fields: "tournaments",
  fixtures: "tournaments", player_stats: "tournaments", match_events: "tournaments",
  archdeaconries: "archdeaconries", profiles: "members", users: "members",
  programme_registrations: "registrations", registrations: "registrations", orders: "orders",
  order_items: "orders", payments: "receipts", donations: "donations", sponsorships: "donations",
  item_sponsorships: "donations", body_payments: "receipts", vouchers: "vouchers",
  lucky_draws: "draws", draw_entries: "draws", audit_log: "audit", page_views: "analytics",
  home_popup: "announcements", product_variants: "store", village_mission: "programmes",
  ignition_attendance: "programmes", tournament_registrations: "tournaments",
};

const PUBLIC_READS: Record<string, { filter: Document; fields: string[] }> = {
  programmes: { filter: { is_published: true }, fields: ["id", "title", "slug", "programme_type", "tagline", "description", "venue", "starts_at", "ends_at", "registration_closes_at", "fee_naira", "access_code", "is_published", "banner_url", "flyer_url", "attending_template_url", "attending_tag_url", "extra_fields", "capacity", "archdeaconry_slug", "card_config", "tag_config"] },
  products: { filter: { is_active: true }, fields: ["id", "slug", "name", "description", "price_naira", "images", "category", "stock", "is_active", "created_at"] },
  product_variants: { filter: {}, fields: ["id", "product_id", "label", "stock", "price_override_naira", "sort_order"] },
  announcements: { filter: { is_published: true }, fields: ["id", "kind", "title", "body", "image_url", "link_url", "programme_id", "ends_at", "is_published", "created_at"] },
  leadership: { filter: { is_active: true }, fields: ["id", "name", "full_name", "title", "role", "tier", "photo_url", "bio", "sort_order", "is_active"] },
  gallery_images: { filter: { is_published: true }, fields: ["id", "image_url", "caption", "album", "taken_on", "programme_id", "archdeaconry_slug", "is_published", "created_at"] },
  gallery_albums: { filter: { is_published: true }, fields: ["id", "title", "slug", "description", "cover_url", "archdeaconry_slug", "is_published", "sort_order"] },
  blog_posts: { filter: { is_published: true }, fields: ["id", "title", "slug", "excerpt", "body", "cover_url", "author", "created_at", "is_published"] },
  carousel_slides: { filter: { is_active: true }, fields: ["id", "image_url", "eyebrow", "heading", "body", "cta_label", "cta_url", "sort_order", "is_active"] },
  site_pages: { filter: { is_published: true }, fields: ["id", "slug", "title", "description", "body", "cover_url", "in_menu", "sort_order", "is_published"] },
  // The archdeaconry directory is public site content. Programme editors need
  // to read its names/slugs to assign local programmes, even when their admin
  // account does not have permission to edit archdeaconry pages.
  archdeaconries: { filter: {}, fields: ["id", "slug", "name", "description", "image_url", "cover_url", "blurb", "sort_order"] },
  tournaments: { filter: {}, fields: ["id", "slug", "name", "team_type", "format", "status", "starts_on", "ends_on", "banner_url", "card_template_url"] },
  tournament_teams: { filter: {}, fields: ["id", "tournament_id", "name", "archdeaconry", "group_name", "played", "won", "drawn", "lost", "goals_for", "goals_against", "points", "sort_order"] },
  tournament_fields: { filter: {}, fields: ["id", "tournament_id", "label", "field_type", "options", "required", "sort_order"] },
  fixtures: {
    // Keep older fixtures visible until an admin explicitly unpublishes them.
    filter: { $or: [{ is_published: true }, { is_published: { $exists: false } }] },
    fields: ["id", "tournament_id", "home_team", "away_team", "home_score", "away_score", "kickoff_at", "status", "minute", "venue", "round", "stage", "group_name", "bracket_slot", "advances_to", "advances_as_home", "is_published"],
  },
  player_stats: { filter: {}, fields: ["id", "tournament_id", "team_id", "player_name", "goals", "assists", "yellow_cards", "red_cards"] },
};

function buildFilter(filters: unknown): { query: Document; sort: Document; limit?: number } {
  const query: Document = {};
  const clauses: Document[] = [];
  const sort: Document = {};
  let limit: number | undefined;
  if (!Array.isArray(filters)) return { query, sort };
  for (const raw of filters) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Record<string, unknown>;
    if (f.op === "order" && typeof f.field === "string") sort[f.field] = f.ascending === false ? -1 : 1;
    else if (f.op === "limit" && Number.isFinite(Number(f.value))) limit = Math.max(0, Math.min(500, Number(f.value)));
    else if (f.op === "or" && typeof f.expression === "string") {
      const alternatives = f.expression.split(",").flatMap((part) => {
        const [field, op, ...rest] = part.split(".");
        if (!field || !op || !rest.length || !/^[\w.]+$/.test(field)) return [];
        return [condition(field, op, rest.join("."))];
      });
      if (alternatives.length) clauses.push({ $or: alternatives });
    } else if (typeof f.field === "string" && typeof f.op === "string") {
      clauses.push(condition(f.field, f.op, f.value, f.operator));
    }
  }
  Object.assign(query, clauses.length ? { $and: clauses } : {});
  return { query, sort, limit };
}

function condition(field: string, op: string, value: unknown, notOperator?: unknown): Document {
  const fieldName = /^[\w.]+$/.test(field) ? field : "__invalid_field__";
  const operator = op === "not" ? String(notOperator) : op;
  const normalizedValue = value === "null" ? null : value;
  if (op === "not" && ["eq", "is"].includes(operator)) return { [fieldName]: { $ne: normalizedValue } };
  if (op === "not" && operator === "neq") return { [fieldName]: normalizedValue };
  if (operator === "eq" || operator === "is") return { [fieldName]: normalizedValue };
  if (operator === "neq") return { [fieldName]: { $ne: value } };
  if (["gt", "gte", "lt", "lte"].includes(operator)) return { [fieldName]: { [`$${operator}`]: value } };
  if (operator === "in") return { [fieldName]: { $in: Array.isArray(value) ? value : [] } };
  if (operator === "is") return { [fieldName]: value === null ? null : value };
  return { [fieldName]: { $ne: value } };
}

function projectFields(projection: unknown): Document | undefined {
  if (typeof projection !== "string" || projection === "*") return undefined;
  const fields = projection.split(",").map((field) => field.trim()).filter((field) => /^[\w.]+$/.test(field));
  return fields.length ? Object.fromEntries(fields.map((field) => [field, 1])) : undefined;
}

async function getAccess(collection: string) {
  const id = await getSessionUserId();
  if (!id) return { allowed: false, id: null, section: "", profile: null as Document | null };
  const db = await getDatabase();
  const profile = await db.collection("profiles").findOne({ id }, { projection: { role: 1, admin_sections: 1, managed_archdeaconry: 1 } });
  if (!profile) return { allowed: false, id, section: "", profile: null as Document | null };
  const section = SECTION_BY_COLLECTION[collection] ?? "";
  const allowed = profile.role === "super_admin" ||
    (profile.role === "admin" && (profile.admin_sections ?? []).includes(section)) ||
    (profile.role === "archdeaconry_admin" &&
      (section === "programmes" || (section === "gallery" && ["gallery_images", "gallery_albums"].includes(collection)) ||
        (section === "archdeaconries" && collection === "archdeaconries") ||
        (profile.admin_sections ?? []).includes(section)));
  return { allowed, id, section, profile };
}

export async function POST(request: Request, context: { params: Promise<{ collection: string }> }) {
  try {
    const { collection } = await context.params;
    if (!SECTION_BY_COLLECTION[collection]) return NextResponse.json({ error: "Unknown data collection." }, { status: 404 });
    const input = await request.json();
    const operation = String(input.operation ?? "select");
    if (!["select", "insert", "update", "upsert", "delete"].includes(operation)) {
      return NextResponse.json({ error: "Unsupported data operation." }, { status: 400 });
    }
    const access = await getAccess(collection);
    const db = await getDatabase();
    const publicRead = PUBLIC_READS[collection];
    const publicMissionSubmission = collection === "village_mission" && operation === "insert" && !access.allowed;
    if (!access.allowed && !publicMissionSubmission && (operation !== "select" || !publicRead)) {
      return NextResponse.json({ error: "You do not have access to this data." }, { status: 403 });
    }

    const { query, sort, limit } = buildFilter(input.filters);
    if (!access.allowed && publicRead) query.$and = [...(query.$and ?? []), publicRead.filter];
    if (access.profile?.role === "archdeaconry_admin" && ["programmes", "gallery_images", "gallery_albums", "archdeaconries"].includes(collection)) {
      const scope = collection === "archdeaconries"
        ? { slug: access.profile.managed_archdeaconry }
        : { archdeaconry_slug: access.profile.managed_archdeaconry };
      query.$and = [...(query.$and ?? []), scope];
    }
    const table = db.collection(collection);

    if (operation === "select") {
      const count = input.count === true ? await table.countDocuments(query) : null;
      if (input.head === true) return NextResponse.json({ data: null, error: null, count });
      const projection = access.allowed ? projectFields(input.projection) : Object.fromEntries(publicRead!.fields.map((field) => [field, 1]));
      let cursor = table.find(query, projection ? { projection } : undefined);
      if (Object.keys(sort).length) cursor = cursor.sort(sort);
      if (limit !== undefined) cursor = cursor.limit(limit);
      const rows = await cursor.toArray();
      const data: Document[] = rows.map(({ _id, ...row }) => ({ ...row, id: row.id ?? String(_id) }));
      if (collection === "products" && data.length) {
        const variants = await db.collection("product_variants").find(
          { product_id: { $in: data.map((product) => product.id) } },
          { projection: { _id: 0, id: 1, product_id: 1, label: 1, stock: 1, price_override_naira: 1, sort_order: 1 } },
        ).toArray();
        for (const product of data) product.product_variants = variants.filter((variant) => variant.product_id === product.id);
      }
      return NextResponse.json({ data: input.single ? data[0] ?? null : data, error: null, count });
    }

    if (!access.allowed && !publicMissionSubmission) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    if (collection === "users" || collection === "profiles" || collection === "audit_log" || collection === "payments") {
      return NextResponse.json({ error: "This collection is read-only through the site editor." }, { status: 403 });
    }
    if (operation === "insert") {
      const payloads: unknown[] = Array.isArray(input.payload) ? input.payload : [input.payload];
      if (publicMissionSubmission && payloads.length !== 1) {
        return NextResponse.json({ error: "Submit one volunteer application at a time." }, { status: 400 });
      }
      const docs: Document[] = payloads.flatMap((item: unknown): Document[] => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return [];
        if (publicMissionSubmission) {
          const source = item as Document;
          const application = {
            full_name: String(source.full_name ?? "").trim().slice(0, 120),
            church: String(source.church ?? "").trim().slice(0, 120),
            archdeaconry: String(source.archdeaconry ?? "").trim().slice(0, 120),
            email: String(source.email ?? "").trim().toLowerCase().slice(0, 254),
            phone_number: String(source.phone_number ?? "").trim().slice(0, 40),
            reason_for_registering: String(source.reason_for_registering ?? "").trim().slice(0, 2000),
            status: "New",
          };
          if (application.full_name.length < 2 || !application.church || !application.archdeaconry
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(application.email)
            || application.phone_number.length < 7 || !application.reason_for_registering) return [];
          return [{ ...application, id: randomUUID(), created_at: new Date().toISOString() }];
        }
        const source = item as Document;
        return [{ ...source, id: source.id ?? randomUUID(), created_at: source.created_at ?? new Date().toISOString() }];
      });
      for (const doc of docs) {
        if (collection === "leadership" && doc.is_active === undefined) doc.is_active = true;
        if (collection === "carousel_slides" && doc.is_active === undefined) doc.is_active = true;
        if (collection === "fixtures") {
          if (doc.status === undefined) doc.status = "scheduled";
          if (doc.is_published === undefined) doc.is_published = false;
        }
      }
      if (!docs.length) return NextResponse.json({ data: null, error: "Missing record." }, { status: 400 });
      await table.insertMany(docs);
      const inserted = docs.map((doc: Document) => ({ ...doc }));
      return NextResponse.json({ data: input.single ? inserted[0] : inserted, error: null });
    }
    if (!Object.keys(query).length) return NextResponse.json({ error: "A filter is required for updates and deletes." }, { status: 400 });
    if (operation === "update") {
      if (!input.payload || typeof input.payload !== "object" || Array.isArray(input.payload)) return NextResponse.json({ error: "Invalid update." }, { status: 400 });
      const changes: Document = { ...(input.payload as Document), updated_at: new Date().toISOString() };
      delete changes._id;
      const result = await table.updateMany(query as Filter<Document>, { $set: changes });
      return NextResponse.json({ data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }, error: null });
    }
    if (operation === "upsert") {
      const payload = input.payload as Document;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return NextResponse.json({ error: "Invalid record." }, { status: 400 });
      const result = await table.updateOne(query as Filter<Document>, { $set: payload, $setOnInsert: { id: randomUUID(), created_at: new Date().toISOString() } }, { upsert: true });
      return NextResponse.json({ data: { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount, upsertedId: result.upsertedId }, error: null });
    }
    const result = await table.deleteMany(query as Filter<Document>);
    return NextResponse.json({ data: { deletedCount: result.deletedCount }, error: null });
  } catch (error) {
    console.error("Data API request failed", error);
    return NextResponse.json({ data: null, error: "We couldn't complete that request. Please try again." }, { status: 503 });
  }
}
