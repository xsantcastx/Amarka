import { Component, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BrandConfigService } from '../../services/brand-config.service';
import { AmkThemeService } from '../../../shared/amk-theme/amk-theme.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
  protected brand = inject(BrandConfigService);
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(AmkThemeService);
  protected currentYear = new Date().getFullYear();
  protected socialLinks = this.brand.nav.social;
  protected theme = this.themeService.theme;
  protected logoSrc = this.themeService.logoSrc;

  protected scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}
