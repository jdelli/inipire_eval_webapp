import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportingService, DailyReportEntry, SaveDailyReportPayload } from '../services/reporting.service';
import { RoleService } from '../state/role.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';

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
  ],
  template: `
  <section *ngIf="missingReportAlerts().length" class="mb-6">
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

  <mat-card class="rounded-3xl bg-card/95 shadow-lg">
    <mat-card-header class="gap-3">
      <div mat-card-avatar class="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <mat-icon>schedule</mat-icon>
      </div>
      <div>
        <mat-card-title class="text-xl font-semibold">Daily report for {{ todayLabel }}</mat-card-title>
        <mat-card-subtitle>Capture each hour and send updates straight to your lead.</mat-card-subtitle>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span *ngIf="lastDailyReportSavedAt()">Saved {{ lastDailyReportSavedAt() | date: 'shortTime' }}</span>
        <button mat-stroked-button color="primary" type="button" (click)="resetForm()">Reset hour form</button>
        <button mat-stroked-button type="button" (click)="clearEntries()">Clear entries</button>
      </div>
    </mat-card-header>

    <mat-divider></mat-divider>

    <mat-card-content class="px-6 py-6">
      <div *ngIf="dailyReportError()" class="mb-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{{ dailyReportError() }}</div>
      <div *ngIf="dailyReportNotice()" class="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{{ dailyReportNotice() }}</div>

      <div *ngIf="dailyReportLoading()" class="rounded-2xl border border-dashed border-input bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">Loading today's log...</div>

      <ng-container *ngIf="!dailyReportLoading()">
        <form
          class="grid gap-4 md:grid-cols-[minmax(0,200px)_1fr_auto]"
          [formGroup]="entryForm"
          (ngSubmit)="submitEntry()"
        >
          <mat-form-field appearance="outline">
            <mat-label>Hour</mat-label>
            <mat-select formControlName="hour">
              <mat-option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>What did you work on?</mat-label>
            <textarea
              matInput
              formControlName="activity"
              rows="2"
              placeholder="Draft release notes, resolved customer escalations, paired with QA..."
            ></textarea>
          </mat-form-field>

          <div class="flex items-end justify-end">
            <button mat-flat-button color="primary" type="submit">
              {{ editingHour() ? 'Update hour' : 'Add hour' }}
            </button>
          </div>
        </form>

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <div>
            <div *ngIf="entries().length; else emptyEntries" class="overflow-hidden rounded-2xl border border-input bg-background/80">
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
                    <button mat-stroked-button color="primary" type="button" class="mr-2 text-xs" (click)="editEntry(entry)">Edit</button>
                    <button mat-stroked-button color="warn" type="button" class="text-xs" (click)="removeEntry(entry.hour)">Remove</button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
            <ng-template #emptyEntries>
              <div class="rounded-2xl border border-dashed border-input bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">
                No entries yet. Add what you accomplished this hour so your lead sees steady progress.
              </div>
            </ng-template>
          </div>

          <div class="space-y-4">
            <mat-card class="border border-input bg-background/70">
              <mat-card-content>
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span class="font-semibold text-foreground">Hours logged</span>
                  <span>{{ hoursLogged() }} / {{ timeSlots.length }}</span>
                </div>
                <mat-progress-bar class="mt-3 rounded-full" mode="determinate" [value]="completionPercent()"></mat-progress-bar>
                <p class="mt-2 text-xs text-muted-foreground">{{ completionPercent() }}% of day captured</p>
                <mat-chip *ngIf="missingCount()" color="warn" selected class="mt-3">
                  <mat-icon matChipAvatar>priority_high</mat-icon>
                  {{ missingCount() }} previous day(s) missing
                </mat-chip>
              </mat-card-content>
            </mat-card>

            <mat-card class="border border-input bg-background/70">
              <mat-card-content>
                <form class="space-y-3" [formGroup]="dailyMetaForm" (ngSubmit)="saveDailyReport()">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>Notes for your lead</mat-label>
                    <textarea matInput formControlName="notes" rows="3" placeholder="Highlights, blockers, or reminders..."></textarea>
                  </mat-form-field>

                  <mat-checkbox formControlName="complete">
                    Mark day complete
                  </mat-checkbox>
                  <p class="-mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Uncheck if you plan to add more context later today.
                  </p>

                  <button mat-flat-button color="primary" type="submit" class="w-full" [disabled]="dailyReportSaving()">
                    <ng-container *ngIf="dailyReportSaving(); else saveLabel">Saving...</ng-container>
                    <ng-template #saveLabel>Save daily report</ng-template>
                  </button>
                </form>
              </mat-card-content>
            </mat-card>
          </div>
        </div>
      </ng-container>
    </mat-card-content>
  </mat-card>
  `,
})
export class EmployeeDailyReportComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly reportingService = inject(ReportingService);
  private readonly roleService = inject(RoleService);

  readonly profile = this.roleService.profile;
  readonly employeeId = computed(() => this.profile()?.uid ?? '');
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

  readonly displayedColumns = ['hour', 'activity', 'actions'];

  readonly hoursLogged = computed(() => this.entries().length);
  readonly completionPercent = computed(() => {
    const total = this.timeSlots.length; if (!total) return 0; return Math.round((this.entries().length / total) * 100);
  });
  readonly missingCount = computed(() => this.missingReportAlerts().length);

  readonly entryForm = this.fb.nonNullable.group({ hour: this.timeSlots[0], activity: '' });
  readonly dailyMetaForm = this.fb.nonNullable.group({ notes: '', complete: true });

  ngOnInit(): void {
    if (this.employeeId()) { this.loadDailyReport(); this.refreshMissingDailyReportAlerts(); }
    else { this.dailyReportError.set('No employee ID configured.'); }
  }

  loadDailyReport(): void {
    if (!this.employeeId()) { this.dailyReportError.set('No employee ID configured.'); return; }
    this.dailyReportLoading.set(true); this.dailyReportError.set(null);
    this.reportingService.getDailyReport(this.employeeId(), this.todayKey).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
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

  refreshMissingDailyReportAlerts(): void {
    if (!this.employeeId()) { this.missingReportAlerts.set([]); return; }
    this.reportingService.getMissingDailyReportDates(this.employeeId(), 5).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (dates) => { const friendly = dates.map(formatDateLabel); this.missingReportAlerts.set(friendly); },
      error: () => {},
    });
  }

  saveDailyReport(): void {
    if (!this.employeeId()) { this.dailyReportError.set('No employee ID configured.'); return; }
    const entries = sortEntries(this.entries()); if (!entries.length) { this.dailyReportError.set('Add at least one hourly entry before saving.'); return; }
    const meta = this.dailyMetaForm.getRawValue();
    this.dailyReportSaving.set(true); this.dailyReportError.set(null); this.dailyReportNotice.set(null);
    const payload: SaveDailyReportPayload = { date: this.todayKey, entries, submittedBy: this.profile()?.fullName ?? null, notes: meta.notes?.trim() ? meta.notes.trim() : null, complete: !!meta.complete };
    this.reportingService.saveDailyReport(this.employeeId(), payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.dailyReportSaving.set(false); this.dailyReportNotice.set('Daily report saved.'); this.lastDailyReportSavedAt.set(new Date()); this.refreshMissingDailyReportAlerts(); },
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
}

function toDateKey(date: Date): string { return date.toISOString().slice(0, 10); }
function formatDateLabel(dateKey: string): string { const parsed = new Date(`${dateKey}T00:00:00Z`); if (Number.isNaN(parsed.getTime())) return dateKey; return parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
function sortEntries(entries: DailyReportEntry[]): DailyReportEntry[] { return [...entries].sort((a, b) => a.hour.localeCompare(b.hour)); }
