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

interface DailyEntry { hour: string; activity: string; }

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
    TextFieldModule,
  ],
  styleUrls: ['./employee-daily-report.component.scss'],
  template: `
  <div class="daily-report-container">
    <!-- Missing Reports Alert -->
    <section *ngIf="missingReportAlerts().length" class="mb-6 alert-banner">
      <mat-card class="border border-amber-300/60 bg-amber-50 text-amber-800">
        <mat-card-content class="flex items-start gap-3 text-sm">
          <mat-icon color="warn">campaign</mat-icon>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide">Daily report reminder</p>
            <p class="mt-1 text-xs">
              No submission logged for
              <span class="font-semibold">{{ missingReportAlerts().join(', ') }}</span>.
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </section>

    <!-- Main Card -->
  <mat-card class="main-card rounded-3xl bg-card/95 shadow-lg">
      <mat-card-header class="card-header-custom gap-3">
        <div mat-card-avatar class="avatar-icon flex size-10 items-center justify-center rounded-xl text-white">
          <mat-icon>schedule</mat-icon>
        </div>
        <div>
          <mat-card-title class="text-xl font-semibold">Daily report for {{ todayLabel }}</mat-card-title>
          <mat-card-subtitle>Capture each hour and send updates straight to your lead.</mat-card-subtitle>
        </div>
        <div class="header-actions ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span *ngIf="lastDailyReportSavedAt()">Saved {{ lastDailyReportSavedAt() | date: 'shortTime' }}</span>
          <button mat-stroked-button color="primary" type="button" (click)="resetForm()">
            <mat-icon class="mr-1">refresh</mat-icon>
            Reset
          </button>
          <button mat-stroked-button type="button" (click)="clearEntries()">
            <mat-icon class="mr-1">clear_all</mat-icon>
            Clear
          </button>
        </div>
      </mat-card-header>

      <mat-divider></mat-divider>

  <mat-card-content class="px-0 py-6">
        <!-- Error Message -->
        <div *ngIf="dailyReportError()" class="message-banner error mb-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <mat-icon class="text-red-600">error_outline</mat-icon>
          <span>{{ dailyReportError() }}</span>
        </div>
        
        <!-- Success Message -->
        <div *ngIf="dailyReportNotice()" class="message-banner success mb-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
          <mat-icon class="text-green-600">check_circle_outline</mat-icon>
          <span>{{ dailyReportNotice() }}</span>
        </div>

        <!-- Loading State -->
        <div *ngIf="dailyReportLoading()" class="loading-state rounded-2xl border border-dashed border-input bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
          <mat-icon class="mb-2">hourglass_empty</mat-icon>
          <p>Loading today's log...</p>
        </div>

        <ng-container *ngIf="!dailyReportLoading()">
          <!-- Entry Form -->
          <form
            class="entry-form grid gap-4 grid-cols-1 md:grid-cols-[minmax(0,180px)_1fr] lg:grid-cols-[minmax(0,200px)_1fr_auto]"
            [formGroup]="entryForm"
            (ngSubmit)="submitEntry()"
          >
            <div class="form-field-wrapper">
              <label class="text-xs font-medium text-muted-foreground mb-1 block">Hour</label>
              <select
                class="custom-select w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                formControlName="hour"
              >
                <option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</option>
              </select>
            </div>

            <div class="form-field-wrapper">
              <label class="text-xs font-medium text-muted-foreground mb-1 block">What did you work on?</label>
              <textarea
                class="notes-textarea-custom w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                formControlName="activity"
                rows="2"
                placeholder="Draft release notes, resolved customer escalations, paired with QA..."
              ></textarea>
              <span class="text-[11px] text-muted-foreground mt-1 block">Be specific about your accomplishments</span>
            </div>

            <div class="flex items-end justify-end md:col-span-2 lg:col-span-1">
              <button mat-flat-button color="primary" type="submit" class="w-full lg:w-auto" [disabled]="!entryForm.get('activity')?.value?.trim()">
                <mat-icon class="mr-1">{{ editingHour() ? 'edit' : 'add' }}</mat-icon>
                {{ editingHour() ? 'Update' : 'Add Entry' }}
              </button>
            </div>
          </form>

          <!-- Content Grid -->
          <div class="content-grid mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <!-- Entries Table Section -->
            <div>
              <div *ngIf="entries().length; else emptyEntries" class="entries-table-container overflow-hidden rounded-2xl border border-input bg-background/80">
                <table mat-table [dataSource]="entries()" class="w-full text-sm">
                <ng-container matColumnDef="hour">
                  <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Hour</th>
                  <td mat-cell *matCellDef="let entry" class="px-4 py-3 font-semibold text-foreground">{{ entry.hour }}</td>
                </ng-container>

                <ng-container matColumnDef="activity">
                  <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Summary</th>
                  <td mat-cell *matCellDef="let entry" class="px-4 py-3 text-muted-foreground">{{ entry.activity }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>
                  <td mat-cell *matCellDef="let entry" class="px-4 py-3 text-right">
                    <button mat-icon-button color="primary" type="button" (click)="editEntry(entry)" matTooltip="Edit entry">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" type="button" (click)="removeEntry(entry.hour)" matTooltip="Remove entry">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
              </div>
              <ng-template #emptyEntries>
                <div class="empty-state rounded-2xl border border-dashed border-input bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
                  <mat-icon>event_note</mat-icon>
                  <p class="font-medium">No entries yet</p>
                  <p class="mt-1 text-xs">Add what you accomplished this hour so your lead sees steady progress.</p>
                </div>
              </ng-template>
            </div>

            <!-- Sidebar Section -->
            <div class="sidebar-section space-y-4">
              <!-- Progress Card -->
              <mat-card class="stat-card border border-input bg-background/70">
                <mat-card-content>
                  <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-primary">assessment</mat-icon>
                      <span class="font-semibold text-foreground">Progress</span>
                    </div>
                    <span class="text-xs text-muted-foreground">{{ hoursLogged() }} / {{ timeSlots.length }}</span>
                  </div>
                  <mat-progress-bar class="mt-3 rounded-full" mode="determinate" [value]="completionPercent()" color="primary"></mat-progress-bar>
                  <p class="mt-2 text-xs text-muted-foreground">{{ completionPercent() }}% of day captured</p>
                  <mat-chip *ngIf="missingCount()" color="warn" selected class="mt-3">
                    <mat-icon matChipAvatar>priority_high</mat-icon>
                    {{ missingCount() }} previous day(s) missing
                  </mat-chip>
                </mat-card-content>
              </mat-card>

              <!-- Notes & Submit Card -->
              <mat-card class="notes-card border border-input bg-background/70">
                <mat-card-content>
                  <div class="flex items-center gap-2 mb-3">
                    <mat-icon class="text-primary">note_add</mat-icon>
                    <span class="font-semibold text-foreground">Submit Report</span>
                  </div>
                  <form class="space-y-3" [formGroup]="dailyMetaForm" (ngSubmit)="saveDailyReport()">
                    <div class="notes-textarea-wrapper">
                      <label class="text-xs font-medium text-muted-foreground mb-1 block">Notes for your lead</label>
                      <textarea
                        class="notes-textarea-custom w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        formControlName="notes"
                        rows="3"
                        placeholder="Highlights, blockers, or reminders..."
                      ></textarea>
                      <span class="text-[11px] text-muted-foreground mt-1 block">Optional context for your manager</span>
                    </div>

                    <mat-checkbox formControlName="complete">
                      <span class="font-medium">Mark day complete</span>
                    </mat-checkbox>
                    <p class="-mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Uncheck if you plan to add more context later today.
                    </p>

                    <button mat-flat-button color="primary" type="submit" class="w-full" [disabled]="dailyReportSaving() || !entries().length">
                      <mat-icon class="mr-1">{{ dailyReportSaving() ? 'hourglass_empty' : 'save' }}</mat-icon>
                      <ng-container *ngIf="dailyReportSaving(); else saveLabel">Saving...</ng-container>
                      <ng-template #saveLabel>Save Daily Report</ng-template>
                    </button>
                  </form>
                </mat-card-content>
              </mat-card>
            </div>
          </div>

          <mat-divider class="my-8"></mat-divider>

          <!-- Past Reports Section -->
          <section class="past-reports-section">
            <div class="section-header flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <mat-icon class="text-primary">history</mat-icon>
                <h2 class="text-lg font-semibold text-foreground">Past Daily Reports</h2>
              </div>
              <span class="text-xs text-muted-foreground">Sorted by most recent date</span>
            </div>

            <!-- Loading State -->
            <div *ngIf="pastReportsLoading()" class="loading-state mt-4 rounded-2xl border border-dashed border-input bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
              <mat-icon class="mb-2">hourglass_empty</mat-icon>
              <p>Loading recent reports...</p>
            </div>

            <!-- Error State -->
            <div *ngIf="pastReportsError()" class="message-banner error mt-4 rounded-xl px-4 py-3 text-sm flex items-start gap-2">
              <mat-icon class="text-red-600">error_outline</mat-icon>
              <span>{{ pastReportsError() }}</span>
            </div>

            <!-- Past Reports List -->
            <ng-container *ngIf="!pastReportsLoading() && !pastReportsError()">
              <ng-container *ngIf="pastReports().length; else noPastReports">
                <mat-accordion class="mt-4" multi>
                  <mat-expansion-panel *ngFor="let report of pastReports(); trackBy: trackReport">
                    <mat-expansion-panel-header>
                      <mat-panel-title class="flex items-center gap-2">
                        <mat-icon class="text-primary">event</mat-icon>
                        {{ formatDate(report.date) }}
                      </mat-panel-title>
                      <mat-panel-description class="flex items-center gap-2">
                        <mat-icon class="text-sm">schedule</mat-icon>
                        {{ report.entries.length }} hour{{ report.entries.length === 1 ? '' : 's' }} logged
                        <mat-icon *ngIf="report.complete" class="text-green-600 text-sm ml-2">check_circle</mat-icon>
                      </mat-panel-description>
                    </mat-expansion-panel-header>

                    <div class="panel-content space-y-4 py-2 text-sm text-muted-foreground">
                      <!-- Report Meta -->
                      <div class="report-meta flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="flex flex-wrap gap-3">
                          <span class="flex items-center gap-1">
                            <mat-icon class="text-sm">person</mat-icon>
                            <span class="font-medium text-foreground">{{ report.submittedBy || 'Unknown' }}</span>
                          </span>
                          <span class="flex items-center gap-1">
                            <mat-icon class="text-sm">{{ report.complete ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                            <span class="font-medium" [class.text-green-600]="report.complete" [class.text-orange-600]="!report.complete">
                              {{ report.complete ? 'Complete' : 'Incomplete' }}
                            </span>
                          </span>
                        </div>
                        <button mat-stroked-button color="primary" (click)="editPastReport(report)">
                          <mat-icon class="mr-1">edit</mat-icon>
                          Edit Report
                        </button>
                      </div>

                      <!-- Notes -->
                      <div *ngIf="report.notes" class="report-notes rounded-xl px-4 py-3 text-sm text-foreground">
                        <div class="flex items-start gap-2">
                          <mat-icon class="text-primary text-sm">notes</mat-icon>
                          <div>
                            <p class="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
                            <p>{{ report.notes }}</p>
                          </div>
                        </div>
                      </div>

                      <!-- Entries Table -->
                      <div class="entries-table-small overflow-hidden rounded-2xl border border-input bg-background/70">
                        <table class="w-full text-xs">
                          <thead>
                            <tr class="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                              <th class="px-4 py-2 text-left">
                                <div class="flex items-center gap-1">
                                  <mat-icon class="text-sm">schedule</mat-icon>
                                  Hour
                                </div>
                              </th>
                              <th class="px-4 py-2 text-left">
                                <div class="flex items-center gap-1">
                                  <mat-icon class="text-sm">description</mat-icon>
                                  Summary
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr *ngFor="let entry of report.entries" class="border-t border-border text-foreground">
                              <td class="px-4 py-2 font-semibold">{{ entry.hour }}</td>
                              <td class="px-4 py-2 text-muted-foreground">{{ entry.activity }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </mat-expansion-panel>
                </mat-accordion>
              </ng-container>
              <ng-template #noPastReports>
                <div class="empty-state mt-4 rounded-2xl border border-dashed border-input bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
                  <mat-icon>inbox</mat-icon>
                  <p class="font-medium">No past reports found</p>
                  <p class="mt-1 text-xs">Your submitted reports will appear here</p>
                </div>
              </ng-template>
            </ng-container>
          </section>
        </ng-container>
      </mat-card-content>
    </mat-card>
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

  readonly timeSlots: string[] = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'];
  readonly entries = signal<DailyEntry[]>([]);
  readonly editingHour = signal<string | null>(null);
  readonly dailyReportLoading = signal(false);
  readonly dailyReportSaving = signal(false);
  readonly dailyReportError = signal<string | null>(null);
  readonly dailyReportNotice = signal<string | null>(null);
  readonly lastDailyReportSavedAt = signal<Date | null>(null);
  readonly missingReportAlerts = signal<string[]>([]);
  readonly pastReports = signal<DailyReportRecord[]>([]);
  readonly pastReportsLoading = signal(false);
  readonly pastReportsError = signal<string | null>(null);

  readonly displayedColumns = ['hour', 'activity', 'actions'];

  readonly hoursLogged = computed(() => this.entries().length);
  readonly completionPercent = computed(() => {
    const total = this.timeSlots.length; if (!total) return 0; return Math.round((this.entries().length / total) * 100);
  });
  readonly missingCount = computed(() => this.missingReportAlerts().length);

  readonly entryForm = this.fb.nonNullable.group({ hour: this.timeSlots[0], activity: '' });
  readonly dailyMetaForm = this.fb.nonNullable.group({ notes: '', complete: true });

  constructor() {
    effect(
      () => {
        const id = this.employeeId();
        const source = this.employeeSource();
        const profile = this.profile();

        console.log('[EmployeeDailyReport] effect triggered', { id, source, profile });

        if (!id) {
          this.dailyReportError.set('No employee ID configured.');
          this.entries.set([]);
          this.pastReports.set([]);
          this.pastReportsLoading.set(false);
          return;
        }

        this.dailyReportError.set(null);
        console.log('[EmployeeDailyReport] loading data for', { id, source });
        this.loadDailyReport(id, source);
        this.refreshMissingDailyReportAlerts(id, source);
        this.loadPastReports(id, source);
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {}

  loadDailyReport(employeeId?: string, source?: 'employees' | 'trainingRecords'): void {
    const targetId = employeeId ?? this.employeeId();
    const targetSource = source ?? this.employeeSource();
    if (!targetId) { this.dailyReportError.set('No employee ID configured.'); return; }
    this.dailyReportLoading.set(true); this.dailyReportError.set(null);
    this.reportingService.getDailyReport(targetId, this.todayKey, targetSource).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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
    const payload: SaveDailyReportPayload = { date: this.todayKey, entries, submittedBy: this.profile()?.fullName ?? null, notes: meta.notes?.trim() ? meta.notes.trim() : null, complete: !!meta.complete };
    this.reportingService.saveDailyReport(this.employeeId(), payload, this.employeeSource()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
  next: () => { this.dailyReportSaving.set(false); this.dailyReportNotice.set('Daily report saved.'); this.lastDailyReportSavedAt.set(new Date()); this.refreshMissingDailyReportAlerts(); this.loadPastReports(); },
      error: () => { this.dailyReportSaving.set(false); this.dailyReportError.set('Failed to save daily report. Try again.'); },
    });
  }

  submitEntry(): void {
    const { hour, activity } = this.entryForm.getRawValue(); const trimmed = activity.trim(); if (!trimmed) return;
    const originalHour = this.editingHour(); const nextEntry: DailyEntry = { hour, activity: trimmed };
    this.entries.update((items) => { const filtered = items.filter((item) => item.hour !== nextEntry.hour && item.hour !== originalHour); return [...filtered, nextEntry].sort((a, b) => a.hour.localeCompare(b.hour)); });
    this.resetForm();
  }

  clearEntries(): void { this.entries.set([]); this.resetForm(); this.dailyMetaForm.setValue({ notes: '', complete: true }); }
  editEntry(entry: DailyEntry): void { this.editingHour.set(entry.hour); this.entryForm.setValue({ hour: entry.hour, activity: entry.activity }); }
  removeEntry(hour: string): void { this.entries.update((items) => items.filter((item) => item.hour !== hour)); if (this.editingHour() === hour) this.resetForm(); }
  resetForm(): void { this.editingHour.set(null); this.entryForm.setValue({ hour: this.timeSlots[0], activity: '' }); }

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
        <div class="entry-form-dialog grid gap-4 md:grid-cols-[minmax(0,200px)_1fr_auto]">
          <div class="form-field-wrapper">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Hour</label>
            <select
              class="custom-select w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              formControlName="hour"
            >
              <option *ngFor="let slot of data.timeSlots" [value]="slot">{{ slot }}</option>
            </select>
          </div>

          <div class="form-field-wrapper">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Activity</label>
            <textarea
              class="notes-textarea-custom w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              formControlName="activity"
              rows="2"
              placeholder="What did you work on?"
            ></textarea>
          </div>

          <div class="flex items-end">
            <button mat-flat-button color="primary" type="button" (click)="addOrUpdateEntry()" [disabled]="!editForm.get('activity')?.value?.trim()">
              <mat-icon class="mr-1">{{ editingHour ? 'edit' : 'add' }}</mat-icon>
              {{ editingHour ? 'Update' : 'Add' }}
            </button>
          </div>
        </div>

        <div class="overflow-hidden rounded-2xl border border-input bg-background/80">
          <table mat-table [dataSource]="entries" class="w-full text-sm" *ngIf="entries.length; else noEntries">
            <ng-container matColumnDef="hour">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-left text-xs font-semibold">Hour</th>
              <td mat-cell *matCellDef="let entry" class="px-4 py-3 font-semibold">{{ entry.hour }}</td>
            </ng-container>

            <ng-container matColumnDef="activity">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-left text-xs font-semibold">Summary</th>
              <td mat-cell *matCellDef="let entry" class="px-4 py-3 text-sm">{{ entry.activity }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="px-4 py-3 text-right text-xs font-semibold">Actions</th>
              <td mat-cell *matCellDef="let entry" class="px-4 py-3 text-right">
                <button mat-icon-button color="primary" (click)="editEntry(entry)">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="removeEntry(entry.hour)">
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

  entries: DailyEntry[] = [...this.data.report.entries];
  editingHour: string | null = null;
  displayedColumns = ['hour', 'activity', 'actions'];

  editForm = this.fb.nonNullable.group({
    hour: [this.data.timeSlots[0]],
    activity: [''],
    notes: [this.data.report.notes ?? ''],
    complete: [this.data.report.complete],
  });

  formatDate(dateKey: string): string {
    return formatDateLabel(dateKey);
  }

  addOrUpdateEntry(): void {
    const { hour, activity } = this.editForm.getRawValue();
    const trimmed = activity.trim();
    if (!trimmed) return;

    const originalHour = this.editingHour;
    const nextEntry: DailyEntry = { hour, activity: trimmed };

    this.entries = this.entries
      .filter((item) => item.hour !== nextEntry.hour && item.hour !== originalHour)
      .concat(nextEntry)
      .sort((a, b) => a.hour.localeCompare(b.hour));

    this.editingHour = null;
    this.editForm.patchValue({ hour: this.data.timeSlots[0], activity: '' });
  }

  editEntry(entry: DailyEntry): void {
    this.editingHour = entry.hour;
    this.editForm.patchValue({ hour: entry.hour, activity: entry.activity });
  }

  removeEntry(hour: string): void {
    this.entries = this.entries.filter((item) => item.hour !== hour);
    if (this.editingHour === hour) {
      this.editingHour = null;
      this.editForm.patchValue({ hour: this.data.timeSlots[0], activity: '' });
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
function sortEntries(entries: DailyReportEntry[]): DailyReportEntry[] { return [...entries].sort((a, b) => a.hour.localeCompare(b.hour)); }
