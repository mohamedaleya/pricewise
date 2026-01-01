import HeroCarousel from '@/components/HeroCarousel';
import Searchbar from '@/components/Searchbar';
import Image from 'next/image';
import React from 'react';
import { getAllProducts } from '@/lib/actions';
import ProductCard from '@/components/ProductCard';
import { Product } from '@/types';
import { cn } from '@/lib/utils';
import { spaceGrotesk } from '@/lib/fonts';

export const dynamic = 'force-dynamic';

const Home = async () => {
  const allProducts = await getAllProducts();

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
        <h2 className="section-text">Trending</h2>
        <div className="flex flex-wrap gap-x-8 gap-y-8">
          {allProducts?.map((product: Product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      </section>
    </>
  );
};

export default Home;
