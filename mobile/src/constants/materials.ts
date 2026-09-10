import type {
  MaterialCategory,
} from '../types/auth';

export type MaterialId = MaterialCategory;

export interface MaterialOption {
  id: MaterialId;
  label: string;
  icon: string;
}

export const MATERIAL_CATEGORIES: readonly MaterialOption[] = [
  {
    id: 'CRT',
    label: 'CRTs',
    icon: '📺',
  },
  {
    id: 'LCD',
    label: 'LCD Panels',
    icon: '🖥️',
  },
  {
    id: 'PCB',
    label: 'PCBs',
    icon: '🔌',
  },
  {
    id: 'Cable',
    label: 'Cables',
    icon: '🧵',
  },
  {
    id: 'Battery',
    label: 'Batteries',
    icon: '🔋',
  },
  {
    id: 'Motor',
    label: 'Motors',
    icon: '⚙️',
  },
  {
    id: 'Plastic',
    label: 'Mixed Plastics',
    icon: '♻️',
  },
];

export const VALID_MATERIAL_IDS: readonly MaterialId[] =
  MATERIAL_CATEGORIES.map(
    material => material.id,
  );

export function getMaterialCategory(
  id: string,
): MaterialOption | undefined {
  return MATERIAL_CATEGORIES.find(
    material => material.id === id,
  );
}

export function getMaterialLabel(
  id: string,
): string {
  return (
    getMaterialCategory(id)?.label ??
    id
  );
}

export function getMaterialIcon(
  id: string,
): string {
  return (
    getMaterialCategory(id)?.icon ??
    '♻️'
  );
}

export type {
  MaterialCategory,
};