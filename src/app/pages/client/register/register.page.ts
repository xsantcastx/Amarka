import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { SettingsService } from '../../../services/settings.service';
import { RecaptchaService } from '../../../services/recaptcha.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss'
})
export class RegisterPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private settingsService = inject(SettingsService);
  private recaptchaService = inject(RecaptchaService);

  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;
  passwordMinLength = 6; // Default, will be updated from settings

  constructor() {
    this.registerForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      company: [''],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
    
    // Load password min length from settings
    this.loadPasswordRequirements();
  }

  async loadPasswordRequirements() {
    const settings = await this.settingsService.getSettings();
    this.passwordMinLength = settings.passwordMinLength;
    
    // Update password validator with new min length
    const passwordControl = this.registerForm.get('password');
    if (passwordControl) {
      passwordControl.setValidators([
        Validators.required, 
        Validators.minLength(settings.passwordMinLength)
      ]);
      passwordControl.updateValueAndValidity();
    }
    
    void 0;
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onSubmit() {
    if (this.registerForm.invalid) {
      this.markFormGroupTouched(this.registerForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Execute reCAPTCHA if enabled
      const recaptchaToken = await this.recaptchaService.execute('register');
      if (recaptchaToken) {
        void 0;
      }

      const { email, password, displayName, company, phone } = this.registerForm.value;
      await this.authService.register(email, password, displayName, company, phone);
      
      // Redirect to profile page
      this.router.navigate(['/client/profile']);
    } catch (error: any) {
      void 0;
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'client.errors.email_in_use';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'client.errors.weak_password';
      } else {
        this.errorMessage = error.message || 'client.errors.registration_failed';
      }
    } finally {
      this.isLoading = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Helper methods for template
  get displayName() {
    return this.registerForm.get('displayName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get company() {
    return this.registerForm.get('company');
  }

  get phone() {
    return this.registerForm.get('phone');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
}
