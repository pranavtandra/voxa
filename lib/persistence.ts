"use client";

import type { Json } from "@/lib/database.types";
import { reportError } from "@/lib/error-reporting";
import { supabase } from "@/lib/supabase";

export type HistoryRecord = {
  id: string;
  text: string;
  time: string;
  date: string;
  category: string;
  occurredAt: string;
};

export type CustomButtonRecord = {
  id: string;
  label: string;
  emoji: string;
  category: string;
  phrase?: string;
  imagePath?: string;
  color?: string;
  action?: Json;
  position: number;
};

type QueuePayload =
  | { kind: "setting-upsert"; key: string; value: Json }
  | { kind: "history-upsert"; entry: HistoryRecord }
  | { kind: "history-clear"; beforeOccurredAt: string }
  | { kind: "button-upsert"; button: CustomButtonRecord }
  | { kind: "button-delete"; id: string };

export type QueuedWrite = QueuePayload & {
  id: string;
  userId: string;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
};

export type PersistenceStatus = {
  pending: number;
  saving: boolean;
  lastSavedAt?: number;
  lastError?: string;
};

const DB_NAME = "voxa-persistence";
const STORE_NAME = "pending-writes";
const PAGE_SIZE = 500;
const listeners = new Set<() => void>();
let status: PersistenceStatus = { pending: 0, saving: false };
let activeUserId: string | undefined;
let processing: Promise<void> | undefined;
let retryTimer: number | undefined;
let lifecycleStarted = false;

function emit(patch: Partial<PersistenceStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribePersistence(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPersistenceStatus() {
  return status;
}

function openQueue() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open the save queue"));
  });
}

async function withStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openQueue();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = action(transaction.objectStore(STORE_NAME));
    let result: T;
    request.onsuccess = () => { result = request.result; };
    request.onerror = () => reject(request.error || new Error("Save queue operation failed"));
    transaction.oncomplete = () => { db.close(); resolve(result); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Save queue transaction failed")); };
  });
}

async function listWrites(userId: string) {
  const writes = await withStore<QueuedWrite[]>("readonly", (store) => store.getAll());
  return writes.filter((write) => write.userId === userId).sort((a, b) => a.createdAt - b.createdAt);
}

async function countWrites(userId: string) {
  return (await listWrites(userId)).length;
}

async function addWrite(write: QueuedWrite) {
  await withStore<IDBValidKey>("readwrite", (store) => store.put(write));
}

async function removeWrite(id: string) {
  await withStore<undefined>("readwrite", (store) => store.delete(id));
}

async function replaceWrite(write: QueuedWrite) {
  await withStore<IDBValidKey>("readwrite", (store) => store.put(write));
}

function readableError(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return "Save failed";
}

async function execute(write: QueuedWrite) {
  if (write.kind === "setting-upsert") {
    const { error } = await supabase.from("voxa_user_data").upsert({ user_id: write.userId, key: write.key, value: write.value }, { onConflict: "user_id,key" });
    if (error) throw error;
    return;
  }
  if (write.kind === "history-upsert") {
    const { entry } = write;
    const { error } = await supabase.from("voxa_history_entries").upsert({
      id: entry.id, user_id: write.userId, spoken_text: entry.text, category: entry.category,
      display_time: entry.time, activity_date: entry.date, occurred_at: entry.occurredAt,
    });
    if (error) throw error;
    return;
  }
  if (write.kind === "history-clear") {
    const { error } = await supabase.from("voxa_history_entries").delete().eq("user_id", write.userId).lte("occurred_at", write.beforeOccurredAt);
    if (error) throw error;
    return;
  }
  if (write.kind === "button-upsert") {
    const { button } = write;
    const { error } = await supabase.from("voxa_custom_buttons").upsert({
      id: button.id, user_id: write.userId, label: button.label, emoji: button.emoji,
      category: button.category, phrase: button.phrase || null, image_path: button.imagePath || null,
      color: button.color || null, action: button.action || null, position: button.position,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("voxa_custom_buttons").delete().eq("user_id", write.userId).eq("id", write.id);
  if (error) throw error;
}

function scheduleRetry(delay: number) {
  if (typeof window === "undefined") return;
  if (retryTimer) window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => void flushPersistenceQueue(), delay);
}

export async function flushPersistenceQueue() {
  if (!activeUserId || processing || (typeof navigator !== "undefined" && !navigator.onLine)) return processing;
  processing = (async () => {
    emit({ saving: true });
    const userId = activeUserId!;
    while (activeUserId === userId) {
      const write = (await listWrites(userId))[0];
      if (!write) break;
      if (write.nextAttemptAt > Date.now()) { scheduleRetry(write.nextAttemptAt - Date.now()); break; }
      try {
        await execute(write);
        await removeWrite(write.id);
        if (activeUserId === userId) emit({ pending: await countWrites(userId), lastSavedAt: Date.now(), lastError: undefined });
      } catch (error) {
        const attempts = write.attempts + 1;
        const delay = Math.min(30_000, 1_000 * 2 ** Math.min(attempts - 1, 5));
        await replaceWrite({ ...write, attempts, nextAttemptAt: Date.now() + delay });
        if (activeUserId === userId) emit({ pending: await countWrites(userId), lastError: readableError(error) });
        reportError("persistence-retry");
        scheduleRetry(delay);
        break;
      }
    }
  })().finally(() => { processing = undefined; emit({ saving: false }); });
  return processing;
}

async function enqueue(userId: string, payload: QueuePayload) {
  const existing = await listWrites(userId);
  const lastCreatedAt = existing.at(-1)?.createdAt || 0;
  const write: QueuedWrite = { ...payload, id: crypto.randomUUID(), userId, createdAt: Math.max(Date.now(), lastCreatedAt + 1), attempts: 0, nextAttemptAt: 0 };
  await addWrite(write);
  emit({ pending: await countWrites(userId) });
  void flushPersistenceQueue();
  return write.id;
}

export async function queueSettingSave(userId: string, key: string, value: Json) {
  return enqueue(userId, { kind: "setting-upsert", key, value });
}

export async function queueHistorySave(userId: string, entry: HistoryRecord) {
  let writeId: string;
  try {
    writeId = await enqueue(userId, { kind: "history-upsert", entry });
  } catch (error) {
    emit({ lastError: "History could not be queued for saving. Please try again." });
    reportError("history-local-queue");
    throw error;
  }
  await flushPersistenceQueue();
  const stillPending = (await listWrites(userId)).some((write) => write.id === writeId);
  if (stillPending) {
    const message = status.lastError || (typeof navigator !== "undefined" && !navigator.onLine ? "You're offline. History will retry when your connection returns." : "History could not be saved yet. Voxa will retry automatically.");
    emit({ lastError: message });
    scheduleRetry(1_000);
    throw new Error(message);
  }
  return writeId;
}

export async function queueHistoryClear(userId: string, beforeOccurredAt = new Date().toISOString()) {
  return enqueue(userId, { kind: "history-clear", beforeOccurredAt });
}

export async function queueButtonSave(userId: string, button: CustomButtonRecord) {
  return enqueue(userId, { kind: "button-upsert", button });
}

export async function queueButtonDelete(userId: string, id: string) {
  return enqueue(userId, { kind: "button-delete", id });
}

export async function loadSettings(userId: string) {
  const { data, error } = await supabase.from("voxa_user_data").select("key,value").eq("user_id", userId);
  if (error) throw error;
  return new Map<string, Json>((data || []).map((row) => [row.key, row.value]));
}

export async function loadHistory(userId: string) {
  const records: HistoryRecord[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from("voxa_history_entries").select("id,spoken_text,category,display_time,activity_date,occurred_at").eq("user_id", userId).order("occurred_at", { ascending: false }).order("id", { ascending: false }).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data || []).map((row) => ({ id: row.id, text: row.spoken_text, category: row.category, time: row.display_time, date: row.activity_date, occurredAt: row.occurred_at }));
    records.push(...page);
    if (page.length < PAGE_SIZE) return records;
  }
}

export async function loadCustomButtons(userId: string) {
  const { data, error } = await supabase.from("voxa_custom_buttons").select("id,label,emoji,category,phrase,image_path,color,action,position").eq("user_id", userId).order("position").order("id");
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id, label: row.label, emoji: row.emoji, category: row.category,
    phrase: row.phrase || undefined, imagePath: row.image_path || undefined,
    color: row.color || undefined, action: row.action || undefined, position: row.position,
  }));
}

export async function setPersistenceUser(userId?: string) {
  activeUserId = userId;
  if (!userId) { emit({ pending: 0, saving: false, lastError: undefined }); return; }
  emit({ pending: await countWrites(userId) });
  void flushPersistenceQueue();
  if (lifecycleStarted || typeof window === "undefined") return;
  lifecycleStarted = true;
  window.addEventListener("online", () => void flushPersistenceQueue());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") void flushPersistenceQueue(); });
  window.addEventListener("pagehide", () => void flushPersistenceQueue());
}
