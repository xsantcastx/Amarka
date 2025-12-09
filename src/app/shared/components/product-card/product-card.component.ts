import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
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
  
  constructor(private cart: CartService) {}

  add() {
    this.adding = true;
    this.cart.add(this.product, 1);
    setTimeout(() => this.adding = false, 800);
  }

  getProductRoute(): string[] {
    return ['/products', this.product.slug || this.product.id || ''];
  }
}
