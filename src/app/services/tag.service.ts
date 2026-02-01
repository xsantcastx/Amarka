import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, Timestamp } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Tag } from '../models/catalog';

@Injectable({
  providedIn: 'root'
})
export class TagService {
  private firestore = inject(Firestore);
  private collectionName = 'tags';

  /**
   * Get all tags
   */
  getTags(): Observable<Tag[]> {
    const tagsCol = collection(this.firestore, this.collectionName);
    // Simple query without complex ordering to avoid index requirements
    const q = query(tagsCol);
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const tags = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Tag));
        // Sort in memory instead
        return tags.sort((a, b) => {
          const orderA = a.order ?? 999;
          const orderB = b.order ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.name || '').localeCompare(b.name || '');
        });
      })
    );
  }

  /**
   * Get only active tags
   */
  getActiveTags(): Observable<Tag[]> {
    const tagsCol = collection(this.firestore, this.collectionName);
    const q = query(tagsCol, where('active', '==', true));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        const tags = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Tag));
        // Sort in memory instead
        return tags.sort((a, b) => {
          const orderA = a.order ?? 999;
          const orderB = b.order ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return (a.name || '').localeCompare(b.name || '');
        });
      })
    );
  }

  /**
   * Get a single tag by ID
   */
  getTag(id: string): Observable<Tag | null> {
    const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Tag;
        }
        return null;
      })
    );
  }

  /**
   * Add a new tag
   */
  async addTag(tag: Omit<Tag, 'id'>): Promise<string> {
    try {
      // Build tag data with only defined values
      const tagData: any = {
        name: tag.name,
        slug: tag.slug,
        color: tag.color || '#F7931A',
        order: tag.order || 0,
        active: tag.active !== false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Only add optional fields if they have values
      if (tag.description && tag.description.trim()) {
        tagData.description = tag.description.trim();
      }
      if (tag.icon && tag.icon.trim()) {
        tagData.icon = tag.icon.trim();
      }
      
      const tagsCol = collection(this.firestore, this.collectionName);
      const docRef = await addDoc(tagsCol, tagData);
      return docRef.id;
    } catch (error) {
      void 0;
      throw error;
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
      
      // Build update data with only defined values
      const updateData: any = {
        updatedAt: Timestamp.now()
      };
      
      // Add fields that have values
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.slug !== undefined) updateData.slug = updates.slug;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.order !== undefined) updateData.order = updates.order;
      if (updates.active !== undefined) updateData.active = updates.active;
      
      // Optional fields - only add if they have content
      if (updates.description !== undefined) {
        if (updates.description && updates.description.trim()) {
          updateData.description = updates.description.trim();
        } else {
          // If description is empty, remove it from the document
          updateData.description = null;
        }
      }
      if (updates.icon !== undefined) {
        if (updates.icon && updates.icon.trim()) {
          updateData.icon = updates.icon.trim();
        } else {
          // If icon is empty, remove it from the document
          updateData.icon = null;
        }
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      void 0;
      throw error;
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${this.collectionName}/${id}`);
      await deleteDoc(docRef);
    } catch (error) {
      void 0;
      throw error;
    }
  }

  /**
   * Check if a slug already exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    try {
      const tagsCol = collection(this.firestore, this.collectionName);
      const q = query(tagsCol, where('slug', '==', slug));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return false;
      }

      // If excludeId is provided, check if the found document is different
      if (excludeId) {
        return snapshot.docs.some(doc => doc.id !== excludeId);
      }

      return true;
    } catch (error) {
      void 0;
      return false;
    }
  }

  /**
   * Generate slug from name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  /**
   * Get default crypto mining tags
   */
  getDefaultTags(): Omit<Tag, 'id'>[] {
    return [
      {
        name: 'Mining Farm',
        slug: 'mining-farm',
        description: 'Large-scale mining operations and facilities',
        color: '#F7931A',
        icon: 'factory',
        order: 1,
        active: true
      },
      {
        name: 'Data Center',
        slug: 'data-center',
        description: 'Data center infrastructure and setups',
        color: '#FF9500',
        icon: 'database',
        order: 2,
        active: true
      },
      {
        name: 'ASIC Setup',
        slug: 'asic-setup',
        description: 'ASIC miner installations and configurations',
        color: '#FFB800',
        icon: 'chip',
        order: 3,
        active: true
      },
      {
        name: 'GPU Rig',
        slug: 'gpu-rig',
        description: 'GPU mining rig builds and setups',
        color: '#00D4AA',
        icon: 'gpu',
        order: 4,
        active: true
      },
      {
        name: 'Cooling System',
        slug: 'cooling-system',
        description: 'Cooling solutions and thermal management',
        color: '#00B8D4',
        icon: 'fan',
        order: 5,
        active: true
      },
      {
        name: 'Infrastructure',
        slug: 'infrastructure',
        description: 'Power, networking, and facility infrastructure',
        color: '#7E57C2',
        icon: 'network',
        order: 6,
        active: true
      },
      {
        name: 'Installation',
        slug: 'installation',
        description: 'Equipment installation and deployment',
        color: '#26A69A',
        icon: 'tools',
        order: 7,
        active: true
      },
      {
        name: 'Maintenance',
        slug: 'maintenance',
        description: 'Maintenance and repair operations',
        color: '#FF7043',
        icon: 'wrench',
        order: 8,
        active: true
      }
    ];
  }
}
