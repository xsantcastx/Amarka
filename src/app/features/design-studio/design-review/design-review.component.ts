import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductCatalogService } from '../product-catalog.service';
import { DesignProjectService } from '../design-project.service';
import { LeadSubmissionService } from '../../../services/lead-submission.service';
import { generateMockupFile } from '../mockup-generator.util';
import { DesignProjectSummary, EnquirySubmission, UploadRef } from '../../../models/studio';

interface ViewMockup {
  viewId: string;
  viewLabel: string;
  dataUrl: string;
  file: File;
  uploadRef?: UploadRef;
}

@Component({
  selector: 'amk-design-review',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './design-review.component.html',
  styleUrl: './design-review.component.scss',
})
export class DesignReviewComponent implements OnInit {
  @Input() submitted = false;
  @Output() backToEditor = new EventEmitter<void>();
  @Output() submitted$ = new EventEmitter<void>();
  @Output() startOver = new EventEmitter<void>();

  private catalog = inject(ProductCatalogService);
  private projectService = inject(DesignProjectService);
  private leadSubmission = inject(LeadSubmissionService);
  private fb = inject(FormBuilder);

  protected project = this.projectService.project;
  protected product = computed(() => this.catalog.getById(this.project()?.productId ?? ''));
  protected variantLabel = computed(() => this.product()?.variants.find(v => v.id === this.project()?.variantId)?.label ?? '');
  protected colorOption = computed(() => this.product()?.colors.find(c => c.id === this.project()?.colorId));

  protected mockups = signal<ViewMockup[]>([]);
  protected generatingMockups = signal(true);
  protected submitting = signal(false);
  protected submitError = signal('');

  protected form = this.fb.nonNullable.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    company: [''],
    website: [''], // honeypot
  });

  ngOnInit(): void {
    void this.generateAllMockups();
  }

  private async generateAllMockups(): Promise<void> {
    const product = this.product();
    const project = this.project();
    if (!product || !project) {
      this.generatingMockups.set(false);
      return;
    }
    this.generatingMockups.set(true);
    const colorHex = this.colorOption()?.hex ?? '#8a8a8a';
    const viewsWithLogos = product.views.filter(v => project.logos.some(l => l.viewId === v.id));
    const targetViews = viewsWithLogos.length ? viewsWithLogos : [product.views[0]];

    const results: ViewMockup[] = [];
    for (const view of targetViews) {
      try {
        const file = await generateMockupFile(product, view, colorHex, project.logos);
        results.push({ viewId: view.id, viewLabel: view.label, dataUrl: URL.createObjectURL(file), file });
      } catch {
        // Skip a view that fails to render rather than blocking the whole review step.
      }
    }
    this.mockups.set(results);
    this.generatingMockups.set(false);
  }

  protected logoCountLabel(): string {
    const n = this.project()?.logos.length ?? 0;
    return n === 1 ? '1 logo placement' : `${n} logo placements`;
  }

  protected editAgain(): void {
    this.backToEditor.emit();
  }

  protected async submitQuote(): Promise<void> {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.submitError.set('Please fill in your name and email before requesting a quote.');
      return;
    }

    const project = this.project();
    const product = this.product();
    if (!project || !product) return;

    this.submitting.set(true);
    this.submitError.set('');

    try {
      const mockupFiles = this.mockups().map(m => m.file);
      const mockupUploads = await this.leadSubmission.uploadFiles(mockupFiles, 'enquiries');

      const designProject: DesignProjectSummary = {
        productSlug: product.slug,
        productName: product.name,
        variantLabel: this.variantLabel(),
        colorLabel: this.colorOption()?.label ?? '',
        colorHex: this.colorOption()?.hex ?? '',
        quantity: project.quantity,
        logos: project.logos.map(l => ({
          uploadId: l.id,
          viewId: l.viewId,
          xPct: l.xPct,
          yPct: l.yPct,
          widthPct: l.widthPct,
          heightPct: l.heightPct,
          rotation: l.rotation,
          flipH: l.flipH,
          flipV: l.flipV,
          zIndex: l.zIndex,
        })),
        mockupUploads,
      };

      const { website, ...formValue } = this.form.getRawValue();
      const payload: EnquirySubmission = {
        type: 'standard',
        fullName: formValue.fullName,
        email: formValue.email,
        company: formValue.company || undefined,
        role: 'design_studio',
        projectType: `Custom ${product.name}`,
        projectDescription: `Product Customization Studio design — ${product.name} (${this.variantLabel()}, ${this.colorOption()?.label}), qty ${project.quantity}, ${project.logos.length} logo placement(s).`,
        fileUploads: [],
        sourcePage: '/design',
        leadTags: ['design_studio', product.slug],
        honeypot: website,
        designProject,
      };

      await this.leadSubmission.submitEnquiry(payload);
      this.submitted$.emit();
    } catch (error) {
      this.submitError.set(error instanceof Error ? error.message : 'Unable to submit your quote request right now.');
    } finally {
      this.submitting.set(false);
    }
  }
}
