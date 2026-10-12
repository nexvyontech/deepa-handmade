"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { resolveMediaUrl } from "@/lib/env";
import type { MediaRef } from "@/lib/types/api";

export function ProductGallery({ images }: { images: MediaRef[] }) {
  const [selected, setSelected] = useState(0);
  const resolved = useMemo(() => images.map((image) => resolveMediaUrl(image.url)), [images]);

  if (resolved.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-stone-200 bg-gradient-to-br from-amber-50 to-stone-100">
        <span className="text-stone-400" />
      </div>
    );
  }

  const active = resolved[Math.min(selected, resolved.length - 1)];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-white">
        <Image
          src={active}
          alt=""
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      {resolved.length > 1 ? (
        <div className="grid grid-cols-5 gap-2">
          {resolved.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`Thumbnail ${i + 1}`}
              className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                i === selected ? "border-amber-600" : "border-transparent"
              }`}
            >
              <Image src={url} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}