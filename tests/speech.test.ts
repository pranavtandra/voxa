import { describe, expect, it, vi } from "vitest";
import { bindSpeechHistory } from "@/lib/speech";

describe("speech history timing", () => {
  it("saves only at speech start and ignores duplicate start events", async () => {
    const utterance = {} as SpeechSynthesisUtterance;
    const save = vi.fn(async () => {});
    bindSpeechHistory(utterance, vi.fn(), save);
    expect(save).not.toHaveBeenCalled();
    await utterance.onstart!.call(utterance, {} as SpeechSynthesisEvent);
    await utterance.onstart!.call(utterance, {} as SpeechSynthesisEvent);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("records repeated phrases spoken as separate utterances", async () => {
    const save = vi.fn(async () => {});
    for (let i = 0; i < 3; i++) {
      const utterance = {} as SpeechSynthesisUtterance;
      bindSpeechHistory(utterance, vi.fn(), save);
      await utterance.onstart!.call(utterance, {} as SpeechSynthesisEvent);
    }
    expect(save).toHaveBeenCalledTimes(3);
  });
});
