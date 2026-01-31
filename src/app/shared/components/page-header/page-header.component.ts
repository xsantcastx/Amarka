import { Component, Input, inject, ChangeDetectionStrategy, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface Breadcrumb {
  label: string;
  url?: string;
  icon?: string;
}

export type PageHeaderVariant = 'default' | 'featured' | 'minimal' | 'hero';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PageHeaderComponent {
  private translate = inject(TranslateService);

  // Content inputs
  @Input() title: string = '';
  @Input() titleHighlight: string = '';
  @Input() subtitle: string = '';
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() icon: string = '';

  // Badge/count inputs
  @Input() showBadge: boolean = false;
  @Input() badgeCount: number = 0;
  @Input() badgeText: string = '';  // Alternative to count

  // Styling inputs
  @Input() variant: PageHeaderVariant = 'default';
  @Input() compact: boolean = false;
  @Input() heroImage: string = '';  // Background image URL
  @Input() overlayOpacity: number = 0.6;  // Background overlay opacity (0-1)
  @Input() align: 'left' | 'center' = 'left';

  // Decorative inputs
  @Input() showDecorative: boolean = true;  // Show decorative gradient blobs
  @Input() accentColor: string = '';  // Custom accent color override

  @HostBinding('class') get hostClasses(): string {
    const classes = ['page-header-host'];
    if (this.variant) classes.push(`page-header--${this.variant}`);
    if (this.compact) classes.push('page-header--compact');
    if (this.heroImage) classes.push('page-header--has-image');
    if (this.align === 'center') classes.push('page-header--centered');
    return classes.join(' ');
  }

  get overlayStyle(): { [key: string]: string } {
    return {
      'opacity': this.overlayOpacity.toString()
    };
  }

  get accentStyle(): { [key: string]: string } | null {
    if (!this.accentColor) return null;
    return {
      '--page-header-accent': this.accentColor
    } as { [key: string]: string };
  }
}
