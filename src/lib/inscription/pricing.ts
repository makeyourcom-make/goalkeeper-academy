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
  tour1: 16,
  tour2: 18,
  season: 34,
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
