/**
 * AMK-56: Print Chrome Component
 *
 * Renders a branded header and footer visible ONLY in @media print.
 * Hidden on screen via display:none; the _print.scss stylesheet
 * overrides to display:block in @media print.
 *
 * Content:
 *   Header — "AMARKA" + amarka.co
 *   Footer — Brand, service area, contact email, and domain from shared config
 */
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { BrandConfigService } from '../../core/services/brand-config.service';

@Component({
  selector: 'amarka-print-chrome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: none;         /* Hidden on screen */
    }
  `],
  template: `
    <div class="amarka-print-header">
      <p class="amarka-print-header__brand">{{ brand.siteName }}</p>
      <p class="amarka-print-header__url">{{ brand.site.brand.domain }}</p>
    </div>
    <div class="amarka-print-footer">
      {{ brand.siteName }} &middot; Serving {{ brand.site.studio?.serviceArea }} &middot;
      {{ brand.site.contact.email }} &middot; {{ brand.site.brand.domain }}
    </div>
  `
})
export class PrintChromeComponent {
  protected readonly brand = inject(BrandConfigService);
}
