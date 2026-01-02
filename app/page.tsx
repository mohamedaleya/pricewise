import HeroCarousel from '@/components/HeroCarousel';
import Searchbar from '@/components/Searchbar';
import Image from 'next/image';
import React, { Suspense } from 'react';
import { getProductsPaginated } from '@/lib/actions';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { spaceGrotesk } from '@/lib/fonts';
import { convertToEuro } from '@/lib/exchangeRates';
import Pagination from '@/components/Pagination';
import SortSelect from '@/components/SortSelect';
import { parseSortOption, SortOption } from '@/types/pagination';
import { ProductsNavigationProvider } from '@/components/ProductsNavigationContext';
import ProductsGrid from '@/components/ProductsGrid';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

interface HomeProps {
  searchParams: SearchParams;
}

const Home = async ({ searchParams }: HomeProps) => {
  const params = await searchParams;

  // Parse pagination and sorting params
  const page = Number(params.page) || 1;
  const sort = (params.sort as SortOption) || 'createdAt-desc';
  const { sortBy, sortOrder } = parseSortOption(sort);

  // Get paginated products
  const paginatedResult = await getProductsPaginated(
    page,
    12,
    sortBy,
    sortOrder,
  );

  // Convert all product prices to EUR
  const productsWithEuroPrices = await Promise.all(
    paginatedResult.items.map(async (product: Product) => {
      const euroPrice = await convertToEuro(
        product.currentPrice,
        product.currency,
      );
      return { product, euroPrice };
    }),
  );

  return (
    <>
      <section className="px-6 py-24 md:px-20">
        <div className="flex gap-16 max-xl:flex-col">
          <div className="flex flex-col justify-center">
            <p className="small-text">
              Smart Shopping Starts Here:
              <Image
                src="/assets/icons/arrow-right.svg"
                alt="arrow-right"
                width={16}
                height={16}
              />
            </p>
            <h1 className={cn('head-text', spaceGrotesk.className)}>
              Unleash the Power of
              <span className="text-primary"> PriceWise</span>
            </h1>
            <p className="mt-6">
              Powerful, self-serve product and growth analytics to help you
              convert, engage, and retain more.
            </p>
            <Searchbar />
          </div>
          <HeroCarousel />
        </div>
      </section>

      <section className="trending-section">
        <ProductsNavigationProvider>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="section-text">Trending</h2>
            <Suspense fallback={null}>
              <SortSelect currentSort={sort} />
            </Suspense>
          </div>

          {productsWithEuroPrices.length > 0 ? (
            <>
              <ProductsGrid skeletonCount={12}>
                <div className="flex flex-wrap gap-x-8 gap-y-8">
                  {productsWithEuroPrices.map(({ product, euroPrice }) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      euroPrice={euroPrice}
                    />
                  ))}
                </div>
              </ProductsGrid>
              <div className="mt-10">
                <Suspense fallback={null}>
                  <Pagination
                    currentPage={paginatedResult.page}
                    totalPages={paginatedResult.totalPages}
                    hasNext={paginatedResult.hasNext}
                    hasPrev={paginatedResult.hasPrev}
                    total={paginatedResult.total}
                    limit={paginatedResult.limit}
                  />
                </Suspense>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg text-gray-500">No products found.</p>
              <p className="mt-2 text-gray-400">
                Start tracking products by entering a product URL above.
              </p>
            </div>
          )}
        </ProductsNavigationProvider>
      </section>
    </>
  );
};

export default Home;
