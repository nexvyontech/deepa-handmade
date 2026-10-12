import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/lib/i18n/provider";
import { AuthProvider, useAuth } from "@/lib/auth/context";
import { CartProvider, useCart } from "@/lib/cart/context";
import { CART_SESSION_STORAGE_KEY } from "@/lib/cart/session";
import type { CartView } from "@/lib/types/api";

const mocks = vi.hoisted(() => ({
  getCart: vi.fn(),
  addCartItem: vi.fn(),
  updateCartItem: vi.fn(),
  removeCartItem: vi.fn(),
  clearCart: vi.fn(),
  validateCart: vi.fn(),
  mergeCart: vi.fn(),
  login: vi.fn(),
  fetchMe: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/lib/api/cart", () => ({
  getCart: mocks.getCart,
  addCartItem: mocks.addCartItem,
  updateCartItem: mocks.updateCartItem,
  removeCartItem: mocks.removeCartItem,
  clearCart: mocks.clearCart,
  validateCart: mocks.validateCart,
  mergeCart: mocks.mergeCart,
}));

vi.mock("@/lib/api/auth", () => ({
  login: mocks.login,
  fetchMe: mocks.fetchMe,
  logout: mocks.logout,
}));

function cartView(qty: number, identity: CartView["identity"] = "GUEST"): CartView {
  return {
    id: "c1",
    identity,
    items: [
      {
        id: "i1",
        productId: "p1",
        productName: { en: "Kudai" },
        productSlug: "kudai",
        productSku: "K-1",
        options: [],
        qty,
        moq: 1,
        unitPrice: 100,
        lineTotal: 100 * qty,
      },
    ],
    totals: {
      subtotal: 100 * qty,
      discount: 0,
      shipping: 0,
      grandTotal: 100 * qty,
      shippingStatus: "CONFIGURED",
      shippingMethod: "FLAT_FREE_THRESHOLD",
    },
    couponCode: null,
    offerAppliedIds: [],
    version: 1,
  };
}

function Probe() {
  const { itemCount, loading, addItem, updateItem, removeItem, clear } = useCart();
  return (
    <div>
      <span data-testid="count">{itemCount}</span>
      <span data-testid="loading">{loading ? "yes" : "no"}</span>
      <button onClick={() => void addItem({ productId: "p1", qty: 1 })}>add</button>
      <button onClick={() => void updateItem("i1", 5)}>update</button>
      <button onClick={() => void removeItem("i1")}>remove</button>
      <button onClick={() => void clear()}>clear</button>
    </div>
  );
}

function renderCart() {
  return render(
    <I18nProvider>
      <AuthProvider>
        <CartProvider>
          <Probe />
        </CartProvider>
      </AuthProvider>
    </I18nProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  for (const fn of Object.values(mocks)) fn.mockReset();
  mocks.getCart.mockResolvedValue(cartView(2));
});

describe("CartProvider", () => {
  it("loads the cart and reports the total quantity", async () => {
    renderCart();
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));
    expect(mocks.getCart).toHaveBeenCalled();
  });

  it("adds an item and adopts the returned cart", async () => {
    mocks.addCartItem.mockResolvedValue(cartView(3));
    const user = userEvent.setup();
    renderCart();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await user.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("3"));
    expect(mocks.addCartItem).toHaveBeenCalledWith({ productId: "p1", qty: 1 });
  });

  it("updates a line quantity", async () => {
    mocks.updateCartItem.mockResolvedValue(cartView(5));
    const user = userEvent.setup();
    renderCart();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await user.click(screen.getByRole("button", { name: "update" }));

    await waitFor(() => expect(mocks.updateCartItem).toHaveBeenCalledWith("i1", 5));
    expect(screen.getByTestId("count")).toHaveTextContent("5");
  });

  it("removes a line and empties the count", async () => {
    mocks.removeCartItem.mockResolvedValue({ ...cartView(0), items: [] });
    const user = userEvent.setup();
    renderCart();
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));

    await user.click(screen.getByRole("button", { name: "remove" }));

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
    expect(mocks.removeCartItem).toHaveBeenCalledWith("i1");
  });

  it("merges a guest cart into the account right after login", async () => {
    const session = "12345678-1234-4234-8234-123456789012";
    window.localStorage.setItem(CART_SESSION_STORAGE_KEY, session);
    mocks.login.mockResolvedValue({
      accessToken: "a",
      expiresIn: 3600,
      refreshToken: "r",
      user: { id: "u1", name: "Deepa", mobile: "9000000001", role: "CUSTOMER", permissions: [], status: "ACTIVE" },
    });
    mocks.mergeCart.mockResolvedValue(cartView(2, "CUSTOMER"));

    const user = userEvent.setup();
    render(
      <I18nProvider>
        <AuthProvider>
          <CartProvider>
            <LoginProbe />
            <Probe />
          </CartProvider>
        </AuthProvider>
      </I18nProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("no"));
    await user.click(screen.getByRole("button", { name: "sign-in" }));

    await waitFor(() => expect(mocks.mergeCart).toHaveBeenCalledWith(session));
  });
});

function LoginProbe() {
  const { login } = useAuth();
  return <button onClick={() => void login("9000000001", "secret")}>sign-in</button>;
}
