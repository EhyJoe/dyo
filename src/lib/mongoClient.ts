/**
 * Temporary browser data adapter while legacy screens are being rewritten to
 * use purpose-built MongoDB API routes. The browser never connects to Atlas.
 */
type Result<T = unknown> = { data: T | null; error: { message: string; code?: string } | null; count?: number | null };

const SAFE_DATA_ERROR = "We couldn't complete that request. Please try again.";

function safeDataError(collection: string, operation: string, detail: unknown) {
  // Keep request failures quiet in the browser console. Detailed diagnostics
  // belong in server logs; routine data errors should not trigger the Next.js
  // development error overlay for site visitors.
  void collection;
  void operation;
  void detail;
  const code = typeof detail === "object" && detail !== null && "code" in detail
    ? String((detail as { code: unknown }).code)
    : undefined;
  return { message: SAFE_DATA_ERROR, ...(code ? { code } : {}) };
}

class Query implements PromiseLike<Result<any>> {
  private operation = "select";
  private filters: unknown[] = [];
  private payload: unknown;
  private projection = "*";
  private singleResult = false;
  private countMode = false;
  private headOnly = false;

  constructor(private collection: string) {}
  select(fields = "*", options?: { count?: string; head?: boolean }) {
    this.projection = fields;
    this.countMode = options?.count === "exact";
    this.headOnly = options?.head === true;
    return this;
  }
  insert(payload: unknown) { this.operation = "insert"; this.payload = payload; return this; }
  update(payload: unknown) { this.operation = "update"; this.payload = payload; return this; }
  upsert(payload: unknown) { this.operation = "upsert"; this.payload = payload; return this; }
  delete() { this.operation = "delete"; return this; }
  eq(field: string, value: unknown) { this.filters.push({ field, op: "eq", value }); return this; }
  neq(field: string, value: unknown) { this.filters.push({ field, op: "neq", value }); return this; }
  gt(field: string, value: unknown) { this.filters.push({ field, op: "gt", value }); return this; }
  gte(field: string, value: unknown) { this.filters.push({ field, op: "gte", value }); return this; }
  lt(field: string, value: unknown) { this.filters.push({ field, op: "lt", value }); return this; }
  lte(field: string, value: unknown) { this.filters.push({ field, op: "lte", value }); return this; }
  is(field: string, value: unknown) { this.filters.push({ field, op: "is", value }); return this; }
  in(field: string, value: unknown[]) { this.filters.push({ field, op: "in", value }); return this; }
  or(expression: string) { this.filters.push({ op: "or", expression }); return this; }
  order(field: string, options?: { ascending?: boolean; nullsFirst?: boolean }) { this.filters.push({ op: "order", field, ascending: options?.ascending !== false, nullsFirst: options?.nullsFirst }); return this; }
  not(field: string, operator: string, value: unknown) { this.filters.push({ field, op: "not", operator, value }); return this; }
  limit(value: number) { this.filters.push({ op: "limit", value }); return this; }
  single() { this.singleResult = true; return this; }
  maybeSingle() { this.singleResult = true; return this; }
  then<TResult1 = Result<any>, TResult2 = never>(
    resolve?: ((value: Result<any>) => TResult1 | PromiseLike<TResult1>) | null,
    reject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const result = fetch(`/api/data/${encodeURIComponent(this.collection)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: this.operation,
        filters: this.filters,
        payload: this.payload,
        projection: this.projection,
        single: this.singleResult,
        count: this.countMode,
        head: this.headOnly,
      }),
    }).then(async (response) => {
      const value = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { data: null, count: null, error: safeDataError(this.collection, this.operation, { status: response.status, detail: value.error }) };
      }
      if (value.error) {
        return { ...value, error: safeDataError(this.collection, this.operation, value.error) } as Result<any>;
      }
      return value as Result<any>;
    }).catch((error: unknown) => ({
      data: null, count: null,
      error: safeDataError(this.collection, this.operation, error),
    }));
    return result.then(resolve ?? undefined, reject ?? undefined);
  }
}

const migrationError = { message: "We couldn't upload that file. Please try again." };
class Channel {
  constructor(private name: string) {}
  on(_event: string, _filter: unknown, _callback: () => void) { return this; }
  subscribe() { return { name: this.name }; }
}

const mongo = {
  from: (collection: string) => new Query(collection),
  rpc: async (_name: string, _args?: unknown): Promise<Result<any>> => ({ data: null, error: { message: SAFE_DATA_ERROR } }),
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
  },
  storage: {
    from: (_bucket: string) => ({
      upload: async (_path: string, _file: unknown, _options?: { upsert?: boolean; contentType?: string; cacheControl?: string }): Promise<Result> => ({ data: null, error: migrationError }),
      remove: async (_paths: string[]): Promise<Result> => ({ data: null, error: migrationError }),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: "" } }),
    }),
  },
  channel: (name: string) => new Channel(name),
  removeChannel: async (_channel: unknown) => undefined,
};

export { mongo };
