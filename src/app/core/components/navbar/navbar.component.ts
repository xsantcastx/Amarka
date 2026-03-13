import { Component, HostListener, inject, PLATFORM_ID, EventEmitter, Output, OnInit, OnDestroy, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, distinctUntilChanged, switchMap, of, from } from 'rxjs';
import { CartService } from '../../../services/cart.service';
import { AuthService } from '../../../services/auth.service';
import { SettingsService, AppSettings } from '../../../services/settings.service';
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component';
import { TranslateModule } from '@ngx-translate/core';
import { BrandConfigService } from '../../services/brand-config.service';
import { CollectionsService, CollectionDoc } from '../../../services/collections.service';
import { Firestore, collection, query, where, orderBy, limit, getDocs } from '@angular/fire/firestore';
import { Product } from '../../../models/catalog';

type NavChild = { label: string; href: string; description?: string };
type NavLink = { label: string; href: string; exact?: boolean; children?: NavChild[]; ctaLabel?: string; ctaHref?: string };
type SearchResult = { id: string; name: string; slug: string; coverImage?: string; shortDescription?: string; price?: number };

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LanguageSelectorComponent, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Output() toggleCart = new EventEmitter<void>();

  private platformId = inject(PLATFORM_ID);
  private readonly cartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);
  private readonly brandConfig = inject(BrandConfigService);
  private readonly collectionsService = inject(CollectionsService);
  private readonly firestore = inject(Firestore);
  private readonly cdr = inject(ChangeDetectorRef);

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
  navLinks: NavLink[] = [];
  collectionLinks: NavChild[] = [];
  collections: CollectionDoc[] = [];
  readonly exactMatchOption = { exact: true };
  readonly partialMatchOption = { exact: false };

  // Rotation state — signal-driven, no navLinks array replacement
  rotatingPlaceholderIdx = -1;
  rotatingLink = signal<NavLink | null>(null);
  rotatingState = signal<'stable' | 'exiting' | 'entering'>('stable');
  private rotateTimer: any = null;
  private rotateIndex = 0;
  private rotationPaused = false;
  private resumeTimer: any = null;

  // Search state
  private readonly searchQuery$ = new Subject<string>();
  searchResults = signal<SearchResult[]>([]);
  searchLoading = signal(false);
  showSearchDropdown = signal(false);
  searchActiveIndex = signal(-1);
  private searchCache: { products: SearchResult[]; loadedAt: number } | null = null;

  readonly totalItems = toSignal(
    this.cartService.count$,
    { initialValue: 0 }
  ) as () => number;

  constructor() {
    this.settingsService.settings$
      .pipe(takeUntilDestroyed())
      .subscribe(settings => this.applySettings(settings));

    // Search: debounce input → local cache filter
    this.searchQuery$.pipe(
      takeUntilDestroyed(),
      debounceTime(220),
      distinctUntilChanged(),
      switchMap(term => {
        const t = term.trim();
        if (t.length < 2) {
          this.searchResults.set([]);
          this.searchLoading.set(false);
          return of([] as SearchResult[]);
        }
        this.searchLoading.set(true);
        return from(this.fetchSearchResults(t));
      })
    ).subscribe(results => {
      this.searchResults.set(results);
      this.searchLoading.set(false);
      this.searchActiveIndex.set(-1);
    });
  }

  ngOnInit() {
    this.navLinks = this.headerLinks.map(link => ({ ...link }));

    // Identify which slot in the nav rotates (the "gifts for men" placeholder or first collections link)
    this.rotatingPlaceholderIdx = this.navLinks.findIndex(
      l => l.href === '/collections/gifts-for-men' || l.label?.toLowerCase() === 'gifts for men'
    );

    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 8);
    }

    this.settingsService.getSettings().then(settings => this.applySettings(settings));
    void this.loadCollections();
  }

  ngOnDestroy() {
    if (this.rotateTimer) clearInterval(this.rotateTimer);
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
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

      this.startCollectionRotation();
    } catch {
      this.collectionLinks = [];
      this.collections = [];
    }
  }

  private startCollectionRotation() {
    if (!this.collections.length) return;

    this.rotateIndex = 0;
    queueMicrotask(() => {
      this.rotatingLink.set({
        label: this.collections[0].name,
        href: `/collections/${this.collections[0].slug}`
      });
    });

    if (this.rotateTimer) clearInterval(this.rotateTimer);
    this.rotateTimer = setInterval(() => {
      if (this.rotationPaused) return;
      this.doRotate();
    }, 6000);
  }

  private doRotate() {
    // Phase 1: slide out current label
    this.rotatingState.set('exiting');
    setTimeout(() => {
      // Phase 2: swap content + play enter animation
      this.rotateIndex = (this.rotateIndex + 1) % this.collections.length;
      const col = this.collections[this.rotateIndex];
      this.rotatingLink.set({ label: col.name, href: `/collections/${col.slug}` });
      this.rotatingState.set('entering');
      // Phase 3: settle to stable
      setTimeout(() => this.rotatingState.set('stable'), 320);
    }, 260);
  }

  pauseRotation() {
    this.rotationPaused = true;
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
  }

  resumeRotation() {
    if (this.resumeTimer) clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      this.rotationPaused = false;
    }, 1500);
  }

  isRotatingSlot(idx: number): boolean {
    return idx === this.rotatingPlaceholderIdx && this.rotatingLink() !== null;
  }

  // --- Search ---

  private async fetchSearchResults(term: string): Promise<SearchResult[]> {
    try {
      // Warm or use cache (valid for 5 min)
      if (!this.searchCache || Date.now() - this.searchCache.loadedAt > 5 * 60 * 1000) {
        const col = collection(this.firestore, 'products');
        const q = query(col, where('status', '==', 'published'), orderBy('name'), limit(60));
        const snap = await getDocs(q);
        this.searchCache = {
          products: snap.docs.map(d => {
            const data = d.data() as Product;
            const price = data.variants?.[0]?.price ?? undefined;
            return {
              id: d.id,
              name: data.name,
              slug: data.slug,
              coverImage: data.coverImage?.startsWith('http') ? data.coverImage : undefined,
              shortDescription: data.shortDescription,
              price: price ?? undefined
            };
          }),
          loadedAt: Date.now()
        };
      }

      const lower = term.toLowerCase();
      return this.searchCache.products
        .filter(p => p.name.toLowerCase().includes(lower))
        .slice(0, 5);
    } catch {
      return [];
    }
  }

  onSearchInput(value: string) {
    const t = value.trim();
    if (t.length === 0) {
      this.showSearchDropdown.set(false);
      this.searchResults.set([]);
    } else {
      this.showSearchDropdown.set(true);
    }
    this.searchQuery$.next(value);
  }

  onSearchFocus(value: string) {
    if (value.trim().length >= 2 && this.searchResults().length > 0) {
      this.showSearchDropdown.set(true);
    }
  }

  closeSearchDropdown() {
    setTimeout(() => {
      this.showSearchDropdown.set(false);
      this.searchActiveIndex.set(-1);
    }, 180);
  }

  onSearchKeydown(event: KeyboardEvent, inputEl: HTMLInputElement) {
    const results = this.searchResults();
    const idx = this.searchActiveIndex();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.searchActiveIndex.set(Math.min(idx + 1, results.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.searchActiveIndex.set(Math.max(idx - 1, -1));
        break;
      case 'Enter':
        if (idx >= 0 && results[idx]) {
          this.navigateToProduct(results[idx]);
          inputEl.value = '';
          this.showSearchDropdown.set(false);
        } else {
          this.goToSearch(inputEl.value);
          inputEl.value = '';
        }
        break;
      case 'Escape':
        this.showSearchDropdown.set(false);
        inputEl.blur();
        break;
    }
  }

  navigateToProduct(result: SearchResult) {
    this.showSearchDropdown.set(false);
    window.location.href = `/productos/${result.slug}`;
  }

  @HostListener('window:scroll')
  onScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.scrolled.set(window.scrollY > 8);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.app-navbar__profile')) {
      this.showUserMenu = false;
    }
    if (!target.closest('.app-navbar__search-wrap')) {
      this.showSearchDropdown.set(false);
    }
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.showUserMenu = false;
      this.mobileOpen = false;
      this.showSearchDropdown.set(false);
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
    const q = (term || '').trim();
    if (!q) return;
    this.mobileOpen = false;
    window.location.href = `/productos?search=${encodeURIComponent(q)}`;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  async logout(): Promise<void> {
    await this.authService.signOutUser('/client/login');
    this.closeMobile();
    this.closeUserMenu();
  }
}
