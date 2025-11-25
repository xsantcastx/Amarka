import { Injectable, inject } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { Category } from '../models/catalog';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private firestore: Firestore;

  constructor() {
    this.firestore = inject(Firestore);
  }

  /**
   * Get all categories
   */
  getAllCategories(): Observable<Category[]> {
    const categoriesCollection = collection(this.firestore, 'categories');
    const q = query(categoriesCollection, orderBy('order', 'asc'));
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Category))
      )
    );
  }

  /**
   * Get active categories only
   */
  getActiveCategories(): Observable<Category[]> {
    const categoriesCollection = collection(this.firestore, 'categories');
    const q = query(
      categoriesCollection, 
      where('active', '==', true),
      orderBy('order', 'asc')
    );
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Category))
      )
    );
  }

  /**
   * Get single category by ID
   */
  getCategory(id: string): Observable<Category | null> {
    const docRef = this.categoryDoc(id);
    return from(getDoc(docRef)).pipe(
      map(doc => doc.exists() ? { id: doc.id, ...doc.data() as any } as Category : null)
    );
  }

  /**
   * Get category by slug
   */
  getCategoryBySlug(slug: string): Observable<Category | null> {
    const categoriesCollection = collection(this.firestore, 'categories');
    const q = query(categoriesCollection, where('slug', '==', slug));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() as any } as Category;
      })
    );
  }

  /**
   * Create new category
   */
  async addCategory(category: Omit<Category, 'id'>): Promise<string> {
    const categoriesCollection = collection(this.firestore, 'categories');
    const now = Timestamp.now();
    const data = this.removeUndefinedFields({
      ...category,
      active: category.active !== false,
      createdAt: now,
      updatedAt: now
    });
    const docRef = await addDoc(categoriesCollection, data as any);
    return docRef.id;
  }

  /**
   * Update existing category
   */
  async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    const docRef = this.categoryDoc(id);
    const cleanedUpdates = this.removeUndefinedFields({
      ...updates,
      updatedAt: Timestamp.now()
    });
    await updateDoc(docRef, cleanedUpdates as any);
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    const docRef = this.categoryDoc(id);
    await deleteDoc(docRef);
  }

  /**
   * Remove undefined fields from object to prevent Firestore errors
   */
  private removeUndefinedFields(obj: any): any {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const categoriesCollection = collection(this.firestore, 'categories');
    const q = query(categoriesCollection, where('slug', '==', slug));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return false;
    if (excludeId) {
      return snapshot.docs.some(doc => doc.id !== excludeId);
    }
    return true;
  }

  private categoryDoc(id: string) {
    return doc(this.firestore, `categories/${id}`);
  }
}
