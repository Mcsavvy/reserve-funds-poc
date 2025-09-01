import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate compound interest for an investment
 * @param principal - Initial investment amount
 * @param annualRate - Annual interest rate as a percentage (e.g., 5.5 for 5.5%)
 * @param years - Number of years to compound
 * @returns The final amount including compound interest
 */
export function calculateCompoundInterest(principal: number, annualRate: number, years: number): number {
  return principal * Math.pow(1 + annualRate / 100, years);
}

/**
 * Calculate the interest portion of compound interest
 * @param principal - Initial investment amount
 * @param annualRate - Annual interest rate as a percentage
 * @param years - Number of years to compound
 * @returns The interest earned (final amount minus principal)
 */
export function calculateCompoundInterestEarned(principal: number, annualRate: number, years: number): number {
  return calculateCompoundInterest(principal, annualRate, years) - principal;
}
