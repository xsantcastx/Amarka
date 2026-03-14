import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoSchemaService } from '../../services/seo-schema.service';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss'
})
export class AboutPageComponent {
  private seo = inject(SeoSchemaService);

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'About the Studio | Amarka',
      description: 'Learn about Amarka, the Stamford, CT laser engraving studio serving designers, contractors, and hospitality teams across the NYC metro.',
      keywords: ['laser engraving studio Stamford CT', 'NYC metro engraving studio', 'architectural engraving partner'],
      path: '/about'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/about' });
  }
}
