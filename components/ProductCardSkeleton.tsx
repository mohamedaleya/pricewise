const ProductCardSkeleton = () => {
  return (
    <div className="product-card animate-pulse border border-gray-200 p-6">
      {/* Image skeleton */}
      <div className="product-card_img-container min-h-[250px]">
        <div className="h-[200px] w-[200px] rounded-lg bg-gray-200" />
      </div>

      {/* Content skeleton */}
      <div className="flex flex-col gap-3">
        {/* Title skeleton */}
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-3/4 rounded bg-gray-200" />
        </div>

        {/* Category and price row */}
        <div className="flex items-center justify-between gap-2">
          {/* Category skeleton */}
          <div className="h-5 w-24 rounded bg-gray-200" />
          {/* Price skeleton */}
          <div className="flex flex-col items-end gap-1">
            <div className="h-6 w-20 rounded bg-gray-200" />
            <div className="h-4 w-16 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-8">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default ProductCardSkeleton;
