import { Component, HostListener, inject, signal, ViewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BrandConfigService } from '../../services/brand-config.service';
import { MobileNavDrawerComponent } from '../../../shared/mobile-nav-drawer/mobile-nav-drawer.component';
import { SmartStickyNavDirective } from '../../../shared/smart-sticky-nav/smart-sticky-nav.directive';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MobileNavDrawerComponent, SmartStickyNavDirective],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private brandConfig = inject(BrandConfigService);
  private platformId = inject(PLATFORM_ID);

  /** AMK-65: Reference to the trade-optimized mobile nav drawer */
  @ViewChild(MobileNavDrawerComponent) private drawer?: MobileNavDrawerComponent;

  readonly brandName = this.brandConfig.siteName;
  readonly logoSrc = this.brandConfig.site.brand.logo;
  readonly logoAlt = this.brandConfig.site.brand.logoAlt || this.brandName;
  readonly navLinks = this.brandConfig.nav.header;
  readonly socialLinks = this.brandConfig.nav.social;
  readonly scrolled = signal(false);
  /** Tracks open state for hamburger animation (synced with drawer) */
  mobileOpen = false;

  @HostListener('window:scroll')
  onScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 8);
    }
  }

  toggleMobile(): void {
    if (this.mobileOpen) {
      this.drawer?.close();
      this.mobileOpen = false;
    } else {
      this.mobileOpen = true;
      this.drawer?.open();
    }
  }

  closeMobile(): void {
    this.drawer?.close();
    this.mobileOpen = false;
  }

  /** AMK-65: Handles drawer's own close events (Escape key, backdrop click) */
  onDrawerClosed(): void {
    this.mobileOpen = false;
  }
}
