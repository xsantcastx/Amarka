import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudioContentService } from '../../services/studio-content.service';
import { AnalyticsService } from '../../services/analytics.service';
import { LeadSubmissionService } from '../../services/lead-submission.service';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { TradeApplication, TradeStep } from '../../models/studio';
import { FileDropzoneComponent } from '../../shared/components/file-dropzone/file-dropzone.component';

@Component({
  selector: 'app-trade-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FileDropzoneComponent],
  templateUrl: './trade.page.html',
  styleUrl: './trade.page.scss'
})
export class TradePageComponent {
  private fb = inject(FormBuilder);
  private content = inject(StudioContentService);
  private leadSubmission = inject(LeadSubmissionService);
  private analytics = inject(AnalyticsService);
  private seo = inject(SeoSchemaService);

  protected tradeSteps = signal<TradeStep[]>([]);
  protected files: File[] = [];
  protected uploadProgress = 0;
  protected success = false;
  protected submitting = false;
  protected errorMessage = '';

  protected form = this.fb.nonNullable.group({
    companyName: ['', Validators.required],
    contactName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['designer', Validators.required],
    projectType: ['', Validators.required],
    estimatedQuantity: ['', Validators.required],
    materialPreference: [''],
    timeline: [''],
    notes: ['']
  });

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Trade Laser Engraving Supplier for NYC Designers and GCs | Amarka',
      description: 'Apply for a trade account with Amarka for bespoke engraved signage, wayfinding, bar fitout, and architectural elements across the NYC metro.',
      keywords: ['laser engraving for interior designers NYC', 'trade signage supplier NYC', 'laser engraving GC supplier'],
      path: '/trade'
    });
    this.seo.generateLocalBusinessSchema({ pagePath: '/trade' });
    void this.load();
    this.analytics.trackTradePageView();
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
      const uploads = await this.leadSubmission.uploadFiles(this.files, 'trade-applications', value => {
        this.uploadProgress = value;
      });
      const payload: TradeApplication = {
        ...formValue,
        specSheetUploads: uploads,
        role: formValue.role as TradeApplication['role'],
        leadTags: ['trade_application', formValue.role]
      };
      await this.leadSubmission.submitTradeApplication(payload);
      this.success = true;
      this.form.reset({
        companyName: '',
        contactName: '',
        email: '',
        role: 'designer',
        projectType: '',
        estimatedQuantity: '',
        materialPreference: '',
        timeline: '',
        notes: ''
      });
      this.files = [];
      this.uploadProgress = 0;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Unable to submit the trade application right now.';
    } finally {
      this.submitting = false;
    }
  }

  private async load() {
    this.tradeSteps.set(await this.content.getTradeSteps());
  }
}
