import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem, Product } from '../../shared/models/catalog';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly storageKey = 'amarka-cart';
  private readonly itemsSubject = new BehaviorSubject<CartItem[]>(this.loadInitialCart());

  readonly items$ = this.itemsSubject.asObservable();

  get items(): CartItem[] {
    return this.itemsSubject.getValue();
  }

  get totalItems(): number {
    return this.items.reduce((total, item) => total + item.cantidad, 0);
  }

  add(producto: Product): void {
    const items = [...this.items];
    const existing = items.find((item) => item.producto.id === producto.id);

    if (existing) {
      existing.cantidad += 1;
    } else {
      items.push({ producto, cantidad: 1 });
    }

    this.updateCart(items);
  }

  updateCantidad(productoId: string, cantidad: number): void {
    const items = this.items
      .map((item) =>
        item.producto.id === productoId ? { ...item, cantidad: Math.max(cantidad, 1) } : item
      );
    this.updateCart(items);
  }

  remove(productoId: string): void {
    const items = this.items.filter((item) => item.producto.id !== productoId);
    this.updateCart(items);
  }

  clear(): void {
    this.updateCart([]);
  }

  private updateCart(items: CartItem[]): void {
    this.itemsSubject.next(items);
    this.persist(items);
  }

  private loadInitialCart(): CartItem[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = window.localStorage.getItem(this.storageKey);
      return stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch (error) {
      console.warn('No se pudo cargar el carrito', error);
      return [];
    }
  }

  private persist(items: CartItem[]): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(items));
    } catch (error) {
      console.warn('No se pudo guardar el carrito', error);
    }
  }
}
