'use client';

import {
  createContext,
  useContext,
  useTransition,
  type TransitionStartFunction,
  type ReactNode,
} from 'react';

interface ProductsNavigationContextValue {
  isPending: boolean;
  startTransition: TransitionStartFunction;
}

const ProductsNavigationContext =
  createContext<ProductsNavigationContextValue | null>(null);

export function ProductsNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <ProductsNavigationContext.Provider value={{ isPending, startTransition }}>
      {children}
    </ProductsNavigationContext.Provider>
  );
}

export function useProductsNavigation() {
  const context = useContext(ProductsNavigationContext);
  if (!context) {
    throw new Error(
      'useProductsNavigation must be used within ProductsNavigationProvider',
    );
  }
  return context;
}
