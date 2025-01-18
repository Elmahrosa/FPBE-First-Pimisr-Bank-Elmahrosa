/**
 * @fileoverview Defines the spacing system for FPBE mobile banking application
 * Implements a 4px base unit scale with semantic naming for consistent layout
 * All values are immutable and type-safe
 */

/**
 * Base unit for the spacing system in pixels
 * All spacing values are multiples of this base unit
 */
const BASE_UNIT = 4;

/**
 * Valid spacing key types from XXS to XXL
 * Provides type safety for spacing constant usage
 */
export type SpacingKey = 'XXS' | 'XS' | 'SM' | 'MD' | 'LG' | 'XL' | 'XXL';

/**
 * Spacing constants following the design system specification
 * Values are in pixels and based on 4px increments
 * 
 * XXS = 4px  (1 * BASE_UNIT)
 * XS  = 8px  (2 * BASE_UNIT)
 * SM  = 16px (4 * BASE_UNIT)
 * MD  = 24px (6 * BASE_UNIT)
 * LG  = 32px (8 * BASE_UNIT)
 * XL  = 48px (12 * BASE_UNIT)
 * XXL = 64px (16 * BASE_UNIT)
 */
export const SPACING: Record<SpacingKey, number> = Object.freeze({
  XXS: BASE_UNIT,        // 4px
  XS: BASE_UNIT * 2,     // 8px
  SM: BASE_UNIT * 4,     // 16px
  MD: BASE_UNIT * 6,     // 24px
  LG: BASE_UNIT * 8,     // 32px
  XL: BASE_UNIT * 12,    // 48px
  XXL: BASE_UNIT * 16,   // 64px
});