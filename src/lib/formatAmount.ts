/**
 * Formats an amount string to include dollar sign and commas
 * Handles various input formats like "1000000", "$1000000", "1000000.00", etc.
 */
export function formatAmount(amount: string | undefined | null): string {
  if (!amount) return '';
  
  // Remove any existing dollar signs, commas, and spaces
  let cleaned = amount.toString().replace(/[\$, ]/g, '');
  
  // Try to extract numeric value
  const numericMatch = cleaned.match(/[\d.]+/);
  if (!numericMatch) return amount; // Return original if no numbers found
  
  const numericValue = parseFloat(numericMatch[0]);
  if (isNaN(numericValue)) return amount; // Return original if not a valid number
  
  // Format with commas and dollar sign
  return `$${numericValue.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
}


