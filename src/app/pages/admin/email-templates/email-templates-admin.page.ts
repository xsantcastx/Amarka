import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TemplateService } from '../../../services/template.service';
import { Template } from '../../../models/catalog';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';

@Component({
  selector: 'app-email-templates-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './email-templates-admin.page.html',
  styleUrls: ['./email-templates-admin.page.scss']
})
export class EmailTemplatesAdminComponent extends LoadingComponentBase implements OnInit {
  private templateService = inject(TemplateService);
  
  templates: Template[] = [];
  showModal = false;
  isEditMode = false;
  selectedTemplate: Partial<Template> = {};
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  // Template type and scope options
  templateTypes: Template['type'][] = ['description', 'seoTitle', 'seoMeta', 'specs'];
  templateScopes: Template['scope'][] = ['model', 'category', 'tag', 'global'];
  languages = ['es', 'en', 'fr', 'it'];

  async ngOnInit() {
    await this.loadTemplates();
  }

  async loadTemplates() {
    await this.withLoading(async () => {
      const templates = await new Promise<Template[]>((resolve, reject) => {
        this.templateService.getAllTemplates().subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err)
        });
      });
      this.templates = templates;
    });
  }

  addNew() {
    this.selectedTemplate = {
      type: 'description',
      scope: 'global',
      language: 'es',
      active: true,
      content: '',
      fields: []
    };
    this.isEditMode = false;
    this.showModal = true;
  }

  edit(template: Template) {
    this.selectedTemplate = { ...template };
    this.isEditMode = true;
    this.showModal = true;
  }

  async save() {
    if (!this.selectedTemplate.type || !this.selectedTemplate.scope || !this.selectedTemplate.language) {
      this.showMessage('Type, scope, and language are required', 'error');
      return;
    }

    try {
      if (this.isEditMode && this.selectedTemplate.id) {
        await this.templateService.updateTemplate(this.selectedTemplate.id, this.selectedTemplate);
        this.showMessage('Template updated successfully', 'success');
      } else {
        await this.templateService.addTemplate(this.selectedTemplate as Omit<Template, 'id'>);
        this.showMessage('Template created successfully', 'success');
      }
      await this.loadTemplates();
      this.closeModal();
    } catch (error: any) {
      console.error('Error saving template:', error);
      this.showMessage('Error saving template: ' + error.message, 'error');
    }
  }

  async delete(template: Template) {
    if (!template.id || !confirm(`Are you sure you want to delete this ${template.type} template?`)) return;
    
    try {
      await this.templateService.deleteTemplate(template.id);
      this.showMessage('Template deleted successfully', 'success');
      await this.loadTemplates();
    } catch (error: any) {
      console.error('Error deleting template:', error);
      this.showMessage('Error deleting template: ' + error.message, 'error');
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedTemplate = {};
  }

  showMessage(msg: string, type: 'success' | 'error' | 'info') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  getScopeLabel(scope: string): string {
    const labels: Record<string, string> = {
      'model': 'Model',
      'category': 'Category',
      'tag': 'Tag',
      'global': 'Global'
    };
    return labels[scope] || scope;
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'description': 'Description',
      'seoTitle': 'SEO Title',
      'seoMeta': 'SEO Meta',
      'specs': 'Specifications'
    };
    return labels[type] || type;
  }
}
