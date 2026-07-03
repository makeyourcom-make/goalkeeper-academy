"use client";

import Script from "next/script";
import { useEffect } from "react";

// Google Analytics 4 with Consent Mode v2 (GDPR/nLPD). The tag loads on every
// page (so Google detects it + can model traffic), but storage is DENIED by
// default: no GA cookies and no user measurement until the visitor accepts
// cookies. On accept, the cookie banner dispatches "tll-consent" and we update
// consent to granted.
const GA_ID = "G-S83XYKY0RZ";
const CONSENT_COOKIE = "tll_cookie_consent";

function hasConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === `${CONSENT_COOKIE}=accepted`);
}

export function GoogleAnalytics() {
  useEffect(() => {
    // Live opt-in during the session (gtag is loaded by the time the banner
    // is clicked).
    const grant = () => {
      const w = window as unknown as { gtag?: (...args: unknown[]) => void };
      if (hasConsent() && typeof w.gtag === "function") {
        w.gtag("consent", "update", {
          analytics_storage: "granted",
        });
      }
    };
    window.addEventListener("tll-consent", grant);
    return () => window.removeEventListener("tll-consent", grant);
  }, []);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            analytics_storage: 'denied'
          });
          if (document.cookie.split('; ').indexOf('${CONSENT_COOKIE}=accepted') !== -1) {
            gtag('consent', 'update', { analytics_storage: 'granted' });
          }
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
