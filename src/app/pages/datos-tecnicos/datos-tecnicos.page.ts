import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
// import { DataService, DatosTecnicosData } from '../../core/services/data.service';
import { ImageLightboxComponent } from '../../shared/components/image-lightbox/image-lightbox.component';

@Component({
  selector: 'app-datos-tecnicos-page',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: '<div class="min-h-screen bg-black text-white p-8"><h1>Technical Specifications</h1><p class="mt-4 text-gray-400">Detailed substrate and engraving specifications are being prepared. Contact <a href="mailto:studio@amarka.co" class="underline">studio&#64;amarka.co</a> for material data sheets.</p></div>'
})
export class DatosTecnicosPageComponent implements OnInit {
  // datosTecnicos: DatosTecnicosData | null = null;
  datosTecnicos: any | null = null;
  isLoading = true;
  lightboxOpen = false;
  lightboxImage = '';
  
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  
  acordeonesAbiertos: { [key: string]: boolean } = {
    especificaciones: true, // Start with specifications open
    acabados: false,
    fichas: false,
    packing: false,
    bordes: false,
    fijaciones: false,
    mantenimiento: false
  };

  // Fallback data for immediate display
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
        tamano: '1.2MB',
        descripcion: 'Properties and applications for all six Amarka substrates: brass, aluminium, stainless steel, acrylic, hardwood, and glass.'
      },
      {
        nombre: 'Engraving Specifications',
        url: '/assets/docs/amarka-engraving-specs.pdf',
        tamano: '800KB',
        descripcion: 'Laser engraving depth, resolution, and tolerance specifications across substrates.'
      },
      {
        nombre: 'Finish Guide',
        url: '/assets/docs/amarka-finish-guide.pdf',
        tamano: '950KB',
        descripcion: 'Available surface finishes, coatings, and patina options for each material.'
      },
      {
        nombre: 'Care & Maintenance',
        url: '/assets/docs/amarka-care-guide.pdf',
        tamano: '600KB',
        descripcion: 'Cleaning, maintenance, and long-term care instructions for engraved pieces.'
      }
    ],
    especificacionesTecnicas: {
      'laserType': 'CO₂ and fibre laser systems',
      'maxEngravingArea': '600 × 400 mm standard',
      'depthRange': '0.01 mm – 3 mm (substrate dependent)',
      'tolerances': '± 0.05 mm',
      'resolution': 'Up to 1000 DPI',
      'substrates': 'Brass, aluminium, stainless steel, acrylic, hardwood, glass',
      'turnaround': '5–10 business days standard',
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

  constructor() {} // private dataService: DataService) {}

  ngOnInit() {
    // TEMP: Disabled for cart testing - just use fallback data
    this.datosTecnicos = this.fallbackData;
    this.isLoading = false;
  }

  private loadDatosTecnicos() {
    // TEMP: Disabled for cart testing
    /*
    this.dataService.getDatosTecnicos().subscribe({
      next: (data) => {
        // Only update if we have actual data
        if (data.acabadosSuperficie.length > 0) {
          this.datosTecnicos = data;
        }
        this.isLoading = false;
      },
      error: () => {
        // Keep fallback data on error
        this.isLoading = false;
      }
    });
    */
  }

  toggleAcordeon(seccion: string) {
    this.acordeonesAbiertos[seccion] = !this.acordeonesAbiertos[seccion];
  }

  // Close all other accordions when opening one (optional behavior)
  openAccordionExclusive(seccion: string) {
    // Close all
    Object.keys(this.acordeonesAbiertos).forEach(key => {
      this.acordeonesAbiertos[key] = false;
    });
    // Open the selected one
    this.acordeonesAbiertos[seccion] = true;
  }

  formatearTexto(texto: string): string {
    return texto.replace(/([A-Z])/g, ' $1').trim();
  }

  // Helper method to get object entries for template
  getObjectEntries(obj: Record<string, string>): Array<{key: string, value: string}> {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  // Check if any accordion is open
  hasOpenAccordion(): boolean {
    return Object.values(this.acordeonesAbiertos).some(open => open);
  }

  // Get count of open accordions
  getOpenAccordionCount(): number {
    return Object.values(this.acordeonesAbiertos).filter(open => open).length;
  }

  // Open image in lightbox
  openLightbox(imageSrc: string) {
    this.lightboxImage = imageSrc;
    this.lightboxOpen = true;
  }
}
