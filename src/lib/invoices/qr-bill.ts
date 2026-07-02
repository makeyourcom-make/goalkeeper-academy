// Swiss QR-bill (SVG) generation for an installment invoice. Creditor comes
// from env (CREDITOR_*). The debtor is intentionally omitted — parents fill
// their own details — which keeps the slip valid without storing addresses.

export function creditorConfigured(): boolean {
  return Boolean(
    process.env.CREDITOR_IBAN &&
    process.env.CREDITOR_NAME &&
    process.env.CREDITOR_CITY,
  );
}

// "1860 Aigle" → { zip: "1860", city: "Aigle" }. Returns null if unparseable.
function parseCity(raw: string): { zip: string; city: string } | null {
  const m = raw.trim().match(/^(\d{4,5})\s+(.+)$/);
  const zip = m?.[1];
  const city = m?.[2];
  if (!zip || !city) return null;
  return { zip, city };
}

type QrBillOptions = {
  amountCents: number;
  currency: string;
  message?: string;
};

// Returns an SVG string for the payment slip, or null when the creditor isn't
// configured or the data is invalid (caller shows a fallback message).
export async function invoiceQrBillSvg(
  opts: QrBillOptions,
): Promise<string | null> {
  if (!creditorConfigured()) return null;
  const place = parseCity(process.env.CREDITOR_CITY as string);
  if (!place) return null;

  try {
    const { SwissQRBill } = await import("swissqrbill/svg");
    const bill = new SwissQRBill({
      currency: opts.currency === "EUR" ? "EUR" : "CHF",
      amount: opts.amountCents / 100,
      message: opts.message,
      creditor: {
        account: (process.env.CREDITOR_IBAN as string).replace(/\s/g, ""),
        name: process.env.CREDITOR_NAME as string,
        address: process.env.CREDITOR_ADDRESS ?? "",
        zip: place.zip,
        city: place.city,
        country: (process.env.CREDITOR_COUNTRY ?? "CH").toUpperCase(),
      },
    });
    return bill.toString();
  } catch {
    return null;
  }
}
