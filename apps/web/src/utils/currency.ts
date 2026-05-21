type NumericLike = number | string | null | undefined;

type CurrencyFormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  fallback?: number;
};

function toFiniteNumber(value: NumericLike, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function formatInr(value: NumericLike, options: CurrencyFormatOptions = {}) {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    fallback = 0,
  } = options;

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(toFiniteNumber(value, fallback));
}
