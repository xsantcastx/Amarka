import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  readonly brandName = this.brandConfig.siteName;
  readonly logoSrc = this.brandConfig.site.brand.logo;
  readonly logoAlt = this.brandConfig.site.brand.logoAlt || this.brandName;
  readonly navLinks = this.brandConfig.nav.header;
  readonly scrolled = signal(false);
  mobileOpen = false;

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled.set(window.scrollY > 8);
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  closeMobile() {
    this.mobileOpen = false;
  }
}
