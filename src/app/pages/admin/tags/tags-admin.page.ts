import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TagService } from '../../../services/tag.service';
import { Tag } from '../../../models/catalog';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';

@Component({
  selector: 'app-tags-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './tags-admin.page.html',
  styleUrls: ['./tags-admin.page.scss']
})
export class TagsAdminComponent extends LoadingComponentBase implements OnInit {
  private tagService = inject(TagService);
  
  tags: Tag[] = [];
  showModal = false;
  isEditMode = false;
  selectedTag: Partial<Tag> = {};
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  async ngOnInit() {
    await this.loadTags();
  }

  async loadTags() {
    await this.withLoading(async () => {
      const tags = await new Promise<Tag[]>((resolve, reject) => {
        this.tagService.getTags().subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err)
        });
      });
      this.tags = tags;
    });
  }

  addNew() {
    this.selectedTag = {
      name: '',
      slug: '',
      color: '#F7931A',
      order: this.tags.length + 1,
      active: true
    };
    this.isEditMode = false;
    this.showModal = true;
  }

  edit(tag: Tag) {
    this.selectedTag = { ...tag };
    this.isEditMode = true;
    this.showModal = true;
  }

  async save() {
    if (!this.selectedTag.name || !this.selectedTag.slug) {
      this.showMessage('Name and slug are required', 'error');
      return;
    }

    try {
      if (this.isEditMode && this.selectedTag.id) {
        await this.tagService.updateTag(this.selectedTag.id, this.selectedTag);
        this.showMessage('Tag updated successfully', 'success');
      } else {
        await this.tagService.addTag(this.selectedTag as Omit<Tag, 'id'>);
        this.showMessage('Tag created successfully', 'success');
      }
      this.loadTags();
      this.closeModal();
    } catch (error: any) {
      console.error('Error saving tag:', error);
      this.showMessage('Error saving tag: ' + error.message, 'error');
    }
  }

  async delete(tag: Tag) {
    if (!tag.id || !confirm(`Are you sure you want to delete "${tag.name}"?`)) return;
    
    try {
      await this.tagService.deleteTag(tag.id);
      this.showMessage('Tag deleted successfully', 'success');
      this.loadTags();
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      this.showMessage('Error deleting tag: ' + error.message, 'error');
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedTag = {};
  }

  generateSlug() {
    if (this.selectedTag.name) {
      this.selectedTag.slug = this.selectedTag.name
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
