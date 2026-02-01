import { Component, OnInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SettingsService, HeroImage } from '../../../services/settings.service';

@Component({
  selector: 'app-home-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-hero.html',
  styleUrl: './home-hero.scss',
  styles: [`
    @keyframes ken-burns {
      0% {
        transform: scale(1);
      }
      100% {
        transform: scale(1.15);
      }
    }

    .animate-ken-burns {
      animation: ken-burns 20s ease-in-out infinite alternate;
    }

    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .animate-fade-in-up {
      animation: fade-in-up 1s ease-out forwards;
    }
  `]
})
export class HomeHeroComponent implements OnInit, OnDestroy {
  private settingsService = inject(SettingsService);
  private platformId = inject(PLATFORM_ID);
  
  currentImageIndex = 0;
  autoPlay = true;
  private intervalId: any;
  
  rotatingImages: HeroImage[] = [];

  async ngOnInit() {
    void 0;
    await this.loadHeroImages();
    if (isPlatformBrowser(this.platformId)) {
      this.startAutoPlay();
    }
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  /**
   * Load hero images from settings
   */
  async loadHeroImages() {
    try {
      const settings = await this.settingsService.getSettings(true);
      this.rotatingImages = this.settingsService.getHeroImages();
      
      void 0;
    } catch (error) {
      void 0;
      this.rotatingImages = [];
    }
  }

  startAutoPlay() {
    if (this.autoPlay) {
      this.intervalId = setInterval(() => {
        this.nextImage();
      }, 5000); // Change image every 5 seconds
    }
  }

  stopAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  toggleAutoPlay() {
    this.autoPlay = !this.autoPlay;
    if (this.autoPlay) {
      this.startAutoPlay();
    } else {
      this.stopAutoPlay();
    }
  }

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.rotatingImages.length;
  }

  previousImage() {
    this.currentImageIndex = this.currentImageIndex === 0 
      ? this.rotatingImages.length - 1 
      : this.currentImageIndex - 1;
  }

  goToImage(index: number) {
    this.currentImageIndex = index;
    // Reset autoplay timer
    if (this.autoPlay) {
      this.stopAutoPlay();
      this.startAutoPlay();
    }
  }

  getPrevIndex(): number {
    return this.currentImageIndex === 0 
      ? this.rotatingImages.length - 1 
      : this.currentImageIndex - 1;
  }

  getNextIndex(): number {
    return (this.currentImageIndex + 1) % this.rotatingImages.length;
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
