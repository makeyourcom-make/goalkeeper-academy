// Shared pricing logic for the inscription wizard.
// Used by the client component (display) AND the server checkout route
// (authoritative recompute — never trust amounts sent by the client).

export type Audience = "youth" | "adult";
export type Formula = "single" | "tour1" | "tour2" | "season";

export const AUDIENCES: Audience[] = ["youth", "adult"];
export const FORMULAS: Formula[] = ["single", "tour1", "tour2", "season"];

// Price per session, in CHF.
export const PRICING: Record<Audience, Record<Formula, number>> = {
  youth: { single: 45, tour1: 43, tour2: 43, season: 40 },
  adult: { single: 50, tour1: 48, tour2: 48, season: 44 },
};

// Number of sessions billed per formula.
export const SESSIONS: Record<Formula, number> = {
  single: 1,
  tour1: 18,
  tour2: 18,
  season: 36,
};

export function priceFor(audience: Audience, formula: Formula): number {
  return PRICING[audience][formula] * SESSIONS[formula];
}

// Automatic volume discount based on the number of registered goalkeepers.
export function volumeDiscount(count: number): number {
  if (count >= 10) return 0.15;
  if (count >= 6) return 0.1;
  if (count >= 3) return 0.07;
  if (count >= 2) return 0.05;
  return 0;
}

export type OrderKeeper = {
  firstName: string;
  lastName: string;
  birthYear: string;
  audience: Audience;
  formula: Formula;
};

export type Order = {
  profile: "private" | "club";
  org?: string;
  notes?: string;
  keepers: OrderKeeper[];
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
};

export function isAudience(v: unknown): v is Audience {
  return v === "youth" || v === "adult";
}

export function isFormula(v: unknown): v is Formula {
  return (FORMULAS as readonly string[]).includes(v as string);
}

export type PricedOrder = {
  subtotal: number;
  discountRate: number;
  total: number;
};

// Authoritative price computation. Rounds to whole CHF.
export function computeTotals(keepers: OrderKeeper[]): PricedOrder {
  const subtotal = keepers.reduce(
    (sum, k) => sum + priceFor(k.audience, k.formula),
    0,
  );
  const discountRate = volumeDiscount(keepers.length);
  const total = Math.round(subtotal * (1 - discountRate));
  return { subtotal, discountRate, total };
}

// ============================================================================
// Payment methods + installment cadences
// ============================================================================

export type PaymentMethod = "card" | "twint" | "qr_bill";
export const PAYMENT_METHODS: PaymentMethod[] = ["card", "twint", "qr_bill"];

// annual = paid once; the others split the total into N installments.
export type Cadence = "annual" | "semiannual" | "quarterly" | "monthly";
export const CADENCES: Cadence[] = [
  "annual",
  "semiannual",
  "quarterly",
  "monthly",
];

// Number of installments per cadence. "monthly" = 10 (sports season Sep→Jun).
export const INSTALLMENTS: Record<Cadence, number> = {
  annual: 1,
  semiannual: 2,
  quarterly: 4,
  monthly: 10,
};

// Recurring interval for card auto-charge (Stripe subscriptions). "annual" is a
// one-time payment, so it has no recurring interval.
export const CADENCE_INTERVAL: Record<
  Exclude<Cadence, "annual">,
  { interval: "month"; interval_count: number }
> = {
  semiannual: { interval: "month", interval_count: 6 },
  quarterly: { interval: "month", interval_count: 3 },
  monthly: { interval: "month", interval_count: 1 },
};

// Months between two installments (used to schedule due dates for twint/qr).
export const CADENCE_MONTHS: Record<Cadence, number> = {
  annual: 12,
  semiannual: 6,
  quarterly: 3,
  monthly: 1,
};

export function isPaymentMethod(v: unknown): v is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(v as string);
}

export function isCadence(v: unknown): v is Cadence {
  return (CADENCES as readonly string[]).includes(v as string);
}

// Per-installment amount in cents. Totals are whole CHF and every installment
// count (1/2/4/10) divides 100 cleanly, so this is always an exact integer.
export function installmentCents(totalChf: number, cadence: Cadence): number {
  return Math.round((totalChf * 100) / INSTALLMENTS[cadence]);
}
