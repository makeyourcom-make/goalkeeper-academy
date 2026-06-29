"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

const SCHEMA = z.object({
  slug: z.string().min(1),
  locale: z.enum(["fr", "en"]),
  childName: z.string().trim().min(1).max(160),
  parentEmail: z.string().trim().email(),
  paymentMethod: z.enum(["card", "twint", "qr_bill"]),
  amount: z.coerce.number().int().positive(),
});

function fakeInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `GKA-${year}-${rand}`;
}

export async function simulateCheckout(formData: FormData): Promise<void> {
  const parsed = SCHEMA.safeParse({
    slug: formData.get("slug"),
    locale: formData.get("locale"),
    childName: formData.get("childName"),
    parentEmail: formData.get("parentEmail"),
    paymentMethod: formData.get("paymentMethod"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    redirect(
      `/${formData.get("locale") ?? "fr"}/stages/${formData.get("slug") ?? ""}/reservation?error=invalid`,
    );
  }

  const invoiceNumber = fakeInvoiceNumber();

  const cookieStore = await cookies();
  cookieStore.set(
    "gka_demo_checkout",
    JSON.stringify({
      invoiceNumber,
      slug: parsed.data.slug,
      childName: parsed.data.childName,
      parentEmail: parsed.data.parentEmail,
      paymentMethod: parsed.data.paymentMethod,
      amount: parsed.data.amount,
      paidAt: new Date().toISOString(),
    }),
    {
      path: "/",
      maxAge: 60 * 30, // 30 minutes — demo session
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    },
  );

  redirect(
    `/${parsed.data.locale}/stages/${parsed.data.slug}/reservation/confirmation`,
  );
}
