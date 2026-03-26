import { Component, HostListener, inject, signal, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandConfigService } from '../../services/brand-config.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private brandConfig = inject(BrandConfigService);
  private platformId = inject(PLATFORM_ID);

  readonly brandName = this.brandConfig.siteName;
  readonly logoSrc = this.brandConfig.site.brand.logo;
  readonly logoAlt = this.brandConfig.site.brand.logoAlt || this.brandName;
  readonly navLinks = this.brandConfig.nav.header;
  readonly socialLinks = this.brandConfig.nav.social;
  readonly scrolled = signal(false);
  mobileOpen = false;

  @HostListener('window:scroll')
  onScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 8);
    }
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = this.mobileOpen ? 'hidden' : '';
    }
  }

  closeMobile() {
    this.mobileOpen = false;
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }
}
