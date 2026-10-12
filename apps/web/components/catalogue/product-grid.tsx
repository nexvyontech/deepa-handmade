import { ProductCard } from "./product-card";
import type { ProductListItem } from "@/lib/types/api";
import type { ReactNode } from "react";

export function ProductGrid({
  products,
  className = "",
  empty,
}: {
  products: ProductListItem[];
  className?: string;
  empty?: ReactNode;
}) {
  if (products.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}