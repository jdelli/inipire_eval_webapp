import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReportingService, IncidentReportPayload } from '../services/reporting.service';
import { RoleService } from '../state/role.service';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-employee-incident-report',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
  ],
  styles: [`
    .form-field-wrapper {
      display: flex;
      flex-direction: column;
    }

    .notes-textarea-custom {
      resize: vertical;
      min-height: 80px;
      font-family: inherit;
      line-height: 1.5;
    }

    .notes-textarea-custom:hover,
    .custom-input:hover,
    .custom-select:hover {
      border-color: hsl(var(--primary) / 0.5);
    }

    .notes-textarea-custom:disabled,
    .custom-input:disabled,
    .custom-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      background-color: hsl(var(--muted));
    }

    .custom-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 0.5rem center;
      background-size: 1.5em 1.5em;
      padding-right: 2.5rem;
      cursor: pointer;
      min-height: 42px;
    }

    .custom-input {
      min-height: 42px;
    }
  `],
  template: `
  <mat-card class="w-full rounded-3xl bg-card/95 shadow-lg">
    <mat-card-header class="items-start gap-4">
      <div mat-card-avatar class="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <mat-icon>report</mat-icon>
      </div>
      <div>
        <mat-card-title class="text-xl font-semibold text-foreground">Incident report</mat-card-title>
        <mat-card-subtitle class="text-xs text-muted-foreground">
          Logged under {{ employeeSource() }}/{{ employeeId() }}/irReports.
        </mat-card-subtitle>
      </div>
      <div class="ml-auto">
        <mat-chip color="primary" selected *ngIf="employeeId(); else missingEmployee">
          <mat-icon matChipAvatar>check_circle</mat-icon>
          ID ready
        </mat-chip>
        <ng-template #missingEmployee>
          <mat-chip color="warn" selected>
            <mat-icon matChipAvatar>error</mat-icon>
            Missing ID
          </mat-chip>
        </ng-template>
      </div>
    </mat-card-header>

    <mat-divider></mat-divider>

    <mat-card-content class="px-0 py-6">
      <div class="px-6">
      <div *ngIf="incidentError()" class="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{{ incidentError() }}</div>
      <div *ngIf="incidentNotice()" class="mb-4 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600">{{ incidentNotice() }}</div>
      </div>

      <form class="grid gap-5 px-6 pb-2 lg:grid-cols-2" [formGroup]="incidentForm" (ngSubmit)="submitIncident()">
        <div class="grid gap-4 lg:col-span-2 lg:grid-cols-4">
          <div class="form-field-wrapper">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
            <input
              type="date"
              formControlName="date"
              class="custom-input w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div class="form-field-wrapper lg:col-span-1">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Severity</label>
            <select
              formControlName="severity"
              class="custom-select w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-field-wrapper lg:col-span-1">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <select
              formControlName="status"
              class="custom-select w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            >
              <option value="Open">Open</option>
              <option value="Monitoring">Monitoring</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
          <div class="form-field-wrapper lg:col-span-1">
            <label class="text-xs font-medium text-muted-foreground mb-1 block">Reported by</label>
            <input
              type="text"
              formControlName="reportedBy"
              placeholder="Name submitting the report"
              class="custom-input w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div class="form-field-wrapper lg:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Title</label>
          <input
            type="text"
            formControlName="title"
            placeholder="Short summary"
            class="custom-input w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div class="form-field-wrapper lg:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Summary</label>
          <textarea
            formControlName="summary"
            rows="3"
            placeholder="What happened?"
            class="notes-textarea-custom w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          ></textarea>
        </div>

        <div class="form-field-wrapper lg:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Impact</label>
          <textarea
            formControlName="impact"
            rows="3"
            placeholder="Customer, operational, or trainee impact"
            class="notes-textarea-custom w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          ></textarea>
        </div>

        <div class="form-field-wrapper lg:col-span-2">
          <label class="text-xs font-medium text-muted-foreground mb-1 block">Follow-up actions</label>
          <textarea
            formControlName="actions"
            rows="4"
            placeholder="One action per line"
            class="notes-textarea-custom w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          ></textarea>
        </div>

        <button
          mat-flat-button
          color="primary"
          type="submit"
          class="w-full lg:col-span-2"
          [disabled]="incidentSaving() || !employeeId()"
        >
          <ng-container *ngIf="incidentSaving(); else incidentLabel">Submitting...</ng-container>
          <ng-template #incidentLabel>Submit incident</ng-template>
        </button>
      </form>
    </mat-card-content>
  </mat-card>
  `,
})
export class EmployeeIncidentReportComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly reportingService = inject(ReportingService);
  private readonly roleService = inject(RoleService);

  readonly profile = this.roleService.profile;
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
    if (!this.employeeId()) { this.incidentError.set('No employee ID configured.'); return; }
    if (this.incidentForm.invalid) { this.incidentForm.markAllAsTouched(); this.incidentError.set('Complete all required fields before submitting.'); return; }

    const { date, title, severity, status, summary, impact, actions, reportedBy } = this.incidentForm.getRawValue();
    const parsedActions = (actions ?? '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (!parsedActions.length) { this.incidentError.set('List at least one follow-up action.'); return; }

    this.incidentSaving.set(true); this.incidentError.set(null); this.incidentNotice.set(null);

    this.reportingService.createIncidentReportFor(this.employeeId(), this.employeeSource(), {
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
