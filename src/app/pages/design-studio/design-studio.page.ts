import { Component, afterNextRender, inject, signal } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SeoSchemaService } from '../../services/seo-schema.service';
import { AmkThemeService } from '../../shared/amk-theme/amk-theme.service';
import { DesignProjectService } from '../../features/design-studio/design-project.service';
import { ProductPickerComponent, ProductPickerSelection } from '../../features/design-studio/product-picker/product-picker.component';
import { CanvasEditorComponent } from '../../features/design-studio/canvas-editor/canvas-editor.component';
import { DesignReviewComponent } from '../../features/design-studio/design-review/design-review.component';

type StudioStep = 'pick' | 'editor' | 'review';

@Component({
  selector: 'app-design-studio-page',
  standalone: true,
  imports: [CommonModule, ProductPickerComponent, CanvasEditorComponent, DesignReviewComponent],
  templateUrl: './design-studio.page.html',
  styleUrl: './design-studio.page.scss'
})
export class DesignStudioPageComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(DesignProjectService);
  private seo = inject(SeoSchemaService);
  private document = inject(DOCUMENT);
  protected readonly themeService = inject(AmkThemeService);

  protected readonly theme = this.themeService.theme;
  protected readonly step = signal<StudioStep>('pick');
  protected readonly project = this.projectService.project;
  protected readonly submitted = signal(false);

  constructor() {
    this.seo.setupMarketingPageSEO({
      title: 'Product Customization Studio | Amarka',
      description: 'Design your branded merchandise online — upload your logo, place it exactly where you want, and request a quote.',
      keywords: ['custom product designer', 'logo placement tool', 'branded merchandise studio'],
      path: '/design'
    });

    afterNextRender(() => {
      const projectId = this.route.snapshot.queryParamMap.get('project');
      if (projectId && this.projectService.loadProject(projectId)) {
        this.step.set('editor');
      }
    });
  }

  protected toggleTheme(): void {
    this.themeService.toggle();
  }

  protected onProductSelected(selection: ProductPickerSelection): void {
    const project = this.projectService.createProject(
      selection.productId,
      selection.variantId,
      selection.colorId,
      selection.quantity
    );
    this.setProjectQueryParam(project.id);
    this.step.set('editor');
    this.focusWorkspace();
  }

  protected onResumeProject(id: string): void {
    const loaded = this.projectService.loadProject(id);
    if (loaded) {
      this.setProjectQueryParam(id);
      this.step.set('editor');
      this.focusWorkspace();
    }
  }

  protected onEditorContinue(): void {
    this.step.set('review');
    this.focusWorkspace();
  }

  protected onBackToEditor(): void {
    this.submitted.set(false);
    this.step.set('editor');
    this.focusWorkspace();
  }

  protected onStartOver(): void {
    this.step.set('pick');
    this.submitted.set(false);
    this.setProjectQueryParam(null);
    this.focusWorkspace();
  }

  protected onSubmitted(): void {
    this.submitted.set(true);
  }

  private setProjectQueryParam(id: string | null): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { project: id },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private focusWorkspace(): void {
    requestAnimationFrame(() => {
      const workspace = this.document.getElementById('studio-workspace');
      if (!workspace) return;
      const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      workspace.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      workspace.focus({ preventScroll: true });
    });
  }
}
