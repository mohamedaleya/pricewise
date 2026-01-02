'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SORT_OPTIONS, SortOption } from '@/types/pagination';
import { useProductsNavigation } from './ProductsNavigationContext';

interface SortSelectProps {
  currentSort: SortOption;
}

export default function SortSelect({ currentSort }: SortSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { startTransition } = useProductsNavigation();

  const handleSortChange = (value: SortOption) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.set('page', '1'); // Reset to first page when sorting changes

    // Use startTransition to mark this as a non-urgent update
    // This allows showing skeletons without blocking the UI
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm font-medium text-gray-700">
        Sort by:
      </label>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
