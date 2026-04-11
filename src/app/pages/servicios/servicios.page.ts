import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ServiceService, ServiceItem } from '../../services/service.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-servicios-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './servicios.page.html',
  styleUrl: './servicios.page.scss'
})
export class ServiciosPageComponent implements OnInit {
  private serviceService = inject(ServiceService);
  private settingsService = inject(SettingsService);

  sections: ServiceItem[] = [];
  isLoading = true;

  // Hero settings
  heroImage = '/assets/services/hero-services.jpg';
  heroTitle = 'Trade-grade laser engraving services';
  heroSubtitle = 'Precision engraving on brass, aluminium, stainless steel, acrylic, hardwood, and glass — built to spec for interior designers, general contractors, and hospitality groups.';

  private fallback: ServiceItem[] = [
    {
      anchor: 'architectural-signage',
      title: 'Architectural signage & identity',
      subtitle: 'Wayfinding, directories, and branded wall pieces.',
      description: 'Room signs, suite directories, wayfinding systems, and branded wall panels engraved in-house on brass, aluminium, and acrylic. Spec sheets and material samples available on request.',
      image: '/assets/services/engraved-gifts.jpg',
      bullets: [
        'ADA-compliant room signs and suite directories',
        'Wayfinding systems for lobbies, corridors, and common areas',
        'Branded wall pieces and architectural accent panels'
      ],
      ctaLabel: 'Request a quote',
      ctaHref: '/enquire',
      order: 1
    },
    {
      anchor: 'bar-service-drinkware',
      title: 'Bar service & drinkware',
      subtitle: 'Cocktail tumblers, menu holders, and bar top inlays.',
      description: 'Engraved tumblers, rocks glasses, cocktail shakers, menu holders, and bar top inlays for restaurants, hotel bars, and private clubs. Bulk runs with consistent depth and finish across every piece.',
      image: '/assets/services/corporate-awards.jpg',
      bullets: [
        'Logo-engraved tumblers and rocks glasses for branded service',
        'Menu holders and table-top displays in brass or stainless steel',
        'Bar top inlays and rail plates in hardwood or metal'
      ],
      ctaLabel: 'Request a quote',
      ctaHref: '/enquire',
      order: 2
    },
    {
      anchor: 'guest-experience',
      title: 'Guest experience & atmosphere',
      subtitle: 'Table numbers, reservation plaques, and staff badges.',
      description: 'Engraved table numbers, reservation plaques, key tags, staff name badges, and amenity labels for hotels, restaurants, and event venues. Every piece finished to match your interior palette.',
      image: '/assets/services/custom-signage.jpg',
      bullets: [
        'Table numbers and reservation plaques in brushed or polished metal',
        'Staff name badges with interchangeable inserts',
        'Key tags, amenity labels, and do-not-disturb signage'
      ],
      ctaLabel: 'Request a quote',
      ctaHref: '/enquire',
      order: 3
    },
    {
      anchor: 'recognition-awards',
      title: 'Recognition & awards',
      subtitle: 'Plaques, nameplates, desk plates, and member recognition.',
      description: 'Donor walls, perpetual plaques, desk plates, and member recognition displays engraved on brass, aluminium, acrylic, and hardwood. Proofs provided before production; bulk programs supported.',
      image: '/assets/services/bulk-engraving.jpg',
      bullets: [
        'Donor walls and perpetual recognition displays',
        'Executive desk plates and nameplates',
        'Custom awards with multi-surface engraving and color fill'
      ],
      ctaLabel: 'Request a quote',
      ctaHref: '/enquire',
      order: 4
    },
    {
      anchor: 'golf-sports',
      title: 'Golf & sports',
      subtitle: 'Bag tags, hole markers, scorecard holders, and cart tags.',
      description: 'Engraved bag tags, yardage markers, hole signs, scorecard holders, and cart identification plates for golf clubs, country clubs, and athletic facilities. Durable finishes rated for outdoor use.',
      image: '/assets/services/rush-engraving.jpg',
      bullets: [
        'Bag tags and cart identification plates in brass or aluminium',
        'Hole markers and yardage signs with UV-stable engraving',
        'Scorecard holders and locker plates with club branding'
      ],
      ctaLabel: 'Request a quote',
      ctaHref: '/enquire',
      order: 5
    }
  ];

  ngOnInit(): void {
    this.loadHeroSettings();
    this.serviceService.getServices().subscribe({
      next: (items) => {
        this.isLoading = false;
        if (items?.length) {
          this.sections = items
            .map(i => ({ ...i, anchor: i.anchor || i.id }))
            .sort((a, b) => (a.order || 999) - (b.order || 999));
        } else {
          this.sections = this.fallback;
        }
      },
      error: (err) => {
        void 0;
        this.sections = this.fallback;
        this.isLoading = false;
      }
    });
  }

  private async loadHeroSettings() {
    try {
      const settings = await this.settingsService.getSettings();
      this.heroImage = settings.serviciosHeroImage || this.heroImage;
      this.heroTitle = settings.serviciosHeroTitle || this.heroTitle;
      this.heroSubtitle = settings.serviciosHeroSubtitle || this.heroSubtitle;
    } catch (error) {
      void 0;
    }
  }
}
