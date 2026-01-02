export type PriceHistoryItem = {
  price: number;
  date?: Date;
};

export type User = {
  email: string;
};

export type Product = {
  _id?: string;
  url: string;
  currency: string;
  image: string;
  title: string;
  createdAt: Date;
  currentPrice: number;
  originalPrice: number;
  priceHistory: PriceHistoryItem[] | [];
  highestPrice: number;
  lowestPrice: number;
  averagePrice: number;
  discountRate: number;
  description: string;
  category: string;
  reviewsCount: number;
  stars: number;
  updatedAt: Date;
  isOutOfStock: boolean;
  users?: User[];
};

export type NotificationType =
  | 'WELCOME'
  | 'CHANGE_OF_STOCK'
  | 'LOWEST_PRICE'
  | 'THRESHOLD_MET';

export type EmailContent = {
  subject: string;
  body: string;
};

export type EmailProductInfo = {
  productId?: string;
  title: string;
  url: string;
  image?: string;
  currentPrice?: number;
  originalPrice?: number;
  lowestPrice?: number;
  currency?: string;
  discountRate?: number;
};
