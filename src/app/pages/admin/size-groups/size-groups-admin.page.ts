import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SizeGroupService } from '../../../services/size-group.service';
import { SizeGroup } from '../../../models/catalog';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';

@Component({
  selector: 'app-size-groups-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './size-groups-admin.page.html',
  styleUrls: ['./size-groups-admin.page.scss']
})
export class SizeGroupsAdminComponent extends LoadingComponentBase implements OnInit {
  private sizeGroupService = inject(SizeGroupService);
  
  sizeGroups: SizeGroup[] = [];
  showModal = false;
  isEditMode = false;
  selectedSizeGroup: Partial<SizeGroup> = {};
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  async ngOnInit() {
    await this.loadSizeGroups();
  }

  async loadSizeGroups() {
    await this.withLoading(async () => {
      const groups = await new Promise<SizeGroup[]>((resolve, reject) => {
        this.sizeGroupService.getAllSizeGroups().subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err)
        });
      });
      this.sizeGroups = groups;
    });
  }

  addNew() {
    this.selectedSizeGroup = {
      name: '',
      slug: '',
      display: '',
      active: true
    };
    this.isEditMode = false;
    this.showModal = true;
  }

  edit(sizeGroup: SizeGroup) {
    this.selectedSizeGroup = { ...sizeGroup };
    this.isEditMode = true;
    this.showModal = true;
  }

  async save() {
    if (!this.selectedSizeGroup.name || !this.selectedSizeGroup.slug) {
      this.showMessage('Name and slug are required', 'error');
      return;
    }

    try {
      if (this.isEditMode && this.selectedSizeGroup.id) {
        await this.sizeGroupService.updateSizeGroup(this.selectedSizeGroup.id, this.selectedSizeGroup);
        this.showMessage('Size group updated successfully', 'success');
      } else {
        await this.sizeGroupService.addSizeGroup(this.selectedSizeGroup as Omit<SizeGroup, 'id'>);
        this.showMessage('Size group created successfully', 'success');
      }
      this.loadSizeGroups();
      this.closeModal();
    } catch (error: any) {
      console.error('Error saving size group:', error);
      this.showMessage('Error saving size group: ' + error.message, 'error');
    }
  }

  async delete(sizeGroup: SizeGroup) {
    if (!sizeGroup.id || !confirm(`Are you sure you want to delete "${sizeGroup.name}"?`)) return;
    
    try {
      await this.sizeGroupService.deleteSizeGroup(sizeGroup.id);
      this.showMessage('Size group deleted successfully', 'success');
      this.loadSizeGroups();
    } catch (error: any) {
      console.error('Error deleting size group:', error);
      this.showMessage('Error deleting size group: ' + error.message, 'error');
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedSizeGroup = {};
  }

  generateSlug() {
    if (this.selectedSizeGroup.name) {
      this.selectedSizeGroup.slug = this.selectedSizeGroup.name
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
