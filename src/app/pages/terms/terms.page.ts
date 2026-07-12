import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AmkThemeService } from '../../shared/amk-theme/amk-theme.service';

@Component({
  standalone: true,
  selector: 'app-terms',
  imports: [CommonModule, TranslateModule],
  templateUrl: './terms.page.html',
  styleUrls: ['./terms.page.scss']
})
export class TermsPageComponent {
  protected theme = inject(AmkThemeService).theme;
}
