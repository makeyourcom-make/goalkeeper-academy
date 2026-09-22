import { NextResponse } from "next/server";

import { buildInvoicePdf } from "@/lib/invoices/pdf";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Serves an invoice as a PDF. Deliberately built with the CALLER's client, so
// row-level security does the access control: a parent only ever reaches their
// own invoices, an admin reaches every one, and a signed-out visitor none.
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const pdf = await buildInvoicePdf(supabase, params.id);
  if (!pdf) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(pdf.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
      // An invoice can change (paid, refunded): never let a proxy keep it.
      "Cache-Control": "private, no-store",
    },
  });
}
