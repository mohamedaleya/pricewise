import Modal from '@/components/Modal';
import PriceInfoCard from '@/components/PriceInfoCard';
import ProductCard from '@/components/ProductCard';
import { getProductById, getSimilarProducts } from '@/lib/actions';
import { Product } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
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

dayjs.extend(LocalizedFormat);

type ProductDetailsProps = {
  params: { id: string };
};
const ProductDetails = async ({ params: { id } }: ProductDetailsProps) => {
  const product: Product = await getProductById(id);

  if (!product) redirect('/');

  const similarProducts = await getSimilarProducts(id);

  return (
    <div className="product-container">
      <div className="flex flex-col gap-8 xl:flex-row xl:gap-28">
        <div className="product-image flex items-center p-8">
          <Image
            src={product.image}
            alt={product.title}
            width={500}
            height={400}
            className="mx-auto h-[400px] w-auto object-contain"
          />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex w-full flex-wrap items-start justify-between gap-5">
            <div className="flex flex-col gap-3">
              <p className="text-2xl font-semibold leading-normal text-secondary sm:text-[28px]">
                {product.title}
              </p>
            </div>
            <div className="mb-2 flex w-full flex-wrap items-center sm:justify-between">
              <div className="my-2 flex items-center rounded-10 border border-transparent bg-gray-100 align-middle transition-all duration-200 hover:border-gray-200 hover:bg-gray-100/50">
                <Link
                  href={product.url}
                  target="_blank"
                  className="flex h-[40px] items-center gap-2 px-4 text-sm font-medium text-black sm:text-base"
                >
                  Visit Product
                  <Image
                    src="/assets/icons/arrow-up-right.svg"
                    alt="arrow-up-right"
                    width={16}
                    height={16}
                    className=""
                  />
                </Link>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="product-hearts">
                  <Image
                    src="/assets/icons/red-heart.svg"
                    alt="heart"
                    width={20}
                    height={20}
                  />
                  <p className="text-base font-semibold text-[#D46F77]">
                    {product.reviewsCount}
                  </p>
                </div>
                <div className="flex h-[40px] items-center rounded-10 bg-white-200 p-2">
                  <Image
                    src="/assets/icons/bookmark.svg"
                    alt="bookmark"
                    width={20}
                    height={20}
                  />
                </div>
                <div className="flex h-[40px] items-center rounded-10 bg-white-200 p-2 ">
                  <Image
                    src="/assets/icons/share.svg"
                    alt="share"
                    width={20}
                    height={20}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="product-info">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <p className="text-[34px] font-bold text-secondary">
                  {product.currency} {product.currentPrice}
                </p>

                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="h-5 w-5 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent className="space-y-2 px-4 py-3">
                      <p>
                        <strong>Tracking Start Date: </strong>
                        {dayjs(product.createdAt).format('LL')}
                      </p>
                      <p>
                        <strong>Last Update:</strong>{' '}
                        {dayjs(product.updatedAt).format('LL')}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div>
                {product.originalPrice !== product.currentPrice ? (
                  <div className="flex items-center gap-1.5">
                    <p className="text-[21px] text-black line-through opacity-50">
                      {product.currency} {product.originalPrice}
                    </p>
                    <p className="font-medium text-red-500">
                      (
                      {(
                        ((product.originalPrice - product.currentPrice) /
                          product.originalPrice) *
                        100
                      ).toFixed(2)}
                      % off)
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    No discount at this moment
                    
                  </p>
                )}
              </div>
            </div>
            <div className="ml-auto flex flex-col gap-4">
              <div className="flex justify-end gap-3">
                <div className="product-stars">
                  <Image
                    src="/assets/icons/star.svg"
                    alt="star"
                    width={16}
                    height={16}
                  />
                  <p className="text-sm font-semibold text-primary-orange">
                    {product.stars || '25'}
                  </p>
                </div>
                <div className="product-reviews">
                  <Image
                    src="/assets/icons/comment.svg"
                    alt="comment"
                    width={16}
                    height={16}
                  />
                  <p className="text-sm font-semibold text-secondary">
                    {product.reviewsCount} Reviews
                  </p>
                </div>
              </div>
              <p className="text-sm text-black opacity-50">
                <span className="font-semibold text-primary-green">93% </span>of
                buys have recommended this.
              </p>
            </div>
          </div>
          <div className="my-7 flex flex-col gap-5">
            <div className="flex flex-wrap gap-5">
              <PriceInfoCard
                title="Current Price"
                iconSrc="/assets/icons/price-tag.svg"
                value={`${product.currency} ${product.currentPrice}`}
              />
              <PriceInfoCard
                title="Average Price"
                iconSrc="/assets/icons/chart.svg"
                value={`${product.currency} ${product.averagePrice}`}
              />
              <PriceInfoCard
                title="Highest Price"
                iconSrc="/assets/icons/arrow-up.svg"
                value={`${product.currency} ${product.highestPrice}`}
              />
              <PriceInfoCard
                title="Lowest Price"
                iconSrc="/assets/icons/arrow-down.svg"
                value={`${product.currency} ${product.lowestPrice}`}
              />
            </div>
          </div>
          <Modal productId={id} />
        </div>
      </div>

      {product.description && (
        <div className="flex flex-col gap-16">
          <div className="flex flex-col gap-5">
            <h3 className="text-2xl font-semibold text-secondary">
              Product Description
            </h3>
            <div className="flex flex-col gap-4">
              {product?.description?.split('\n')}
            </div>
          </div>
          {/* <button className="btn w-fit mx-auto flex items-center justify-center gap-3 min-w-[200px]">
            <Image
              src="/assets/icons/bag.svg"
              alt="check"
              width={22}
              height={22}
            />
            <Link href="/" className="text-base text-white">
              Buy Now
            </Link>
          </button> */}
        </div>
      )}
      {similarProducts && similarProducts?.length > 0 && (
        <div className="flex w-full flex-col gap-2 py-14">
          <p className="section-text">Similar Products</p>
          <div className="mt-7 flex w-full flex-wrap gap-10">
            {similarProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
