/**
 * AMK-58 — Vertical-specific landing page component
 *
 * One component renders any of the SERVICE_VERTICALS via :slug route param.
 * Sets per-vertical SEO meta + LocalBusiness JSON-LD + Service JSON-LD.
 *
 * Brand Bible compliance:
 *   - Stamford, CT only (no NYC)
 *   - Six approved palette colors via CSS variables
 *   - Source Sans 3 + Playfair Display
 *   - Products from approved catalog only
 *
 * Accessibility:
 *   - Single H1 per page
 *   - Focus-visible states inherited from global CSS
 *   - prefers-reduced-motion honoured by global tokens
 */

import { Component, computed, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { SeoSchemaService } from '../../services/seo-schema.service';
import {
  findVerticalBySlug,
  VerticalLandingContent,
  SERVICE_VERTICAL_SLUGS
} from './service-vertical.data';

@Component({
  selector: 'app-service-vertical-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './service-vertical.page.html',
  styleUrl: './service-vertical.page.scss'
})
export class ServiceVerticalPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(SeoSchemaService);

  /**
   * Resolves the vertical content from the :slug route param. When the slug
   * does not match an approved vertical we redirect to /services rather than
   * render an empty shell — this avoids serving a thin page to crawlers.
   */
  protected vertical: Signal<VerticalLandingContent | undefined> = toSignal(
    this.route.paramMap.pipe(map(params => {
      const slug = params.get('slug');
      const found = findVerticalBySlug(slug);
      if (!found) {
        // Defer navigation so we don't router-redirect during change detection.
        queueMicrotask(() => void this.router.navigate(['/services']));
        return undefined;
      }
      this.applySeo(found);
      return found;
    })),
    { initialValue: undefined }
  );

  protected get availableSlugs(): ReadonlyArray<string> {
    return SERVICE_VERTICAL_SLUGS;
  }

  protected substrateChips = computed(() => this.vertical()?.substrates ?? []);

  private applySeo(v: VerticalLandingContent): void {
    const path = `/services/${v.slug}`;
    this.seo.setupMarketingPageSEO({
      title: v.seoTitle,
      description: v.seoDescription,
      keywords: v.seoKeywords,
      path
    });
    this.seo.generateLocalBusinessSchema({
      pagePath: path,
      description: v.seoDescription
    });
  }
}
