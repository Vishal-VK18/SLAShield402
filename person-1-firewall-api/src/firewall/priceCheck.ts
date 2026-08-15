export function priceCheck(offerPrice: number, maxAllowedPrice: number = 0.05): { pass: boolean; reason?: string } {
  if (offerPrice > maxAllowedPrice) {
    return {
      pass: false,
      reason: `Price too high: Requested ${offerPrice} USDC, maximum threshold is ${maxAllowedPrice} USDC`,
    };
  }
  return { pass: true };
}