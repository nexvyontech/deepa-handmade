"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/context";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/feedback";
import { FullScreenLoader } from "@/components/ui/spinner";
import { ApiError, messageForError } from "@/lib/api/errors";

export function SiteLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const target = searchParams.get("next") || "/admin";
  const { login, logout, isStaff, status } = useAuth();
  const { t } = useI18n();

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === "loading") return <FullScreenLoader label={t("loading")} />;

  if (isStaff) {
    return (
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-stone-700">{t("alreadySignedIn")}</p>
        <div className="flex gap-3">
          <Button onClick={() => router.push(target)}>{t("backToAdmin")}</Button>
          <Button
            variant="secondary"
            onClick={() => {
              void logout();
            }}
          >
            {t("signOut")}
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(mobile.trim(), password);
      router.replace(target);
      router.refresh();
    } catch (caught) {
      const message = messageForError(caught);
      const locked =
        caught instanceof ApiError &&
        (caught.code === "TOKEN_EXPIRED" || caught.status === 429 || caught.code === "PRECONDITION_FAILED");
      setError(locked ? t("accountLocked") : message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col gap-6 rounded-xl border border-stone-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-stone-900">{t("loginTitle")}</h1>
        <p className="text-sm text-stone-500">Deepa Handmade · {t("staffOnly")}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label={t("mobile")} htmlFor="login-mobile" required>
          <Input
            id="login-mobile"
            name="mobile"
            autoComplete="username"
            inputMode="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            required
          />
        </Field>

        <Field label={t("password")} htmlFor="login-password" required>
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        <FormFeedback kind="error">{error}</FormFeedback>

        <Button type="submit" disabled={busy} loading={busy}>
          {t("loginSubmit")}
        </Button>
      </form>

      <Link href="/" className="text-center text-sm text-stone-500 hover:underline">
        {t("backToStore")}
      </Link>
    </div>
  );
}