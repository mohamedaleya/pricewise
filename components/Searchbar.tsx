'use client';

import { scrapeAndStoreProduct } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import React, { FormEvent, useState } from 'react';
import { toast } from 'sonner';

const isValidAmazonProductURL = (url: string) => {
  try {
    const parsedURL = new URL(url);
    const hostname = parsedURL.hostname;

    if (
      hostname.includes('amazon.com') ||
      hostname.includes('amazon.') ||
      hostname.endsWith('amazon')
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
};

const Searchbar = () => {
  const [searchPrompt, setSearchPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isValidLink = isValidAmazonProductURL(searchPrompt);

    if (!isValidLink) {
      toast.error('Invalid URL', {
        description: 'Please enter a valid Amazon product URL',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Scrape the product page (or get existing product)
      const result = await scrapeAndStoreProduct(searchPrompt);

      if (result) {
        if (result.isExisting) {
          toast.info('Product already tracked!', {
            description: 'Redirecting to product page...',
          });
        } else {
          toast.success('Product added successfully!', {
            description: 'Redirecting to product page...',
          });
        }

        // Clear input and redirect to product page
        setSearchPrompt('');
        router.push(`/products/${result.productId}`);
      } else {
        toast.error('Failed to add product', {
          description: 'Could not scrape the product. Please try again.',
        });
      }

      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      toast.error('Something went wrong', {
        description:
          error instanceof Error
            ? error.message
            : 'Failed to scrape the product. Please try again.',
      });
      console.error(error);
    }
  };

  return (
    <form className="mt-12 flex flex-wrap gap-4" onSubmit={handleSubmit}>
      <input
        type="text"
        value={searchPrompt}
        onChange={(e) => setSearchPrompt(e.target.value)}
        placeholder="Enter product link"
        className="searchbar-input"
      />
      <button
        type="submit"
        className="searchbar-btn"
        disabled={searchPrompt === '' || isLoading}
      >
        {isLoading ? (
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          'Search'
        )}
      </button>
    </form>
  );
};

export default Searchbar;
