import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent, Breadcrumb } from '../../shared/components/page-header/page-header.component';

@Component({
  standalone: true,
  selector: 'app-privacy-policy',
  imports: [CommonModule, TranslateModule, PageHeaderComponent],
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss']
})
export class PrivacyPageComponent {
  breadcrumbs: Breadcrumb[] = [
    { label: 'nav.home', url: '/', icon: 'home' },
    { label: 'privacy.title' }
  ];
}
