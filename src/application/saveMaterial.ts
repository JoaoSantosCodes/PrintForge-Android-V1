import { safeExternalUrl } from '../core/link';
import type { Material } from '../core/types';
import { materialsRepository } from '../infrastructure/storage/LocalStorageRepository';

export type MaterialDraft = Omit<Material, 'id' | 'createdAt'>;

export function saveMaterial(draft: MaterialDraft): Material {
  const name = draft.name.trim();
  if (!name) throw new Error('Informe o nome do material.');
  if (draft.pricePerKg < 0 || draft.density <= 0) {
    throw new Error('Preço e densidade devem ser maiores que zero.');
  }

  // O link e opcional; digitado, precisa ser um endereco de site de verdade. Validar
  // aqui, e nao na tela, mantem a regra num lugar so — e e ela que impede um
  // `javascript:` de chegar ao `href` do cartao.
  let purchaseUrl: string | undefined;
  if (draft.purchaseUrl && draft.purchaseUrl.trim() !== '') {
    const conferido = safeExternalUrl(draft.purchaseUrl);
    if (!conferido.ok) throw new Error(`Link de compra: ${conferido.reason}`);
    purchaseUrl = conferido.url;
  }

  const material: Material = {
    ...draft,
    purchaseUrl,
    name,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  materialsRepository.set([...materialsRepository.get(), material]);
  return material;
}

export function deleteMaterial(id: string): void {
  materialsRepository.set(materialsRepository.get().filter((material) => material.id !== id));
}
