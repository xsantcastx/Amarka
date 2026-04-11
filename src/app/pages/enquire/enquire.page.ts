import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LeadSubmissionService } from '../../services/lead-submission.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { FileDropzoneComponent } from '../../shared/components/file-dropzone/file-dropzone.component';
import { EnquirySubmission } from '../../models/studio';

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
    role: ['designer', Validators.required],
    projectType: ['', Validators.required],
    preferredMaterial: [''],
    estimatedQuantity: [''],
    targetTimeline: [''],
    projectDescription: ['', [Validators.required, Validators.minLength(20)]]
  });

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Start Your Commission | Enquire with Amarka',
      description: 'Send your project brief, timeline, and files to Amarka. We respond within 24 hours for Connecticut and tri-state trade and commercial engraving enquiries.',
      keywords: ['laser engraving Connecticut enquiry', 'custom signage Connecticut quote', 'trade engraving enquiry'],
      path: '/enquire'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/enquire' });
  }

  protected setMode(mode: 'standard' | 'trade') {
    this.mode.set(mode);
  }

  protected onFilesChange(files: File[]) {
    this.files = files;
    this.errorMessage = '';
  }

  protected async submit() {
    if (this.form.invalid || this.submitting) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    this.errorMessage = '';
    try {
      const formValue = this.form.getRawValue();
      const uploads = await this.leadSubmission.uploadFiles(this.files, 'enquiries', value => {
        this.uploadProgress = value;
      });
      const payload: EnquirySubmission = {
        ...formValue,
        type: this.mode(),
        fileUploads: uploads,
        sourcePage: '/enquire',
        role: formValue.role as EnquirySubmission['role'],
        leadTags: [this.mode(), formValue.role]
      };
      await this.leadSubmission.submitEnquiry(payload);
      this.success = true;
      this.form.reset({
        fullName: '',
        company: '',
        email: '',
        role: 'designer',
        projectType: '',
        preferredMaterial: '',
        estimatedQuantity: '',
        targetTimeline: '',
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
