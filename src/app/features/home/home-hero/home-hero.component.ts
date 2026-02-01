import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { SettingsService, HeroImage } from '../../../services/settings.service';
import { BrandConfigService } from '../../../core/services/brand-config.service';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './home-hero.html',
  styles: [`
    @keyframes ken-burns {
      0% {
        transform: scale(1);
      }
      100% {
        transform: scale(1.1);
      }
    }

    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-ken-burns {
      animation: ken-burns 20s ease-in-out infinite alternate;
    }

    .animate-fade-in-up {
      animation: fade-in-up 0.8s ease-out forwards;
      opacity: 0;
    }

    .animation-delay-200 {
      animation-delay: 0.2s;
    }

    .animation-delay-400 {
      animation-delay: 0.4s;
    }

    /* High-quality image rendering */
    .image-rendering-crisp {
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
      will-change: transform;
    }

    /* Prevent blur during animations */
    img {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  `]
})
export class HomeHeroComponent implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private settingsService = inject(SettingsService);
  private cdr = inject(ChangeDetectorRef);
  private brandConfig = inject(BrandConfigService);
  
  rotatingImages: HeroImage[] = [];
  currentImageIndex = 0;
  private interval: any;
  readonly heroContent = this.brandConfig.site.hero;
  readonly brandName = this.brandConfig.siteName;
  readonly brandLogo = this.brandConfig.site.brand.logo;

  async ngOnInit(): Promise<void> {
    await this.loadHeroImages();
    
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.startImageRotation();
      }, 0);
    }
  }

  async loadHeroImages(): Promise<void> {
    try {
      await this.settingsService.getSettings(true);
      this.rotatingImages = this.settingsService.getHeroImages();
    } catch (error) {
      void 0;
      this.rotatingImages = [];
    }
  }

  ngOnDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  private startImageRotation(): void {
    this.interval = setInterval(() => {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.rotatingImages.length;
      this.cdr.detectChanges();
    }, 6000);
  }

  goToImage(index: number): void {
    this.currentImageIndex = index;
    this.cdr.detectChanges();
    if (this.interval) {
      clearInterval(this.interval);
      this.startImageRotation();
    }
  }

  setCurrentImage(index: number): void {
    this.currentImageIndex = index;
    this.cdr.detectChanges();
  }

  scrollToNextSection(): void {
    if (isPlatformBrowser(this.platformId)) {
      const heroSection = document.querySelector('.home-hero');
      if (heroSection) {
        const nextSection = heroSection.nextElementSibling;
        if (nextSection) {
          nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }
}
