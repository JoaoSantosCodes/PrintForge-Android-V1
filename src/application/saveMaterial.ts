import type { Material } from '../core/types';
import { materialsRepository } from '../infrastructure/storage/LocalStorageRepository';

export type MaterialDraft = Omit<Material, 'id' | 'createdAt'>;

export function saveMaterial(draft: MaterialDraft): Material {
  const name = draft.name.trim();
  if (!name) throw new Error('Informe o nome do material.');
  if (draft.pricePerKg < 0 || draft.density <= 0) {
    throw new Error('Preço e densidade devem ser maiores que zero.');
  }

  const material: Material = {
    ...draft,
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
