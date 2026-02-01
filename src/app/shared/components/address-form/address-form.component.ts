import { Component, OnInit, inject, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { Address } from '../../../models/cart';
import { AddressService } from '../../../services/address.service';

// Common countries for dropdown (Currently US only for tax calculation)
export const COUNTRIES = [
  { code: 'US', name: 'United States', dialCode: '+1' },
];

// US States for dropdown
export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

@Component({
  selector: 'app-address-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './address-form.component.html',
  styleUrls: ['./address-form.component.scss']
})
export class AddressFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private addressService = inject(AddressService);

  @Input() address?: Address; // For editing existing address
  @Input() submitButtonText = 'Save Address';
  @Output() saved = new EventEmitter<Address>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  countries = COUNTRIES;
  usStates = US_STATES;
  selectedCountryDialCode = '+1';
  
  submitting = false;
  error: string | null = null;
  success: string | null = null;

  ngOnInit() {
    this.buildForm();
    
    // If editing, populate form
    if (this.address) {
      this.populateForm(this.address);
    }

    // Watch country changes to update dial code
    this.form.get('country')?.valueChanges.subscribe(countryCode => {
      const country = this.countries.find(c => c.code === countryCode);
      if (country) {
        this.selectedCountryDialCode = country.dialCode;
      }
    });
  }

  private buildForm() {
    this.form = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      line1: ['', [Validators.required]],
      line2: [''],
      city: ['', [Validators.required]],
      region: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      country: ['US', [Validators.required]],
      phone: ['', [Validators.required]], // User enters without country code
      email: ['', [Validators.required, Validators.email]],
      company: [''],
      unit: [''],
      buzzer: [''],
      deliveryNotes: [''],
      isDefault: [false]
    });
  }

  private populateForm(address: Address) {
    // Parse phone number to extract national number
    let phoneNational = '';
    try {
      if (address.phoneE164) {
        const phoneNumber = parsePhoneNumber(address.phoneE164);
        phoneNational = phoneNumber.nationalNumber as string;
        
        // Set country based on phone if available
        if (phoneNumber.country) {
          this.form.patchValue({ country: phoneNumber.country });
        }
      }
    } catch (err) {
      void 0;
      phoneNational = address.phoneE164?.replace(/^\+\d+/, '') || '';
    }

    this.form.patchValue({
      firstName: address.firstName,
      lastName: address.lastName,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
      phone: phoneNational,
      email: address.email,
      company: address.company || '',
      unit: address.unit || '',
      buzzer: address.buzzer || '',
      deliveryNotes: address.deliveryNotes || '',
      isDefault: address.isDefault || false
    });
  }

  /**
   * Convert phone to E.164 format
   */
  private formatPhoneE164(phone: string, countryCode: string): string {
    try {
      // Remove any non-digit characters
      const cleaned = phone.replace(/\D/g, '');
      
      // Parse with country code
      const phoneNumber = parsePhoneNumber(cleaned, countryCode as any);
      
      if (phoneNumber && isValidPhoneNumber(phoneNumber.number, countryCode as any)) {
        return phoneNumber.number;
      }
      
      // Fallback: manual construction
      const country = this.countries.find(c => c.code === countryCode);
      return `${country?.dialCode || '+1'}${cleaned}`;
    } catch (err) {
      void 0;
      const country = this.countries.find(c => c.code === countryCode);
      return `${country?.dialCode || '+1'}${phone.replace(/\D/g, '')}`;
    }
  }

  /**
   * Validate phone number for selected country
   */
  get phoneError(): string | null {
    const phoneControl = this.form.get('phone');
    const countryControl = this.form.get('country');
    
    if (!phoneControl?.touched || !phoneControl?.value) {
      return null;
    }

    try {
      const phone = phoneControl.value;
      const country = countryControl?.value || 'US';
      
      if (!isValidPhoneNumber(phone, country as any)) {
        return 'Invalid phone number for selected country';
      }
      
      return null;
    } catch {
      return 'Invalid phone number format';
    }
  }

  /**
   * Submit the form
   */
  async onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;
    this.success = null;

    try {
      const formValue = this.form.value;
      
      // Format phone to E.164
      const phoneE164 = this.formatPhoneE164(formValue.phone, formValue.country);

      const addressData: Omit<Address, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        line1: formValue.line1,
        line2: formValue.line2 || undefined,
        city: formValue.city,
        region: formValue.region,
        postalCode: formValue.postalCode,
        country: formValue.country,
        phoneE164,
        email: formValue.email,
        company: formValue.company || undefined,
        unit: formValue.unit || undefined,
        buzzer: formValue.buzzer || undefined,
        deliveryNotes: formValue.deliveryNotes || undefined,
        isDefault: formValue.isDefault || false
      };

      // Validate
      const validation = this.addressService.validateAddress(addressData);
      if (!validation.valid) {
        this.error = validation.errors.join(', ');
        this.submitting = false;
        return;
      }

      // Save
      if (this.address?.id) {
        // Update existing
        await this.addressService.updateAddress(this.address.id, addressData);
        this.success = 'Address updated successfully!';
      } else {
        // Create new
        const newId = await this.addressService.createAddress(addressData);
        this.success = 'Address saved successfully!';
        // Emit with the new ID
        this.saved.emit({ ...addressData, id: newId } as Address);
        
        // Reset form after a short delay
        setTimeout(() => {
          if (!this.address) {
            this.form.reset({ country: 'US', isDefault: false });
          }
        }, 1500);
        
        return;
      }

      // Emit success for updates
      this.saved.emit(addressData as Address);
      
      // Reset form after a short delay
      setTimeout(() => {
        if (!this.address) {
          this.form.reset({ country: 'US', isDefault: false });
        }
      }, 1500);

    } catch (err: any) {
      void 0;
      this.error = err.message || 'Failed to save address. Please try again.';
    } finally {
      this.submitting = false;
    }
  }

  /**
   * Cancel editing
   */
  onCancel() {
    this.cancelled.emit();
  }

  /**
   * Helper to check if field has error
   */
  hasError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Get error message for a field
   */
  getErrorMessage(field: string): string {
    const control = this.form.get(field);
    
    if (!control || !control.errors || !control.touched) {
      return '';
    }

    if (control.errors['required']) {
      return 'This field is required';
    }

    if (control.errors['email']) {
      return 'Please enter a valid email';
    }

    if (control.errors['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} characters required`;
    }

    return 'Invalid value';
  }
}
