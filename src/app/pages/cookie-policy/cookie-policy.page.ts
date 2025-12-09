import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent, Breadcrumb } from '../../shared/components/page-header/page-header.component';

@Component({
  standalone: true,
  selector: 'app-cookie-policy',
  imports: [CommonModule, TranslateModule, PageHeaderComponent],
  templateUrl: './cookie-policy.page.html',
  styleUrls: ['./cookie-policy.page.scss']
})
export class CookiePolicyPageComponent {
  breadcrumbs: Breadcrumb[] = [
    { label: 'nav.home', url: '/', icon: 'home' },
    { label: 'cookiePolicy.title' }
  ];
}
