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

// Séances créditées au forfait du gardien, à ne pas confondre avec SESSIONS
// ci-dessus, qui reste la base de facturation. Depuis octobre 2026, un Tour ou
// une saison n'ouvre plus un nombre fixe de séances: le calendrier dépend de la
// disponibilité des installations. On compte alors simplement les séances
// effectuées, sans solde. La séance découverte, elle, reste à l'unité.
export const SESSION_ALLOWANCE: Record<Formula, number> = {
  single: 1,
  tour1: 0,
  tour2: 0,
  season: 0,
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
// Méthodes proposées à l'inscription. "qr_bill" reste dans le type parce que
// des plans et des factures existants le portent, mais il n'est plus offert:
// l'association n'a pas de compte bancaire (tout passe par Stripe), donc une
// facture à virer était impayable et finissait en rappel d'impayé.
export const PAYMENT_METHODS: PaymentMethod[] = ["card", "twint"];

// annual = paid once; the others split the total into N installments.
export type Cadence = "annual" | "semiannual" | "quarterly" | "monthly";
export const CADENCES: Cadence[] = [
  "annual",
  "semiannual",
  "quarterly",
  "monthly",
];

// Un étalement ne peut pas courir au-delà de six mois. La saison de football
// se termine en mai ou en juin: un plan signé fin octobre sur dix mensualités
// arrivait à échéance le 29 juillet, soit deux mois après la dernière séance.
// Toute cadence ajoutée ici doit vérifier planSpanMonths() <= MAX_PLAN_MONTHS.
export const MAX_PLAN_MONTHS = 6;

// Number of installments per cadence.
export const INSTALLMENTS: Record<Cadence, number> = {
  annual: 1,
  semiannual: 2,
  quarterly: 3,
  monthly: 6,
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

// Mois écoulés entre la signature et le dernier versement.
export function planSpanMonths(cadence: Cadence): number {
  return (INSTALLMENTS[cadence] - 1) * CADENCE_MONTHS[cadence];
}

// Garde-fou contre le retour du plan sur dix mensualités: une cadence trop
// longue fait échouer le build. Vérifié hors production seulement, où lever une
// exception à l'import mettrait le site hors ligne pour une erreur de réglage.
if (process.env.NODE_ENV !== "production") {
  for (const c of CADENCES) {
    if (planSpanMonths(c) > MAX_PLAN_MONTHS) {
      throw new Error(
        `Cadence "${c}" : ${planSpanMonths(c)} mois d'étalement, ${MAX_PLAN_MONTHS} au maximum.`,
      );
    }
  }
}

// Montant de référence d'un versement, en centimes. C'est celui qui s'affiche
// au tunnel d'inscription et que Stripe prélève à chaque échéance d'une carte.
export function installmentCents(totalChf: number, cadence: Cadence): number {
  return Math.floor(Math.round(totalChf * 100) / INSTALLMENTS[cadence]);
}

// Le détail des versements, dont la somme vaut exactement le total. Un total
// remisé (rabais multi-gardiens) ne se divise pas toujours en parts égales: le
// reste, quelques centimes au plus, va sur le premier versement, celui qui est
// encaissé tout de suite. La comptabilité doit tomber juste au centime.
export function installmentSplit(
  totalChf: number,
  cadence: Cadence,
): [number, ...number[]] {
  const count = INSTALLMENTS[cadence];
  const base = installmentCents(totalChf, cadence);
  const rest = Math.round(totalChf * 100) - base * count;
  const rows: [number, ...number[]] = [base + rest];
  for (let i = 1; i < count; i++) rows.push(base);
  return rows;
}
