export function money(cents: bigint): string {
  return (Number(cents) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
