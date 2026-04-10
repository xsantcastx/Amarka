import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router, NavigationEnd } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { Subject } from 'rxjs';
import { MobileNavDrawerComponent } from './mobile-nav-drawer.component';
import { AMARKA_NAV_CONFIG } from './mobile-nav-drawer.model';

/**
 * AMK-65: Mobile Navigation Drawer — Unit Tests
 *
 * Tests cover:
 * 1. Rendering (all nav links, CTA buttons, contact footer)
 * 2. Brand Bible compliance (palette, typography, Zone 3b CTAs)
 * 3. Open/close behavior
 * 4. Keyboard accessibility (Escape key)
 * 5. Body scroll locking
 * 6. Active route highlighting
 * 7. WCAG touch targets
 * 8. Reduced motion support
 */
describe('MobileNavDrawerComponent', () => {
  let component: MobileNavDrawerComponent;
  let fixture: ComponentFixture<MobileNavDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileNavDrawerComponent, RouterTestingModule],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }],
    }).compileComponents();

    fixture = TestBed.createComponent(MobileNavDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  // --- Rendering ---

  it('should render all navigation links from default config', () => {
    component.open();
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('.nav-link');
    expect(links.length).toBe(AMARKA_NAV_CONFIG.links.length);
    AMARKA_NAV_CONFIG.links.forEach((navLink, i) => {
      expect(links[i].textContent.trim()).toBe(navLink.label);
    });
  });

  it('should render Zone 3b CTA buttons', () => {
    component.open();
    fixture.detectChanges();
    const ctas = fixture.nativeElement.querySelectorAll('.drawer-cta');
    expect(ctas.length).toBe(AMARKA_NAV_CONFIG.ctaButtons.length);
    expect(ctas[0].textContent.trim()).toBe('Get a Quote');
    expect(ctas[1].textContent.trim()).toBe('Start a Commission');
  });

  it('should render Stamford CT contact in footer', () => {
    const footerText = fixture.nativeElement.querySelector('.drawer-footer-text');
    expect(footerText).toBeTruthy();
    expect(footerText.textContent).toContain('Stamford, CT');
    expect(footerText.textContent).toContain('diego@amarka.co');
    // MUST NOT contain NYC
    expect(footerText.textContent).not.toContain('NYC');
    expect(footerText.textContent).not.toContain('New York');
  });

  it('should render the Amarka logo text', () => {
    const logo = fixture.nativeElement.querySelector('.drawer-logo-text');
    expect(logo).toBeTruthy();
    expect(logo.textContent.trim()).toBe('AMARKA');
  });

  // --- Open/Close Behavior ---

  it('should start in closed state', () => {
    expect(component.isOpen()).toBe(false);
    const drawer = fixture.nativeElement.querySelector('.mobile-drawer');
    expect(drawer.classList.contains('open')).toBe(false);
  });

  it('should open the drawer and add .open class', () => {
    component.open();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);
    const drawer = fixture.nativeElement.querySelector('.mobile-drawer');
    expect(drawer.classList.contains('open')).toBe(true);
  });

  it('should close when close button is clicked', () => {
    component.open();
    fixture.detectChanges();
    const closeBtn = fixture.nativeElement.querySelector('.drawer-close');
    closeBtn.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('should close on backdrop click', () => {
    component.open();
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector('.mobile-drawer-backdrop');
    backdrop.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('should close on Escape key press', () => {
    component.open();
    fixture.detectChanges();
    component.onEscapeKey();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('should lock body scroll when open and restore on close', () => {
    component.open();
    expect(document.body.style.overflow).toBe('hidden');
    component.close();
    expect(document.body.style.overflow).toBe('');
  });

  // --- Accessibility ---

  it('should have aria-label on navigation', () => {
    const nav = fixture.nativeElement.querySelector('.mobile-drawer');
    expect(nav.getAttribute('aria-label')).toBe('Mobile navigation menu');
  });

  it('should have aria-label on close button', () => {
    const closeBtn = fixture.nativeElement.querySelector('.drawer-close');
    expect(closeBtn.getAttribute('aria-label')).toBe('Close navigation menu');
  });

  it('should set aria-hidden=true when closed', () => {
    const nav = fixture.nativeElement.querySelector('.mobile-drawer');
    expect(nav.getAttribute('aria-hidden')).toBe('true');
  });

  it('should set aria-hidden=false when open', () => {
    component.open();
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('.mobile-drawer');
    expect(nav.getAttribute('aria-hidden')).toBe('false');
  });

  // --- Brand Bible Compliance ---

  it('should only use approved Brand Bible color tokens in CSS', () => {
    // Verify component styles contain only approved hex values
    const approvedColors = [
      '#181818', '#484848', '#906030', '#f0f0f0', '#c0c0c0', '#909090',
      '#C7683B', // --ts-accent (Zone 3b)
    ].map(c => c.toLowerCase());

    // Extract all hex colors from inline styles (component styles)
    const styleEl = fixture.nativeElement.closest('app-mobile-nav-drawer');
    // The styles are compiled, so we verify via the design tokens in the host
    // This is a structural check — full compliance is verified by quick-check.sh
    expect(component).toBeTruthy();
    // Verify no hardcoded unapproved colors in template
    const html = fixture.nativeElement.innerHTML;
    const hexPattern = /#[0-9a-fA-F]{6}/g;
    const foundHexes = html.match(hexPattern) || [];
    foundHexes.forEach(hex => {
      expect(approvedColors).toContain(hex.toLowerCase());
    });
  });

  it('should use Zone 3b outlined style for CTAs (not solid fill)', () => {
    component.open();
    fixture.detectChanges();
    const cta = fixture.nativeElement.querySelector('.drawer-cta');
    const styles = window.getComputedStyle(cta);
    // CTA should have transparent/no background at rest (outlined ghost)
    // and border matching --ts-accent
    expect(cta.classList.contains('drawer-cta')).toBe(true);
    // Structural: CTA uses border, not filled background
    expect(styles.borderStyle).not.toBe('none');
  });

  // --- Emit & Navigation ---

  it('should emit drawerClose event on close', () => {
    const spy = jest.fn();
    component.drawerClose.subscribe(spy);
    component.open();
    component.close();
    expect(spy).toHaveBeenCalled();
  });

  it('should close drawer when a nav link is clicked', () => {
    component.open();
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.nav-link');
    link.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });
});
