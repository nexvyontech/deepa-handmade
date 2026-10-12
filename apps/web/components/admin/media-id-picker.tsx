"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/provider";
import { listMedia } from "@/lib/api/media";
import type { MediaView } from "@/lib/types/api";

/**
 * Pick a media id from the uploaded library, or type an id manually.
 * Used for category image/banner + product attachments (link only — uploads
 * happen on the Media screen / product media tab).
 */
export function MediaIdPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (next?: string) => void;
}) {
  const { t } = useI18n();
  const [media, setMedia] = useState<MediaView[]>([]);

  useEffect(() => {
    let active = true;
    listMedia({ limit: 100 })
      .then((result) => {
        if (active) setMedia(result.items);
      })
      .catch(() => {
        // library unavailable — manual entry still works
      });
    return () => {
      active = false;
    };
  }, []);

  const isCustom = Boolean(value) && !media.some((m) => m.id === value);

  return (
    <div className="flex flex-col gap-2">
      <Select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{t("none")}</option>
        {media.map((m) => (
          <option key={m.id} value={m.id}>
            {m.id} — {m.kind.toLowerCase()}
          </option>
        ))}
      </Select>
      {isCustom ? <p className="text-xs text-stone-500">{value}</p> : null}
    </div>
  );
}