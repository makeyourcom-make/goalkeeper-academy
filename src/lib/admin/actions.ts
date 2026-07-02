"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendPaymentConfirmation } from "@/lib/email/payment-confirmation";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") return null;
  return supabase;
}

export async function markInvoicePaid(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await requireAdmin();
  if (!supabase) return;

  // Only transition pending → paid; send the same confirmation email as the
  // Stripe flow so QR / bank-transfer payers are notified too.
  const { data: updated } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if ((updated?.length ?? 0) > 0) {
    await sendPaymentConfirmation(supabase, id);
  }

  revalidatePath("/", "layout");
}
