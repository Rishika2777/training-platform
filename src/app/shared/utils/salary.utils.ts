/**
 * Salary value format: "5 LPA" or "25K"
 * LPA = Lakhs Per Annum (1 L = ₹1,00,000)
 * K = Thousands
 */

export type SalaryUnit = 'LPA' | 'K';

export interface ParsedSalary {
  amount: number;
  unit: SalaryUnit;
  raw: string;
}

/**
 * Parses a salary string like "5 LPA" or "25K" into amount and unit.
 */
export function parseSalary(value: string | null | undefined): ParsedSalary | null {
  const s = (value ?? '').trim();
  if (!s) return null;

  // Check K first (more specific: "25K" or "25 K")
  const kMatch = s.match(/^(\d+(?:\.\d+)?)\s*K$/i);
  if (kMatch) {
    const amount = parseFloat(kMatch[1]);
    if (!isNaN(amount)) return { amount, unit: 'K', raw: s };
  }

  // Match "5 LPA" or "5.5 LPA" or "5" (plain number = LPA by default)
  const lpaMatch = s.match(/^(\d+(?:\.\d+)?)(?:\s*(?:LPA|Lac|lakh|lakhs))?$/i);
  if (lpaMatch) {
    const amount = parseFloat(lpaMatch[1]);
    if (!isNaN(amount)) return { amount, unit: 'LPA', raw: s };
  }

  return null;
}

/** Returns true if the salary value is in LPA (Lakhs Per Annum). */
export function isLpa(value: string | null | undefined): boolean {
  const parsed = parseSalary(value);
  return parsed?.unit === 'LPA';
}

/** Returns true if the salary value is in K (Thousands). */
export function isK(value: string | null | undefined): boolean {
  const parsed = parseSalary(value);
  return parsed?.unit === 'K';
}

/** Extracts numeric amount for validation (e.g. 5 from "5 LPA"). */
export function getSalaryAmount(value: string | null | undefined): number {
  const parsed = parseSalary(value);
  return parsed?.amount ?? NaN;
}

/** Formats a parsed salary for display (e.g. "5 LPA", "25K"). */
export function formatSalary(amount: number, unit: SalaryUnit): string {
  if (unit === 'LPA') return `${amount} LPA`;
  return `${amount}K`;
}
