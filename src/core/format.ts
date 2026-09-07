/** Formatação para exibição. Sem React: são strings, não componentes. */

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
