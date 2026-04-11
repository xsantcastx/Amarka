import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoSchemaService } from '../../services/seo-schema.service';

interface Material {
  name: string;
  description: string;
}

interface ProcessStep {
  step: string;
  title: string;
  description: string;
}

interface StudioValue {
  title: string;
  description: string;
}

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss'
})
export class AboutPageComponent {
  private seo = inject(SeoSchemaService);

  materials: Material[] = [
    { name: 'Brass', description: 'Aged, polished, or brushed — the signature material for luxury signage and architectural detailing.' },
    { name: 'Aluminium', description: 'Powder-coated or anodised finishes for lightweight, corrosion-resistant wayfinding and exterior elements.' },
    { name: 'Stainless Steel', description: 'Brushed or mirror-polished for high-traffic environments that demand durability and a clean aesthetic.' },
    { name: 'Acrylic', description: 'Clear, frosted, or coloured — precision-cut and engraved for illuminated signage and modern interiors.' },
    { name: 'Hardwood', description: 'Walnut, oak, and select species finished for awards, plaques, and warm architectural accents.' },
    { name: 'Glass', description: 'Surface and deep engraving for partitions, doors, and decorative panels in premium hospitality spaces.' }
  ];

  processSteps: ProcessStep[] = [
    { step: '01', title: 'Brief & scope', description: 'Share your drawings, quantities, dimensions, and timeline. We respond within one business day with questions or a formal quote.' },
    { step: '02', title: 'Material & finish confirmation', description: 'We confirm the fabrication approach, substrate selection, and a firm production window that fits your project schedule.' },
    { step: '03', title: 'Production & proofing', description: 'Your commission moves into production with a dedicated contact handling revisions, proofing approvals, and progress updates.' },
    { step: '04', title: 'Delivery & install support', description: 'Finished pieces are inspected, packaged for safe transit, and delivered with install documentation where needed.' }
  ];

  values: StudioValue[] = [
    { title: 'Spec-driven fabrication', description: 'Every commission is scoped from your drawings and requirements — not adapted from a template or catalogue.' },
    { title: 'Trade-first relationships', description: 'We work with designers, GCs, and operators as a fabrication partner — not a vendor. Repeat accounts get preferred scheduling and pricing.' },
    { title: 'Transparent timelines', description: 'Production windows are confirmed before work begins. If something changes, you hear about it the same day.' },
    { title: 'In-house quality control', description: 'Every piece is engraved, finished, and inspected under one roof in Stamford. Nothing leaves the studio until it meets the brief.' }
  ];

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'About the Studio | Amarka',
      description: 'Amarka is a laser engraving studio in Stamford, CT serving interior designers, general contractors, and hospitality teams across Connecticut and the tri-state region. Six substrates, 5–10 day turnaround.',
      keywords: ['laser engraving studio Stamford CT', 'Connecticut engraving studio', 'architectural engraving partner', 'bespoke laser engraving about'],
      path: '/about'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/about' });
  }
}
