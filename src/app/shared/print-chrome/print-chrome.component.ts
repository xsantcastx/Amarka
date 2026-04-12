/**
 * AMK-56: Print Chrome Component
 *
 * Renders a branded header and footer visible ONLY in @media print.
 * Hidden on screen via display:none; the _print.scss stylesheet
 * overrides to display:block in @media print.
 *
 * Content:
 *   Header — "AMARKA" + amarka.co
 *   Footer — "Amarka · Stamford, CT · diego@amarka.co · amarka.co"
 */
import { Component, ChangeDetectionStrategy } from '@angular/core';

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
      <p class="amarka-print-header__brand">Amarka</p>
      <p class="amarka-print-header__url">amarka.co</p>
    </div>
    <div class="amarka-print-footer">
      Amarka &middot; Stamford, CT &middot; diego&#64;amarka.co &middot; amarka.co
    </div>
  `
})
export class PrintChromeComponent {}
