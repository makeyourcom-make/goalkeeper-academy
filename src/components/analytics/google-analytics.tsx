"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

// Google Analytics 4 — loaded ONLY after the visitor accepts cookies (GDPR/nLPD:
// GA sets cookies + sends data to Google, so no consent = no loading). The
// cookie banner dispatches a "tll-consent" event on accept so GA starts without
// a page reload.
const GA_ID = "G-S83XYKY0RZ";
const CONSENT_COOKIE = "tll_cookie_consent";

function hasConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === `${CONSENT_COOKIE}=accepted`);
}

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (hasConsent()) {
      setEnabled(true);
      return;
    }
    const onConsent = () => {
      if (hasConsent()) setEnabled(true);
    };
    window.addEventListener("tll-consent", onConsent);
    return () => window.removeEventListener("tll-consent", onConsent);
  }, []);

  if (!enabled) return null;

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
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
