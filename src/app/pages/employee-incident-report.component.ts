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
  template: `
  <mat-card class="w-full rounded-3xl bg-card/95 shadow-lg">
    <mat-card-header class="items-start gap-4">
      <div mat-card-avatar class="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <mat-icon>report</mat-icon>
      </div>
      <div>
        <mat-card-title class="text-xl font-semibold text-foreground">Incident report</mat-card-title>
        <mat-card-subtitle class="text-xs text-muted-foreground">
          Logged under trainingRecords/{{ traineeRecordId() }}/incedentReports.
        </mat-card-subtitle>
      </div>
      <div class="ml-auto">
        <mat-chip color="primary" selected *ngIf="traineeRecordId(); else missingTrainee">
          <mat-icon matChipAvatar>check_circle</mat-icon>
          ID ready
        </mat-chip>
        <ng-template #missingTrainee>
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
          <mat-form-field appearance="outline">
            <mat-label>Date</mat-label>
            <input matInput type="date" formControlName="date" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="lg:col-span-1">
            <mat-label>Severity</mat-label>
            <mat-select formControlName="severity">
              <mat-option value="low">Low</mat-option>
              <mat-option value="medium">Medium</mat-option>
              <mat-option value="high">High</mat-option>
              <mat-option value="critical">Critical</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="lg:col-span-1">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="Open">Open</mat-option>
              <mat-option value="Monitoring">Monitoring</mat-option>
              <mat-option value="Resolved">Resolved</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="lg:col-span-1">
            <mat-label>Reported by</mat-label>
            <input matInput type="text" formControlName="reportedBy" placeholder="Name submitting the report" />
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="lg:col-span-2">
          <mat-label>Title</mat-label>
          <input matInput type="text" formControlName="title" placeholder="Short summary" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="lg:col-span-2">
          <mat-label>Summary</mat-label>
          <textarea matInput formControlName="summary" rows="3" placeholder="What happened?"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="lg:col-span-2">
          <mat-label>Impact</mat-label>
          <textarea matInput formControlName="impact" rows="3" placeholder="Customer, operational, or trainee impact"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="lg:col-span-2">
          <mat-label>Follow-up actions</mat-label>
          <textarea matInput formControlName="actions" rows="4" placeholder="One action per line"></textarea>
        </mat-form-field>

        <button
          mat-flat-button
          color="primary"
          type="submit"
          class="w-full lg:col-span-2"
          [disabled]="incidentSaving() || !traineeRecordId()"
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
