import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ProductosComponent } from './productos';
import { CatalogService } from '../../../shared/services/catalog';
import { CartService } from '../../../shared/services/cart';
import { Product, ProductLine } from '../../../shared/models/catalog';

describe('ProductosComponent', () => {
  let component: ProductosComponent;
  let fixture: ComponentFixture<ProductosComponent>;
  let catalogService: jasmine.SpyObj<CatalogService>;
  let cartService: jasmine.SpyObj<CartService>;

  const mockProductLines: ProductLine[] = [
    { slug: 'onix-black', nombre: 'Onix Black', calibre: '10', descripcion: 'Test line 1', foto: '/test1.jpg' },
    { slug: 'marble-white', nombre: 'Marble White', calibre: '10', descripcion: 'Test line 2', foto: '/test2.jpg' }
  ];

  const mockProducts: Product[] = [
    {
      id: 'p1',
      nombre: 'Product 1',
      linea: 'onix-black',
      material: 'Onix Black',
      descripcion: 'Test product 1',
      imagen: '/p1.jpg',
      acabados: ['Pulido', 'Mate'],
      formatos: ['60x120', '80x160'],
      calibre: '10',
      colorPrincipal: '#000000',
      fichaTecnica: '/ficha-p1.pdf'
    },
    {
      id: 'p2',
      nombre: 'Product 2',
      linea: 'onix-black',
      material: 'Onix Black',
      descripcion: 'Test product 2',
      imagen: '/p2.jpg',
      acabados: ['Pulido'],
      formatos: ['60x120'],
      calibre: '10',
      colorPrincipal: '#000000',
      fichaTecnica: '/ficha-p2.pdf'
    }
  ];

  beforeEach(async () => {
    const catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getProductLines', 'getProductsByLine']);
    const cartServiceSpy = jasmine.createSpyObj('CartService', ['add']);

    await TestBed.configureTestingModule({
      imports: [ProductosComponent],
      providers: [
        { provide: CatalogService, useValue: catalogServiceSpy },
        { provide: CartService, useValue: cartServiceSpy }
      ]
    }).compileComponents();

    catalogService = TestBed.inject(CatalogService) as jasmine.SpyObj<CatalogService>;
    cartService = TestBed.inject(CartService) as jasmine.SpyObj<CartService>;

    catalogService.getProductLines.and.returnValue(of(mockProductLines));
    catalogService.getProductsByLine.and.returnValue(of(mockProducts));

    fixture = TestBed.createComponent(ProductosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load product lines for calibre 10 on init', () => {
    expect(catalogService.getProductLines).toHaveBeenCalledWith('10');
    expect(component.materiales).toEqual(mockProductLines);
  });

  it('should auto-select first material on init', () => {
    expect(component.materialSeleccionado).toEqual(mockProductLines[0]);
    expect(catalogService.getProductsByLine).toHaveBeenCalledWith('onix-black');
  });

  it('should load products for selected material', () => {
    expect(component.productos).toEqual(mockProducts);
  });

  it('should change calibre and reload product lines', () => {
    catalogService.getProductLines.calls.reset();
    catalogService.getProductsByLine.calls.reset();

    component.cambiarCalibre('12');

    expect(component.calibreActivo).toBe('12');
    expect(catalogService.getProductLines).toHaveBeenCalledWith('12');
  });

  it('should not reload if same calibre is selected', () => {
    catalogService.getProductLines.calls.reset();
    
    component.cambiarCalibre('10');

    expect(catalogService.getProductLines).not.toHaveBeenCalled();
  });

  it('should select material and load its products', () => {
    const newMaterial = mockProductLines[1];
    catalogService.getProductsByLine.calls.reset();

    component.seleccionarMaterial(newMaterial);

    expect(component.materialSeleccionado).toEqual(newMaterial);
    expect(catalogService.getProductsByLine).toHaveBeenCalledWith('marble-white');
  });

  it('should add product to cart', () => {
    const product = mockProducts[0];

    component.agregarAlCarrito(product);

    expect(cartService.add).toHaveBeenCalledWith(product);
  });

  it('should handle empty product lines', () => {
    catalogService.getProductLines.and.returnValue(of([]));

    component['cargarLineas']('10');

    expect(component.productos).toEqual([]);
    expect(component.materialSeleccionado).toBeUndefined();
  });

  it('should display correct initial calibre', () => {
    expect(component.calibreActivo).toBe('10');
  });
});
