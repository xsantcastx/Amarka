import { Injectable, inject } from '@angular/core';
import { CategoryService } from './category.service';
import { ModelService } from './model.service';
import { TemplateService } from './template.service';
import { BenefitTemplateService } from './benefit-template.service';
import { Category, Model, Template } from '../models/catalog';
import { DEFAULT_BENEFIT_TEMPLATES } from '../../data/benefit-templates.seed';

@Injectable({ providedIn: 'root' })
export class SeedService {
  private categoryService = inject(CategoryService);
  private modelService = inject(ModelService);
  private templateService = inject(TemplateService);
  private benefitTemplateService = inject(BenefitTemplateService);

  /**
   * Seed all initial data
   */
  async seedAll(): Promise<void> {
    void 0;
    
    try {
      const categoryIds = await this.seedCategories();
      const modelIds = await this.seedModels(categoryIds);
      await this.seedTemplates(categoryIds, modelIds);
      
      void 0;
    } catch (error) {
      void 0;
      throw error;
    }
  }

  /**
   * Seed categories (grosor-based: 12mm, 15mm, 20mm)
   */
  private async seedCategories(): Promise<Record<string, string>> {
    void 0;
    
    const categories: Omit<Category, 'id'>[] = [
      {
        name: 'Formato 12mm',
        slug: '12mm',
        order: 1,
        icon: 'layers',
        defaultSpecOverrides: {
          thicknessMm: 12,
          size: '160×320cm'
        },
        active: true
      },
      {
        name: 'Formato 15mm',
        slug: '15mm',
        order: 2,
        icon: 'layers',
        defaultSpecOverrides: {
          thicknessMm: 15,
          size: '160×320cm'
        },
        active: true
      },
      {
        name: 'Formato 20mm',
        slug: '20mm',
        order: 3,
        icon: 'layers',
        defaultSpecOverrides: {
          thicknessMm: 20,
          size: '160×320cm'
        },
        active: true
      }
    ];

    const ids: Record<string, string> = {};
    
    for (const category of categories) {
      // Check if exists
      const exists = await this.categoryService.slugExists(category.slug);
      if (!exists) {
        const id = await this.categoryService.addCategory(category);
        ids[category.slug] = id;
        void 0;
      } else {
        // Update existing category to ensure it has active: true
        const existingCat = await this.categoryService.getCategoryBySlug(category.slug).toPromise();
        if (existingCat && existingCat.id) {
          await this.categoryService.updateCategory(existingCat.id, { active: true });
          ids[category.slug] = existingCat.id;
          void 0;
        } else {
          void 0;
        }
      }
    }

    return ids;
  }

  /**
   * Seed mining hardware models from productos.json product names
   */
  private async seedModels(categoryIds: Record<string, string>): Promise<Record<string, string>> {
    void 0;
    
    // Get the first available category as default (or use '12mm' if it exists)
    const defaultCategoryId = categoryIds['12mm'] || Object.values(categoryIds)[0];
    
    if (!defaultCategoryId) {
      void 0;
      return {};
    }
    
    const models: Omit<Model, 'id'>[] = [
      {
        categoryId: defaultCategoryId,
        name: 'Saint Laurent',
        slug: 'saint-laurent',
        textureHints: ['vetas oscuras', 'mármol natural', 'sofisticado'],
        defaultTags: ['mármol', 'elegante', 'premium'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Black Gold',
        slug: 'black-gold',
        textureHints: ['contrastes dorados', 'fondo negro profundo', 'dramático'],
        defaultTags: ['negro', 'dorado', 'premium'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Arenaria Ivory',
        slug: 'arenaria-ivory',
        textureHints: ['tonos neutros cálidos', 'textura suave', 'serenidad'],
        defaultTags: ['neutro', 'cálido', 'suave'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Rapolano',
        slug: 'rapolano',
        textureHints: ['piedra travertino', 'texturas naturales', 'colores tierra'],
        defaultTags: ['travertino', 'natural', 'tierra'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Konkrete',
        slug: 'konkrete',
        textureHints: ['industrial moderno', 'hormigón pulido'],
        defaultTags: ['hormigón', 'industrial', 'moderno'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Crystal Clear',
        slug: 'crystal-clear',
        textureHints: ['cristalino', 'transparencias', 'efectos de luz'],
        defaultTags: ['cristal', 'transparente', 'luz'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Taj Mahal',
        slug: 'taj-mahal',
        textureHints: ['mármol clásico', 'vetas sutiles', 'crema y beige'],
        defaultTags: ['mármol', 'clásico', 'beige'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Apollo White',
        slug: 'apollo-white',
        textureHints: ['blanco puro', 'variaciones sutiles', 'elegancia atemporal'],
        defaultTags: ['blanco', 'puro', 'elegante'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Calacatta Gold',
        slug: 'calacatta-gold',
        textureHints: ['mármol Calacatta', 'vetas doradas distintivas', 'lujo'],
        defaultTags: ['calacatta', 'dorado', 'lujo'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Patagonia',
        slug: 'patagonia',
        textureHints: ['paisajes naturales', 'texturas únicas', 'natural'],
        defaultTags: ['natural', 'texturas', 'paisajes'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Statuario Elegance',
        slug: 'statuario-elegance',
        textureHints: ['mármol Statuario', 'vetas dramáticas', 'elegancia'],
        defaultTags: ['statuario', 'mármol', 'elegante'],
        active: true
      },
      {
        categoryId: defaultCategoryId,
        name: 'Laponia Black',
        slug: 'laponia-black',
        textureHints: ['negro profundo', 'matices sutiles', 'nórdico'],
        defaultTags: ['negro', 'nórdico', 'profundo'],
        active: true
      }
    ];

    const ids: Record<string, string> = {};
    
    for (const model of models) {
      const exists = await this.modelService.slugExists(model.slug);
      if (!exists) {
        const id = await this.modelService.addModel(model);
        ids[model.slug] = id;
        void 0;
      } else {
        // Update existing model to ensure it has active: true
        const existingModel = await this.modelService.getModelBySlug(model.slug).toPromise();
        if (existingModel && existingModel.id) {
          await this.modelService.updateModel(existingModel.id, { active: true });
          ids[model.slug] = existingModel.id;
          void 0;
        } else {
          void 0;
        }
      }
    }

    return ids;
  }

  /**
   * Seed templates
   */
  private async seedTemplates(
    categoryIds: Record<string, string>,
    modelIds: Record<string, string>
  ): Promise<void> {
    void 0;
    
    // Global description template
    const globalDescTemplate: Omit<Template, 'id'> = {
      type: 'description',
      scope: 'global',
      language: 'es',
      content: 'Superficie porcelánica de gran formato con acabado {model}. Perfecta para {aplicaciones}.',
      fields: ['model', 'aplicaciones'],
      active: true
    };

    // Global SEO title template
    const globalSeoTitleTemplate: Omit<Template, 'id'> = {
      type: 'seoTitle',
      scope: 'global',
      language: 'es',
      content: '{name} {grosor} | Premium Collection',
      fields: ['name', 'grosor'],
      active: true
    };

    // Global SEO meta template
    const globalSeoMetaTemplate: Omit<Template, 'id'> = {
      type: 'seoMeta',
      scope: 'global',
      language: 'es',
      content: '{name} en formato {grosor}. Superficie porcelánica de alta calidad para {aplicaciones}.',
      fields: ['name', 'grosor', 'aplicaciones'],
      active: true
    };

    const templates = [
      globalDescTemplate,
      globalSeoTitleTemplate,
      globalSeoMetaTemplate
    ];

    for (const template of templates) {
      await this.templateService.addTemplate(template);
      void 0;
    }

    void 0;
  }

  /**
   * Seed benefit templates
   */
  async seedBenefitTemplates(): Promise<void> {
    void 0;
    
    let created = 0;
    let skipped = 0;

    for (const template of DEFAULT_BENEFIT_TEMPLATES) {
      try {
        await this.benefitTemplateService.createTemplate(template);
        void 0;
        created++;
      } catch (error) {
        void 0;
        skipped++;
      }
    }

    void 0;
  }
}
