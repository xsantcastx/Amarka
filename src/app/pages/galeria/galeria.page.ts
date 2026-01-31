import { Component, OnInit, inject, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { CategoriaGaleria, GaleriaItem } from '../../core/services/data.service';
import { Firestore, collection, query, where, orderBy, getDocs, QueryDocumentSnapshot } from '@angular/fire/firestore';
import { Auth, user } from '@angular/fire/auth';
import { firstValueFrom, Subscription } from 'rxjs';
import { Media } from '../../models/media';
import { Tag } from '../../models/catalog';
import { MediaLike, MediaComment } from '../../models/media-interaction';
import { TagService } from '../../services/tag.service';
import { LoadingComponentBase } from '../../core/classes/loading-component.base';
import { MetaService } from '../../services/meta.service';
import { SettingsService } from '../../services/settings.service';
import { MediaInteractionService } from '../../services/media-interaction.service';

// Gallery Project interface - groups multiple images by project name
interface GalleryProject {
  id: string; // Unique project identifier (slugified project name)
  name: string; // Project name (from altText)
  description: string; // Project description (from caption)
  location: string; // Location extracted from caption
  tags: string[]; // All tags from images in this project
  images: Media[]; // All images belonging to this project
  featuredImage: Media; // First/main image to display
  photoCount: number; // Total number of photos
  uploadedAt: Date; // Most recent upload date
}

@Component({
  selector: 'app-galeria-page',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, RouterLink, PageHeaderComponent],
  templateUrl: './galeria.page.html',
  styleUrl: './galeria.page.scss'
})
export class GaleriaPageComponent extends LoadingComponentBase implements OnInit, AfterViewInit {
  @ViewChild('thumbnailContainer') thumbnailContainer?: ElementRef<HTMLDivElement>;
  
  categorias: CategoriaGaleria[] = [];
  categoriaActiva = 'todos';
  itemsVisible: GaleriaItem[] = [];
  
  // Project-based properties
  allProjects: GalleryProject[] = [];
  filteredProjects: GalleryProject[] = [];
  selectedProject: GalleryProject | null = null;
  currentImageIndex = 0;
  
  availableTags: Tag[] = [];
  
  // Filter panel visibility
  showFilters = false; // Hide filters by default
  
  // View mode: 'projects' or 'grid'
  viewMode: 'projects' | 'grid' = 'grid'; // Default to grid view
  
  // Infinite scroll for grid view
  displayedImagesCount = 20; // Initial load
  readonly imagesPerLoad = 20; // Load 20 more each time
  isLoadingMore = false;
  private cachedGridImages: { project: GalleryProject; image: Media; imageIndex: number }[] = [];
  isGridViewMode = false; // Track if opened from grid view to maintain shuffled order
  
  // Interaction counts cache for grid images
  mediaInteractionCounts = new Map<string, { likes: number; comments: number }>();
  
  // Sorting and filtering
  sortBy: 'recent' | 'popular' | 'random' = 'random';
  filterByService: string = 'all'; // 'all' or service tag slug
  
  // Media interactions
  currentMediaLikes: MediaLike[] = [];
  currentMediaComments: MediaComment[] = [];
  currentUserLiked = false;
  likeCount = 0;
  commentCount = 0;
  newComment = '';
  isSubmittingComment = false;
  showComments = false;
  
  // Heart animation
  showHeartAnimation = false;
  heartAnimationTimeout?: any;
  
  // Auth
  currentUser: any = null;
  private userSubscription?: Subscription;
  private likesSubscription?: Subscription;
  private commentsSubscription?: Subscription;
  
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private tagService = inject(TagService);
  private metaService = inject(MetaService);
  private settingsService = inject(SettingsService);
  private auth = inject(Auth);
  private mediaInteractionService = inject(MediaInteractionService);
  protected override cdr = inject(ChangeDetectorRef);

  // Hero settings
  heroImage = '/assets/gallery/hero-gallery.jpg';
  heroTitle = 'Event design, florals, and seasonal installs we love';
  heroSubtitle = 'Explore weddings, brand activations, private celebrations, and botanical styling crafted with our ivory and gold aesthetic.';

  constructor(
    private firestore: Firestore
  ) {
    super(); // Call parent constructor
  }

  ngOnInit() {
    // Set page meta tags from settings
    this.metaService.setPageMeta({
      title: 'GALLERY.TITLE',
      description: 'GALLERY.DESCRIPTION'
    });

    // Load hero settings
    this.loadHeroSettings();

    // Subscribe to auth state
    if (this.isBrowser) {
      this.userSubscription = user(this.auth).subscribe(firebaseUser => {
        this.currentUser = firebaseUser;
      });
    }

    // Load gallery from Firestore only
    if (this.isBrowser) {
      this.loadTagsAndGallery();
    } else {
      this.isLoading = false;
    }
  }

  ngAfterViewInit() {
    // ViewChild references available here
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.likesSubscription?.unsubscribe();
    this.commentsSubscription?.unsubscribe();
    
    if (this.heartAnimationTimeout) {
      clearTimeout(this.heartAnimationTimeout);
    }
  }

  private async loadHeroSettings() {
    try {
      const settings = await this.settingsService.getSettings();
      this.heroImage = settings.galeriaHeroImage || this.heroImage;
      this.heroTitle = settings.galeriaHeroTitle || this.heroTitle;
      this.heroSubtitle = settings.galeriaHeroSubtitle || this.heroSubtitle;
    } catch (error) {
      console.error('[Galeria] Error loading hero settings:', error);
    }
  }

  private async loadTagsAndGallery(): Promise<void> {
    try {
      const tags = await firstValueFrom(this.tagService.getActiveTags());
      this.availableTags = tags;
      console.log('[Gallery] Tags loaded:', tags.length);
    } catch (error) {
      console.error('[Gallery] Error loading tags:', error);
      this.availableTags = [];
    } finally {
      await this.loadGaleriaFromFirebase();
    }
  }

  private async loadGaleriaFromFirebase() {
    await this.withLoading(async () => {
      // Load all gallery media from Media collection (relatedEntityType='gallery')
      const mediaQuery = query(
        collection(this.firestore, 'media'),
        where('relatedEntityType', '==', 'gallery')
        // Note: orderBy removed to avoid index requirement - sorting in memory instead
      );
      
      const snapshot = await getDocs(mediaQuery);
      const mediaItems: Media[] = snapshot.docs
        .map((doc: QueryDocumentSnapshot) => ({
          id: doc.id,
          ...doc.data() as Omit<Media, 'id'>
        }))
        .sort((a, b) => {
          // Sort by uploadedAt descending (newest first) in memory
          const dateA = a.uploadedAt instanceof Date ? a.uploadedAt : (a.uploadedAt as any).toDate();
          const dateB = b.uploadedAt instanceof Date ? b.uploadedAt : (b.uploadedAt as any).toDate();
          return dateB.getTime() - dateA.getTime();
        });
      
      console.log('[Gallery] Loaded from Firestore:', mediaItems.length, 'images');
      
      if (mediaItems.length > 0) {
        // Group media by project name (altText)
        this.allProjects = this.groupMediaByProjects(mediaItems);
        this.filtrarPorCategoria(this.categoriaActiva);
        // Initialize grid cache
        this.regenerateGridCache();
      } else {
        console.log('[Gallery] No gallery images found in Firestore');
        this.allProjects = [];
        this.filteredProjects = [];
      }
    });
  }

  // Group media by project name - Create project objects from media items
  private groupMediaByProjects(mediaItems: Media[]): GalleryProject[] {
    const projectsMap = new Map<string, GalleryProject>();

    mediaItems.forEach(media => {
      // Extract base project name (remove numbering like "(1/5)")
      const baseProjectName = this.extractBaseProjectName(media.altText || 'Untitled Project');
      const projectId = this.slugify(baseProjectName);

      // Extract location from caption (text before first dash or full caption)
      const location = this.extractLocation(media.caption || '');
      // Extract description (text after location/dash)
      const description = this.extractDescription(media.caption || '', location);

      if (!projectsMap.has(projectId)) {
        // Create new project
        const uploadDate = media.uploadedAt instanceof Date 
          ? media.uploadedAt 
          : (media.uploadedAt as any).toDate();

        projectsMap.set(projectId, {
          id: projectId,
          name: baseProjectName,
          description: description,
          location: location,
          tags: [...media.tags],
          images: [media],
          featuredImage: media,
          photoCount: 1,
          uploadedAt: uploadDate
        });
      } else {
        // Add to existing project
        const project = projectsMap.get(projectId)!;
        project.images.push(media);
        project.photoCount++;
        
        // Merge tags (unique only)
        media.tags.forEach(tag => {
          if (!project.tags.includes(tag)) {
            project.tags.push(tag);
          }
        });

        // Update uploadedAt to most recent
        const mediaDate = media.uploadedAt instanceof Date 
          ? media.uploadedAt 
          : (media.uploadedAt as any).toDate();
        
        if (mediaDate > project.uploadedAt) {
          project.uploadedAt = mediaDate;
        }
      }
    });

    // Convert map to array and sort by upload date (newest first)
    const projects = Array.from(projectsMap.values()).sort((a, b) => 
      b.uploadedAt.getTime() - a.uploadedAt.getTime()
    );

    console.log('[Gallery] Created', projects.length, 'projects from', mediaItems.length, 'images');
    return projects;
  }

  // Extract base project name by removing numbering patterns like "(1/5)" or " - 1"
  private extractBaseProjectName(altText: string): string {
    // Remove patterns like "(1/5)", "(1 of 5)", "- 1", etc.
    return altText
      .replace(/\s*\(\d+\/\d+\)\s*$/i, '')
      .replace(/\s*\(\d+\s+of\s+\d+\)\s*$/i, '')
      .replace(/\s*-\s*\d+\s*$/i, '')
      .replace(/\s*#\d+\s*$/i, '')
      .trim();
  }

  // Extract location from caption (text before dash or full text)
  private extractLocation(caption: string): string {
    const dashIndex = caption.indexOf('-');
    if (dashIndex > 0) {
      return caption.substring(0, dashIndex).trim();
    }
    // Try comma separation (e.g., "Texas, USA")
    const commaIndex = caption.indexOf(',');
    if (commaIndex > 0) {
      return caption.substring(0, commaIndex + 4).trim(); // Include country code
    }
    return caption.trim();
  }

  // Extract description from caption (text after location)
  private extractDescription(caption: string, location: string): string {
    const dashIndex = caption.indexOf('-');
    if (dashIndex > 0) {
      // Return text after the dash
      return caption.substring(dashIndex + 1).trim();
    }
    // If location is same as caption, return empty (no separate description)
    if (location.trim() === caption.trim()) {
      return '';
    }
    return caption.trim();
  }

  // Create URL-friendly slug from project name
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  // Get tag by slug for accessing color/icon
  getTag(slug: string): Tag | undefined {
    return this.availableTags.find(t => t.slug === slug);
  }

  // Get unique tags from all projects for filter buttons
  getAvailableProjectTags(): Tag[] {
    const tagSlugs = new Set<string>();
    this.allProjects.forEach(project => {
      project.tags.forEach(tag => tagSlugs.add(tag));
    });

    return this.availableTags.filter(tag => tagSlugs.has(tag.slug));
  }

  // Filter projects by tag
  filtrarPorCategoria(tagSlug: string) {
    this.categoriaActiva = tagSlug;
    
    if (tagSlug === 'todos') {
      this.filteredProjects = [...this.allProjects];
    } else {
      this.filteredProjects = this.allProjects.filter(project => 
        project.tags.includes(tagSlug)
      );
    }
    
    // Regenerate grid cache when filters change
    this.regenerateGridCache();
    
    // Reset infinite scroll when filter changes
    this.displayedImagesCount = 20;
    
    // Close modal if open
    if (this.selectedProject) {
      this.cerrarModal();
    }
  }

  // Get count of projects for a specific tag
  getProjectCountByTag(tagSlug: string): number {
    if (tagSlug === 'todos') {
      return this.allProjects.length;
    }
    return this.allProjects.filter(project => project.tags.includes(tagSlug)).length;
  }

  // Open project modal to view all images
  abrirProyecto(project: GalleryProject) {
    this.selectedProject = project;
    this.currentImageIndex = 0;
    this.isGridViewMode = false; // Reset grid view mode
    
    // Load interactions for current image
    this.loadCurrentImageInteractions();
    
    // Prevent body scroll when modal is open
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
  }

  // Open modal from grid view maintaining shuffled order
  openFromGrid(gridIndex: number) {
    const gridImages = this.getVisibleGridImages();
    if (gridIndex < 0 || gridIndex >= gridImages.length) return;
    
    const item = gridImages[gridIndex];
    this.selectedProject = item.project;
    this.currentImageIndex = gridIndex; // Use grid index
    this.isGridViewMode = true; // Enable grid view mode
    
    // Load interactions for current image
    this.loadCurrentImageInteractions();
    
    // Prevent body scroll when modal is open
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
  }

  cerrarModal() {
    this.selectedProject = null;
    this.currentImageIndex = 0;
    this.isGridViewMode = false;
    this.showComments = false;
    this.newComment = '';
    
    // Unsubscribe from interactions
    this.likesSubscription?.unsubscribe();
    this.commentsSubscription?.unsubscribe();
    
    // Restore body scroll
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  anteriorImagen() {
    if (!this.selectedProject) return;
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      this.scrollThumbnailIntoView();
      this.loadCurrentImageInteractions();
    }
  }

  siguienteImagen() {
    if (!this.selectedProject) return;
    
    const maxIndex = this.isGridViewMode 
      ? this.getVisibleGridImages().length - 1
      : this.selectedProject.images.length - 1;
    
    if (this.currentImageIndex < maxIndex) {
      this.currentImageIndex++;
      this.scrollThumbnailIntoView();
      this.loadCurrentImageInteractions();
    }
  }

  // Select specific image by index (from thumbnail click)
  selectImage(index: number) {
    if (!this.selectedProject) return;
    
    const maxIndex = this.isGridViewMode
      ? this.getVisibleGridImages().length - 1
      : this.selectedProject.images.length - 1;
    
    if (index < 0 || index > maxIndex) return;
    
    this.currentImageIndex = index;
    this.scrollThumbnailIntoView();
    this.loadCurrentImageInteractions();
  }

  // Get thumbnail images based on current mode
  getThumbnailImages(): Media[] {
    if (!this.selectedProject) return [];
    
    if (this.isGridViewMode) {
      return this.getVisibleGridImages().map(item => item.image);
    }
    
    return this.selectedProject.images;
  }

  // Get interaction counts for a specific media item
  getInteractionCounts(mediaId: string): { likes: number; comments: number } {
    return this.mediaInteractionCounts.get(mediaId) || { likes: 0, comments: 0 };
  }

  // Load interaction counts for all visible grid images
  private async loadGridInteractionCounts() {
    const gridImages = this.getVisibleGridImages();
    
    for (const item of gridImages) {
      const imageId = item.image.id || '';
      if (imageId && !this.mediaInteractionCounts.has(imageId)) {
        // Subscribe to get counts
        this.mediaInteractionService.getMediaLikes(imageId).subscribe(likes => {
          const current = this.mediaInteractionCounts.get(imageId) || { likes: 0, comments: 0 };
          this.mediaInteractionCounts.set(imageId, { ...current, likes: likes.length });
        });
        
        this.mediaInteractionService.getMediaComments(imageId).subscribe(comments => {
          const current = this.mediaInteractionCounts.get(imageId) || { likes: 0, comments: 0 };
          this.mediaInteractionCounts.set(imageId, { ...current, comments: comments.length });
        });
      }
    }
  }

  // Get current image from selected project
  getCurrentImage(): Media | null {
    if (!this.selectedProject) return null;
    
    // If in grid view mode, use the shuffled grid order
    if (this.isGridViewMode) {
      const gridImages = this.getVisibleGridImages();
      return gridImages[this.currentImageIndex]?.image || null;
    }
    
    // Otherwise use project's original order
    return this.selectedProject.images[this.currentImageIndex] || null;
  }

  // Get current project (updates in grid mode as you navigate)
  getCurrentProject(): GalleryProject | null {
    if (!this.selectedProject) return null;
    
    // If in grid view mode, get the project for the current grid image
    if (this.isGridViewMode) {
      const gridImages = this.getVisibleGridImages();
      return gridImages[this.currentImageIndex]?.project || null;
    }
    
    // Otherwise use the selected project
    return this.selectedProject;
  }

  // Keyboard shortcuts: arrow keys for navigation, escape to close
  // See onKeydown method below

  // Keyboard navigation
  onKeydown(event: KeyboardEvent) {
    if (!this.selectedProject) return;
    
    switch (event.key) {
      case 'Escape':
        this.cerrarModal();
        break;
      case 'ArrowLeft':
        this.anteriorImagen();
        break;
      case 'ArrowRight':
        this.siguienteImagen();
        break;
    }
  }

  // Get total projects count
  getTotalProjects(): number {
    return this.filteredProjects.length;
  }

  // Get category title from tag
  getCategoryTitle(slug: string): string {
    const tag = this.getTag(slug);
    return tag ? tag.name : this.toTitleCase(slug);
  }

  // Toggle filter panel visibility
  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  // Scroll thumbnail into view when navigating
  private scrollThumbnailIntoView() {
    if (!this.isBrowser || !this.thumbnailContainer) return;
    
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      const container = this.thumbnailContainer?.nativeElement;
      if (!container) return;
      
      const thumbnails = container.querySelectorAll('button');
      const activeThumbnail = thumbnails[this.currentImageIndex];
      
      if (activeThumbnail) {
        activeThumbnail.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }, 0);
  }

  // ===== INFINITE SCROLL FOR GRID VIEW =====
  
  // Regenerate the cached grid images (call when filters change)
  private regenerateGridCache() {
    const images: { project: GalleryProject; image: Media; imageIndex: number }[] = [];
    
    this.filteredProjects.forEach(project => {
      project.images.forEach((image, index) => {
        images.push({ project, image, imageIndex: index });
      });
    });
    
    // Apply sorting based on selected option
    if (this.sortBy === 'random') {
      // Weighted random shuffle: newer images have higher priority
      this.cachedGridImages = this.weightedRandomShuffle(images);
    } else if (this.sortBy === 'recent') {
      // Sort by upload date (newest first)
      this.cachedGridImages = images.sort((a, b) => {
        const dateA = a.image.uploadedAt instanceof Date ? a.image.uploadedAt : (a.image.uploadedAt as any).toDate();
        const dateB = b.image.uploadedAt instanceof Date ? b.image.uploadedAt : (b.image.uploadedAt as any).toDate();
        return dateB.getTime() - dateA.getTime();
      });
    } else if (this.sortBy === 'popular') {
      // Sort by likes + comments (most popular first)
      this.cachedGridImages = images.sort((a, b) => {
        const countsA = this.getInteractionCounts(a.image.id || '');
        const countsB = this.getInteractionCounts(b.image.id || '');
        const scoreA = countsA.likes + countsA.comments;
        const scoreB = countsB.likes + countsB.comments;
        return scoreB - scoreA;
      });
    }
    
    // Load interaction counts for visible images
    if (this.isBrowser) {
      setTimeout(() => this.loadGridInteractionCounts(), 100);
    }
  }
  
  // Get all images from filtered projects for grid view with weighted random order
  getGridImages(): { project: GalleryProject; image: Media; imageIndex: number }[] {
    // Return cached version to prevent re-shuffling on every change detection
    if (this.cachedGridImages.length === 0) {
      this.regenerateGridCache();
    }
    return this.cachedGridImages;
  }

  // Weighted random shuffle prioritizing newer images
  private weightedRandomShuffle(
    items: { project: GalleryProject; image: Media; imageIndex: number }[]
  ): { project: GalleryProject; image: Media; imageIndex: number }[] {
    if (items.length === 0) return items;
    
    // Find the newest upload date
    const dates = items.map(item => {
      const uploadDate = item.image.uploadedAt instanceof Date 
        ? item.image.uploadedAt 
        : (item.image.uploadedAt as any).toDate();
      return uploadDate.getTime();
    });
    const newestDate = Math.max(...dates);
    const oldestDate = Math.min(...dates);
    const dateRange = newestDate - oldestDate || 1; // Avoid division by zero
    
    // Assign weights based on recency (newer = higher weight)
    const weightedItems = items.map(item => {
      const uploadDate = item.image.uploadedAt instanceof Date 
        ? item.image.uploadedAt 
        : (item.image.uploadedAt as any).toDate();
      const dateScore = uploadDate.getTime();
      
      // Weight formula: newer images get exponentially higher weights
      // Recent images: weight ~8-10, older images: weight ~1-3
      const recencyScore = (dateScore - oldestDate) / dateRange;
      const weight = Math.pow(recencyScore * 9 + 1, 2); // Range: 1 to 100
      
      return {
        item,
        weight,
        random: Math.random()
      };
    });
    
    // Sort by weighted random score (weight * random for variety)
    weightedItems.sort((a, b) => {
      const scoreA = a.weight * a.random;
      const scoreB = b.weight * b.random;
      return scoreB - scoreA; // Descending order
    });
    
    return weightedItems.map(w => w.item);
  }

  // Get visible images for current scroll position
  getVisibleGridImages(): { project: GalleryProject; image: Media; imageIndex: number }[] {
    return this.getGridImages().slice(0, this.displayedImagesCount);
  }

  // Load more images when scrolling
  loadMoreImages() {
    if (this.isLoadingMore) return;
    
    const totalImages = this.getGridImages().length;
    if (this.displayedImagesCount >= totalImages) return;
    
    this.isLoadingMore = true;
    
    // Simulate brief loading delay for smoother UX
    setTimeout(() => {
      this.displayedImagesCount += this.imagesPerLoad;
      this.isLoadingMore = false;
      
      // Load interaction counts for newly visible images
      if (this.isBrowser) {
        this.loadGridInteractionCounts();
      }
    }, 300);
  }

  // Check if there are more images to load
  hasMoreImages(): boolean {
    return this.displayedImagesCount < this.getGridImages().length;
  }

  // Change sort order
  changeSortOrder(sortBy: 'recent' | 'popular' | 'random') {
    this.sortBy = sortBy;
    this.regenerateGridCache();
    this.displayedImagesCount = 20;
  }

  // Filter by service/tag
  filterByServiceTag(tagSlug: string) {
    this.filterByService = tagSlug;
    if (tagSlug === 'all') {
      this.filtrarPorCategoria('todos');
    } else {
      this.filtrarPorCategoria(tagSlug);
    }
  }

  // Convert slug to title case for display
  private toTitleCase(text: string): string {
    return text
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  // ===== MEDIA INTERACTIONS (LIKES & COMMENTS) =====

  /**
   * Load likes and comments for the current image
   */
  private loadCurrentImageInteractions() {
    if (!this.selectedProject) return;
    
    const currentImage = this.getCurrentImage();
    console.log('[Gallery Interactions] Current image:', currentImage);
    
    if (!currentImage || !currentImage.id) {
      console.warn('[Gallery Interactions] No current image or missing ID');
      return;
    }

    console.log('[Gallery Interactions] Loading interactions for media ID:', currentImage.id);

    // Reset counts immediately to prevent showing old data
    this.likeCount = 0;
    this.commentCount = 0;
    this.currentUserLiked = false;
    this.currentMediaLikes = [];
    this.currentMediaComments = [];
    this.showComments = false;
    this.newComment = '';

    // Unsubscribe from previous subscriptions
    this.likesSubscription?.unsubscribe();
    this.commentsSubscription?.unsubscribe();

    // Subscribe to likes
    this.likesSubscription = this.mediaInteractionService
      .getMediaLikes(currentImage.id)
      .subscribe(likes => {
        console.log('[Gallery Interactions] Likes loaded:', likes.length, likes);
        this.currentMediaLikes = likes;
        this.likeCount = likes.length;
        
        // Check if current user has liked
        if (this.currentUser) {
          this.currentUserLiked = likes.some(like => like.userId === this.currentUser.uid);
        } else {
          this.currentUserLiked = false;
        }
        
        // Trigger change detection
        this.cdr.detectChanges();
      });

    // Subscribe to comments
    this.commentsSubscription = this.mediaInteractionService
      .getMediaComments(currentImage.id)
      .subscribe(comments => {
        console.log('[Gallery Interactions] Comments loaded:', comments.length, comments);
        this.currentMediaComments = comments;
        this.commentCount = comments.length;
        
        // Trigger change detection
        this.cdr.detectChanges();
      });
  }

  /**
   * Toggle like for current image
   */
  async toggleLike() {
    if (!this.currentUser) {
      alert('Please sign in to like images');
      return;
    }

    const currentImage = this.getCurrentImage();
    console.log('[Gallery Interactions] Toggle like for image:', currentImage);
    
    if (!currentImage || !currentImage.id) {
      console.error('[Gallery Interactions] Cannot like: no current image or missing ID');
      return;
    }

    try {
      console.log('[Gallery Interactions] Toggling like for media ID:', currentImage.id);
      const liked = await this.mediaInteractionService.toggleLike(
        currentImage.id,
        this.currentUser.uid,
        this.currentUser.displayName || this.currentUser.email || 'Anonymous',
        this.currentUser.email || ''
      );
      
      console.log('[Gallery Interactions] Like toggled, liked:', liked);
      this.currentUserLiked = liked;
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Failed to update like. Please try again.');
    }
  }

  /**
   * Submit a new comment
   */
  async submitComment() {
    if (!this.currentUser) {
      alert('Please sign in to comment');
      return;
    }

    if (!this.newComment.trim()) {
      return;
    }

    const currentImage = this.getCurrentImage();
    if (!currentImage || !currentImage.id) return;

    this.isSubmittingComment = true;

    try {
      await this.mediaInteractionService.addComment({
        mediaId: currentImage.id,
        userId: this.currentUser.uid,
        userName: this.currentUser.displayName || this.currentUser.email || 'Anonymous',
        userEmail: this.currentUser.email || '',
        comment: this.newComment.trim()
      });

      this.newComment = '';
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      this.isSubmittingComment = false;
    }
  }

  /**
   * Delete a comment (only own comments)
   */
  async deleteComment(comment: MediaComment) {
    if (!this.currentUser || comment.userId !== this.currentUser.uid) {
      return;
    }

    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await this.mediaInteractionService.deleteComment(comment.id!);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment. Please try again.');
    }
  }

  /**
   * Toggle comments section visibility
   */
  toggleComments() {
    this.showComments = !this.showComments;
  }

  onImageDoubleClick() {
    if (!this.currentUser) {
      return;
    }

    // Only trigger like if not already liked
    if (!this.currentUserLiked) {
      this.toggleLike();
    }

    // Show heart animation
    this.showHeartAnimation = true;
    
    // Clear any existing timeout
    if (this.heartAnimationTimeout) {
      clearTimeout(this.heartAnimationTimeout);
    }
    
    // Hide animation after it completes
    this.heartAnimationTimeout = setTimeout(() => {
      this.showHeartAnimation = false;
    }, 1000);
  }

  /**
   * Get initials from name for avatar
   */
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  /**
   * Format date for display
   */
  formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  }
}
