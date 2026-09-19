import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { SilhouetteId } from '../product-catalog.types';
import { colorMatrixForHex, productImageUrl } from '../product-image-assets';

let nextFilterId = 0;

/**
 * Renders a photorealistic product cutout and applies the selected color while
 * preserving the source photograph's highlights, seams, texture, and shadows.
 */
@Component({
  selector: 'amk-product-silhouette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="amk-silhouette" viewBox="0 0 1024 1024" aria-hidden="true" focusable="false">
      <defs>
        <filter [attr.id]="filterId" color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" [attr.values]="colorMatrix()" />
        </filter>
      </defs>
      <image
        [attr.href]="assetUrl()"
        width="1024"
        height="1024"
        preserveAspectRatio="xMidYMid meet"
        [attr.filter]="'url(#' + filterId + ')'" />
    </svg>
  `,
  styleUrl: './product-silhouette.component.scss'
})
export class ProductSilhouetteComponent {
  protected readonly filterId = `amk-product-color-${nextFilterId++}`;
  private silhouetteSig = signal<SilhouetteId>('shirt-front');
  private colorSig = signal('#8a8a8a');

  @Input({ required: true }) set silhouette(value: SilhouetteId) {
    this.silhouetteSig.set(value);
  }
  @Input() set colorHex(value: string) {
    this.colorSig.set(value || '#8a8a8a');
  }

  protected assetUrl = computed(() => productImageUrl(this.silhouetteSig()));
  protected colorMatrix = computed(() => colorMatrixForHex(this.colorSig()));
}
