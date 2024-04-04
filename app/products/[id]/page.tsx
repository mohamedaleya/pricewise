import Modal from "@/components/Modal";
import PriceInfoCard from "@/components/PriceInfoCard";
import ProductCard from "@/components/ProductCard";
import { getProductById, getSimilarProducts } from "@/lib/actions";
import { Product } from "@/types";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import React from "react";

type ProductDetailsProps = {
  params: { id: string };
};
const ProductDetails = async ({ params: { id } }: ProductDetailsProps) => {
  const product: Product = await getProductById(id);

  if (!product) redirect("/");

  const similarProducts = await getSimilarProducts(id);

  return (
    <div className="product-container">
      <div className="flex gap-28 xl:flex-row flex-col">
        <div className="product-image flex items-center p-8">
          <Image
            src={product.image}
            alt={product.title}
            width={580}
            height={400}
            className="mx-auto "
          />
        </div>
        <div className="flex flex-1 flex-col">
          <div className="flex justify-between items-start gao-5 flex-wrap pb-6">
            <div className="flex flex-col gap-3">
              <p className="text-[28px] text-secondary font-semibold">
                {product.title}
              </p>
            </div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center align-middle bg-gray-100 rounded-10 my-2">
                <Link
                  href={product.url}
                  target="_blank"
                  className="text-semibold text-black px-4 py-2 flex items-center gap-3"
                >
                  Visit Product
                  <Image
                    src="/assets/icons/arrow-up-right.svg"
                    alt="arrow-up-right"
                    width={16}
                    height={16}
                  />
                </Link>
              </div>

              <div className="flex items-center gap-3 ml-auto">
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
                <div className="p-2 bg-white-200 rounded-10">
                  <Image
                    src="/assets/icons/bookmark.svg"
                    alt="bookmark"
                    width={20}
                    height={20}
                  />
                </div>
                <div className="p-2 bg-white-200 rounded-10">
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
              <p className="text-[34px] text-secondary font-bold">
                {product.currency} {product.currentPrice}
              </p>
              {product.originalPrice !== product.currentPrice ? (
                <p className="text-[21px] text-black opacity-50 line-through">
                  {product.currency} {product.originalPrice}
                </p>
              ) : (
                <p className="text-sm text-gray-500">No discount recorded</p>
              )}
            </div>
            <div className="flex flex-col gap-4 ml-auto">
              <div className="flex gap-3 justify-end">
                <div className="product-stars">
                  <Image
                    src="/assets/icons/star.svg"
                    alt="star"
                    width={16}
                    height={16}
                  />
                  <p className="text-sm text-primary-orange font-semibold">
                    {product.stars || "25"}
                  </p>
                </div>
                <div className="product-reviews">
                  <Image
                    src="/assets/icons/comment.svg"
                    alt="comment"
                    width={16}
                    height={16}
                  />
                  <p className="text-sm text-secondary font-semibold">
                    {product.reviewsCount} Reviews
                  </p>
                </div>
              </div>
              <p className="text-sm text-black opacity-50">
                <span className="text-primary-green font-semibold">93% </span>of
                buys have recommended this.
              </p>
            </div>
          </div>
          <div className="my-7 flex flex-col gap-5">
            <div className="flex gap-5 flex-wrap">
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
            <h3 className="text-2xl text-secondary font-semibold">
              Product Description
            </h3>
            <div className="flex flex-col gap-4">
              {product?.description?.split("\n")}
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
        <div className="py-14 flex flex-col gap-2 w-full">
          <p className="section-text">Similar Products</p>
          <div className="flex flex-wrap gap-10 mt-7 w-full">
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
