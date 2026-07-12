import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandConfigService } from '../../services/brand-config.service';
import { SmartStickyNavDirective } from '../../../shared/smart-sticky-nav/smart-sticky-nav.directive';
import { AmkThemeService } from '../../../shared/amk-theme/amk-theme.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, SmartStickyNavDirective],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private brandConfig = inject(BrandConfigService);
  private platformId = inject(PLATFORM_ID);
  private themeService = inject(AmkThemeService);

  readonly brandName = this.brandConfig.siteName;
  readonly tagline = this.brandConfig.site.brand.tagline;
  readonly logoAlt = this.brandConfig.site.brand.logoAlt || this.brandName;
  readonly navLinks = this.brandConfig.nav.header;
  readonly scrolled = signal(false);

  readonly theme = this.themeService.theme;
  readonly logoSrc = this.themeService.logoSrc;

  @HostListener('window:scroll')
  onScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 8);
    }
  }
}
