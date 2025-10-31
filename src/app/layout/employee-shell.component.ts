import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { employeeSnapshot } from '../data/mock-data';
import {
  DailyReportEntry,
  IncidentReportPayload,
  ReportingService,
} from '../services/reporting.service';

interface DailyEntry {
  hour: string;
  activity: string;
}

@Component({
  selector: 'app-employee-shell',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './employee-shell.component.html',
  styles: ``,
})
export class EmployeeShellComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly reportingService = inject(ReportingService);

  readonly snapshot = employeeSnapshot;
  readonly employeeId: string = this.snapshot.employeeId ?? '';
  readonly traineeRecordId: string = this.snapshot.traineeRecordId ?? '';
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
  readonly entries = signal<DailyEntry[]>([]);
  readonly editingHour = signal<string | null>(null);
  readonly dailyReportLoading = signal(false);
  readonly dailyReportSaving = signal(false);
  readonly dailyReportError = signal<string | null>(null);
  readonly dailyReportNotice = signal<string | null>(null);
  readonly lastDailyReportSavedAt = signal<Date | null>(null);
  readonly missingReportAlerts = signal<string[]>([]);
  readonly incidentSaving = signal(false);
  readonly incidentError = signal<string | null>(null);
  readonly incidentNotice = signal<string | null>(null);
  readonly hoursLogged = computed(() => this.entries().length);
  readonly completionPercent = computed(() => {
    const total = this.timeSlots.length;
    if (!total) {
      return 0;
    }
    return Math.round((this.entries().length / total) * 100);
  });
  readonly missingCount = computed(() => this.missingReportAlerts().length);

  readonly entryForm = this.fb.nonNullable.group({
    hour: this.timeSlots[0],
    activity: '',
  });
  readonly dailyMetaForm = this.fb.nonNullable.group({
    notes: '',
    complete: true,
  });
  readonly incidentForm = this.fb.group({
    date: [this.todayKey, Validators.required],
    title: ['', Validators.required],
    severity: ['medium', Validators.required],
    status: ['Open', Validators.required],
    summary: ['', Validators.required],
    impact: ['', Validators.required],
    actions: ['', Validators.required],
    reportedBy: [this.snapshot.name ?? ''],
  });

  ngOnInit(): void {
    if (this.employeeId) {
      this.loadDailyReport();
      this.refreshMissingDailyReportAlerts();
    } else {
      this.dailyReportError.set('No employee ID configured.');
    }
  }

  loadDailyReport(): void {
    if (!this.employeeId) {
      this.dailyReportError.set('No employee ID configured.');
      return;
    }

    this.dailyReportLoading.set(true);
    this.dailyReportError.set(null);

    this.reportingService
      .getDailyReport(this.employeeId, this.todayKey)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          if (record) {
            const entries = sortEntries(record.entries ?? []);
            this.entries.set(entries);
            this.dailyMetaForm.setValue({
              notes: record.notes ?? '',
              complete: record.complete ?? false,
            });
            this.lastDailyReportSavedAt.set(
              record.updatedAt ?? record.createdAt ?? null
            );
          } else {
            this.entries.set([]);
            this.dailyMetaForm.setValue({ notes: '', complete: true });
            this.lastDailyReportSavedAt.set(null);
          }
          this.dailyReportLoading.set(false);
        },
        error: (error) => {
          console.error('Error loading daily report', error);
          this.dailyReportLoading.set(false);
          this.dailyReportError.set("Couldn't load today's daily report.");
        },
      });
  }

  refreshMissingDailyReportAlerts(): void {
    if (!this.employeeId) {
      this.missingReportAlerts.set([]);
      return;
    }

    this.reportingService
      .getMissingDailyReportDates(this.employeeId, 5)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (dates) => {
          const friendly = dates.map(formatDateLabel);
          this.missingReportAlerts.set(friendly);
        },
        error: (error) => {
          console.error('Error loading missing daily reports', error);
        },
      });
  }

  saveDailyReport(): void {
    if (!this.employeeId) {
      this.dailyReportError.set('No employee ID configured.');
      return;
    }

    const entries = sortEntries(this.entries());
    if (!entries.length) {
      this.dailyReportError.set('Add at least one hourly entry before saving.');
      return;
    }

    const meta = this.dailyMetaForm.getRawValue();
    this.dailyReportSaving.set(true);
    this.dailyReportError.set(null);
    this.dailyReportNotice.set(null);

    const payload = {
      date: this.todayKey,
      entries,
      submittedBy: this.snapshot.name ?? null,
      notes: meta.notes?.trim() ? meta.notes.trim() : null,
      complete: !!meta.complete,
    };

    this.reportingService
      .saveDailyReport(this.employeeId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.dailyReportSaving.set(false);
          this.dailyReportNotice.set('Daily report saved.');
          this.lastDailyReportSavedAt.set(new Date());
          this.refreshMissingDailyReportAlerts();
        },
        error: (error) => {
          console.error('Error saving daily report', error);
          this.dailyReportSaving.set(false);
          this.dailyReportError.set('Failed to save daily report. Try again.');
        },
      });
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
      const filtered = items.filter(
        (item) => item.hour !== nextEntry.hour && item.hour !== originalHour
      );
      return [...filtered, nextEntry].sort((a, b) => a.hour.localeCompare(b.hour));
    });

    this.resetForm();
  }

  clearEntries(): void {
    this.entries.set([]);
    this.resetForm();
    this.dailyMetaForm.setValue({ notes: '', complete: true });
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

  submitIncident(): void {
    if (!this.traineeRecordId) {
      this.incidentError.set('No trainee record ID configured.');
      return;
    }

    if (this.incidentForm.invalid) {
      this.incidentForm.markAllAsTouched();
      this.incidentError.set('Complete all required fields before submitting.');
      return;
    }

    const {
      date,
      title,
      severity,
      status,
      summary,
      impact,
      actions,
      reportedBy,
    } = this.incidentForm.getRawValue();

    const parsedActions = (actions ?? '')
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!parsedActions.length) {
      this.incidentError.set('List at least one follow-up action.');
      return;
    }

    this.incidentSaving.set(true);
    this.incidentError.set(null);
    this.incidentNotice.set(null);

    this.reportingService
      .createIncidentReport(this.traineeRecordId, {
        date: date || this.todayKey,
        title: title!.trim(),
        severity: severity as IncidentReportPayload['severity'],
        status: status as IncidentReportPayload['status'],
        summary: summary!.trim(),
        impact: impact!.trim(),
        actions: parsedActions,
        reportedBy: reportedBy?.trim() || this.snapshot.name || null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (id) => {
          this.incidentSaving.set(false);
          this.incidentNotice.set(`Incident report created (${id}).`);
          this.resetIncidentForm();
        },
        error: (error) => {
          console.error('Error creating incident report', error);
          this.incidentSaving.set(false);
          this.incidentError.set('Failed to submit incident report.');
        },
      });
  }

  resetIncidentForm(): void {
    this.incidentForm.reset({
      date: this.todayKey,
      title: '',
      severity: 'medium',
      status: 'Open',
      summary: '',
      impact: '',
      actions: '',
      reportedBy: this.snapshot.name ?? '',
    });
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
  return [...entries].sort((a, b) => a.hour.localeCompare(b.hour));
}
