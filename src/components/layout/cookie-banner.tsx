"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

const CONSENT_COOKIE = "tll_cookie_consent";

// Records the visitor's choice for a year. The site currently sets only
// strictly-necessary cookies (auth session), so "refuse" simply stores the
// preference; if non-essential tools are added later, gate them on "accepted".
function setConsent(value: "accepted" | "refused") {
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${
    60 * 60 * 24 * 365
  }; SameSite=Lax; Secure`;
}

export function CookieBanner() {
  const t = useTranslations("CookieBanner");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const hasChoice = document.cookie
      .split("; ")
      .some((c) => c.startsWith(`${CONSENT_COOKIE}=`));
    if (!hasChoice) setVisible(true);
  }, []);

  if (!visible) return null;

  function choose(value: "accepted" | "refused") {
    setConsent(value);
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label={t("aria")}
      className="border-grey-200 fixed inset-x-0 bottom-0 z-50 border-t bg-white p-4 shadow-lg"
    >
      <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-grey-700">
          {t("message")}{" "}
          <Link
            href="/cookies"
            className="font-semibold text-orange hover:underline"
          >
            {t("learnMore")}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="ghost" onClick={() => choose("refused")}>
            {t("refuse")}
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
