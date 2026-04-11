"use client";

import { useState, useTransition } from "react";

type TelegramTestResponse = {
  ok: boolean;
  error?: string;
  result?: {
    ok: boolean;
    skipped: boolean;
    reason?: string;
  };
};

export function TelegramTestButton() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          className="button"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            setError(null);

            startTransition(async () => {
              try {
                const response = await fetch("/api/alerts/test-telegram");
                const data = await response.json() as TelegramTestResponse;

                if (!response.ok || !data.ok) {
                  throw new Error(data.error ?? "تعذر إرسال رسالة الاختبار إلى تلغرام.");
                }

                if (data.result?.skipped) {
                  setError(data.result.reason ?? "متغيرات تلغرام غير مضبوطة.");
                  return;
                }

                setMessage("تم إرسال رسالة اختبار إلى تلغرام بنجاح.");
              } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "تعذر إرسال رسالة الاختبار إلى تلغرام.");
              }
            });
          }}
        >
          {isPending ? "جارٍ الإرسال..." : "اختبار تلغرام"}
        </button>
      </div>

      {message ? <div className="notice success">{message}</div> : null}
      {error ? <div className="notice danger">{error}</div> : null}
    </div>
  );
}