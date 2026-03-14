import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-quick-actions',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './admin-quick-actions.component.html',
  styleUrls: ['./admin-quick-actions.component.scss']
})
export class AdminQuickActionsComponent {
  @Input() currentPage: string = '';

  isCollapsed = true;
  expandedCategories = new Set<QuickActionCategory>();

  private readonly categoryMeta: Record<QuickActionCategory, QuickActionCategoryMeta> = {
    operations: {
      label: 'Operations',
      description: 'Monitor performance and fine-tune platform controls.',
      icon: 'M12 6V3m0 3a9 9 0 019 9h-3m-6-9a9 9 0 00-9 9h3m6 6v3m0-3a9 9 0 01-9-9H3m9 9a9 9 0 009-9h3'
    },
    catalog: {
      label: 'Content',
      description: 'Manage current studio content and retained legacy catalog data.',
      icon: 'M4 6h16M4 12h16M4 18h16'
    },
    commerce: {
      label: 'Legacy Commerce',
      description: 'Retained storefront operations kept outside the live trade site.',
      icon: 'M12 8c-1.657 0-3-.843-3-2.5S10.343 3 12 3s3 .843 3 2.5S13.657 8 12 8zm0 0c4.418 0 8 2.239 8 5v4H4v-4c0-2.761 3.582-5 8-5zm-4 9h8v2H8z'
    },
    engagement: {
      label: 'Engagement',
      description: 'Shape brand voice, trust signals, and relationships.',
      icon: 'M7 8h10M7 12h6m-3 8C6.477 20 2 16.418 2 12S6.477 4 12 4s10 3.582 10 8-4.477 8-10 8z'
    }
  };

  quickActions: QuickAction[] = [
    {
      labelKey: 'admin.dashboard.title',
      description: 'Real-time overview of key KPIs and status.',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      route: '/admin',
      color: 'blue',
      category: 'operations'
    },
    {
      labelKey: 'admin.products.title',
      description: 'Retained legacy product records from the previous storefront.',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      route: '/admin/legacy/products',
      color: 'orange',
      category: 'catalog'
    },
    {
      labelKey: 'admin.analytics.title',
      description: 'Track funnels, campaign lift, and revenue trends.',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      route: '/admin/analytics',
      color: 'purple',
      category: 'operations'
    },
    {
      labelKey: 'admin.benefit_templates.title',
      description: 'Legacy listing copy helpers retained for the old storefront.',
      icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
      route: '/admin/legacy/benefit-templates',
      color: 'cyan',
      category: 'catalog'
    },
    {
      labelKey: 'admin.gallery.title',
      description: 'Curate project imagery and hero visuals.',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      route: '/admin/gallery',
      color: 'green',
      category: 'catalog'
    },
    {
      labelKey: 'admin.orders.title',
      description: 'Legacy storefront orders retained outside the new public site.',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      route: '/admin/legacy/orders',
      color: 'yellow',
      category: 'commerce'
    },
    {
      labelKey: 'admin.users.title',
      description: 'Manage access, clients, and partner profiles.',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      route: '/admin/users',
      color: 'red',
      category: 'commerce'
    },
    {
      labelKey: 'admin.reviews.title',
      description: 'Showcase social proof and customer sentiment.',
      icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      route: '/admin/reviews',
      color: 'pink',
      category: 'engagement'
    },
    {
      labelKey: 'admin.settings.title',
      description: 'Configure integrations, automation, and policies.',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      route: '/admin/settings',
      color: 'gray',
      category: 'operations'
    }
  ];

  isCurrentPage(route: string): boolean {
    return this.currentPage === route;
  }

  get groupedActions(): Array<{ category: QuickActionCategory; meta: QuickActionCategoryMeta; actions: QuickAction[] }> {
    const grouped = new Map<QuickActionCategory, QuickAction[]>();

    for (const action of this.quickActions) {
      if (!grouped.has(action.category)) {
        grouped.set(action.category, []);
      }
      grouped.get(action.category)!.push(action);
    }

    const orderedCategories: QuickActionCategory[] = ['operations', 'catalog', 'commerce', 'engagement'];

    return orderedCategories
      .filter(category => grouped.has(category))
      .map(category => ({
        category,
        meta: this.categoryMeta[category],
        actions: grouped.get(category)!
      }));
  }

  get activeAction(): QuickAction | undefined {
    return this.quickActions.find(action => this.isCurrentPage(action.route));
  }

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    if (!this.isCollapsed) {
      this.ensureExpandedForActive();
    }
  }

  openCategory(category: QuickActionCategory): void {
    const next = new Set<QuickActionCategory>();
    next.add(category);
    const activeCategory = this.activeAction?.category;
    if (activeCategory) {
      next.add(activeCategory);
    }
    this.expandedCategories = next;
    this.isCollapsed = false;
  }

  toggleCategory(category: QuickActionCategory): void {
    const next = new Set<QuickActionCategory>(this.expandedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    this.expandedCategories = next;
  }

  isCategoryExpanded(category: QuickActionCategory): boolean {
    if (this.expandedCategories.size === 0 && this.activeAction?.category === category) {
      return true;
    }
    return this.expandedCategories.has(category);
  }

  private ensureExpandedForActive(category?: QuickActionCategory): void {
    const next = new Set<QuickActionCategory>(this.expandedCategories);
    if (category) {
      next.add(category);
    }

    if (this.activeAction?.category) {
      next.add(this.activeAction.category);
    }

    if (next.size === 0 && this.groupedActions.length > 0) {
      next.add(this.groupedActions[0].category);
    }

    this.expandedCategories = next;
  }
}

type QuickActionCategory = 'operations' | 'catalog' | 'commerce' | 'engagement';

interface QuickActionCategoryMeta {
  label: string;
  description: string;
  icon: string;
}

interface QuickAction {
  labelKey: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  category: QuickActionCategory;
}
