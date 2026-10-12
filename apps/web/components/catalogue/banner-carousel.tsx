"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n/provider";
import { resolveMediaUrl } from "@/lib/env";
import type { BannerView } from "@/lib/types/api";

export function BannerCarousel({ banners }: { banners: BannerView[] }) {
  const { localize } = useI18n();
  const [index, setIndex] = useState(0);

  const visible = banners.filter((banner) => banner.image && banner.image.url);

  const next = useCallback(() => {
    setIndex((current) => (visible.length === 0 ? 0 : (current + 1) % visible.length));
  }, [visible.length]);

  useEffect(() => {
    if (visible.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [visible.length, next]);

  if (visible.length === 0) return null;

  const current = visible[Math.min(index, visible.length - 1)];

  return (
    <section className="relative overflow-hidden rounded-2xl" aria-label="Promotions">
      <div className="relative aspect-[21/9] w-full">
        <Image
          src={resolveMediaUrl(current.image?.url ?? "")}
          alt={localize(current.title)}
          fill
          priority
          sizes="(min-width: 1152px) 1104px, 100vw"
          className="object-cover"
        />
        {current.title || current.ctaLabel ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 bg-gradient-to-t from-black/60 to-transparent px-6 py-5">
            {current.title ? (
              <div>
                <h2 className="text-lg font-semibold text-white">{localize(current.title)}</h2>
                {current.ctaLabel && current.ctaUrl ? (
                  <p className="text-sm text-white/80">{localize(current.ctaLabel)}</p>
                ) : null}
              </div>
            ) : null}
            {current.ctaUrl ? (
              <Link
                href={current.ctaUrl}
                className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-medium text-stone-900 hover:bg-stone-100"
              >
                {localize(current.ctaLabel) || "Learn more"}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {visible.length > 1 ? (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5">
          {visible.map((banner, i) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Banner ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? "w-4 bg-white" : "w-2 bg-white/60"}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}