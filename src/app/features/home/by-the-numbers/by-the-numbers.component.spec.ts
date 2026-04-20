import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ByTheNumbersComponent } from './by-the-numbers.component';

describe('ByTheNumbersComponent (AMK-44)', () => {
  let component: ByTheNumbersComponent;
  let fixture: ComponentFixture<ByTheNumbersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ByTheNumbersComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ByTheNumbersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose exactly 4 metrics', () => {
    expect(component.metrics.length).toBe(4);
  });

  it('should render the four required values', () => {
    const host: HTMLElement = fixture.nativeElement;
    const valueEls = Array.from(host.querySelectorAll('.numbers__value'));
    const values = valueEls.map((el) => el.textContent?.trim() ?? '');

    expect(values).toContain('6');
    expect(values).toContain('5\u201310');
    expect(values).toContain('72h');
    expect(values).toContain('100%');
  });

  it('should label the section for assistive tech', () => {
    const host: HTMLElement = fixture.nativeElement;
    const section = host.querySelector('section.numbers');
    expect(section).toBeTruthy();
    expect(section?.getAttribute('aria-label')).toBe('By the numbers');
  });

  it('should mark the metric grid as a list with listitems', () => {
    const host: HTMLElement = fixture.nativeElement;
    const grid = host.querySelector('.numbers__grid');
    expect(grid?.getAttribute('role')).toBe('list');
    const items = host.querySelectorAll('.numbers__metric[role="listitem"]');
    expect(items.length).toBe(4);
  });

  it('should reference Stamford, CT and never NYC / New York', () => {
    const host: HTMLElement = fixture.nativeElement;
    const text = host.textContent ?? '';
    expect(text).toContain('Stamford, CT');
    expect(text).not.toMatch(/NYC|New York/i);
  });

  it('should render top and bottom decorative gold rules', () => {
    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('.numbers__rule--top')).toBeTruthy();
    expect(host.querySelector('.numbers__rule--bottom')).toBeTruthy();
  });
});
