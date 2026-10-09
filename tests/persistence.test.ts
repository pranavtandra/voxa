import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; operation: string; value?: unknown };
const calls: Call[] = [];
let failure: { message: string } | null = null;

function builder(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ["eq", "lte", "order", "range"]) chain[method] = vi.fn(() => chain);
  chain.upsert = vi.fn((value: unknown) => { calls.push({ table, operation: "upsert", value }); return Promise.resolve({ error: failure }); });
  chain.delete = vi.fn(() => { calls.push({ table, operation: "delete" }); return chain; });
  chain.select = vi.fn(() => chain);
  chain.then = (resolve: (value: unknown) => void) => resolve({ data: [], error: failure });
  return chain;
}

vi.mock("@/lib/supabase", () => ({ supabase: { from: (table: string) => builder(table) } }));
vi.mock("@/lib/error-reporting", () => ({ reportError: vi.fn() }));

async function clearDatabase() {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase("voxa-persistence");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe("durable persistence queue", () => {
  beforeEach(async () => {
    vi.resetModules();
    calls.length = 0;
    failure = null;
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubGlobal("window", { addEventListener: vi.fn(), setTimeout, clearTimeout });
    vi.stubGlobal("document", { addEventListener: vi.fn(), visibilityState: "visible" });
    await clearDatabase();
  });

  it("durably queues writes and replays them in creation order", async () => {
    const persistence = await import("@/lib/persistence");
    await persistence.setPersistenceUser("user-a");
    for (let index = 0; index < 5; index++) {
      await persistence.queueHistorySave("user-a", {
        id: `00000000-0000-4000-8000-00000000000${index}`,
        text: `Message ${index}`, time: "1:00 PM", date: "2026-10-09",
        category: "Quick", occurredAt: `2026-10-09T17:00:0${index}.000Z`,
      });
    }
    expect(persistence.getPersistenceStatus().pending).toBe(5);
    expect(calls).toHaveLength(0);

    vi.stubGlobal("navigator", { onLine: true });
    await persistence.flushPersistenceQueue();
    expect(persistence.getPersistenceStatus().pending).toBe(0);
    expect(calls.map((call) => (call.value as { spoken_text: string }).spoken_text)).toEqual([
      "Message 0", "Message 1", "Message 2", "Message 3", "Message 4",
    ]);
  });

  it("keeps a failed write for retry and surfaces the failure", async () => {
    const persistence = await import("@/lib/persistence");
    await persistence.setPersistenceUser("user-b");
    await persistence.queueSettingSave("user-b", "voxa-style", "natural");
    vi.stubGlobal("navigator", { onLine: true });
    failure = { message: "network unavailable" };
    await persistence.flushPersistenceQueue();
    expect(persistence.getPersistenceStatus()).toMatchObject({ pending: 1, lastError: "network unavailable" });
  });

  it("uses stable record IDs so replayed upserts are idempotent", async () => {
    const persistence = await import("@/lib/persistence");
    const entry = {
      id: "00000000-0000-4000-8000-000000000099", text: "Hello 👋", time: "1:00 PM",
      date: "2026-10-09", category: "Quick", occurredAt: "2026-10-09T17:00:00.000Z",
    };
    await persistence.setPersistenceUser("user-c");
    await persistence.queueHistorySave("user-c", entry);
    vi.stubGlobal("navigator", { onLine: true });
    await persistence.flushPersistenceQueue();
    const saved = calls.find((call) => call.table === "voxa_history_entries")?.value as { id: string };
    expect(saved.id).toBe(entry.id);
  });
});
