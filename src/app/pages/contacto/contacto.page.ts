import { Component, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { EmailService } from '../../services/email.service';
import { AnalyticsService } from '../../services/analytics.service';
import { SettingsService } from '../../services/settings.service';
import { PageHeaderComponent, Breadcrumb } from '../../shared/components/page-header/page-header.component';
import { MetaService } from '../../services/meta.service';

interface ContactFormData {
  nombre: string;
  email: string;
  telefono: string;
  empresa?: string;
  eventDate?: string;
  location?: string;
  guestCount?: string;
  budget?: string;
  mensaje: string;
  aceptarPrivacidad: boolean;
}

@Component({
  selector: 'app-contacto-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslateModule],
  templateUrl: './contacto.page.html',
  styleUrl: './contacto.page.scss'
})
export class ContactoPageComponent {
  private platformId = inject(PLATFORM_ID);
  private analyticsService = inject(AnalyticsService);
  private metaService = inject(MetaService);
  private settingsService = inject(SettingsService);
  
  // Breadcrumbs for navigation
  breadcrumbs: Breadcrumb[] = [
    { label: 'nav.home', url: '/', icon: 'home' },
    { label: 'nav.contact', icon: 'contact' }
  ];
  
  contactForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  submitError = false;
  submitErrorMessage = '';

  // Settings loaded from SettingsService
  contactEmail = '';
  contactPhone = '';
  contactAddress = '';
  whatsappNumber = '';

  // Hero settings
  heroImage = '/assets/contact/hero-contact.jpg';
  heroTitle = 'Tell us about your celebration';
  heroSubtitle = 'Share your date, location, and vision. We respond within one business day to craft a bespoke plan for your event.';

  constructor(
    private fb: FormBuilder,
    private emailService: EmailService
  ) {
    // Set page meta tags from settings
    this.metaService.setPageMeta({
      title: 'Contact Amarka Engraving',
      description: 'Tell us about your celebration and we will design a bespoke plan.'
    });

    // Load settings
    this.loadSettings();

    this.contactForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      telefono: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\s\-\(\)]{7,15}$/)]],
      empresa: ['', [Validators.maxLength(100)]],
      eventDate: ['', [Validators.maxLength(50)]],
      location: ['', [Validators.maxLength(150)]],
      guestCount: ['', [Validators.maxLength(50)]],
      budget: ['', [Validators.maxLength(50)]],
      mensaje: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      aceptarPrivacidad: [false, [Validators.requiredTrue]]
    });
    
    // Track form start when user starts filling it
    this.contactForm.valueChanges.subscribe(() => {
      if (!this.isSubmitting && !this.submitSuccess) {
        this.analyticsService.trackFormStart('contact_form');
      }
    });
  }

  async onSubmit() {
    if (this.contactForm.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.submitError = false;
      this.submitSuccess = false;
      
      const formData: ContactFormData = this.contactForm.value;
      
      // Only submit if in browser (not during SSR)
      if (isPlatformBrowser(this.platformId)) {
        try {
          await this.emailService.sendContactForm(formData);
          
          // Track successful form submission
          this.analyticsService.trackFormSubmit('contact_form', true);
          this.analyticsService.trackContactSubmit('form', {
            empresa: !!formData.empresa,
            form_location: 'contacto_page'
          });
          
          this.isSubmitting = false;
          this.submitSuccess = true;
          this.contactForm.reset();
          
          // Reset success message after 8 seconds
          setTimeout(() => {
            this.submitSuccess = false;
          }, 8000);
        } catch (error: any) {
          // Track form error
          this.analyticsService.trackFormSubmit('contact_form', false);
          this.analyticsService.trackFormError('contact_form', 'submission_error');
          
          this.isSubmitting = false;
          this.submitError = true;
          this.submitErrorMessage = error.message || 'There was an error sending your message. Please try again.';
          
          // Reset error message after 10 seconds
          setTimeout(() => {
            this.submitError = false;
          }, 10000);
        }
      } else {
        // Fallback for SSR
        setTimeout(() => {
          this.isSubmitting = false;
          this.submitSuccess = true;
          this.contactForm.reset();
        }, 1000);
      }
    } else {
      // Mark all fields as touched to show validation errors
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.contactForm.controls).forEach(key => {
      const control = this.contactForm.get(key);
      control?.markAsTouched();
      
      // If it's a nested form group, recursively mark as touched
      if (control instanceof FormGroup) {
        this.markFormGroupTouched();
      }
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (field?.errors && field.touched) {
      const errors = field.errors;
      
      if (errors['required']) {
        const fieldLabels: { [key: string]: string } = {
          'nombre': 'Name',
          'email': 'Email',
          'telefono': 'Phone',
          'mensaje': 'Message',
          'aceptarPrivacidad': 'Privacy acceptance'
        };
        return `${fieldLabels[fieldName] || fieldName} is required`;
      }
      
      if (errors['email']) return 'Enter a valid email address';
      if (errors['pattern'] && fieldName === 'telefono') return 'Enter a valid phone number';
      if (errors['minlength']) return `Must be at least ${errors['minlength'].requiredLength} characters`;
      if (errors['maxlength']) return `Cannot be more than ${errors['maxlength'].requiredLength} characters`;
    }
    return '';
  }

  // Getter for form field states to use in template
  isFieldInvalid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field?.valid && field?.touched);
  }

  // Phone number formatting helper
  formatPhoneNumber(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove non-digits
    
    // Simple US formatting with country code
    if (value.startsWith('1')) {
      value = '+1 ' + value.substring(1);
    } else if (value.length > 0 && !value.startsWith('+')) {
      value = '+1 ' + value;
    }
    
    this.contactForm.patchValue({ telefono: value });
  }

  async loadSettings() {
    try {
      const settings = await this.settingsService.getSettings();
      this.contactEmail = settings.contactEmail || '';
      this.contactPhone = settings.contactPhone || '';
      this.contactAddress = settings.contactAddress || '';
      this.whatsappNumber = settings.whatsappNumber || '';
      
      // Load hero settings
      this.heroImage = settings.contactoHeroImage || this.heroImage;
      this.heroTitle = settings.contactoHeroTitle || this.heroTitle;
      this.heroSubtitle = settings.contactoHeroSubtitle || this.heroSubtitle;
    } catch (error) {
      console.error('[Contacto] Error loading settings:', error);
    }
  }

  getWhatsAppUrl(): string {
    if (!this.whatsappNumber) return '#';
    const cleanNumber = this.whatsappNumber.replace(/\D/g, '');
    const message = encodeURIComponent('Hello! I would like to know more about your services.');
    return `https://wa.me/${cleanNumber}?text=${message}`;
  }
}
