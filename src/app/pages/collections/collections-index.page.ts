import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CollectionsService, CollectionDoc } from '../../services/collections.service';
import { PageHeaderComponent, Breadcrumb } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-collections-index',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, PageHeaderComponent],
  templateUrl: './collections-index.page.html',
  styleUrls: ['./collections-index.page.scss']
})
export class CollectionsIndexPageComponent implements OnInit {
  private collectionsService = inject(CollectionsService);
  private cdr = inject(ChangeDetectorRef);

  breadcrumbs: Breadcrumb[] = [
    { label: 'nav.home', url: '/', icon: 'home' },
    { label: 'collections.title' }
  ];

  collections: CollectionDoc[] = [];
  isLoading = true;

  async ngOnInit() {
    await this.loadCollections();
  }

  private async loadCollections() {
    this.isLoading = true;
    this.cdr.detectChanges();
    try {
      const all = await this.collectionsService.getAllCollections();
      this.collections = all
        .filter(c => c.active !== false)
        .sort((a, b) => a.name.localeCompare(b.name));
      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error loading collections', err);
      this.collections = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
