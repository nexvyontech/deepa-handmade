"use client";

import { useCallback, useEffect, useState } from "react";
import { ScreenHeader } from "./screen-header";
import { SeoFields } from "./seo-fields";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { ErrorState, FormFeedback } from "@/components/ui/feedback";
import { useAsyncMutation } from "./use-async-mutation";
import { useI18n } from "@/lib/i18n/provider";
import * as seoApi from "@/lib/api/seo";
import * as productsApi from "@/lib/api/admin";
import * as categoryApi from "@/lib/api/admin";
import * as cmsApi from "@/lib/api/cms";
import { SEO_ENTITY_TYPES, type SeoEntityType } from "@/lib/constants";
import type { SeoInput } from "@/lib/api/admin";

interface EntityOption {
  id: string;
  label: string;
}

export function AdminSeo() {
  const { t, localize } = useI18n();
  const mutation = useAsyncMutation();

  const [entityType, setEntityType] = useState<SeoEntityType>("product");
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [entityId, setEntityId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState<SeoInput>({});
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(true);

  const loadEntities = useCallback(async (type: SeoEntityType) => {
    try {
      if (type === "product") {
        const result = await productsApi.listProductsAdmin({ limit: 100 });
        setEntities(result.items.map((item) => ({ id: item.id, label: localize(item.name) })));
      } else if (type === "category") {
        const list = await categoryApi.listAllCategories();
        setEntities(list.map((item) => ({ id: item.id, label: localize(item.name) })));
      } else {
        const list = await cmsApi.listAdminPages();
        setEntities(list.map((item) => ({ id: item.id, label: localize(item.title) })));
      }
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }, [localize]);

  useEffect(() => {
    queueMicrotask(() => void loadEntities(entityType));
  }, [entityType, loadEntities]);

  const loadSeo = useCallback(async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const view = await seoApi.getSeo(entityType, id);
      setValue(view.seo ?? {});
      setLoaded(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  }, [entityType]);

  const switchEntityType = (type: SeoEntityType) => {
    setEntityType(type);
    setEntityId("");
    setLoaded(false);
    setValue({});
  };

  const pickEntity = (id: string) => {
    setEntityId(id);
    setLoaded(false);
    if (id) void loadSeo(id);
  };

  const save = async () => {
    if (!entityId) return;
    const ok = await mutation.run(async () => {
      await seoApi.updateSeo(entityType, entityId, value);
      setLoaded(true);
    }, t("saveSeo"));
    if (ok) await loadSeo(entityId);
  };

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title={t("seoTitle")} description={t("noSeoEntity")} />

      {error ? <ErrorState error={error} onRetry={() => void loadEntities(entityType)} /> : null}

      <div className="grid max-w-lg gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:grid-cols-2">
        <Field label={t("seoEntity")} htmlFor="seo-type">
          <Select id="seo-type" value={entityType} onChange={(e) => switchEntityType(e.target.value as SeoEntityType)}>
            {SEO_ENTITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("seoEntityId")} htmlFor="seo-entity">
          <Select id="seo-entity" value={entityId} onChange={(e) => pickEntity(e.target.value)} disabled={busy || entities.length === 0}>
            <option value="">{t("chooseProductOption")}</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.label} — {entity.id}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {loaded ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <SeoFields value={value} onChange={setValue} />

          <FormFeedback kind="error">{mutation.error}</FormFeedback>
          <FormFeedback kind="success">{mutation.success}</FormFeedback>

          <div className="flex justify-end">
            <Button type="submit" loading={mutation.busy}>
              {t("saveSeo")}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}