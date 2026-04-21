import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PortfolioLightboxComponent } from './portfolio-lightbox.component';
import { CaseStudy } from '../../../models/studio';

const mockCaseStudy: CaseStudy = {
  id: 'cs-001',
  projectName: 'Stamford Boutique Hotel Wayfinding',
  slug: 'stamford-boutique-hotel-wayfinding',
  clientType: 'hospitality',
  audienceTags: ['bars_restaurants'],
  location: 'Stamford, CT',
  brief: 'Full interior wayfinding suite for a newly renovated boutique hotel.',
  description:
    'Deep-etched brass room numbers, laser-engraved walnut floor directories, and hospitality signage across two buildings.',
  materials: ['Brass', 'Walnut'],
  technique: ['Deep etch', 'Laser engraving'],
  images: [],
  status: 'complete',
  featured: false,
  featuredOnHome: false,
  published: true,
  ctaLabel: 'Start a Commission',
  ctaHref: '/enquire',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};

describe('PortfolioLightboxComponent (AMK-47)', () => {
  let fixture: ComponentFixture<PortfolioLightboxComponent>;
  let component: PortfolioLightboxComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioLightboxComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioLightboxComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders nothing when closed', () => {
    component.project = mockCaseStudy;
    component.isOpen = false;
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector('.lightbox-root');
    expect(root).toBeNull();
  });

  it('renders dialog when opened with a project', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();
    const dialog: HTMLElement = fixture.nativeElement.querySelector(
      '.lightbox-dialog'
    );
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('tabindex')).toBe('-1');
  });

  it('exposes role="dialog" and aria-modal="true" on the root', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement.querySelector(
      '.lightbox-root'
    );
    expect(root.getAttribute('role')).toBe('dialog');
    expect(root.getAttribute('aria-modal')).toBe('true');
    expect(root.getAttribute('aria-labelledby')).toBe(
      'lightbox-title-cs-001'
    );
  });

  it('renders project title, brief, and location', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Stamford Boutique Hotel Wayfinding');
    expect(text).toContain('Stamford, CT');
    expect(text).toContain(
      'Full interior wayfinding suite for a newly renovated boutique hotel.'
    );
  });

  it('renders the outlined client-type badge (Brand Bible reviewer clarification)', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();
    const badge: HTMLElement = fixture.nativeElement.querySelector(
      '.lightbox-badge'
    );
    expect(badge).toBeTruthy();
    expect(badge.textContent?.trim()).toBe('Hospitality');
    // Badge must NOT have a filled background (would be invisible on same surface).
    const style = getComputedStyle(badge);
    // Accept transparent or rgba(0,0,0,0) — the point is "no solid fill".
    expect(
      style.backgroundColor === 'transparent' ||
        style.backgroundColor === 'rgba(0, 0, 0, 0)'
    ).toBeTrue();
  });

  it('emits closed when the close button is activated', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();

    let closedFired = false;
    component.closed.subscribe(() => (closedFired = true));

    const closeBtn: HTMLButtonElement =
      fixture.nativeElement.querySelector('.lightbox-close');
    closeBtn.click();
    fixture.detectChanges();

    expect(closedFired).toBeTrue();
  });

  it('closes on ESC', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();

    let closedFired = false;
    component.closed.subscribe(() => (closedFired = true));

    component.onEscape();
    fixture.detectChanges();
    expect(closedFired).toBeTrue();
  });

  it('closes on backdrop click but not on dialog click', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();

    let closedCount = 0;
    component.closed.subscribe(() => closedCount++);

    const root: HTMLElement = fixture.nativeElement.querySelector(
      '.lightbox-root'
    );
    // Click dialog body — should NOT close.
    const dialog: HTMLElement =
      fixture.nativeElement.querySelector('.lightbox-dialog');
    dialog.click();
    fixture.detectChanges();
    expect(closedCount).toBe(0);

    // Click backdrop (root element itself).
    root.click();
    fixture.detectChanges();
    expect(closedCount).toBe(1);
  });

  it('renders status label "Complete" for completed projects', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();
    expect((fixture.nativeElement.textContent as string)).toContain(
      'Complete'
    );
  });

  it('renders status label "Now fabricating" for in_progress projects', () => {
    component.project = { ...mockCaseStudy, status: 'in_progress' };
    component.isOpen = true;
    fixture.detectChanges();
    expect((fixture.nativeElement.textContent as string)).toContain(
      'Now fabricating'
    );
  });

  it('renders Zone 3b ghost CTA with project ctaLabel', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();
    const cta: HTMLAnchorElement =
      fixture.nativeElement.querySelector('.lightbox-cta');
    expect(cta).toBeTruthy();
    expect(cta.textContent?.trim()).toBe('Start a Commission');
    expect(cta.getAttribute('href')).toBe('/enquire');
  });

  it('contains zero NYC references and Stamford CT only (Brand Bible compliance)', () => {
    component.project = mockCaseStudy;
    component.isOpen = true;
    fixture.detectChanges();
    const html = fixture.nativeElement.innerHTML as string;
    expect(/\bNYC\b|\bNew York\b/i.test(html)).toBeFalse();
    expect(html).toContain('Stamford, CT');
  });
});
