import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { employeeSnapshot } from '../data/mock-data';

interface NavItem {
  label: string;
  route: string;
  icon: 'grid' | 'calendar' | 'star' | 'shield';
}

interface DailyEntry {
  hour: string;
  activity: string;
}

@Component({
  selector: 'app-employee-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule],
  templateUrl: './employee-shell.component.html',
  styles: ``,
})
export class EmployeeShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly snapshot = employeeSnapshot;
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'grid' },
    { label: 'Weekly', route: '/weekly-evaluation', icon: 'calendar' },
    { label: 'Ratings', route: '/ratings', icon: 'star' },
    { label: 'Incidents', route: '/incident-reports', icon: 'shield' },
  ];

  readonly activeNav = signal<NavItem>(this.navItems[0]);
  readonly timeSlots: string[] = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
  ];
  readonly entries = signal<DailyEntry[]>([]);
  readonly editingHour = signal<string | null>(null);
  readonly entryForm = this.fb.nonNullable.group({
    hour: this.timeSlots[0],
    activity: '',
  });

  readonly tagline = computed(() => {
    switch (this.activeNav().route) {
      case '/weekly-evaluation':
        return 'Your weekly check-ins and next steps.';
      case '/ratings':
        return 'Your growth areas and strengths at a glance.';
      case '/incident-reports':
        return 'Stay aware of incidents that affect your work.';
      default:
        return 'Welcome back—here’s what matters today.';
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

  submitEntry(): void {
    const { hour, activity } = this.entryForm.getRawValue();
    const trimmed = activity.trim();

    if (!trimmed) {
      return;
    }

    const originalHour = this.editingHour();
    const nextEntry: DailyEntry = { hour, activity: trimmed };

    this.entries.update((items) => {
      // Ensure one entry per hour and keep them sorted chronologically.
      const filtered = items.filter(
        (item) => item.hour !== nextEntry.hour && item.hour !== originalHour
      );
      return [...filtered, nextEntry].sort((a, b) => a.hour.localeCompare(b.hour));
    });

    this.resetForm();
  }

  editEntry(entry: DailyEntry): void {
    this.editingHour.set(entry.hour);
    this.entryForm.setValue({ hour: entry.hour, activity: entry.activity });
  }

  removeEntry(hour: string): void {
    this.entries.update((items) => items.filter((item) => item.hour !== hour));
    if (this.editingHour() === hour) {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.editingHour.set(null);
    this.entryForm.setValue({ hour: this.timeSlots[0], activity: '' });
  }

  private setActiveNav(url: string): void {
    const match = this.navItems.find((item) => url.startsWith(item.route)) ?? this.navItems[0];
    this.activeNav.set(match);
  }
}
