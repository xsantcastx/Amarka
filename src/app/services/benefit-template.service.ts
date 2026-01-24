import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BenefitTemplate } from '../models/benefit-template';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class BenefitTemplateService {
  private firestore = inject(Firestore);
  private templatesCollection = collection(this.firestore, 'benefitTemplates');
  private logger = inject(LoggerService);

  /**
   * Get all benefit templates
   */
  getTemplates(): Observable<BenefitTemplate[]> {
    const q = query(
      this.templatesCollection,
      orderBy('order', 'asc'),
      orderBy('name', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<BenefitTemplate[]>;
  }

  /**
   * Get active templates by category
   */
  getTemplatesByCategory(category: string): Observable<BenefitTemplate[]> {
    const q = query(
      this.templatesCollection,
      where('isActive', '==', true),
      where('category', 'in', [category, 'general']),
      orderBy('order', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<BenefitTemplate[]>;
  }

  /**
   * Get active templates only
   */
  getActiveTemplates(): Observable<BenefitTemplate[]> {
    const ordered = query(
      this.templatesCollection,
      where('isActive', '==', true),
      orderBy('order', 'asc')
    );

    // If Firestore index is missing, fall back to a simpler query without orderBy
    return (collectionData(ordered, { idField: 'id' }) as Observable<BenefitTemplate[]>)
      .pipe(
        catchError(err => {
          this.logger.debug('BenefitTemplateService missing index for ordered active templates, falling back without orderBy', err?.message);
          const fallback = query(
            this.templatesCollection,
            where('isActive', '==', true)
          );
          return collectionData(fallback, { idField: 'id' }) as Observable<BenefitTemplate[]>;
        })
      );
  }

  /**
   * Create a new benefit template
   */
  async createTemplate(template: Omit<BenefitTemplate, 'id'>): Promise<string> {
    const templateDoc = doc(this.templatesCollection);
    const newTemplate: BenefitTemplate = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await setDoc(templateDoc, newTemplate);
    return templateDoc.id;
  }

  /**
   * Update an existing benefit template
   */
  async updateTemplate(id: string, updates: Partial<BenefitTemplate>): Promise<void> {
    const templateDoc = doc(this.firestore, 'benefitTemplates', id);
    await updateDoc(templateDoc, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Delete a benefit template
   */
  async deleteTemplate(id: string): Promise<void> {
    const templateDoc = doc(this.firestore, 'benefitTemplates', id);
    await deleteDoc(templateDoc);
  }

  /**
   * Toggle template active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.updateTemplate(id, { isActive });
  }

  /**
   * Reorder templates
   */
  async reorderTemplates(templates: { id: string; order: number }[]): Promise<void> {
    const updates = templates.map(({ id, order }) => 
      this.updateTemplate(id, { order })
    );
    await Promise.all(updates);
  }
}
