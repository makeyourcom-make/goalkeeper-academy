"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  SESSIONS,
  computeTotals,
  isAudience,
  isFormula,
  priceFor,
  type OrderKeeper,
} from "@/lib/inscription/pricing";

export type RegistrationResult =
  | { status: "ok"; invoiceId: string; invoiceNumber: string; total: number }
  | { status: "auth" }
  | { status: "error" };

const REF_YEAR = 2026;

type SubmitInput = {
  profile: "private" | "club";
  org?: string;
  notes?: string;
  keepers: OrderKeeper[];
};

function registrationType(formula: string): string {
  if (formula === "season") return "annuel";
  if (formula === "single") return "particulier";
  return "mensuel"; // tour1 / tour2
}

// Persist a wizard order: ensure the keepers exist as children, create one
// pending invoice (the discounted basket) and one registration per keeper.
// Requires an authenticated parent/club. Price is recomputed here — never
// trusts amounts from the client.
export async function submitRegistration(
  input: SubmitInput,
): Promise<RegistrationResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "auth" };

  const keepers = (input.keepers ?? []).filter(
    (k) =>
      isAudience(k.audience) &&
      isFormula(k.formula) &&
      k.firstName.trim() &&
      k.lastName.trim(),
  );
  if (keepers.length === 0) return { status: "error" };

  const { total } = computeTotals(keepers);
  if (total <= 0) return { status: "error" };

  const admin = createSupabaseAdminClient();

  // 1. Invoice (one per order).
  const { data: invoice, error: invErr } = await admin
    .from("invoices")
    .insert({
      profile_id: user.id,
      type: "subscription",
      amount_cents: total * 100,
      currency: "CHF",
      status: "pending",
    })
    .select("id, invoice_number")
    .single();
  if (invErr || !invoice) return { status: "error" };

  // 2. Children (reuse an exact match for this parent, else create) + 3. one
  //    registration per keeper, linked to the invoice.
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
      invoice_id: invoice.id,
      profile_id: user.id,
      child_id: childId,
      audience: k.audience,
      formula: k.formula,
      sessions_count: SESSIONS[k.formula],
      amount_cents: priceFor(k.audience, k.formula) * 100,
      status: "pending",
    });
    if (regErr) return { status: "error" };
  }

  revalidatePath("/", "layout");
  return {
    status: "ok",
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    total,
  };
}
