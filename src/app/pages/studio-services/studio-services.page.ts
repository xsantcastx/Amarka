import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudioContentService } from '../../services/studio-content.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { ServiceCommission } from '../../models/studio';

@Component({
  selector: 'app-studio-services-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './studio-services.page.html',
  styleUrl: './studio-services.page.scss'
})
export class StudioServicesPageComponent {
  private content = inject(StudioContentService);
  private seo = inject(SeoSchemaService);
  protected services = signal<ServiceCommission[]>([]);

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Architectural Signage, Hospitality Fitout, and Trade Supply Services | Amarka',
      description: 'Commission architectural signage systems, custom bar fitout elements, trade supply, awards, and bespoke engraved architectural accents for Connecticut and tri-state projects.',
      keywords: ['FF&E laser engraving supplier Connecticut', 'custom bar signage Connecticut', 'architectural signage systems Connecticut'],
      path: '/services'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/services' });
    void this.load();
  }

  private async load() {
    this.services.set(await this.content.getServices());
  }
}
