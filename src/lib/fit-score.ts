export type FitStatusKey = 'strong' | 'transferable' | 'investigation' | 'not_demonstrated';

export const FIT_STATUS_META: Record<FitStatusKey, { label: string; color: string; bg: string; fg: string }> = {
  strong: { label: 'Strong', color: '#5E9A6E', bg: '#EEF7F0', fg: '#3F7A52' },
  transferable: { label: 'Transferable', color: '#E8C23A', bg: '#FFF4CC', fg: '#7A5B00' },
  investigation: { label: 'Needs more evidence', color: '#D9A35B', bg: '#FFF2D2', fg: '#8A5A12' },
  not_demonstrated: { label: 'Not shown', color: '#D97968', bg: '#FFF0ED', fg: '#A4493A' },
};

export function fitStatusKey(status?: string | null): FitStatusKey {
  const s = (status || '').toLowerCase();
  if (s.includes('strong')) return 'strong';
  if (s.includes('transferable')) return 'transferable';
  if (s.includes('investigation')) return 'investigation';
  return 'not_demonstrated';
}

const WEIGHT: Record<FitStatusKey, number> = { strong: 1, transferable: 0.6, investigation: 0.3, not_demonstrated: 0 };

/** Equal weight per requirement; partial credit for related experience. 0–100. */
export function computeFitScore(statuses: (string | null | undefined)[]): number {
  if (statuses.length === 0) return 0;
  const sum = statuses.reduce((acc, s) => acc + WEIGHT[fitStatusKey(s)], 0);
  return Math.round((sum / statuses.length) * 100);
}

export function fitBand(score: number) {
  if (score >= 80) return { label: 'Strong fit', bg: '#EEF7F0', fg: '#3F7A52' };
  if (score >= 60) return { label: 'Good fit', bg: '#FFF4CC', fg: '#7A5B00' };
  if (score >= 40) return { label: 'Partial fit', bg: '#FFF2D2', fg: '#8A5A12' };
  return { label: 'Stretch role', bg: '#FFF0ED', fg: '#A4493A' };
}
