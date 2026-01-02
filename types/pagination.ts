export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'currentPrice';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'updatedAt-desc', label: 'Recently Updated' },
  { value: 'title-asc', label: 'Name (A-Z)' },
  { value: 'title-desc', label: 'Name (Z-A)' },
  { value: 'currentPrice-asc', label: 'Price (Low to High)' },
  { value: 'currentPrice-desc', label: 'Price (High to Low)' },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]['value'];

export function parseSortOption(sort: string): {
  sortBy: PaginationParams['sortBy'];
  sortOrder: PaginationParams['sortOrder'];
} {
  const [sortBy, sortOrder] = sort.split('-') as [
    PaginationParams['sortBy'],
    PaginationParams['sortOrder'],
  ];
  return { sortBy, sortOrder };
}
