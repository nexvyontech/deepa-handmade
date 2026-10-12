import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { ta } from "@/lib/i18n/dictionaries/ta";

describe("i18n dictionaries", () => {
  it("declare exactly the same message keys in every locale", () => {
    expect(Object.keys(ta).sort()).toEqual(Object.keys(en).sort());
  });

  it("provide a non-empty translation for every key", () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value, `en.${key}`).not.toBe("");
      const tamil = (ta as Record<string, string>)[key];
      expect(tamil, `ta.${key}`).toBeTruthy();
    }
  });

  it("covers the Phase 7 cart and checkout surface", () => {
    const required = [
      "cart",
      "addToCart",
      "addedToCart",
      "cartTitle",
      "clearCart",
      "orderSummary",
      "subtotal",
      "grandTotal",
      "proceedToCheckout",
      "checkoutTitle",
      "deliveryAddress",
      "savedAddress",
      "newAddress",
      "pincode",
      "invalidMobile",
      "invalidPincode",
      "reviewOrder",
      "checkoutStagingNotice",
    ] as const;
    for (const key of required) {
      expect(en[key], `en.${key}`).toBeTruthy();
      expect((ta as Record<string, string>)[key], `ta.${key}`).toBeTruthy();
    }
  });
});
