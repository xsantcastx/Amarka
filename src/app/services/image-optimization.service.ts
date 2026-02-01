import { Injectable } from '@angular/core';

export interface OptimizedImage {
  original: Blob;
  webp?: Blob;
  thumbnail?: Blob;
  thumbnailWebp?: Blob;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImageOptimizationService {

  /**
   * Optimize an image: resize, compress, and convert to WebP
   * @param file - The image file to optimize
   * @param options - Optimization options
   * @returns Promise with optimized images
   */
  async optimizeImage(
    file: File,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      createThumbnail?: boolean;
      thumbnailSize?: number;
    } = {}
  ): Promise<OptimizedImage> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.85,
      createThumbnail = true,
      thumbnailSize = 400
    } = options;

    try {
      // Load image
      const img = await this.loadImage(file);
      
      // Calculate dimensions
      const dimensions = this.calculateDimensions(img.width, img.height, maxWidth, maxHeight);
      
      // Create main image
      const mainCanvas = this.resizeImage(img, dimensions.width, dimensions.height);
      const originalBlob = await this.canvasToBlob(mainCanvas, 'image/jpeg', quality);
      
      // Convert to WebP if supported
      let webpBlob: Blob | undefined;
      try {
        webpBlob = await this.canvasToBlob(mainCanvas, 'image/webp', quality);
      } catch (error) {
        void 0;
      }

      // Create thumbnail
      let thumbnailBlob: Blob | undefined;
      let thumbnailWebpBlob: Blob | undefined;
      
      if (createThumbnail) {
        const thumbDimensions = this.calculateDimensions(img.width, img.height, thumbnailSize, thumbnailSize);
        const thumbCanvas = this.resizeImage(img, thumbDimensions.width, thumbDimensions.height);
        thumbnailBlob = await this.canvasToBlob(thumbCanvas, 'image/jpeg', quality);
        
        try {
          thumbnailWebpBlob = await this.canvasToBlob(thumbCanvas, 'image/webp', quality);
        } catch (error) {
          void 0;
        }
      }

      return {
        original: originalBlob,
        webp: webpBlob,
        thumbnail: thumbnailBlob,
        thumbnailWebp: thumbnailWebpBlob,
        width: dimensions.width,
        height: dimensions.height
      };
    } catch (error) {
      void 0;
      throw new Error('Failed to optimize image');
    }
  }

  /**
   * Load an image file into an HTMLImageElement
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Calculate new dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let newWidth = width;
    let newHeight = height;

    // Only resize if image is larger than max dimensions
    if (width > maxWidth || height > maxHeight) {
      const widthRatio = maxWidth / width;
      const heightRatio = maxHeight / height;
      const ratio = Math.min(widthRatio, heightRatio);

      newWidth = Math.round(width * ratio);
      newHeight = Math.round(height * ratio);
    }

    return { width: newWidth, height: newHeight };
  }

  /**
   * Resize image using canvas
   */
  private resizeImage(img: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use better image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw resized image
    ctx.drawImage(img, 0, 0, width, height);

    return canvas;
  }

  /**
   * Convert canvas to blob
   */
  private canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * Get file size in MB
   */
  getFileSizeMB(blob: Blob): number {
    return blob.size / (1024 * 1024);
  }

  /**
   * Convert Blob to File
   */
  blobToFile(blob: Blob, filename: string): File {
    return new File([blob], filename, { type: blob.type });
  }

  /**
   * Check if browser supports WebP
   */
  async supportsWebP(): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const blob = await this.canvasToBlob(canvas, 'image/webp', 0.8);
      return blob.type === 'image/webp';
    } catch {
      return false;
    }
  }

  /**
   * Compress image to target file size (approximate)
   */
  async compressToSize(
    file: File,
    targetSizeKB: number,
    maxAttempts: number = 5
  ): Promise<Blob> {
    let quality = 0.9;
    let attempt = 0;
    let compressed: Blob = file;

    while (attempt < maxAttempts) {
      const img = await this.loadImage(file);
      const canvas = this.resizeImage(img, img.width, img.height);
      compressed = await this.canvasToBlob(canvas, 'image/jpeg', quality);

      const sizeKB = compressed.size / 1024;
      
      if (sizeKB <= targetSizeKB) {
        break;
      }

      // Reduce quality for next attempt
      quality -= 0.1;
      attempt++;

      if (quality < 0.4) {
        break; // Don't go below 40% quality
      }
    }

    return compressed;
  }

  /**
   * Create multiple sizes for responsive images
   */
  async createResponsiveSizes(
    file: File,
    sizes: number[] = [400, 800, 1200, 1600]
  ): Promise<Map<number, Blob>> {
    const img = await this.loadImage(file);
    const responsiveImages = new Map<number, Blob>();

    for (const size of sizes) {
      const dimensions = this.calculateDimensions(img.width, img.height, size, size);
      const canvas = this.resizeImage(img, dimensions.width, dimensions.height);
      const blob = await this.canvasToBlob(canvas, 'image/jpeg', 0.85);
      responsiveImages.set(size, blob);
    }

    return responsiveImages;
  }
}
