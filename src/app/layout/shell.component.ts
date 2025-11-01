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
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { animate, style, transition, trigger } from '@angular/animations';

interface NavItem {
  label: string;
  route: string;
  icon: 'home' | 'grid' | 'calendar' | 'star' | 'users';
  description: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatRippleModule,
    MatTooltipModule,
    MatBadgeModule,
    MatDividerModule,
    MatMenuModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
  ],
  templateUrl: './shell.component.html',
  styles: ``,
  animations: [
    trigger('navReveal', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('180ms ease-out', style({ opacity: 1, transform: 'none' })),
      ]),
    ]),
  ],
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly roleService = inject(RoleService);
  private readonly authService = inject(AuthService);

  readonly profile = this.roleService.profile;
  readonly loggingOut = signal(false);
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

  private readonly iconMap: Record<NavItem['icon'], string> = {
    home: 'home',
    grid: 'dashboard',
    calendar: 'event',
    star: 'grade',
    users: 'group',
  };

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

  navIcon(icon: NavItem['icon']): string {
    return this.iconMap[icon] ?? 'dashboard';
  }

  private setActiveNav(url: string): void {
    const match =
      this.navItems.find((item) => url.startsWith(item.route)) ?? this.navItems[0];
    this.activeNav.set(match);
  }
}
