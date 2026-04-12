import { Component, OnInit, signal, ChangeDetectorRef, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { StatsService } from '../../../services/stats.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home-stats',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './home-stats.component.html',
  styleUrl: './home-stats.component.scss'
})
export class HomeStatsComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private statsService = inject(StatsService);
  private destroyRef = inject(DestroyRef);
  
  projectsDelivered = signal(0);
  clientSatisfaction = signal(0);
  inHouseRate = signal(0);
  yearsOfCraft = signal(0);

  constructor() {
    // Load real stats from database in constructor (injection context)
    this.statsService.getStats()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(stats => {
        // Store stats for animation in ngOnInit
        this.statsData = stats;
      });
  }

  private statsData: any = null;

  ngOnInit() {
    // Wait for stats to load, then animate
    if (this.statsData) {
      this.animateStats();
    } else {
      // If stats not loaded yet, wait a bit and check again
      const checkInterval = setInterval(() => {
        if (this.statsData) {
          clearInterval(checkInterval);
          this.animateStats();
        }
      }, 100);
    }
  }

  private animateStats() {
    setTimeout(() => {
      this.animateCounter(this.projectsDelivered, this.statsData.totalSales, 2000);
      this.animateCounter(this.clientSatisfaction, this.statsData.customerSatisfaction, 2000);
      this.animateCounter(this.inHouseRate, this.statsData.uptimeGuarantee, 2000, true);
      this.animateCounter(this.yearsOfCraft, this.statsData.yearsExperience, 1500, this.statsData.yearsExperience % 1 !== 0);
    }, 0);
  }

  private animateCounter(signal: any, target: number, duration: number, isDecimal = false) {
    const increment = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        signal.set(isDecimal ? target : Math.floor(target));
        clearInterval(timer);
      } else {
        signal.set(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
      }
    }, 16);
  }
}
