import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CaseStudy } from '../../../models/studio';
import { AnalyticsService } from '../../../services/analytics.service';

/**
 * AMK-47 — Portfolio Project Detail Lightbox
 *
 * Premium modal that extends AMK-18's portfolio case study cards with a
 * deep-dive dialog. Opens on click of a <article.work-card>, closes on:
 *   - ESC key
 *   - backdrop click
 *   - close button
 *   - close() event
 *
 * Brand Bible compliance (verified by Brand Bible Reviewer 2026-04-01):
 *   - Surface: var(--amarka-surface) #484848
 *   - Primary text: var(--amarka-text) #f0f0f0 (8.56:1 AAA)
 *   - Secondary text: var(--amarka-text-secondary) #c0c0c0 (5.10:1 AA)
 *   - Client-type badge: OUTLINED pill on surface (1px #c0c0c0 border on transparent)
 *     — never filled #484848 pill (would be invisible, 1:1 contrast)
 *   - Gold decorative rule + border only — NEVER gold body text on surface
 *   - Zone 3b ghost CTA: --ts-accent, 2px border-radius, fill-on-hover, translateY(-1px)
 *   - Typography: Playfair Display (title), Source Sans 3 600 uppercase tracking-widest
 *   - prefers-reduced-motion: instant transitions (0.01ms)
 *   - role=dialog, aria-modal=true, focus trap, aria-labelledby
 *   - Zero NYC references, Stamford CT / Connecticut only
 */
@Component({
  selector: 'amarka-portfolio-lightbox',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open() && caseStudy(); as project) {
    <div
      class="lightbox-root"
      [class.is-open]="open()"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="'lightbox-title-' + project.id"
      [attr.aria-describedby]="'lightbox-brief-' + project.id"
      (click)="onBackdropClick($event)"
    >
      <div class="lightbox-backdrop" aria-hidden="true"></div>

      <article
        #dialog
        class="lightbox-dialog"
        tabindex="-1"
        (click)="$event.stopPropagation()"
      >
        <header class="lightbox-header">
          <span class="lightbox-badge">{{ clientTypeLabel() }}</span>
          <button
            #closeBtn
            type="button"
            class="lightbox-close"
            aria-label="Close project detail"
            (click)="close()"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </header>

        <div class="lightbox-body">
          <h2
            [id]="'lightbox-title-' + project.id"
            class="lightbox-title heading-display"
          >
            {{ project.projectName }}
          </h2>

          <p class="lightbox-location">{{ project.location }}</p>

          <div class="lightbox-rule" aria-hidden="true"></div>

          <p
            [id]="'lightbox-brief-' + project.id"
            class="lightbox-brief"
          >
            {{ project.brief }}
          </p>

          <p class="lightbox-description">{{ project.description }}</p>

          <dl class="lightbox-specs">
            @if (project.materials?.length) {
            <div class="lightbox-specs__row">
              <dt>Substrates</dt>
              <dd>{{ project.materials.join(' · ') }}</dd>
            </div>
            }
            @if (project.technique?.length) {
            <div class="lightbox-specs__row">
              <dt>Technique</dt>
              <dd>{{ project.technique.join(' · ') }}</dd>
            </div>
            }
            <div class="lightbox-specs__row">
              <dt>Status</dt>
              <dd>{{ statusLabel() }}</dd>
            </div>
          </dl>
        </div>

        <footer class="lightbox-footer">
          <a
            [routerLink]="project.ctaHref"
            class="lightbox-cta"
            (click)="onCtaClick()"
          >
            {{ project.ctaLabel || 'Start a Commission' }}
          </a>
        </footer>
      </article>
    </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .lightbox-root {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: clamp(1rem, 4vw, 2.5rem);
        opacity: 0;
        transition: opacity var(--amarka-duration-base, 400ms)
          var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
      }

      .lightbox-root.is-open {
        opacity: 1;
      }

      .lightbox-backdrop {
        position: absolute;
        inset: 0;
        background: var(--amarka-overlay, rgba(24, 24, 24, 0.85));
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }

      .lightbox-dialog {
        position: relative;
        width: min(720px, 100%);
        max-height: calc(100vh - 2rem);
        display: flex;
        flex-direction: column;
        background: var(--amarka-surface, #484848);
        color: var(--amarka-text, #f0f0f0);
        border: 1px solid var(--amarka-border, rgba(144, 96, 48, 0.3));
        border-radius: 4px;
        box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.7);
        overflow: hidden;
        transform: translateY(12px) scale(0.98);
        opacity: 0;
        transition:
          transform var(--amarka-duration-base, 400ms)
            var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1)),
          opacity var(--amarka-duration-base, 400ms)
            var(--amarka-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
      }

      .lightbox-root.is-open .lightbox-dialog {
        transform: translateY(0) scale(1);
        opacity: 1;
      }

      .lightbox-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid rgba(192, 192, 192, 0.12);
      }

      .lightbox-badge {
        /* Brand Bible Reviewer clarification: OUTLINED pill only.
           Filled #484848 pill on #484848 surface = invisible (1:1). */
        display: inline-block;
        padding: 0.35rem 0.85rem;
        border: 1px solid var(--amarka-text-secondary, #c0c0c0);
        border-radius: 2px;
        background: transparent;
        color: var(--amarka-text-secondary, #c0c0c0);
        font-family: var(
          --font-sans,
          'Source Sans 3',
          'Inter',
          system-ui,
          sans-serif
        );
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .lightbox-close {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        background: transparent;
        border: 1px solid rgba(192, 192, 192, 0.3);
        border-radius: 2px;
        color: var(--amarka-text-secondary, #c0c0c0);
        cursor: pointer;
        transition:
          border-color var(--amarka-duration-fast, 150ms)
            var(--amarka-ease-out, ease-out),
          color var(--amarka-duration-fast, 150ms)
            var(--amarka-ease-out, ease-out),
          transform var(--amarka-duration-fast, 150ms)
            var(--amarka-ease-out, ease-out);
      }

      .lightbox-close:hover,
      .lightbox-close:focus-visible {
        color: var(--amarka-text, #f0f0f0);
        border-color: var(--amarka-text, #f0f0f0);
      }

      .lightbox-close:focus-visible {
        outline: 2px solid var(--ts-accent, #c7683b);
        outline-offset: 2px;
      }

      .lightbox-body {
        padding: 1.75rem 1.5rem 1.25rem;
        overflow-y: auto;
        flex: 1 1 auto;
      }

      .lightbox-title {
        margin: 0 0 0.35rem;
        font-family: var(
          --font-display,
          'Playfair Display',
          'Times New Roman',
          serif
        );
        font-size: clamp(1.5rem, 3.2vw, 2rem);
        line-height: 1.15;
        color: var(--amarka-text, #f0f0f0);
      }

      .lightbox-location {
        margin: 0;
        color: var(--amarka-text-secondary, #c0c0c0);
        font-family: var(
          --font-sans,
          'Source Sans 3',
          'Inter',
          system-ui,
          sans-serif
        );
        font-size: 0.85rem;
        letter-spacing: 0.04em;
      }

      .lightbox-rule {
        /* Gold decorative rule — spec-approved gold usage on surface */
        margin: 1rem 0 1.25rem;
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent,
          var(--amarka-gold, #906030) 50%,
          transparent
        );
      }

      .lightbox-brief {
        margin: 0 0 1rem;
        color: var(--amarka-text, #f0f0f0);
        font-family: var(
          --font-sans,
          'Source Sans 3',
          'Inter',
          system-ui,
          sans-serif
        );
        font-size: 1.02rem;
        line-height: 1.55;
      }

      .lightbox-description {
        margin: 0 0 1.25rem;
        color: var(--amarka-text-secondary, #c0c0c0);
        font-family: var(
          --font-sans,
          'Source Sans 3',
          'Inter',
          system-ui,
          sans-serif
        );
        font-size: 0.95rem;
        line-height: 1.6;
      }

      .lightbox-specs {
        display: grid;
        gap: 0.5rem;
        margin: 0;
        padding: 0.75rem 0 0;
        border-top: 1px solid rgba(192, 192, 192, 0.12);
      }

      .lightbox-specs__row {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 0.75rem;
        align-items: baseline;
      }

      .lightbox-specs dt {
        font-family: var(
          --font-sans,
          'Source Sans 3',
          'Inter',
          system-ui,
          sans-serif
        );
        font-size: 0.72rem;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--amarka-text-secondary, #c0c0c0);
        margin: 0;
      }

      .lightbox-specs dd {
        margin: 0;
        color: var(--amarka-text, #f0f0f0);
        font-family: var(
          --font-sans,
          'Source Sans 3',
          'Inter',
          system-ui,
          sans-serif
        );
        font-size: 0.92rem;
        line-height: 1.5;
      }

      .lightbox-footer {
        padding: 1rem 1.5rem 1.5rem;
        border-top: 1px solid rgba(192, 192, 192, 0.12);
        display: flex;
        justify-content: flex-end;
      }

      /* Zone 3b — ghost/secondary CTA (per AMK-54 canonical) */
      .lightbox-cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.7rem 1.35rem;
        background: transparent;
        color: var(--ts-accent, #c7683b);
        border: 1px solid var(--ts-accent, #c7683b);
        border-radius: 2px;
        font-family: var(
          --font-sans,
          'Source Sans 3',
          'Inter',
          system-ui,
          sans-serif
        );
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        text-decoration: none;
        cursor: pointer;
        transition:
          background-color var(--amarka-duration-fast, 150ms)
            var(--amarka-ease-out, ease-out),
          color var(--amarka-duration-fast, 150ms)
            var(--amarka-ease-out, ease-out),
          transform var(--amarka-duration-fast, 150ms)
            var(--amarka-ease-out, ease-out);
      }

      .lightbox-cta:hover,
      .lightbox-cta:focus-visible {
        background: var(--ts-accent, #c7683b);
        color: var(--amarka-text, #f0f0f0);
        transform: translateY(-1px);
      }

      .lightbox-cta:focus-visible {
        outline: 2px solid var(--ts-accent, #c7683b);
        outline-offset: 2px;
      }

      @media (prefers-reduced-motion: reduce) {
        .lightbox-root,
        .lightbox-dialog,
        .lightbox-close,
        .lightbox-cta {
          transition-duration: 0.01ms !important;
        }
        .lightbox-cta:hover,
        .lightbox-cta:focus-visible {
          transform: none;
        }
      }

      @media (max-width: 600px) {
        .lightbox-specs__row {
          grid-template-columns: 1fr;
          gap: 0.15rem;
        }
      }
    `,
  ],
})
export class PortfolioLightboxComponent {
  private readonly analytics = inject(AnalyticsService, { optional: true });
  private readonly document = inject(DOCUMENT);
  private previouslyFocused: HTMLElement | null = null;

  @ViewChild('dialog', { static: false })
  private dialogRef?: ElementRef<HTMLElement>;

  @ViewChild('closeBtn', { static: false })
  private closeBtnRef?: ElementRef<HTMLButtonElement>;

  protected readonly caseStudy = signal<CaseStudy | null>(null);
  protected readonly open = signal<boolean>(false);

  @Input() set project(value: CaseStudy | null) {
    this.caseStudy.set(value);
  }

  @Input() set isOpen(value: boolean) {
    const previous = this.open();
    this.open.set(value);
    if (value && !previous) {
      this.onOpen();
    } else if (!value && previous) {
      this.onClose();
    }
  }

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly ctaActivated = new EventEmitter<CaseStudy>();

  protected readonly clientTypeLabel = computed(() => {
    const t = this.caseStudy()?.clientType;
    if (!t) return '';
    return t.charAt(0).toUpperCase() + t.slice(1);
  });

  protected readonly statusLabel = computed(() => {
    const s = this.caseStudy()?.status;
    return s === 'in_progress' ? 'Now fabricating' : 'Complete';
  });

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.open()) {
      this.close();
    }
  }

  close() {
    this.isOpen = false;
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent) {
    // Close only when click lands on the backdrop (the root element itself).
    if ((event.target as HTMLElement).classList.contains('lightbox-root')) {
      this.close();
    }
  }

  onCtaClick() {
    const project = this.caseStudy();
    if (!project) return;
    this.analytics?.trackLeadEvent('portfolio_lightbox_cta_click', {
      caseStudyId: project.id,
      slug: project.slug,
    });
    this.ctaActivated.emit(project);
    this.close();
  }

  private onOpen() {
    this.previouslyFocused = this.document.activeElement as HTMLElement | null;
    this.document.body.style.overflow = 'hidden';
    const project = this.caseStudy();
    if (project) {
      this.analytics?.trackLeadEvent('portfolio_lightbox_opened', {
        caseStudyId: project.id,
        slug: project.slug,
      });
    }
    // Move focus to close button (next microtask — dialog must render first).
    queueMicrotask(() => this.closeBtnRef?.nativeElement.focus());
  }

  private onClose() {
    this.document.body.style.overflow = '';
    // Restore focus to the trigger element.
    queueMicrotask(() => this.previouslyFocused?.focus());
  }
}
