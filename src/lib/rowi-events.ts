/** Open the Rowi chat from anywhere, optionally asking a question straight away. */
export const ROWI_OPEN_EVENT = 'rowi:open';

export function openRowi(question?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<{ question?: string }>(ROWI_OPEN_EVENT, { detail: { question } }));
}
