import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { BenefitTemplateService } from '../../../services/benefit-template.service';
import { CategoryService } from '../../../services/category.service';
import { BenefitTemplate, BENEFIT_ICON_TYPES, BENEFIT_ICON_COLORS } from '../../../models/benefit-template';
import { Category } from '../../../models/catalog';
import { AdminQuickActionsComponent } from '../../../shared/components/admin-quick-actions/admin-quick-actions.component';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';

@Component({
  selector: 'app-benefit-templates-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, FormsModule, TranslateModule, AdminQuickActionsComponent],
  templateUrl: './benefit-templates-admin.page.html',
  styleUrl: './benefit-templates-admin.page.scss'
})
export class BenefitTemplatesAdminComponent extends LoadingComponentBase implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private benefitTemplateService = inject(BenefitTemplateService);
  private categoryService = inject(CategoryService);

  templates: BenefitTemplate[] = [];
  filteredTemplates: BenefitTemplate[] = [];
  categories: Category[] = [];
  
  templateForm: FormGroup;
  showModal = false;
  isEditing = false;
  editingTemplateId: string | null = null;
  
  successMessage = '';
  
  categoryFilter = '';
  activeFilter = '';
  
  // Constants for dropdowns
  iconTypes = BENEFIT_ICON_TYPES;
  iconColors = BENEFIT_ICON_COLORS;

  constructor() {
    super();
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      category: ['', Validators.required],
      icon: ['performance', Validators.required],
      iconColor: ['bitcoin-orange', Validators.required],
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      isActive: [true],
      order: [0, [Validators.required, Validators.min(0)]]
    });
  }

  async ngOnInit() {
    await this.checkAdminAccess();
    await this.loadCategories();
    await this.loadTemplates();
  }

  private async checkAdminAccess() {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/client/login']);
      return;
    }

    const isAdmin = await this.authService.isAdmin(user.uid);
    if (!isAdmin) {
      this.router.navigate(['/']);
      return;
    }
  }

  private async loadCategories() {
    try {
      this.categoryService.getActiveCategories().subscribe({
        next: (categories) => {
          this.categories = categories;
          // Set first category as default if form is empty
          if (this.categories.length > 0 && !this.templateForm.get('category')?.value) {
            this.templateForm.patchValue({ category: this.categories[0].slug });
          }
        },
        error: (error) => {
          void 0;
          this.errorMessage = 'Failed to load categories';
        }
      });
    } catch (error) {
      void 0;
    }
  }

  private async loadTemplates() {
    this.setLoading(true);
    try {
      this.benefitTemplateService.getTemplates().subscribe({
        next: (templates) => {
          this.templates = templates;
          this.applyFilters();
          this.setLoading(false);
        },
        error: (err) => {
          void 0;
          this.setError('Failed to load benefit templates');
        }
      });
    } catch (error) {
      void 0;
      this.setLoading(false);
    }
  }

  applyFilters() {
    this.filteredTemplates = this.templates.filter(template => {
      const categoryMatch = !this.categoryFilter || template.category === this.categoryFilter;
      const activeMatch = !this.activeFilter || 
        (this.activeFilter === 'active' && template.isActive) ||
        (this.activeFilter === 'inactive' && !template.isActive);
      
      return categoryMatch && activeMatch;
    });
  }

  openCreateModal() {
    this.isEditing = false;
    this.editingTemplateId = null;
    this.templateForm.reset({
      name: '',
      category: 'mining',
      icon: 'performance',
      iconColor: 'bitcoin-orange',
      title: '',
      description: '',
      isActive: true,
      order: this.templates.length
    });
    this.showModal = true;
  }

  openEditModal(template: BenefitTemplate) {
    this.isEditing = true;
    this.editingTemplateId = template.id || null;
    this.templateForm.patchValue({
      name: template.name,
      category: template.category,
      icon: template.icon,
      iconColor: template.iconColor,
      title: template.title,
      description: template.description,
      isActive: template.isActive,
      order: template.order
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isEditing = false;
    this.editingTemplateId = null;
    this.templateForm.reset();
  }

  async saveTemplate() {
    if (this.templateForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly.';
      return;
    }

    const formData = this.templateForm.value;

    try {
      if (this.isEditing && this.editingTemplateId) {
        await this.benefitTemplateService.updateTemplate(this.editingTemplateId, formData);
        this.successMessage = 'Template updated successfully!';
      } else {
        await this.benefitTemplateService.createTemplate(formData);
        this.successMessage = 'Template created successfully!';
      }

      this.closeModal();
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      void 0;
      this.errorMessage = error.message || 'Failed to save template';
      setTimeout(() => this.errorMessage = '', 5000);
    }
  }

  async toggleActive(template: BenefitTemplate) {
    if (!template.id) return;

    try {
      await this.benefitTemplateService.toggleActive(template.id, !template.isActive);
      this.successMessage = `Template ${template.isActive ? 'deactivated' : 'activated'}!`;
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      void 0;
      this.errorMessage = error.message || 'Failed to update template';
      setTimeout(() => this.errorMessage = '', 5000);
    }
  }

  async deleteTemplate(template: BenefitTemplate) {
    if (!template.id) return;

    if (!confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await this.benefitTemplateService.deleteTemplate(template.id);
      this.successMessage = 'Template deleted successfully!';
      setTimeout(() => this.successMessage = '', 3000);
    } catch (error: any) {
      void 0;
      this.errorMessage = error.message || 'Failed to delete template';
      setTimeout(() => this.errorMessage = '', 5000);
    }
  }

  getCategoryLabel(slug: string): string {
    const category = this.categories.find(c => c.slug === slug);
    return category ? category.name : slug;
  }

  getCategoryBadgeColor(slug: string): string {
    const colors = [
      'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'bg-green-500/20 text-green-400 border-green-500/30',
      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'bg-pink-500/20 text-pink-400 border-pink-500/30',
      'bg-bitcoin-gold/20 text-bitcoin-gold border-bitcoin-gold/30'
    ];
    
    const index = this.categories.findIndex(c => c.slug === slug);
    return index >= 0 ? colors[index % colors.length] : colors[colors.length - 1];
  }

  getColorPreview(colorValue: string): string {
    const color = this.iconColors.find(c => c.value === colorValue);
    return color ? color.preview : '#F7931A';
  }

  /**
   * Get SVG path for icon preview
   */
  getBenefitIconPath(iconType: string): string {
    const iconPaths: Record<string, string> = {
      'performance': 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
      'efficiency': 'M13 10V3L4 14h7v7l9-11h-7z',
      'reliability': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      'support': 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z',
      'quality': 'M5 13l4 4L19 7',
      'security': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      'warranty': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      'design': 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      'value': 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    };
    return iconPaths[iconType] || iconPaths['performance'];
  }
}
