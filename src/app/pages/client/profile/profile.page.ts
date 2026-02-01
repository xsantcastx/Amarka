import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface ProfileHighlight {
  icon: 'calendar' | 'clock' | 'shield' | 'user';
  labelKey: string;
  value: string;
  tone?: 'success' | 'warning';
}
import { AuthService, UserProfile } from '../../../services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss'
})
export class ProfilePageComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  profileForm: FormGroup;
  userProfile: UserProfile | null = null;
  isLoading = true;
  isSaving = false;
  successMessage = '';
  errorMessage = '';
  isEditMode = false;
  emailVerified = false;

  profileHighlights: ProfileHighlight[] = [];
  accountStatusText = '';

  constructor() {
    this.profileForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      company: [''],
      phone: ['']
    });
  }

  async ngOnInit() {
    this.loadUserProfile();
  }

  private async loadUserProfile() {
    this.isLoading = true;
    this.cdr.markForCheck();
    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        this.router.navigate(['/client/login']);
        return;
      }
      this.emailVerified = !!user.emailVerified;

      const profile = await this.authService.getUserProfile(user.uid);
      if (profile) {
        this.userProfile = this.normalizeProfileDates(profile);
        this.profileForm.patchValue({
          displayName: this.userProfile.displayName || '',
          company: this.userProfile.company || '',
          phone: this.userProfile.phone || ''
        });
        this.buildProfileHighlights();
        this.cdr.markForCheck();
      }
    } catch (error) {
      void 0;
      this.errorMessage = 'client.profile_messages.load_error';
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.markForCheck();

    if (!this.isEditMode) {
      // Reset form if canceling
      this.profileForm.patchValue({
        displayName: this.userProfile?.displayName || '',
        company: this.userProfile?.company || '',
        phone: this.userProfile?.phone || ''
      });
      this.cdr.markForCheck();
    }
  }

  async onSubmit() {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.isSaving = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      const user = this.authService.getCurrentUser();
      if (!user) {
        throw new Error('No user logged in');
      }

      const updates = this.profileForm.value;
      await this.authService.updateUserProfile(user.uid, updates);

      // Reload profile
      await this.loadUserProfile();
      
      this.isEditMode = false;
      this.successMessage = 'client.profile_messages.updated';
      this.cdr.markForCheck();
    } catch (error) {
      void 0;
      this.errorMessage = 'client.profile_messages.update_error';
      this.cdr.markForCheck();
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  async logout() {
    try {
      await this.authService.signOutUser('/client/login');
    } catch (error) {
      void 0;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods
  get displayName() {
    return this.profileForm.get('displayName');
  }

  get company() {
    return this.profileForm.get('company');
  }

  get phone() {
    return this.profileForm.get('phone');
  }

  private normalizeProfileDates(profile: UserProfile): UserProfile {
    const toDate = (value: unknown): Date | undefined => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      if (typeof (value as any)?.toDate === 'function') {
        const converted = (value as any).toDate();
        return converted instanceof Date ? converted : undefined;
      }
      const parsed = new Date(value as string);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    };

    return {
      ...profile,
      createdAt: toDate(profile.createdAt) ?? new Date(),
      updatedAt: toDate(profile.updatedAt),
      lastLogin: toDate(profile.lastLogin),
      lastFailedLogin: toDate(profile.lastFailedLogin),
      lockedUntil: toDate(profile.lockedUntil)
    };
  }

  private buildProfileHighlights(): void {
    if (!this.userProfile) {
      this.profileHighlights = [];
      this.accountStatusText = '';
      return;
    }

    const { role, createdAt, lastLogin } = this.userProfile;
    const status = this.resolveAccountStatus();
    this.accountStatusText = this.translate.instant(status.key, status.params);

    this.profileHighlights = [
      {
        icon: 'calendar',
        labelKey: 'client.profile_metrics.member_since',
        value: this.formatDate(createdAt, { dateStyle: 'long' })
      },
      {
        icon: 'clock',
        labelKey: 'client.profile_metrics.last_login',
        value: lastLogin
          ? this.formatDate(lastLogin, { dateStyle: 'medium', timeStyle: 'short' })
          : this.translate.instant('client.profile_metrics.last_login_never')
      },
      {
        icon: 'shield',
        labelKey: 'client.profile_metrics.account_status',
        value: this.accountStatusText,
        tone: status.tone
      },
      {
        icon: 'user',
        labelKey: 'client.profile_metrics.account_type',
        value: this.translate.instant(role === 'admin' ? 'client.profile_role.admin' : 'client.profile_role.client')
      }
    ];
  }

  private resolveAccountStatus(): { key: string; params?: Record<string, any>; tone: 'success' | 'warning' } {
    if (!this.userProfile) {
      return { key: 'client.profile_status.active', tone: 'success' };
    }

    if (this.userProfile.disabled) {
      return { key: 'client.profile_status.disabled', tone: 'warning' };
    }

    if (this.userProfile.lockedUntil) {
      const isLocked =
        this.userProfile.lockedUntil instanceof Date
          ? this.userProfile.lockedUntil.getTime() > Date.now()
          : false;
      if (isLocked) {
        return {
          key: 'client.profile_status.locked_until',
          params: { date: this.formatDate(this.userProfile.lockedUntil, { dateStyle: 'medium', timeStyle: 'short' }) },
          tone: 'warning'
        };
      }
    }

    return { key: 'client.profile_status.active', tone: 'success' };
  }

  private formatDate(date?: Date, options?: Intl.DateTimeFormatOptions): string {
    if (!date) {
      return this.translate.instant('client.profile_metrics.not_available');
    }

    try {
      const formatter = new Intl.DateTimeFormat(this.translate.currentLang || 'en', {
        dateStyle: 'medium',
        ...options
      });
      return formatter.format(date);
    } catch {
      return date.toLocaleString();
    }
  }
}
