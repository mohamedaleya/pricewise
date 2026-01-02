import Link from 'next/link';
import { cn } from '@/lib/utils';
import { spaceGrotesk } from '@/lib/fonts';

const UnsubscribedPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const params = await searchParams;
  const email = typeof params.email === 'string' ? params.email : '';

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-24 text-center md:px-20">
      <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-500 dark:bg-green-900/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>

        <h1 className={cn('mb-4 text-3xl font-bold', spaceGrotesk.className)}>
          Unsubscribed
        </h1>

        <p className="mb-8 text-neutral-600 dark:text-neutral-400">
          We&apos;ve removed{' '}
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {email || 'your email'}
          </span>{' '}
          from our tracking list for this product. You will no longer receive
          price alerts for it.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="flex items-center justify-center rounded-lg bg-primary px-6 py-3 font-semibold text-white transition-all hover:bg-opacity-90 active:scale-95"
          >
            Go Back Home
          </Link>

          <p className="text-sm text-neutral-500">
            Unsubscribed by mistake? Just add your email back on the product
            page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnsubscribedPage;
