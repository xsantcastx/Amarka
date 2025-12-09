import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CollectionsService, CollectionDoc } from '../../../services/collections.service';
import { AuthService } from '../../../services/auth.service';
import { StorageService } from '../../../services/storage.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-collections-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, TranslateModule, AdminSidebarComponent],
  templateUrl: './collections-admin.page.html',
  styleUrls: ['./collections-admin.page.scss']
})
export class CollectionsAdminPageComponent implements OnInit {
  private collectionsService = inject(CollectionsService);
  private authService = inject(AuthService);
  private storageService = inject(StorageService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  collections: CollectionDoc[] = [];
  isLoading = false;
  showModal = false;
  editing: CollectionDoc | null = null;
  errorMessage = '';
  
  // Image upload
  selectedHeroFile: File | null = null;
  heroPreview: string | null = null;
  uploadingHero = false;
  heroUploadProgress = 0;
  existingHeroUrl = '';

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    description: [''],
    heroImageUrl: [''],
    active: [true],
    seoTitle: [''],
    seoDescription: [''],
    seoImage: ['']
  });

  async ngOnInit() {
    const isAdmin = await this.checkAdminAccess();
    if (!isAdmin) {
      return;
    }
    await this.loadCollections();
  }

  private async checkAdminAccess(): Promise<boolean> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      await this.router.navigate(['/client/login']);
      return false;
    }

    try {
      const profile = await firstValueFrom(
        this.authService.userProfile$.pipe(
          filter(p => !!p),
          take(1)
        )
      );

      if (profile?.role !== 'admin') {
        await this.router.navigate(['/']);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking admin access:', error);
      await this.router.navigate(['/']);
      return false;
    }
  }

  async loadCollections() {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.collections = await this.collectionsService.getAllCollections();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error loading collections:', error);
      this.errorMessage = 'Failed to load collections';
      this.collections = [];
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  openCreate() {
    this.editing = null;
    this.selectedHeroFile = null;
    this.heroPreview = null;
    this.existingHeroUrl = '';
    this.form.reset({
      name: '',
      slug: '',
      description: '',
      heroImageUrl: '',
      active: true,
      seoTitle: '',
      seoDescription: '',
      seoImage: ''
    });
    this.showModal = true;
    this.cdr.detectChanges();
  }

  onHeroSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    this.selectedHeroFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.heroPreview = e.target.result;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  removeHeroImage() {
    this.selectedHeroFile = null;
    this.heroPreview = null;
    this.existingHeroUrl = '';
    this.form.patchValue({ heroImageUrl: '' });
    this.cdr.detectChanges();
  }

  editCollection(col: CollectionDoc) {
    this.editing = col;
    this.selectedHeroFile = null;
    this.heroPreview = null;
    this.existingHeroUrl = col.heroImageUrl || '';
    this.form.patchValue({
      name: col.name,
      slug: col.slug,
      description: col.description,
      heroImageUrl: col.heroImageUrl,
      active: col.active ?? true,
      seoTitle: col.seo?.title || '',
      seoDescription: col.seo?.description || '',
      seoImage: col.seo?.image || ''
    });
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    let heroImageUrl = this.existingHeroUrl || this.form.value.heroImageUrl || '';

    // Upload hero image if a new file was selected
    if (this.selectedHeroFile) {
      try {
        this.uploadingHero = true;
        this.heroUploadProgress = 0;
        this.cdr.detectChanges();

        const uploadResult = await lastValueFrom(
          this.storageService.uploadFile(
            this.selectedHeroFile,
            `collections/hero/${Date.now()}_${this.selectedHeroFile.name}`
          )
        );

        heroImageUrl = uploadResult.downloadURL || '';
        this.uploadingHero = false;
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error uploading hero image:', error);
        alert('Failed to upload hero image');
        this.uploadingHero = false;
        this.cdr.detectChanges();
        return;
      }
    }

    const value = this.form.value;
    const payload: CollectionDoc = {
      name: value.name,
      slug: value.slug,
      description: value.description,
      heroImageUrl: heroImageUrl,
      active: value.active,
      seo: {
        title: value.seoTitle,
        description: value.seoDescription,
        image: value.seoImage
      }
    };
    
    if (this.editing?.id) {
      await this.collectionsService.updateCollection(this.editing.id, payload);
    } else {
      await this.collectionsService.addCollection(payload);
    }
    
    this.showModal = false;
    await this.loadCollections();
  }

  async deleteCollection(col: CollectionDoc) {
    if (!col?.id) return;
    const confirmDelete = typeof window !== 'undefined'
      ? window.confirm(`Delete collection "${col.name}"? This cannot be undone.`)
      : true;
    if (!confirmDelete) return;

    try {
      await this.collectionsService.deleteCollection(col.id);
      await this.loadCollections();
    } catch (error) {
      console.error('Error deleting collection:', error);
      this.errorMessage = 'Failed to delete collection';
      this.cdr.detectChanges();
    }
  }
}
