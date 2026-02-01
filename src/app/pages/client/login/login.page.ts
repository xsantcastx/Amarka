import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../services/auth.service';
import { RecaptchaService } from '../../../services/recaptcha.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPageComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recaptchaService = inject(RecaptchaService);

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  sessionExpiredMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    
    // Check if redirected due to session expiration
    this.route.queryParams.subscribe(params => {
      if (params['sessionExpired'] === 'true') {
        this.sessionExpiredMessage = 'Your session has expired. Please log in again.';
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Execute reCAPTCHA if enabled
      const recaptchaToken = await this.recaptchaService.execute('login');
      if (recaptchaToken) {
        void 0;
      }

      const { email, password } = this.loginForm.value;
      await this.authService.signIn(email, password);
      
      // Redirect to profile page
      this.router.navigate(['/client/profile']);
    } catch (error: any) {
      void 0;
      
      // Handle specific Firebase errors
      if (error.code === 'auth/user-not-found') {
        this.errorMessage = 'client.errors.user_not_found';
      } else if (error.code === 'auth/wrong-password') {
        this.errorMessage = 'client.errors.wrong_password';
      } else if (error.code === 'auth/invalid-credential') {
        this.errorMessage = 'client.errors.invalid_credentials';
      } else {
        this.errorMessage = error.message || 'client.errors.login_failed';
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
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
