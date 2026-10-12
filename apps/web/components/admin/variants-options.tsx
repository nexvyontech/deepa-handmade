"use client";

import { useCallback, useEffect, useState } from "react";
import { ScreenHeader, AdminTable } from "./screen-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState, ErrorState, FormFeedback } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as api from "@/lib/api/variants";
import { OPTION_TYPES, type OptionType } from "@/lib/constants";
import type { VariantOptionView } from "@/lib/types/api";

const TYPE_LABEL_KEY: Record<OptionType, "colourOption" | "sizeOption" | "handleOption"> = {
  COLOR: "colourOption",
  SIZE: "sizeOption",
  HANDLE: "handleOption",
};

function hexToColor(value: string): string {
  if (value.startsWith("#")) return value;
  return `#${value}`;
}

export function AdminOptions() {
  const { t, localize } = useI18n();
  const mutation = useAsyncMutation();

  const [filterType, setFilterType] = useState<OptionType | "">("");
  const [options, setOptions] = useState<VariantOptionView[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VariantOptionView | null>(null);
  const [type, setType] = useState<OptionType>("COLOR");
  const [en, setEn] = useState("");
  const [ta, setTa] = useState("");
  const [hex, setHex] = useState("");
  const [order, setOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [deleting, setDeleting] = useState<VariantOptionView | null>(null);

  const load = useCallback(async () => {
    try {
      setOptions(await api.listOptions(filterType ? { optionType: filterType } : undefined));
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }, [filterType]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const startCreate = () => {
    setEditing(null);
    setType("COLOR");
    setEn("");
    setTa("");
    setHex("");
    setOrder(0);
    setActive(true);
    setShowForm(true);
  };

  const startEdit = (option: VariantOptionView) => {
    setEditing(option);
    setType(option.optionType);
    setEn(option.value.en);
    setTa(option.value.ta ?? "");
    setHex(option.hex ?? "");
    setOrder(option.displayOrder);
    setActive(option.active);
    setShowForm(true);
  };

  const save = async () => {
    const ok = await mutation.run(async () => {
      if (editing) {
        await api.updateOption(editing.id, {
          value: { en, ta: ta || undefined },
          hex: type === "COLOR" && hex ? hexToColor(hex) : undefined,
          displayOrder: order,
          active,
        });
      } else {
        await api.createOption({
          optionType: type,
          value: { en, ta: ta || undefined },
          hex: type === "COLOR" && hex ? hexToColor(hex) : undefined,
          displayOrder: order,
          active,
        });
      }
    }, t("saveSuccess"));
    if (ok) {
      setShowForm(false);
      await load();
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const ok = await mutation.run(() => api.deleteOption(deleting.id), t("saveSuccess"));
    if (ok) {
      setDeleting(null);
      await load();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title={t("manageOptions")}
        action={
          <Button onClick={startCreate} disabled={busy}>
            {t("newOption")}
          </Button>
        }
      />

      <div className="w-full max-w-xs">
        <Select value={filterType} onChange={(e) => setFilterType((e.target.value || "") as OptionType | "")}>
          <option value="">{t("all")}</option>
          {OPTION_TYPES.map((ot) => (
            <option key={ot} value={ot}>
              {t(TYPE_LABEL_KEY[ot])}
            </option>
          ))}
        </Select>
      </div>

      {showForm ? (
        <form
          className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label={t("optionValue")} htmlFor="o-type">
              <label htmlFor="o-type" className="sr-only">
                {t("optionValue")}
              </label>
              <Select id="o-type" value={type} onChange={(e) => setType(e.target.value as OptionType)}>
                {OPTION_TYPES.map((ot) => (
                  <option key={ot} value={ot}>
                    {t(TYPE_LABEL_KEY[ot])}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`${t("optionValue")} (en)`} htmlFor="o-en" required>
              <Input id="o-en" value={en} onChange={(e) => setEn(e.target.value)} required />
            </Field>
            <Field label={`${t("optionValue")} (ta)`} htmlFor="o-ta">
              <Input id="o-ta" value={ta} onChange={(e) => setTa(e.target.value)} />
            </Field>
            {type === "COLOR" ? (
              <Field label={t("hex")} htmlFor="o-hex" hint="#rrggbb">
                <Input id="o-hex" value={hex} onChange={(e) => setHex(e.target.value)} />
              </Field>
            ) : null}
            <Field label={t("sortOrder")} htmlFor="o-order">
              <Input id="o-order" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-sm text-stone-800">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-600" />
              {t("active")}
            </label>
          </div>

          <FormFeedback kind="error">{mutation.error}</FormFeedback>
          <FormFeedback kind="success">{mutation.success}</FormFeedback>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" loading={mutation.busy} disabled={!en.trim()}>
              {t("save")}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? <ErrorState error={error} onRetry={() => void load()} /> : null}

      {!error && options.length === 0 ? (
        <EmptyState title={t("noOptions")} />
      ) : (
        <AdminTable head={[t("optionValue"), "Type", t("hex"), t("sortOrder"), t("status"), t("actions")]}>
          {options.map((option) => (
            <tr key={option.id}>
              <td className="flex items-center gap-2 px-4 py-3 font-medium text-stone-900">
                {option.hex ? (
                  <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: hexToColor(option.hex) }} aria-hidden="true" />
                ) : null}
                {localize(option.value)}
              </td>
              <td className="px-4 py-3 text-stone-600">{option.optionType}</td>
              <td className="px-4 py-3 font-mono text-xs text-stone-600">{option.hex ?? "—"}</td>
              <td className="px-4 py-3 text-stone-600">{option.displayOrder}</td>
              <td className="px-4 py-3">
                <StatusBadge status={option.active ? "ACTIVE" : "INACTIVE"} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => startEdit(option)}>
                    {t("edit")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleting(option)}>
                    {t("delete")}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title={t("confirmDeleteCategory")}
        message={deleting ? localize(deleting.value) : ""}
        busy={mutation.busy}
        onClose={() => setDeleting(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}