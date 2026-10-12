import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/lib/i18n/provider";
import { VariantSelector } from "@/components/catalogue/variant-selector";
import type { VariantView, VariantOptionView } from "@/lib/types/api";

function option(id: string, optionType: VariantOptionView["optionType"], en: string, displayOrder: number, hex?: string): VariantOptionView {
  return { id, optionType, value: { en, ta: en }, displayOrder, active: true, hex };
}

function variant(
  id: string,
  options: VariantOptionView[],
  priceDelta: number,
  active: boolean,
  variantSku?: string,
): VariantView {
  return {
    id,
    productId: "p1",
    optionValueIds: options.map((o) => o.id),
    options,
    comboHash: options.map((o) => o.id).sort().join("|"),
    variantSku,
    priceDelta,
    effectivePrice: 1000 + priceDelta,
    stockMode: "AVAILABLE_ONLY",
    active,
    imageMediaIds: [],
    images: [],
    isCustomColor: false,
    isCustomSize: false,
  };
}

function renderSelector(variants: VariantView[], basePrice = 1000) {
  return render(
    <I18nProvider>
      <VariantSelector variants={variants} basePrice={basePrice} />
    </I18nProvider>,
  );
}

const red = option("c1", "COLOR", "Crimson", 1, "#dc2626");
const natural = option("c2", "COLOR", "Natural", 2, "#d6c5a9");
const small = option("s1", "SIZE", "S", 1);
const large = option("s2", "SIZE", "L", 2);

describe("VariantSelector", () => {
  it("renders option groups and a price range before choosing", () => {
    renderSelector([
      variant("v1", [red, small], 0, true, "K-SMALL"),
      variant("v2", [red, large], 20, true),
    ]);
    expect(screen.getByText("Colour")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("Choose all options to see the exact price.")).toBeInTheDocument();
    expect(screen.getByText("₹1,000 – ₹1,020")).toBeInTheDocument();
  });

  it("shows the exact price and SKU once an exact variant is chosen", async () => {
    const user = userEvent.setup();
    renderSelector([variant("v1", [red, small], 0, true, "K-SMALL")]);

    await user.click(screen.getByRole("button", { name: "Crimson" }));
    await user.click(screen.getByRole("button", { name: "S" }));

    expect(screen.getByText("₹1,000")).toBeInTheDocument();
    expect(screen.getByText("SKU: K-SMALL")).toBeInTheDocument();
  });

  it("flags a full selection that has no matching variant", async () => {
    const user = userEvent.setup();
    renderSelector([
      variant("v1", [red, small], 0, false, "K-SMALL"),
      variant("v2", [red, large], 20, true),
    ]);

    await user.click(screen.getByRole("button", { name: "Crimson" }));
    await user.click(screen.getByRole("button", { name: "S" }));

    expect(screen.getByText("This combination is not available.")).toBeInTheDocument();
  });

  it("deduplicates shared options across variants", () => {
    renderSelector([
      variant("v1", [natural, small], 0, true, "N-SMALL"),
      variant("v2", [natural, large], 20, true),
    ]);
    expect(screen.getAllByRole("button", { name: "Natural" })).toHaveLength(1);
  });

  it("renders nothing when there are no variants", () => {
    const { container } = renderSelector([]);
    expect(container.firstChild).toBeNull();
  });
});