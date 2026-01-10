import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, Timestamp, limit } from '@angular/fire/firestore';
import { Observable, from, map, firstValueFrom, catchError, of } from 'rxjs';
import { Product } from '../models/product';
import { Product as CatalogProduct, TemplateComposition, ProductFormData } from '../models/catalog';
import { CategoryService } from './category.service';
import { ModelService } from './model.service';
import { TemplateService } from './template.service';
import { SettingsService } from './settings.service';
import { EmailService } from './email.service';

@Injectable({
  providedIn: 'root'
})
export class ProductsService {
  private firestore = inject(Firestore);
  private categoryService = inject(CategoryService);
  private modelService = inject(ModelService);
  private templateService = inject(TemplateService);
  private settingsService = inject(SettingsService);
  private emailService = inject(EmailService);

  /**
   * Generate auto-filled data for a product based on templates
   * This is the magic that makes admin life easier!
   */
  async generateProductData(formData: ProductFormData): Promise<TemplateComposition> {
    try {
      // Fetch category and model in parallel
      const [category, model] = await Promise.all([
        firstValueFrom(this.categoryService.getCategory(formData.categoryId)),
        firstValueFrom(this.modelService.getModel(formData.modelId))
      ]);

      if (!category || !model) {
        throw new Error('Category or Model not found');
      }

      // Prepare placeholders for template rendering
      const placeholders: Record<string, string> = {
        name: formData.name,
        model: model.name,
        size: category.defaultSpecOverrides?.size || '160×320cm',
        aplicaciones: formData.specs?.usage?.join(', ') || 'cocinas, baños, fachadas',
        // Add more placeholders as needed
        finish: formData.finish || 'Pulido',
        thickness: category.defaultSpecOverrides?.thicknessMm?.toString() || '12'
      };

      // Compose templates
      const composition = await this.templateService.composeTemplates(
        formData.categoryId,
        formData.modelId,
        placeholders
      );

      // Merge specs from category defaults + composition + user input
      const finalSpecs = {
        ...category.defaultSpecOverrides,
        ...composition.specs,
        ...formData.specs
      };

      // Merge tags from model defaults + user input
      const finalTags = [
        ...(model.defaultTags || []),
        ...(composition.tags || []),
        ...(formData.tags || [])
      ];

      return {
        description: composition.description,
        seoTitle: composition.seoTitle,
        seoMeta: composition.seoMeta,
        specs: finalSpecs,
        tags: [...new Set(finalTags)] // Remove duplicates
      };
    } catch (error) {
      console.error('Error generating product data:', error);
      throw error;
    }
  }

  /**
   * Get all products
   */
  getAllProducts(includeAll: boolean = false): Observable<Product[]> {
    const productsCol = collection(this.firestore, 'products');
    // If includeAll is true (admin), get all products. Otherwise, only get published.
    const q = includeAll 
      ? query(productsCol, orderBy('name', 'asc'))
      : query(productsCol, where('status', '==', 'published'), orderBy('name', 'asc'));
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product)))
    );
  }

  /**
   * One-time load of all products
   */
  async getAllProductsOnce(): Promise<Product[]> {
    const productsCol = collection(this.firestore, 'products');
    const q = query(productsCol);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
  }

  /**
   * Get featured or latest products (defaults to latest by createdAt desc)
   */
  getFeaturedProducts(count: number = 8): Observable<Product[]> {
    const productsCol = collection(this.firestore, 'products');
    const q = query(
      productsCol, 
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'), 
      limit(count)
    );
    return from(getDocs(q)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product)))
    );
  }

  /**
   * Get products by tag (e.g., bestseller). Falls back to latest if none found.
   */
  getProductsByTag(tag: string, count: number = 8): Observable<Product[]> {
    const productsCol = collection(this.firestore, 'products');
    const tagQuery = query(
      productsCol,
      where('status', '==', 'published'),
      where('tags', 'array-contains', tag),
      orderBy('createdAt', 'desc'),
      limit(count)
    );

    // Primary: ordered query (needs composite index); fallback: no orderBy if index missing
    return from(getDocs(tagQuery)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product))),
      catchError(err => {
        console.warn('[ProductsService] getProductsByTag index missing, falling back without orderBy:', err?.message);
        const fallbackQuery = query(
          productsCol,
          where('tags', 'array-contains', tag),
          limit(count)
        );
        return from(getDocs(fallbackQuery)).pipe(
          map(snapshot => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)))
        );
      })
    );
  }

  /**
   * Get a single product by ID
   */
  getProduct(id: string): Observable<Product | null> {
    const docRef = doc(this.firestore, `products/${id}`);
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Product;
        }
        return null;
      })
    );
  }

  /**
   * Get a product by slug
   */
  getProductBySlug(slug: string): Observable<Product | null> {
    const productsCol = collection(this.firestore, 'products');
    const q = query(
      productsCol,
      where('slug', '==', slug)
    );
    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          return { id: doc.id, ...doc.data() } as Product;
        }
        return null;
      })
    );
  }

  /**
   * Add a new product
   */
  async addProduct(product: Omit<Product, 'id'>): Promise<string> {
    try {
      const productData = {
        ...product,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Clean undefined values (Firestore doesn't accept undefined)
      const cleanedData = this.removeUndefinedFields(productData);
      
      const productsCol = collection(this.firestore, 'products');
      const docRef = await addDoc(productsCol, cleanedData);
      return docRef.id;
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    try {
      const docRef = doc(this.firestore, `products/${id}`);
      const updateData = {
        ...updates,
        updatedAt: Timestamp.now()
      };
      
      // Clean undefined values (Firestore doesn't accept undefined)
      const cleanedData = this.removeUndefinedFields(updateData);
      
      await updateDoc(docRef, cleanedData);
      
      // Check for low stock alert after update
      if (updates.stock !== undefined) {
        await this.checkLowStockAlert(id, updates.stock, updates.name || 'Product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  }

  /**
   * Check if product stock is low and send alert email if enabled
   */
  private async checkLowStockAlert(productId: string, stock: number, productName: string): Promise<void> {
    try {
      const settings = await this.settingsService.getSettings();
      
      // Only send alert if lowStockAlerts is enabled and stock is below threshold
      if (settings.lowStockAlerts && stock <= settings.lowStockThreshold) {
        console.log(`[ProductsService] Low stock detected for ${productName}: ${stock} units (threshold: ${settings.lowStockThreshold})`);
        
        const emailData = {
          to: settings.notificationEmail || settings.contactEmail,
          subject: `⚠️ Low Stock Alert: ${productName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #d97706;">⚠️ Low Stock Alert</h2>
              <p>The following product has low stock and needs attention:</p>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">${productName}</h3>
                <p style="margin: 5px 0;"><strong>Product ID:</strong> ${productId}</p>
                <p style="margin: 5px 0;"><strong>Current Stock:</strong> ${stock} units</p>
                <p style="margin: 5px 0;"><strong>Low Stock Threshold:</strong> ${settings.lowStockThreshold} units</p>
              </div>
              <p>Please consider restocking this product to avoid running out of inventory.</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                This is an automated notification from the inventory system.
              </p>
            </div>
          `
        };
        
        const result = await this.emailService.queueEmail(emailData);
        if (result.success) {
          console.log(`[ProductsService] Low stock alert email queued for ${productName}`);
        }
      }
    } catch (error) {
      console.error('[ProductsService] Error sending low stock alert:', error);
      // Don't throw - alert failure shouldn't break product update
    }
  }

  /**
   * Remove undefined fields from object (recursively)
   * Firestore doesn't accept undefined values
   */
  private removeUndefinedFields(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item));
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = this.removeUndefinedFields(value);
          }
        }
      }
      return cleaned;
    }

    return obj;
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, `products/${id}`);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  }

  /**
   * Check if a slug already exists for a given thickness
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    try {
      console.log('🔎 slugExists called with:');
      console.log('  - slug:', slug);
      console.log('  - excludeId:', excludeId);
      const productsCol = collection(this.firestore, 'products');
      const q = query(
        productsCol,
        where('slug', '==', slug)
      );
      const snapshot = await getDocs(q);
      
      const foundDocs = snapshot.docs.map(d => ({ id: d.id, slug: d.data()['slug'] }));
      console.log('📄 Found documents:', foundDocs);
      console.log('📄 Number of documents found:', foundDocs.length);
      
      if (snapshot.empty) {
        console.log('✅ No documents found, slug is available');
        return false;
      }

      // If excludeId is provided, check if the found document is different
      if (excludeId) {
        const foundIds = snapshot.docs.map(d => d.id);
        console.log('🔍 Exclude check:');
        console.log('  - excludeId:', excludeId);
        console.log('  - excludeId type:', typeof excludeId);
        console.log('  - foundIds:', foundIds);
        console.log('  - foundIds[0]:', foundIds[0]);
        console.log('  - foundIds[0] type:', typeof foundIds[0]);
        console.log('  - Are they equal?:', foundIds[0] === excludeId);
        
        const hasDifferent = snapshot.docs.some(doc => {
          const matches = doc.id === excludeId;
          console.log(`  - Comparing: "${doc.id}" === "${excludeId}" = ${matches}`);
          return doc.id !== excludeId;
        });
        
        console.log('  - hasDifferent:', hasDifferent);
        console.log('  - returning:', hasDifferent);
        return hasDifferent;
      }

      console.log('❌ Slug exists (no exclude ID provided)');
      return true;
    } catch (error) {
      console.error('Error checking slug:', error);
      return false;
    }
  }
}
