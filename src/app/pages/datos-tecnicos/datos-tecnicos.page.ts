import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SeoSchemaService } from '../../services/seo-schema.service';

interface Substrate {
  name: string;
  description: string;
  specs: string[];
}

@Component({
  selector: 'app-datos-tecnicos-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './datos-tecnicos.page.html',
  styleUrl: './datos-tecnicos.page.scss'
})
export class DatosTecnicosPageComponent implements OnInit {
  private seo = inject(SeoSchemaService);

  datosTecnicos: any | null = null;
  isLoading = true;

  substrates: Substrate[] = [
    {
      name: 'Brass',
      description: 'Aged, polished, or brushed — the signature material for luxury signage and architectural detailing.',
      specs: ['0.5–3 mm depth', 'Brushed / Polished / Patina', 'Interior & sheltered exterior']
    },
    {
      name: 'Aluminium',
      description: 'Powder-coated or anodised finishes for lightweight, corrosion-resistant wayfinding and exterior elements.',
      specs: ['0.3–2 mm depth', 'Anodised / Powder-coated', 'Full exterior rated']
    },
    {
      name: 'Stainless Steel',
      description: 'Brushed or mirror-polished for high-traffic environments that demand durability and a clean aesthetic.',
      specs: ['0.2–1.5 mm depth', 'Brushed / Mirror / Satin', 'Marine grade available']
    },
    {
      name: 'Acrylic',
      description: 'Clear, frosted, or coloured — precision-cut and engraved for illuminated signage and modern interiors.',
      specs: ['0.1–2 mm depth', 'Clear / Frosted / Coloured', 'LED-compatible']
    },
    {
      name: 'Hardwood',
      description: 'Walnut, oak, and select species finished for awards, plaques, and warm architectural accents.',
      specs: ['0.5–3 mm depth', 'Oiled / Lacquered / Raw', 'FSC-certified options']
    },
    {
      name: 'Glass',
      description: 'Surface and deep engraving for partitions, doors, and decorative panels in premium hospitality spaces.',
      specs: ['0.01–0.5 mm depth', 'Frosted / Clear / Tinted', 'Tempered & laminated']
    }
  ];

  private fallbackData: any = {
    acabadosSuperficie: [
      {
        nombre: 'Brushed',
        descripcion: 'A fine linear texture that softens reflections and resists fingerprints — ideal for high-traffic signage.',
        imagen: '/assets/Modern/image4.jpeg'
      },
      {
        nombre: 'Polished',
        descripcion: 'High-gloss mirror finish that elevates brass, steel, and aluminium pieces for premium presentation.',
        imagen: '/assets/Modern/image3.jpeg'
      },
      {
        nombre: 'Matte',
        descripcion: 'A flat, non-reflective surface that provides a contemporary, understated look on any substrate.',
        imagen: '/assets/Modern/image5.jpeg'
      }
    ],
    fichasTecnicas: [
      {
        nombre: 'Substrate Overview',
        url: '/assets/docs/amarka-substrate-overview.pdf',
        tamano: '1.2 MB',
        descripcion: 'Properties and applications for all six Amarka substrates: brass, aluminium, stainless steel, acrylic, hardwood, and glass.'
      },
      {
        nombre: 'Engraving Specifications',
        url: '/assets/docs/amarka-engraving-specs.pdf',
        tamano: '800 KB',
        descripcion: 'Laser engraving depth, resolution, and tolerance specifications across substrates.'
      },
      {
        nombre: 'Finish Guide',
        url: '/assets/docs/amarka-finish-guide.pdf',
        tamano: '950 KB',
        descripcion: 'Available surface finishes, coatings, and patina options for each material.'
      },
      {
        nombre: 'Care & Maintenance',
        url: '/assets/docs/amarka-care-guide.pdf',
        tamano: '600 KB',
        descripcion: 'Cleaning, maintenance, and long-term care instructions for engraved pieces.'
      }
    ],
    especificacionesTecnicas: {
      'laserType': 'CO\u2082 and fibre laser systems',
      'maxEngravingArea': '600 \u00D7 400 mm standard',
      'depthRange': '0.01 mm \u2013 3 mm (substrate dependent)',
      'tolerances': '\u00B1 0.05 mm',
      'resolution': 'Up to 1000 DPI',
      'substrates': 'Brass, aluminium, stainless steel, acrylic, hardwood, glass',
      'turnaround': '5\u201310 business days standard',
      'rushTurnaround': '72-hour rush available'
    },
    mantenimiento: {
      limpieza: 'Clean with a soft, lint-free cloth. Use mild soap and water for metals; glass cleaner for acrylic and glass substrates.',
      frecuencia: 'Wipe weekly in high-traffic areas; deep clean monthly',
      productos: [
        'Mild soap and water',
        'Non-abrasive metal polish (brass and steel)',
        'Lint-free microfibre cloths'
      ],
      evitar: [
        'Abrasive cleaners or scouring pads',
        'Ammonia-based products on acrylic',
        'Steel wool on any substrate',
        'Harsh chemical solvents'
      ]
    }
  };

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Technical Specifications | Amarka',
      description: 'Laser engraving specifications for brass, aluminium, stainless steel, acrylic, hardwood, and glass. Tolerances, depth ranges, surface finishes, and care guides from Amarka\u2019s Stamford studio.',
      keywords: ['laser engraving specifications', 'engraving tolerances', 'substrate specs laser', 'brass engraving depth', 'architectural engraving technical data'],
      path: '/datos-tecnicos'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/datos-tecnicos' });
  }

  ngOnInit() {
    this.datosTecnicos = this.fallbackData;
    this.isLoading = false;
  }

  formatearTexto(texto: string): string {
    return texto.replace(/([A-Z])/g, ' $1').trim();
  }

  getObjectEntries(obj: Record<string, string>): Array<{key: string; value: string}> {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }
}
