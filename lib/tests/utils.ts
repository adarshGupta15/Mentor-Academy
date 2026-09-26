export function percentageValue(obtained: number, max: number) {
  if (!max || max <= 0) return 0;
  return Number(((obtained / max) * 100).toFixed(2));
}
