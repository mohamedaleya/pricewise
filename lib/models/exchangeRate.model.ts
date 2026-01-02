import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema(
  {
    base: { type: String, required: true, default: 'EUR' },
    fetchedAt: { type: Date, required: true, default: Date.now },
    rates: {
      type: Map,
      of: Number,
      required: true,
    },
  },
  { timestamps: true },
);

// Index for quick lookups by date
exchangeRateSchema.index({ fetchedAt: -1 });

const ExchangeRate =
  mongoose.models.ExchangeRate ||
  mongoose.model('ExchangeRate', exchangeRateSchema);

export default ExchangeRate;
