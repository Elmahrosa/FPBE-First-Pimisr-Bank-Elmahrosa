/**
 * @fileoverview Utility functions for currency formatting, conversion, and validation
 * in the FPBE mobile banking application with enhanced Pi Network integration.
 * @version 1.0.0
 */

import { format } from 'date-fns'; // v2.30.0
import BigNumber from 'bignumber.js'; // v9.1.1
import { ExchangeRateService } from '@pi-network/exchange-rate-service'; // v1.0.0
import { Transaction } from '../types/transaction.types';
import { PiTransaction, WalletStatus } from '../types/pi.types';

// Global constants
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'PI'];
const DEFAULT_CURRENCY = 'USD';
const DECIMAL_PLACES = 2;
const CURRENCY_LIMITS = {
    USD: 50000,
    EUR: 45000,
    GBP: 40000,
    PI: 100000
};
const RATE_CACHE_DURATION = 300000; // 5 minutes in milliseconds

// Initialize exchange rate service
const exchangeRateService = new ExchangeRateService();

// Cache for exchange rates
const rateCache = new Map<string, { rate: number; timestamp: number }>();

/**
 * Interface for currency formatting options
 */
interface FormatCurrencyOptions {
    locale?: string;
    showSymbol?: boolean;
    showCode?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}

/**
 * Interface for conversion options
 */
interface ConversionOptions {
    includeFees?: boolean;
    feePercentage?: number;
    bypassCache?: boolean;
}

/**
 * Interface for validation options
 */
interface ValidationOptions {
    checkLimits?: boolean;
    allowNegative?: boolean;
    customLimit?: number;
}

/**
 * Formats currency amount according to specified options
 * @param amount - The amount to format
 * @param currency - The currency code
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
    amount: number,
    currency: string,
    options: FormatCurrencyOptions = {}
): string {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
        throw new Error(`Unsupported currency: ${currency}`);
    }

    const {
        locale = 'en-US',
        showSymbol = true,
        showCode = false,
        minimumFractionDigits = DECIMAL_PLACES,
        maximumFractionDigits = DECIMAL_PLACES
    } = options;

    const formatter = new Intl.NumberFormat(locale, {
        style: showSymbol ? 'currency' : 'decimal',
        currency: currency === 'PI' ? 'USD' : currency,
        minimumFractionDigits,
        maximumFractionDigits
    });

    const formatted = formatter.format(amount);
    return currency === 'PI' 
        ? `${formatted.replace('$', '')} ${showCode ? 'PI' : 'π'}`
        : showCode ? `${formatted} ${currency}` : formatted;
}

/**
 * Converts Pi cryptocurrency to fiat currency
 * @param piAmount - Amount in Pi
 * @param targetCurrency - Target fiat currency
 * @param options - Conversion options
 * @returns Promise resolving to converted amount
 */
export async function convertPiToFiat(
    piAmount: number,
    targetCurrency: string,
    options: ConversionOptions = {}
): Promise<number> {
    if (!SUPPORTED_CURRENCIES.includes(targetCurrency) || targetCurrency === 'PI') {
        throw new Error(`Invalid target currency: ${targetCurrency}`);
    }

    const {
        includeFees = true,
        feePercentage = 0.1,
        bypassCache = false
    } = options;

    const cacheKey = `PI_${targetCurrency}`;
    const now = Date.now();
    let rate: number;

    if (!bypassCache && rateCache.has(cacheKey)) {
        const cached = rateCache.get(cacheKey)!;
        if (now - cached.timestamp < RATE_CACHE_DURATION) {
            rate = cached.rate;
        }
    }

    if (!rate) {
        rate = await exchangeRateService.getExchangeRate('PI', targetCurrency);
        rateCache.set(cacheKey, { rate, timestamp: now });
    }

    const conversion = new BigNumber(piAmount).multipliedBy(rate);
    
    if (includeFees) {
        const fee = conversion.multipliedBy(feePercentage / 100);
        return conversion.minus(fee).toNumber();
    }

    return conversion.toNumber();
}

/**
 * Converts fiat currency to Pi cryptocurrency
 * @param fiatAmount - Amount in fiat currency
 * @param sourceCurrency - Source fiat currency
 * @param options - Conversion options
 * @returns Promise resolving to converted Pi amount
 */
export async function convertFiatToPi(
    fiatAmount: number,
    sourceCurrency: string,
    options: ConversionOptions = {}
): Promise<number> {
    if (!SUPPORTED_CURRENCIES.includes(sourceCurrency) || sourceCurrency === 'PI') {
        throw new Error(`Invalid source currency: ${sourceCurrency}`);
    }

    const {
        includeFees = true,
        feePercentage = 0.1,
        bypassCache = false
    } = options;

    const cacheKey = `${sourceCurrency}_PI`;
    const now = Date.now();
    let rate: number;

    if (!bypassCache && rateCache.has(cacheKey)) {
        const cached = rateCache.get(cacheKey)!;
        if (now - cached.timestamp < RATE_CACHE_DURATION) {
            rate = cached.rate;
        }
    }

    if (!rate) {
        rate = await exchangeRateService.getExchangeRate(sourceCurrency, 'PI');
        rateCache.set(cacheKey, { rate, timestamp: now });
    }

    const conversion = new BigNumber(fiatAmount).multipliedBy(rate);
    
    if (includeFees) {
        const fee = conversion.multipliedBy(feePercentage / 100);
        return conversion.minus(fee).toNumber();
    }

    return conversion.toNumber();
}

/**
 * Validates currency amount according to specified rules
 * @param amount - Amount to validate
 * @param currency - Currency code
 * @param options - Validation options
 * @returns Validation result object
 */
export function validateAmount(
    amount: number,
    currency: string,
    options: ValidationOptions = {}
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const {
        checkLimits = true,
        allowNegative = false,
        customLimit
    } = options;

    // Check if currency is supported
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
        errors.push(`Unsupported currency: ${currency}`);
        return { isValid: false, errors };
    }

    // Check if amount is a valid number
    if (isNaN(amount) || !isFinite(amount)) {
        errors.push('Invalid amount: must be a valid number');
        return { isValid: false, errors };
    }

    // Check for negative amounts
    if (!allowNegative && amount < 0) {
        errors.push('Amount cannot be negative');
    }

    // Check decimal places
    const decimalPlaces = amount.toString().split('.')[1]?.length || 0;
    if (decimalPlaces > DECIMAL_PLACES) {
        errors.push(`Maximum ${DECIMAL_PLACES} decimal places allowed`);
    }

    // Check currency limits
    if (checkLimits) {
        const limit = customLimit || CURRENCY_LIMITS[currency as keyof typeof CURRENCY_LIMITS];
        if (Math.abs(amount) > limit) {
            errors.push(`Amount exceeds ${currency} limit of ${limit}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Clears the exchange rate cache
 * Useful for testing and manual cache invalidation
 */
export function clearRateCache(): void {
    rateCache.clear();
}