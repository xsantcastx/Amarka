import { Injectable, PLATFORM_ID, inject, signal, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StudioLogo, StudioProject, StudioProjectIndexEntry } from './studio-project.types';
import { ProductCatalogService } from './product-catalog.service';

const PROJECT_KEY_PREFIX = 'amk-studio-project:';
const PROJECT_INDEX_KEY = 'amk-studio-project-index';
const MAX_HISTORY = 30;

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Owns the in-progress design project: product/variant/color/quantity,
 * logo placements, undo/redo history, and localStorage persistence.
 *
 * There is no account system on this site, so "save / continue later" is
 * scoped to the browser via localStorage rather than a user id — a saved
 * project's URL (?project=<id>) is what makes it resumable/shareable.
 */
@Injectable({ providedIn: 'root' })
export class DesignProjectService {
  private platformId = inject(PLATFORM_ID);
  private catalog = inject(ProductCatalogService);
  private isBrowser = isPlatformBrowser(this.platformId);

  private readonly _project = signal<StudioProject | null>(null);
  readonly project = this._project.asReadonly();

  private undoStack: StudioLogo[][] = [];
  private redoStack: StudioLogo[][] = [];
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  readonly activeProduct = computed(() => {
    const p = this._project();
    return p ? this.catalog.getById(p.productId) : undefined;
  });

  createProject(productId: string, variantId: string, colorId: string, quantity: number): StudioProject {
    const project: StudioProject = {
      id: generateId(),
      name: 'Untitled Design',
      productId,
      variantId,
      colorId,
      quantity,
      logos: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this._project.set(project);
    this.undoStack = [];
    this.redoStack = [];
    this.canUndo.set(false);
    this.canRedo.set(false);
    this.persist(project);
    return project;
  }

  loadProject(id: string): StudioProject | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(PROJECT_KEY_PREFIX + id);
      if (!raw) return null;
      const project = JSON.parse(raw) as StudioProject;
      this._project.set(project);
      this.undoStack = [];
      this.redoStack = [];
      this.canUndo.set(false);
      this.canRedo.set(false);
      return project;
    } catch {
      return null;
    }
  }

  updateProductConfig(patch: Partial<Pick<StudioProject, 'variantId' | 'colorId' | 'quantity'>>): void {
    const current = this._project();
    if (!current) return;
    this._project.set({ ...current, ...patch, updatedAt: nowIso() });
    this.scheduleAutosave();
  }

  renameProject(name: string): void {
    const current = this._project();
    if (!current) return;
    this._project.set({ ...current, name: name.trim() || 'Untitled Design', updatedAt: nowIso() });
    this.scheduleAutosave(true);
  }

  duplicateProject(): StudioProject | null {
    const current = this._project();
    if (!current) return null;
    const copy: StudioProject = {
      ...current,
      id: generateId(),
      name: `${current.name} (Copy)`,
      logos: current.logos.map(l => ({ ...l, id: generateId() })),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    this._project.set(copy);
    this.undoStack = [];
    this.redoStack = [];
    this.persist(copy);
    return copy;
  }

  deleteProject(id: string): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(PROJECT_KEY_PREFIX + id);
    const index = this.readIndex().filter(e => e.id !== id);
    localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index));
  }

  listSavedProjects(): StudioProjectIndexEntry[] {
    return this.readIndex().sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  // ─── Logo mutations (each pushes an undo snapshot) ───────────────────

  addLogo(logo: StudioLogo): void {
    const current = this._project();
    if (!current) return;
    this.pushHistory(current.logos);
    const maxZ = current.logos.reduce((max, l) => Math.max(max, l.zIndex), 0);
    const next = { ...logo, zIndex: maxZ + 1 };
    this._project.set({ ...current, logos: [...current.logos, next], updatedAt: nowIso() });
    this.scheduleAutosave();
  }

  updateLogo(id: string, patch: Partial<StudioLogo>, opts: { history?: boolean } = { history: true }): void {
    const current = this._project();
    if (!current) return;
    if (opts.history !== false) {
      this.pushHistory(current.logos);
    }
    const logos = current.logos.map(l => (l.id === id ? { ...l, ...patch } : l));
    this._project.set({ ...current, logos, updatedAt: nowIso() });
    this.scheduleAutosave();
  }

  duplicateLogo(id: string): void {
    const current = this._project();
    if (!current) return;
    const source = current.logos.find(l => l.id === id);
    if (!source) return;
    this.pushHistory(current.logos);
    const maxZ = current.logos.reduce((max, l) => Math.max(max, l.zIndex), 0);
    const copy: StudioLogo = {
      ...source,
      id: generateId(),
      xPct: Math.min(90, source.xPct + 4),
      yPct: Math.min(90, source.yPct + 4),
      zIndex: maxZ + 1,
      locked: false,
    };
    this._project.set({ ...current, logos: [...current.logos, copy], updatedAt: nowIso() });
    this.scheduleAutosave();
  }

  deleteLogo(id: string): void {
    const current = this._project();
    if (!current) return;
    this.pushHistory(current.logos);
    this._project.set({ ...current, logos: current.logos.filter(l => l.id !== id), updatedAt: nowIso() });
    this.scheduleAutosave();
  }

  reorderLogo(id: string, direction: 'front' | 'back' | 'forward' | 'backward'): void {
    const current = this._project();
    if (!current) return;
    this.pushHistory(current.logos);
    const sorted = [...current.logos].sort((a, b) => a.zIndex - b.zIndex);
    const idx = sorted.findIndex(l => l.id === id);
    if (idx === -1) return;
    const [item] = sorted.splice(idx, 1);
    if (direction === 'front') sorted.push(item);
    else if (direction === 'back') sorted.unshift(item);
    else if (direction === 'forward') sorted.splice(Math.min(idx + 1, sorted.length), 0, item);
    else sorted.splice(Math.max(idx - 1, 0), 0, item);
    const logos = sorted.map((l, i) => ({ ...l, zIndex: i + 1 }));
    this._project.set({ ...current, logos, updatedAt: nowIso() });
    this.scheduleAutosave();
  }

  /** Captures an undo snapshot without mutating state — call before a drag/transform gesture begins. */
  snapshotForUndo(): void {
    const current = this._project();
    if (!current) return;
    this.pushHistory(current.logos);
  }

  // ─── Undo / redo ──────────────────────────────────────────────────────

  undo(): void {
    const current = this._project();
    if (!current || !this.undoStack.length) return;
    const previous = this.undoStack.pop()!;
    this.redoStack.push(current.logos);
    this._project.set({ ...current, logos: previous, updatedAt: nowIso() });
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
    this.scheduleAutosave();
  }

  redo(): void {
    const current = this._project();
    if (!current || !this.redoStack.length) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(current.logos);
    this._project.set({ ...current, logos: next, updatedAt: nowIso() });
    this.canUndo.set(this.undoStack.length > 0);
    this.canRedo.set(this.redoStack.length > 0);
    this.scheduleAutosave();
  }

  private pushHistory(logos: StudioLogo[]): void {
    this.undoStack.push(logos);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.canUndo.set(true);
    this.canRedo.set(false);
  }

  // ─── Persistence ──────────────────────────────────────────────────────

  private scheduleAutosave(immediate = false): void {
    if (!this.isBrowser) return;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }
    const project = this._project();
    if (!project) return;
    if (immediate) {
      this.persist(project);
      return;
    }
    this.autosaveTimer = setTimeout(() => this.persist(project), 600);
  }

  private persist(project: StudioProject): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(PROJECT_KEY_PREFIX + project.id, JSON.stringify(project));
      const product = this.catalog.getById(project.productId);
      const colorHex = product?.colors.find(c => c.id === project.colorId)?.hex || '#8a8a8a';
      const index = this.readIndex().filter(e => e.id !== project.id);
      index.push({ id: project.id, name: project.name, productId: project.productId, colorHex, updatedAt: project.updatedAt });
      localStorage.setItem(PROJECT_INDEX_KEY, JSON.stringify(index));
    } catch {
      // localStorage unavailable or full — non-critical, autosave just silently no-ops
    }
  }

  private readIndex(): StudioProjectIndexEntry[] {
    if (!this.isBrowser) return [];
    try {
      const raw = localStorage.getItem(PROJECT_INDEX_KEY);
      return raw ? (JSON.parse(raw) as StudioProjectIndexEntry[]) : [];
    } catch {
      return [];
    }
  }
}
