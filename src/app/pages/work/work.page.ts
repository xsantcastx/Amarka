import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudioContentService } from '../../services/studio-content.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { CaseStudy } from '../../models/studio';

@Component({
  selector: 'app-work-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './work.page.html',
  styleUrl: './work.page.scss'
})
export class WorkPageComponent {
  private content = inject(StudioContentService);
  private analytics = inject(AnalyticsService);
  private seo = inject(SeoSchemaService);

  protected readonly activeFilter = signal<'all' | 'hospitality' | 'trade' | 'corporate' | 'architectural'>('all');
  protected readonly filters = ['all', 'hospitality', 'trade', 'corporate', 'architectural'] as const;
  protected caseStudies = signal<CaseStudy[]>([]);
  protected featured = signal<CaseStudy | null>(null);
  protected filteredCaseStudies = computed(() => {
    const filter = this.activeFilter();
    const items = this.caseStudies().filter(item => !item.featured);
    return filter === 'all' ? items : items.filter(item => item.clientType === filter);
  });

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Selected Engraving Work for Hospitality, Trade, and Corporate Clients | Amarka',
      description: 'View selected commissions from Amarka across hospitality, architectural signage, trade supply, and corporate environments in the NYC metro.',
      keywords: ['custom signage NYC trade', 'laser engraving portfolio NYC', 'architectural engraving hospitality'],
      path: '/work'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/work' });
    void this.load();
  }

  protected setFilter(filter: 'all' | 'hospitality' | 'trade' | 'corporate' | 'architectural') {
    this.activeFilter.set(filter);
    this.analytics.trackLeadEvent('case_study_filter_used', { filter });
  }

  private async load() {
    const items = await this.content.getCaseStudies();
    this.caseStudies.set(items);
    this.featured.set(items.find(item => item.featured) ?? null);
  }
}
