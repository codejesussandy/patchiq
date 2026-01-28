/**
 * Asset Depreciation Calculation Utilities
 *
 * Implements standard GAAP-compliant depreciation methods:
 * - Straight-Line Method (SLM)
 * - Double-Declining Balance (DDB)
 * - Sum-of-Years' Digits (SYD)
 * - Units of Production (optional, usage-based)
 */

export type DepreciationMethod =
  | 'straight-line'
  | 'double-declining'
  | 'sum-of-years'
  | 'units-of-production';

export interface DepreciationInput {
  purchaseCost: number;        // Original cost of asset
  salvageValue: number;        // Residual value at end of life
  usefulLifeYears: number;     // Expected useful life in years
  purchaseDate: Date;          // When asset was purchased
  method: DepreciationMethod;  // Depreciation method to use
  currentDate?: Date;          // Calculate as of this date (defaults to now)
}

export interface DepreciationPoint {
  date: string;      // ISO date string (YYYY-MM-DD)
  value: number;     // Book value at this point
  label: string;     // Human-readable label
  year?: number;     // Year number (1, 2, 3...)
}

export interface DepreciationResult {
  currentValue: number;                    // Current book value
  totalDepreciation: number;               // Total depreciation to date
  annualDepreciation: number;              // This year's depreciation
  depreciationTimeline: DepreciationPoint[]; // Timeline for graph
  method: DepreciationMethod;              // Method used
  yearsElapsed: number;                    // Years since purchase
  yearsRemaining: number;                  // Years until end of life
}

/**
 * Calculate years between two dates
 */
function yearsBetween(startDate: Date, endDate: Date): number {
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return (endDate.getTime() - startDate.getTime()) / msPerYear;
}

/**
 * Format date as ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Add years to a date
 */
function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Straight-Line Method (SLM)
 * Formula: Annual Depreciation = (Cost - Salvage) / Useful Life
 *
 * Distributes cost evenly over the asset's useful life.
 * Best for: Assets with steady usage (furniture, buildings)
 */
function calculateStraightLine(
  cost: number,
  salvage: number,
  usefulLife: number,
  yearsElapsed: number
): { currentValue: number; annualDepreciation: number } {
  const depreciableAmount = cost - salvage;
  const annualDepreciation = depreciableAmount / usefulLife;
  const totalDepreciation = Math.min(annualDepreciation * yearsElapsed, depreciableAmount);
  const currentValue = Math.max(cost - totalDepreciation, salvage);

  return { currentValue, annualDepreciation };
}

/**
 * Double-Declining Balance (DDB)
 * Formula: Annual Depreciation = Book Value × (2 / Useful Life)
 *
 * Accelerated method - higher depreciation in early years.
 * Best for: Technology, vehicles, assets that lose value quickly
 */
function calculateDoubleDeclining(
  cost: number,
  salvage: number,
  usefulLife: number,
  yearsElapsed: number
): { currentValue: number; annualDepreciation: number } {
  const rate = 2 / usefulLife;
  let bookValue = cost;
  let annualDepreciation = 0;

  // Calculate year by year
  for (let year = 1; year <= Math.floor(yearsElapsed); year++) {
    annualDepreciation = bookValue * rate;

    // Don't depreciate below salvage value
    if (bookValue - annualDepreciation < salvage) {
      annualDepreciation = bookValue - salvage;
    }

    bookValue -= annualDepreciation;

    if (bookValue <= salvage) {
      bookValue = salvage;
      break;
    }
  }

  // Handle partial year
  const partialYear = yearsElapsed - Math.floor(yearsElapsed);
  if (partialYear > 0 && bookValue > salvage) {
    const partialDepreciation = bookValue * rate * partialYear;
    if (bookValue - partialDepreciation >= salvage) {
      bookValue -= partialDepreciation;
      annualDepreciation = bookValue * rate; // Current year's rate
    }
  }

  return { currentValue: Math.max(bookValue, salvage), annualDepreciation };
}

/**
 * Sum-of-Years' Digits (SYD)
 * Formula: Annual Depreciation = (Remaining Years / SYD) × (Cost - Salvage)
 * Where SYD = n(n+1)/2, n = useful life
 *
 * Accelerated but smoother than DDB.
 * Best for: Assets that lose value steadily but faster initially
 */
function calculateSumOfYears(
  cost: number,
  salvage: number,
  usefulLife: number,
  yearsElapsed: number
): { currentValue: number; annualDepreciation: number } {
  const depreciableAmount = cost - salvage;
  const sumOfYears = (usefulLife * (usefulLife + 1)) / 2;

  let bookValue = cost;
  let annualDepreciation = 0;

  // Calculate year by year
  for (let year = 1; year <= Math.min(Math.ceil(yearsElapsed), usefulLife); year++) {
    const remainingYears = usefulLife - year + 1;
    annualDepreciation = (remainingYears / sumOfYears) * depreciableAmount;

    // Handle partial year for the current year
    if (year === Math.ceil(yearsElapsed) && yearsElapsed % 1 !== 0) {
      const partialYear = yearsElapsed - Math.floor(yearsElapsed);
      bookValue -= annualDepreciation * partialYear;
    } else if (year <= yearsElapsed) {
      bookValue -= annualDepreciation;
    }
  }

  return { currentValue: Math.max(bookValue, salvage), annualDepreciation };
}

/**
 * Generate depreciation timeline for graphing
 */
function generateTimeline(
  input: DepreciationInput,
  calculateValueAtYear: (year: number) => number
): DepreciationPoint[] {
  const timeline: DepreciationPoint[] = [];
  const { purchaseDate, usefulLifeYears, purchaseCost, salvageValue } = input;
  const currentDate = input.currentDate || new Date();
  const yearsElapsed = yearsBetween(purchaseDate, currentDate);

  // Point 1: Purchase date
  timeline.push({
    date: formatDate(purchaseDate),
    value: Math.round(purchaseCost),
    label: 'Purchase',
    year: 0,
  });

  // Intermediate points: Each year
  for (let year = 1; year <= usefulLifeYears; year++) {
    const pointDate = addYears(purchaseDate, year);
    const value = calculateValueAtYear(year);

    // Mark current year specially
    const isCurrentYear = year === Math.floor(yearsElapsed) ||
      (year === Math.ceil(yearsElapsed) && yearsElapsed > 0);

    timeline.push({
      date: formatDate(pointDate),
      value: Math.round(value),
      label: isCurrentYear && Math.abs(year - yearsElapsed) < 0.5 ? `Year ${year} (Current)` : `Year ${year}`,
      year,
    });
  }

  // If we haven't reached end of life, add current value point
  if (yearsElapsed < usefulLifeYears && yearsElapsed > 0) {
    const currentValue = calculateValueAtYear(yearsElapsed);

    // Find insert position (after purchase, before next year)
    const insertIndex = Math.floor(yearsElapsed) + 1;

    // Only add if not too close to a year boundary
    if (yearsElapsed % 1 > 0.1 && yearsElapsed % 1 < 0.9) {
      timeline.splice(insertIndex, 0, {
        date: formatDate(currentDate),
        value: Math.round(currentValue),
        label: 'Today',
        year: yearsElapsed,
      });
    }
  }

  return timeline;
}

/**
 * Main depreciation calculation function
 */
export function calculateDepreciation(input: DepreciationInput): DepreciationResult {
  const {
    purchaseCost,
    salvageValue,
    usefulLifeYears,
    purchaseDate,
    method,
    currentDate = new Date(),
  } = input;

  // Validate inputs
  if (purchaseCost <= 0) {
    throw new Error('Purchase cost must be greater than 0');
  }
  if (salvageValue < 0) {
    throw new Error('Salvage value cannot be negative');
  }
  if (salvageValue >= purchaseCost) {
    throw new Error('Salvage value must be less than purchase cost');
  }
  if (usefulLifeYears <= 0) {
    throw new Error('Useful life must be greater than 0');
  }

  const yearsElapsed = Math.max(0, yearsBetween(purchaseDate, currentDate));
  const yearsRemaining = Math.max(0, usefulLifeYears - yearsElapsed);

  let result: { currentValue: number; annualDepreciation: number };
  let calculateValueAtYear: (year: number) => number;

  switch (method) {
    case 'double-declining':
      result = calculateDoubleDeclining(purchaseCost, salvageValue, usefulLifeYears, yearsElapsed);
      calculateValueAtYear = (year: number) => {
        const { currentValue } = calculateDoubleDeclining(purchaseCost, salvageValue, usefulLifeYears, year);
        return currentValue;
      };
      break;

    case 'sum-of-years':
      result = calculateSumOfYears(purchaseCost, salvageValue, usefulLifeYears, yearsElapsed);
      calculateValueAtYear = (year: number) => {
        const { currentValue } = calculateSumOfYears(purchaseCost, salvageValue, usefulLifeYears, year);
        return currentValue;
      };
      break;

    case 'units-of-production':
      // For units-of-production, we'd need usage data. Fall back to straight-line.
      // In a real implementation, you'd pass in usage metrics.
      result = calculateStraightLine(purchaseCost, salvageValue, usefulLifeYears, yearsElapsed);
      calculateValueAtYear = (year: number) => {
        const { currentValue } = calculateStraightLine(purchaseCost, salvageValue, usefulLifeYears, year);
        return currentValue;
      };
      break;

    case 'straight-line':
    default:
      result = calculateStraightLine(purchaseCost, salvageValue, usefulLifeYears, yearsElapsed);
      calculateValueAtYear = (year: number) => {
        const { currentValue } = calculateStraightLine(purchaseCost, salvageValue, usefulLifeYears, year);
        return currentValue;
      };
      break;
  }

  const timeline = generateTimeline(input, calculateValueAtYear);

  return {
    currentValue: Math.round(result.currentValue),
    totalDepreciation: Math.round(purchaseCost - result.currentValue),
    annualDepreciation: Math.round(result.annualDepreciation),
    depreciationTimeline: timeline,
    method,
    yearsElapsed: Math.round(yearsElapsed * 100) / 100,
    yearsRemaining: Math.round(yearsRemaining * 100) / 100,
  };
}

/**
 * Map database depreciation type to our method enum
 */
export function mapDepreciationMethod(dbType: string | null | undefined): DepreciationMethod {
  if (!dbType) return 'straight-line';

  const normalized = dbType.toLowerCase().replace(/[^a-z]/g, '');

  switch (normalized) {
    case 'doubledeclining':
    case 'doubledecliningbalance':
    case 'ddb':
    case 'decliningbalance':
      return 'double-declining';

    case 'sumofyears':
    case 'sumofyearsdigits':
    case 'syd':
      return 'sum-of-years';

    case 'unitsofproduction':
    case 'units':
    case 'usage':
      return 'units-of-production';

    case 'straightline':
    case 'slm':
    case 'linear':
    default:
      return 'straight-line';
  }
}

/**
 * Get human-readable method name
 */
export function getMethodDisplayName(method: DepreciationMethod): string {
  switch (method) {
    case 'double-declining':
      return 'Double Declining Balance';
    case 'sum-of-years':
      return 'Sum of Years Digits';
    case 'units-of-production':
      return 'Units of Production';
    case 'straight-line':
    default:
      return 'Straight Line';
  }
}
