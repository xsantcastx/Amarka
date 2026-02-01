import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AdminQuickActionsComponent } from '../../../shared/components/admin-quick-actions/admin-quick-actions.component';
import { CategoryService } from '../../../services/category.service';
import { Category } from '../../../models/catalog';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';

@Component({
  selector: 'app-categories-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, AdminQuickActionsComponent],
  templateUrl: './categories-admin.page.html',
  styleUrls: ['./categories-admin.page.scss']
})
export class CategoriesAdminComponent extends LoadingComponentBase implements OnInit {
  private categoryService = inject(CategoryService);
  
  categories: Category[] = [];
  showModal = false;
  isEditMode = false;
  selectedCategory: Partial<Category> = {};
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  async ngOnInit() {
    await this.loadCategories();
  }

  async loadCategories() {
    await this.withLoading(async () => {
      const categories = await new Promise<Category[]>((resolve, reject) => {
        this.categoryService.getAllCategories().subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err)
        });
      });
      this.categories = categories;
    });
  }

  addNew() {
    this.selectedCategory = {
      name: '',
      slug: '',
      order: this.categories.length + 1,
      active: true
    };
    this.isEditMode = false;
    this.showModal = true;
  }

  edit(category: Category) {
    this.selectedCategory = { ...category };
    this.isEditMode = true;
    this.showModal = true;
  }

  async save() {
    if (!this.selectedCategory.name || !this.selectedCategory.slug) {
      this.showMessage('Name and slug are required', 'error');
      return;
    }

    try {
      if (this.isEditMode && this.selectedCategory.id) {
        await this.categoryService.updateCategory(this.selectedCategory.id, this.selectedCategory);
        this.showMessage('Category updated successfully', 'success');
      } else {
        await this.categoryService.addCategory(this.selectedCategory as Omit<Category, 'id'>);
        this.showMessage('Category created successfully', 'success');
      }
      this.loadCategories();
      this.closeModal();
    } catch (error: any) {
      void 0;
      this.showMessage('Error saving category: ' + error.message, 'error');
    }
  }

  async delete(category: Category) {
    if (!category.id || !confirm(`Are you sure you want to delete "${category.name}"?`)) return;
    
    try {
      await this.categoryService.deleteCategory(category.id);
      this.showMessage('Category deleted successfully', 'success');
      this.loadCategories();
    } catch (error: any) {
      void 0;
      this.showMessage('Error deleting category: ' + error.message, 'error');
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedCategory = {};
  }

  generateSlug() {
    if (this.selectedCategory.name) {
      this.selectedCategory.slug = this.selectedCategory.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  showMessage(msg: string, type: 'success' | 'error' | 'info') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }
}
