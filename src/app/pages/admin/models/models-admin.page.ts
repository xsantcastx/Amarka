import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { ModelService } from '../../../services/model.service';
import { CategoryService } from '../../../services/category.service';
import { Model, Category } from '../../../models/catalog';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';
import { firstValueFrom } from 'rxjs';

type MessageType = 'success' | 'error' | 'info';

@Component({
  selector: 'app-models-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule, AdminSidebarComponent],
  templateUrl: './models-admin.page.html',
  styleUrls: ['./models-admin.page.scss']
})
export class ModelsAdminComponent extends LoadingComponentBase implements OnInit {
  private modelService = inject(ModelService);
  private categoryService = inject(CategoryService);
  private translate = inject(TranslateService);

  models: Model[] = [];
  categories: Category[] = [];

  filterTerm = '';
  statusFilter: 'all' | 'active' | 'inactive' = 'all';
  categoryFilter = 'all';
  selectedModels: Set<string> = new Set();

  showModal = false;
  isEditMode = false;
  isSaving = false;
  selectedModel: Partial<Model> = {};
  originalSlug = '';
  textureHintsInput = '';
  defaultTagsInput = '';

  showCategoryModal = false;
  isCategoryEditMode = false;
  isCategorySaving = false;
  selectedCategory: Partial<Category> = {};
  selectedCategories: Set<string> = new Set();

  messageKey: string | null = null;
  messageType: MessageType = 'info';
  messageParams: Record<string, unknown> = {};
  private messageTimer: ReturnType<typeof setTimeout> | null = null;

  get totalCount(): number {
    return this.models.length;
  }

  get activeCount(): number {
    return this.models.filter(model => model.active !== false).length;
  }

  get inactiveCount(): number {
    return this.models.filter(model => model.active === false).length;
  }

  get allCategoriesSelected(): boolean {
    return this.categories.length > 0 && this.categories.every(cat => cat.id && this.selectedCategories.has(cat.id));
  }

  get filteredModels(): Model[] {
    const term = this.filterTerm.trim().toLowerCase();
    return this.models.filter(model => {
      const matchesStatus =
        this.statusFilter === 'all' ||
        (this.statusFilter === 'active' && model.active !== false) ||
        (this.statusFilter === 'inactive' && model.active === false);

      const matchesCategory =
        this.categoryFilter === 'all' ||
        model.categoryId === this.categoryFilter;

      const matchesTerm =
        !term ||
        model.name.toLowerCase().includes(term) ||
        (model.slug ?? '').toLowerCase().includes(term);

      return matchesStatus && matchesCategory && matchesTerm;
    });
  }

  get allSelected(): boolean {
    return this.filteredModels.length > 0 && this.filteredModels.every(m => m.id && this.selectedModels.has(m.id));
  }

  toggleSelectAll() {
    if (this.allSelected) {
      this.filteredModels.forEach(m => m.id && this.selectedModels.delete(m.id));
    } else {
      this.filteredModels.forEach(m => m.id && this.selectedModels.add(m.id));
    }
  }

  toggleSelect(modelId: string) {
    if (this.selectedModels.has(modelId)) {
      this.selectedModels.delete(modelId);
    } else {
      this.selectedModels.add(modelId);
    }
  }

  async bulkDelete() {
    if (this.selectedModels.size === 0) return;

    const count = this.selectedModels.size;
    const confirmMessage = this.translate.instant('admin.models.messages.confirm_bulk_delete', { count });
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(this.selectedModels).map(id => this.modelService.deleteModel(id))
      );
      this.selectedModels.clear();
      await this.loadModels();
      this.showMessage('admin.models.messages.bulk_deleted', 'success', { count });
    } catch (error) {
      console.error('Bulk delete error:', error);
      this.setError('Failed to delete models');
    }
  }

  async bulkActivate() {
    if (this.selectedModels.size === 0) return;

    try {
      const updates = Array.from(this.selectedModels).map(id => {
        const model = this.models.find(m => m.id === id);
        if (model) {
          return this.modelService.updateModel(id, { ...model, active: true });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      this.selectedModels.clear();
      await this.loadModels();
      this.showMessage('admin.models.messages.bulk_activated', 'success');
    } catch (error) {
      console.error('Bulk activate error:', error);
      this.setError('Failed to activate models');
    }
  }

  async bulkDeactivate() {
    if (this.selectedModels.size === 0) return;

    try {
      const updates = Array.from(this.selectedModels).map(id => {
        const model = this.models.find(m => m.id === id);
        if (model) {
          return this.modelService.updateModel(id, { ...model, active: false });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      this.selectedModels.clear();
      await this.loadModels();
      this.showMessage('admin.models.messages.bulk_deactivated', 'success');
    } catch (error) {
      console.error('Bulk deactivate error:', error);
      this.setError('Failed to deactivate models');
    }
  }

  async ngOnInit() {
    await Promise.all([this.loadCategories(), this.loadModels()]);
  }

  async loadModels() {
    await this.withLoading(async () => {
      const snapshot = await firstValueFrom(this.modelService.getAllModels());
      this.models = snapshot;
    }, true);
  }

  private async loadCategories() {
    try {
      const snapshot = await firstValueFrom(this.categoryService.getAllCategories());
      this.categories = snapshot;
    } catch (error) {
      console.error('[ModelsAdmin] Failed to load categories:', error);
    }
  }

  addNew() {
    this.selectedModel = {
      name: '',
      slug: '',
      active: true,
      categoryId: this.categories[0]?.id
    };
    this.isEditMode = false;
    this.originalSlug = '';
    this.textureHintsInput = '';
    this.defaultTagsInput = '';
    this.showModal = true;
  }

  edit(model: Model) {
    this.selectedModel = { ...model };
    this.isEditMode = true;
    this.originalSlug = model.slug ?? '';
    this.textureHintsInput = (model.textureHints ?? []).join('\n');
    this.defaultTagsInput = (model.defaultTags ?? []).join(', ');
    this.showModal = true;
  }

  addCategory() {
    this.selectedCategory = {
      name: '',
      slug: '',
      order: (this.categories?.length || 0) + 1,
      active: true
    };
    this.isCategoryEditMode = false;
    this.showCategoryModal = true;
  }

  editCategory(category: Category) {
    this.selectedCategory = { ...category };
    this.isCategoryEditMode = true;
    this.showCategoryModal = true;
  }

  async save() {
    if (this.isSaving) return;
    const trimmedName = (this.selectedModel.name || '').trim();
    if (!trimmedName) {
      this.showMessage('admin.models.messages.name_required', 'error');
      this.isSaving = false;
      return;
    }
    this.selectedModel.name = trimmedName;

    const sanitizedSlug = this.sanitizeSlug(this.selectedModel.slug || this.selectedModel.name);
    this.selectedModel.slug = sanitizedSlug;

    try {
      this.isSaving = true;
      const slugChanged = !this.isEditMode || sanitizedSlug !== this.originalSlug;
      if (slugChanged) {
        const exists = await this.modelService.slugExists(
          sanitizedSlug,
          this.isEditMode ? this.selectedModel.id : undefined
        );
        if (exists) {
          this.showMessage('admin.models.messages.slug_exists', 'error', { slug: sanitizedSlug });
          return;
        }
      }

      const payload: Partial<Model> = {
        ...this.selectedModel,
        slug: sanitizedSlug,
        active: this.selectedModel.active !== false,
        textureHints: this.parseMultilineList(this.textureHintsInput),
        defaultTags: this.parseCommaList(this.defaultTagsInput)
      };

      if (this.isEditMode && this.selectedModel.id) {
        await this.modelService.updateModel(this.selectedModel.id, payload);
        this.showMessage('admin.models.messages.updated', 'success');
      } else {
        await this.modelService.addModel(payload as Omit<Model, 'id'>);
        this.showMessage('admin.models.messages.created', 'success');
      }

      await this.loadModels();
      this.closeModal();
    } catch (error) {
      console.error('[ModelsAdmin] Error saving model:', error);
      this.showMessage('admin.models.messages.save_failed', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  async saveCategory() {
    if (this.isCategorySaving) return;
    const trimmedName = (this.selectedCategory.name || '').trim();
    if (!trimmedName) {
      this.showMessage('admin.models.categories.messages.name_required', 'error');
      return;
    }

    this.isCategorySaving = true;
    try {
      this.selectedCategory.name = trimmedName;
      const sanitizedSlug = this.sanitizeSlug(this.selectedCategory.slug || trimmedName);
      this.selectedCategory.slug = sanitizedSlug;

      if (this.isCategoryEditMode && this.selectedCategory.id) {
        await this.categoryService.updateCategory(this.selectedCategory.id, this.selectedCategory);
        this.showMessage('admin.models.categories.messages.updated', 'success');
      } else {
        await this.categoryService.addCategory(this.selectedCategory as Omit<Category, 'id'>);
        this.showMessage('admin.models.categories.messages.created', 'success');
      }

      await this.loadCategories();
      this.closeCategoryModal();
    } catch (error) {
      console.error('[ModelsAdmin] Error saving category:', error);
      this.showMessage('admin.models.categories.messages.save_failed', 'error');
    } finally {
      this.isCategorySaving = false;
    }
  }

  async delete(model: Model) {
    if (!model.id) {
      return;
    }

    const confirmMessage = this.translate.instant('admin.models.messages.confirm_delete', {
      name: model.name
    });

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await this.modelService.deleteModel(model.id);
      this.showMessage('admin.models.messages.deleted', 'success');
      await this.loadModels();
    } catch (error) {
      console.error('[ModelsAdmin] Error deleting model:', error);
      this.showMessage('admin.models.messages.delete_failed', 'error');
    }
  }

  toggleSelectAllCategories() {
    if (this.allCategoriesSelected) {
      this.categories.forEach(cat => cat.id && this.selectedCategories.delete(cat.id));
    } else {
      this.categories.forEach(cat => cat.id && this.selectedCategories.add(cat.id));
    }
  }

  toggleSelectCategory(categoryId: string) {
    if (this.selectedCategories.has(categoryId)) {
      this.selectedCategories.delete(categoryId);
    } else {
      this.selectedCategories.add(categoryId);
    }
  }

  async bulkActivateCategories() {
    if (this.selectedCategories.size === 0) return;
    try {
      const updates = Array.from(this.selectedCategories).map(id => {
        const category = this.categories.find(cat => cat.id === id);
        if (category) {
          return this.categoryService.updateCategory(id, { ...category, active: true });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      this.selectedCategories.clear();
      await this.loadCategories();
      this.showMessage('admin.models.categories.messages.bulk_activated', 'success');
    } catch (error) {
      console.error('[ModelsAdmin] Bulk activate categories error:', error);
      this.showMessage('admin.models.categories.messages.bulk_failed', 'error');
    }
  }

  async bulkDeactivateCategories() {
    if (this.selectedCategories.size === 0) return;
    try {
      const updates = Array.from(this.selectedCategories).map(id => {
        const category = this.categories.find(cat => cat.id === id);
        if (category) {
          return this.categoryService.updateCategory(id, { ...category, active: false });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      this.selectedCategories.clear();
      await this.loadCategories();
      this.showMessage('admin.models.categories.messages.bulk_deactivated', 'success');
    } catch (error) {
      console.error('[ModelsAdmin] Bulk deactivate categories error:', error);
      this.showMessage('admin.models.categories.messages.bulk_failed', 'error');
    }
  }

  async bulkDeleteCategories() {
    if (this.selectedCategories.size === 0) return;
    const count = this.selectedCategories.size;
    const confirmMessage = this.translate.instant('admin.models.categories.messages.confirm_bulk_delete', { count });
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await Promise.all(
        Array.from(this.selectedCategories).map(id => this.categoryService.deleteCategory(id))
      );
      this.selectedCategories.clear();
      await this.loadCategories();
      this.showMessage('admin.models.categories.messages.bulk_deleted', 'success', { count });
    } catch (error) {
      console.error('[ModelsAdmin] Bulk delete categories error:', error);
      this.showMessage('admin.models.categories.messages.bulk_failed', 'error');
    }
  }

  async deleteCategory(category: Category) {
    if (!category.id) {
      return;
    }

    const confirmMessage = this.translate.instant('admin.models.categories.messages.confirm_delete', {
      name: category.name
    });

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await this.categoryService.deleteCategory(category.id);
      this.showMessage('admin.models.categories.messages.deleted', 'success');
      await this.loadCategories();
    } catch (error) {
      console.error('[ModelsAdmin] Error deleting category:', error);
      this.showMessage('admin.models.categories.messages.delete_failed', 'error');
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedModel = {};
    this.textureHintsInput = '';
    this.defaultTagsInput = '';
  }

  closeCategoryModal() {
    this.showCategoryModal = false;
    this.selectedCategory = {};
  }

  generateSlug() {
    if (!this.selectedModel.name) {
      return;
    }
    this.selectedModel.slug = this.sanitizeSlug(this.selectedModel.name);
  }

  generateCategorySlug() {
    if (!this.selectedCategory.name) {
      return;
    }
    this.selectedCategory.slug = this.sanitizeSlug(this.selectedCategory.name);
  }

  getCategoryName(categoryId: string | undefined): string {
    if (!categoryId) {
      return this.translate.instant('admin.models.table.unassigned');
    }
    const category = this.categories.find(item => item.id === categoryId);
    return category?.name || this.translate.instant('admin.models.table.unassigned');
  }

  trackByModelId(_index: number, model: Model): string {
    return model.id || model.slug;
  }

  private sanitizeSlug(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private parseMultilineList(value: string): string[] | undefined {
    const items = value
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    return items.length ? items : undefined;
  }

  private parseCommaList(value: string): string[] | undefined {
    const items = value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    return items.length ? items : undefined;
  }

  private showMessage(key: string, type: MessageType, params?: Record<string, unknown>) {
    if (this.messageTimer) {
      clearTimeout(this.messageTimer);
      this.messageTimer = null;
    }

    this.messageKey = key;
    this.messageType = type;
    this.messageParams = params ?? {};

    this.messageTimer = setTimeout(() => {
      this.messageKey = null;
      this.messageTimer = null;
    }, 4000);
  }
}
