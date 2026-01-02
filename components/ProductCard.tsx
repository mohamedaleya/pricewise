import { Product } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';
import dayjs from 'dayjs';
import LocalizedFormat from 'dayjs/plugin/localizedFormat';
import { formatPrice } from '@/lib/utils';

dayjs.extend(LocalizedFormat);

interface ProductProps {
  product: Product;
  euroPrice?: number;
}

const ProductCard = ({ product, euroPrice }: ProductProps) => {
  const displayPrice = euroPrice ?? product.currentPrice;
  const hasDiscount =
    product.originalPrice > product.currentPrice && product.discountRate > 0;

  return (
    <Link
      href={`/products/${product._id}`}
      className="product-card border border-gray-300 p-6 transition duration-200 ease-in-out hover:border-[#CDDBFF] hover:shadow-md"
    >
      <div className="product-card_img-container min-h-[250px]">
        <Image
          src={product.image}
          alt={product.title}
          width={200}
          height={200}
          className="product-card_img min-h-[250px]"
        />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="product-title">{product.title}</h3>

        <div className="flex items-center justify-between gap-2">
          <TooltipProvider delayDuration={100}>
            <div className="flex min-w-0 items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="truncate text-lg capitalize text-black opacity-50">
                    {product.category}
                  </p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{product.category}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="h-4 w-4 flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600" />
                </TooltipTrigger>
                <TooltipContent className="space-y-1 px-3 py-2">
                  <p className="text-xs">
                    <strong>Added:</strong>{' '}
                    {dayjs(product.createdAt).format('LLL')}
                  </p>
                  <p className="text-xs">
                    <strong>Updated:</strong>{' '}
                    {dayjs(product.updatedAt).format('LLL')}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
          <div className="flex flex-col items-end">
            <p className="text-lg font-semibold text-black">
              €{formatPrice(displayPrice)}
            </p>
            {hasDiscount && (
              <p className="text-sm text-gray-500 line-through">
                €
                {formatPrice(
                  euroPrice
                    ? (euroPrice / product.currentPrice) * product.originalPrice
                    : product.originalPrice,
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
