import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/lib/i18n/provider";
import { CheckoutForm, validateCheckoutFields, type CheckoutFields } from "@/components/checkout/checkout-form";
import type { AddressView } from "@/lib/types/api";

function fields(overrides: Partial<CheckoutFields> = {}): CheckoutFields {
  return {
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
    ...overrides,
  };
}

const savedAddress: AddressView = {
  id: "a1",
  recipient: "Meena",
  mobile: "9000000001",
  line1: "12 Temple Street",
  villageTown: "Needamangalam",
  district: "Thiruvarur",
  state: "Tamil Nadu",
  pincode: "614101",
  isDefault: true,
};

function renderForm(props: Partial<Parameters<typeof CheckoutForm>[0]> = {}) {
  const onSubmit = vi.fn();
  render(
    <I18nProvider>
      <CheckoutForm savedAddresses={[]} submitting={false} onSubmit={onSubmit} {...props} />
    </I18nProvider>,
  );
  return { onSubmit };
}

describe("validateCheckoutFields", () => {
  it("flags every missing required field and bad mobile/PIN", () => {
    const errors = validateCheckoutFields(fields());
    expect(errors.recipient).toBe("required");
    expect(errors.mobile).toBe("invalidMobile");
    expect(errors.pincode).toBe("invalidPincode");
  });

  it("accepts a fully valid address", () => {
    const errors = validateCheckoutFields(
      fields({
        recipient: "Meena",
        mobile: "9000000001",
        line1: "12 Temple Street",
        villageTown: "Needamangalam",
        district: "Thiruvarur",
        state: "Tamil Nadu",
        pincode: "614101",
      }),
    );
    expect(errors).toEqual({});
  });
});

describe("CheckoutForm", () => {
  it("blocks submission and shows errors for an empty inline address", async () => {
    const { onSubmit } = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Review order/ }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("This field is required.").length).toBeGreaterThan(0);
    expect(screen.getByText("Enter a valid 10-digit mobile number.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid 6-digit PIN code.")).toBeInTheDocument();
  });

  it("submits a trimmed inline address when valid", async () => {
    const { onSubmit } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Recipient name/), "  Meena  ");
    await user.type(screen.getByLabelText(/Mobile number/), "9000000001");
    await user.type(screen.getByLabelText(/Address line 1/), "12 Temple Street");
    await user.type(screen.getByLabelText(/Village \/ town/), "Needamangalam");
    await user.type(screen.getByLabelText(/District/), "Thiruvarur");
    await user.type(screen.getByLabelText(/State/), "Tamil Nadu");
    await user.type(screen.getByLabelText(/PIN code/), "614101");

    await user.click(screen.getByRole("button", { name: /Review order/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      address: {
        recipient: "Meena",
        mobile: "9000000001",
        line1: "12 Temple Street",
        villageTown: "Needamangalam",
        district: "Thiruvarur",
        state: "Tamil Nadu",
        pincode: "614101",
      },
    });
  });

  it("submits a saved address id when one is selected by default", async () => {
    const { onSubmit } = renderForm({ savedAddresses: [savedAddress] });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /Review order/ }));

    expect(onSubmit).toHaveBeenCalledWith({ addressId: "a1" });
  });

  it("falls back to a new inline address when the shopper switches", async () => {
    const { onSubmit } = renderForm({ savedAddresses: [savedAddress] });
    const user = userEvent.setup();

    await user.click(screen.getByRole("radio", { name: /Use a new address/ }));
    await user.click(screen.getByRole("button", { name: /Review order/ }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText("This field is required.").length).toBeGreaterThan(0);
  });
});
