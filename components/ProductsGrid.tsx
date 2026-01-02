'use client';

import { useProductsNavigation } from './ProductsNavigationContext';
import { ProductGridSkeleton } from './ProductCardSkeleton';
import type { ReactNode } from 'react';

interface ProductsGridProps {
  children: ReactNode;
  skeletonCount?: number;
}

export default function ProductsGrid({
  children,
  skeletonCount = 12,
}: ProductsGridProps) {
  const { isPending } = useProductsNavigation();

  if (isPending) {
    return <ProductGridSkeleton count={skeletonCount} />;
  }

  return <>{children}</>;
}
