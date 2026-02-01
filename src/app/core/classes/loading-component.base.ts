import { ChangeDetectorRef, Directive, inject } from '@angular/core';

/**
 * Base class for components that need loading state management with proper change detection.
 * Extends this class to automatically handle loading spinners that update immediately.
 * 
 * Usage:
 * ```typescript
 * export class YourComponent extends LoadingComponentBase implements OnInit {
 *   async ngOnInit() {
 *     await this.withLoading(async () => {
 *       // Your async operations here
 *       const data = await this.service.loadData();
 *       this.data = data;
 *     });
 *   }
 * }
 * ```
 */
@Directive()
export abstract class LoadingComponentBase {
  protected cdr = inject(ChangeDetectorRef);
  
  isLoading = false;
  errorMessage = '';

  /**
   * Wraps an async operation with loading state management and change detection.
   * Automatically sets isLoading to true, runs your operation, then sets it to false.
   * Forces change detection at each step so UI updates immediately.
   * 
   * @param operation - The async operation to perform
   * @param showError - Whether to set errorMessage on error (default: false)
   * @returns Promise that resolves when operation completes
   */
  protected async withLoading<T>(
    operation: () => Promise<T>,
    showError = false
  ): Promise<T | undefined> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const result = await operation();
      this.isLoading = false;
      this.cdr.detectChanges();
      return result;
    } catch (error) {
      void 0;
      this.isLoading = false;
      
      if (showError) {
        this.errorMessage = error instanceof Error ? error.message : 'An error occurred';
      }
      
      this.cdr.detectChanges();
      return undefined;
    }
  }

  /**
   * Forces Angular to detect changes immediately.
   * Use this when you manually update component state outside of Angular's zone.
   */
  protected forceUpdate(): void {
    this.cdr.detectChanges();
  }

  /**
   * Sets loading state and triggers change detection.
   * @param loading - Whether component is loading
   */
  protected setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.cdr.detectChanges();
  }

  /**
   * Sets error message and triggers change detection.
   * @param message - Error message to display
   */
  protected setError(message: string): void {
    this.errorMessage = message;
    this.cdr.detectChanges();
  }

  /**
   * Clears error message and triggers change detection.
   */
  protected clearError(): void {
    this.errorMessage = '';
    this.cdr.detectChanges();
  }
}
