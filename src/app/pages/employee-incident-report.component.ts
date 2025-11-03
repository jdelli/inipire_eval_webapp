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
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatTooltipModule,
  ],
  styleUrls: ['./employee-incident-report.component.scss'],
  template: `
  <mat-card class="w-full rounded-3xl bg-card/95 shadow-lg border-2 border-red-500/10">
    <mat-card-header class="items-start gap-4 bg-gradient-to-br from-red-500/8 via-red-500/5 to-transparent pb-6">
      <div mat-card-avatar class="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
        <mat-icon class="text-3xl">report_problem</mat-icon>
      </div>
      <div class="flex-1">
        <mat-card-title class="text-2xl font-bold uppercase tracking-wide text-red-600">Inspire Next Global Inc.</mat-card-title>
        <mat-card-subtitle class="text-lg font-semibold text-red-500/70 mt-1">Incident Report</mat-card-subtitle>
        <div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <mat-icon class="text-sm">folder</mat-icon>
          <span>{{ employeeSource() }}/{{ employeeId() }}/irReports</span>
        </div>
      </div>
      <div class="ml-auto">
        <mat-chip color="primary" selected *ngIf="employeeId(); else missingEmployee" class="shadow-md">
          <mat-icon matChipAvatar>check_circle</mat-icon>
          ID ready
        </mat-chip>
        <ng-template #missingEmployee>
          <mat-chip color="warn" selected class="shadow-md">
            <mat-icon matChipAvatar>error</mat-icon>
            Missing ID
          </mat-chip>
        </ng-template>
      </div>
    </mat-card-header>

    <mat-divider></mat-divider>

    <mat-card-content class="px-0 py-6">
      <div class="px-6">
      <div *ngIf="incidentError()" class="mb-6 rounded-xl border-2 border-red-300/60 bg-gradient-to-r from-red-50 to-red-50/50 px-5 py-4 text-sm text-red-700 flex items-start gap-3 fade-in">
        <mat-icon class="text-red-600">error_outline</mat-icon>
        <span class="flex-1 font-medium">{{ incidentError() }}</span>
      </div>
      <div *ngIf="incidentNotice()" class="mb-6 rounded-xl border-2 border-green-300/60 bg-gradient-to-r from-green-50 to-green-50/50 px-5 py-4 text-sm text-green-700 flex items-start gap-3 fade-in">
        <mat-icon class="text-green-600">check_circle_outline</mat-icon>
        <span class="flex-1 font-medium">{{ incidentNotice() }}</span>
      </div>
      </div>

      <!-- Incident Form Card -->
      <div class="px-6">
        <div class="bg-gradient-to-br from-red-500/5 to-transparent rounded-2xl border-2 border-red-500/10 p-6 shadow-md">
          <div class="flex items-center justify-between mb-6 pb-4 border-b-2 border-red-500/10">
            <div class="flex items-center gap-3">
              <mat-icon class="text-red-600 text-3xl">edit_document</mat-icon>
              <div>
                <h3 class="font-bold text-xl text-red-600">Report New Incident</h3>
                <p class="text-xs text-muted-foreground mt-1">Fill out all required fields to document the incident</p>
              </div>
            </div>
            <div class="px-4 py-2 rounded-xl {{ severityClass() }} font-semibold text-sm">
              Current Severity: {{ currentSeverity().toUpperCase() }}
            </div>
          </div>

          <!-- Quick Templates -->
          <div class="mb-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div class="flex items-center gap-2 mb-3">
              <mat-icon class="text-primary text-sm">flash_on</mat-icon>
              <span class="text-xs font-bold text-primary uppercase">Quick Templates</span>
            </div>
            <div class="flex flex-wrap gap-2">
              <button 
                mat-stroked-button 
                type="button"
                (click)="applyTemplate('system-outage')"
                matTooltip="System/service outage template"
                class="text-xs"
              >
                <mat-icon class="mr-1 text-sm">power_off</mat-icon>
                System Outage
              </button>
              <button 
                mat-stroked-button 
                type="button"
                (click)="applyTemplate('security')"
                matTooltip="Security incident template"
                class="text-xs"
              >
                <mat-icon class="mr-1 text-sm">security</mat-icon>
                Security Issue
              </button>
              <button 
                mat-stroked-button 
                type="button"
                (click)="applyTemplate('customer-complaint')"
                matTooltip="Customer complaint template"
                class="text-xs"
              >
                <mat-icon class="mr-1 text-sm">support_agent</mat-icon>
                Customer Complaint
              </button>
              <button 
                mat-stroked-button 
                type="button"
                (click)="applyTemplate('data-breach')"
                matTooltip="Data breach template"
                class="text-xs"
              >
                <mat-icon class="mr-1 text-sm">leak_remove</mat-icon>
                Data Breach
              </button>
            </div>
          </div>

          <form class="grid gap-6 lg:grid-cols-2" [formGroup]="incidentForm" (ngSubmit)="submitIncident()">
            <!-- Info Bar -->
            <div class="lg:col-span-2 grid gap-4 lg:grid-cols-4">
              <div class="form-field-wrapper">
                <label class="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">
                  <mat-icon class="text-sm">calendar_today</mat-icon>
                  Date
                </label>
                <input
                  type="date"
                  formControlName="date"
                  matTooltip="When did the incident occur?"
                  class="custom-input w-full rounded-xl border-2 border-red-500/20 bg-white px-4 py-3 text-sm text-foreground focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm hover:shadow-md"
                />
              </div>
              <div class="form-field-wrapper lg:col-span-1">
                <label class="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">
                  <mat-icon class="text-sm">warning</mat-icon>
                  Severity
                </label>
                <select
                  formControlName="severity"
                  matTooltip="Rate the severity of the incident"
                  class="custom-select w-full rounded-xl border-2 border-red-500/20 bg-white px-4 py-3 text-sm text-foreground focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm hover:shadow-md"
                >
                  <option value="low">🟢 Low</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="high">🟠 High</option>
                  <option value="critical">🔴 Critical</option>
                </select>
              </div>
              <div class="form-field-wrapper lg:col-span-1">
                <label class="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">
                  <mat-icon class="text-sm">track_changes</mat-icon>
                  Status
                </label>
                <select
                  formControlName="status"
                  matTooltip="Current status of the incident"
                  class="custom-select w-full rounded-xl border-2 border-red-500/20 bg-white px-4 py-3 text-sm text-foreground focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm hover:shadow-md"
                >
                  <option value="Open">🔴 Open</option>
                  <option value="Monitoring">🟡 Monitoring</option>
                  <option value="Resolved">🟢 Resolved</option>
                </select>
              </div>
              <div class="form-field-wrapper lg:col-span-1">
                <label class="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">
                  <mat-icon class="text-sm">person</mat-icon>
                  Reported by
                </label>
                <input
                  type="text"
                  formControlName="reportedBy"
                  placeholder="Reporter name"
                  matTooltip="Name of person submitting this report"
                  class="custom-input w-full rounded-xl border-2 border-red-500/20 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm hover:shadow-md"
                />
              </div>
            </div>

            <div class="form-field-wrapper lg:col-span-2">
              <label class="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">
                <mat-icon class="text-sm">title</mat-icon>
                Title *
              </label>
              <input
                type="text"
                formControlName="title"
                placeholder="Brief incident title"
                class="custom-input w-full rounded-xl border-2 border-red-500/20 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm hover:shadow-md"
              />
            </div>

            <div class="form-field-wrapper lg:col-span-2">
              <label class="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">
                <mat-icon class="text-sm">description</mat-icon>
                Summary *
              </label>
              <textarea
                formControlName="summary"
                rows="4"
                placeholder="What happened? Provide detailed context..."
                class="notes-textarea-custom w-full rounded-xl border-2 border-red-500/20 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm hover:shadow-md"
              ></textarea>
            </div>

            <div class="form-field-wrapper lg:col-span-2">
              <label class="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">
                <mat-icon class="text-sm">crisis_alert</mat-icon>
                Impact *
              </label>
              <textarea
                formControlName="impact"
                rows="4"
                placeholder="Describe customer, operational, or trainee impact..."
                class="notes-textarea-custom w-full rounded-xl border-2 border-red-500/20 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm hover:shadow-md"
              ></textarea>
            </div>

            <div class="form-field-wrapper lg:col-span-2">
              <label class="text-xs font-bold text-red-600 mb-2 flex items-center gap-1 uppercase">
                <mat-icon class="text-sm">task_alt</mat-icon>
                Follow-up Actions *
              </label>
              <textarea
                formControlName="actions"
                rows="5"
                placeholder="List follow-up actions (one per line)&#10;• Action 1&#10;• Action 2&#10;• Action 3"
                class="notes-textarea-custom w-full rounded-xl border-2 border-red-500/20 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-sm hover:shadow-md font-mono"
              ></textarea>
              <span class="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
                <mat-icon class="text-xs">info</mat-icon>
                Enter one action per line for clear tracking
              </span>
            </div>

            <div class="lg:col-span-2 flex gap-3 justify-end mt-4">
              <button
                mat-stroked-button
                type="button"
                (click)="resetIncidentForm()"
                class="px-8"
              >
                <mat-icon class="mr-1">refresh</mat-icon>
                Reset Form
              </button>
              <button
                mat-raised-button
                color="warn"
                type="submit"
                class="shadow-lg hover:shadow-xl transition-all px-12 py-6 text-base font-bold"
                [disabled]="incidentSaving() || !employeeId()"
              >
                <mat-icon class="mr-2">{{ incidentSaving() ? 'hourglass_empty' : 'send' }}</mat-icon>
                <ng-container *ngIf="incidentSaving(); else incidentLabel">Submitting...</ng-container>
                <ng-template #incidentLabel>Submit Incident Report</ng-template>
              </button>
            </div>
          </form>
        </div>
      </div>
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

  readonly currentSeverity = computed(() => this.incidentForm.value.severity || 'medium');
  readonly severityClass = computed(() => `severity-${this.currentSeverity()}`);

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

  applyTemplate(templateType: string): void {
    const templates = {
      'system-outage': {
        title: 'System Outage',
        severity: 'critical',
        summary: 'System/service experienced downtime affecting operations.',
        impact: 'Service unavailable to customers. Operations disrupted.',
        actions: '• Identify root cause\n• Restore service\n• Implement monitoring\n• Notify affected customers\n• Document incident'
      },
      'security': {
        title: 'Security Incident',
        severity: 'high',
        summary: 'Potential security vulnerability or breach detected.',
        impact: 'Potential data exposure. Security integrity compromised.',
        actions: '• Contain the breach\n• Assess damage\n• Notify security team\n• Change affected credentials\n• Review security policies'
      },
      'customer-complaint': {
        title: 'Customer Complaint',
        severity: 'medium',
        summary: 'Customer dissatisfaction with service or product.',
        impact: 'Customer satisfaction affected. Potential reputation impact.',
        actions: '• Contact customer\n• Investigate issue\n• Provide solution\n• Follow up\n• Implement preventive measures'
      },
      'data-breach': {
        title: 'Data Breach',
        severity: 'critical',
        summary: 'Unauthorized access to sensitive data detected.',
        impact: 'Confidential data potentially exposed. Legal and compliance risk.',
        actions: '• Isolate affected systems\n• Notify data protection officer\n• Assess scope of breach\n• Notify affected parties\n• File regulatory reports\n• Implement security patches'
      }
    };

    const template = templates[templateType as keyof typeof templates];
    if (template) {
      this.incidentForm.patchValue({
        title: template.title,
        severity: template.severity,
        summary: template.summary,
        impact: template.impact,
        actions: template.actions
      });
    }
  }
}
