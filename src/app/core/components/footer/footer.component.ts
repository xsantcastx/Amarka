import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BrandConfigService } from '../../services/brand-config.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="studio-footer">
      <div class="page-container">
        <div class="studio-footer__surface">
          <div class="studio-footer__top">
            <div class="studio-footer__brand">
              <img [src]="brand.site.brand.logo" [alt]="brand.site.brand.logoAlt || brand.siteName" class="studio-footer__logo" />
              <div>
                <p class="studio-footer__name">{{ brand.siteName }}</p>
                <p class="studio-footer__tag">{{ brand.site.brand.description }}</p>
              </div>
            </div>
            <a routerLink="/enquire" class="btn-primary">Start a Commission</a>
          </div>

          <div class="studio-footer__grid">
            <div>
              <p class="studio-footer__eyebrow">Studio</p>
              <p class="studio-footer__text">Stamford, CT — serving the NYC metro trade.</p>
              <p class="studio-footer__text">5–10 business day turnaround on all commissions.</p>
            </div>
            <div>
              <p class="studio-footer__eyebrow">Navigate</p>
              <div class="studio-footer__links">
                @for (link of brand.nav.footer; track link.href) {
                <a [routerLink]="link.href">{{ link.label }}</a>
                }
              </div>
            </div>
            <div>
              <p class="studio-footer__eyebrow">Contact</p>
              <div class="studio-footer__links">
                <a [href]="'mailto:' + brand.site.contact.email">{{ brand.site.contact.email }}</a>
                @if (brand.site.contact.phone) {
                <a [href]="'tel:' + brand.site.contact.phone">{{ brand.site.contact.phone }}</a>
                }
                <span>{{ brand.site.contact.address }}</span>
              </div>
            </div>
          </div>

          <div class="studio-footer__bottom">
            <span>&copy; {{ currentYear }} {{ brand.siteName }}</span>
            <div class="studio-footer__links studio-footer__links--inline">
              <a routerLink="/privacy-policy">Privacy</a>
              <a routerLink="/terms">Terms</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  `,
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  protected brand = inject(BrandConfigService);
  protected currentYear = new Date().getFullYear();
}
