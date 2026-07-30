import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, X, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmailComposer } from "@/components/admin/email-composer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

type LogRow = {
  id: string;
  recipient: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  kind: string;
  status: string;
  sent_at: string;
};

type ProfileRow = {
  first_name: string | null;
  last_name: string | null;
  email: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Admin.emails" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminEmailsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Admin.emails");

  const supabase = await createSupabaseServerClient();
  const [contactsRes, logRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, email")
      .in("role", ["parent", "club", "coach"])
      .order("first_name", { ascending: true })
      .returns<ProfileRow[]>(),
    supabase
      .from("email_log")
      .select("id, recipient, cc, bcc, subject, kind, status, sent_at")
      .order("sent_at", { ascending: false })
      .limit(60)
      .returns<LogRow[]>(),
  ]);

  const seen = new Set<string>();
  const contacts = (contactsRes.data ?? [])
    .filter((p) => p.email && !seen.has(p.email) && seen.add(p.email))
    .map((p) => ({
      email: p.email,
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.email,
    }));

  // Table may not be migrated yet — degrade to an empty log instead of failing.
  const log = logRes.error ? [] : (logRes.data ?? []);
  const webmailUrl = process.env.NEXT_PUBLIC_WEBMAIL_URL;

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const kindLabel = (k: string) =>
    k === "manual" ? t("kinds.manual") : k === "auto" ? t("kinds.auto") : k;

  return (
    <div className="container py-12 lg:py-16">
      <div className="flex flex-col gap-3">
        <Badge variant="orange" className="self-start">
          {t("eyebrow")}
        </Badge>
        <h1 className="font-anton text-h1 uppercase leading-tight text-navy">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-grey-700">{t("subtitle")}</p>
        {webmailUrl && (
          <a
            href={webmailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start"
          >
            <Button variant="outline">
              <Inbox className="mr-2 h-4 w-4" />
              {t("openWebmail")}
            </Button>
          </a>
        )}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <EmailComposer contacts={contacts} />

        {/* Journal */}
        <div className="flex flex-col gap-3">
          <h2 className="font-anton text-lg uppercase text-navy">
            {t("logTitle")}
          </h2>
          <div className="overflow-hidden rounded-2xl border border-grey-100 bg-white shadow-sm">
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-grey-100 bg-grey-100/60 text-left text-xs uppercase tracking-wide text-grey-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">
                      {t("logCols.recipient")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("logCols.subject")}
                    </th>
                    <th className="px-4 py-3 font-medium">
                      {t("logCols.status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grey-100">
                  {log.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-8 text-center text-grey-500"
                      >
                        {t("logEmpty")}
                      </td>
                    </tr>
                  ) : (
                    log.map((row) => (
                      <tr
                        key={row.id}
                        className="align-top hover:bg-grey-100/40"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-navy">
                            {row.recipient}
                          </div>
                          {(row.cc || row.bcc) && (
                            <div className="mt-0.5 text-xs text-grey-500">
                              {row.cc ? `Cc ${row.cc}` : ""}
                              {row.cc && row.bcc ? " · " : ""}
                              {row.bcc ? `Cci ${row.bcc}` : ""}
                            </div>
                          )}
                          <div className="text-grey-400 mt-0.5 text-xs">
                            {kindLabel(row.kind)} ·{" "}
                            {dateFmt.format(new Date(row.sent_at))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-grey-700">
                          {row.subject}
                        </td>
                        <td className="px-4 py-3">
                          {row.status === "sent" ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                              <Check className="h-4 w-4" />
                              {t("statuses.sent")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-error">
                              <X className="h-4 w-4" />
                              {t("statuses.failed")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
