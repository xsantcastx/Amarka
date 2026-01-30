import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';

import { AuthService } from '../../../services/auth.service';
import { MediaService } from '../../../services/media.service';
import { StorageService } from '../../../services/storage.service';
import { ServiceService, ServiceItem } from '../../../services/service.service';
import { TagService } from '../../../services/tag.service';
import { Product } from '../../../models/product';
import { Media, MediaTag, MediaCreateInput } from '../../../models/media';
import { Tag } from '../../../models/catalog';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';

interface GalleryProjectSummary {
  id: string;
  name: string;
  baseAltText: string;
  caption: string;
  location: string;
  tags: string[];
  images: Media[];
  featuredImage: Media;
  photoCount: number;
  uploadedAt: Date;
  relatedProductIds: string[];
}

@Component({
  selector: 'app-gallery-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, TranslateModule, AdminSidebarComponent],
  templateUrl: './gallery-admin.page.html',
  styleUrl: './gallery-admin.page.scss'
})
export class GalleryAdminComponent extends LoadingComponentBase implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private mediaService = inject(MediaService);
  private storageService = inject(StorageService);
  private serviceService = inject(ServiceService);
  private tagService = inject(TagService);

  mediaList: Media[] = [];
  services: ServiceItem[] = [];
  availableTags: Tag[] = [];
  showUploadModal = false;
  isSaving = false;
  uploadForm: FormGroup;
  editForm: FormGroup;
  projectForm: FormGroup;
  successMessage = '';
  successMessageParams: Record<string, any> = {};
  warningMessage = '';  // Add warning for non-critical issues
  warningMessageParams: Record<string, any> = {};
  errorMessageParams: Record<string, any> = {};
  selectedTag: MediaTag | 'all' = 'all';
  searchTerm = '';
  showDeleteConfirm = false;
  mediaToDelete: Media | null = null;
  mediaToEdit: Media | null = null;
  galleryProjects: GalleryProjectSummary[] = [];
  projectToManage: GalleryProjectSummary | null = null;
  showProjectManager = false;
  editProjectSummary: GalleryProjectSummary | null = null;
  previewUrls: string[] = [];
  uploadProgress = 0;
  isUploading = false;
  uploadedCount = 0;
  totalToUpload = 0;
  isProjectSaving = false;
  quickTagInputs: Record<'upload' | 'edit' | 'project', string> = {
    upload: '',
    edit: '',
    project: ''
  };
  isAddingQuickTags = false;

  selectedFiles: File[] = [];
  showCloseConfirmation = false;
  closeConfirmContext: 'upload' | 'project' | null = null;
  showProjectDeleteConfirm = false;
  private mediaSub: Subscription | null = null;
  private productsSub: Subscription | null = null;
  private tagsSub: Subscription | null = null;

  constructor() {
    super();
    this.uploadForm = this.fb.group({
      altText: ['', Validators.required],
      caption: [''],
      tags: [[]],
      relatedProductIds: [[]]
    });

    this.editForm = this.fb.group({
      altText: ['', Validators.required],
      caption: [''],
      tags: [[]],
      relatedProductIds: [[]]
    });

    this.projectForm = this.fb.group({
      caption: [''],
      tags: [[]],
      relatedProductIds: [[]]
    });
  }

  async ngOnInit(): Promise<void> {
    await this.checkAdminAccess();
    this.subscribeToMedia();
    this.subscribeToServices();
    this.subscribeToTags();
    
    // Check if we should auto-open upload modal
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'upload') {
        // Wait a bit for data to load, then open modal
        setTimeout(() => {
          this.openUploadModal();
        }, 500);
      }
    });
  }

  ngOnDestroy(): void {
    this.mediaSub?.unsubscribe();
    this.productsSub?.unsubscribe();
    this.tagsSub?.unsubscribe();
    this.revokeAllPreviewUrls();
  }

  private async checkAdminAccess(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/client/login']);
      return;
    }

    const isAdmin = await this.authService.isAdmin(user.uid);
    if (!isAdmin) {
      this.router.navigate(['/']);
    }
  }

  private subscribeToMedia(): void {
    this.setLoading(true);
    this.mediaSub?.unsubscribe();

    this.mediaSub = this.mediaService.getAllMedia().subscribe({
      next: (mediaList) => {
        this.mediaList = mediaList;
        this.updateGalleryProjects();
        this.setLoading(false);
      },
      error: (error) => {
        console.error('Error loading media:', error);
        this.setError('admin.gallery.messages.load_failed');
        this.errorMessageParams = {};
      }
    });
  }

  private subscribeToServices(): void {
    this.productsSub?.unsubscribe();
    console.log('[Gallery Admin] Subscribing to services...');
    this.productsSub = this.serviceService.getServices().subscribe({
      next: (services) => {
        console.log('[Gallery Admin] Received services from Firestore:', services.length);
        this.services = services;
        console.log('[Gallery Admin] Loaded services:', this.services);
      },
      error: (error) => {
        console.error('[Gallery Admin] Error loading services:', error);
      }
    });
  }

  private subscribeToTags(): void {
    this.tagsSub?.unsubscribe();
    this.tagsSub = this.tagService.getActiveTags().subscribe({
      next: (tags) => {
        this.availableTags = tags;
      },
      error: (error) => {
        console.error('Error loading tags:', error);
      }
    });
  }

  get galleryMediaCount(): number {
    return this.mediaList.filter(m => m.relatedEntityType === 'gallery').length;
  }

  get projectCount(): number {
    return this.galleryProjects.length;
  }

  get tagCount(): number {
    return this.availableTags.length;
  }

  get filteredMedia(): Media[] {
    // Start with only gallery media (not product media)
    let filtered = this.mediaList.filter(m => m.relatedEntityType === 'gallery');

    // Filter by tag
    if (this.selectedTag !== 'all') {
      filtered = filtered.filter(media => media.tags.includes(this.selectedTag as MediaTag));
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(media =>
        media.altText?.toLowerCase().includes(term) ||
        media.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    return filtered;
  }

  getTagCount(tag: MediaTag | 'all'): number {
    // Filter only gallery media (relatedEntityType='gallery')
    const galleryMedia = this.mediaList.filter(m => m.relatedEntityType === 'gallery');
    
    if (tag === 'all') {
      return galleryMedia.length;
    }
    return galleryMedia.filter(media => media.tags.includes(tag)).length;
  }

  getRelatedProducts(media: Media): ServiceItem[] {
    if (!media.relatedEntityIds || media.relatedEntityIds.length === 0) {
      return [];
    }
    return this.services.filter((s: ServiceItem) => 
      media.relatedEntityIds!.some(id => id.endsWith(s.id || ''))
    );
  }

  getProjectRelatedServices(project: GalleryProjectSummary): ServiceItem[] {
    if (!project.relatedProductIds || project.relatedProductIds.length === 0) {
      return [];
    }
    return this.services.filter((s: ServiceItem) => project.relatedProductIds.includes(s.id || ''));
  }

  private getProjectForMedia(media: Media): GalleryProjectSummary | undefined {
    return this.galleryProjects.find(project =>
      project.images.some(image => image.id === media.id)
    );
  }

  getServiceName(serviceId: string | undefined): string {
    if (!serviceId) {
      return '';
    }
    const service = this.services.find((s: ServiceItem) => s.id === serviceId);
    return service?.title || serviceId;
  }

  openProjectManager(project: GalleryProjectSummary, initialMedia?: Media): void {
    const latest = this.galleryProjects.find(item => item.id === project.id) || project;
    this.projectToManage = latest;
    this.showProjectManager = true;
    this.errorMessage = '';
    this.errorMessageParams = {};
    this.warningMessage = '';
    this.warningMessageParams = {};
    this.projectForm.patchValue({
      caption: latest.caption || '',
      tags: [...latest.tags],
      relatedProductIds: [...latest.relatedProductIds]
    });
    this.projectForm.markAsPristine();

    if (initialMedia) {
      const match = latest.images.find(image => image.id === initialMedia.id);
      if (match) {
        this.selectMediaForEdit(match);
        return;
      }
    }

    const firstImage = latest.images[0];
    if (firstImage) {
      this.selectMediaForEdit(firstImage);
    } else {
      this.selectMediaForEdit(null);
    }
  }

  closeProjectManagerWithConfirm(): void {
    const hasUnsavedChanges = this.projectForm.dirty || this.projectForm.touched || this.editForm.dirty;
    if (hasUnsavedChanges) {
      this.openCloseConfirmation('project');
      return;
    }
    this.closeProjectManager();
  }

  closeProjectManager(): void {
    this.showProjectManager = false;
    this.showProjectDeleteConfirm = false;
    this.projectToManage = null;
    this.selectMediaForEdit(null);
    this.projectForm.reset({
      caption: '',
      tags: [],
      relatedProductIds: []
    });
    this.isProjectSaving = false;
  }

  private openCloseConfirmation(context: 'upload' | 'project'): void {
    this.closeConfirmContext = context;
    this.showCloseConfirmation = true;
  }

  addPhotosToProject(project: GalleryProjectSummary): void {
    if (!project) return;

    this.openUploadModal({
      altText: project.baseAltText,
      caption: project.caption,
      tags: project.tags as MediaTag[],
      relatedProductIds: project.relatedProductIds
    });

    this.closeProjectManager();
  }

  requestDeleteProject(): void {
    if (!this.projectToManage) {
      return;
    }
    this.showProjectDeleteConfirm = true;
  }

  closeProjectDeleteConfirm(): void {
    this.showProjectDeleteConfirm = false;
  }

  async confirmDeleteProject(): Promise<void> {
    if (!this.projectToManage) {
      return;
    }
    this.showProjectDeleteConfirm = false;
    await this.performDeleteProject(this.projectToManage);
  }

  private async performDeleteProject(project: GalleryProjectSummary): Promise<void> {
    try {
      this.isProjectSaving = true;
      this.errorMessage = '';
      this.errorMessageParams = {};

      const deletePromises = project.images.map(async (media) => {
        try {
          if (media.url) {
            try {
              await this.storageService.deleteFile(media.url);
            } catch (storageError: any) {
              if (storageError.code !== 'storage/object-not-found') {
                console.warn(`Storage deletion warning for ${media.id}:`, storageError);
              }
            }
          }

          await this.mediaService.deleteMedia(media.id!);
        } catch (error) {
          console.error(`Error deleting media ${media.id}:`, error);
          throw error;
        }
      });

      await Promise.all(deletePromises);
      this.subscribeToMedia();
      this.closeProjectManager();

      this.successMessage = 'admin.gallery.messages.project_deleted';
      this.successMessageParams = { name: project.name };
      setTimeout(() => {
        this.successMessage = '';
        this.successMessageParams = {};
      }, 4000);
    } catch (error: any) {
      console.error('Error deleting project:', error);
      this.errorMessage = 'admin.gallery.messages.project_delete_failed';
      this.errorMessageParams = { message: error?.message || '' };
    } finally {
      this.isProjectSaving = false;
    }
  }

  /**
   * Legacy template hook. Keep for backward compatibility with any cached templates.
   */
  editMediaFromProject(media: Media): void {
    this.selectMediaForEdit(media);
  }

  async saveProjectSettings(): Promise<void> {
    if (!this.projectToManage || this.isProjectSaving) {
      return;
    }

    const caption: string = this.projectForm.value.caption || '';
    const tags: MediaTag[] = this.projectForm.value.tags || [];
    this.errorMessage = '';
    this.errorMessageParams = {};
    const relatedProductIds: string[] = this.projectForm.value.relatedProductIds || [];

    if (tags.length === 0) {
      this.errorMessage = 'admin.gallery.messages.project_tag_required';
      this.errorMessageParams = {};
      return;
    }

    // If editing a specific photo, update only that photo
    if (this.mediaToEdit) {
      const altText = this.editForm.value.altText || '';
      
      if (!altText.trim()) {
        this.errorMessage = 'admin.gallery.messages.project_name_required';
        this.errorMessageParams = {};
        return;
      }

      this.isProjectSaving = true;

      try {
        const relatedEntityIds = relatedProductIds.map(id => `products/${id}`);

        await this.mediaService.updateMedia(this.mediaToEdit.id!, {
          altText,
          caption,
          tags: tags as string[],
          relatedEntityIds
        });

        this.mediaToEdit = {
          ...this.mediaToEdit,
          altText,
          caption,
          tags: tags as string[],
          relatedEntityIds
        };

        this.editForm.patchValue({
          altText,
          caption,
          tags,
          relatedProductIds
        }, { emitEvent: false });
        this.editForm.markAsPristine();
        this.projectForm.markAsPristine();
        this.successMessage = 'admin.gallery.messages.photo_updated';
        this.successMessageParams = {};
        this.subscribeToMedia();
      } catch (error) {
        console.error('Error updating photo:', error);
        this.errorMessage = 'admin.gallery.messages.photo_update_failed';
        this.errorMessageParams = {};
      } finally {
        this.isProjectSaving = false;
      }
      return;
    }

    // Otherwise, update all photos in the project
    const images = this.projectToManage.images.filter(image => !!image.id);
    if (images.length === 0) {
      return;
    }

    this.isProjectSaving = true;
    this.errorMessage = '';
    this.errorMessageParams = {};

    try {
      const relatedEntityIds = relatedProductIds.map(id => `products/${id}`);

      await Promise.all(
        images.map(image => this.mediaService.updateMedia(image.id!, {
          caption,
          tags: tags as string[],
          relatedEntityIds
        }))
      );

      this.projectToManage = {
        ...this.projectToManage,
        caption,
        tags: [...tags],
        relatedProductIds: [...relatedProductIds]
      };
      this.projectForm.markAsPristine();
      this.successMessage = 'admin.gallery.messages.project_updated';
      this.successMessageParams = {};
      this.subscribeToMedia();
    } catch (error) {
      console.error('Error updating project settings:', error);
      this.errorMessage = 'admin.gallery.messages.project_update_failed';
      this.errorMessageParams = {};
    } finally {
      this.isProjectSaving = false;
    }
  }

  selectMediaForEdit(media: Media | null): void {
    if (!media) {
      this.mediaToEdit = null;
      this.editProjectSummary = null;
      this.editForm.reset();
      return;
    }

    this.mediaToEdit = media;
    this.editProjectSummary = this.getProjectForMedia(media) || null;

    this.editForm.patchValue({
      altText: media.altText || '',
      caption: media.caption || '',
      tags: media.tags || [],
      relatedProductIds: this.extractProductIds(media.relatedEntityIds || [])
    }, { emitEvent: false });
    this.editForm.markAsPristine();

    this.successMessage = '';
    this.successMessageParams = {};
    this.errorMessage = '';
    this.errorMessageParams = {};
  }

  onAltTextChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.mediaToEdit) {
      this.editForm.patchValue({ altText: input.value });
      this.editForm.markAsDirty();
    }
  }

  openProjectManagerForMedia(media: Media): void {
    const project = this.getProjectForMedia(media);
    if (!project) {
      return;
    }
    this.openProjectManager(project, media);
  }

  private updateGalleryProjects(): void {
    const galleryMedia = this.mediaList.filter(media => media.relatedEntityType === 'gallery');
    const projects = this.groupMediaByProjects(galleryMedia);
    this.galleryProjects = projects;

    if (this.projectToManage) {
      const refreshed = projects.find(project => project.id === this.projectToManage?.id);
      if (refreshed) {
        this.projectToManage = refreshed;
        this.projectForm.patchValue(
          { caption: refreshed.caption || '' },
          { emitEvent: false }
        );
        this.projectForm.markAsPristine();

        const currentMediaId = this.mediaToEdit?.id;
        if (currentMediaId) {
          const refreshedMedia = refreshed.images.find(image => image.id === currentMediaId);
          if (refreshedMedia) {
            if (!this.editForm.dirty) {
              this.selectMediaForEdit(refreshedMedia);
            } else {
              this.mediaToEdit = refreshedMedia;
            }
          } else if (!this.editForm.dirty) {
            const fallback = refreshed.images[0] ?? null;
            this.selectMediaForEdit(fallback);
          }
        } else if (!this.editForm.dirty) {
          const fallback = refreshed.images[0] ?? null;
          this.selectMediaForEdit(fallback);
        }
      } else {
        this.closeProjectManager();
      }
    }
  }

  private groupMediaByProjects(mediaItems: Media[]): GalleryProjectSummary[] {
    const projectsMap = new Map<string, GalleryProjectSummary>();

    mediaItems.forEach(media => {
      const baseName = this.extractBaseProjectName(media.altText || 'Untitled Project');
      const projectId = this.slugify(baseName || 'untitled-project');
      const uploadDate = this.normalizeMediaDate(media);
      const location = this.extractProjectLocation(media.caption || '');
      const productIds = this.getProductIdsFromMedia(media);

      if (!projectsMap.has(projectId)) {
        projectsMap.set(projectId, {
          id: projectId,
          name: baseName || 'Untitled Project',
          baseAltText: baseName || 'Untitled Project',
          caption: media.caption || '',
          location,
          tags: [...media.tags],
          images: [media],
          featuredImage: media,
          photoCount: 1,
          uploadedAt: uploadDate,
          relatedProductIds: productIds
        });
      } else {
        const project = projectsMap.get(projectId)!;
        project.images.push(media);
        project.photoCount += 1;
        project.tags = Array.from(new Set([...project.tags, ...media.tags]));

        if (!project.caption && media.caption) {
          project.caption = media.caption;
        }
        if (!project.location && location) {
          project.location = location;
        }

        const updatedProducts = new Set([...project.relatedProductIds, ...productIds]);
        project.relatedProductIds = Array.from(updatedProducts);

        if (uploadDate > project.uploadedAt) {
          project.uploadedAt = uploadDate;
          project.featuredImage = media;
        }
      }
    });

    const projects = Array.from(projectsMap.values()).map(project => ({
      ...project,
      images: project.images
        .slice()
        .sort((a, b) => this.normalizeMediaDate(b).getTime() - this.normalizeMediaDate(a).getTime())
    }));

    return projects.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  private normalizeMediaDate(media: Media): Date {
    const uploadedAt = media.uploadedAt;
    if (uploadedAt instanceof Date) {
      return uploadedAt;
    }
    return new Date(uploadedAt as any);
  }

  private getProductIdsFromMedia(media: Media): string[] {
    if (!media.relatedEntityIds || media.relatedEntityIds.length === 0) {
      return [];
    }
    return this.extractProductIds(media.relatedEntityIds);
  }

  private extractBaseProjectName(altText: string): string {
    return altText
      .replace(/\s*\(\d+\/\d+\)\s*$/i, '')
      .replace(/\s*\(\d+\s+of\s+\d+\)\s*$/i, '')
      .replace(/\s*-\s*\d+\s*$/i, '')
      .replace(/\s*#\d+\s*$/i, '')
      .trim();
  }

  private extractProjectLocation(caption: string): string {
    const dashIndex = caption.indexOf('-');
    if (dashIndex > 0) {
      return caption.substring(0, dashIndex).trim();
    }

    const commaIndex = caption.indexOf(',');
    if (commaIndex > 0) {
      return caption.substring(0, commaIndex + 4).trim();
    }

    return caption.trim();
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private toTitleCase(text: string): string {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(word => word ? word.charAt(0).toUpperCase() + word.slice(1) : '')
      .join(' ')
      .trim();
  }

  get filteredProjects(): GalleryProjectSummary[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.galleryProjects.filter(project => {
      const matchesTag = this.selectedTag === 'all' || project.tags.includes(this.selectedTag);
      const matchesSearch = !term ||
        project.name.toLowerCase().includes(term) ||
        project.caption.toLowerCase().includes(term) ||
        project.tags.some(tag => tag.toLowerCase().includes(term));

      return matchesTag && matchesSearch;
    });
  }

  openUploadModal(defaults?: {
    altText?: string;
    caption?: string;
    tags?: MediaTag[];
    relatedProductIds?: string[];
  }): void {
    this.showUploadModal = true;
    this.closeConfirmContext = null;
    this.uploadForm.reset({
      altText: defaults?.altText ?? '',
      caption: defaults?.caption ?? '',
      tags: defaults?.tags ?? [],
      relatedProductIds: defaults?.relatedProductIds ?? []
    });
    this.selectedFiles = [];
    this.revokeAllPreviewUrls();
    this.successMessage = '';
    this.successMessageParams = {};
    this.errorMessage = '';
    this.errorMessageParams = {};
    this.warningMessage = '';  // Clear warning
    this.warningMessageParams = {};
    this.uploadProgress = 0;
    this.uploadedCount = 0;
    this.totalToUpload = 0;
  }

  closeUploadModal(force = false): void {
    if (!force && this.hasUnsavedChanges() && !this.showCloseConfirmation) {
      this.openCloseConfirmation('upload');
      return;
    }

    this.forceCloseUploadModal();
  }

  private forceCloseUploadModal(): void {
    this.showUploadModal = false;
    this.showCloseConfirmation = false;
    this.closeConfirmContext = null;
    this.uploadForm.reset();
    this.selectedFiles = [];
    this.revokeAllPreviewUrls();
    this.errorMessage = '';
    this.errorMessageParams = {};
    this.warningMessage = '';  // Clear warning
    this.warningMessageParams = {};
    this.uploadProgress = 0;
    this.uploadedCount = 0;
    this.totalToUpload = 0;
  }

  cancelCloseModal(): void {
    this.showCloseConfirmation = false;
    this.closeConfirmContext = null;
  }

  confirmCloseModal(): void {
    const context = this.closeConfirmContext;
    this.showCloseConfirmation = false;
    this.closeConfirmContext = null;

    if (context === 'project') {
      this.closeProjectManager();
      return;
    }

    if (context === 'upload') {
      this.closeUploadModal(true);
    }
  }

  hasUnsavedChanges(): boolean {
    // Check if user is currently uploading
    if (this.isUploading || this.isSaving) {
      return true;
    }

    // Check if files are selected
    if (this.selectedFiles.length > 0) {
      return true;
    }

    // Check if form has been touched and has values
    const formValue = this.uploadForm.value;
    if (formValue.altText || formValue.caption || 
        (formValue.tags && formValue.tags.length > 0) ||
        (formValue.relatedProductIds && formValue.relatedProductIds.length > 0)) {
      return true;
    }

    return false;
  }

  private extractProductIds(relatedEntityIds: string[]): string[] {
    return relatedEntityIds
      .filter(id => id.startsWith('products/'))
      .map(id => id.replace('products/', ''));
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const files = Array.from(input.files);
    const validFiles: File[] = [];
    let hasErrors = false;
    
    // Validate each file
    const maxSizeMb = 10;
    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'admin.gallery.messages.invalid_file_type';
        this.errorMessageParams = { name: file.name };
        hasErrors = true;
        continue;
      }

      // Validate file size (10MB max)
      const maxSize = maxSizeMb * 1024 * 1024;
      if (file.size > maxSize) {
        this.errorMessage = 'admin.gallery.messages.file_too_large';
        this.errorMessageParams = { name: file.name, maxSize: maxSizeMb };
        hasErrors = true;
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0 && hasErrors) {
      return;
    }

    this.selectedFiles = validFiles;
    if (!hasErrors) {
      this.errorMessage = '';
      this.errorMessageParams = {};
    }
    this.warningMessage = '';
    this.warningMessageParams = {};

    // Generate preview URLs for all selected images
    this.revokeAllPreviewUrls();
    this.previewUrls = validFiles.map(file => URL.createObjectURL(file));

    if (validFiles.length > 0) {
      this.successMessage = 'admin.gallery.messages.images_selected';
      this.successMessageParams = { count: validFiles.length };
      setTimeout(() => {
        this.successMessage = '';
        this.successMessageParams = {};
      }, 3000);
    }
  }

  removeImage(index: number): void {
    // Revoke the specific preview URL
    if (this.previewUrls[index]) {
      URL.revokeObjectURL(this.previewUrls[index]);
    }
    
    // Remove from arrays
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);

    if (this.selectedFiles.length === 0) {
      this.errorMessage = '';
      this.errorMessageParams = {};
      this.warningMessage = '';
      this.warningMessageParams = {};
    }
  }

  private getFormByScope(scope: 'upload' | 'edit' | 'project'): FormGroup {
    switch (scope) {
      case 'edit':
        return this.editForm;
      case 'project':
        return this.projectForm;
      default:
        return this.uploadForm;
    }
  }

  toggleTag(tag: MediaTag, checked: boolean, scope: 'upload' | 'edit' | 'project' = 'upload'): void {
    const form = this.getFormByScope(scope);
    const current = new Set<MediaTag>(form.get('tags')?.value || []);
    
    if (checked) {
      current.add(tag);
    } else {
      current.delete(tag);
    }
    
    const newTags = Array.from(current);
    form.patchValue({ tags: newTags });
  }

  async addQuickTags(scope: 'upload' | 'edit' | 'project' = 'upload'): Promise<void> {
    const input = this.quickTagInputs[scope]?.trim() || '';
    if (!input) {
      this.warningMessage = 'admin.gallery.messages.tag_input_required';
      this.warningMessageParams = {};
      setTimeout(() => {
        this.warningMessage = '';
        this.warningMessageParams = {};
      }, 3000);
      return;
    }

    const tagNames = input
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    if (tagNames.length === 0) {
      this.warningMessage = 'admin.gallery.messages.tag_input_required';
      this.warningMessageParams = {};
      setTimeout(() => {
        this.warningMessage = '';
        this.warningMessageParams = {};
      }, 3000);
      return;
    }

    const form = this.getFormByScope(scope);
    const currentTags = new Set<MediaTag>(form.get('tags')?.value || []);
    this.isAddingQuickTags = true;
    this.errorMessage = '';
    this.errorMessageParams = {};

    try {
      for (const rawName of tagNames) {
        const slug = this.slugify(rawName);
        if (!slug) continue;

        let existingTag = this.availableTags.find(tag => tag.slug === slug);

        if (!existingTag) {
          const newTagData: Omit<Tag, 'id'> = {
            name: this.toTitleCase(rawName),
            slug,
            color: '#F7931A',
            order: (this.availableTags.length + 1),
            active: true
          };

          try {
            const id = await this.tagService.addTag(newTagData);
            existingTag = { ...newTagData, id };
            this.availableTags = [...this.availableTags, existingTag];
          } catch (error) {
            console.error('Error creating tag:', error);
            this.errorMessage = 'admin.gallery.messages.tag_create_failed';
            this.errorMessageParams = {};
            continue;
          }
        }

        if (existingTag) {
          currentTags.add(existingTag.slug);
        }
      }

      form.patchValue({ tags: Array.from(currentTags) });
      form.markAsDirty();
      this.quickTagInputs[scope] = '';
      this.forceUpdate();

      if (!this.errorMessage) {
        this.successMessage = 'admin.gallery.messages.tags_added';
        this.successMessageParams = {};
        setTimeout(() => {
          this.successMessage = '';
          this.successMessageParams = {};
        }, 3000);
      }
    } finally {
      this.isAddingQuickTags = false;
    }
  }

  isTagSelected(tag: MediaTag, scope: 'upload' | 'edit' | 'project' = 'upload'): boolean {
    const form = this.getFormByScope(scope);
    const selected: MediaTag[] = form.get('tags')?.value || [];
    return selected.includes(tag);
  }

  getSelectedTagsCount(scope: 'upload' | 'edit' | 'project' = 'upload'): number {
    const form = this.getFormByScope(scope);
    const tags: MediaTag[] = form.get('tags')?.value || [];
    return tags.length;
  }

  toggleRelatedProduct(productId: string | undefined, checked: boolean, scope: 'upload' | 'edit' | 'project' = 'upload'): void {
    const form = this.getFormByScope(scope);
    const current = new Set<string>(form.get('relatedProductIds')?.value || []);
    
    if (!productId) return;
    
    if (checked) {
      current.add(productId);
    } else {
      current.delete(productId);
    }
    
    form.patchValue({ relatedProductIds: Array.from(current) });
  }

  isProductSelected(productId: string | undefined, scope: 'upload' | 'edit' | 'project' = 'upload'): boolean {
    const form = this.getFormByScope(scope);
    const selected: string[] = form.get('relatedProductIds')?.value || [];
    if (!productId) return false;
    return selected.includes(productId);
  }

  revokeAllPreviewUrls(): void {
    this.previewUrls.forEach(url => URL.revokeObjectURL(url));
    this.previewUrls = [];
  }

  async onSubmit(): Promise<void> {
    if (this.isSaving || this.isUploading || this.selectedFiles.length === 0) {
      if (this.selectedFiles.length === 0) {
        this.errorMessage = 'admin.gallery.messages.select_image';
        this.errorMessageParams = {};
      }
      return;
    }

    if (this.uploadForm.invalid) {
      this.markFormGroupTouched(this.uploadForm);
      this.errorMessage = 'admin.gallery.messages.required_fields';
      this.errorMessageParams = {};
      return;
    }

    const formValue = this.uploadForm.value;
    const tags: MediaTag[] = formValue.tags || [];
    const relatedProductIds: string[] = formValue.relatedProductIds || [];
    const sharedAltText = formValue.altText || '';
    const sharedCaption = formValue.caption || '';

    if (tags.length === 0) {
      this.errorMessage = 'admin.gallery.messages.tag_required';
      this.errorMessageParams = {};
      return;
    }

    this.isUploading = true;
    this.isSaving = true;
    this.errorMessage = '';
    this.errorMessageParams = {};
    this.warningMessage = '';
    this.warningMessageParams = {};
    this.uploadProgress = 0;
    this.uploadedCount = 0;
    this.totalToUpload = this.selectedFiles.length;

    try {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('AUTH_REQUIRED');
      }

      // Upload each file with optimization
      for (let i = 0; i < this.selectedFiles.length; i++) {
        const file = this.selectedFiles[i];
        
        // Validate image dimensions
        const validation = await this.mediaService.validateImageDimensions(file, 1600, 1200);
        
        if (!validation.valid && validation.width && validation.height) {
          console.warn(`⚠️ Image "${file.name}" (${validation.width}x${validation.height}px) is smaller than recommended`);
        }

        // Create altText with numbering for multiple files
        const altText = this.selectedFiles.length === 1 
          ? sharedAltText 
          : `${sharedAltText} (${i + 1}/${this.selectedFiles.length})`;

        const originalSize = file.size;
        console.log(`📤 Uploading "${file.name}" (${this.formatFileSize(originalSize)})...`);

        // Upload with automatic optimization to WebP
        await new Promise<void>((resolve, reject) => {
          this.storageService.uploadGalleryImage(file, 'general').subscribe({
            next: async (progress) => {
              if (progress.state === 'progress') {
                // Calculate overall progress
                const fileProgress = progress.progress / this.totalToUpload;
                const completedProgress = (this.uploadedCount / this.totalToUpload) * 100;
                this.uploadProgress = Math.round(completedProgress + fileProgress);
              } else if (progress.state === 'complete' && progress.urls) {
                try {
                  // Log optimization results
                  const optimizedSize = progress.optimizedSize || file.size;
                  const reduction = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
                  console.log(`✅ Image optimized: ${this.formatFileSize(originalSize)} → ${this.formatFileSize(optimizedSize)} (${reduction}% reduction)`);

                  // Create media document with optimized URLs
                  const mediaInput: MediaCreateInput = {
                    url: progress.urls.webp || progress.urls.original,
                    filename: file.name,
                    storagePath: progress.storagePath || `gallery/${Date.now()}_${file.name}`,
                    width: validation.width || 0,
                    height: validation.height || 0,
                    size: optimizedSize,
                    mimeType: 'image/webp',
                    uploadedBy: currentUser.uid,
                    tags: tags as string[],
                    altText: altText,
                    caption: sharedCaption,
                    relatedEntityIds: relatedProductIds.map(id => `products/${id}`),
                    relatedEntityType: 'gallery'
                  };

                  await this.mediaService.createMedia(mediaInput);
                  this.uploadedCount++;
                  console.log(`✅ Uploaded ${this.uploadedCount}/${this.totalToUpload}: ${file.name}`);
                  resolve();
                } catch (error) {
                  reject(error);
                }
              }
            },
            error: (error) => {
              console.error(`❌ Error uploading ${file.name}:`, error);
              reject(error);
            }
          });
        });
      }

      this.uploadProgress = 100;
      this.successMessage = 'admin.gallery.messages.upload_success';
      this.successMessageParams = { count: this.uploadedCount };
      this.closeUploadModal();
      this.subscribeToMedia();

      setTimeout(() => {
        this.successMessage = '';
        this.successMessageParams = {};
      }, 5000);
    } catch (error) {
      console.error('Error uploading media:', error);
      if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
        this.errorMessage = 'admin.gallery.messages.auth_required';
        this.errorMessageParams = {};
      } else {
        this.errorMessage = 'admin.gallery.messages.upload_failed';
        this.errorMessageParams = { message: error instanceof Error ? error.message : '' };
      }
    } finally {
      this.isUploading = false;
      this.isSaving = false;
      this.selectedFiles = [];
      this.revokeAllPreviewUrls();
    }
  }

  async onEditSubmit(): Promise<void> {
    if (!this.mediaToEdit?.id || this.isSaving) {
      return;
    }

    if (this.editForm.invalid) {
      this.markFormGroupTouched(this.editForm);
      this.errorMessage = 'admin.gallery.messages.required_fields';
      this.errorMessageParams = {};
      return;
    }

    const formValue = this.editForm.value;
    const tags: MediaTag[] = formValue.tags || [];
    const relatedProductIds: string[] = formValue.relatedProductIds || [];

    this.isSaving = true;
    this.errorMessage = '';
    this.errorMessageParams = {};

    try {
      await this.mediaService.updateMedia(this.mediaToEdit.id, {
        tags: tags as string[],
        altText: formValue.altText || '',
        caption: formValue.caption || '',
        relatedEntityIds: relatedProductIds.map(id => `products/${id}`)
      });

      this.subscribeToMedia();
      this.successMessage = 'admin.gallery.messages.media_updated';
      this.successMessageParams = {};
      this.mediaToEdit = {
        ...this.mediaToEdit,
        altText: formValue.altText || '',
        caption: formValue.caption || '',
        tags: tags as string[],
        relatedEntityIds: relatedProductIds.map(id => `products/${id}`)
      };
      this.editForm.markAsPristine();

      setTimeout(() => {
        this.successMessage = '';
        this.successMessageParams = {};
      }, 3000);
    } catch (error) {
      console.error('Error updating media:', error);
      this.errorMessage = 'admin.gallery.messages.media_update_failed';
      this.errorMessageParams = {};
    } finally {
      this.isSaving = false;
    }
  }

  openDeleteConfirm(media: Media): void {
    this.mediaToDelete = media;
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.mediaToDelete = null;
  }

  async confirmDelete(): Promise<void> {
    if (!this.mediaToDelete?.id) return;

    this.isSaving = true;

    try {
      // For gallery images, check if linked to products via relatedProductIds
      if (this.mediaToDelete.relatedEntityType === 'gallery' && 
          this.mediaToDelete.relatedEntityIds && 
          this.mediaToDelete.relatedEntityIds.length > 0) {
        
        // Extract product IDs from paths like 'products/apollo-white-12mm'
        const productIds = this.mediaToDelete.relatedEntityIds
          .map(id => id.replace('products/', ''))
          .filter(id => id); // Remove empty strings
        
        if (productIds.length > 0) {
          const relatedProducts = this.services.filter((s: ServiceItem) => productIds.includes(s.id || ''));
          if (relatedProducts.length > 0) {
            const productNames = relatedProducts.map((s: ServiceItem) => s.title).join(', ');
            this.errorMessage = 'admin.gallery.messages.delete_blocked';
            this.errorMessageParams = { services: productNames };
            this.isSaving = false;
            return;
          }
        }
      }

      const deletedId = this.mediaToDelete.id;

      // Delete media file from Storage and Firestore document
      await this.mediaService.deleteMediaWithFile(deletedId);
      this.mediaList = this.mediaList.filter(media => media.id !== deletedId);
      this.updateGalleryProjects();
      
      this.successMessage = 'admin.gallery.messages.media_deleted';
      this.successMessageParams = {};
      this.closeDeleteConfirm();

      setTimeout(() => {
        this.successMessage = '';
        this.successMessageParams = {};
      }, 3000);
    } catch (error) {
      console.error('Error deleting media:', error);
      this.errorMessage = 'admin.gallery.messages.media_delete_failed';
      this.errorMessageParams = {};
    } finally {
      this.isSaving = false;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.authService.signOutUser('/client/login');
    } catch (error) {
      console.error('Logout error:', error);
      this.errorMessage = 'admin.gallery.messages.logout_failed';
      this.errorMessageParams = {};
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  }

  // Form getters
  get altText() { return this.uploadForm.get('altText'); }
  get tags() { return this.uploadForm.get('tags'); }
  get relatedProductIds() { return this.uploadForm.get('relatedProductIds'); }

  get editAltText() { return this.editForm.get('altText'); }
  get editTags() { return this.editForm.get('tags'); }
  get editRelatedProductIds() { return this.editForm.get('relatedProductIds'); }
}


