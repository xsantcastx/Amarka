import { ProductTemplate, ProductView } from './product-catalog.types';
import { StudioLogo } from './studio-project.types';
import { silhouetteSvgMarkup } from './silhouette-svg.util';

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

  const svgMarkup = silhouetteSvgMarkup(view.silhouette, colorHex);
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgMarkup)))}`;
  const silhouetteImg = await loadImage(svgDataUrl);
  ctx.drawImage(silhouetteImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
