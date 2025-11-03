import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportingService, DailyReportEntry, DailyReportRecord, SaveDailyReportPayload } from '../services/reporting.service';
import { RoleService } from '../state/role.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

const PROJECT_PALETTE = ['#FFAD60', '#FF6B6B', '#4C6EF5', '#20C997', '#3BC9DB', '#845EF7'];

@Component({
  selector: 'app-employee-daily-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatChipsModule,
    MatProgressBarModule,
    MatCheckboxModule,
    MatDividerModule,
    MatExpansionModule,
    MatDialogModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TextFieldModule,
  ],
  styleUrls: ['./employee-daily-report.component.scss'],
  template: `
  <div class="daily-report-shell">
    <aside class="calendar-sidebar">
      <mat-card class="sidebar-card calendar-card">
        <mat-card-content>
          <div class="panel-header">
            <div>
              <p class="panel-title">Calendar</p>
              <p class="panel-subtitle">{{ selectedDateAsDate() | date: 'MMMM yyyy' }}</p>
            </div>
            <div class="view-toggle">
              <button type="button" [class.active]="viewMode() === 'day'" (click)="setViewMode('day')" disabled>Day</button>
              <button type="button" [class.active]="viewMode() === 'week'" (click)="setViewMode('week')">Week</button>
              <button type="button" [class.active]="viewMode() === 'month'" (click)="setViewMode('month')" disabled>Month</button>
            </div>
          </div>
          <mat-calendar
            class="month-calendar"
            [selected]="selectedDateAsDate()"
            [startAt]="selectedDateAsDate()"
            [maxDate]="todayDate"
            (selectedChange)="onCalendarSelected($event)"
          ></mat-calendar>
        </mat-card-content>
      </mat-card>

      <mat-card class="sidebar-card projects-card">
        <mat-card-content>
          <div class="panel-header">
            <p class="panel-title">Projects</p>
            <span class="panel-subtitle">{{ projects().length }} active</span>
          </div>
          <ul class="project-list">
            <li *ngFor="let project of projects()">
              <span class="project-dot" [style.background]="project.color"></span>
              <div class="project-info">
                <span class="project-code">{{ project.code }}</span>
                <span class="project-name">{{ project.label }}</span>
              </div>
              <span class="project-hours" *ngIf="project.hours">{{ project.hours | number:'1.0-1' }}h</span>
            </li>
          </ul>
          <button mat-stroked-button type="button" class="add-project-btn">
            <mat-icon>add</mat-icon>
            Add project
          </button>
        </mat-card-content>
      </mat-card>

      <mat-card class="sidebar-card reminders-card" *ngIf="missingReportAlerts().length">
        <mat-card-content>
          <div class="panel-header">
            <p class="panel-title">Reminders</p>
          </div>
          <div class="reminder-chip" *ngFor="let alert of missingReportAlerts()">
            <mat-icon>campaign</mat-icon>
            <span>{{ alert }}</span>
          </div>
        </mat-card-content>
      </mat-card>
    </aside>

    <section class="calendar-main">
      <header class="main-header">
        <div class="header-left">
          <button mat-stroked-button type="button" (click)="goToToday()">Today</button>
          <div class="week-nav">
            <button mat-icon-button type="button" (click)="shiftWeek(-1)">
              <mat-icon>chevron_left</mat-icon>
            </button>
            <div class="week-label">{{ weekRangeLabel() }}</div>
            <button mat-icon-button type="button" (click)="shiftWeek(1)">
              <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
          <span class="timezone-chip">
            <mat-icon>public</mat-icon>
            {{ timezoneLabel }}
          </span>
        </div>
        <div class="header-right">
          <div class="hours-summary">
            <span>Worked this week</span>
            <strong>{{ calendarWeekHours() | number:'1.0-1' }} h</strong>
          </div>
          <button mat-flat-button color="primary" type="button" (click)="saveDailyReport()" [disabled]="!entries().length || dailyReportSaving()">
            <mat-icon>send</mat-icon>
            Submit time
          </button>
        </div>
      </header>

      <div class="action-toolbar">
        <div class="status-group">
          <div class="status-banner success" *ngIf="dailyReportNotice()">
            <mat-icon>check_circle</mat-icon>
            <span>{{ dailyReportNotice() }}</span>
          </div>
          <div class="status-banner error" *ngIf="dailyReportError()">
            <mat-icon>error_outline</mat-icon>
            <span>{{ dailyReportError() }}</span>
          </div>
        </div>
        <div class="action-buttons">
          <button mat-stroked-button type="button" (click)="copyFromYesterday()">
            <mat-icon>content_copy</mat-icon>
            Copy yesterday
          </button>
          <button mat-stroked-button type="button" (click)="duplicateLastEntry()" [disabled]="!entries().length">
            <mat-icon>control_point_duplicate</mat-icon>
            Duplicate last
          </button>
          <button mat-stroked-button type="button" (click)="clearEntries()" [disabled]="!entries().length">
            <mat-icon>delete_sweep</mat-icon>
            Clear day
          </button>
        </div>
      </div>

      <section class="schedule-board" [class.loading]="dailyReportLoading()">
        <div class="loading-overlay" *ngIf="dailyReportLoading()">
          <mat-icon>hourglass_empty</mat-icon>
          <span>Loading {{ selectedDateLabel() }}...</span>
        </div>

        <div class="schedule-head">
          <div class="time-cell"></div>
          <div
            class="day-head"
            *ngFor="let day of weekDays()"
            [class.is-today]="day.isToday"
            [class.is-selected]="day.isSelected"
            (click)="selectDay(day.dateKey)"
          >
            <span class="weekday">{{ day.weekday }}</span>
            <span class="date">{{ day.dayNumber }}</span>
          </div>
        </div>

        <div class="schedule-body">
          <div class="time-axis">
            <div *ngFor="let label of calendarTimeLabels()" class="time-label">
              {{ label }}
            </div>
          </div>

          <div class="day-columns">
            <div
              class="day-column"
              *ngFor="let day of weekDays(); let dayIdx = index"
              [class.is-today]="day.isToday"
              [class.is-selected]="day.isSelected"
              (click)="selectDay(day.dateKey)"
            >
              <div class="day-grid">
                <ng-container *ngFor="let event of getEntriesForDay(day.dateKey); let eventIdx = index">
                  <div
                    class="event-card"
                    [ngClass]="getEventColorClass(dayIdx, eventIdx)"
                    [ngStyle]="getEventStyle(event)"
                    (click)="onEventClick($event, day.dateKey, event, eventIdx)"
                  >
                    <div class="event-time">{{ event.timeStart }} - {{ event.timeEnd }}</div>
                    <div class="event-title">{{ event.client || 'Internal' }}</div>
                    <div class="event-meta">{{ event.consultationPlace || 'Office' }}</div>
                    <p class="event-notes">{{ event.content }}</p>
                  </div>
                </ng-container>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="recent-reports" *ngIf="pastReports().length">
        <header>
          <h3>Recent reports</h3>
          <span>{{ pastReports().length }} days</span>
        </header>
        <div class="report-chips">
          <button
            type="button"
            class="report-chip"
            *ngFor="let report of pastReports(); trackBy: trackReport"
            (click)="editPastReport(report)"
          >
            <span class="date">{{ formatDate(report.date) }}</span>
            <span class="count">{{ report.entries.length }} entries</span>
          </button>
        </div>
      </section>

      <button mat-fab class="add-entry-fab" color="primary" type="button" (click)="toggleEntryDrawer()">
        <mat-icon>{{ showEntryDrawer() ? 'close' : 'add' }}</mat-icon>
      </button>

      <div class="entry-drawer" [class.open]="showEntryDrawer()">
        <div class="drawer-header">
          <div>
            <h3>{{ editingIndex() !== null ? 'Update entry' : 'New entry' }}</h3>
            <p>{{ selectedDateLabel() }}</p>
          </div>
          <button mat-icon-button type="button" (click)="closeEntryDrawer()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <form class="drawer-form" [formGroup]="entryForm" (ngSubmit)="submitEntry()">
          <div class="form-row">
            <mat-form-field appearance="fill">
              <mat-label>Start</mat-label>
              <mat-select formControlName="timeStart">
                <mat-option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>End</mat-label>
              <mat-select formControlName="timeEnd">
                <mat-option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field appearance="fill">
              <mat-label>Location</mat-label>
              <input matInput formControlName="consultationPlace" placeholder="Consultation place" />
            </mat-form-field>

            <mat-form-field appearance="fill">
              <mat-label>Client</mat-label>
              <input matInput formControlName="client" placeholder="Client or team" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="fill" class="notes-field">
            <mat-label>Summary</mat-label>
            <textarea matInput formControlName="content" rows="3" placeholder="What happened?"></textarea>
          </mat-form-field>

          <div class="drawer-actions">
            <button mat-button type="button" (click)="cancelEdit()" *ngIf="editingIndex() !== null">
              Cancel edit
            </button>
            <span class="spacer"></span>
            <button mat-flat-button color="primary" type="submit">
              <mat-icon>{{ editingIndex() !== null ? 'save' : 'add' }}</mat-icon>
              {{ editingIndex() !== null ? 'Save entry' : 'Add entry' }}
            </button>
          </div>
        </form>

        <div class="drawer-meta" [formGroup]="dailyMetaForm">
          <label>Notes for manager</label>
          <textarea formControlName="notes" rows="3" placeholder="Optional context"></textarea>
          <mat-checkbox formControlName="complete">Mark day as complete</mat-checkbox>
        </div>

        <div class="drawer-list" *ngIf="getEntriesForDay(selectedDate()).length">
          <h4>Today's entries</h4>
          <div
            class="drawer-entry"
            *ngFor="let entry of getEntriesForDay(selectedDate()); let idx = index"
          >
            <div class="entry-copy">
              <strong>{{ entry.timeStart }} - {{ entry.timeEnd }}</strong>
              <span>{{ entry.client || 'Internal' }}</span>
              <small>{{ entry.consultationPlace || 'Office' }}</small>
              <p>{{ entry.content }}</p>
            </div>
            <div class="drawer-entry-actions">
              <button mat-icon-button type="button" (click)="editEntry(entry, idx)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button type="button" (click)="removeEntry(idx)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
  `,
})
export class EmployeeDailyReportComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly reportingService = inject(ReportingService);
  private readonly roleService = inject(RoleService);
  private readonly dialog = inject(MatDialog);
  private readonly recentReportsLimit = 7;

  readonly profile = this.roleService.profile;
  readonly employeeId = computed(() => {
    const profile = this.profile();
    // Use employeeId from profile if available, otherwise fall back to uid
    const id = profile?.employeeId ?? profile?.uid ?? '';
    console.log('[EmployeeDailyReport] computed employeeId', { profile, id });
    return id;
  });
  readonly employeeSource = computed(() => {
    const profile = this.profile();
    // Use employeeSource from profile if available, otherwise default to 'employees'
    const source = profile?.employeeSource ?? 'employees';
    console.log('[EmployeeDailyReport] computed employeeSource', { profile, source });
    return source;
  });
  readonly todayKey = toDateKey(new Date());
  readonly todayLabel = formatDateLabel(this.todayKey);
  readonly selectedDate = signal<string>(toDateKey(new Date())); // Selected date for the report
  readonly selectedDateLabel = computed(() => formatDateLabel(this.selectedDate()));
  readonly todayDate = startOfDay(new Date());
  readonly timezoneLabel = 'GMT';
  readonly viewMode = signal<'day' | 'week' | 'month'>('week');
  readonly showEntryDrawer = signal(false);
  readonly selectedDateAsDate = computed(() => toDateFromKey(this.selectedDate()));
  readonly weekDays = computed(() => buildWeekDays(this.selectedDate(), this.todayKey));
  readonly weekRangeLabel = computed(() => {
    const days = this.weekDays();
    if (!days.length) {
      return '';
    }
    const first = days[0].date;
    const last = days[days.length - 1].date;
    return formatWeekRangeLabel(first, last);
  });

  readonly timeSlots: string[] = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00'];
  readonly calendarTimeLabels = computed(() => this.timeSlots.filter((_, index) => index % 2 === 0));
  readonly entries = signal<DailyReportEntry[]>([]);
  readonly editingIndex = signal<number | null>(null);
  readonly dailyReportLoading = signal(false);
  readonly dailyReportSaving = signal(false);
  readonly dailyReportError = signal<string | null>(null);
  readonly dailyReportNotice = signal<string | null>(null);
  readonly lastDailyReportSavedAt = signal<Date | null>(null);
  readonly missingReportAlerts = signal<string[]>([]);
  readonly pastReports = signal<DailyReportRecord[]>([]);
  readonly pastReportsLoading = signal(false);
  readonly pastReportsError = signal<string | null>(null);

  readonly displayedColumns = ['timeRange', 'consultationPlace', 'client', 'content', 'actions'];

  readonly hoursLogged = computed(() => this.entries().length);
  readonly completionPercent = computed(() => {
    const total = this.timeSlots.length; if (!total) return 0; return Math.round((this.entries().length / total) * 100);
  });
  readonly missingCount = computed(() => this.missingReportAlerts().length);
  readonly calendarWeekHours = computed(() =>
    this.weekDays().reduce((total, day) => {
      const items = this.getEntriesForDay(day.dateKey);
      return total + items.reduce((sum, entry) => sum + calculateEntryHours(entry), 0);
    }, 0)
  );
  readonly projects = computed(() => {
    const bucket = new Map<string, { hours: number }>();
    const accumulate = (items: DailyReportEntry[]) => {
      items.forEach((entry) => {
        const key = entry.client?.trim() || 'General';
        const record = bucket.get(key) ?? { hours: 0 };
        record.hours += calculateEntryHours(entry);
        bucket.set(key, record);
      });
    };

    accumulate(this.entries());
    this.pastReports().forEach((report) => accumulate(report.entries ?? []));

    const result = Array.from(bucket.entries()).map(([label, data], index) => ({
      label,
      code: buildProjectCode(label, index),
      color: PROJECT_PALETTE[index % PROJECT_PALETTE.length],
      hours: Number(data.hours.toFixed(1)),
    }));

    if (!result.length) {
      result.push({
        label: 'General',
        code: buildProjectCode('General', 0),
        color: PROJECT_PALETTE[0],
        hours: 0,
      });
    }

    return result;
  });

  readonly entryForm = this.fb.nonNullable.group({ 
    timeStart: this.timeSlots[0], 
    timeEnd: this.timeSlots[1],
    consultationPlace: '',
    client: '',
    content: ''
  });
  readonly dailyMetaForm = this.fb.nonNullable.group({ notes: '', complete: true });

  // Quick time presets for common time blocks
  readonly timePresets = [
    { label: '1 Hour', duration: 2 }, // 2 slots = 1 hour
    { label: '2 Hours', duration: 4 },
    { label: '3 Hours', duration: 6 },
    { label: '4 Hours', duration: 8 },
    { label: 'Half Day (4h)', duration: 8 },
    { label: 'Full Day (8h)', duration: 16 },
  ];

  // Activity templates for quick entry
  readonly activityTemplates = signal<Array<{name: string; consultationPlace: string; client: string; content: string}>>([
    { name: 'Meeting', consultationPlace: 'Conference Room', client: '', content: 'Team meeting and discussion' },
    { name: 'Client Call', consultationPlace: 'Office', client: '', content: 'Client consultation call' },
    { name: 'Development', consultationPlace: 'Office', client: '', content: 'Software development and coding' },
    { name: 'Training', consultationPlace: 'Training Room', client: '', content: 'Training session' },
    { name: 'Documentation', consultationPlace: 'Office', client: '', content: 'Documentation and reporting' },
  ]);

  readonly showTemplates = signal(false);
  readonly showQuickTime = signal(false);

  constructor() {
    effect(
      () => {
        const id = this.employeeId();
        const source = this.employeeSource();
        const profile = this.profile();
        const date = this.selectedDate(); // Track selected date changes

        console.log('[EmployeeDailyReport] effect triggered', { id, source, profile, date });

        if (!id) {
          this.dailyReportError.set('No employee ID configured.');
          this.entries.set([]);
          this.pastReports.set([]);
          this.pastReportsLoading.set(false);
          return;
        }

        this.dailyReportError.set(null);
        console.log('[EmployeeDailyReport] loading data for', { id, source, date });
        this.loadDailyReport(id, source);
        this.refreshMissingDailyReportAlerts(id, source);
        this.loadPastReports(id, source);
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {}

  setViewMode(mode: 'day' | 'week' | 'month'): void {
    this.viewMode.set(mode);
  }

  shiftWeek(direction: number): void {
    const current = this.selectedDateAsDate();
    const target = addDays(current, direction * 7);
    const clamped = target > this.todayDate ? this.todayDate : target;
    this.selectedDate.set(toDateKey(clamped));
    this.showEntryDrawer.set(false);
  }

  onCalendarSelected(date: Date | null): void {
    if (!date) {
      return;
    }
    const cleaned = startOfDay(date);
    const clamped = cleaned > this.todayDate ? this.todayDate : cleaned;
    this.selectedDate.set(toDateKey(clamped));
    this.showEntryDrawer.set(false);
  }

  selectDay(dateKey: string): void {
    if (this.selectedDate() !== dateKey) {
      this.selectedDate.set(dateKey);
      this.showEntryDrawer.set(false);
    }
  }

  toggleEntryDrawer(): void {
    const next = !this.showEntryDrawer();
    this.showEntryDrawer.set(next);
    if (next) {
      this.editingIndex.set(null);
      this.resetForm();
    }
  }

  closeEntryDrawer(): void {
    if (this.showEntryDrawer()) {
      this.showEntryDrawer.set(false);
      this.resetForm();
    }
  }

  getEntriesForDay(dateKey: string): DailyReportEntry[] {
    if (dateKey === this.selectedDate()) {
      return this.entries();
    }
    const report = this.pastReports().find((item) => item.date === dateKey);
    return report?.entries ?? [];
  }

  getEventStyle(entry: DailyReportEntry): Record<string, string> {
    const baseMinutes = timeToMinutes(this.timeSlots[0]);
    const startMinutes = Math.max(timeToMinutes(entry.timeStart ?? this.timeSlots[0]) - baseMinutes, 0);
    const endMinutes = Math.max(timeToMinutes(entry.timeEnd ?? entry.timeStart ?? this.timeSlots[0]) - baseMinutes, 0);
    const durationMinutes = Math.max(endMinutes - startMinutes, 30);
    const slotsFromStart = startMinutes / 30;
    const slotSpan = durationMinutes / 30;
    return {
      top: `calc(${slotsFromStart} * var(--slot-height))`,
      height: `calc(${slotSpan} * var(--slot-height))`,
    };
  }

  getEventColorClass(dayIndex: number, eventIndex: number): string {
    const variant = ((dayIndex + eventIndex) % 5) + 1;
    return `event-color-${variant}`;
  }

  onEventClick(event: MouseEvent, dateKey: string, entry: DailyReportEntry, index: number): void {
    event.stopPropagation();
    if (dateKey === this.selectedDate()) {
      this.editEntry(entry, index);
      this.showEntryDrawer.set(true);
      return;
    }
    const report = this.pastReports().find((item) => item.date === dateKey);
    if (report) {
      this.editPastReport(report);
    }
  }

  loadDailyReport(employeeId?: string, source?: 'employees' | 'trainingRecords'): void {
    const targetId = employeeId ?? this.employeeId();
    const targetSource = source ?? this.employeeSource();
    if (!targetId) { this.dailyReportError.set('No employee ID configured.'); return; }
    this.dailyReportLoading.set(true); this.dailyReportError.set(null);
    this.reportingService.getDailyReport(targetId, this.selectedDate(), targetSource).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (record) => {
        if (record) {
          const entries = sortEntries(record.entries ?? []); this.entries.set(entries);
          this.dailyMetaForm.setValue({ notes: record.notes ?? '', complete: record.complete ?? false });
          this.lastDailyReportSavedAt.set(record.updatedAt ?? record.createdAt ?? null);
        } else { this.entries.set([]); this.dailyMetaForm.setValue({ notes: '', complete: true }); this.lastDailyReportSavedAt.set(null); }
        this.dailyReportLoading.set(false);
      },
      error: () => { this.dailyReportLoading.set(false); this.dailyReportError.set("Couldn't load today's daily report."); },
    });
  }

  refreshMissingDailyReportAlerts(employeeId?: string, source?: 'employees' | 'trainingRecords'): void {
    const targetId = employeeId ?? this.employeeId();
    const targetSource = source ?? this.employeeSource();
    if (!targetId) { this.missingReportAlerts.set([]); return; }
    this.reportingService.getMissingDailyReportDates(targetId, 5, { source: targetSource }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (dates) => { const friendly = dates.map(formatDateLabel); this.missingReportAlerts.set(friendly); },
      error: () => {},
    });
  }

  loadPastReports(employeeId?: string, source?: 'employees' | 'trainingRecords'): void {
    const targetId = employeeId ?? this.employeeId();
    const targetSource = source ?? this.employeeSource();
    console.log('[EmployeeDailyReport] loadPastReports', { targetId, targetSource });
    if (!targetId) { this.pastReports.set([]); this.pastReportsLoading.set(false); return; }

    this.pastReportsLoading.set(true); this.pastReportsError.set(null);
    this.reportingService
      .getRecentDailyReports(targetId, { limit: this.recentReportsLimit, source: targetSource })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          console.log('[EmployeeDailyReport] received records', records);
          // Filter out today's report since it's shown in the main section
          // Comment out the filter temporarily to see all reports including today
          const sanitized = records
            // .filter((record) => record.date !== this.todayKey)  // Uncomment to hide today's report
            .map((record) => ({ ...record, entries: sortEntries(record.entries ?? []) }));
          console.log('[EmployeeDailyReport] sanitized records', sanitized);
          this.pastReports.set(sanitized);
          this.pastReportsLoading.set(false);
        },
        error: (err) => {
          console.error('[EmployeeDailyReport] error loading past reports', err);
          this.pastReportsLoading.set(false);
          this.pastReportsError.set('Unable to load past daily reports.');
        },
      });
  }

  saveDailyReport(): void {
    if (!this.employeeId()) { this.dailyReportError.set('No employee ID configured.'); return; }
    const entries = sortEntries(this.entries()); if (!entries.length) { this.dailyReportError.set('Add at least one hourly entry before saving.'); return; }
    const meta = this.dailyMetaForm.getRawValue();
    this.dailyReportSaving.set(true); this.dailyReportError.set(null); this.dailyReportNotice.set(null);
    const payload: SaveDailyReportPayload = { date: this.selectedDate(), entries, submittedBy: this.profile()?.fullName ?? null, notes: meta.notes?.trim() ? meta.notes.trim() : null, complete: !!meta.complete };
    this.reportingService.saveDailyReport(this.employeeId(), payload, this.employeeSource()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
  next: () => { this.dailyReportSaving.set(false); this.dailyReportNotice.set('Daily report saved.'); this.lastDailyReportSavedAt.set(new Date()); this.refreshMissingDailyReportAlerts(); this.loadPastReports(); },
      error: () => { this.dailyReportSaving.set(false); this.dailyReportError.set('Failed to save daily report. Try again.'); },
    });
  }

  submitEntry(): void {
    const { timeStart, timeEnd, consultationPlace, client, content } = this.entryForm.getRawValue(); 
    const trimmedContent = content.trim(); 
    if (!trimmedContent) return;
    
    const editingIdx = this.editingIndex(); 
    const nextEntry: DailyReportEntry = { 
      timeStart, 
      timeEnd,
      consultationPlace: consultationPlace.trim(), 
      client: client.trim(), 
      content: trimmedContent 
    };
    
    this.entries.update((items) => { 
      if (editingIdx !== null) {
        // Update existing entry
        const updated = [...items];
        updated[editingIdx] = nextEntry;
        return updated.sort((a, b) => a.timeStart.localeCompare(b.timeStart));
      } else {
        // Add new entry
        return [...items, nextEntry].sort((a, b) => a.timeStart.localeCompare(b.timeStart));
      }
    });
    this.resetFormWithAutoTime();
  }

  // Auto-fill next time slot based on last entry
  resetFormWithAutoTime(): void {
    const lastEntry = this.entries()[this.entries().length - 1];
    let nextStartIdx = 0;
    
    if (lastEntry) {
      const endIdx = this.timeSlots.indexOf(lastEntry.timeEnd);
      nextStartIdx = endIdx >= 0 && endIdx < this.timeSlots.length - 1 ? endIdx : 0;
    }
    
    const nextEndIdx = Math.min(nextStartIdx + 2, this.timeSlots.length - 1);
    
    this.editingIndex.set(null);
    this.entryForm.setValue({
      timeStart: this.timeSlots[nextStartIdx],
      timeEnd: this.timeSlots[nextEndIdx],
      consultationPlace: lastEntry?.consultationPlace || '',
      client: lastEntry?.client || '',
      content: ''
    });
  }

  // Apply quick time preset
  applyTimePreset(preset: { label: string; duration: number }): void {
    const currentStartIdx = this.timeSlots.indexOf(this.entryForm.value.timeStart || this.timeSlots[0]);
    const endIdx = Math.min(currentStartIdx + preset.duration, this.timeSlots.length - 1);
    
    this.entryForm.patchValue({
      timeEnd: this.timeSlots[endIdx]
    });
    this.showQuickTime.set(false);
  }

  // Apply activity template
  applyTemplate(template: {name: string; consultationPlace: string; client: string; content: string}): void {
    this.entryForm.patchValue({
      consultationPlace: template.consultationPlace,
      client: template.client,
      content: template.content
    });
    this.showTemplates.set(false);
  }

  // Copy entries from yesterday
  copyFromYesterday(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);
    
    this.reportingService
      .getDailyReport(this.employeeId(), yesterdayKey, this.employeeSource())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          if (record?.entries?.length) {
            const copiedEntries = record.entries.map(e => ({...e}));
            this.entries.set(sortEntries(copiedEntries));
            this.dailyReportNotice.set(`Copied ${copiedEntries.length} entries from yesterday`);
            setTimeout(() => this.dailyReportNotice.set(null), 3000);
          } else {
            this.dailyReportError.set('No entries found for yesterday');
            setTimeout(() => this.dailyReportError.set(null), 3000);
          }
        },
        error: () => {
          this.dailyReportError.set('Failed to load yesterday\'s entries');
          setTimeout(() => this.dailyReportError.set(null), 3000);
        }
      });
  }

  // Duplicate last entry
  duplicateLastEntry(): void {
    const entries = this.entries();
    if (entries.length === 0) return;
    
    const lastEntry = entries[entries.length - 1];
    const lastEndIdx = this.timeSlots.indexOf(lastEntry.timeEnd);
    const newStartIdx = lastEndIdx >= 0 && lastEndIdx < this.timeSlots.length - 1 ? lastEndIdx : 0;
    const newEndIdx = Math.min(newStartIdx + 2, this.timeSlots.length - 1);
    
    this.entryForm.setValue({
      timeStart: this.timeSlots[newStartIdx],
      timeEnd: this.timeSlots[newEndIdx],
      consultationPlace: lastEntry.consultationPlace,
      client: lastEntry.client,
      content: lastEntry.content
    });
    this.showEntryDrawer.set(true);
  }

  goToToday(): void {
    this.selectedDate.set(this.todayKey);
  }

  clearEntries(): void {
    this.entries.set([]);
    this.resetForm();
    this.dailyMetaForm.setValue({ notes: '', complete: true });
    this.showEntryDrawer.set(false);
  }
  editEntry(entry: DailyReportEntry, index: number): void { 
    this.editingIndex.set(index); 
    this.entryForm.setValue({ 
      timeStart: entry.timeStart, 
      timeEnd: entry.timeEnd,
      consultationPlace: entry.consultationPlace, 
      client: entry.client, 
      content: entry.content 
    }); 
    this.showEntryDrawer.set(true);
  }
  removeEntry(index: number): void { 
    this.entries.update((items) => items.filter((_, i) => i !== index)); 
    if (this.editingIndex() === index) this.resetForm(); 
  }
  resetForm(): void { 
    this.editingIndex.set(null); 
    this.entryForm.setValue({ 
      timeStart: this.timeSlots[0], 
      timeEnd: this.timeSlots[1],
      consultationPlace: '', 
      client: '', 
      content: '' 
    }); 
  }

  cancelEdit(): void {
    this.resetForm();
  }

  trackReport(_index: number, report: DailyReportRecord): string { return report.id; }
  formatDate(dateKey: string): string { return formatDateLabel(dateKey); }

  editPastReport(report: DailyReportRecord): void {
    const dialogRef = this.dialog.open(EditPastReportDialog, {
      width: '800px',
      maxWidth: '95vw',
      data: {
        report,
        timeSlots: this.timeSlots,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.savePastReport(result);
      }
    });
  }

  savePastReport(updatedReport: DailyReportRecord): void {
    const payload: SaveDailyReportPayload = {
      date: updatedReport.date,
      entries: sortEntries(updatedReport.entries),
      submittedBy: this.profile()?.fullName ?? null,
      notes: updatedReport.notes,
      complete: updatedReport.complete,
    };

    this.reportingService
      .saveDailyReport(this.employeeId(), payload, this.employeeSource())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.dailyReportNotice.set('Past report updated successfully.');
          this.loadPastReports();
          setTimeout(() => this.dailyReportNotice.set(null), 3000);
        },
        error: () => {
          this.dailyReportError.set('Failed to update past report.');
        },
      });
  }
}

// Dialog component for editing past reports
@Component({
  selector: 'edit-past-report-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTableModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule,
    TextFieldModule,
  ],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-primary">edit_calendar</mat-icon>
      Edit Report for {{ formatDate(data.report.date) }}
    </h2>
    <mat-dialog-content class="dialog-content max-h-[70vh]">
      <form [formGroup]="editForm" class="space-y-4">
        <div class="entry-form-dialog grid gap-3 md:grid-cols-[minmax(0,100px)_minmax(0,100px)_1fr_1fr_2fr_auto]">
          <div class="form-field-wrapper">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Time Start</label>
            <select
              class="custom-select w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              formControlName="timeStart"
            >
              <option *ngFor="let slot of data.timeSlots" [value]="slot">{{ slot }}</option>
            </select>
          </div>

          <div class="form-field-wrapper">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Time End</label>
            <select
              class="custom-select w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              formControlName="timeEnd"
            >
              <option *ngFor="let slot of data.timeSlots" [value]="slot">{{ slot }}</option>
            </select>
          </div>

          <div class="form-field-wrapper">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Consultation Place</label>
            <input
              type="text"
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              formControlName="consultationPlace"
              placeholder="Location..."
            />
          </div>

          <div class="form-field-wrapper">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Client</label>
            <input
              type="text"
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              formControlName="client"
              placeholder="Client name..."
            />
          </div>

          <div class="form-field-wrapper">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Content</label>
            <input
              type="text"
              class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              formControlName="content"
              placeholder="Work details..."
            />
          </div>

          <div class="flex items-end">
            <button mat-flat-button color="primary" type="button" (click)="addOrUpdateEntry()" [disabled]="!editForm.get('content')?.value?.trim()">
              <mat-icon class="mr-1">{{ editingIndex !== null ? 'edit' : 'add' }}</mat-icon>
              {{ editingIndex !== null ? 'Update' : 'Add' }}
            </button>
          </div>
        </div>

        <div class="overflow-hidden rounded-2xl border border-input bg-background/80">
          <table mat-table [dataSource]="entries" class="w-full text-sm" *ngIf="entries.length; else noEntries">
            <ng-container matColumnDef="timeRange">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-left text-xs font-semibold">Time Range</th>
              <td mat-cell *matCellDef="let entry" class="px-4 py-3 font-semibold">{{ entry.timeStart }} - {{ entry.timeEnd }}</td>
            </ng-container>

            <ng-container matColumnDef="consultationPlace">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-left text-xs font-semibold">Consultation Place</th>
              <td mat-cell *matCellDef="let entry" class="px-4 py-3 text-sm">{{ entry.consultationPlace }}</td>
            </ng-container>

            <ng-container matColumnDef="client">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-left text-xs font-semibold">Client</th>
              <td mat-cell *matCellDef="let entry" class="px-4 py-3 text-sm">{{ entry.client }}</td>
            </ng-container>

            <ng-container matColumnDef="content">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-left text-xs font-semibold">Content</th>
              <td mat-cell *matCellDef="let entry" class="px-4 py-3 text-sm">{{ entry.content }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-right text-xs font-semibold">Actions</th>
              <td mat-cell *matCellDef="let entry; let i = index" class="px-4 py-3 text-right">
                <button mat-icon-button color="primary" (click)="editEntry(entry, i)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="removeEntry(i)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <ng-template #noEntries>
            <div class="px-6 py-10 text-center text-sm text-muted-foreground">No entries yet.</div>
          </ng-template>
        </div>

        <div class="notes-textarea-wrapper">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
          <textarea
            class="notes-textarea-custom w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            formControlName="notes"
            rows="3"
            placeholder="Notes for your lead..."
          ></textarea>
          <span class="text-[11px] text-muted-foreground mt-1 block">Optional context for your manager</span>
        </div>

        <mat-checkbox formControlName="complete">
          <span class="font-medium">Mark as complete</span>
        </mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">
        <mat-icon class="mr-1">close</mat-icon>
        Cancel
      </button>
      <button mat-flat-button color="primary" (click)="save()" [disabled]="!entries.length">
        <mat-icon class="mr-1">save</mat-icon>
        Save Changes
      </button>
    </mat-dialog-actions>
  `,
})
export class EditPastReportDialog {
  readonly data = inject<{ report: DailyReportRecord; timeSlots: string[] }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<EditPastReportDialog>);
  private readonly fb = inject(FormBuilder);

  entries: DailyReportEntry[] = [...this.data.report.entries];
  editingIndex: number | null = null;
  displayedColumns = ['timeRange', 'consultationPlace', 'client', 'content', 'actions'];

  editForm = this.fb.nonNullable.group({
    timeStart: [this.data.timeSlots[0]],
    timeEnd: [this.data.timeSlots[1]],
    consultationPlace: [''],
    client: [''],
    content: [''],
    notes: [this.data.report.notes ?? ''],
    complete: [this.data.report.complete],
  });

  formatDate(dateKey: string): string {
    return formatDateLabel(dateKey);
  }

  addOrUpdateEntry(): void {
    const { timeStart, timeEnd, consultationPlace, client, content } = this.editForm.getRawValue();
    const trimmed = content.trim();
    if (!trimmed) return;

    const editingIdx = this.editingIndex;
    const nextEntry: DailyReportEntry = { 
      timeStart, 
      timeEnd,
      consultationPlace: consultationPlace.trim(), 
      client: client.trim(), 
      content: trimmed 
    };

    if (editingIdx !== null) {
      // Update existing entry
      this.entries[editingIdx] = nextEntry;
      this.entries = [...this.entries].sort((a, b) => a.timeStart.localeCompare(b.timeStart));
    } else {
      // Add new entry
      this.entries = [...this.entries, nextEntry].sort((a, b) => a.timeStart.localeCompare(b.timeStart));
    }

    this.editingIndex = null;
    this.editForm.patchValue({ timeStart: this.data.timeSlots[0], timeEnd: this.data.timeSlots[1], consultationPlace: '', client: '', content: '' });
  }

  editEntry(entry: DailyReportEntry, index: number): void {
    this.editingIndex = index;
    this.editForm.patchValue({ 
      timeStart: entry.timeStart, 
      timeEnd: entry.timeEnd,
      consultationPlace: entry.consultationPlace, 
      client: entry.client, 
      content: entry.content 
    });
  }

  removeEntry(index: number): void {
    this.entries = this.entries.filter((_, i) => i !== index);
    if (this.editingIndex === index) {
      this.editingIndex = null;
      this.editForm.patchValue({ timeStart: this.data.timeSlots[0], timeEnd: this.data.timeSlots[1], consultationPlace: '', client: '', content: '' });
    }
  }

  save(): void {
    const { notes, complete } = this.editForm.getRawValue();
    this.dialogRef.close({
      ...this.data.report,
      entries: this.entries,
      notes: notes?.trim() || null,
      complete,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

function toDateKey(date: Date): string { return date.toISOString().slice(0, 10); }
function formatDateLabel(dateKey: string): string { const parsed = new Date(`${dateKey}T00:00:00Z`); if (Number.isNaN(parsed.getTime())) return dateKey; return parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
function sortEntries(entries: DailyReportEntry[]): DailyReportEntry[] { return [...entries].sort((a, b) => a.timeStart.localeCompare(b.timeStart)); }
function toDateFromKey(dateKey: string): Date { const parsed = new Date(`${dateKey}T00:00:00`); return Number.isNaN(parsed.getTime()) ? new Date() : parsed; }
function startOfDay(date: Date): Date { const value = new Date(date); value.setHours(0, 0, 0, 0); return value; }
function startOfWeekFromDate(date: Date): Date { const value = startOfDay(date); const day = value.getDay(); const diff = (day + 6) % 7; value.setDate(value.getDate() - diff); return value; }
function addDays(date: Date, days: number): Date { const value = new Date(date); value.setDate(value.getDate() + days); return value; }
function formatWeekRangeLabel(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  if (sameMonth && sameYear) {
    const month = start.toLocaleDateString(undefined, { month: 'long' });
    return `${month} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
  }
  const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}
function timeToMinutes(value: string | undefined): number {
  if (!value) return 0;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}
function calculateEntryHours(entry: DailyReportEntry): number {
  const start = timeToMinutes(entry.timeStart);
  const end = timeToMinutes(entry.timeEnd);
  const duration = Math.max(end - start, 30);
  return duration / 60;
}
function buildProjectCode(label: string, index: number): string {
  const cleaned = label.trim();
  if (!cleaned) {
    return `PR${(index + 1).toString().padStart(3, '0')}`;
  }
  const normalized = cleaned.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!normalized) {
    return `PR${(index + 1).toString().padStart(3, '0')}`;
  }
  const hash = normalized.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + index * 37;
  const number = (hash % 900) + 100;
  return `PR${number}`;
}
function buildWeekDays(selectedDateKey: string, todayKey: string) {
  const selectedDate = toDateFromKey(selectedDateKey);
  const start = startOfWeekFromDate(selectedDate);
  return Array.from({ length: 7 }, (_, index) => {
    const current = addDays(start, index);
    const dateKey = toDateKey(current);
    return {
      date: current,
      dateKey,
      weekday: current.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNumber: current.getDate(),
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDateKey,
    };
  });
}

