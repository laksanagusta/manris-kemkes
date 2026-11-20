import { businessNow } from "./business-clock.ts";
export type ProcessProgress = {
  status: 'pending' | 'ongoing' | 'done';
  completed: number;
  total: number;
  id?: string | null;
  note?: string;
};

export function progressPercent({ completed, total }: Pick<ProcessProgress, 'completed' | 'total'>): number | null {
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(completed)) return null;
  return Math.max(0, Math.min(100, Math.floor(completed / total * 100)));
}

export function periodWindowState(period: { opensOn: string; closesOn: string }, now = businessNow()): 'upcoming' | 'open' | 'closed' {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (today < period.opensOn) return 'upcoming';
  if (today > period.closesOn) return 'closed';
  return 'open';
}

export function periodObservationDate(rule: {year:number;frequency:'monthly'|'quarterly'|'semester'}, period:{ordinal:number}, today:string):string {
  const months = rule.frequency === 'monthly' ? 1 : rule.frequency === 'quarterly' ? 3 : 6;
  const end = new Date(Date.UTC(rule.year, period.ordinal * months, 0)).toISOString().slice(0,10);
  return today < end ? today : end;
}
