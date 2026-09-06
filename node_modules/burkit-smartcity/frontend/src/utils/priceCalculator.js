/**
 * Price & Scale Calculator Utility for BurKIt SmartCity
 * Calculates user purchase value based on owner rate for 1 Kg / 1 Litre / unit scale.
 */

/**
 * Parses scale strings like '1Kg', '500g', '250g', '1 Litre', '500ml' into standardized units and numerical quantities.
 * @param {string} scaleStr - e.g. '1Kg', '500g', '1 Litre', '250ml'
 * @returns {{ value: number, unit: 'g'|'ml'|'count' } | null}
 */
export function parseScale(scaleStr) {
  if (!scaleStr || typeof scaleStr !== 'string') return null;
  const str = scaleStr.trim().toLowerCase();

  // Weight parsing (Grams / Kilograms)
  if (str.includes('kg')) {
    const val = parseFloat(str.replace('kg', '').trim());
    if (!isNaN(val)) return { value: val * 1000, unit: 'g' };
  }
  if (str.includes('g') && !str.includes('kg')) {
    const val = parseFloat(str.replace('g', '').trim());
    if (!isNaN(val)) return { value: val, unit: 'g' };
  }

  // Volume parsing (Milliliters / Litres)
  if (str.includes('litre') || str.includes('liter') || str.includes('lit') || str.includes('l')) {
    if (!str.includes('ml')) {
      const val = parseFloat(str.replace(/litre|liter|lit|l/gi, '').trim());
      if (!isNaN(val)) return { value: val * 1000, unit: 'ml' };
    }
  }
  if (str.includes('ml')) {
    const val = parseFloat(str.replace('ml', '').trim());
    if (!isNaN(val)) return { value: val, unit: 'ml' };
  }

  // Count parsing (Pcs / Packets / Sets)
  const val = parseFloat(str);
  if (!isNaN(val) && val > 0) {
    return { value: val, unit: 'count' };
  }

  return null;
}

/**
 * Calculates scaled purchase price for a chosen target scale.
 * 
 * Formula: 
 *   Rate per unit (g/ml) = Base Price / Base Quantity
 *   Purchase Price = Rate per unit * Target Quantity
 *
 * @param {number|string} basePrice - Owner set rate (e.g. 120)
 * @param {string} baseUnitScale - Owner unit scale (e.g. '1Kg', '1 Litre', '500g')
 * @param {string} targetScale - User selected scale (e.g. '250g', '500ml', '2Kg')
 * @returns {number} Calculated purchase price rounded to nearest integer (or 2 decimal places if fractional)
 */
export function calculateScaledPrice(basePrice, baseUnitScale = '1Kg', targetScale) {
  const basePriceNum = Number(basePrice) || 0;
  if (basePriceNum <= 0 || !targetScale) return basePriceNum;

  const baseParsed = parseScale(baseUnitScale || '1Kg');
  const targetParsed = parseScale(targetScale);

  if (baseParsed && targetParsed && baseParsed.unit === targetParsed.unit && baseParsed.value > 0) {
    const calculated = (basePriceNum / baseParsed.value) * targetParsed.value;
    return Math.round(calculated);
  }

  return basePriceNum;
}

/**
 * Calculates quantity received when user inputs a custom purchase amount in Rupees.
 * 
 * Formula:
 *   Quantity = (Rupees Amount / Base Price) * Base Quantity
 *
 * @param {number|string} customAmount - Rupees entered by user (e.g. 50)
 * @param {number|string} basePrice - Owner set rate (e.g. 120)
 * @param {string} baseUnitScale - Owner unit scale (e.g. '1Kg')
 * @returns {string} Human readable formatted quantity (e.g. "417g" or "278ml")
 */
export function calculateQuantityFromAmount(customAmount, basePrice, baseUnitScale = '1Kg') {
  const amt = Number(customAmount) || 0;
  const price = Number(basePrice) || 0;
  if (amt <= 0 || price <= 0) return '';

  const baseParsed = parseScale(baseUnitScale || '1Kg');
  if (!baseParsed || baseParsed.value <= 0) return '';

  const targetValue = (amt / price) * baseParsed.value;

  if (baseParsed.unit === 'g') {
    if (targetValue >= 1000) {
      return `${(targetValue / 1000).toFixed(2).replace(/\.00$/, '')} Kg`;
    }
    return `${Math.round(targetValue)}g`;
  }

  if (baseParsed.unit === 'ml') {
    if (targetValue >= 1000) {
      return `${(targetValue / 1000).toFixed(2).replace(/\.00$/, '')} Litre`;
    }
    return `${Math.round(targetValue)}ml`;
  }

  return `${Math.round(targetValue)} Pcs`;
}
