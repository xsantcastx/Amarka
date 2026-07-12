/**
 * Product Customization Studio — catalog types.
 *
 * The entire editor/canvas/review pipeline is driven by ProductTemplate data.
 * No component in the studio ever references a specific product by name —
 * adding a new product means adding one entry to PRODUCT_CATALOG
 * (product-catalog.data.ts), not touching editor logic.
 *
 * viewerType is included now (always '2d' today) so a future 3D viewer can
 * be added per-product without a data-model migration.
 */

export type ProductCategory = 'apparel' | 'drinkware' | 'promo';

/** Which flat silhouette graphic a view renders. Shared across products of the same shape family. */
export type SilhouetteId =
  | 'shirt-front'
  | 'shirt-back'
  | 'polo-front'
  | 'polo-back'
  | 'hoodie-front'
  | 'hoodie-back'
  | 'longsleeve-front'
  | 'longsleeve-back'
  | 'sweatshirt-front'
  | 'sweatshirt-back'
  | 'sleeve-left'
  | 'sleeve-right'
  | 'mug-front'
  | 'mug-handle'
  | 'tumbler-wrap'
  | 'bottle-wrap'
  | 'hat-front'
  | 'tote-front'
  | 'tote-back';

export interface ProductColorOption {
  id: string;
  label: string;
  hex: string;
}

export interface ProductVariantOption {
  id: string;
  label: string;
}

export interface DesignAreaBoundary {
  /** All values are percentages (0-100) of the view's rendered box, so boundaries scale with any canvas size. */
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface ProductView {
  id: string;
  label: string;
  silhouette: SilhouetteId;
}

export interface ProductDesignArea {
  id: string;
  label: string;
  viewId: string;
  boundary: DesignAreaBoundary;
}

export interface ProductTemplate {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  variants: ProductVariantOption[];
  colors: ProductColorOption[];
  views: ProductView[];
  designAreas: ProductDesignArea[];
  /** Extensibility hook — always '2d' today; a 3D viewer can be added per-product later. */
  viewerType: '2d' | '3d';
  sortOrder: number;
}
