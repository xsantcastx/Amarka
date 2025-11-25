import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject, UploadTaskSnapshot } from '@angular/fire/storage';
import { Observable, from, map } from 'rxjs';
import { ImageOptimizationService } from './image-optimization.service';

export interface UploadProgress {
  state?: 'progress' | 'complete' | 'error';
  progress: number;
  downloadURL?: string;
  webpURL?: string;
  thumbnailURL?: string;
  urls?: {
    original: string;
    webp?: string;
    thumbnail?: string;
  };
  storagePath?: string;
  optimizedSize?: number;
  error?: string;
  optimizing?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage = inject(Storage);
  private imageOptimizer = inject(ImageOptimizationService);

  /**
   * Upload an optimized image with automatic WebP conversion and thumbnails
   * @param file - The image file to upload
   * @param path - The storage path (without extension)
   * @param optimize - Whether to optimize the image (default: true)
   * @returns Observable that emits upload progress and final URLs
   */
  uploadOptimizedImage(file: File, path: string, optimize: boolean = true): Observable<UploadProgress> {
    return new Observable(observer => {
      (async () => {
        try {
          // Notify that optimization is starting
          if (optimize) {
            observer.next({ state: 'progress', progress: 0, optimizing: true });
          }

          let mainBlob: Blob = file;
          let webpBlob: Blob | undefined;
          let thumbnailBlob: Blob | undefined;
          let optimizedSize = file.size;
          
          // Optimize image if requested
          if (optimize) {
            const optimized = await this.imageOptimizer.optimizeImage(file, {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 0.85,
              createThumbnail: true,
              thumbnailSize: 400
            });

            mainBlob = optimized.original;
            webpBlob = optimized.webp;
            thumbnailBlob = optimized.thumbnail;
            optimizedSize = webpBlob?.size || mainBlob.size;

            console.log('Image optimized:', {
              originalSize: `${this.imageOptimizer.getFileSizeMB(file).toFixed(2)}MB`,
              optimizedSize: `${this.imageOptimizer.getFileSizeMB(mainBlob).toFixed(2)}MB`,
              webpSize: webpBlob ? `${this.imageOptimizer.getFileSizeMB(webpBlob).toFixed(2)}MB` : 'N/A',
              dimensions: `${optimized.width}x${optimized.height}`
            });
          }

          observer.next({ state: 'progress', progress: 10, optimizing: false });

          // Upload only WebP version to save storage space
          let webpURL: string;
          if (webpBlob) {
            const webpPath = `${path}.webp`;
            webpURL = await this.uploadBlob(webpBlob, webpPath, observer, 10, 100);
          } else {
            // Fallback: if no WebP was created, upload the main blob
            const mainPath = `${path}.jpg`;
            webpURL = await this.uploadBlob(mainBlob, mainPath, observer, 10, 100);
          }

          // Complete
          observer.next({
            state: 'complete',
            progress: 100,
            downloadURL: webpURL,
            webpURL: webpURL,
            thumbnailURL: undefined,
            urls: {
              original: webpURL,
              webp: webpURL,
              thumbnail: undefined
            },
            storagePath: path,
            optimizedSize
          });
          observer.complete();
        } catch (error: any) {
          console.error('Upload error:', error);
          observer.next({ state: 'error', progress: 0, error: error.message });
          observer.error(error);
        }
      })();
    });
  }

  /**
   * Upload a blob to Firebase Storage
   * @param blob - The blob to upload
   * @param path - The storage path
   * @param observer - The observer to notify progress
   * @param startProgress - Starting progress percentage
   * @param endProgress - Ending progress percentage
   * @returns Promise with download URL
   */
  private uploadBlob(
    blob: Blob,
    path: string,
    observer: any,
    startProgress: number,
    endProgress: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(this.storage, path);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes);
          const totalProgress = startProgress + (fileProgress * (endProgress - startProgress));
          observer.next({ state: 'progress', progress: totalProgress });
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  }

  /**
   * Upload a file to Firebase Storage with progress tracking
   * @param file - The file to upload
   * @param path - The storage path (e.g., 'products/12mm/image.jpg')
   * @returns Observable that emits upload progress and final download URL
   */
  uploadFile(file: File, path: string): Observable<UploadProgress> {
    return new Observable(observer => {
      const storageRef = ref(this.storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          // Calculate progress percentage
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          observer.next({ progress });
        },
        (error) => {
          // Handle upload error
          console.error('Upload error:', error);
          observer.next({ progress: 0, error: error.message });
          observer.error(error);
        },
        async () => {
          // Upload completed successfully, get download URL
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            observer.next({ progress: 100, downloadURL });
            observer.complete();
          } catch (error: any) {
            console.error('Error getting download URL:', error);
            observer.error(error);
          }
        }
      );
    });
  }

  /**
   * Upload product image with automatic optimization
   * @param file - The image file
   * @param productSlug - The product slug for the path
   * @returns Observable with upload progress and URLs
   */
  uploadProductImage(file: File, productSlug: string): Observable<UploadProgress> {
    const timestamp = Date.now();
    const pathWithoutExt = `products/${productSlug}-${timestamp}`;
    return this.uploadOptimizedImage(file, pathWithoutExt);
  }

  /**
   * Upload gallery image with automatic optimization
   * @param file - The image file
   * @param category - The gallery category (kitchens, bathrooms, etc.)
   * @returns Observable with upload progress and URLs
   */
  uploadGalleryImage(file: File, category: string): Observable<UploadProgress> {
    const timestamp = Date.now();
    const pathWithoutExt = `gallery/${category}/${timestamp}`;
    return this.uploadOptimizedImage(file, pathWithoutExt);
  }

  /**
   * Get download URL from storage path
   * @param path - The storage path (e.g., 'products/covers/image.jpg')
   * @returns Promise with download URL
   */
  async getDownloadUrl(path: string): Promise<string> {
    const storageRef = ref(this.storage, path);
    return await getDownloadURL(storageRef);
  }

  /**
   * Delete a file from Firebase Storage
   * @param downloadURL - The download URL of the file to delete
   * @returns Promise that resolves when the file is deleted
   */
  async deleteFile(downloadURL: string): Promise<void> {
    try {
      // Extract the path from the download URL
      const path = this.getPathFromURL(downloadURL);
      if (!path) {
        throw new Error('Invalid download URL');
      }

      const fileRef = ref(this.storage, path);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Extract storage path from download URL
   * @param url - The download URL
   * @returns The storage path or null
   */
  private getPathFromURL(url: string): string | null {
    try {
      // Firebase Storage URLs follow this pattern:
      // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]);
      }
      return null;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
    }
  }

  /**
   * Validate image file
   * @param file - The file to validate
   * @param maxSizeMB - Maximum file size in MB (default 5MB)
   * @returns Validation result
   */
  validateImageFile(file: File, maxSizeMB: number = 5): { valid: boolean; error?: string } {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Only JPG, PNG, and WebP images are allowed' };
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
    }

    return { valid: true };
  }

  /**
   * Generate a slug from a name
   * @param name - The name to slugify
   * @returns The slug
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}
