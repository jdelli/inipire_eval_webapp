import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportingService, DailyReportEntry, SaveDailyReportPayload } from '../services/reporting.service';
import { RoleService } from '../state/role.service';

interface DailyEntry { hour: string; activity: string; }

@Component({
  selector: 'app-employee-daily-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <section
    *ngIf="missingReportAlerts().length"
    class="mb-8 rounded-3xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-700 shadow-sm"
  >
    <p class="text-xs font-semibold uppercase tracking-wide">Daily report reminder</p>
    <p class="mt-1 text-xs">
      No submission logged for
      <span class="font-semibold">{{ missingReportAlerts().join(', ') }}</span>.
    </p>
  </section>

  <section class="rounded-3xl border bg-card/90 shadow-lg ring-1 ring-primary/5">
    <div class="border-b border-border/60 px-6 py-5 sm:flex sm:items-start sm:justify-between sm:gap-6">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-primary">Daily log</p>
        <h2 class="mt-1 text-xl font-semibold text-foreground">Daily report for {{ todayLabel }}</h2>
        <p class="mt-1 text-xs text-muted-foreground">
          Capture each hour and send updates straight to your lead.
        </p>
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:mt-0 sm:justify-end">
        <span *ngIf="lastDailyReportSavedAt()">Saved {{ lastDailyReportSavedAt() | date: 'shortTime' }}</span>
        <button type="button" class="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1 font-semibold text-muted-foreground transition hover:text-foreground" (click)="resetForm()">Reset hour form</button>
        <button type="button" class="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1 font-semibold text-muted-foreground transition hover:text-foreground" (click)="clearEntries()">Clear entries</button>
      </div>
    </div>

    <div class="px-6 pb-6 pt-5">
      <div *ngIf="dailyReportError()" class="mb-4 rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-xs text-destructive">{{ dailyReportError() }}</div>
      <div *ngIf="dailyReportNotice()" class="mb-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-600">{{ dailyReportNotice() }}</div>

      <div *ngIf="dailyReportLoading()" class="rounded-2xl border border-dashed border-input bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">Loading today's log...</div>

      <ng-container *ngIf="!dailyReportLoading()">
        <div class="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
          <div class="space-y-6">
            <form class="grid gap-3 sm:grid-cols-[minmax(0,140px)_1fr_auto]" [formGroup]="entryForm" (ngSubmit)="submitEntry()">
              <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Hour
                <select formControlName="hour" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2">
                  <option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</option>
                </select>
              </label>
              <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-1">
                What did you work on?
                <textarea formControlName="activity" rows="2" placeholder="Draft release notes, resolved customer escalations, paired with QA..." class="min-h-[2.75rem] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2"></textarea>
              </label>
              <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">{{ editingHour() ? 'Update hour' : 'Add hour' }}</button>
            </form>

            <div *ngIf="entries().length; else emptyEntries" class="overflow-hidden rounded-2xl border border-input">
              <table class="min-w-full divide-y divide-border text-sm">
                <thead class="bg-muted/60 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium">Hour</th>
                    <th class="px-4 py-3 text-left font-medium">Summary</th>
                    <th class="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border bg-background/70">
                  <tr *ngFor="let entry of entries()" class="align-top">
                    <td class="px-4 py-3 font-semibold text-foreground">{{ entry.hour }}</td>
                    <td class="px-4 py-3 text-sm text-muted-foreground">{{ entry.activity }}</td>
                    <td class="px-4 py-3">
                      <div class="flex items-center justify-end gap-2 text-xs font-semibold">
                        <button type="button" class="rounded-lg border border-input px-2.5 py-1 text-muted-foreground transition hover:text-foreground" (click)="editEntry(entry)">Edit</button>
                        <button type="button" class="rounded-lg border border-destructive/40 px-2.5 py-1 text-destructive transition hover:bg-destructive/10" (click)="removeEntry(entry.hour)">Remove</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #emptyEntries>
              <div class="rounded-2xl border border-dashed border-input bg-background/80 px-6 py-10 text-center text-sm text-muted-foreground">No entries yet. Add what you accomplished this hour so your lead sees steady progress.</div>
            </ng-template>
          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-input bg-background/70 p-5">
              <div class="flex items-center justify-between text-xs text-muted-foreground">
                <span class="font-semibold text-foreground">Hours logged</span>
                <span>{{ hoursLogged() }} / {{ timeSlots.length }}</span>
              </div>
              <div class="mt-3 h-2 w-full rounded-full bg-muted">
                <div class="h-full rounded-full bg-primary transition-all" [style.width.%]="completionPercent()"></div>
              </div>
              <p class="mt-2 text-xs text-muted-foreground">{{ completionPercent() }}% of day captured</p>
              <div *ngIf="missingCount()" class="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                <span class="inline-flex size-2 rounded-full bg-amber-500"></span>
                {{ missingCount() }} previous day(s) missing
              </div>
            </div>

            <form class="space-y-3 rounded-2xl border border-input bg-background/70 p-5" [formGroup]="dailyMetaForm" (ngSubmit)="saveDailyReport()">
              <label class="flex flex-col gap-2 text-xs font-medium text-muted-foreground">
                Notes for your lead
                <textarea formControlName="notes" rows="3" placeholder="Highlights, blockers, or reminders..." class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2"></textarea>
              </label>

              <label class="flex items-start gap-3 rounded-xl bg-card/60 p-3 text-xs text-muted-foreground">
                <input type="checkbox" formControlName="complete" class="mt-1 size-4 rounded border-input text-primary focus:ring-primary/30" />
                <span>
                  <span class="block font-semibold text-foreground">Mark day complete</span>
                  <span class="mt-1 block leading-5">Uncheck if you plan to add more context later today.</span>
                </span>
              </label>

              <button type="submit" class="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70" [disabled]="dailyReportSaving()">
                <ng-container *ngIf="dailyReportSaving(); else saveLabel">Saving...</ng-container>
                <ng-template #saveLabel>Save daily report</ng-template>
              </button>
            </form>
          </div>
        </div>
      </ng-container>
    </div>
  </section>
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
