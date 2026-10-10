// A browser can dispatch start more than once. Persist one entry per utterance,
// while separate intentional utterances still receive separate history IDs.
export function bindSpeechHistory(utterance: SpeechSynthesisUtterance, onStart: () => void, save: () => Promise<void>) {
  let started = false;
  utterance.onstart = async () => {
    onStart();
    if (started) return;
    started = true;
    await save();
  };
}
