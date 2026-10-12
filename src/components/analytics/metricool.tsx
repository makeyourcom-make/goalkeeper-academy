"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

// Metricool tracker. Unlike GA4 it has no consent mode: the script drops its
// cookies as soon as it loads. It is therefore not rendered at all until the
// visitor has accepted cookies, and appears live on the same "tll-consent"
// event the banner dispatches.
const METRICOOL_HASH = "dafe81309a6f66f4de87d56923285523";
const CONSENT_COOKIE = "tll_cookie_consent";

function hasConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((c) => c === `${CONSENT_COOKIE}=accepted`);
}

export function MetricoolTracker() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = () => setAllowed(hasConsent());
    check();
    window.addEventListener("tll-consent", check);
    return () => window.removeEventListener("tll-consent", check);
  }, []);

  if (!allowed) return null;

  return (
    <Script id="metricool-tracker" strategy="afterInteractive">
      {`function loadScript(a){var b=document.getElementsByTagName("head")[0],c=document.createElement("script");c.type="text/javascript",c.src="https://tracker.metricool.com/resources/be.js",c.onreadystatechange=a,c.onload=a,b.appendChild(c)}loadScript(function(){beTracker.t({hash:"${METRICOOL_HASH}"})});`}
    </Script>
  );
}
