import { ROUTE_SEO, normalizeSeoPath } from '../data/seo-routes';
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly translate = inject(TranslateService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = ROUTE_SEO[normalizeSeoPath(snapshot.url)]?.title ?? this.buildTitle(snapshot);
    if (title) {
      // Check if title contains a pipe separator (translation key format)
      if (title.includes(' | ')) {
        const parts = title.split(' | ');
        const siteName = parts[0];
        const pageKey = parts[1];
        
        // Check if it looks like a translation key (contains a dot)
        if (pageKey.includes('.')) {
          // Use instant translation if available, otherwise subscribe
          const translatedPage = this.translate.instant(pageKey);
          
          // If instant returns the key, try subscribing (language might not be loaded yet)
          if (translatedPage === pageKey) {
            this.translate.get(pageKey).subscribe((result: string) => {
              this.title.setTitle(`${siteName} | ${result}`);
            });
          } else {
            this.title.setTitle(`${siteName} | ${translatedPage}`);
          }
        } else {
          // Not a translation key, use as-is
          this.title.setTitle(title);
        }
      } else {
        this.title.setTitle(title);
      }
    }
  }
}
