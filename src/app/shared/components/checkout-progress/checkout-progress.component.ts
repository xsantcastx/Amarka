import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'confirmation';

interface StepConfig {
  key: CheckoutStep;
  labelKey: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-checkout-progress',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="w-full py-6">
      <div class="max-w-3xl mx-auto">
        <div class="flex items-center justify-between relative">
          <!-- Progress Line (Background) -->
          <div class="absolute top-5 left-0 right-0 h-0.5 bg-ts-line z-0"></div>
          <!-- Progress Line (Active) -->
          <div class="absolute top-5 left-0 h-0.5 bg-accent z-0 transition-all duration-500"
               [style.width]="progressWidth"></div>

          @for (step of steps; track step.key; let i = $index) {
            <div class="relative z-10 flex flex-col items-center">
              <!-- Step Circle -->
              <div class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                   [class]="getStepCircleClass(step.key)">
                @if (isStepCompleted(step.key)) {
                  <!-- Checkmark for completed steps -->
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                } @else {
                  <!-- Step number for incomplete steps -->
                  <span class="text-sm font-semibold">{{ i + 1 }}</span>
                }
              </div>

              <!-- Step Label -->
              <span class="mt-2 text-xs font-medium transition-colors"
                    [class]="getStepLabelClass(step.key)">
                {{ step.labelKey | translate }}
              </span>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class CheckoutProgressComponent {
  @Input() currentStep: CheckoutStep = 'cart';

  steps: StepConfig[] = [
    { key: 'cart', labelKey: 'checkout.steps.cart', icon: 'cart', route: '/cart' },
    { key: 'shipping', labelKey: 'checkout.steps.shipping', icon: 'truck', route: '/cart' },
    { key: 'payment', labelKey: 'checkout.steps.payment', icon: 'credit-card', route: '/checkout/payment' },
    { key: 'confirmation', labelKey: 'checkout.steps.confirmation', icon: 'check', route: '/checkout/confirmation' }
  ];

  private stepOrder: CheckoutStep[] = ['cart', 'shipping', 'payment', 'confirmation'];

  get currentStepIndex(): number {
    return this.stepOrder.indexOf(this.currentStep);
  }

  get progressWidth(): string {
    const totalSteps = this.steps.length - 1;
    const progress = (this.currentStepIndex / totalSteps) * 100;
    return `${progress}%`;
  }

  isStepCompleted(step: CheckoutStep): boolean {
    const stepIndex = this.stepOrder.indexOf(step);
    return stepIndex < this.currentStepIndex;
  }

  isStepCurrent(step: CheckoutStep): boolean {
    return step === this.currentStep;
  }

  isStepUpcoming(step: CheckoutStep): boolean {
    const stepIndex = this.stepOrder.indexOf(step);
    return stepIndex > this.currentStepIndex;
  }

  getStepCircleClass(step: CheckoutStep): string {
    if (this.isStepCompleted(step)) {
      return 'bg-accent text-neutral border-2 border-accent';
    }
    if (this.isStepCurrent(step)) {
      return 'bg-accent text-neutral border-2 border-accent ring-4 ring-accent/20';
    }
    return 'bg-ts-bg-soft text-ts-ink-soft border-2 border-ts-line';
  }

  getStepLabelClass(step: CheckoutStep): string {
    if (this.isStepCompleted(step) || this.isStepCurrent(step)) {
      return 'text-ts-ink';
    }
    return 'text-ts-ink-soft';
  }
}
