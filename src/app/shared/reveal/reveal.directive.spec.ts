/**
 * AMK-62: Scroll-Triggered Section Reveal System — unit tests
 *
 * Tests cover:
 *   - Class application (base + revealed)
 *   - Reduced-motion fast path (instant reveal)
 *   - revealDisabled fast path (instant reveal, no observer)
 *   - Threshold clamping
 *   - Observer cleanup on destroy
 *   - Stagger wrapper directive
 */
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  DEFAULT_REVEAL_THRESHOLD,
  RevealDirective,
  RevealStaggerDirective,
} from './reveal.directive';

/** Captured observer instances so tests can drive intersection callbacks. */
const observerRegistry: Array<{
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  disconnect: jasmine.Spy;
  observe: jasmine.Spy;
  target?: Element;
}> = [];

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  private readonly entry: {
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
    disconnect: jasmine.Spy;
    observe: jasmine.Spy;
    target?: Element;
  };

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.entry = {
      callback,
      options,
      disconnect: jasmine.createSpy('disconnect'),
      observe: jasmine.createSpy('observe').and.callFake((target: Element) => {
        this.entry.target = target;
      }),
    };
    observerRegistry.push(this.entry);
  }

  observe(target: Element): void {
    this.entry.observe(target);
  }

  unobserve(): void {
    // no-op
  }

  disconnect(): void {
    this.entry.disconnect();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Host component for testing the directive in realistic templates. */
@Component({
  standalone: true,
  imports: [RevealDirective, RevealStaggerDirective],
  template: `
    <section amarkaReveal data-test="solo">Solo</section>
    <div amarkaRevealStagger data-test="wrapper">
      <div amarkaReveal>one</div>
      <div amarkaReveal>two</div>
    </div>
    <div amarkaReveal [revealDisabled]="true" data-test="disabled">Disabled</div>
    <div amarkaReveal [revealThreshold]="1.8" data-test="clamped">Clamped</div>
  `,
})
class HostComponent {}

describe('AMK-62 RevealDirective', () => {
  let originalObserver: typeof IntersectionObserver | undefined;
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(async () => {
    observerRegistry.length = 0;

    originalObserver = (window as any).IntersectionObserver;
    (window as any).IntersectionObserver = MockIntersectionObserver;

    originalMatchMedia = window.matchMedia?.bind(window);
    // Default: motion is allowed (not reduced).
    window.matchMedia = ((query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as any)) as typeof window.matchMedia;

    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();
  });

  afterEach(() => {
    (window as any).IntersectionObserver = originalObserver;
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
  });

  function getEl(fixture: ComponentFixture<HostComponent>, name: string): DebugElement {
    return fixture.debugElement.query(By.css(`[data-test="${name}"]`));
  }

  it('adds the base reveal class on init', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = getEl(fixture, 'solo').nativeElement as HTMLElement;
    expect(el.classList.contains('reveal')).toBeTrue();
  });

  it('observes the element via IntersectionObserver with default threshold', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    // Four elements use amarkaReveal; only the ones that require an observer
    // (solo + 2 stagger children + clamped) register — disabled does not.
    expect(observerRegistry.length).toBe(4);
    const solo = observerRegistry[0];
    expect(solo.options?.threshold).toBe(DEFAULT_REVEAL_THRESHOLD);
    expect(solo.observe).toHaveBeenCalled();
  });

  it('adds the revealed class when the element intersects', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const solo = observerRegistry[0];
    const target = solo.target as HTMLElement;

    solo.callback(
      [
        {
          isIntersecting: true,
          target,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRatio: 1,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 0,
        },
      ],
      solo as unknown as IntersectionObserver,
    );

    expect(target.classList.contains('revealed')).toBeTrue();
    expect(solo.disconnect).toHaveBeenCalled();
  });

  it('reveals immediately when reduced motion is preferred', () => {
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      } as any)) as typeof window.matchMedia;

    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const el = getEl(fixture, 'solo').nativeElement as HTMLElement;
    expect(el.classList.contains('reveal')).toBeTrue();
    expect(el.classList.contains('revealed')).toBeTrue();
    // No observer should have been created at all.
    expect(observerRegistry.length).toBe(0);
  });

  it('reveals immediately when revealDisabled=true without registering an observer', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const disabled = getEl(fixture, 'disabled').nativeElement as HTMLElement;
    expect(disabled.classList.contains('revealed')).toBeTrue();

    // Only the 3 enabled directives should have spawned observers.
    const disabledHasObserver = observerRegistry.some(
      (entry) => entry.target === disabled,
    );
    expect(disabledHasObserver).toBeFalse();
  });

  it('clamps threshold values greater than 1 down to 1', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const clamped = observerRegistry.find(
      (entry) => (entry.target as HTMLElement).dataset['test'] === 'clamped',
    );
    expect(clamped).toBeDefined();
    expect(clamped!.options?.threshold).toBe(1);
  });

  it('disconnects the observer on destroy', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const solo = observerRegistry[0];
    fixture.destroy();
    expect(solo.disconnect).toHaveBeenCalled();
  });

  it('RevealStaggerDirective adds the reveal-stagger class to its host', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const wrapper = getEl(fixture, 'wrapper').nativeElement as HTMLElement;
    expect(wrapper.classList.contains('reveal-stagger')).toBeTrue();
  });
});
