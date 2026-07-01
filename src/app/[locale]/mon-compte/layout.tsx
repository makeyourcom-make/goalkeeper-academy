import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Eye } from "lucide-react";

import { getAccountContext } from "@/lib/account/view-context";
import { exitViewAs } from "@/lib/admin/impersonation";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AccountLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!isSupabaseConfigured()) {
    redirect(`/${locale}/connexion`);
  }

  const ctx = await getAccountContext();
  if (!ctx) {
    redirect(`/${locale}/connexion`);
  }

  if (!ctx.isImpersonating) {
    return <>{children}</>;
  }

  const t = await getTranslations("Account.viewAs");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-orange px-4 py-2 text-sm text-white sm:px-6">
        <span className="inline-flex items-center gap-2 font-medium">
          <Eye className="h-4 w-4 shrink-0" />
          {t("banner", { name: ctx.targetName ?? "" })}
        </span>
        <form action={exitViewAs}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-full bg-white/20 px-3 py-1 font-medium transition hover:bg-white/30"
          >
            {t("exit")}
          </button>
        </form>
      </div>
      {children}
    </>
  );
}
