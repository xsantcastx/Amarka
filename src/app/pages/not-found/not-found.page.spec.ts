import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';

import { NotFoundPageComponent } from './not-found.page';

/**
 * AMK-51 — Branded Error State Page tests
 *
 * Validates:
 *  - default (no route data) resolves to the 404 "not-found" state
 *  - route data `errorState: 'server'` resolves to the 500 state
 *  - route data `errorState: 'offline'` resolves to the offline state
 *  - unknown state values gracefully fall back to 'not-found'
 *  - the state code + heading + subheading render the correct copy
 *  - primary/secondary CTAs point at Brand Bible destinations
 *  - the diego@amarka.co contact link renders
 *  - the aria-labelledby wiring matches the h1 id
 */
describe('NotFoundPageComponent (AMK-51)', () => {
  function createFixtureWithRouteData(
    data: Record<string, unknown> | null,
  ): ComponentFixture<NotFoundPageComponent> {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NotFoundPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: data ?? {},
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(NotFoundPageComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('defaults to the not-found state when no route data is provided', () => {
    const fixture = createFixtureWithRouteData(null);

    expect(fixture.componentInstance.state()).toBe('not-found');
    const code: HTMLElement = fixture.nativeElement.querySelector('.amk-error__code');
    expect(code.textContent?.trim()).toBe('404');

    const heading: HTMLElement = fixture.nativeElement.querySelector('.amk-error__heading');
    expect(heading.textContent).toContain('studio');
  });

  it('renders the server error state when route data requests it', () => {
    const fixture = createFixtureWithRouteData({ errorState: 'server' });

    expect(fixture.componentInstance.state()).toBe('server');
    const code: HTMLElement = fixture.nativeElement.querySelector('.amk-error__code');
    expect(code.textContent?.trim()).toBe('500');

    const eyebrow: HTMLElement = fixture.nativeElement.querySelector('.amk-error__eyebrow');
    expect(eyebrow.textContent).toContain('Studio error');
  });

  it('renders the offline state when route data requests it', () => {
    const fixture = createFixtureWithRouteData({ errorState: 'offline' });

    expect(fixture.componentInstance.state()).toBe('offline');
    const code: HTMLElement = fixture.nativeElement.querySelector('.amk-error__code');
    expect(code.textContent?.trim()).toBe('Offline');

    const eyebrow: HTMLElement = fixture.nativeElement.querySelector('.amk-error__eyebrow');
    expect(eyebrow.textContent).toContain('No connection');
  });

  it('falls back to not-found for unknown errorState values', () => {
    const fixture = createFixtureWithRouteData({ errorState: 'totally-bogus' });

    expect(fixture.componentInstance.state()).toBe('not-found');
  });

  it('renders both CTAs with Brand Bible destinations', () => {
    const fixture = createFixtureWithRouteData(null);

    const primary: HTMLAnchorElement = fixture.nativeElement.querySelector('a.btn-primary');
    const outline: HTMLAnchorElement = fixture.nativeElement.querySelector('a.btn-outline');

    expect(primary).toBeTruthy();
    expect(outline).toBeTruthy();

    expect(primary.getAttribute('ng-reflect-router-link')).toBe('/');
    expect(outline.getAttribute('ng-reflect-router-link')).toBe('/enquire');

    expect(primary.textContent?.trim()).toBe('Back to Home');
    expect(outline.textContent?.trim()).toBe('Request a Quote');
  });

  it('includes a direct contact link to diego@amarka.co', () => {
    const fixture = createFixtureWithRouteData(null);

    const link: HTMLAnchorElement = fixture.nativeElement.querySelector(
      'a.amk-error__contact-link',
    );
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('mailto:diego@amarka.co');
  });

  it('wires aria-labelledby on the section to the h1 id', () => {
    const fixture = createFixtureWithRouteData(null);

    const section: HTMLElement = fixture.nativeElement.querySelector('section.amk-error');
    const heading: HTMLElement = fixture.nativeElement.querySelector('.amk-error__heading');

    expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.id).toBe('amk-error-heading');
  });

  it('renders the continue-to card grid with four destinations', () => {
    const fixture = createFixtureWithRouteData(null);

    const cards: NodeListOf<HTMLElement> =
      fixture.nativeElement.querySelectorAll('.amk-error__card');
    expect(cards.length).toBe(4);
  });
});
