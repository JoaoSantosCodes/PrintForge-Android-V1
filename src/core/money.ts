export function toCents(value: number): bigint {
  if (!Number.isFinite(value) || value < 0) return 0n;
  return BigInt(Math.round(value * 100));
}

export function fromCents(value: bigint): number {
  return Number(value) / 100;
}

export function money(value: number | bigint): string {
  const amount = typeof value === 'bigint' ? Number(value) / 100 : value;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
