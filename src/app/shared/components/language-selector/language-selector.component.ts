import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService, Language } from '../../../core/services/language.service';

/**
 * Brand Bible audit (2026-04-26 — AMK-77 backlog-executor sweep):
 *
 * Pre-migration state carried 30+ off-palette hex literals inherited from the
 * CreaDevents Tailwind template (#1f2937 / #f8fafc / #111827 / #4b5563 /
 * #f3f4f6 / #6b7280 / #f6efe6 / #b08968 / #f5e8d8). Every value violated the
 * Amarka 6-token Brand Bible palette and was brand-incompatible with the
 * dark-only B2B trade laser engraving design system.
 *
 * Component is currently un-imported across the app (zero consumers in
 * src/), but rather than delete and remove a future tool the owner may wire
 * up, the styles have been migrated 1:1 to the Amarka 6-token palette so the
 * dropdown will render on-brand the moment it is mounted.
 *
 * Mapping applied:
 *   #ffffff (light-theme bg)        -> var(--amarka-surface)  #484848
 *   #1f2937 (gray-800 dark surface) -> var(--amarka-surface)  #484848
 *   #111827 (gray-900 near-black)   -> var(--amarka-bg)        #181818
 *   #f8fafc / #f5e8d8 (paper text)  -> var(--amarka-text)      #f0f0f0
 *   #4b5563 / #6b7280 (gray text)   -> var(--amarka-text-secondary) #c0c0c0
 *   #f3f4f6 / #f6efe6 (hover bg)    -> var(--amarka-bg)        #181818
 *   #b08968 (legacy taupe accent)   -> var(--amarka-gold)      #906030
 * Dark-only palette: the light-theme `:host-context(.text-white)` branches
 * collapse to the same single dark Amarka surface — Amarka has no light
 * theme. All transitions reuse the AMK-62 motion tokens.
 */
@Component({
  selector: 'app-language-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-selector">
      <button
        type="button"
        (click)="toggleDropdown()"
        class="language-trigger"
        aria-haspopup="listbox"
        [attr.aria-expanded]="isOpen"
        [attr.aria-label]="'Language: ' + currentLanguage.name"
      >
        <span class="code">{{ currentLanguage.label }}</span>
        <svg class="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24" [class.rotate-180]="isOpen">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      @if (isOpen) {
        <div class="language-menu menu-surface">
          <ul role="listbox">
            @for (lang of languageService.languages; track lang.code) {
              <li>
                <button
                  type="button"
                  (click)="selectLanguage(lang.code)"
                  class="language-option"
                  [class.active]="lang.code === currentLanguage.code"
                >
                  <span class="code-badge">{{ lang.label }}</span>
                  <span class="name">{{ lang.name }}</span>
                </button>
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: inline-block;
    }

    .language-selector {
      position: relative;
      background: transparent;
    }

    /* Trigger pill — outlined gold ghost, matches Zone 3b nav-CTA pattern */
    .language-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.65rem;
      border-radius: 2px; /* Brand Bible button radius */
      border: 1px solid var(--amarka-gold);
      font-family: 'Source Sans 3', system-ui, sans-serif;
      font-weight: 600;
      letter-spacing: 0.04em;
      background: var(--amarka-surface);
      color: var(--amarka-text);
      transition:
        background-color var(--amarka-duration-base, 220ms) var(--amarka-ease-out, ease),
        color var(--amarka-duration-base, 220ms) var(--amarka-ease-out, ease),
        transform var(--amarka-duration-fast, 140ms) var(--amarka-ease-out, ease);
      cursor: pointer;
    }

    .language-trigger .code {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--amarka-text-secondary);
      line-height: 1;
    }

    .language-trigger .chevron {
      width: 0.875rem;
      height: 0.875rem;
      transition: transform var(--amarka-duration-fast, 140ms) var(--amarka-ease-out, ease);
      opacity: 0.75;
    }

    .language-trigger:hover {
      background: var(--amarka-gold);
      color: var(--amarka-text);
      transform: translateY(-1px);
    }

    .language-trigger:hover .code {
      color: var(--amarka-text);
    }

    .language-trigger:focus-visible {
      outline: 2px solid var(--amarka-gold);
      outline-offset: 2px;
    }

    /* Dropdown panel — sits on the page bg, gold rule above each option */
    .language-menu {
      position: absolute;
      right: 0;
      margin-top: 0.5rem;
      min-width: 12rem;
      border-radius: 2px;
      padding: 0.5rem 0;
      background: var(--amarka-surface);
      color: var(--amarka-text);
      border: 1px solid var(--amarka-gold);
      z-index: 40;
    }

    .language-menu ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .language-option {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.65rem 1rem;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--amarka-text);
      font-family: 'Source Sans 3', system-ui, sans-serif;
      transition:
        background-color var(--amarka-duration-fast, 140ms) var(--amarka-ease-out, ease),
        color var(--amarka-duration-fast, 140ms) var(--amarka-ease-out, ease);
      text-align: left;
    }

    .language-option:hover {
      background: var(--amarka-bg);
    }

    .language-option:focus-visible {
      outline: 2px solid var(--amarka-gold);
      outline-offset: -2px;
    }

    .language-option .code-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 2rem;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
      background: var(--amarka-bg);
      color: var(--amarka-text-muted);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .language-option .name {
      font-size: 0.875rem;
      font-weight: 500;
      color: inherit;
    }

    .language-option.active {
      background: var(--amarka-bg);
      color: var(--amarka-gold);
    }

    .language-option.active .code-badge {
      background: var(--amarka-gold);
      color: var(--amarka-text);
    }

    /*
     * Inverted-context branches retained for backwards compatibility with the
     * legacy .text-white host-context selector, but collapsed to the same
     * dark Amarka palette — the site has no light theme to invert against.
     */
    :host-context(.text-white) .language-trigger,
    :host-context(.text-white) .language-menu,
    :host-context(.text-white) .language-option {
      background: var(--amarka-surface);
      color: var(--amarka-text);
      border-color: var(--amarka-gold);
    }

    :host-context(.text-white) .language-trigger:hover,
    :host-context(.text-white) .language-option:hover {
      background: var(--amarka-bg);
    }

    :host-context(.text-white) .language-option.active {
      background: var(--amarka-bg);
      color: var(--amarka-gold);
    }

    :host-context(.text-white) .language-option.active .code-badge {
      background: var(--amarka-gold);
      color: var(--amarka-text);
    }
  `]
})
export class LanguageSelectorComponent {
  languageService = inject(LanguageService);
  isOpen = false;
  currentLanguage: { code: Language; label: string; name: string; flag: string };

  constructor() {
    // Initialize with current language from service
    const currentLang = this.languageService.getCurrentLanguage();
    const found = this.languageService.languages.find(l => l.code === currentLang);
    this.currentLanguage = found || this.languageService.languages[0];

    // Subscribe to language changes
    this.languageService.lang$.subscribe(lang => {
      const found = this.languageService.languages.find(l => l.code === lang);
      if (found) this.currentLanguage = found;
    });
  }

  toggleDropdown(): void {
    this.isOpen = !this.isOpen;
  }

  selectLanguage(code: Language): void {
    this.languageService.setLanguage(code);
    this.isOpen = false;
  }
}
