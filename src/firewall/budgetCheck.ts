export function budgetCheck(offerPrice: number, budgetLeft: number): { pass: boolean; reason?: string } {
  if (offerPrice > budgetLeft) {
    return {
      pass: false,
      reason: `Budget exceeded: Offer price (${offerPrice}) is greater than budget left (${budgetLeft})`,
    };
  }
  return { pass: true };
}
