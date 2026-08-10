import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Konva from 'konva';
import { ProductCatalogService } from '../product-catalog.service';
import { DesignProjectService } from '../design-project.service';
import { LeadSubmissionService } from '../../../services/lead-submission.service';
import { ProductSilhouetteComponent } from '../product-silhouette/product-silhouette.component';
import { ProductDesignArea, ProductTemplate } from '../product-catalog.types';
import { StudioLogo } from '../studio-project.types';

// Konva paints to a canvas, so these cannot read the --amk-* CSS custom
// properties and have to be literals. Both are Brand Bible tokens.
const GOLD = '#906030';   // selection border + transformer anchors (was #C9A24C)
// Centre guides use the silver token rather than the accent so they stay
// visually distinct from the gold selection chrome — collapsing both onto
// #906030 would make the alignment guides indistinguishable from the handles.
const GUIDE = '#c0c0c0';  // was #FF7A52 (off-palette ember)

@Component({
  selector: 'amk-canvas-editor',
  standalone: true,
  imports: [CommonModule, ProductSilhouetteComponent],
  templateUrl: './canvas-editor.component.html',
  styleUrl: './canvas-editor.component.scss',
})
export class CanvasEditorComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
  @ViewChild('stageContainer') stageContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @Output() continueToReview = new EventEmitter<void>();
  @Output() startOver = new EventEmitter<void>();

  private catalog = inject(ProductCatalogService);
  protected projectService = inject(DesignProjectService);
  private leadSubmission = inject(LeadSubmissionService);

  protected project = this.projectService.project;
  protected canUndo = this.projectService.canUndo;
  protected canRedo = this.projectService.canRedo;

  protected product = computed<ProductTemplate>(() => {
    const p = this.project();
    return this.catalog.getById(p?.productId ?? '') ?? this.catalog.getAll()[0];
  });

  protected colorHex = computed(() => {
    const p = this.project();
    return this.product().colors.find(c => c.id === p?.colorId)?.hex ?? '#8a8a8a';
  });

  protected activeViewId = signal<string>('');
  protected activeView = computed(() => this.product().views.find(v => v.id === this.activeViewId()) ?? this.product().views[0]);
  protected areasForActiveView = computed<ProductDesignArea[]>(() =>
    this.product().designAreas.filter(a => a.viewId === this.activeViewId())
  );
  protected logosForActiveView = computed<StudioLogo[]>(() => {
    const p = this.project();
    if (!p) return [];
    return p.logos.filter(l => l.viewId === this.activeViewId()).sort((a, b) => a.zIndex - b.zIndex);
  });

  /** Canvas zoom factor — implemented by resizing the canvas wrapper, so the
   * ResizeObserver re-renders Konva at the new pixel size and pointer
   * coordinates stay exact (no CSS transforms involved). */
  protected zoom = signal(1);
  protected readonly minZoom = 1;
  protected readonly maxZoom = 3;

  protected selectedLogoId = signal<string | null>(null);
  protected selectedLogo = computed(() => this.logosForActiveView().find(l => l.id === this.selectedLogoId()) ?? null);
  protected uploading = signal(false);
  protected uploadError = signal('');
  protected renamingName = signal(false);
  protected nameDraft = signal('');

  private stage?: Konva.Stage;
  private layer?: Konva.Layer;
  private guideLayer?: Konva.Layer;
  private transformer?: Konva.Transformer;
  private resizeObserver?: ResizeObserver;
  private suppressNextRender = false;
  private rebuildQueued = false;
  private renderGen = 0;

  constructor() {
    effect(() => {
      // Re-render whenever the project's logos or the active view changes.
      const p = this.project();
      const viewId = this.activeViewId();
      void p;
      void viewId;
      if (this.stage && !this.suppressNextRender) {
        this.renderLogos();
      }
      this.suppressNextRender = false;
    });
  }

  ngAfterViewInit(): void {
    const product = this.product();
    this.activeViewId.set(product.views[0]?.id ?? '');
    this.attachStage();
  }

  ngAfterViewChecked(): void {
    // Hydration cleanup and dev-mode HMR can re-create the container element
    // after the stage attached, leaving Konva drawing into a detached node.
    // When the ViewChild no longer matches the stage's container, re-attach.
    const el = this.stageContainerRef?.nativeElement;
    if (!this.rebuildQueued && this.stage && el && this.stage.container() !== el) {
      this.rebuildQueued = true;
      queueMicrotask(() => {
        this.rebuildQueued = false;
        this.attachStage();
      });
    }
  }

  private attachStage(): void {
    this.resizeObserver?.disconnect();
    this.stage?.destroy();
    this.initStage();
    this.renderLogos();
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.stageContainerRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.stage?.destroy();
    this.resizeObserver?.disconnect();
  }

  private initStage(): void {
    const el = this.stageContainerRef.nativeElement;
    const rect = el.getBoundingClientRect();
    this.stage = new Konva.Stage({ container: el, width: rect.width, height: rect.height });
    this.layer = new Konva.Layer();
    this.guideLayer = new Konva.Layer({ listening: false });
    this.transformer = new Konva.Transformer({
      rotateAnchorOffset: 24,
      borderStroke: GOLD,
      anchorStroke: GOLD,
      anchorFill: '#ffffff',
      anchorSize: 10,
      keepRatio: true,
    });
    this.stage.add(this.layer);
    this.stage.add(this.guideLayer);
    this.layer.add(this.transformer);

    this.stage.on('click tap', e => {
      if (e.target === this.stage) {
        this.deselect();
      }
    });
  }

  private handleResize(): void {
    if (!this.stage) return;
    const rect = this.stageContainerRef.nativeElement.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    this.stage.width(rect.width);
    this.stage.height(rect.height);
    this.renderLogos();
  }

  // ─── Rendering ────────────────────────────────────────────────────────

  private renderLogos(): void {
    if (!this.stage || !this.layer) return;
    this.layer.find('.studio-logo').forEach(n => n.destroy());

    // Image loads resolve async — if another render starts meanwhile, its
    // cleanup pass runs before these onloads land and the logos double up.
    const gen = ++this.renderGen;
    const layer = this.layer;
    const w = this.stage.width();
    const h = this.stage.height();
    const logos = this.logosForActiveView();

    logos.forEach(logo => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (gen !== this.renderGen || this.layer !== layer) return;
        const nodeW = (logo.widthPct / 100) * w;
        const nodeH = (logo.heightPct / 100) * h;
        const node = new Konva.Image({
          image: img,
          x: (logo.xPct / 100) * w,
          y: (logo.yPct / 100) * h,
          width: nodeW,
          height: nodeH,
          offsetX: nodeW / 2,
          offsetY: nodeH / 2,
          rotation: logo.rotation,
          scaleX: logo.flipH ? -1 : 1,
          scaleY: logo.flipV ? -1 : 1,
          draggable: !logo.locked,
          name: 'studio-logo',
          id: logo.id,
        });
        this.attachEvents(node, logo.id);
        this.layer.add(node);
        this.transformer?.moveToTop();
        this.layer.batchDraw();
        if (this.selectedLogoId() === logo.id && !logo.locked) {
          this.transformer?.nodes([node]);
        }
      };
      img.onerror = () => {
        // Broken/expired preview URL — skip silently rather than crash the editor.
      };
      img.src = logo.previewUrl;
    });

    if (!logos.some(l => l.id === this.selectedLogoId())) {
      this.deselect();
    }
  }

  private attachEvents(node: Konva.Image, logoId: string): void {
    node.on('click tap', e => {
      e.cancelBubble = true;
      this.selectLogo(logoId, node);
    });
    node.on('dragstart', () => this.projectService.snapshotForUndo());
    node.on('dragmove', () => this.applySnapGuides(node));
    node.on('dragend', () => {
      this.guideLayer?.destroyChildren();
      this.guideLayer?.batchDraw();
      this.commitNodeTransform(logoId, node, { history: false });
    });
    node.on('transformstart', () => this.projectService.snapshotForUndo());
    node.on('transformend', () => this.commitNodeTransform(logoId, node, { history: false }));
  }

  private selectLogo(id: string, node: Konva.Image): void {
    this.selectedLogoId.set(id);
    const logo = this.logosForActiveView().find(l => l.id === id);
    this.transformer?.nodes(logo && !logo.locked ? [node] : []);
    this.layer?.batchDraw();
  }

  protected deselect(): void {
    this.selectedLogoId.set(null);
    this.transformer?.nodes([]);
    this.layer?.batchDraw();
  }

  // ─── Product options (variant / color / quantity) ─────────────────────

  protected setVariant(variantId: string): void {
    this.projectService.updateProductConfig({ variantId });
  }

  protected setColor(colorId: string): void {
    this.projectService.updateProductConfig({ colorId });
  }

  protected adjustQuantity(delta: number): void {
    const current = this.project()?.quantity ?? 1;
    this.projectService.updateProductConfig({ quantity: Math.max(1, current + delta) });
  }

  // ─── Zoom ─────────────────────────────────────────────────────────────

  protected zoomIn(): void {
    this.setZoom(this.zoom() + 0.25);
  }

  protected zoomOut(): void {
    this.setZoom(this.zoom() - 0.25);
  }

  protected zoomReset(): void {
    this.setZoom(1);
  }

  private setZoom(value: number): void {
    const next = Math.min(this.maxZoom, Math.max(this.minZoom, Math.round(value * 100) / 100));
    if (next === this.zoom()) return;

    const viewport = this.stageContainerRef?.nativeElement.closest('.amk-editor__viewport') as HTMLElement | null;
    // Keep the point at the middle of the viewport stable across the zoom.
    const prev = this.zoom();
    const cx = viewport ? (viewport.scrollLeft + viewport.clientWidth / 2) / prev : 0;
    const cy = viewport ? (viewport.scrollTop + viewport.clientHeight / 2) / prev : 0;

    this.zoom.set(next);

    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollLeft = cx * next - viewport.clientWidth / 2;
        viewport.scrollTop = cy * next - viewport.clientHeight / 2;
      });
    }
  }

  private commitNodeTransform(logoId: string, node: Konva.Image, opts: { history?: boolean }): void {
    const w = this.stage!.width();
    const h = this.stage!.height();
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const newWidth = node.width() * Math.abs(scaleX);
    const newHeight = node.height() * Math.abs(scaleY);

    this.suppressNextRender = true;
    this.projectService.updateLogo(
      logoId,
      {
        xPct: (node.x() / w) * 100,
        yPct: (node.y() / h) * 100,
        widthPct: (newWidth / w) * 100,
        heightPct: (newHeight / h) * 100,
        rotation: node.rotation(),
      },
      { history: opts.history }
    );

    // Bake the transform scale back into width/height so the next resize starts clean.
    node.width(newWidth);
    node.height(newHeight);
    node.scaleX(scaleX < 0 ? -1 : 1);
    node.scaleY(scaleY < 0 ? -1 : 1);
    node.offsetX(newWidth / 2);
    node.offsetY(newHeight / 2);
  }

  private applySnapGuides(node: Konva.Image): void {
    if (!this.stage || !this.guideLayer) return;
    const w = this.stage.width();
    const h = this.stage.height();
    const centerX = w / 2;
    const centerY = h / 2;
    const threshold = 8;

    this.guideLayer.destroyChildren();
    let snappedX = false;
    let snappedY = false;

    if (Math.abs(node.x() - centerX) < threshold) {
      node.x(centerX);
      snappedX = true;
    }
    if (Math.abs(node.y() - centerY) < threshold) {
      node.y(centerY);
      snappedY = true;
    }
    if (snappedX) {
      this.guideLayer.add(new Konva.Line({ points: [centerX, 0, centerX, h], stroke: GUIDE, strokeWidth: 1, dash: [4, 4] }));
    }
    if (snappedY) {
      this.guideLayer.add(new Konva.Line({ points: [0, centerY, w, centerY], stroke: GUIDE, strokeWidth: 1, dash: [4, 4] }));
    }
    this.guideLayer.batchDraw();
  }

  // ─── View switching ───────────────────────────────────────────────────

  protected setActiveView(viewId: string): void {
    this.activeViewId.set(viewId);
    this.deselect();
  }

  // ─── Logo upload ──────────────────────────────────────────────────────

  protected triggerUpload(): void {
    this.fileInputRef.nativeElement.click();
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadError.set('');
    this.uploading.set(true);
    try {
      // Preview from a local data URL — the storage path is write-only for
      // anonymous visitors (admin-only read), and a same-document data URL
      // also keeps the mockup canvas untainted by CORS.
      const previewUrl = await this.readFileAsDataUrl(file);
      const [uploadRef] = await this.leadSubmission.uploadFiles([file], 'enquiries');
      const area = this.areasForActiveView()[0];

      // Fit the logo into the default drop box at its natural aspect ratio.
      // Percentages are relative to the (non-square) stage, so the ratio has
      // to be corrected in pixel space or the image renders stretched.
      const dims = await this.readImageDims(previewUrl);
      const stageW = this.stage?.width() || 4;
      const stageH = this.stage?.height() || 5;
      const boxWPct = area ? Math.min(area.boundary.widthPct, 22) : 22;
      const boxHPct = area ? Math.min(area.boundary.heightPct, 22) : 22;
      const fit = Math.min((boxWPct / 100) * stageW / dims.w, (boxHPct / 100) * stageH / dims.h);
      const widthPct = ((dims.w * fit) / stageW) * 100;
      const heightPct = ((dims.h * fit) / stageH) * 100;

      const logo: StudioLogo = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        storagePath: uploadRef.storagePath,
        originalName: uploadRef.originalName,
        previewUrl,
        viewId: this.activeViewId(),
        xPct: area ? area.boundary.xPct + area.boundary.widthPct / 2 : 50,
        yPct: area ? area.boundary.yPct + area.boundary.heightPct / 2 : 50,
        widthPct,
        heightPct,
        rotation: 0,
        flipH: false,
        flipV: false,
        zIndex: 0,
        locked: false,
      };
      this.projectService.addLogo(logo);
      this.selectedLogoId.set(logo.id);
      // The Add Logo button sits below the canvas, so a freshly placed logo
      // can land off-screen — bring it into view.
      this.stageContainerRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (error) {
      this.uploadError.set(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    } finally {
      this.uploading.set(false);
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Could not read the selected file.'));
      reader.readAsDataURL(file);
    });
  }

  private readImageDims(src: string): Promise<{ w: number; h: number }> {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      // Square fallback (e.g. an SVG without intrinsic dimensions).
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = src;
    });
  }

  // ─── Selected-logo actions ────────────────────────────────────────────

  protected deleteSelected(): void {
    const id = this.selectedLogoId();
    if (!id) return;
    this.projectService.deleteLogo(id);
    this.deselect();
  }

  protected duplicateSelected(): void {
    const id = this.selectedLogoId();
    if (!id) return;
    this.projectService.duplicateLogo(id);
  }

  protected flipSelected(axis: 'h' | 'v'): void {
    const logo = this.selectedLogo();
    if (!logo) return;
    this.projectService.updateLogo(logo.id, axis === 'h' ? { flipH: !logo.flipH } : { flipV: !logo.flipV });
  }

  protected toggleLockSelected(): void {
    const logo = this.selectedLogo();
    if (!logo) return;
    this.projectService.updateLogo(logo.id, { locked: !logo.locked });
    if (!logo.locked) {
      // Locking: drop the transformer immediately.
      this.transformer?.nodes([]);
      this.layer?.batchDraw();
    }
  }

  protected reorderSelected(direction: 'front' | 'back' | 'forward' | 'backward'): void {
    const id = this.selectedLogoId();
    if (!id) return;
    this.projectService.reorderLogo(id, direction);
  }

  protected selectLogoFromList(id: string): void {
    const node = this.layer?.findOne(`#${id}`) as Konva.Image | undefined;
    if (node) {
      this.selectLogo(id, node);
    } else {
      this.selectedLogoId.set(id);
    }
  }

  // ─── Undo / redo ──────────────────────────────────────────────────────

  protected undo(): void {
    this.projectService.undo();
  }

  protected redo(): void {
    this.projectService.redo();
  }

  // ─── Project name ─────────────────────────────────────────────────────

  protected startRename(): void {
    this.nameDraft.set(this.project()?.name ?? '');
    this.renamingName.set(true);
  }

  protected commitRename(): void {
    this.projectService.renameProject(this.nameDraft());
    this.renamingName.set(false);
  }

  // ─── Navigation ───────────────────────────────────────────────────────

  protected onContinue(): void {
    this.continueToReview.emit();
  }

  protected onStartOver(): void {
    this.startOver.emit();
  }
}
