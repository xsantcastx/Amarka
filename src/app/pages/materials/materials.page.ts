import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoSchemaService } from '../../services/seo-schema.service';

@Component({
  selector: 'app-materials-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './materials.page.html',
  styleUrl: './materials.page.scss'
})
export class MaterialsPageComponent {
  private seo = inject(SeoSchemaService);

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Materials and Finishes | Amarka',
      description: 'Explore the materials and finishes Amarka uses for engraved signage, hospitality fitout, awards, and architectural elements.',
      keywords: ['engraved brass signage', 'laser engraved materials NYC', 'architectural finishes engraving'],
      path: '/materials'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/materials' });
  }
}
