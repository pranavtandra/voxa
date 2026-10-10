import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; operation: string; value?: unknown };
const calls: Call[] = [];
let failure: { message: string } | null = null;
let waitForWrite: Promise<void> | undefined;

function builder(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ["eq", "lte", "order", "range"]) chain[method] = vi.fn(() => chain);
  chain.upsert = vi.fn(async (value: unknown) => { calls.push({ table, operation: "upsert", value }); await waitForWrite; return { error: failure }; });
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
    waitForWrite = undefined;
    vi.stubGlobal("navigator", { onLine: false });
    vi.stubGlobal("window", { addEventListener: vi.fn(), setTimeout, clearTimeout });
    vi.stubGlobal("document", { addEventListener: vi.fn(), visibilityState: "visible" });
    await clearDatabase();
  });

  it("durably queues writes and replays them in creation order", async () => {
    const persistence = await import("@/lib/persistence");
    await persistence.setPersistenceUser("user-a");
    for (let index = 0; index < 5; index++) {
      await expect(persistence.queueHistorySave("user-a", {
        id: `00000000-0000-4000-8000-00000000000${index}`,
        text: `Message ${index}`, time: "1:00 PM", date: "2026-10-09",
        category: "Quick", occurredAt: `2026-10-09T17:00:0${index}.000Z`,
      })).rejects.toThrow("offline");
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
    await expect(persistence.queueHistorySave("user-c", entry)).rejects.toThrow("offline");
    vi.stubGlobal("navigator", { onLine: true });
    await persistence.flushPersistenceQueue();
    const saved = calls.find((call) => call.table === "voxa_history_entries")?.value as { id: string };
    expect(saved.id).toBe(entry.id);
  });

  it("does not resolve a history save until Supabase accepts it", async () => {
    const persistence = await import("@/lib/persistence");
    vi.stubGlobal("navigator", { onLine: true });
    await persistence.setPersistenceUser("user-d");
    await expect(persistence.queueHistorySave("user-d", {
      id: "00000000-0000-4000-8000-000000000100", text: "I need water.", time: "1:00 PM",
      date: "2026-10-09", category: "Drinks", occurredAt: "2026-10-09T17:00:00.000Z",
    })).resolves.toBeTypeOf("string");
    expect(persistence.getPersistenceStatus()).toMatchObject({ pending: 0, lastError: undefined });
    expect(calls).toHaveLength(1);
  });

  it("drains history queued while another write is in flight", async () => {
    const persistence = await import("@/lib/persistence");
    await persistence.setPersistenceUser("user-e");
    let release!: () => void;
    waitForWrite = new Promise<void>(resolve => { release = resolve; });
    vi.stubGlobal("navigator", { onLine: true });
    await persistence.queueSettingSave("user-e", "voxa-style", "natural");
    await vi.waitFor(() => expect(calls).toHaveLength(1));
    const save = persistence.queueHistorySave("user-e", {
      id: "00000000-0000-4000-8000-000000000101", text: "Same phrase", time: "Now",
      date: "2026-10-09", category: "Quick", occurredAt: "2026-10-09T17:00:00.000Z",
    });
    await vi.waitFor(() => expect(persistence.getPersistenceStatus().pending).toBe(2));
    release();
    await save;
    expect(calls.map(call => call.table)).toEqual(["voxa_user_data", "voxa_history_entries"]);
    expect(persistence.getPersistenceStatus().pending).toBe(0);
  });

  it("retains expired-session failures and retries the same entry ID", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const persistence = await import("@/lib/persistence");
    vi.stubGlobal("navigator", { onLine: true });
    await persistence.setPersistenceUser("user-f");
    failure = { message: "JWT expired" };
    const entry = { id: "00000000-0000-4000-8000-000000000102", text: "Help", time: "Now", date: "2026-10-09", category: "Quick", occurredAt: "2026-10-09T17:00:00.000Z" };
    await expect(persistence.queueHistorySave("user-f", entry)).rejects.toThrow("JWT expired");
    failure = null;
    vi.setSystemTime(Date.now() + 1100);
    await persistence.flushPersistenceQueue();
    expect(persistence.getPersistenceStatus().pending).toBe(0);
    expect(calls.map(call => (call.value as { id: string }).id)).toEqual([entry.id, entry.id]);
    vi.useRealTimers();
  });

  it("surfaces unavailable local storage instead of silently dropping history", async () => {
    const persistence = await import("@/lib/persistence");
    await persistence.setPersistenceUser("user-g");
    const unavailable = vi.spyOn(indexedDB, "open").mockImplementation(() => { throw new Error("Storage unavailable"); });
    await expect(persistence.queueHistorySave("user-g", {
      id: "00000000-0000-4000-8000-000000000103", text: "Help", time: "Now", date: "2026-10-09", category: "Quick", occurredAt: "2026-10-09T17:00:00.000Z",
    })).rejects.toThrow("Storage unavailable");
    expect(persistence.getPersistenceStatus().lastError).toContain("could not be queued");
    unavailable.mockRestore();
  });
});
