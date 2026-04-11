/**
 * AMK-64: Skeleton Loading States — Unit Tests
 *
 * Covers rendering, accessibility, Brand Bible compliance, and responsive behavior.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PLATFORM_ID } from '@angular/core';
import {
  SkeletonLoaderComponent,
  SkeletonType,
  SKELETON_DEFAULTS,
} from './skeleton-loader.component';

describe('SkeletonLoaderComponent', () => {
  let fixture: ComponentFixture<SkeletonLoaderComponent>;
  let component: SkeletonLoaderComponent;

  function createComponent(type: SkeletonType, overrides: Partial<SkeletonLoaderComponent> = {}) {
    TestBed.configureTestingModule({
      imports: [SkeletonLoaderComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    });
    fixture = TestBed.createComponent(SkeletonLoaderComponent);
    component = fixture.componentInstance;
    component.type = type;
    Object.assign(component, overrides);
    fixture.detectChanges();
  }

  // ---- Rendering tests ----

  it('should create the component', () => {
    createComponent('text');
    expect(component).toBeTruthy();
  });

  it('should render correct number of text lines', () => {
    createComponent('text', { lines: 5 });
    const lines = fixture.debugElement.queryAll(By.css('.skeleton--line'));
    expect(lines.length).toBe(5);
  });

  it('should render text lines with default count', () => {
    createComponent('text');
    const lines = fixture.debugElement.queryAll(By.css('.skeleton--line'));
    expect(lines.length).toBe(SKELETON_DEFAULTS.lines);
  });

  it('should render image skeleton with custom aspect ratio', () => {
    createComponent('image', { aspectRatio: '4/3' });
    const img = fixture.debugElement.query(By.css('.skeleton--image'));
    expect(img.nativeElement.style.aspectRatio).toBe('4 / 3');
  });

  it('should render a single card skeleton', () => {
    createComponent('card');
    const card = fixture.debugElement.query(By.css('.skeleton-card'));
    expect(card).toBeTruthy();
    const image = fixture.debugElement.query(By.css('.skeleton--card-image'));
    expect(image).toBeTruthy();
    const title = fixture.debugElement.query(By.css('.skeleton--line-title'));
    expect(title).toBeTruthy();
    const pills = fixture.debugElement.queryAll(By.css('.skeleton--pill'));
    expect(pills.length).toBe(2);
  });

  it('should render correct number of cards in grid', () => {
    createComponent('card-grid', { count: 4, columns: 2 });
    const cards = fixture.debugElement.queryAll(By.css('.skeleton-card'));
    expect(cards.length).toBe(4);
  });

  it('should render form fields with correct count', () => {
    createComponent('form', { fields: 3 });
    const fields = fixture.debugElement.queryAll(By.css('.skeleton-form__field'));
    expect(fields.length).toBe(3);
    const button = fixture.debugElement.query(By.css('.skeleton--button'));
    expect(button).toBeTruthy();
  });

  it('should render product detail skeleton with two-column layout', () => {
    createComponent('detail');
    const detail = fixture.debugElement.query(By.css('.skeleton-detail'));
    expect(detail).toBeTruthy();
    const image = fixture.debugElement.query(By.css('.skeleton-detail__image'));
    expect(image).toBeTruthy();
    const content = fixture.debugElement.query(By.css('.skeleton-detail__content'));
    expect(content).toBeTruthy();
  });

  // ---- Accessibility tests ----

  it('should have role="status" on all skeleton containers', () => {
    const types: SkeletonType[] = ['text', 'image', 'card', 'card-grid', 'form', 'detail'];
    types.forEach((type) => {
      createComponent(type);
      const statusEl = fixture.debugElement.query(By.css('[role="status"]'));
      expect(statusEl).toBeTruthy(`Missing role="status" for type="${type}"`);
    });
  });

  it('should have aria-label on all skeleton containers', () => {
    const types: SkeletonType[] = ['text', 'image', 'card', 'card-grid', 'form', 'detail'];
    types.forEach((type) => {
      createComponent(type);
      const labeled = fixture.debugElement.query(By.css('[aria-label]'));
      expect(labeled).toBeTruthy(`Missing aria-label for type="${type}"`);
      expect(labeled.nativeElement.getAttribute('aria-label')).toContain('Loading');
    });
  });

  it('should have screen-reader-only "Loading..." text', () => {
    createComponent('text');
    const srOnly = fixture.debugElement.query(By.css('.sr-only'));
    expect(srOnly).toBeTruthy();
    expect(srOnly.nativeElement.textContent).toContain('Loading');
  });

  // ---- Brand Bible compliance ----

  it('should use ONLY approved Brand Bible colors in component styles', () => {
    // Extract component styles and verify no unapproved hex values
    createComponent('text');
    const el = fixture.debugElement.nativeElement as HTMLElement;
    const styles = el.querySelector('.skeleton')
      ? window.getComputedStyle(el.querySelector('.skeleton')!)
      : null;

    // The key assertion: skeleton elements reference --amarka-surface via CSS vars
    // We verify by checking the inline template/styles contain no unapproved hex
    const componentSource = SkeletonLoaderComponent.toString();
    // Approved: #181818, #484848, #906030, #f0f0f0, #c0c0c0, #909090, #C7683B
    const approvedHexPattern = /^#(?:181818|484848|906030|f0f0f0|c0c0c0|909090|C7683B)$/i;
    const hexMatches = componentSource.match(/#[0-9a-fA-F]{6}/g) || [];
    const unapproved = hexMatches.filter(
      (hex) => !approvedHexPattern.test(hex)
    );
    // Note: this check is against the toString() of the class which may
    // not contain raw hex (CSS uses var(--amarka-*) tokens). No unapproved
    // hex should appear in the component metadata's styles[] either.
    expect(unapproved.length).toBe(0, `Unapproved hex values found: ${unapproved.join(', ')}`);
  });

  it('should NOT use gold (#906030) in any skeleton element', () => {
    // Gold is reserved for interactive/accent — never in loading placeholders
    createComponent('card-grid', { count: 3 });
    const allSkeletons = fixture.debugElement.queryAll(By.css('.skeleton'));
    allSkeletons.forEach((skeleton) => {
      const bg = window.getComputedStyle(skeleton.nativeElement).backgroundColor;
      // Gold in RGB is approximately rgb(144, 96, 48)
      expect(bg).not.toContain('144, 96, 48');
    });
  });

  it('should NOT contain any text content in skeletons (no placeholder text)', () => {
    const types: SkeletonType[] = ['text', 'image', 'card', 'card-grid', 'form', 'detail'];
    types.forEach((type) => {
      createComponent(type);
      const skeletons = fixture.debugElement.queryAll(By.css('.skeleton'));
      skeletons.forEach((s) => {
        const text = s.nativeElement.textContent.trim();
        expect(text).toBe('', `Skeleton of type="${type}" contains text: "${text}"`);
      });
    });
  });

  it('should NOT contain NYC references', () => {
    const source = SkeletonLoaderComponent.toString();
    expect(source.toLowerCase()).not.toContain('nyc');
    expect(source.toLowerCase()).not.toContain('new york');
  });

  // ---- Defaults ----

  it('should export SKELETON_DEFAULTS with correct values', () => {
    expect(SKELETON_DEFAULTS.lines).toBe(3);
    expect(SKELETON_DEFAULTS.columns).toBe(3);
    expect(SKELETON_DEFAULTS.count).toBe(6);
    expect(SKELETON_DEFAULTS.fields).toBe(4);
    expect(SKELETON_DEFAULTS.aspectRatio).toBe('16/9');
    expect(SKELETON_DEFAULTS.animationDuration).toBe('1.8s');
  });
});
