/** A logo placed on the canvas, mid-edit. Persisted to localStorage as part of a StudioProject. */
export interface StudioLogo {
  /** Local editor id — stable across duplicates of the same uploaded artwork. */
  id: string;
  /** Firebase Storage path once uploaded (set as soon as the file is added, so it survives a reload). */
  storagePath: string;
  originalName: string;
  /** Download URL used to render the image in the canvas. */
  previewUrl: string;
  viewId: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  zIndex: number;
  locked: boolean;
}

export interface StudioProject {
  id: string;
  name: string;
  productId: string;
  variantId: string;
  colorId: string;
  quantity: number;
  logos: StudioLogo[];
  createdAt: string;
  updatedAt: string;
}

export interface StudioProjectIndexEntry {
  id: string;
  name: string;
  productId: string;
  colorHex: string;
  updatedAt: string;
}
