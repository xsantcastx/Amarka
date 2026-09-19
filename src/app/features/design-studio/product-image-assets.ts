import { SilhouetteId } from './product-catalog.types';

const PRODUCT_IMAGE_ROOT = '/assets/design-studio/products';

export function productImageUrl(silhouette: SilhouetteId): string {
  return `${PRODUCT_IMAGE_ROOT}/${silhouette}.webp`;
}

export function colorMatrixForHex(hex: string): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized.padEnd(6, '8').slice(0, 6);
  const channel = (offset: number) => parseInt(value.slice(offset, offset + 2), 16) / 255;

  return [
    `${channel(0)} 0 0 0 0`,
    `0 ${channel(2)} 0 0 0`,
    `0 0 ${channel(4)} 0 0`,
    '0 0 0 1 0',
  ].join(' ');
}
