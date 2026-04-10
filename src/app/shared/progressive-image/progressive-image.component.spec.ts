import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { ProgressiveImageComponent } from './progressive-image.component';
import { ResponsiveImageSource, DEFAULT_BREAKPOINTS } from './progressive-image.model';

/** Brand Bible approved hex values (6-color system). */
const APPROVED_PALETTE = ['#181818', '#484848', '#906030', '#f0f0f0', '#c0c0c0', '#909090'];

/** Additional approved value: --ts-accent for Zone 3b CTAs. */
const EXTENDED_PALETTE = [...APPROVED_PALETTE, '#C7683B'];

const MOCK_SOURCE: ResponsiveImageSource = {
  basePath: '/assets/images/test-hero',
  alt: 'Test hero image',
  width: 1200,
  height: 675,
  lqip: 'data:image/jpeg;base64,/9j/4AAQ==',
};

describe('ProgressiveImageComponent', () => {
  let component: ProgressiveImageComponent;
  let fixture: ComponentFixture<ProgressiveImageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressiveImageComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    }).compileComponents();

    fixture = TestBed.createComponent(ProgressiveImageComponent);
    component = fixture.componentInstance;
    component.source = MOCK_SOURCE;
    fixture.detectChanges();
  });

  // ---------- Rendering ----------

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render a wrapper with correct aspect-ratio', () => {
    const wrapper: HTMLElement = fixture.nativeElement.querySelector(
      '.progressive-image-wrapper'
    );
    expect(wrapper).toBeTruthy();
    expect(wrapper.style.aspectRatio).toBeTruthy();
  });

  it('should render a <picture> element with <source> elements', () => {
    const picture = fixture.nativeElement.querySelector('picture');
    expect(picture).toBeTruthy();
    const sources = picture.querySelectorAll('source');
    // 2 sources per breakpoint (WebP + JPEG) = 6 for 3 default breakpoints
    expect(sources.length).toBe(DEFAULT_BREAKPOINTS.length * 2);
  });

  it('should render fallback <img> inside <picture>', () => {
    const img: HTMLImageElement = fixture.nativeElement.querySelector(
      'picture img'
    );
    expect(img).toBeTruthy();
    expect(img.src).toContain('-800w.jpg');
    expect(img.alt).toBe('Test hero image');
  });

  it('should render LQIP placeholder when lqip is provided', () => {
    const lqipImg: HTMLImageElement = fixture.nativeElement.querySelector(
      '.progressive-image-lqip'
    );
    expect(lqipImg).toBeTruthy();
    expect(lqipImg.getAttribute('aria-hidden')).toBe('true');
  });

  // ---------- Loading behavior ----------

  it('should set loading="lazy" for below-fold images', () => {
    component.aboveFold = false;
    fixture.detectChanges();
    const img: HTMLImageElement = fixture.nativeElement.querySelector(
      'picture img'
    );
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('should set loading="eager" and fetchpriority="high" for above-fold images', () => {
    component.aboveFold = true;
    fixture.detectChanges();
    const img: HTMLImageElement = fixture.nativeElement.querySelector(
      'picture img'
    );
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
  });

  it('should mark image as loaded on load event', () => {
    expect(component.imageLoaded).toBe(false);
    component.onImageLoad();
    expect(component.imageLoaded).toBe(true);
  });

  it('should mark image as loaded on error event (avoid stuck placeholder)', () => {
    expect(component.imageLoaded).toBe(false);
    component.onImageError();
    expect(component.imageLoaded).toBe(true);
  });

  it('should add .loaded class to full image after load', () => {
    component.onImageLoad();
    fixture.detectChanges();
    const img: HTMLElement = fixture.nativeElement.querySelector(
      '.progressive-image-full'
    );
    expect(img.classList.contains('loaded')).toBe(true);
  });

  it('should add .loaded class to placeholder (for fade-out) after load', () => {
    component.onImageLoad();
    fixture.detectChanges();
    const placeholder: HTMLElement = fixture.nativeElement.querySelector(
      '.progressive-image-placeholder'
    );
    expect(placeholder.classList.contains('loaded')).toBe(true);
  });

  // ---------- Srcset generation ----------

  it('should generate correct WebP srcset', () => {
    const srcset = component.buildSrcset([400, 800, 1200], 'webp');
    expect(srcset).toContain('/assets/images/test-hero-400w.webp 400w');
    expect(srcset).toContain('/assets/images/test-hero-800w.webp 800w');
    expect(srcset).toContain('/assets/images/test-hero-1200w.webp 1200w');
  });

  it('should generate correct JPEG fallback srcset', () => {
    const srcset = component.buildSrcset([400, 800], 'jpg');
    expect(srcset).toContain('/assets/images/test-hero-400w.jpg 400w');
    expect(srcset).toContain('/assets/images/test-hero-800w.jpg 800w');
  });

  // ---------- Accessibility ----------

  it('should have role="img" and aria-label on wrapper', () => {
    const wrapper: HTMLElement = fixture.nativeElement.querySelector(
      '.progressive-image-wrapper'
    );
    expect(wrapper.getAttribute('role')).toBe('img');
    expect(wrapper.getAttribute('aria-label')).toBe('Test hero image');
  });

  // ---------- Brand Bible compliance ----------

  it('should only use approved Brand Bible colors in component styles', () => {
    const styleContent = fixture.nativeElement.ownerDocument
      .querySelector('style')
      ?.textContent ?? '';

    // Extract all hex color values from the styles
    const hexPattern = /#[0-9a-fA-F]{6}\b/g;
    const foundHexValues = styleContent.match(hexPattern) ?? [];

    for (const hex of foundHexValues) {
      const normalizedHex = hex.toLowerCase();
      const isApproved = EXTENDED_PALETTE.some(
        (approved) => approved.toLowerCase() === normalizedHex
      );
      // Allow #000000 for box-shadow rgba fallback
      if (normalizedHex !== '#000000') {
        expect(isApproved).withContext(
          `Found unapproved color ${hex} in styles`
        ).toBe(true);
      }
    }
  });

  it('should NOT use gold (#906030) in any loading/placeholder state', () => {
    const placeholder: HTMLElement = fixture.nativeElement.querySelector(
      '.progressive-image-placeholder'
    );
    const computedBg = placeholder.style.backgroundColor || '';
    expect(computedBg).not.toContain('906030');
  });

  it('should include prefers-reduced-motion media query', () => {
    // Verify the component has reduced motion styles by checking the template
    const styles = (fixture.componentRef.instance.constructor as any)
      ?.__annotations__?.[0]?.styles?.[0] ?? '';

    // Alternative: check the actual <style> tag injected
    const allStyles = Array.from(document.querySelectorAll('style'))
      .map((s) => s.textContent)
      .join('');
    expect(allStyles).toContain('prefers-reduced-motion');
  });

  // ---------- Placeholder border ----------

  it('should apply border class when showPlaceholderBorder is true', () => {
    component.showPlaceholderBorder = true;
    fixture.detectChanges();
    const placeholder: HTMLElement = fixture.nativeElement.querySelector(
      '.progressive-image-placeholder'
    );
    expect(placeholder.classList.contains('has-border')).toBe(true);
  });

  it('should NOT apply border class when showPlaceholderBorder is false', () => {
    component.showPlaceholderBorder = false;
    fixture.detectChanges();
    const placeholder: HTMLElement = fixture.nativeElement.querySelector(
      '.progressive-image-placeholder'
    );
    expect(placeholder.classList.contains('has-border')).toBe(false);
  });
});
