import { NextRequest, NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/client";
import {
  computeTotals,
  isAudience,
  isFormula,
  type OrderKeeper,
} from "@/lib/inscription/pricing";

type Body = {
  order?: {
    profile?: string;
    org?: string;
    keepers?: OrderKeeper[];
    contact?: { email?: string };
  };
  locale?: string;
  invoiceId?: string;
};

export async function POST(req: NextRequest) {
  // Stripe not configured yet → tell the client to fall back to the email flow.
  if (!stripe) {
    return NextResponse.json({ configured: false });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const order = body.order;
  const locale = body.locale === "en" ? "en" : "fr";
  if (!order || !Array.isArray(order.keepers)) {
    return NextResponse.json({ error: "invalid order" }, { status: 400 });
  }

  // Keep only well-formed keepers — we recompute the price ourselves and
  // never trust any amount sent by the client.
  const keepers: OrderKeeper[] = order.keepers.filter(
    (k) => isAudience(k.audience) && isFormula(k.formula),
  );
  if (keepers.length === 0) {
    return NextResponse.json({ error: "no keepers" }, { status: 400 });
  }

  const { total } = computeTotals(keepers);
  if (total <= 0) {
    return NextResponse.json({ error: "empty order" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "chf",
            unit_amount: total * 100,
            product_data: {
              name: `The Last Line — inscription (${keepers.length} gardien${keepers.length > 1 ? "s" : ""})`,
            },
          },
        },
      ],
      customer_email: order.contact?.email || undefined,
      success_url: `${siteUrl}/${locale}/reserver?paid=1`,
      cancel_url: `${siteUrl}/${locale}/reserver?canceled=1`,
      metadata: {
        profile: order.profile ?? "",
        org: order.org ?? "",
        keepers: String(keepers.length),
        total: String(total),
        invoiceId: body.invoiceId ?? "",
      },
    });
    return NextResponse.json({ url: session.url });
  } catch {
    // Placeholder/invalid key or Stripe unavailable: let the client fall back
    // to the email flow instead of erroring out.
    return NextResponse.json({ configured: false });
  }
}
