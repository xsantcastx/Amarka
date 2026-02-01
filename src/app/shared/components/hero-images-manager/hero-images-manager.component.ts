import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, HeroImage } from '../../../services/settings.service';
import { StorageService, UploadProgress } from '../../../services/storage.service';

@Component({
  selector: 'app-hero-images-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hero-images-manager.component.html',
  styleUrls: ['./hero-images-manager.component.scss']
})
export class HeroImagesManagerComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private storageService = inject(StorageService);

  heroImages: HeroImage[] = [];
  editingImage: HeroImage | null = null;
  uploadingImage: boolean = false;
  uploadProgress: number = 0;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  ngOnInit() {
    this.loadHeroImages();
  }

  async loadHeroImages() {
    // Load all images (including inactive) for management
    try {
      // Force refresh to get latest from Firestore
      const settings = await this.settingsService.getSettings(true);
      
      if (settings?.heroImagesJson) {
        const allImages: HeroImage[] = JSON.parse(settings.heroImagesJson);
        this.heroImages = allImages.sort((a, b) => a.order - b.order);
      } else {
        this.heroImages = [];
      }
    } catch (error) {
      void 0;
      this.heroImages = [];
    }
  }

  addNewImage() {
    const newImage: HeroImage = {
      id: Date.now().toString(),
      url: '',
      alt: '',
      title: '',
      description: '',
      order: this.heroImages.length + 1,
      active: true
    };
    this.heroImages.push(newImage);
    this.editingImage = newImage;
  }

  editImage(image: HeroImage) {
    this.editingImage = { ...image };
  }

  cancelEdit() {
    if (this.editingImage && !this.editingImage.url) {
      // Remove if it was a new image without URL
      this.heroImages = this.heroImages.filter(img => img.id !== this.editingImage!.id);
    }
    this.editingImage = null;
  }

  async saveImage() {
    if (!this.editingImage) return;

    void 0;

    // Validate
    if (!this.editingImage.url || !this.editingImage.title) {
      this.showMessage('Please provide URL and title', 'error');
      return;
    }

    // Update the image in the array
    const index = this.heroImages.findIndex(img => img.id === this.editingImage!.id);
    void 0;
    void 0;
    
    if (index !== -1) {
      this.heroImages[index] = { ...this.editingImage };
      void 0;
    } else {
      void 0;
    }

    await this.saveAllImages();
    this.editingImage = null;
  }

  async deleteImage(image: HeroImage) {
    if (!confirm(`Delete "${image.title}"?`)) return;

    this.heroImages = this.heroImages.filter(img => img.id !== image.id);
    await this.saveAllImages();
  }

  async toggleActive(image: HeroImage) {
    image.active = !image.active;
    await this.saveAllImages();
  }

  async moveUp(image: HeroImage) {
    const index = this.heroImages.indexOf(image);
    if (index > 0) {
      // Swap with previous
      [this.heroImages[index - 1], this.heroImages[index]] = 
      [this.heroImages[index], this.heroImages[index - 1]];
      
      // Update order numbers
      this.heroImages.forEach((img, idx) => img.order = idx + 1);
      await this.saveAllImages();
    }
  }

  async moveDown(image: HeroImage) {
    const index = this.heroImages.indexOf(image);
    if (index < this.heroImages.length - 1) {
      // Swap with next
      [this.heroImages[index], this.heroImages[index + 1]] = 
      [this.heroImages[index + 1], this.heroImages[index]];
      
      // Update order numbers
      this.heroImages.forEach((img, idx) => img.order = idx + 1);
      await this.saveAllImages();
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    
    // Validate file
    const validation = this.storageService.validateImageFile(file);
    if (!validation.valid) {
      this.showMessage(validation.error || 'Invalid file', 'error');
      return;
    }

    this.uploadingImage = true;
    this.uploadProgress = 0;

    try {
      // Upload with optimization
      this.storageService.uploadOptimizedImage(
        file,
        `hero-images/hero-${Date.now()}`,
        true
      ).subscribe({
        next: (progress: UploadProgress) => {
          if (progress.optimizing) {
            this.showMessage('Optimizing image...', 'info');
          } else if (progress.state === 'progress') {
            this.uploadProgress = progress.progress;
          } else if (progress.state === 'complete' && progress.urls) {
            if (this.editingImage) {
              this.editingImage.url = progress.urls.webp || progress.urls.original;
              if (progress.urls.webp) {
                this.editingImage.webpUrl = progress.urls.webp;
              }
              this.showMessage('Image uploaded successfully! Fill in details and click Save.', 'success');
            }
          }
        },
        error: (error) => {
          void 0;
          this.showMessage('Failed to upload image', 'error');
          this.uploadingImage = false;
        },
        complete: () => {
          this.uploadingImage = false;
          this.uploadProgress = 0;
        }
      });
    } catch (error) {
      void 0;
      this.showMessage('Failed to upload image', 'error');
      this.uploadingImage = false;
    }
  }

  private async saveAllImages() {
    try {
      await this.settingsService.updateHeroImages(this.heroImages);
      this.showMessage('Hero images updated! Refresh the home page to see changes.', 'success');
    } catch (error) {
      void 0;
      this.showMessage('Failed to save images', 'error');
    }
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info') {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}
