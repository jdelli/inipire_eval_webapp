import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportingService, IncidentReportPayload } from '../services/reporting.service';
import { RoleService } from '../state/role.service';

@Component({
  selector: 'app-employee-incident-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <section class="mx-auto max-w-3xl rounded-3xl border bg-card/90 p-6 shadow-sm">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h3 class="text-base font-semibold text-foreground">Incident report</h3>
        <p class="mt-1 text-xs text-muted-foreground">Logged under trainingRecords/{{ traineeRecordId() }}/incedentReports.</p>
      </div>
      <span *ngIf="traineeRecordId(); else missingTrainee" class="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">ID ready</span>
      <ng-template #missingTrainee>
        <span class="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-[11px] font-semibold text-destructive">Missing ID</span>
      </ng-template>
    </div>

    <div *ngIf="incidentError()" class="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{{ incidentError() }}</div>
    <div *ngIf="incidentNotice()" class="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600">{{ incidentNotice() }}</div>

    <form class="mt-4 space-y-4" [formGroup]="incidentForm" (ngSubmit)="submitIncident()">
      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Date
          <input type="date" formControlName="date" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2" />
        </label>
        <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Severity
          <select formControlName="severity" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
      </div>

      <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Title
        <input type="text" formControlName="title" placeholder="Short summary" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2" />
      </label>

      <div class="grid gap-3 md:grid-cols-2">
        <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Status
          <select formControlName="status" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2">
            <option value="Open">Open</option>
            <option value="Monitoring">Monitoring</option>
            <option value="Resolved">Resolved</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Reported by
          <input type="text" formControlName="reportedBy" placeholder="Name submitting the report" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2" />
        </label>
      </div>

      <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Summary
        <textarea formControlName="summary" rows="3" placeholder="What happened?" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2"></textarea>
      </label>

      <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Impact
        <textarea formControlName="impact" rows="3" placeholder="Customer, operational, or trainee impact" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2"></textarea>
      </label>

      <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Follow-up actions
        <textarea formControlName="actions" rows="4" placeholder="One action per line" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary/20 transition focus:ring-2"></textarea>
      </label>

      <button type="submit" class="w-full rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70" [disabled]="incidentSaving() || !traineeRecordId()">
        <ng-container *ngIf="incidentSaving(); else incidentLabel">Submitting...</ng-container>
        <ng-template #incidentLabel>Submit incident</ng-template>
      </button>
    </form>
  </section>
  `,
})
export class EmployeeIncidentReportComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly reportingService = inject(ReportingService);
  private readonly roleService = inject(RoleService);

  readonly profile = this.roleService.profile;
  readonly traineeRecordId = computed(() => this.profile()?.uid ?? '');
  readonly incidentSaving = signal(false);
  readonly incidentError = signal<string | null>(null);
  readonly incidentNotice = signal<string | null>(null);
  readonly todayKey = new Date().toISOString().slice(0, 10);

  readonly incidentForm = this.fb.group({
    date: [this.todayKey, Validators.required],
    title: ['', Validators.required],
    severity: ['medium', Validators.required],
    status: ['Open', Validators.required],
    summary: ['', Validators.required],
    impact: ['', Validators.required],
    actions: ['', Validators.required],
    reportedBy: [this.profile()?.fullName ?? ''],
  });

  submitIncident(): void {
    if (!this.traineeRecordId()) { this.incidentError.set('No trainee record ID configured.'); return; }
    if (this.incidentForm.invalid) { this.incidentForm.markAllAsTouched(); this.incidentError.set('Complete all required fields before submitting.'); return; }

    const { date, title, severity, status, summary, impact, actions, reportedBy } = this.incidentForm.getRawValue();
    const parsedActions = (actions ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (!parsedActions.length) { this.incidentError.set('List at least one follow-up action.'); return; }

    this.incidentSaving.set(true); this.incidentError.set(null); this.incidentNotice.set(null);

    this.reportingService.createIncidentReport(this.traineeRecordId(), {
      date: date || this.todayKey,
      title: title!.trim(),
      severity: severity as IncidentReportPayload['severity'],
      status: status as IncidentReportPayload['status'],
      summary: summary!.trim(),
      impact: impact!.trim(),
      actions: parsedActions,
      reportedBy: reportedBy?.trim() || this.profile()?.fullName || null,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (id) => { this.incidentSaving.set(false); this.incidentNotice.set(`Incident report created (${id}).`); this.resetIncidentForm(); },
      error: () => { this.incidentSaving.set(false); this.incidentError.set('Failed to submit incident report.'); },
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
      reportedBy: this.profile()?.fullName ?? '',
    });
  }
}
