import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { RoleService } from '../state/role.service';
import { AuthService } from '../services/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: 'home' | 'grid' | 'calendar' | 'star' | 'users';
  description: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styles: ``,
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  private readonly authService = inject(AuthService);

  readonly profile = this.roleService.profile;
  readonly loggingOut = signal(false);
  // Collapsible sidebar state (desktop only)
  readonly sidebarCollapsed = signal<boolean>(false);
  readonly navItems: NavItem[] = [
    {
      label: 'Home',
      route: '/home',
      icon: 'home',
      description: 'Department announcements and tasks in one feed.',
    },
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'grid',
      description: 'Executive pulse on priorities and sentiment.',
    },
    {
      label: 'Weekly Evaluation',
      route: '/weekly-evaluation',
      icon: 'calendar',
      description: 'Momentum tracker and commitments week over week.',
    },
    {
      label: 'Ratings',
      route: '/ratings',
      icon: 'star',
      description: 'Competency snapshot with benchmark comparison.',
    },
    {
      label: 'Personnel',
      route: '/personnel',
      icon: 'users',
      description: 'Team directory organized by department.',
    },
  ];

  readonly activeNav = signal<NavItem>(this.navItems[0]);
  readonly mobileNavOpen = signal(false);

  readonly tagline = computed(() => {
    switch (this.activeNav().route) {
      case '/weekly-evaluation':
        return 'Maintain the weekly rhythm; highlight where momentum accelerates or stalls.';
      case '/ratings':
        return 'Compare leadership impact across dimensions and spot stretch opportunities.';
      case '/personnel':
        return 'View all employees and trainees organized by department.';
      case '/home':
        return 'Share wins, tasks, and blockers so the department stays aligned.';
      default:
        return 'Stay ahead of strategic priorities, team health, and executive signals.';
    }
  });

  constructor() {
    // Restore persisted sidebar state
    try {
      const saved = localStorage.getItem('sidebarCollapsed');
      if (saved != null) {
        this.sidebarCollapsed.set(saved === '1' || saved === 'true');
      }
    } catch {
      // ignore
    }

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => this.setActiveNav(event.urlAfterRedirects));

    this.setActiveNav(this.router.url);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((value) => !value);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  toggleSidebar(): void {
    console.log('toggleSidebar called, current state:', this.sidebarCollapsed());
    this.sidebarCollapsed.update((v) => {
      const next = !v;
      console.log('Toggling from', v, 'to', next);
      try {
        localStorage.setItem('sidebarCollapsed', next ? '1' : '0');
      } catch {
        // ignore write errors (private mode, etc.)
      }
      return next;
    });
    console.log('New state:', this.sidebarCollapsed());
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.loggingOut.set(true);
    this.authService.logout().subscribe({
      next: () => {
        this.loggingOut.set(false);
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('[ShellComponent] logout error', err);
        this.loggingOut.set(false);
        // Navigate to login anyway
        this.router.navigate(['/login']);
      },
    });
  }

  trackByRoute(_: number, item: NavItem): string {
    return item.route;
  }

  private setActiveNav(url: string): void {
    const match =
      this.navItems.find((item) => url.startsWith(item.route)) ?? this.navItems[0];
    this.activeNav.set(match);
  }
}
