"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyAdminNewRegistration } from "@/lib/email/admin-notify";
import {
  CADENCE_MONTHS,
  INSTALLMENTS,
  SESSIONS,
  computeTotals,
  installmentCents,
  isAudience,
  isCadence,
  isFormula,
  isPaymentMethod,
  priceFor,
  type Cadence,
  type OrderKeeper,
  type PaymentMethod,
} from "@/lib/inscription/pricing";

export type RegistrationResult =
  | {
      status: "ok";
      planId: string;
      method: PaymentMethod;
      cadence: Cadence;
      firstInvoiceNumber: string;
      total: number;
      installments: number;
    }
  | { status: "auth" }
  | { status: "error" };

const REF_YEAR = 2026;

type SubmitInput = {
  profile: "private" | "club";
  org?: string;
  notes?: string;
  keepers: OrderKeeper[];
  method: PaymentMethod;
  cadence: Cadence;
};

function registrationType(formula: string): string {
  if (formula === "season") return "annuel";
  if (formula === "single") return "particulier";
  return "mensuel"; // tour1 / tour2
}

function addMonths(base: Date, n: number): Date {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Persist a wizard order: ensure the keepers exist as children, create one
// payment plan (method + cadence), N installment invoices (one per due date)
// and one registration per keeper. Requires an authenticated parent/club.
// Price is recomputed here — never trusts amounts from the client.
export async function submitRegistration(
  input: SubmitInput,
): Promise<RegistrationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "auth" };

  if (!isPaymentMethod(input.method) || !isCadence(input.cadence)) {
    return { status: "error" };
  }
  const method = input.method;

  const keepers = (input.keepers ?? []).filter(
    (k) =>
      isAudience(k.audience) &&
      isFormula(k.formula) &&
      k.firstName.trim() &&
      k.lastName.trim(),
  );
  if (keepers.length === 0) return { status: "error" };

  // A "séance découverte" (single) is paid once — never split. Only season/tour
  // orders may keep the chosen cadence. Enforced here (never trust the client).
  const allowInstallments = keepers.some((k) => k.formula !== "single");
  const cadence = allowInstallments ? input.cadence : "annual";

  const { total } = computeTotals(keepers);
  if (total <= 0) return { status: "error" };

  const installmentsTotal = INSTALLMENTS[cadence];
  const perCents = installmentCents(total, cadence);

  const admin = createSupabaseAdminClient();

  // 1. Payment plan (one per order).
  const { data: plan, error: planErr } = await admin
    .from("payment_plans")
    .insert({
      profile_id: user.id,
      method,
      cadence,
      installments_total: installmentsTotal,
      installments_paid: 0,
      amount_total_cents: total * 100,
      amount_per_installment_cents: perCents,
      currency: "CHF",
      status: "pending",
    })
    .select("id")
    .single();
  if (planErr || !plan) return { status: "error" };

  // 2. Installment invoices (one per due date). Card subscriptions and manual
  //    (twint/qr) plans all share this uniform schedule — the webhook (or the
  //    admin, for qr) marks them paid one by one.
  const invoicePaymentMethod = method === "card" ? "stripe" : method;
  const now = new Date();
  let firstInvoiceId = "";
  let firstInvoiceNumber = "";
  for (let i = 1; i <= installmentsTotal; i++) {
    const dueDate = isoDate(addMonths(now, (i - 1) * CADENCE_MONTHS[cadence]));
    const { data: inv, error: invErr } = await admin
      .from("invoices")
      .insert({
        profile_id: user.id,
        type: "subscription",
        amount_cents: perCents,
        currency: "CHF",
        status: "pending",
        due_date: dueDate,
        payment_method: invoicePaymentMethod,
        payment_plan_id: plan.id,
        installment_number: i,
      })
      .select("id, invoice_number")
      .single();
    if (invErr || !inv) return { status: "error" };
    if (i === 1) {
      firstInvoiceId = inv.id;
      firstInvoiceNumber = inv.invoice_number;
    }
  }

  // 3. Children (reuse an exact match for this parent, else create) + one
  //    registration per keeper, linked to the plan.
  for (const k of keepers) {
    const year = parseInt(k.birthYear || "0", 10);
    const birthDate =
      year >= 1900 && year <= REF_YEAR ? `${year}-01-01` : `${REF_YEAR}-01-01`;
    const firstName = k.firstName.trim();
    const lastName = k.lastName.trim();

    const { data: existing } = await admin
      .from("children")
      .select("id")
      .eq("parent_id", user.id)
      .eq("first_name", firstName)
      .eq("last_name", lastName)
      .eq("birth_date", birthDate)
      .maybeSingle();

    let childId = existing?.id ?? null;
    if (!childId) {
      const { data: child, error: childErr } = await admin
        .from("children")
        .insert({
          parent_id: user.id,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          registration_type: registrationType(k.formula),
          subscription_status: "active",
        })
        .select("id")
        .single();
      if (childErr || !child) return { status: "error" };
      childId = child.id;
    }

    const { error: regErr } = await admin.from("registrations").insert({
      invoice_id: firstInvoiceId || null,
      payment_plan_id: plan.id,
      profile_id: user.id,
      child_id: childId,
      audience: k.audience,
      formula: k.formula,
      sessions_count: SESSIONS[k.formula],
      amount_cents: priceFor(k.audience, k.formula) * 100,
      // Place secured as soon as the registration is submitted on the site.
      status: "confirmed",
    });
    if (regErr) return { status: "error" };
  }

  // Alert the admin that a new family registered.
  await notifyAdminNewRegistration(admin, {
    invoiceNumber: firstInvoiceNumber,
    total,
    method,
    cadence,
    keeperNames: keepers.map((k) => `${k.firstName} ${k.lastName}`.trim()),
    contactEmail: user.email ?? "",
  });

  revalidatePath("/", "layout");
  return {
    status: "ok",
    planId: plan.id,
    method,
    cadence,
    firstInvoiceNumber,
    total,
    installments: installmentsTotal,
  };
}
