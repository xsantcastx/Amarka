import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SilhouetteId } from '../product-catalog.types';
import { silhouetteSvgMarkup } from '../silhouette-svg.util';

/**
 * Renders a flat, recolorable silhouette for a product view.
 *
 * The SVG markup comes from silhouette-svg.util.ts — the same source the
 * mockup generator composites onto its offscreen canvas — so the editor
 * preview and the generated quote mockups can never drift apart.
 *
 * These are intentionally simple flat-vector placeholders (per the "use
 * placeholders for now" decision) — swap in real product photography later
 * by changing silhouette handling here; no other studio code needs to change.
 */
@Component({
  selector: 'amk-product-silhouette',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="amk-silhouette" [innerHTML]="svg()"></div>`,
  styleUrl: './product-silhouette.component.scss'
})
export class ProductSilhouetteComponent {
  private sanitizer = inject(DomSanitizer);

  private silhouetteSig = signal<SilhouetteId>('shirt-front');
  private colorSig = signal('#8a8a8a');

  @Input({ required: true }) set silhouette(value: SilhouetteId) {
    this.silhouetteSig.set(value);
  }
  @Input() set colorHex(value: string) {
    this.colorSig.set(value || '#8a8a8a');
  }

  // Markup is our own static SVG with the color hex interpolated — safe to trust.
  protected svg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(silhouetteSvgMarkup(this.silhouetteSig(), this.colorSig()))
  );
}
