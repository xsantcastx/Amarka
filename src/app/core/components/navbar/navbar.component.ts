import { Component, HostListener, inject, PLATFORM_ID, EventEmitter, Output, OnInit, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';
import { SettingsService, AppSettings } from '../../../services/settings.service';
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component';
import { TranslateModule } from '@ngx-translate/core';
import { BrandConfigService } from '../../services/brand-config.service';
import { CollectionsService, CollectionDoc } from '../../../services/collections.service';

type NavChild = { label: string; href: string; description?: string };
type NavLink = { label: string; href: string; exact?: boolean; children?: NavChild[]; ctaLabel?: string; ctaHref?: string };

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LanguageSelectorComponent, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  @Output() toggleCart = new EventEmitter<void>();

  private platformId = inject(PLATFORM_ID);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly brandConfig = inject(BrandConfigService);
  private readonly collectionsService = inject(CollectionsService);
  
  scrolled = signal(false);
  mobileOpen = false;
  showUserMenu = false;
  
  // Social media URLs from settings
  facebookUrl = '';
  twitterUrl = '';
  instagramUrl = '';
  linkedinUrl = '';
  youtubeUrl = '';
  
  // Auth state
  user$ = this.authService.user$;
  userProfile$ = this.authService.userProfile$;

  brandName = this.brandConfig.siteName;
  logoSrc = this.brandConfig.site.brand.logo;
  logoAlt = this.brandConfig.site.brand.logoAlt || this.brandName;
  readonly headerLinks = this.brandConfig.nav.header as NavLink[];
  collectionLinks: NavChild[] = [];
  collections: CollectionDoc[] = [];
  readonly exactMatchOption = { exact: true };
  readonly partialMatchOption = { exact: false };

  readonly totalItems = toSignal(
    this.cartService.count$,
    { initialValue: 0 }
  ) as () => number;

  constructor() {
    // Subscribe to settings in constructor (injection context)
    this.settingsService.settings$
      .pipe(takeUntilDestroyed())
      .subscribe(settings => this.applySettings(settings));
  }

  ngOnInit() {
    // Set initial scroll state
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 8);
    }
    
    // Load settings
    this.settingsService.getSettings().then(settings => this.applySettings(settings));

    // Load dynamic collections for dropdown
    void this.loadCollections();
  }

  private applySettings(settings: AppSettings): void {
    this.brandName = settings.siteName || this.brandName;
    this.logoSrc = settings.brandLogo || this.logoSrc;
    this.logoAlt = this.brandName;
    this.facebookUrl = settings.facebookUrl || '';
    this.twitterUrl = settings.twitterUrl || '';
    this.instagramUrl = settings.instagramUrl || '';
    this.linkedinUrl = settings.linkedinUrl || '';
    this.youtubeUrl = settings.youtubeUrl || '';
  }

  private async loadCollections() {
    try {
      const all = await this.collectionsService.getAllCollections();
      const active = all.filter(c => c.active !== false);
      this.collections = active;
      this.collectionLinks = active
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 6)
        .map(c => ({ label: c.name, href: `/collections/${c.slug}` }));
    } catch (error) {
      console.error('Error loading collections for navbar:', error);
      this.collectionLinks = [];
      this.collections = [];
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    // Only run in browser to avoid SSR issues
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 8);
    }
  }

  // Close user menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    // Don't close if clicking on the profile button or its children
    if (!target.closest('.app-navbar__profile')) {
      this.showUserMenu = false;
    }
  }

  // ESC to close user menu
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.showUserMenu = false;
      this.mobileOpen = false;
    }
  }

  activarCarrito(): void {
    this.toggleCart.emit();
  }

  closeMobile() {
    this.mobileOpen = false;
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  goToSearch(term: string): void {
    const query = (term || '').trim();
    if (!query) return;
    this.mobileOpen = false;
    // Use productos route for search results
    window.location.href = `/productos?search=${encodeURIComponent(query)}`;
  }

  // User menu controls
  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    console.log('Closing user menu');
    this.showUserMenu = false;
  }

  // Auth methods
  async logout(): Promise<void> {
    console.log('Logging out user');
    await this.authService.signOutUser('/client/login');
    this.closeMobile();
    this.closeUserMenu();
  }
}
