import type { Metadata } from "next";
import { CartPage } from "@/components/cart/cart-page";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false },
};

export default function CartRoute() {
  return <CartPage />;
}
