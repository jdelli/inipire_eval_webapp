import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import {
  DailyReportEntry,
  ReportingService,
} from '../services/reporting.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';

interface EmployeeNavItem {
  label: string;
  route: string;
  icon: 'home' | 'schedule' | 'report';
  description: string;
}

@Component({
  selector: 'app-employee-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule,
    MatTabsModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatCardModule,
    MatDividerModule,
  ],
  templateUrl: './employee-shell.component.html',
  styleUrls: ['./employee-shell.component.scss'],
})
export class EmployeeShellComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly reportingService = inject(ReportingService);
  private readonly roleService = inject(RoleService);
  private readonly authService = inject(AuthService);

  readonly profile = this.roleService.profile;
  readonly loggingOut = signal(false);
  readonly employeeId = computed(() => {
    const profile = this.profile();
    // Use employeeId from profile if available, otherwise fall back to uid
    return profile?.employeeId ?? profile?.uid ?? '';
  });
  readonly employeeSource = computed(() => {
    const profile = this.profile();
    // Use employeeSource from profile if available, otherwise default to 'employees'
    return profile?.employeeSource ?? 'employees';
  });
  readonly todayKey = toDateKey(new Date());
  readonly todayLabel = formatDateLabel(this.todayKey);
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
  readonly navItems: EmployeeNavItem[] = [
    {
      label: 'Home',
      route: '/home',
      icon: 'home',
      description: 'Team updates, quick wins, and leadership broadcasts.',
    },
    {
      label: 'Daily report',
      route: '/daily-report',
      icon: 'schedule',
      description: 'Capture hourly progress and signal blockers fast.',
    },
    {
      label: 'Incident report',
      route: '/incident-report',
      icon: 'report',
      description: 'File structured incidents with impact and follow-up actions.',
    },
  ];

  private readonly iconMap: Record<EmployeeNavItem['icon'], string> = {
    home: 'dynamic_feed',
    schedule: 'schedule',
    report: 'report_problem',
  };

  readonly activeNav = signal<EmployeeNavItem>(this.navItems[0]);
  readonly dailyReportLoading = signal(false);
  readonly dailyError = signal<string | null>(null);
  readonly entries = signal<DailyReportEntry[]>([]);
  readonly lastDailyReportSavedAt = signal<Date | null>(null);
  readonly missingReportAlerts = signal<string[]>([]);

  readonly avatarInitial = computed(
    () => this.profile()?.fullName?.charAt(0)?.toUpperCase() ?? '?'
  );
  readonly hoursLogged = computed(() => this.entries().length);
  readonly completionPercent = computed(() => {
    const total = this.timeSlots.length;
    if (!total) {
      return 0;
    }
    return Math.round((this.entries().length / total) * 100);
  });
  readonly missingCount = computed(() => this.missingReportAlerts().length);

  readonly tagline = computed(() => {
    switch (this.activeNav().route) {
      case '/daily-report':
        return 'Record each hour, celebrate momentum, and surface blockers in real time.';
      case '/incident-report':
        return 'Escalate issues with clear impact and owners so your lead can respond quickly.';
      case '/home':
      default:
        return 'Stay in sync with department announcements and next actions from leadership.';
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

  ngOnInit(): void {
    if (this.employeeId()) {
      this.loadDailySummary();
      this.refreshMissingDailyReportAlerts();
    } else {
      this.dailyError.set('No employee profile detected.');
    }
  }

  navIcon(icon: EmployeeNavItem['icon']): string {
    return this.iconMap[icon] ?? 'dashboard';
  }

  trackByRoute(_: number, item: EmployeeNavItem): string {
    return item.route;
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
        console.error('[EmployeeShellComponent] logout error', err);
        this.loggingOut.set(false);
        this.router.navigate(['/login']);
      },
    });
  }

  private loadDailySummary(): void {
    if (!this.employeeId()) {
      this.dailyError.set('No employee profile detected.');
      return;
    }

    this.dailyReportLoading.set(true);
    this.dailyError.set(null);

    this.reportingService
      .getDailyReport(this.employeeId(), this.todayKey, this.employeeSource())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          const entries = sortEntries(record?.entries ?? []);
          this.entries.set(entries);
          this.lastDailyReportSavedAt.set(
            record?.updatedAt ?? record?.createdAt ?? null
          );
          this.dailyReportLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading employee daily summary', error);
          this.dailyReportLoading.set(false);
          this.dailyError.set("Couldn't load today's daily summary.");
        },
      });
  }

  private refreshMissingDailyReportAlerts(): void {
    if (!this.employeeId()) {
      this.missingReportAlerts.set([]);
      return;
    }

    this.reportingService
      .getMissingDailyReportDates(this.employeeId(), 5, { source: this.employeeSource() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dates) => {
          const friendly = dates.map(formatDateLabel);
          this.missingReportAlerts.set(friendly);
        },
        error: (error) => {
          console.error('Error loading missing reports summary', error);
        },
      });
  }

  private setActiveNav(url: string): void {
    const match =
      this.navItems.find((item) => url.startsWith(item.route)) ??
      this.navItems[0];
    this.activeNav.set(match);
  }
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(dateKey: string): string {
  const parsed = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return dateKey;
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function sortEntries(entries: DailyReportEntry[]): DailyReportEntry[] {
  return [...entries].sort((a, b) => a.timeStart.localeCompare(b.timeStart));
}
