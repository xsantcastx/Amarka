import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminSidebarComponent } from './admin-sidebar.component';
import { AuthService } from '../../../services/auth.service';

@Component({ template: '' })
class DummyComponent {}

describe('AdminSidebarComponent', () => {
  let fixture: ComponentFixture<AdminSidebarComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AdminSidebarComponent,
        RouterTestingModule.withRoutes([
          { path: 'admin', component: DummyComponent },
          { path: 'admin/settings', component: DummyComponent }
        ])
      ],
      providers: [
        {
          provide: AuthService,
          useValue: { signOutUser: jasmine.createSpy('signOutUser') }
        }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(AdminSidebarComponent);
  });

  it('does not apply gradient classes on the active link', fakeAsync(() => {
    router.navigateByUrl('/admin/settings');
    tick();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const links = Array.from(root.querySelectorAll('a'));
    const settingsLink = links.find(link => (link.textContent || '').includes('Settings'));

    expect(settingsLink).toBeTruthy();
    if (!settingsLink) return;

    const classList = Array.from(settingsLink.classList);
    expect(classList).not.toContain('bg-gradient-to-r');
    expect(classList).not.toContain('from-ts-accent');
    expect(classList).not.toContain('to-ts-accent-soft');
    expect(classList).toContain('bg-primary');
  }));
});
