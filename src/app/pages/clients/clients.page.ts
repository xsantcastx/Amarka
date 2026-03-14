import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudioContentService } from '../../services/studio-content.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { AudienceSection, AudienceType } from '../../models/studio';

@Component({
  selector: 'app-clients-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './clients.page.html',
  styleUrl: './clients.page.scss'
})
export class ClientsPageComponent {
  private content = inject(StudioContentService);
  private seo = inject(SeoSchemaService);
  protected sections = signal<AudienceSection[]>([]);

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Who We Work With: Designers, GCs, Hospitality, and Corporate Teams | Amarka',
      description: 'See how Amarka supports interior designers, general contractors, hospitality groups, and building operators with premium engraved fabrication.',
      keywords: ['laser engraving for interior designers NYC', 'hospitality signage supplier NYC', 'corporate engraved signage'],
      path: '/clients'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/clients' });
    void this.load();
  }

  private async load() {
    this.sections.set(await this.content.getAudienceSections());
  }

  protected clientIcon(type: AudienceType): string {
    const icons: Record<AudienceType, string> = {
      interior_designers: '◈',
      general_contractors: '◉',
      bars_restaurants: '◇',
      corporate_offices: '◆',
    };
    return icons[type] ?? '◈';
  }
}
