import { Product } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

interface ProductProps {
  product: Product;
}

const ProductCard = ({ product }: ProductProps) => {
  return (
    <Link
      href={`/products/${product._id}`}
      className="product-card border border-gray-200 p-6 transition duration-200 ease-in-out hover:border-gray-500"
    >
      <div className="product-card_img-container min-h-[250px]">
        <Image
          src={product.image}
          alt={product.title}
          width={200}
          height={200}
          className="product-card_img  min-h-[250px]"
        />
      </div>
      <div className="flex flex-col gap-3">
        <h3 className="product-title">{product.title}</h3>

        <div className="flex justify-between">
          <p className="text-lg capitalize text-black opacity-50">
            {product.category}
          </p>
          <p className="text-lg font-semibold text-black">
            <span>{product?.currency}</span>
            <span>{product?.currentPrice}</span>
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
