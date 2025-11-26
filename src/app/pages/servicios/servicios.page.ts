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
  heroTitle = 'Precision engraving, elevated gifts';
  heroSubtitle = 'Custom engraving on metal, glass, wood, and leather with fast turnaround and gift-ready packaging.';

  private fallback: ServiceItem[] = [
    {
      anchor: 'engraved-gifts',
      title: 'Engraved gifts & keepsakes',
      subtitle: 'Personalized flasks, decanters, pens, and jewelry boxes.',
      description: 'Deep, clean engraving on glass, metal, leather, and wood with proofs on request and gift-ready packaging.',
      image: '/assets/services/engraved-gifts.jpg',
      bullets: [
        'Laser and rotary engraving for sharp detail',
        'Custom monograms, logos, and messages',
        'Gift wrap and note card options'
      ],
      ctaLabel: 'Shop engraved gifts',
      ctaHref: '/productos',
      order: 1
    },
    {
      anchor: 'corporate-awards',
      title: 'Corporate awards & plaques',
      subtitle: 'Executive awards, plaques, and office signage with brand consistency.',
      description: 'Crystal, acrylic, metal, and wood awards engraved with your logo, event details, and recipient personalization.',
      image: '/assets/services/corporate-awards.jpg',
      bullets: [
        'Bulk ordering with proofs and approvals',
        'Color-fill and multi-surface engraving',
        'Drop-ship to recipients or event venue'
      ],
      ctaLabel: 'Plan an award order',
      ctaHref: '/contacto',
      order: 2
    },
    {
      anchor: 'custom-signage',
      title: 'Custom signage & tags',
      subtitle: 'Branded tags, nameplates, keychains, and small signage.',
      description: 'Durable engraving on metal, leather, and acrylic for product tags, door plates, and badges.',
      image: '/assets/services/custom-signage.jpg',
      bullets: [
        'Batch engraving with serialized data',
        'Multiple finishes and materials',
        'Fast reorders for new hires or batches'
      ],
      ctaLabel: 'Request signage',
      ctaHref: '/contacto',
      order: 3
    },
    {
      anchor: 'bulk-engraving',
      title: 'Bulk & white-label engraving',
      subtitle: 'We engrave your supplied items at scale with QA and safe handling.',
      description: 'Intake, inspection, and engraving for your inventory with secure chain-of-custody and packaging.',
      image: '/assets/services/bulk-engraving.jpg',
      bullets: [
        'Batch processing with QC checkpoints',
        'Fulfillment-ready packaging',
        'Secure intake and return shipping'
      ],
      ctaLabel: 'Start a batch project',
      ctaHref: '/contacto',
      order: 4
    },
    {
      anchor: 'rush-services',
      title: 'Rush engraving & gifting',
      subtitle: 'Expedited engraving for last-minute events and gifting.',
      description: 'Priority queue, proofs, and same-day or next-day shipping where available.',
      image: '/assets/services/rush-engraving.jpg',
      bullets: [
        'Priority production slots',
        'Express shipping options',
        'Concierge support for VIP orders'
      ],
      ctaLabel: 'Request a rush',
      ctaHref: '/contacto',
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
        console.error('Failed to load services', err);
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
      console.error('[Servicios] Error loading hero settings:', error);
    }
  }
}
