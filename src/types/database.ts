/**
 * Hand-maintained subset of the Supabase schema. Mirrors
 * `supabase/migrations/0001_profiles.sql` and `0002_phase6_tables.sql`.
 *
 * Keep in sync if you alter the SQL.
 */

export type ProfileRole = "parent" | "club" | "coach" | "admin";
export type ProfileLanguage = "fr" | "en";

export type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: ProfileRole;
  language: ProfileLanguage;
  marketing_consent: boolean;
  iban: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | "first_name"
    | "last_name"
    | "phone"
    | "marketing_consent"
    | "language"
    | "iban"
    | "avatar_url"
  >
>;

export type ChildLevel =
  | "debutant"
  | "intermediaire"
  | "avance"
  | "competition";
export type DominantHand = "droite" | "gauche" | "ambidextre";
export type RegistrationType = "annuel" | "mensuel" | "particulier" | "club";
export type SubscriptionStatus = "active" | "paused" | "cancelled" | "ended";

export type Child = {
  id: string;
  parent_id: string;
  club_id: string | null;
  first_name: string;
  last_name: string;
  birth_date: string; // ISO date
  level: ChildLevel | null;
  dominant_hand: DominantHand | null;
  medical_notes: string | null;
  photo_consent: boolean;
  photo_url: string | null;
  registration_type: RegistrationType | null;
  subscription_status: SubscriptionStatus;
  registered_at: string;
};

export type ChildInsert = Omit<
  Child,
  "id" | "registered_at" | "subscription_status"
> & {
  subscription_status?: SubscriptionStatus;
};

export type ChildUpdate = Partial<
  Pick<
    Child,
    | "first_name"
    | "last_name"
    | "birth_date"
    | "level"
    | "dominant_hand"
    | "medical_notes"
    | "photo_consent"
    | "photo_url"
    | "registration_type"
  >
>;

export type Session = {
  id: string;
  title: string;
  description: string | null;
  coach_id: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  level: string | null;
  recurrence_rule: string | null;
  status: "scheduled" | "completed" | "cancelled";
  created_at: string;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  profile_id: string;
  child_id: string | null;
  camp_registration_id: string | null;
  type: "subscription" | "camp" | "particulier" | "club_contract";
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "overdue" | "cancelled" | "refunded";
  due_date: string | null;
  paid_at: string | null;
  payment_method:
    | "stripe"
    | "twint"
    | "qr_bill"
    | "bank_transfer"
    | "cash"
    | null;
  stripe_session_id: string | null;
  pdf_url: string | null;
  issued_at: string;
  payment_plan_id: string | null;
  installment_number: number | null;
};

export type PaymentMethod = "card" | "twint" | "qr_bill";
export type Cadence = "annual" | "semiannual" | "quarterly" | "monthly";

export type PaymentPlan = {
  id: string;
  profile_id: string;
  method: PaymentMethod;
  cadence: Cadence;
  installments_total: number;
  installments_paid: number;
  amount_total_cents: number;
  amount_per_installment_cents: number;
  currency: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: "pending" | "active" | "completed" | "cancelled" | "past_due";
  created_at: string;
};
