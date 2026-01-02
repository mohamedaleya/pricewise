'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useProductsNavigation } from './ProductsNavigationContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  total: number;
  limit: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  hasNext,
  hasPrev,
  total,
  limit,
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startTransition, isPending } = useProductsNavigation();

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());

    // Use startTransition for non-blocking navigation with skeleton display
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  // Calculate the range of items being shown
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const delta = 2; // Number of pages to show around current page

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== 'ellipsis') {
        pages.push('ellipsis');
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-sm text-gray-600">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{total}</span> products
      </p>

      <nav className="flex items-center gap-1">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => hasPrev && navigateToPage(currentPage - 1)}
          disabled={!hasPrev || isPending}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            hasPrev && !isPending
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'cursor-not-allowed text-gray-300',
          )}
          aria-disabled={!hasPrev}
        >
          Previous
        </button>

        {/* Page Numbers */}
        <div className="hidden items-center gap-1 sm:flex">
          {getPageNumbers().map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <button
                key={page}
                type="button"
                onClick={() => page !== currentPage && navigateToPage(page)}
                disabled={isPending}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                  page === currentPage
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
                  isPending && 'cursor-not-allowed opacity-70',
                )}
              >
                {page}
              </button>
            ),
          )}
        </div>

        {/* Mobile Page Indicator */}
        <span className="px-3 text-sm text-gray-600 sm:hidden">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => hasNext && navigateToPage(currentPage + 1)}
          disabled={!hasNext || isPending}
          className={cn(
            'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            hasNext && !isPending
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'cursor-not-allowed text-gray-300',
          )}
          aria-disabled={!hasNext}
        >
          Next
        </button>
      </nav>
    </div>
  );
}
