import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { AuthService } from '../../../services/auth.service';
import { ProductsService } from '../../../services/products.service';
import { CategoryService } from '../../../services/category.service';
import { ModelService } from '../../../services/model.service';
import { TagService } from '../../../services/tag.service';
import { StorageService, UploadProgress } from '../../../services/storage.service';
import { MediaService } from '../../../services/media.service';
import { BenefitTemplateService } from '../../../services/benefit-template.service';
import { BulkPricingTier, Product, ProductBenefit, ProductVariant } from '../../../models/product';
import { Category, Model, Tag } from '../../../models/catalog';
import { BenefitTemplate } from '../../../models/benefit-template';
import { MediaCreateInput, MEDIA_VALIDATION } from '../../../models/media';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';
import { BrandConfigService } from '../../../core/services/brand-config.service';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { CollectionsService, CollectionDoc } from '../../../services/collections.service';

interface VariantDraft extends ProductVariant {
  tempId: string;
  imageFile?: File | null;
  imagePreview?: string | null;
}

@Component({
  selector: 'app-quick-add-product',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, TranslateModule, AdminSidebarComponent],
  templateUrl: './quick-add-product.page.html',
  styleUrl: './quick-add-product.page.scss'
})
export class QuickAddProductComponent extends LoadingComponentBase implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private productsService = inject(ProductsService);
  private categoryService = inject(CategoryService);
  private modelService = inject(ModelService);
  private tagService = inject(TagService);
  private storageService = inject(StorageService);
  private mediaService = inject(MediaService);
  private benefitTemplateService = inject(BenefitTemplateService);
  private brandConfig = inject(BrandConfigService);
  private collectionsService = inject(CollectionsService);

  categories: Category[] = [];
  models: Model[] = [];
  tags: Tag[] = [];
  collections: CollectionDoc[] = [];
  filteredModels: Model[] = [];
  benefitTemplates: BenefitTemplate[] = [];
  currentBenefits: ProductBenefit[] = [];
  selectedCollections: string[] = [];

  productForm: FormGroup;
  
  isSaving = false;
  isUploading = false;
  uploadProgress = 0;
  isEditMode = false;
  editingProductId: string | null = null;
  isCreatingCollection = false;

  // Image upload
  selectedCoverFile: File | null = null;
  coverPreview: string | null = null;
  galleryFiles: File[] = [];
  galleryPreviews: string[] = [];
  
  // Video upload
  selectedVideoFile: File | null = null;
  videoPreview: string | null = null;
  uploadingVideo = false;
  videoUploadProgress = 0;
  videoUploadComplete = false;
  
  // Store existing IDs when editing
  existingCoverImageId: string = '';
  existingGalleryImageIds: string[] = [];
  existingVideoUrl: string = '';
  
  // Technical Specifications
  newSpecKey = '';
  newSpecValue = '';
  currentSpecs: Record<string, any> = {};
  
  // Dynamic creation
  showNewCategoryInput = false;
  showNewModelInput = false;
  showNewCollectionInput = false;
  newCategoryName = '';
  newModelName = '';
  newCollectionName = '';
  newCollectionDescription = '';
  newCollectionSlug = '';
  collectionSlugManuallyEdited = false;
  newCollectionHeroPreview: string | null = null;
  newCollectionHeroFile: File | null = null;
  
  // Tag selection
  selectedTags: string[] = [];
  selectedCatalogOption: any = null;

  // Variants & bulk pricing
  variantDrafts: VariantDraft[] = [];
  bulkPricingTiers: BulkPricingTier[] = [];
  
  // SEO Preview
  seoPreviewTitle = '';
  seoPreviewDescription = '';
  seoPreviewUrl = '';
  slugManuallyEdited = false;
  seoManuallyEdited = false;

  successMessage = '';
  readonly brandName = this.brandConfig.siteName;

  constructor() {
    super();
    this.productForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      status: ['draft', Validators.required],
      description: [''],
      categoryId: ['', Validators.required],
      modelId: ['', Validators.required],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      sku: [''],
      weight: [0, Validators.min(0)],
      tags: [''],
      vendor: [this.brandConfig.siteName],
      videoUrl: [''],
      // SEO fields
      metaTitle: [''],
      metaDescription: [''],
      slug: ['']
    });
  }

  async ngOnInit() {
    // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(async () => {
      await this.checkAuth();
      
      // Check if we're in edit mode
      this.route.queryParams.subscribe(params => {
        if (params['id']) {
          this.isEditMode = true;
          this.editingProductId = params['id'];
        }
      });
      
      await this.loadData();
      
      // Load benefit templates
      this.benefitTemplateService.getActiveTemplates().subscribe({
        next: (templates) => {
          this.benefitTemplates = templates;
          this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading benefit templates:', err)
      });
      
      this.setupFormListeners();

      // If editing, load product data
      if (this.isEditMode && this.editingProductId) {
        await this.loadProduct(this.editingProductId);
      }
      
      this.cdr.detectChanges();
    });
  }

  private async checkAuth() {
    return new Promise<void>((resolve) => {
      this.authService.userProfile$.subscribe(async profile => {
        if (!profile) {
          // Not loaded yet, wait
          return;
        }
        
        if (profile.role !== 'admin') {
          console.log('Access denied: User is not admin');
          this.router.navigate(['/']);
          resolve();
          return;
        }
        
        // Admin verified, proceed
        resolve();
      });
    });
  }

  private async loadProduct(id: string) {
    try {
      const product = await firstValueFrom(this.productsService.getProduct(id));
      if (!product) {
        this.setError('Product not found');
        return;
      }

      this.isEditMode = true;
      this.editingProductId = id;

      this.productForm.patchValue({
        title: product.name,
        status: product.status || 'draft',
        description: product.description || '',
        categoryId: product.categoryId || '',
        modelId: product.modelId || '',
        price: product.price || 0,
        stock: product.stock || 0,
        sku: product.sku || '',
        weight: product.specs?.['weight'] || 0,
        tags: (product.tags || []).join(', '),
        vendor: this.brandName,
        metaTitle: product.seo?.title || '',
        metaDescription: product.seo?.metaDescription || '',
        slug: product.slug || ''
      }, { emitEvent: false });

      this.selectedCollections = [...(product.collectionIds || [])];

      // Load cover preview
      if (product.imageUrl) {
        this.coverPreview = product.imageUrl;
        this.existingCoverImageId = product.coverImage || '';
      }

      // Load video preview
      if (product.videoUrl) {
        this.existingVideoUrl = product.videoUrl;
        this.videoPreview = product.videoUrl;
        this.productForm.patchValue({ videoUrl: product.videoUrl }, { emitEvent: false });
      }

      // Load gallery previews
      if (product.galleryImageIds && product.galleryImageIds.length > 0) {
        this.existingGalleryImageIds = [...product.galleryImageIds];
        this.galleryPreviews = [];
        
        try {
          for (const item of product.galleryImageIds) {
            // Check if it's already a URL (starts with http)
            if (item.startsWith('http')) {
              this.galleryPreviews.push(item);
            } else if (item.startsWith('gs://') || item.startsWith('products/')) {
              // It's a storage path, get the download URL
              try {
                const url = await this.storageService.getDownloadUrl(item);
                this.galleryPreviews.push(url);
              } catch (error) {
                console.error('Error getting download URL for gallery image:', item, error);
              }
            } else {
              // Try to load as media ID
              try {
                const media = await this.mediaService.getMediaById(item);
                if (media?.url) {
                  this.galleryPreviews.push(media.url);
                }
              } catch (error) {
                console.error('Error loading gallery image by ID:', item, error);
              }
            }
          }
        } catch (error) {
          console.error('Error loading gallery images:', error);
        }
      }

      this.bulkPricingTiers = (product.bulkPricingTiers || []).map(tier => ({
        minQty: tier.minQty,
        unitPrice: tier.unitPrice,
        label: tier.label
      }));

      this.variantDrafts = (product.variants || []).map((variant) => this.createVariantDraft(variant));
      for (const draft of this.variantDrafts) {
        if (draft.imagePreview || !draft.imageId) {
          continue;
        }
        try {
          if (draft.imageId.startsWith('http')) {
            draft.imagePreview = draft.imageId;
            draft.imageUrl = draft.imageId;
            continue;
          }
          if (draft.imageId.startsWith('gs://') || draft.imageId.startsWith('products/')) {
            const url = await this.storageService.getDownloadUrl(draft.imageId);
            draft.imagePreview = url;
            draft.imageUrl = url;
            continue;
          }
          const media = await this.mediaService.getMediaById(draft.imageId);
          if (media?.url) {
            draft.imagePreview = media.url;
            draft.imageUrl = media.url;
          }
        } catch (error) {
          console.error('Error loading variant image preview:', error);
        }
      }

      // Update SEO preview
      this.updateSEOPreview();
      
      // Force change detection to update UI
      this.forceUpdate();
      
    } catch (error) {
      console.error('Error loading product:', error);
      this.setError('Failed to load product');
    }
  }

  private async loadData() {
    await this.withLoading(async () => {
      // Load categories, models, and tags in parallel
      const [categories, models, tags] = await Promise.all([
        firstValueFrom(this.categoryService.getAllCategories()),
        firstValueFrom(this.modelService.getAllModels()),
        firstValueFrom(this.tagService.getTags())
      ]);

      this.categories = categories;
      this.models = models;
      this.tags = tags;
      this.filteredModels = models;

      this.collections = await this.collectionsService.getAllCollections();
    }, true); // Show errors automatically
  }

  private setupFormListeners() {
    // Auto-generate slug/SEO unless manually edited
    this.productForm.get('title')?.valueChanges.subscribe(title => {
      if (title && !this.slugManuallyEdited) {
        const slug = this.generateSlug(title);
        this.productForm.patchValue({ slug }, { emitEvent: false });
      }
      if (title && !this.seoManuallyEdited) {
        this.productForm.patchValue(
          { metaTitle: `${title} | ${this.brandName}`.trim() },
          { emitEvent: false }
        );
      }
      this.updateSEOPreview();
    });

    // Filter models when category changes
    this.productForm.get('categoryId')?.valueChanges.subscribe(categoryId => {
      if (categoryId) {
        this.filteredModels = this.models.filter(m => m.categoryId === categoryId);
        // Reset model if it doesn't match the new category
        const currentModelId = this.productForm.get('modelId')?.value;
        if (currentModelId && !this.filteredModels.find(m => m.id === currentModelId)) {
          this.productForm.patchValue({ modelId: '' });
        }
      } else {
        this.filteredModels = this.models;
      }
    });

    // Update SKU when model changes
    this.productForm.get('modelId')?.valueChanges.subscribe(modelId => {
      if (modelId && !this.productForm.get('sku')?.value) {
        const model = this.models.find(m => m.id === modelId);
        if (model) {
          const sku = this.generateSKU(model.name);
          this.productForm.patchValue({ sku }, { emitEvent: false });
        }
      }
    });

    // Update SEO preview on description change
    this.productForm.get('description')?.valueChanges.subscribe((desc) => {
      if (!this.seoManuallyEdited) {
        this.productForm.patchValue({
          metaDescription: (desc || '').substring(0, 160)
        }, { emitEvent: false });
      }
      this.updateSEOPreview();
    });

    this.productForm.get('metaTitle')?.valueChanges.subscribe((val) => {
      if (val && val.length > 0) {
        this.seoManuallyEdited = true;
      }
      this.updateSEOPreview();
    });

    this.productForm.get('metaDescription')?.valueChanges.subscribe((val) => {
      if (val && val.length > 0) {
        this.seoManuallyEdited = true;
      }
      this.updateSEOPreview();
    });

    this.productForm.get('slug')?.valueChanges.subscribe((val) => {
      if (val && val.length > 0) {
        this.slugManuallyEdited = true;
      }
      this.updateSEOPreview();
    });
  }

  private generateSlug(title: string): string {
    if (!title) return '';
    
    const slug = title
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return slug;
  }

  private generateSKU(modelName: string): string {
    const prefix = modelName.substring(0, 3).toUpperCase();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}-${random}`;
  }

  private generateTempId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private createVariantDraft(data?: Partial<ProductVariant>): VariantDraft {
    return {
      tempId: this.generateTempId(),
      id: data?.id,
      label: data?.label ?? data?.finish,
      sku: data?.sku,
      price: data?.price ?? null,
      stock: data?.stock ?? 0,
      active: data?.active !== false,
      finish: data?.finish,
      imageId: data?.imageId,
      imageUrl: data?.imageUrl,
      imagePreview: data?.imageUrl || null
    };
  }

  addVariant() {
    this.variantDrafts.push(this.createVariantDraft());
  }

  removeVariant(index: number) {
    const [removed] = this.variantDrafts.splice(index, 1);
    if (removed?.imagePreview && removed.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(removed.imagePreview);
    }
  }

  onVariantImageSelected(event: Event, variant: VariantDraft) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const file = input.files[0];
    variant.imageFile = file;
    variant.imagePreview = URL.createObjectURL(file);
  }

  clearVariantImage(variant: VariantDraft) {
    if (variant.imagePreview && variant.imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(variant.imagePreview);
    }
    variant.imageFile = null;
    variant.imagePreview = null;
    variant.imageId = '';
    variant.imageUrl = '';
  }

  addBulkPricingTier() {
    this.bulkPricingTiers.push({ minQty: 2, unitPrice: 0 });
  }

  removeBulkPricingTier(index: number) {
    this.bulkPricingTiers.splice(index, 1);
  }

  private normalizeBulkPricingTiers(): BulkPricingTier[] {
    if (!this.bulkPricingTiers.length) {
      return [];
    }
    return this.bulkPricingTiers
      .map(tier => ({
        minQty: Math.max(1, Math.floor(Number(tier.minQty || 0))),
        unitPrice: Number(tier.unitPrice || 0),
        label: tier.label
      }))
      .filter(tier => Number.isFinite(tier.minQty) && Number.isFinite(tier.unitPrice) && tier.unitPrice >= 0)
      .sort((a, b) => a.minQty - b.minQty);
  }

  private ensureVariantId(seed: string, usedIds: Set<string>, index: number): string {
    let base = this.generateSlug(seed || `variant-${index + 1}`);
    if (!base) {
      base = `variant-${index + 1}`;
    }
    let id = base;
    let counter = 1;
    while (usedIds.has(id)) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    usedIds.add(id);
    return id;
  }

  private async buildVariantsPayload(slug: string): Promise<ProductVariant[]> {
    if (!this.variantDrafts.length) {
      return [];
    }

    const usedIds = new Set<string>();
    const variants: ProductVariant[] = [];

    for (let index = 0; index < this.variantDrafts.length; index += 1) {
      const draft = this.variantDrafts[index];
      const label = (draft.label || '').trim();
      const sku = (draft.sku || '').trim();
      const hasContent = !!(label || sku || draft.price !== null || draft.stock !== null || draft.imageFile || draft.imageUrl || draft.imageId);
      if (!hasContent) {
        continue;
      }

      const variantId = draft.id || this.ensureVariantId(label || sku || `variant-${index + 1}`, usedIds, index);
      const price = (draft.price === null || draft.price === undefined) ? null : Number(draft.price);
      const stock = (draft.stock === null || draft.stock === undefined) ? undefined : Math.max(0, Math.floor(Number(draft.stock)));

      let imageUrl = draft.imageUrl || '';
      let imageId = draft.imageId || '';

      if (draft.imageFile) {
        const storagePath = `products/variants/${slug}/${variantId}-${Date.now()}_${draft.imageFile.name}`;
        const uploadResult = await lastValueFrom(
          this.storageService.uploadFile(draft.imageFile, storagePath)
        );
        if (uploadResult.downloadURL) {
          imageUrl = uploadResult.downloadURL;
          imageId = storagePath;
        }
      }

      variants.push({
        id: variantId,
        label: label || undefined,
        sku: sku || undefined,
        finish: draft.finish || label || undefined,
        price,
        stock,
        active: draft.active !== false,
        imageId: imageId || undefined,
        imageUrl: imageUrl || undefined
      });
    }

    return variants;
  }

  private updateSEOPreview() {
    const title = this.productForm.get('metaTitle')?.value || this.productForm.get('title')?.value || '';
    const description = this.productForm.get('metaDescription')?.value || 
                       this.productForm.get('description')?.value?.substring(0, 160) || '';
    const slug = this.productForm.get('slug')?.value || '';
    
    this.seoPreviewTitle = title || 'Product Title';
    this.seoPreviewDescription = description || 'Product description will appear here...';
    this.seoPreviewUrl = `https://amarka.com/productos/${slug || 'product-url'}`;
  }

  onCoverImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > MEDIA_VALIDATION.MAX_SIZE) {
        this.errorMessage = 'admin.errors.file_too_large';
        return;
      }

      this.selectedCoverFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.coverPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onGalleryImagesSelected(event: any) {
    const files = Array.from(event.target.files) as File[];
    
    for (const file of files) {
      if (file.size > MEDIA_VALIDATION.MAX_SIZE) {
        this.errorMessage = 'admin.errors.file_too_large';
        return;
      }
    }

    this.galleryFiles = [...this.galleryFiles, ...files];

    // Create previews
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.galleryPreviews.push(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  removeGalleryImage(index: number) {
    // Check if this is an existing image or a newly added one
    const existingCount = this.existingGalleryImageIds.length;
    
    if (index < existingCount) {
      // Removing an existing gallery image
      this.existingGalleryImageIds.splice(index, 1);
      this.galleryPreviews.splice(index, 1);
    } else {
      // Removing a newly added file
      const fileIndex = index - existingCount;
      this.galleryFiles.splice(fileIndex, 1);
      this.galleryPreviews.splice(index, 1);
    }
  }

  removeCoverImage() {
    this.selectedCoverFile = null;
    this.coverPreview = null;
    this.existingCoverImageId = '';
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  async saveProduct() {
    if (this.productForm.invalid) {
      this.markFormGroupTouched(this.productForm);
      return;
    }

    this.isSaving = true;
    this.cdr.detectChanges();
    this.errorMessage = '';
    try {
      const formValue = this.productForm.value;

      // Upload cover image
      let coverImageUrl = '';
      let coverImageId = '';
      
      if (this.selectedCoverFile) {
        // New cover image uploaded
        const uploadResult = await lastValueFrom(
          this.storageService.uploadFile(
            this.selectedCoverFile,
            `products/covers/${Date.now()}_${this.selectedCoverFile.name}`
          )
        );
        if (uploadResult.downloadURL) {
          coverImageUrl = uploadResult.downloadURL;
          coverImageId = uploadResult.storagePath || '';
        }
      } else if (this.isEditMode && this.coverPreview) {
        // Editing and keeping existing cover image
        coverImageUrl = this.coverPreview;
        coverImageId = this.existingCoverImageId;
      }

      // Upload new gallery images and combine with existing ones
      const galleryUrls: string[] = [];
      
      // First, add existing gallery images (from galleryPreviews that aren't from new files)
      if (this.isEditMode && this.existingGalleryImageIds.length > 0) {
        // Add existing gallery image URLs (up to the number that existed)
        const existingCount = this.existingGalleryImageIds.length;
        for (let i = 0; i < Math.min(existingCount, this.galleryPreviews.length); i++) {
          // If this preview corresponds to an existing image, use the existing ID/URL
          if (i < this.existingGalleryImageIds.length) {
            const existingId = this.existingGalleryImageIds[i];
            // Use the URL if it's already a URL, otherwise use the ID
            galleryUrls.push(existingId.startsWith('http') ? existingId : this.galleryPreviews[i]);
          }
        }
      }
      
      // Then upload new gallery images
      for (const file of this.galleryFiles) {
        const uploadResult = await lastValueFrom(
          this.storageService.uploadFile(
            file,
            `products/gallery/${Date.now()}_${file.name}`
          )
        );
        if (uploadResult.downloadURL) {
          galleryUrls.push(uploadResult.downloadURL);
        }
      }

      // Upload video if provided (with progress feedback)
      let videoUrl = this.existingVideoUrl || formValue.videoUrl || '';
      if (this.selectedVideoFile) {
        this.uploadingVideo = true;
        this.videoUploadProgress = 0;
        this.videoUploadComplete = false;
        this.cdr.detectChanges();

        try {
          await new Promise<void>((resolve, reject) => {
            this.storageService.uploadFile(
              this.selectedVideoFile!,
              `products/videos/${Date.now()}_${this.selectedVideoFile!.name}`
            ).subscribe({
              next: (res) => {
                if (typeof res.progress === 'number') {
                  this.videoUploadProgress = Math.round(res.progress);
                  this.cdr.detectChanges();
                }
                if (res.downloadURL) {
                  videoUrl = res.downloadURL;
                  this.videoPreview = videoUrl;
                  this.productForm.patchValue({ videoUrl });
                  this.existingVideoUrl = videoUrl;
                  this.cdr.detectChanges();
                }
              },
              error: (err) => reject(err),
              complete: () => resolve()
            });
          });
          this.videoUploadComplete = true;
          this.videoPreview = videoUrl;
          this.productForm.patchValue({ videoUrl });
          this.existingVideoUrl = videoUrl;
          this.selectedVideoFile = null;
        } catch (error) {
          console.error('Error uploading video:', error);
          this.errorMessage = 'Failed to upload video';
          throw error;
        } finally {
          this.uploadingVideo = false;
          this.cdr.detectChanges();
        }
      }

      const slug = formValue.slug || this.generateSlug(formValue.title);
      const variants = await this.buildVariantsPayload(slug);
      const bulkPricingTiers = this.normalizeBulkPricingTiers();

      const productPayload: Omit<Product, 'id'> = {
        name: formValue.title,
        slug,
        description: formValue.description || '',
        categoryId: formValue.categoryId,
        modelId: formValue.modelId,
        price: formValue.price || 0,
        stock: formValue.stock || 0,
        sku: formValue.sku || '',
        size: '',
        imageUrl: coverImageUrl,
        galleryImageIds: galleryUrls,
        tags: (formValue.tags || '').split(',').map((t: string) => t.trim()).filter((t: string) => t),
        collectionIds: [...this.selectedCollections],
        status: formValue.status || 'draft',
        variantMode: variants.length ? 'embedded' : undefined,
        variants: variants.length ? variants : undefined,
        bulkPricingTiers: bulkPricingTiers.length ? bulkPricingTiers : undefined,
        specs: {
          weight: formValue.weight || 0,
          ...this.currentSpecs
        },
        videoUrl,
        seo: {
          title: formValue.metaTitle || '',
          metaDescription: formValue.metaDescription || '',
          ogImage: coverImageUrl || ''
        },
        coverImage: coverImageUrl,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      console.log('💾 Saving product with video:', { videoUrl, hasVideo: !!videoUrl });

      if (this.isEditMode && this.editingProductId) {
        await this.productsService.updateProduct(this.editingProductId, productPayload);
        this.successMessage = 'admin.product_updated';
      } else {
        const newId = await this.productsService.addProduct(productPayload);
        this.editingProductId = newId;
        this.successMessage = 'admin.product_created';
        console.log('✅ Product created with ID:', newId, 'videoUrl:', videoUrl);
      }

      this.forceUpdate();
    } catch (error) {
      console.error('Error saving product:', error);
      this.setError('Failed to save product');
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  cancel() {
    this.router.navigate(['/admin/products']);
  }

  async logout() {
    await this.authService.signOutUser('/client/login');
  }

  // Inline create category
  async createCategoryInline() {
    const name = this.newCategoryName.trim();
    if (!name) return;
    
    try {
      const slug = this.generateSlug(name);
      const order = (this.categories.length || 0) + 1;
      
      const newCategory: Omit<Category, 'id'> = {
        name,
        slug,
        order,
        active: true
      };
      
      const id = await this.categoryService.addCategory(newCategory);
      await this.loadData();
      this.productForm.patchValue({ categoryId: id });
      this.newCategoryName = '';
      this.showNewCategoryInput = false;
    } catch (error) {
      console.error('Error creating category:', error);
      this.setError('Failed to create category');
    }
  }

  // Inline create model
  async createModelInline() {
    const name = this.newModelName.trim();
    const categoryId = this.productForm.get('categoryId')?.value;
    if (!name || !categoryId) return;
    
    try {
      const slug = this.generateSlug(name);
      
      const newModel: Omit<Model, 'id'> = {
        name,
        slug,
        categoryId,
        active: true
      };
      
      const id = await this.modelService.addModel(newModel);
      await this.loadData();
      this.productForm.patchValue({ modelId: id });
      this.newModelName = '';
      this.showNewModelInput = false;
    } catch (error) {
      console.error('Error creating model:', error);
      this.setError('Failed to create model');
    }
  }

  // Benefit helpers
  addBenefitFromTemplate(template: BenefitTemplate) {
    if (!template?.description) return;
    if (this.currentBenefits.length >= 4) return;
    this.currentBenefits.push({
      icon: template.icon || 'star',
      iconColor: template.iconColor || 'ts-accent',
      title: template.title || '',
      description: template.description || ''
    });
  }

  removeBenefit(index: number) {
    this.currentBenefits.splice(index, 1);
  }

  addSpec() {
    const key = this.newSpecKey.trim();
    const value = this.newSpecValue.trim();
    if (!key || !value) return;
    this.currentSpecs[key] = value;
    this.newSpecKey = '';
    this.newSpecValue = '';
  }

  removeSpec(key: string) {
    delete this.currentSpecs[key];
  }

  // Collection management
  isCollectionSelected(slug: string): boolean {
    return this.selectedCollections.includes(slug);
  }

  toggleCollection(collection: CollectionDoc) {
    const slug = collection.slug;
    const index = this.selectedCollections.indexOf(slug);
    if (index > -1) {
      this.selectedCollections.splice(index, 1);
    } else {
      this.selectedCollections.push(slug);
    }
  }

  async createCollectionInline() {
    const name = this.newCollectionName.trim();
    if (!name || this.isCreatingCollection) return;

    this.isCreatingCollection = true;
    const slug = this.newCollectionSlug || this.generateSlug(name);
    let heroImageUrl = '';

    try {
      if (this.newCollectionHeroFile) {
        const uploadResult = await lastValueFrom(
          this.storageService.uploadFile(
            this.newCollectionHeroFile,
            `collections/hero/${Date.now()}_${this.newCollectionHeroFile.name}`
          )
        );
        heroImageUrl = uploadResult.downloadURL || '';
      }

      const payload: Omit<CollectionDoc, 'id'> = {
        name,
        slug,
        description: this.newCollectionDescription || '',
        heroImageUrl: heroImageUrl || undefined,
        active: true,
        seo: {
          title: name,
          description: this.newCollectionDescription || `Shop ${name} at ${this.brandName}`
        }
      };

      await this.collectionsService.addCollection(payload);
      this.collections = await this.collectionsService.getAllCollections();
      if (!this.selectedCollections.includes(slug)) {
        this.selectedCollections.push(slug);
      }

      this.newCollectionName = '';
      this.newCollectionDescription = '';
      this.newCollectionSlug = '';
      this.newCollectionHeroPreview = null;
      this.newCollectionHeroFile = null;
      this.collectionSlugManuallyEdited = false;
      this.showNewCollectionInput = false;
    } catch (error) {
      console.error('Error creating collection inline:', error);
      this.setError('Failed to create collection');
    } finally {
      this.isCreatingCollection = false;
    }
  }

  onCollectionHeroSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    this.newCollectionHeroFile = file;
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.newCollectionHeroPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  onCollectionNameChange() {
    if (this.collectionSlugManuallyEdited) return;
    if (!this.newCollectionName) {
      this.newCollectionSlug = '';
      return;
    }
    this.newCollectionSlug = this.generateSlug(this.newCollectionName);
  }

  onCollectionSlugChange() {
    this.collectionSlugManuallyEdited = !!this.newCollectionSlug;
  }

  // Tag management
  isTagSelected(tag: Tag): boolean {
    return this.selectedTags.includes(tag.id!);
  }

  toggleTag(tag: Tag) {
    if (!tag.id) return;
    const index = this.selectedTags.indexOf(tag.id);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag.id);
    }
    // Update form value
    const tagNames = this.selectedTags
      .map(id => this.tags.find(t => t.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    this.productForm.patchValue({ tags: tagNames }, { emitEvent: false });
  }

  // Category and Model change handlers
  onCategoryChange() {
    const categoryId = this.productForm.get('categoryId')?.value;
    if (categoryId) {
      this.filteredModels = this.models.filter(m => m.categoryId === categoryId);
      const currentModelId = this.productForm.get('modelId')?.value;
      if (currentModelId && !this.filteredModels.find(m => m.id === currentModelId)) {
        this.productForm.patchValue({ modelId: '' });
      }
    } else {
      this.filteredModels = this.models;
    }
  }

  onModelChange() {
    const modelId = this.productForm.get('modelId')?.value;
    if (modelId && !this.productForm.get('sku')?.value) {
      const model = this.models.find(m => m.id === modelId);
      if (model) {
        const sku = this.generateSKU(model.name);
        this.productForm.patchValue({ sku }, { emitEvent: false });
      }
    }
  }

  // Image upload handlers for template
  onCoverSelected(event: any) {
    this.onCoverImageSelected(event);
  }

  onGallerySelected(event: any) {
    this.onGalleryImagesSelected(event);
  }

  onVideoSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file');
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      alert('Video file is too large. Maximum size is 50MB');
      return;
    }

    this.selectedVideoFile = file;
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      this.videoPreview = e.target?.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
    this.cdr.detectChanges();
  }

  removeVideo() {
    this.videoPreview = null;
    this.selectedVideoFile = null;
    this.productForm.patchValue({ videoUrl: '' });
    this.existingVideoUrl = '';
    this.videoUploadProgress = 0;
    this.videoUploadComplete = false;
  }
}
