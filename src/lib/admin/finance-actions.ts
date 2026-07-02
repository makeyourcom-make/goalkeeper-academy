"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FinanceFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SCHEMA = z.object({
  kind: z.enum(["income", "expense"]),
  category: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(160),
  amount: z.coerce.number().positive().max(1_000_000),
  occurred_on: z.string().regex(DATE),
  paid_by: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

const RECEIPT_MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const RECEIPT_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// Uploads a receipt (image or PDF) into the private "receipts" bucket. Returns
// an error key on failure, or {} when there is simply no file.
async function uploadReceipt(
  supabase: SupabaseClient,
  file: FormDataEntryValue | null,
): Promise<{ path?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > RECEIPT_MAX_BYTES) return { error: "errorReceiptSize" };
  const ext = RECEIPT_EXT[file.type];
  if (!ext) return { error: "errorReceiptType" };

  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: "errorReceiptUpload" };
  return { path };
}

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

export async function addTransaction(
  _prev: FinanceFormState,
  formData: FormData,
): Promise<FinanceFormState> {
  const supabase = await requireAdmin();
  if (!supabase) return { status: "error", message: "errorAuth" };

  const parsed = SCHEMA.safeParse({
    kind: formData.get("kind"),
    category: formData.get("category"),
    label: formData.get("label"),
    amount: formData.get("amount"),
    occurred_on: formData.get("occurred_on"),
    paid_by: formData.get("paid_by") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "errorValidation" };
  }

  // Receipts only make sense for expenses.
  let receiptPath: string | null = null;
  if (parsed.data.kind === "expense") {
    const receipt = await uploadReceipt(supabase, formData.get("receipt"));
    if (receipt.error) {
      return { status: "error", message: receipt.error };
    }
    receiptPath = receipt.path ?? null;
  }

  const { error } = await supabase.from("transactions").insert({
    kind: parsed.data.kind,
    category: parsed.data.category,
    label: parsed.data.label,
    amount: parsed.data.amount,
    occurred_on: parsed.data.occurred_on,
    notes: parsed.data.notes,
    paid_by: parsed.data.kind === "expense" ? parsed.data.paid_by : null,
    receipt_url: receiptPath,
  });
  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  revalidatePath("/", "layout");
  return { status: "success", message: "success" };
}

// Toggle whether an expense's advancer has been reimbursed.
export async function setReimbursed(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const value = formData.get("reimbursed") === "true";

  await supabase
    .from("transactions")
    .update({
      reimbursed: value,
      reimbursed_at: value ? new Date().toISOString() : null,
    })
    .eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteTransaction(formData: FormData): Promise<void> {
  const supabase = await requireAdmin();
  if (!supabase) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("transactions").delete().eq("id", id);
  revalidatePath("/", "layout");
}
