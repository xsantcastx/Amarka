import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { AmkThemeService } from '../../shared/amk-theme/amk-theme.service';

@Component({
  standalone: true,
  selector: 'app-cookie-policy',
  imports: [CommonModule, TranslateModule],
  templateUrl: './cookie-policy.page.html',
  styleUrls: ['./cookie-policy.page.scss']
})
export class CookiePolicyPageComponent {
  protected theme = inject(AmkThemeService).theme;
}
