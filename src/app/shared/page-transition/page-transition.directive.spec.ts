/**
 * AMK-55: Premium Page Transition — unit tests
 *
 * Tests cover:
 *   - Host base class is applied on init
 *   - NavigationStart adds the exiting class
 *   - NavigationEnd swaps exiting → entering, then clears entering via rAF
 *   - NavigationCancel / NavigationError reset both classes
 *   - Router subscription is torn down on destroy (no leaks)
 *   - Brand Bible compliance (directive only touches motion classes)
 */
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { Subject } from 'rxjs';

import {
  PAGE_TRANSITION_ENTERING_CLASS,
  PAGE_TRANSITION_EXITING_CLASS,
  PAGE_TRANSITION_HOST_CLASS,
  PageTransitionDirective,
} from './page-transition.directive';

/** Minimal Router stub that lets tests push synthetic events. */
class RouterStub {
  readonly events = new Subject<unknown>();
}

@Component({
  standalone: true,
  imports: [PageTransitionDirective],
  template: `<main amarkaPageTransition data-testid="host">outlet</main>`,
})
class HostComponent {}

describe('PageTransitionDirective (AMK-55)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let router: RouterStub;
  let host: DebugElement;

  beforeEach(async () => {
    router = new RouterStub();

    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: Router, useValue: router }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.debugElement.query(By.css('[data-testid="host"]'));
  });

  it('applies the base host class on init', () => {
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_HOST_CLASS)).toBeTrue();
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_EXITING_CLASS)).toBeFalse();
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_ENTERING_CLASS)).toBeFalse();
  });

  it('adds the exiting class on NavigationStart', () => {
    router.events.next(new NavigationStart(1, '/next'));
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_EXITING_CLASS)).toBeTrue();
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_ENTERING_CLASS)).toBeFalse();
  });

  it('swaps exiting → entering then clears entering via rAF on NavigationEnd', fakeAsync(() => {
    // Stub rAF onto a deterministic queue so the test can drain it.
    const queue: Array<() => void> = [];
    const originalRaf = (globalThis as unknown as { requestAnimationFrame: (cb: () => void) => number })
      .requestAnimationFrame;
    (globalThis as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
      ((cb: () => void) => {
        queue.push(cb);
        return queue.length;
      }) as (cb: () => void) => number;

    try {
      router.events.next(new NavigationStart(2, '/next'));
      router.events.next(new NavigationEnd(2, '/next', '/next'));

      // Immediately after NavigationEnd: exiting is removed, entering is primed.
      expect(host.nativeElement.classList.contains(PAGE_TRANSITION_EXITING_CLASS)).toBeFalse();
      expect(host.nativeElement.classList.contains(PAGE_TRANSITION_ENTERING_CLASS)).toBeTrue();

      // Drain both nested rAFs → entering clears so the CSS transition can play.
      while (queue.length > 0) {
        const next = queue.shift();
        next?.();
      }
      tick();

      expect(host.nativeElement.classList.contains(PAGE_TRANSITION_ENTERING_CLASS)).toBeFalse();
    } finally {
      (globalThis as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
        originalRaf;
    }
  }));

  it('resets both motion classes on NavigationCancel', () => {
    router.events.next(new NavigationStart(3, '/next'));
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_EXITING_CLASS)).toBeTrue();

    router.events.next(new NavigationCancel(3, '/next', 'guard'));
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_EXITING_CLASS)).toBeFalse();
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_ENTERING_CLASS)).toBeFalse();
  });

  it('resets both motion classes on NavigationError', () => {
    router.events.next(new NavigationStart(4, '/next'));
    router.events.next(new NavigationError(4, '/next', new Error('boom')));
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_EXITING_CLASS)).toBeFalse();
    expect(host.nativeElement.classList.contains(PAGE_TRANSITION_ENTERING_CLASS)).toBeFalse();
  });

  it('unsubscribes from the router on destroy (no leaked class flips)', () => {
    expect(router.events.observed).toBeTrue();

    fixture.destroy();

    expect(router.events.observed).toBeFalse();
  });

  it('only ever touches motion classes — never colors, typography, or inline styles', () => {
    const el = host.nativeElement as HTMLElement;
    router.events.next(new NavigationStart(5, '/next'));
    router.events.next(new NavigationEnd(5, '/next', '/next'));

    // Directive must never write inline styles — all visual changes go through CSS tokens.
    expect(el.getAttribute('style')).toBeFalsy();

    // Every added class must belong to the AMK-55 motion namespace.
    el.classList.forEach((cls) => {
      expect(
        cls === PAGE_TRANSITION_HOST_CLASS ||
          cls === PAGE_TRANSITION_EXITING_CLASS ||
          cls === PAGE_TRANSITION_ENTERING_CLASS,
      ).toBeTrue();
    });
  });
});
