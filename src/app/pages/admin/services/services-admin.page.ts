import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceService, ServiceItem } from '../../../services/service.service';
import { StorageService } from '../../../services/storage.service';
import { ImageOptimizationService } from '../../../services/image-optimization.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';

@Component({
  selector: 'app-services-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AdminSidebarComponent],
  templateUrl: './services-admin.page.html'
})
export class ServicesAdminPage implements OnInit {
  private serviceService = inject(ServiceService);
  private fb = inject(FormBuilder);
  private storageService = inject(StorageService);
  private imageOptimizationService = inject(ImageOptimizationService);

  services: ServiceItem[] = [];
  isLoading = true;
  isSaving = false;
  editingId: string | null = null;
  uploadProgress: number | null = null;
  selectedImageFile: File | null = null;
  selectedImagePreview: string | null = null;

  form: FormGroup = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(140)]],
    subtitle: ['', [Validators.maxLength(180)]],
    description: ['', [Validators.required, Validators.maxLength(600)]],
    bulletsText: ['', [Validators.required]],
    image: [''],
    order: [1],
    anchor: [''],
    ctaLabel: ['Learn More'],
    ctaHref: ['/contacto']
  });

  ngOnInit(): void {
    this.loadServices();
    
    // Auto-generate anchor from title
    this.form.get('title')?.valueChanges.subscribe(title => {
      if (title && !this.editingId) {
        const anchor = title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();
        this.form.patchValue({ anchor }, { emitEvent: false });
      }
    });
  }

  private loadServices() {
    this.isLoading = true;
    this.serviceService.getServices().subscribe({
      next: (items) => {
        this.services = items.sort((a, b) => (a.order || 999) - (b.order || 999));
        this.isLoading = false;
      },
      error: (err) => {
        void 0;
        this.isLoading = false;
      }
    });
  }

  startCreate() {
    this.editingId = null;
    this.selectedImageFile = null;
    this.selectedImagePreview = null;
    this.uploadProgress = null;
    this.form.reset({
      title: '',
      subtitle: '',
      description: '',
      bulletsText: '',
      image: '',
      order: (this.services.length || 0) + 1,
      anchor: '',
      ctaLabel: 'View details',
      ctaHref: '/contacto'
    });
  }

  startEdit(item: ServiceItem) {
    this.editingId = item.id || null;
    this.selectedImageFile = null;
    this.selectedImagePreview = item.image || null;
    this.uploadProgress = null;
    this.form.patchValue({
      title: item.title,
      subtitle: item.subtitle || '',
      description: item.description,
      bulletsText: (item.bullets || []).join('\n'),
      image: item.image || '',
      order: item.order || 1,
      anchor: item.anchor || item.id || '',
      ctaLabel: item.ctaLabel || 'View details',
      ctaHref: item.ctaHref || '/contacto'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    
    try {
      // Upload image if a new one was selected
      let imageUrl = this.form.value.image;
      if (this.selectedImageFile) {
        const uploadedUrl = await this.uploadImage();
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
      }

      const value = this.form.value;
      const payload: ServiceItem = {
        title: value.title,
        subtitle: value.subtitle,
        description: value.description,
        bullets: value.bulletsText.split('\n').map((b: string) => b.trim()).filter((b: string) => !!b),
        image: imageUrl,
        order: Number(value.order) || 1,
        anchor: value.anchor || undefined,
        ctaLabel: value.ctaLabel || 'View details',
        ctaHref: value.ctaHref || '/contacto'
      };
      
      if (this.editingId) {
        await this.serviceService.updateService(this.editingId, payload);
      } else {
        await this.serviceService.addService(payload);
      }
      this.startCreate();
    } catch (error) {
      void 0;
    } finally {
      this.isSaving = false;
    }
  }

  async delete(item: ServiceItem) {
    if (!item.id) return;
    if (!confirm(`Delete service "${item.title}"?`)) return;
    try {
      await this.serviceService.deleteService(item.id);
    } catch (error) {
      void 0;
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    this.selectedImageFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.selectedImagePreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async uploadImage(): Promise<string | null> {
    if (!this.selectedImageFile) return null;

    try {
      this.uploadProgress = 0;
      const timestamp = Date.now();
      const fileName = `service_${timestamp}`;

      return new Promise<string | null>((resolve, reject) => {
        this.storageService.uploadOptimizedImage(
          this.selectedImageFile!,
          `services/${fileName}`
        ).subscribe({
          next: (progress) => {
            if (progress.state === 'progress') {
              this.uploadProgress = progress.progress;
            } else if (progress.state === 'complete') {
              this.uploadProgress = null;
              resolve(progress.urls?.webp || progress.urls?.original || null);
            }
          },
          error: (err) => {
            void 0;
            this.uploadProgress = null;
            reject(err);
          }
        });
      });
    } catch (error) {
      void 0;
      this.uploadProgress = null;
      return null;
    }
  }
}
