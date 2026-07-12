import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AmkThemeService } from '../../shared/amk-theme/amk-theme.service';

@Component({
  standalone: true,
  selector: 'app-privacy-policy',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './privacy.page.html',
  styleUrls: ['./privacy.page.scss']
})
export class PrivacyPageComponent {
  protected theme = inject(AmkThemeService).theme;
}
