import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageHeaderComponent, Breadcrumb } from '../../shared/components/page-header/page-header.component';

@Component({
  standalone: true,
  selector: 'app-terms',
  imports: [CommonModule, TranslateModule, PageHeaderComponent],
  templateUrl: './terms.page.html',
  styleUrls: ['./terms.page.scss']
})
export class TermsPageComponent {
  breadcrumbs: Breadcrumb[] = [
    { label: 'nav.home', url: '/', icon: 'home' },
    { label: 'terms.title' }
  ];
}
