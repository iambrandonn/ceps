export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
