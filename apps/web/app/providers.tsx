"use client";

import { useEffect, type ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n/provider";
import { AuthProvider } from "@/lib/auth/context";

/**
 * Client context stack shared by the storefront and admin (i18n + auth).
 * Crypto random UUIDs are needed by RequestId (measured) and apiRequest.
 */
function CryptoRandomPolyfill() {
  useEffect(() => {
    if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID !== "function") {
      const generate = (): string => {
        const bytes = new Uint8Array(16);
        globalThis.crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      };
      globalThis.crypto.randomUUID = generate as typeof globalThis.crypto.randomUUID;
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthProvider>
        <CryptoRandomPolyfill />
        {children}
      </AuthProvider>
    </I18nProvider>
  );
}