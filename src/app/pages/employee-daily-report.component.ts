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
  <mat-card class="main-card rounded-3xl bg-card/95 shadow-lg border-2 border-primary/10">
      <mat-card-header class="card-header-custom gap-4 bg-gradient-to-br from-primary/8 via-primary/5 to-transparent pb-6">
        <div class="flex-1">
          <div class="header-actions flex flex-wrap items-center gap-2">
            <div class="flex items-center gap-2 mr-auto">
              <mat-icon class="text-sm text-green-600" *ngIf="lastDailyReportSavedAt()">check_circle</mat-icon>
              <span *ngIf="lastDailyReportSavedAt()" class="text-xs text-muted-foreground">
                Last saved {{ lastDailyReportSavedAt() | date: 'shortTime' }}
              </span>
            </div>
            <button mat-raised-button color="accent" type="button" (click)="copyFromYesterday()" matTooltip="Copy yesterday's entries" class="shadow-md hover:shadow-lg transition-shadow">
              <mat-icon class="mr-1">content_copy</mat-icon>
              Copy Yesterday
            </button>
            <button mat-raised-button color="primary" type="button" (click)="duplicateLastEntry()" matTooltip="Duplicate last entry" [disabled]="!entries().length" class="shadow-md hover:shadow-lg transition-shadow">
              <mat-icon class="mr-1">control_point_duplicate</mat-icon>
              Duplicate Last
            </button>
            <button mat-stroked-button type="button" (click)="resetForm()" matTooltip="Reset form">
              <mat-icon>refresh</mat-icon>
            </button>
            <button mat-stroked-button color="warn" type="button" (click)="clearEntries()" matTooltip="Clear all entries">
              <mat-icon>delete_sweep</mat-icon>
            </button>
          </div>
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
          <p>Loading report for {{ selectedDateLabel() }}...</p>
        </div>

        <ng-container *ngIf="!dailyReportLoading()">
          <!-- Entry Form -->
          <div class="px-6 mb-6">
            <div class="bg-gradient-to-br from-primary/5 to-transparent rounded-2xl border-2 border-primary/10 p-6 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                  <mat-icon class="text-primary">edit_note</mat-icon>
                  <h3 class="font-bold text-primary">{{ editingIndex() !== null ? 'Edit Entry' : 'Add New Entry' }}</h3>
                </div>
                
                <!-- Date Selector -->
                <div class="flex items-center gap-2 bg-white rounded-xl border-2 border-primary/20 px-4 py-2 shadow-sm">
                  <mat-icon class="text-primary text-sm">calendar_today</mat-icon>
                  <div class="flex items-center gap-2">
                    <label class="text-[10px] font-bold text-primary uppercase tracking-wide">Report Date:</label>
                    <input 
                      type="date" 
                      [value]="selectedDate()" 
                      (change)="changeDate($event)"
                      class="text-sm font-semibold text-foreground bg-transparent border-none outline-none cursor-pointer"
                      [max]="todayKey"
                    />
                  </div>
                  <button 
                    mat-icon-button 
                    (click)="goToToday()" 
                    matTooltip="Go to today"
                    [disabled]="selectedDate() === todayKey"
                    class="text-primary -mr-2"
                  >
                    <mat-icon class="text-lg">today</mat-icon>
                  </button>
                </div>
              </div>
              <form
                class="grid gap-4 grid-cols-1 lg:grid-cols-[minmax(0,110px)_minmax(0,110px)_1fr_1fr_2fr] items-end"
                [formGroup]="entryForm"
                (ngSubmit)="submitEntry()"
              >
                <div class="form-field-wrapper">
                  <label class="text-xs font-bold text-primary mb-2 flex items-center gap-1 uppercase">
                    <mat-icon class="text-sm">schedule</mat-icon>
                    Time Start
                  </label>
                  <select
                    class="custom-select w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm hover:shadow-md"
                    formControlName="timeStart"
                  >
                    <option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</option>
                  </select>
                </div>

                <div class="form-field-wrapper">
                  <label class="text-xs font-bold text-primary mb-2 flex items-center gap-1 uppercase">
                    <mat-icon class="text-sm">schedule</mat-icon>
                    Time End
                  </label>
                  <select
                    class="custom-select w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm hover:shadow-md"
                    formControlName="timeEnd"
                  >
                    <option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</option>
                  </select>
                </div>

                <div class="form-field-wrapper">
                  <label class="text-xs font-bold text-primary mb-2 flex items-center gap-1 uppercase">
                    <mat-icon class="text-sm">location_on</mat-icon>
                    Consultation Place
                  </label>
                  <input
                    type="text"
                    class="w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm hover:shadow-md"
                    formControlName="consultationPlace"
                    placeholder="e.g., Office, Zoom, etc."
                  />
                </div>

                <div class="form-field-wrapper">
                  <label class="text-xs font-bold text-primary mb-2 flex items-center gap-1 uppercase">
                    <mat-icon class="text-sm">person</mat-icon>
                    Client
                  </label>
                  <input
                    type="text"
                    class="w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm hover:shadow-md"
                    formControlName="client"
                    placeholder="Client name"
                  />
                </div>

                <div class="form-field-wrapper">
                  <label class="text-xs font-bold text-primary mb-2 flex items-center gap-1 uppercase">
                    <mat-icon class="text-sm">description</mat-icon>
                    Content
                  </label>
                  <input
                    type="text"
                    class="w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm hover:shadow-md"
                    formControlName="content"
                    placeholder="Describe work activity..."
                  />
                </div>

                <div class="lg:col-span-5 flex gap-2 justify-end mt-2">
                  <button 
                    mat-raised-button 
                    color="primary" 
                    type="submit" 
                    class="shadow-md hover:shadow-lg transition-all px-8"
                    [disabled]="!entryForm.get('content')?.value?.trim()"
                  >
                    <mat-icon class="mr-1">{{ editingIndex() !== null ? 'check' : 'add_circle' }}</mat-icon>
                    {{ editingIndex() !== null ? 'Update Entry' : 'Add Entry' }}
                  </button>
                  <button 
                    *ngIf="editingIndex() !== null"
                    mat-stroked-button 
                    type="button" 
                    (click)="cancelEdit()"
                    class="px-6"
                  >
                    <mat-icon class="mr-1">close</mat-icon>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Content Grid -->
          <div class="content-grid mt-2 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] px-6">
            <!-- Entries Table Section -->
            <div>
              <div class="flex items-center gap-2 mb-3">
                <mat-icon class="text-primary">list_alt</mat-icon>
                <h3 class="font-bold text-primary">Today's Entries</h3>
                <span class="ml-auto text-xs font-semibold text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">
                  {{ entries().length }} {{ entries().length === 1 ? 'entry' : 'entries' }}
                </span>
              </div>
              <div *ngIf="entries().length; else emptyEntries" class="entries-table-container overflow-hidden rounded-2xl border-2 border-primary/10 bg-white shadow-lg">
                <table mat-table [dataSource]="entries()" class="w-full text-sm">
                <ng-container matColumnDef="timeRange">
                  <th mat-header-cell *matHeaderCellDef class="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-primary border-b-2 border-primary/20">
                    <div class="flex items-center gap-1">
                      <mat-icon class="text-sm">schedule</mat-icon>
                      Time Range
                    </div>
                  </th>
                  <td mat-cell *matCellDef="let entry" class="px-4 py-4 font-bold text-foreground border-b border-gray-100">
                    <div class="flex items-center gap-2">
                      <mat-icon class="text-primary text-sm">access_time</mat-icon>
                      {{ entry.timeStart }} - {{ entry.timeEnd }}
                    </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="consultationPlace">
                  <th mat-header-cell *matHeaderCellDef class="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-primary border-b-2 border-primary/20">
                    <div class="flex items-center gap-1">
                      <mat-icon class="text-sm">location_on</mat-icon>
                      Place
                    </div>
                  </th>
                  <td mat-cell *matCellDef="let entry" class="px-4 py-4 text-muted-foreground border-b border-gray-100">{{ entry.consultationPlace }}</td>
                </ng-container>

                <ng-container matColumnDef="client">
                  <th mat-header-cell *matHeaderCellDef class="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-primary border-b-2 border-primary/20">
                    <div class="flex items-center gap-1">
                      <mat-icon class="text-sm">person</mat-icon>
                      Client
                    </div>
                  </th>
                  <td mat-cell *matCellDef="let entry" class="px-4 py-4 text-muted-foreground border-b border-gray-100">{{ entry.client }}</td>
                </ng-container>

                <ng-container matColumnDef="content">
                  <th mat-header-cell *matHeaderCellDef class="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-4 text-left text-[11px] font-bold uppercase tracking-wider text-primary border-b-2 border-primary/20">
                    <div class="flex items-center gap-1">
                      <mat-icon class="text-sm">description</mat-icon>
                      Content
                    </div>
                  </th>
                  <td mat-cell *matCellDef="let entry" class="px-4 py-4 text-muted-foreground border-b border-gray-100">{{ entry.content }}</td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef class="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-4 text-right text-[11px] font-bold uppercase tracking-wider text-primary border-b-2 border-primary/20">Actions</th>
                  <td mat-cell *matCellDef="let entry; let i = index" class="px-4 py-4 text-right border-b border-gray-100">
                    <button mat-mini-fab color="primary" type="button" (click)="editEntry(entry, i)" matTooltip="Edit entry" class="mr-2 shadow-md hover:shadow-lg transition-shadow">
                      <mat-icon class="text-lg">edit</mat-icon>
                    </button>
                    <button mat-mini-fab color="warn" type="button" (click)="removeEntry(i)" matTooltip="Remove entry" class="shadow-md hover:shadow-lg transition-shadow">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
              </div>
              <ng-template #emptyEntries>
                <div class="empty-state rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent px-8 py-12 text-center">
                  <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <mat-icon class="text-primary text-4xl">event_note</mat-icon>
                  </div>
                  <p class="font-bold text-lg text-foreground">No entries yet</p>
                  <p class="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">Start logging your activities using the form above. Use Quick Actions for faster entry!</p>
                </div>
              </ng-template>
            </div>

            <!-- Sidebar Section -->
            <div class="sidebar-section space-y-4">
              <!-- Progress Card -->
              <mat-card class="stat-card border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-white shadow-lg rounded-2xl overflow-hidden">
                <div class="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
                  <div class="flex items-center gap-2 text-white">
                    <mat-icon>assessment</mat-icon>
                    <span class="font-bold">Daily Progress</span>
                  </div>
                </div>
                <mat-card-content class="pt-4">
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-medium text-muted-foreground">Time Logged</span>
                    <span class="text-lg font-bold text-primary">{{ hoursLogged() }} / {{ timeSlots.length }}</span>
                  </div>
                  <mat-progress-bar class="rounded-full h-3 shadow-inner" mode="determinate" [value]="completionPercent()" color="primary"></mat-progress-bar>
                  <p class="mt-3 text-center text-sm font-semibold text-primary">{{ completionPercent() }}% Complete</p>
                  <mat-chip *ngIf="missingCount()" color="warn" selected class="mt-4 w-full justify-center shadow-md">
                    <mat-icon matChipAvatar>priority_high</mat-icon>
                    {{ missingCount() }} previous day(s) missing
                  </mat-chip>
                </mat-card-content>
              </mat-card>

              <!-- Notes & Submit Card -->
              <mat-card class="notes-card border-2 border-primary/10 bg-white shadow-lg rounded-2xl overflow-hidden">
                <div class="bg-gradient-to-r from-primary to-primary/80 px-4 py-3">
                  <div class="flex items-center gap-2 text-white">
                    <mat-icon>send</mat-icon>
                    <span class="font-bold">Submit Report</span>
                  </div>
                </div>
                <mat-card-content class="pt-4">
                  <form class="space-y-4" [formGroup]="dailyMetaForm" (ngSubmit)="saveDailyReport()">
                    <div class="notes-textarea-wrapper">
                      <label class="text-xs font-bold text-primary mb-2 flex items-center gap-1 uppercase">
                        <mat-icon class="text-sm">edit_note</mat-icon>
                        Notes for Manager
                      </label>
                      <textarea
                        class="notes-textarea-custom w-full rounded-xl border-2 border-primary/20 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all shadow-sm"
                        formControlName="notes"
                        rows="4"
                        placeholder="Highlights, blockers, or reminders..."
                      ></textarea>
                      <span class="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <mat-icon class="text-xs">info</mat-icon>
                        Optional context for your manager
                      </span>
                    </div>

                    <div class="bg-primary/5 rounded-xl p-3 border border-primary/10">
                      <mat-checkbox formControlName="complete" class="font-medium">
                        <span class="font-semibold text-sm">Mark day complete</span>
                      </mat-checkbox>
                      <p class="mt-1 ml-8 text-[11px] leading-relaxed text-muted-foreground">
                        Uncheck if you plan to add more later
                      </p>
                    </div>

                    <button 
                      mat-raised-button 
                      color="primary" 
                      type="submit" 
                      class="w-full shadow-lg hover:shadow-xl transition-all py-6 text-base font-bold"
                      [disabled]="dailyReportSaving() || !entries().length"
                    >
                      <mat-icon class="mr-2">{{ dailyReportSaving() ? 'hourglass_empty' : 'cloud_upload' }}</mat-icon>
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
                                  Time
                                </div>
                              </th>
                              <th class="px-4 py-2 text-left">
                                <div class="flex items-center gap-1">
                                  <mat-icon class="text-sm">place</mat-icon>
                                  Consultation Place
                                </div>
                              </th>
                              <th class="px-4 py-2 text-left">
                                <div class="flex items-center gap-1">
                                  <mat-icon class="text-sm">person</mat-icon>
                                  Client
                                </div>
                              </th>
                              <th class="px-4 py-2 text-left">
                                <div class="flex items-center gap-1">
                                  <mat-icon class="text-sm">description</mat-icon>
                                  Content
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr *ngFor="let entry of report.entries" class="border-t border-border text-foreground">
                              <td class="px-4 py-2 font-semibold">{{ entry.timeStart }} - {{ entry.timeEnd }}</td>
                              <td class="px-4 py-2 text-muted-foreground">{{ entry.consultationPlace }}</td>
                              <td class="px-4 py-2 text-muted-foreground">{{ entry.client }}</td>
                              <td class="px-4 py-2 text-muted-foreground">{{ entry.content }}</td>
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
  readonly selectedDate = signal<string>(toDateKey(new Date())); // Selected date for the report
  readonly selectedDateLabel = computed(() => formatDateLabel(this.selectedDate()));

  readonly timeSlots: string[] = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00'];
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
  }

  changeDate(event: Event): void {
    const input = event.target as HTMLInputElement;
    const newDate = input.value; // Format: YYYY-MM-DD
    if (newDate) {
      this.selectedDate.set(newDate);
    }
  }

  goToToday(): void {
    this.selectedDate.set(this.todayKey);
  }

  clearEntries(): void { this.entries.set([]); this.resetForm(); this.dailyMetaForm.setValue({ notes: '', complete: true }); }
  editEntry(entry: DailyReportEntry, index: number): void { 
    this.editingIndex.set(index); 
    this.entryForm.setValue({ 
      timeStart: entry.timeStart, 
      timeEnd: entry.timeEnd,
      consultationPlace: entry.consultationPlace, 
      client: entry.client, 
      content: entry.content 
    }); 
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
