import { ProductTemplate, ProductView } from './product-catalog.types';
import { StudioLogo } from './studio-project.types';
import { productImageUrl } from './product-image-assets';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 1000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function colorizeProduct(image: HTMLImageElement, colorHex: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rgb = colorHex.replace('#', '').match(/.{2}/g)?.map(value => parseInt(value, 16)) ?? [138, 138, 138];

  for (let i = 0; i < pixels.data.length; i += 4) {
    if (!pixels.data[i + 3]) continue;
    pixels.data[i] = Math.round(pixels.data[i] * rgb[0] / 255);
    pixels.data[i + 1] = Math.round(pixels.data[i + 1] * rgb[1] / 255);
    pixels.data[i + 2] = Math.round(pixels.data[i + 2] * rgb[2] / 255);
  }
  ctx.putImageData(pixels, 0, 0);
  return canvas;
}

/**
 * Composites the product silhouette + all logos for one view onto an
 * offscreen canvas and returns it as a PNG File, ready to upload alongside
 * the rest of a design project's artwork. Runs entirely client-side.
 */
export async function generateMockupFile(
  product: ProductTemplate,
  view: ProductView,
  colorHex: string,
  logos: StudioLogo[]
): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const productImg = await loadImage(productImageUrl(view.silhouette));
  const coloredProduct = colorizeProduct(productImg, colorHex);
  const productSize = CANVAS_WIDTH;
  const productY = (CANVAS_HEIGHT - productSize) / 2;
  ctx.drawImage(coloredProduct, 0, productY, productSize, productSize);

  const viewLogos = logos.filter(l => l.viewId === view.id).sort((a, b) => a.zIndex - b.zIndex);

  for (const logo of viewLogos) {
    {
      const logoImg = await loadImage(logo.previewUrl);
      const w = (logo.widthPct / 100) * CANVAS_WIDTH;
      const h = (logo.heightPct / 100) * CANVAS_HEIGHT;
      const cx = (logo.xPct / 100) * CANVAS_WIDTH;
      const cy = (logo.yPct / 100) * CANVAS_HEIGHT;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((logo.rotation * Math.PI) / 180);
      ctx.scale(logo.flipH ? -1 : 1, logo.flipV ? -1 : 1);
      ctx.drawImage(logoImg, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Mockup export failed'))), 'image/png', 0.92);
  });

  return new File([blob], `mockup-${product.slug}-${view.id}.png`, { type: 'image/png' });
}
