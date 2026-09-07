/**
 * Conversão entre volume e massa de filamento.
 *
 * Existe porque o fatiador reporta as duas coisas, mas costuma mostrar o volume
 * primeiro — o Cura, o PrusaSlicer e o Bambu Studio exibem cm³ com destaque. Sem esta
 * conversão o usuário faz a multiplicação na mão antes de abrir o app.
 *
 * A densidade do filamento é dada em g/cm³ (PLA ≈ 1,24), então a relação é direta:
 * massa = volume × densidade.
 */

/** Densidade inválida não pode virar massa zero em silêncio — o preço sairia errado. */
function densityIsUsable(density: number): boolean {
  return Number.isFinite(density) && density > 0;
}

export function gramsFromVolume(volumeCm3: number, density: number): number {
  if (!densityIsUsable(density) || !Number.isFinite(volumeCm3) || volumeCm3 < 0) return 0;
  return volumeCm3 * density;
}

export function volumeFromGrams(grams: number, density: number): number {
  if (!densityIsUsable(density) || !Number.isFinite(grams) || grams < 0) return 0;
  return grams / density;
}

/**
 * Arredonda para exibição num campo de entrada.
 *
 * Duas casas bastam: a balança de bancada típica pesa em décimos de grama, e o
 * fatiador reporta volume com duas casas.
 */
export function roundForField(value: number): number {
  return Math.round(value * 100) / 100;
}
