import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';
import { DesignReviewComponent } from './design-review.component';
import { DesignProjectService } from '../design-project.service';
import { ProductCatalogService } from '../product-catalog.service';
import { LeadSubmissionService } from '../../../services/lead-submission.service';

describe('Design review handoff', () => {
  let component: any;
  let leads: jasmine.SpyObj<LeadSubmissionService>;
  beforeEach(() => {
    leads = jasmine.createSpyObj('LeadSubmissionService', ['uploadFiles', 'submitEnquiry']);
    leads.uploadFiles.and.resolveTo([]);
    leads.submitEnquiry.and.resolveTo({ ok: true, id: 'saved' });
    TestBed.configureTestingModule({ providers: [
      FormBuilder,
      { provide: LeadSubmissionService, useValue: leads },
      { provide: DesignProjectService, useValue: { project: signal({
        productId: 'shirt', quantity: 24, variantId: 'regular', colorId: 'black',
        logos: [{ id: 'logo-1', storagePath: 'private/enquiries/art.png', originalName: 'art.png', mimeType: 'image/png', size: 99, viewId: 'front' }],
      }) } },
      { provide: ProductCatalogService, useValue: { getById: () => ({
        slug: 'shirt', name: 'Shirt', variants: [{ id: 'regular', label: 'Regular' }], colors: [{ id: 'black', label: 'Black', hex: '#000' }],
      }) } },
    ] });
    component = TestBed.runInInjectionContext(() => new DesignReviewComponent());
    component.generatingMockups.set(false);
    component.form.patchValue({ fullName: 'Ada', email: 'ada@example.invalid' });
  });

  it('includes source artwork referenced by placements and reuses request id after a failed attempt', async () => {
    leads.submitEnquiry.and.rejectWith(new Error('offline'));
    await component.submitQuote();
    const first = leads.submitEnquiry.calls.mostRecent().args[0];
    expect(first.fileUploads[0].storagePath).toBe('private/enquiries/art.png');
    expect(first.fileUploads[0].id).toBe(first.designProject!.logos[0].uploadId);
    expect(component.form.controls.email.value).toBe('ada@example.invalid');
    leads.submitEnquiry.and.resolveTo({ ok: true, id: 'saved' });
    await component.submitQuote();
    expect(leads.submitEnquiry.calls.mostRecent().args[0].submissionId).toBe(first.submissionId);
  });

  it('does not submit an incomplete preview or a concurrent request', async () => {
    component.mockupError.set('Preview failed');
    await component.submitQuote();
    component.mockupError.set('');
    component.submitting.set(true);
    await component.submitQuote();
    expect(leads.submitEnquiry).not.toHaveBeenCalled();
  });
});
