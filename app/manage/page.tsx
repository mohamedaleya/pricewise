import { getTrackedProducts } from '@/lib/actions';
import ProductCard from '@/components/ProductCard';
import { convertToEuro } from '@/lib/exchangeRates';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { spaceGrotesk } from '@/lib/fonts';
import Searchbar from '@/components/Searchbar';

const ManagePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : '';

  let trackedProducts = [];
  if (email) {
    trackedProducts = await getTrackedProducts(email);
  }

  const productsWithEuroPrices = await Promise.all(
    (trackedProducts || []).map(async (product: Product) => {
      const euroPrice = await convertToEuro(
        product.currentPrice,
        product.currency,
      );
      return { product, euroPrice };
    }),
  );

  return (
    <div className="min-h-screen px-6 py-24 md:px-20">
      <div className="flex flex-col gap-6">
        <h1 className={cn('head-text', spaceGrotesk.className)}>
          Manage <span className="text-primary">Preferences</span>
        </h1>

        {!email ? (
          <div className="max-w-xl">
            <p className="mb-8 text-neutral-600">
              Enter your email address to see all the products you&apos;re
              currently tracking and manage your alerts.
            </p>
            <form action="/manage" className="flex flex-col gap-4 sm:flex-row">
              <input
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                type="submit"
                className="rounded-lg bg-primary px-8 py-3 font-semibold text-white transition-all hover:bg-opacity-90"
              >
                Find My Products
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-2 border-b border-neutral-100 pb-6">
              <p className="text-neutral-500">Tracking for:</p>
              <h2 className="flex items-center gap-4 text-2xl font-bold">
                {email}
                <a
                  href="/manage"
                  className="text-sm font-normal italic text-primary hover:underline"
                >
                  Change email
                </a>
              </h2>
            </div>

            {productsWithEuroPrices.length > 0 ? (
              <div className="flex flex-wrap gap-x-8 gap-y-12">
                {productsWithEuroPrices.map(({ product, euroPrice }) => (
                  <div key={product._id} className="group relative">
                    <ProductCard product={product} euroPrice={euroPrice} />
                    <div className="mt-4">
                      <a
                        href={`/api/unsubscribe?productId=${product._id}&email=${encodeURIComponent(email)}`}
                        className="inline-block rounded-md border border-red-100 p-2 text-sm font-medium text-red-500 transition-all hover:bg-red-50 hover:text-red-600"
                      >
                        Stop Tracking
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-neutral-50 py-20">
                <p className="mb-4 text-lg font-medium text-neutral-500">
                  You aren&apos;t tracking any products yet.
                </p>
                <div className="w-full max-w-md px-6">
                  <Searchbar />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagePage;
