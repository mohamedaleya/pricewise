# Pricewise - Smart Amazon Price Tracker

Pricewise is a powerful, full-stack price tracking application that helps users save money by monitoring Amazon products. It automatically scrapes product details, tracks price history, and sends automated email notifications when prices drop or items come back in stock.

## 🚀 Features

- **Advanced Web Scraping**: Robust scraping engine using ScraperAPI to bypass bot detection across multiple Amazon domains (US, UK, DE, FR, IT, ES, etc.).
- **Automated Price Alerts**: Users receive instant email notifications (via Resend & Nodemailer) for:
  - Welcome confirmation
  - Price drops below tracked threshold
  - Items back in stock
  - Lowest price reached
- **Dynamic Price Tracking**: Real-time charts showing price history (Highest, Lowest, and Average).
- **Multi-Currency Support**: Automatic currency conversion and exchange rate updates via daily cron jobs.
- **Smart Categorization**: Automatic category inference based on breadcrumbs and product titles.
- **User Management**: Dedicated dashboard for users to manage their tracked products and unsubscribe from alerts.
- **Modern UI/UX**: Built with React 19 and Next.js 15, featuring a responsive design, smooth animations, and optimized performance.
- **Advanced Sorting & Pagination**: Easily browse through tracked products with customizable sorting (Price, Date, Title) and efficient pagination.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI Components**: [React 19](https://react.dev/), [Radix UI](https://www.radix-ui.com/), [Headless UI](https://headlessui.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Scraping**: [Cheerio](https://cheerio.js.org/), [Axios](https://axios-http.com/), [ScraperAPI](https://www.scraperapi.com/)
- **Emailing**: [Nodemailer](https://nodemailer.com/), [Resend](https://resend.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Workflows**: GitHub Actions for automated scraping and deployment.

## 📋 Environment Variables

Create a `.env` file in the root directory and add the following:

```env
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# ScraperAPI
SCRAPER_API_KEY=your_scraper_api_key

# Email (Resend/Nodemailer)
EMAIL_USER=your_email_address
EMAIL_PASSWORD=your_app_password
RESEND_API_KEY=your_resend_api_key

# Cron Secret (for security)
CRON_SECRET=your_random_secret_string

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🪜 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/mohamedaleya/pricewise.git
cd pricewise
```

### 2. Install dependencies

```bash
bun install
# or
npm install
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧹 Maintenance Scripts

The project includes several utility scripts located in the `scripts/` directory:

- `applyCategories.ts`: Bulk update product categories based on current inference logic.
- `viewProducts.ts`: Terminal utility to inspect products in the database.

Run them using:

```bash
bun run scripts/applyCategories.ts
```

## 🚢 Deployment

The app is configured for deployment using Docker and GitHub Actions. See `.github/workflows/deploy.yml` for CI/CD details.

---

Built with ❤️ by [Mohamed Aleya](https://github.com/mohamedaleya)
