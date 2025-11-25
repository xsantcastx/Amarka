import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from '@angular/fire/storage';
import { Observable, from, map } from 'rxjs';
import { Media, MediaCreateInput } from '../models/media';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  constructor(
    private firestore: Firestore,
    private storage: Storage
  ) {}

  /**
   * Upload media file to Firebase Storage and create Firestore document
   * @param file File to upload
   * @param mediaInput Media metadata
   * @param onProgress Optional progress callback (0-100)
   * @returns Promise resolving to created media ID
   */
  async uploadMediaFile(
    file: File,
    mediaInput: Omit<MediaCreateInput, 'url'>,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      // Create storage reference
      const storageRef = ref(this.storage, mediaInput.storagePath);

      // Upload file with progress tracking
      const uploadTask: UploadTask = uploadBytesResumable(storageRef, file);

      // Wait for upload to complete and get download URL
      const downloadURL = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Calculate progress
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(Math.round(progress));
            }
          },
          (error) => {
            console.error('❌ Upload error:', error);
            reject(error);
          },
          async () => {
            // Upload complete, get download URL
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (error) {
              reject(error);
            }
          }
        );
      });

      // Create Firestore document with download URL
      const mediaData: MediaCreateInput = {
        ...mediaInput,
        url: downloadURL,
      };

      const mediaId = await this.createMedia(mediaData);
      console.log('✅ Media uploaded successfully:', mediaId);

      return mediaId;
    } catch (error) {
      console.error('❌ Error uploading media file:', error);
      throw error;
    }
  }

  /**
   * Delete media file from Storage and Firestore
   * @param mediaId Media document ID
   * @returns Promise resolving when delete completes
   */
  async deleteMediaWithFile(mediaId: string): Promise<void> {
    try {
      // Get media document
      const media = await this.getMediaById(mediaId);
      if (!media) {
        throw new Error(`Media not found: ${mediaId}`);
      }

      // Delete file from Storage if storagePath exists
      if (media.storagePath) {
        try {
          const storageRef = ref(this.storage, media.storagePath);
          await deleteObject(storageRef);
          console.log('✅ File deleted from storage:', media.storagePath);
        } catch (storageError) {
          console.warn('⚠️ Could not delete file from storage:', storageError);
          // Continue with Firestore deletion even if storage deletion fails
        }
      }

      // Delete Firestore document
      await this.deleteMedia(mediaId);
      console.log('✅ Media document deleted:', mediaId);
    } catch (error) {
      console.error('❌ Error deleting media with file:', error);
      throw error;
    }
  }

  /**
   * Create a new media document
   * @param mediaInput Media creation input
   * @returns Promise resolving to created media ID
   */
  async createMedia(mediaInput: MediaCreateInput): Promise<string> {
    try {
      const mediaCollection = collection(this.firestore, 'media');
      const mediaData = {
        ...mediaInput,
        uploadedAt: Timestamp.now(),
      };

      const docRef = await addDoc(mediaCollection, mediaData as any);
      console.log('✅ Media created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating media:', error);
      throw error;
    }
  }

  /**
   * Get all media documents
   * @returns Observable of all media
   */
  getAllMedia(): Observable<Media[]> {
    const mediaCollection = collection(this.firestore, 'media');
    const q = query(mediaCollection, orderBy('uploadedAt', 'desc'));
    
    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            uploadedAt: data['uploadedAt']?.toDate() || new Date(),
          } as Media;
        });
      })
    );
  }

  /**
   * Get media by ID
   * @param id Media document ID
   * @returns Promise resolving to Media object or null
   */
  async getMediaById(id: string): Promise<Media | null> {
    try {
      const docRef = doc(this.firestore, 'media', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        return {
          id: docSnap.id,
          ...data,
          uploadedAt: (data['uploadedAt'] as Timestamp).toDate(),
        } as Media;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting media:', error);
      throw error;
    }
  }

  /**
   * Get multiple media documents by IDs
   * @param ids Array of media document IDs
   * @returns Promise resolving to array of Media objects
   */
  async getMediaByIds(ids: string[]): Promise<Media[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    try {
      // Filter out invalid IDs (data URLs, full URLs, excessively long IDs)
      const validIds = ids.filter(id => 
        id && 
        !id.startsWith('data:') && 
        !id.startsWith('http://') && 
        !id.startsWith('https://') &&
        id.length < 1500 // Firestore doc ID max length
      );
      
      if (validIds.length === 0) {
        return [];
      }
      
      const mediaPromises = validIds.map((id) => this.getMediaById(id));
      const mediaResults = await Promise.all(mediaPromises);
      return mediaResults.filter((media) => media !== null) as Media[];
    } catch (error) {
      console.error('❌ Error getting media by IDs:', error);
      return [];
    }
  }

  /**
   * Get media by related entity
   * @param entityType Entity type (product, gallery, etc.)
   * @param entityId Entity ID
   * @returns Observable of Media array
   */
  getMediaByEntity(
    entityType: 'product' | 'gallery' | 'other',
    entityId: string
  ): Observable<Media[]> {
    const mediaCollection = collection(this.firestore, 'media');
    const q = query(
      mediaCollection,
      where('relatedEntityType', '==', entityType),
      where('relatedEntityIds', 'array-contains', entityId),
      orderBy('uploadedAt', 'desc')
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            uploadedAt: (data['uploadedAt'] as Timestamp).toDate(),
          } as Media;
        });
      })
    );
  }

  /**
   * Get media by tags
   * @param tags Array of tags to filter by
   * @returns Observable of Media array
   */
  getMediaByTags(tags: string[]): Observable<Media[]> {
    if (!tags || tags.length === 0) {
      return new Observable((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    const mediaCollection = collection(this.firestore, 'media');
    const q = query(
      mediaCollection,
      where('tags', 'array-contains-any', tags),
      orderBy('uploadedAt', 'desc')
    );

    return from(getDocs(q)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            uploadedAt: (data['uploadedAt'] as Timestamp).toDate(),
          } as Media;
        });
      })
    );
  }

  /**
   * Update media document
   * @param id Media document ID
   * @param updates Partial media updates
   * @returns Promise resolving when update completes
   */
  async updateMedia(id: string, updates: Partial<Media>): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'media', id);
      
      // Remove id and uploadedAt from updates (shouldn't change)
      const { id: _id, uploadedAt: _uploadedAt, ...safeUpdates } = updates;

      await updateDoc(docRef, safeUpdates as any);
      console.log('✅ Media updated:', id);
    } catch (error) {
      console.error('❌ Error updating media:', error);
      throw error;
    }
  }

  /**
   * Delete media document
   * @param id Media document ID
   * @returns Promise resolving when delete completes
   */
  async deleteMedia(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, 'media', id);
      await deleteDoc(docRef);
      console.log('✅ Media deleted:', id);
    } catch (error) {
      console.error('❌ Error deleting media:', error);
      throw error;
    }
  }

  /**
   * Add entity reference to media
   * @param mediaId Media document ID
   * @param entityType Entity type
   * @param entityId Entity ID to add
   * @returns Promise resolving when update completes
   */
  async addEntityReference(
    mediaId: string,
    entityType: 'product' | 'gallery' | 'other',
    entityId: string
  ): Promise<void> {
    try {
      const media = await this.getMediaById(mediaId);
      if (!media) {
        throw new Error(`Media not found: ${mediaId}`);
      }

      const relatedIds = media.relatedEntityIds || [];
      if (!relatedIds.includes(entityId)) {
        relatedIds.push(entityId);
      }

      await this.updateMedia(mediaId, {
        relatedEntityType: entityType,
        relatedEntityIds: relatedIds,
      });

      console.log('✅ Entity reference added to media:', mediaId, entityId);
    } catch (error) {
      console.error('❌ Error adding entity reference:', error);
      throw error;
    }
  }

  /**
   * Remove entity reference from media
   * @param mediaId Media document ID
   * @param entityId Entity ID to remove
   * @returns Promise resolving when update completes
   */
  async removeEntityReference(
    mediaId: string,
    entityId: string
  ): Promise<void> {
    try {
      const media = await this.getMediaById(mediaId);
      if (!media) {
        throw new Error(`Media not found: ${mediaId}`);
      }

      const relatedIds = (media.relatedEntityIds || []).filter(
        (id) => id !== entityId
      );

      await this.updateMedia(mediaId, {
        relatedEntityIds: relatedIds,
      });

      console.log('✅ Entity reference removed from media:', mediaId, entityId);
    } catch (error) {
      console.error('❌ Error removing entity reference:', error);
      throw error;
    }
  }

  /**
   * Validate image dimensions
   * @param file File to validate
   * @param minWidth Minimum width (default 1600px)
   * @param minHeight Minimum height (default 1200px)
   * @returns Promise resolving to validation result
   */
  async validateImageDimensions(
    file: File,
    minWidth: number = 1600,
    minHeight: number = 1200
  ): Promise<{ valid: boolean; width: number; height: number; error?: string }> {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const valid = img.width >= minWidth && img.height >= minHeight;
        const error = valid
          ? undefined
          : `Image too small: ${img.width}x${img.height}px. Minimum: ${minWidth}x${minHeight}px`;

        resolve({
          valid,
          width: img.width,
          height: img.height,
          error,
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          valid: false,
          width: 0,
          height: 0,
          error: 'Failed to load image',
        });
      };

      img.src = objectUrl;
    });
  }

  /**
   * Get image dimensions without validation
   * @param file File to check
   * @returns Promise resolving to dimensions
   */
  async getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Failed to load image'));
      };

      img.src = objectUrl;
    });
  }
}
