import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CollectionsService, CollectionDoc } from '../../services/collections.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { BrandConfigService } from '../../core/services/brand-config.service';

@Component({
  selector: 'app-collections-index',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, PageHeaderComponent],
  templateUrl: './collections-index.page.html',
  styleUrls: ['./collections-index.page.scss']
})
export class CollectionsIndexPageComponent implements OnInit, OnDestroy {
  private collectionsService = inject(CollectionsService);
  private cdr = inject(ChangeDetectorRef);
  private seoService = inject(SeoSchemaService);
  private brandConfig = inject(BrandConfigService);

  collections: CollectionDoc[] = [];
  isLoading = true;

  async ngOnInit() {
    this.applySeo();
    await this.loadCollections();
  }

  ngOnDestroy(): void {
    this.seoService.removeAllSchemas();
  }

  private applySeo(): void {
    const siteUrl = this.brandConfig.siteUrl;
    const siteName = this.brandConfig.siteName;
    this.seoService.setTitle(`Product Collections — Laser Engraved Signage & Awards | ${siteName}`);
    this.seoService.setMetaDescription(
      `Browse Amarka's product collections — architectural signage, wayfinding systems, donor walls, custom awards, and hospitality engraving. Precision laser work for trade professionals.`
    );
    this.seoService.setMetaKeywords(
      'laser engraved signage, architectural panels, wayfinding systems, donor walls, custom awards, hospitality signage, trade engraving'
    );
    this.seoService.setCanonicalUrl(`${siteUrl}/collections`);
    this.seoService.generateBreadcrumbSchema([
      { name: 'Home', url: siteUrl },
      { name: 'Collections', url: `${siteUrl}/collections` }
    ]);
  }

  private async loadCollections() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      const all = await this.collectionsService.getAllCollections();
      this.collections = all
        .filter(c => c.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      this.cdr.detectChanges();
    } catch (err) {
      void 0;
      this.collections = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
