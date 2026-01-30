import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { ProductListComponent } from './product-list';
import { Product } from '../../../shared/models/catalog';

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;

  const mockProducts: Product[] = [
    {
      id: 'p1',
      nombre: 'Test Product 1',
      linea: 'onix-black',
      material: 'Onix Black',
      descripcion: 'Beautiful onix surface',
      imagen: '/assets/products/onix-1.jpg',
      acabados: ['Pulido', 'Mate'],
      formatos: ['60x120', '80x160'],
      calibre: '10',
      colorPrincipal: '#1a1a1a',
      fichaTecnica: '/assets/sheets/onix-black.pdf'
    },
    {
      id: 'p2',
      nombre: 'Test Product 2',
      linea: 'marble-white',
      material: 'Marble White',
      descripcion: 'Elegant marble finish',
      imagen: '/assets/products/marble-1.jpg',
      acabados: ['Pulido'],
      formatos: ['60x120'],
      calibre: '10',
      colorPrincipal: '#f5f5f5',
      fichaTecnica: '/assets/sheets/marble-white.pdf'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display empty message when no products', () => {
    component.productos = [];
    fixture.detectChanges();

    const emptyMessage = fixture.nativeElement.querySelector('.product-list__empty');
    expect(emptyMessage).toBeTruthy();
    expect(emptyMessage.textContent).toContain('Selecciona una linea');
  });

  it('should display product grid when products exist', () => {
    component.productos = mockProducts;
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('.product-list__grid');
    expect(grid).toBeTruthy();

    const cards = fixture.nativeElement.querySelectorAll('.product-card');
    expect(cards.length).toBe(2);
  });

  it('should display product details correctly', () => {
    component.productos = [mockProducts[0]];
    fixture.detectChanges();

    const card = fixture.nativeElement.querySelector('.product-card');
    expect(card.textContent).toContain('Test Product 1');
    expect(card.textContent).toContain('Onix Black');
    expect(card.textContent).toContain('Beautiful onix surface');
    expect(card.textContent).toContain('Pulido, Mate');
    expect(card.textContent).toContain('60x120 - 80x160');
  });

  it('should display product image as background', () => {
    component.productos = [mockProducts[0]];
    fixture.detectChanges();

    const imageDiv = fixture.nativeElement.querySelector('.product-card__image');
    const bgImage = imageDiv.style.backgroundImage;
    expect(bgImage).toContain('/assets/products/onix-1.jpg');
  });

  it('should emit product when add button is clicked', () => {
    spyOn(component.agregar, 'emit');
    component.productos = [mockProducts[0]];
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(component.agregar.emit).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('should call agregarProducto method when button clicked', () => {
    spyOn(component, 'agregarProducto');
    component.productos = [mockProducts[0]];
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    button.click();

    expect(component.agregarProducto).toHaveBeenCalledWith(mockProducts[0]);
  });

  it('should render all products with track by id', () => {
    component.productos = mockProducts;
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.product-card');
    
    // First card
    expect(cards[0].textContent).toContain('Test Product 1');
    
    // Second card
    expect(cards[1].textContent).toContain('Test Product 2');
  });

  it('should display acabados as comma-separated list', () => {
    component.productos = [mockProducts[0]];
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('.product-card__details');
    expect(details.textContent).toContain('Acabados: Pulido, Mate');
  });

  it('should display formatos with dash separator', () => {
    component.productos = [mockProducts[0]];
    fixture.detectChanges();

    const details = fixture.nativeElement.querySelector('.product-card__details');
    expect(details.textContent).toContain('Formatos: 60x120 - 80x160');
  });

  it('should handle empty array gracefully', () => {
    component.productos = [];
    fixture.detectChanges();

    const grid = fixture.nativeElement.querySelector('.product-list__grid');
    expect(grid).toBeFalsy();
  });

  it('should update view when productos input changes', () => {
    component.productos = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.product-list__empty')).toBeTruthy();

    component.productos = mockProducts;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.product-list__grid')).toBeTruthy();
  });
});
