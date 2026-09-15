export type PlanId = 'free' | 'pro' | 'premium' | (string & {});
export interface EntitlementRow { plan_id: string; feature: string; limit_value: number | null }
/** plan → feature → limit (null = illimité). Absence = pas le droit. */
export type Matrix = Record<string, Record<string, number | null>>;

export function buildMatrix(rows: EntitlementRow[]): Matrix {
  const m: Matrix = {};
  for (const r of rows) (m[r.plan_id] ??= {})[r.feature] = r.limit_value;
  return m;
}
const planOf = (m: Matrix, plan: string) => m[plan] ?? m['free'] ?? {};
export function limit(m: Matrix, plan: string, feature: string): number | null {
  const p = planOf(m, plan);
  return feature in p ? p[feature] : 0;
}
export function has(m: Matrix, plan: string, feature: string): boolean {
  const l = limit(m, plan, feature);
  return l === null || l > 0;
}
