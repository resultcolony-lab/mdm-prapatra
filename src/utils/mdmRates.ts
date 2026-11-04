import { RateChart } from '../types/mdm';

export const OFFICIAL_DEFAULT_RATES: RateChart = {
  effectiveDate: '01-05-2025 से प्रभावी',
  class1to5: {
    dal: {
      id: 'dal',
      name: 'दाल',
      weightGram: 20,
      ratePerKg: 120.0,
      costPerChild: 2.4, // 20g / 1000 * 120 = 2.40
    },
    sabji: {
      id: 'sabji',
      name: 'सब्जी',
      weightGram: 50,
      ratePerKg: 35.0,
      costPerChild: 1.75, // 50g / 1000 * 35 = 1.75
    },
    tel: {
      id: 'tel',
      name: 'तेल',
      weightGram: 5,
      ratePerKg: 160.0,
      costPerChild: 0.8, // 5g / 1000 * 160 = 0.80
    },
    masala: {
      id: 'masala',
      name: 'मसाला / नमक',
      weightGram: 5,
      ratePerKg: 126.0,
      costPerChild: 0.63, // 5g / 1000 * 126 = 0.63
    },
    jalawan: {
      id: 'jalawan',
      name: 'जलावन',
      weightGram: 100,
      ratePerKg: 12.0,
      costPerChild: 1.2, // 100g / 1000 * 12 = 1.20
    },
    totalCostPerChild: 6.78,
    riceGramPerChild: 100, // 100 Gram rice
  },
  class6to8: {
    dal: {
      id: 'dal',
      name: 'दाल',
      weightGram: 30,
      ratePerKg: 120.0,
      costPerChild: 3.6, // 30g / 1000 * 120 = 3.60
    },
    sabji: {
      id: 'sabji',
      name: 'सब्जी',
      weightGram: 75,
      ratePerKg: 35.0,
      costPerChild: 2.62, // As per official rate chart table
    },
    tel: {
      id: 'tel',
      name: 'तेल',
      weightGram: 7.5,
      ratePerKg: 160.0,
      costPerChild: 1.2, // 7.5g / 1000 * 160 = 1.20
    },
    masala: {
      id: 'masala',
      name: 'मसाला / नमक',
      weightGram: 7.5,
      ratePerKg: 126.0,
      costPerChild: 0.95, // As per official rate chart table
    },
    jalawan: {
      id: 'jalawan',
      name: 'जलावन',
      weightGram: 150,
      ratePerKg: 12.0,
      costPerChild: 1.8, // 150g / 1000 * 12 = 1.80
    },
    totalCostPerChild: 10.17, // 3.60 + 2.62 + 1.20 + 0.95 + 1.80 = 10.17
    riceGramPerChild: 150, // 150 Gram rice
  },
};

/**
 * Exact 2-decimal currency rounding utility
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatINR(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0.00';
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatKg(val: number): string {
  if (isNaN(val) || val === null || val === undefined) return '0.000';
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}
