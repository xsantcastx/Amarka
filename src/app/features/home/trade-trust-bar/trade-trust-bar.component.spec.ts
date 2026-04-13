import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { TradeTrustBarComponent } from './trade-trust-bar.component';

describe('TradeTrustBarComponent (AMK-45)', () => {
  let component: TradeTrustBarComponent;
  let fixture: ComponentFixture<TradeTrustBarComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TradeTrustBarComponent, RouterModule.forRoot([])]
    }).compileComponents();

    fixture = TestBed.createComponent(TradeTrustBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    el = fixture.nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render 4 archetype columns', () => {
    const items = el.querySelectorAll('[role="listitem"]');
    expect(items.length).toBe(4);
  });

  it('should display correct archetype titles', () => {
    const titles = Array.from(el.querySelectorAll('.trust-bar__title')).map(
      (t) => t.textContent?.trim()
    );
    expect(titles).toEqual([
      'Interior Designers',
      'General Contractors',
      'Hospitality Groups',
      'Corporate Offices'
    ]);
  });

  it('should have a trade account callout', () => {
    const callout = el.querySelector('.trust-bar__callout');
    expect(callout?.textContent).toContain('Trade accounts available');
    expect(callout?.textContent).toContain('preferred pricing');
  });

  it('should have a Zone 3b ghost CTA linking to /trade', () => {
    const cta = el.querySelector('.trust-bar__cta') as HTMLAnchorElement;
    expect(cta).toBeTruthy();
    expect(cta.textContent?.trim()).toBe('Open a Trade Account');
    expect(cta.getAttribute('routerLink') || cta.getAttribute('href')).toContain('/trade');
  });

  it('should have an aria-label on the section', () => {
    const section = el.querySelector('section');
    expect(section?.getAttribute('aria-label')).toBe('Built for the trade');
  });

  it('should have a decorative gold rule', () => {
    const rule = el.querySelector('.trust-bar__rule');
    expect(rule).toBeTruthy();
    expect(rule?.getAttribute('aria-hidden')).toBe('true');
  });

  // Brand Bible compliance checks
  describe('Brand Bible compliance', () => {
    it('should contain zero NYC or New York references', () => {
      const html = el.innerHTML.toLowerCase();
      expect(html).not.toContain('nyc');
      expect(html).not.toContain('new york');
    });

    it('should contain zero off-palette hex values in inline styles', () => {
      // Allowed palette: #181818, #484848, #906030, #f0f0f0, #c0c0c0, #909090, #C7683B
      const inlineStyles = el.querySelectorAll('[style]');
      const allowed = /^#(181818|484848|906030|f0f0f0|c0c0c0|909090|c7683b)$/i;
      inlineStyles.forEach((node) => {
        const style = node.getAttribute('style') || '';
        const hexMatches = style.match(/#[0-9a-fA-F]{6}/g) || [];
        hexMatches.forEach((hex) => {
          expect(hex).toMatch(allowed);
        });
      });
    });
  });
});
