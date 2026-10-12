"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/feedback";
import type { AddressView, CheckoutInlineAddress, CheckoutPrepareInput } from "@/lib/types/api";

const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const PIN_PATTERN = /^[1-9]\d{5}$/;

export interface CheckoutFields extends CheckoutInlineAddress {
  line2: string;
  landmark: string;
  label: string;
}

const EMPTY_FIELDS: CheckoutFields = {
  recipient: "",
  mobile: "",
  line1: "",
  line2: "",
  villageTown: "",
  district: "",
  state: "",
  pincode: "",
  landmark: "",
  label: "",
};

export type CheckoutFieldErrors = Partial<Record<keyof CheckoutFields, string>>;

/** Client-side mirror of the API address rules (the server remains authoritative). */
export function validateCheckoutFields(fields: CheckoutFields): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  const required = (key: keyof CheckoutFields) => {
    const value = fields[key].trim();
    if (!value) errors[key] = "required";
    else if (value.length < 2) errors[key] = "short";
  };
  required("recipient");
  required("line1");
  required("villageTown");
  required("district");
  required("state");
  if (!MOBILE_PATTERN.test(fields.mobile.trim())) errors.mobile = "invalidMobile";
  if (!PIN_PATTERN.test(fields.pincode.trim())) errors.pincode = "invalidPincode";
  return errors;
}

function trimmed(fields: CheckoutFields): CheckoutInlineAddress {
  const result: CheckoutInlineAddress = {
    recipient: fields.recipient.trim(),
    mobile: fields.mobile.trim(),
    line1: fields.line1.trim(),
    villageTown: fields.villageTown.trim(),
    district: fields.district.trim(),
    state: fields.state.trim(),
    pincode: fields.pincode.trim(),
  };
  if (fields.line2.trim()) result.line2 = fields.line2.trim();
  if (fields.landmark.trim()) result.landmark = fields.landmark.trim();
  if (fields.label.trim()) result.label = fields.label.trim();
  return result;
}

/**
 * Delivery address entry / selection. Signed-in shoppers can reuse a saved
 * address; everyone can enter a one-time inline address. The form never places
 * an order — it hands a validated `CheckoutPrepareInput` to the caller.
 */
export function CheckoutForm({
  savedAddresses = [],
  submitting,
  error,
  onSubmit,
}: {
  savedAddresses?: AddressView[];
  submitting: boolean;
  error?: string | null;
  onSubmit: (input: CheckoutPrepareInput) => void;
}) {
  const { t } = useI18n();
  const hasSaved = savedAddresses.length > 0;
  const [selectedId, setSelectedId] = useState<string | null>(hasSaved ? savedAddresses[0].id : null);
  const [useNew, setUseNew] = useState(!hasSaved);
  const [fields, setFields] = useState<CheckoutFields>(EMPTY_FIELDS);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});

  const messageFor = (code: string | undefined): string | null => {
    if (!code) return null;
    if (code === "required") return t("fieldRequired");
    if (code === "short") return t("fieldTooShort");
    if (code === "invalidMobile") return t("invalidMobile");
    if (code === "invalidPincode") return t("invalidPincode");
    return t("fieldRequired");
  };

  const set = (key: keyof CheckoutFields) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFields((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const selectSaved = (id: string) => {
    setSelectedId(id);
    setUseNew(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!useNew && selectedId) {
      onSubmit({ addressId: selectedId });
      return;
    }
    const validation = validateCheckoutFields(fields);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    onSubmit({ address: trimmed(fields) });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {hasSaved ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-stone-700">{t("savedAddress")}</p>
          <div className="flex flex-col gap-2">
            {savedAddresses.map((address) => (
              <label
                key={address.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                  !useNew && selectedId === address.id ? "border-amber-700 bg-amber-50" : "border-stone-300 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="saved-address"
                  checked={!useNew && selectedId === address.id}
                  onChange={() => selectSaved(address.id)}
                  className="mt-1"
                />
                <span className="flex flex-col">
                  <span className="font-medium text-stone-900">
                    {address.recipient}
                    {address.isDefault ? (
                      <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
                        {t("defaultAddress")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-stone-600">
                    {[address.line1, address.line2, address.villageTown, address.district, address.state, address.pincode]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <span className="text-stone-500">{address.mobile}</span>
                </span>
              </label>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-700">
            <input type="radio" name="saved-address" checked={useNew} onChange={() => setUseNew(true)} />
            {t("newAddress")}
          </label>
        </div>
      ) : null}

      {useNew ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("recipient")} htmlFor="co-recipient" required error={messageFor(errors.recipient)}>
            <Input id="co-recipient" value={fields.recipient} onChange={set("recipient")} invalid={Boolean(errors.recipient)} />
          </Field>
          <Field label={t("mobile")} htmlFor="co-mobile" required error={messageFor(errors.mobile)}>
            <Input
              id="co-mobile"
              inputMode="tel"
              value={fields.mobile}
              onChange={set("mobile")}
              invalid={Boolean(errors.mobile)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("addressLine1")} htmlFor="co-line1" required error={messageFor(errors.line1)}>
              <Input id="co-line1" value={fields.line1} onChange={set("line1")} invalid={Boolean(errors.line1)} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={t("addressLine2")} htmlFor="co-line2">
              <Input id="co-line2" value={fields.line2} onChange={set("line2")} />
            </Field>
          </div>
          <Field label={t("villageTown")} htmlFor="co-town" required error={messageFor(errors.villageTown)}>
            <Input id="co-town" value={fields.villageTown} onChange={set("villageTown")} invalid={Boolean(errors.villageTown)} />
          </Field>
          <Field label={t("district")} htmlFor="co-district" required error={messageFor(errors.district)}>
            <Input id="co-district" value={fields.district} onChange={set("district")} invalid={Boolean(errors.district)} />
          </Field>
          <Field label={t("state")} htmlFor="co-state" required error={messageFor(errors.state)}>
            <Input id="co-state" value={fields.state} onChange={set("state")} invalid={Boolean(errors.state)} />
          </Field>
          <Field label={t("pincode")} htmlFor="co-pincode" required error={messageFor(errors.pincode)}>
            <Input id="co-pincode" inputMode="numeric" value={fields.pincode} onChange={set("pincode")} invalid={Boolean(errors.pincode)} />
          </Field>
          <Field label={t("landmark")} htmlFor="co-landmark">
            <Input id="co-landmark" value={fields.landmark} onChange={set("landmark")} />
          </Field>
          <Field label={t("addressLabel")} htmlFor="co-label">
            <Input id="co-label" value={fields.label} onChange={set("label")} />
          </Field>
        </div>
      ) : null}

      <FormFeedback kind="error">{error}</FormFeedback>

      <Button type="submit" loading={submitting}>
        {t("reviewOrder")}
      </Button>
    </form>
  );
}
