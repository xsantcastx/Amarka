import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Product } from '../../../models/product';
import { CartService } from '../../../services/cart.service';

@Component({
  standalone: true,
  selector: 'ts-product-card',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() viewMode: 'grid' | 'list' = 'grid';
  @Input() categoryPath?: string; // e.g., "Antminer S19" for routing
  
  adding = false;
  
  constructor(private cart: CartService, private router: Router) {}

  add() {
    if (this.hasVariants()) {
      this.router.navigate(this.getProductRoute());
      return;
    }

    this.adding = true;
    this.cart.add(this.product, 1);
    setTimeout(() => this.adding = false, 800);
  }

  hasVariants(): boolean {
    return (this.product.variants || []).some(variant => variant.active !== false);
  }

  getProductRoute(): string[] {
    return ['/products', this.product.slug || this.product.id || ''];
  }
}
