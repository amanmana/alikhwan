import React, { useEffect, useRef, useCallback } from "react";

interface TurnstileProps {
  onVerify: (token: string) => void;
}

export default function Turnstile({ onVerify }: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  // Keep a stable ref to onVerify so useEffect doesn't re-run on every render
  const onVerifyRef = useRef(onVerify);
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  const stableOnVerify = useCallback((token: string) => {
    onVerifyRef.current(token);
  }, []);

  useEffect(() => {
    // Use a ref so we can clearTimeout inside callbacks without const/let issues
    const fallbackRef = { timer: 0 as ReturnType<typeof setTimeout> };

    const renderWidget = () => {
      if (
        (window as any).turnstile &&
        containerRef.current &&
        !widgetIdRef.current
      ) {
        try {
          const id = (window as any).turnstile.render(containerRef.current, {
            sitekey: "1x00000000000000000000AA", // Cloudflare standard test sitekey
            callback: (token: string) => {
              clearTimeout(fallbackRef.timer);
              stableOnVerify(token);
            },
            "error-callback": () => {
              // Widget loaded but errored — use mock token for dev
              stableOnVerify("mock-turnstile-token");
            },
          });
          widgetIdRef.current = id;
          clearTimeout(fallbackRef.timer);
        } catch (_e) {
          // ignore double render errors
        }
      }
    };

    // 1. Inject the Turnstile client script if not already present
    if (!document.querySelector('script[src*="turnstile"]')) {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Define onload callback on window object
    (window as any).onloadTurnstileCallback = () => {
      renderWidget();
    };

    // If turnstile script was already loaded before mount, render immediately
    if ((window as any).turnstile) {
      renderWidget();
    }

    // Backup interval in case onload callback doesn't fire
    const interval = setInterval(() => {
      if ((window as any).turnstile && !widgetIdRef.current) {
        renderWidget();
        clearInterval(interval);
      }
    }, 200);

    // Fallback: if widget not rendered after 3.5s (offline / local dev),
    // auto-issue a mock token so admin login still works locally.
    fallbackRef.timer = setTimeout(() => {
      if (!widgetIdRef.current) {
        stableOnVerify("mock-turnstile-token");
      }
    }, 3500);

    return () => {
      clearInterval(interval);
      clearTimeout(fallbackRef.timer);
      if ((window as any).turnstile && widgetIdRef.current) {
        try {
          (window as any).turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {
          // ignore
        }
      }
    };
  }, [stableOnVerify]);

  return (
    <div className="flex justify-center my-3 min-h-[65px]">
      <div ref={containerRef} id="cf-turnstile"></div>
    </div>
  );
}
