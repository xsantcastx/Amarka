import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="nf-hero">
      <div class="page-container">
        <div class="nf-hero__inner">
          <div class="nf-hero__code">404</div>
          <h1 class="nf-hero__title heading-display">Page not found.</h1>
          <p class="nf-hero__sub">
            This page doesn't exist — it may have been moved or removed. Head back to the studio or start a new commission.
          </p>
          <div class="nf-hero__actions">
            <a routerLink="/" class="btn-primary">Back to Home</a>
            <a routerLink="/enquire" class="btn-outline">Start a Commission</a>
          </div>
        </div>
      </div>
    </section>

    <section class="nf-links">
      <div class="page-container">
        <p class="nf-links__label">Continue to</p>
        <div class="nf-links__grid">
          <a routerLink="/" class="nf-card">
            <span class="nf-card__title">Home</span>
            <span class="nf-card__desc">Recent commissions, services, and studio overview.</span>
          </a>
          <a routerLink="/services" class="nf-card">
            <span class="nf-card__title">Services</span>
            <span class="nf-card__desc">Architectural signage, hospitality fitout, trade supply, and awards.</span>
          </a>
          <a routerLink="/trade" class="nf-card">
            <span class="nf-card__title">Trade</span>
            <span class="nf-card__desc">Apply for a trade account and download the studio spec sheet.</span>
          </a>
        </div>
      </div>
    </section>
  `,
  styleUrl: './not-found.page.scss'
})
export class NotFoundPageComponent {

}
