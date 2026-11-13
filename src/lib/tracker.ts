import type { ApplicationStatus, Role } from '@/types/database';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
];

/** The forward path shown in the status stepper. Rejected / withdrawn are end states off the path. */
export const PIPELINE_PATH: ApplicationStatus[] = ['saved', 'applied', 'screening', 'interview', 'offer'];

export const STATUS_META: Record<
  ApplicationStatus,
  { label: string; short: string; bg: string; fg: string; dot: string; hint: string }
> = {
  saved: { label: 'Saved', short: 'Saved', bg: '#EFEEE8', fg: '#4A4B4F', dot: '#9A9B9E', hint: 'Not applied yet' },
  applied: { label: 'Applied', short: 'Applied', bg: '#FFF2B8', fg: '#5C4A00', dot: '#E0B400', hint: 'Waiting to hear back' },
  screening: { label: 'Screening', short: 'Screen', bg: '#E7E7EE', fg: '#3D3E66', dot: '#6F71B8', hint: 'Recruiter or HR call' },
  interview: { label: 'Interview', short: 'Interview', bg: '#E3EEF9', fg: '#1F4E79', dot: '#3D7FC4', hint: 'In interview rounds' },
  offer: { label: 'Offer', short: 'Offer', bg: '#EEF7F0', fg: '#2F6B42', dot: '#6FA77F', hint: 'Offer received' },
  rejected: { label: 'Rejected', short: 'Closed', bg: '#FFF0ED', fg: '#8F3B2E', dot: '#D97968', hint: 'Not moving forward' },
  withdrawn: { label: 'Withdrawn', short: 'Withdrawn', bg: '#F1F1F1', fg: '#5F6064', dot: '#B0B1B4', hint: 'You stepped back' },
};

export const SOURCES = ['Email', 'LinkedIn', 'Naukri', 'Indeed', 'Referral', 'Company site', 'Other'];

export const FOLLOW_UP_DAYS = 7;

export function statusOf(role: Role): ApplicationStatus {
  return (role.application_status as ApplicationStatus) || 'saved';
}

export function isActive(role: Role): boolean {
  const s = statusOf(role);
  return s !== 'rejected' && s !== 'withdrawn';
}

/** Local YYYY-MM-DD for today (dates are stored without time zone). */
export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function utcDay(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((utcDay(toISO) - utcDay(fromISO)) / 86400000);
}

/** When the next follow-up is due: explicit date, otherwise applied date + 7 for roles waiting on a reply. */
export function followUpDate(role: Role): string | null {
  if (role.next_follow_up) return role.next_follow_up;
  const s = statusOf(role);
  if ((s === 'applied' || s === 'screening') && role.applied_at) return addDaysISO(role.applied_at, FOLLOW_UP_DAYS);
  return null;
}

export function isFollowUpDue(role: Role, today = todayISO()): boolean {
  if (!isActive(role) || statusOf(role) === 'offer' || statusOf(role) === 'saved') return false;
  const due = followUpDate(role);
  return Boolean(due && due <= today);
}

export function relativeDay(iso: string | null | undefined, today = todayISO()): string {
  if (!iso) return '';
  const n = daysBetween(iso.slice(0, 10), today);
  if (n === 0) return 'today';
  if (n === 1) return 'yesterday';
  if (n === -1) return 'tomorrow';
  if (n > 1) return n < 30 ? `${n} days ago` : `${Math.round(n / 30)} mo ago`;
  return `in ${-n} days`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function isAnalyzed(role: Role): boolean {
  return role.status === 'ready' || role.status === 'analyzing';
}
