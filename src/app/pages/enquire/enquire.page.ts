import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeadSubmissionService } from '../../services/lead-submission.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { FileDropzoneComponent } from '../../shared/components/file-dropzone/file-dropzone.component';
import { EnquirySubmission } from '../../models/studio';
import { AmkThemeService } from '../../shared/amk-theme/amk-theme.service';

@Component({
  selector: 'app-enquire-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileDropzoneComponent],
  templateUrl: './enquire.page.html',
  styleUrl: './enquire.page.scss'
})
export class EnquirePageComponent {
  private fb = inject(FormBuilder);
  private leadSubmission = inject(LeadSubmissionService);
  private seo = inject(SeoSchemaService);
  protected readonly themeService = inject(AmkThemeService);

  protected readonly theme = this.themeService.theme;
  protected readonly logoSrc = this.themeService.logoSrc;

  protected mode = signal<'standard' | 'trade'>('standard');
  protected files: File[] = [];
  protected uploadProgress = 0;
  protected submitting = false;
  protected success = false;
  protected errorMessage = '';

  protected form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    company: [''],
    email: ['', [Validators.required, Validators.email]],
    role: ['', Validators.required],
    projectType: ['', Validators.required],
    preferredMaterial: [''],
    estimatedQuantity: [''],
    targetTimeline: [''],
    businessType: [''],
    orderVolume: [''],
    website: [''],
    projectDescription: ['', [Validators.required, Validators.minLength(20)]]
  });

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Get a Free Quote | Amarka',
      description: 'Tell Amarka what your brand needs — apparel, engraving, promotional products, or corporate gifts. We respond within one business day with scope and pricing.',
      keywords: ['corporate merchandise quote Miami', 'branded apparel quote', 'custom engraving quote', 'promotional products quote'],
      path: '/enquire'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/enquire' });
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
  }

  protected setMode(mode: 'standard' | 'trade') {
    this.mode.set(mode);
    const company = this.form.controls.company;
    const businessType = this.form.controls.businessType;
    if (mode === 'trade') {
      company.setValidators([Validators.required]);
      businessType.setValidators([Validators.required]);
    } else {
      company.clearValidators();
      businessType.clearValidators();
    }
    company.updateValueAndValidity();
    businessType.updateValueAndValidity();
    this.errorMessage = '';
  }

  protected onFilesChange(files: File[]) {
    this.files = files;
    this.errorMessage = '';
  }

  protected async submit() {
    if (this.submitting) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Please complete the required fields highlighted below before sending.';
      return;
    }
    this.submitting = true;
    this.errorMessage = '';
    try {
      const formValue = this.form.getRawValue();
      const uploads = await this.leadSubmission.uploadFiles(this.files, 'enquiries', value => {
        this.uploadProgress = value;
      });
      const { website, ...fields } = formValue;
      const payload: EnquirySubmission = {
        ...fields,
        type: this.mode(),
        fileUploads: uploads,
        sourcePage: '/enquire',
        role: formValue.role as EnquirySubmission['role'],
        leadTags: [this.mode(), formValue.role],
        honeypot: website
      };
      await this.leadSubmission.submitEnquiry(payload);
      this.success = true;
      this.form.reset({
        fullName: '',
        company: '',
        email: '',
        role: '',
        projectType: '',
        preferredMaterial: '',
        estimatedQuantity: '',
        targetTimeline: '',
        businessType: '',
        orderVolume: '',
        website: '',
        projectDescription: ''
      });
      this.files = [];
      this.uploadProgress = 0;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unable to submit your enquiry right now.';
    } finally {
      this.submitting = false;
    }
  }
}
