import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { EvaluationService, EvaluationData } from './evaluation.service';
import { ReportingService, IncidentReportPayload } from './reporting.service';
import { EmployeeSubcollectionService } from './employee-subcollection.service';
import { Observable, of, switchMap } from 'rxjs';

/**
 * Service that bridges the authenticated user with their associated employee/trainee
 * Makes it easier to save evaluations and IR reports for the logged-in user
 */
@Injectable({ providedIn: 'root' })
export class UserEmployeeService {
  private readonly authService = inject(AuthService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly reportingService = inject(ReportingService);
  private readonly employeeSubcollectionService = inject(EmployeeSubcollectionService);

  readonly currentUser$ = this.authService.profile$;

  readonly currentEmployeeId = computed(() => {
    const profile = this.authService.profile$;
    // Note: profile$ is an Observable, so we can't use computed directly
    // Instead, use the signal-based approach or subscribe pattern
    return null; // This should be set up differently in real implementation
  });

  /**
   * Save an evaluation for the currently logged-in user's employee record
   */
  saveCurrentUserEvaluation(
    evaluationData: Omit<EvaluationData, 'evaluatedAt'>
  ): Observable<string> {
    return this.currentUser$.pipe(
      switchMap((profile) => {
        if (!profile?.employeeId || !profile?.employeeSource) {
          console.error('[UserEmployeeService] No employee linked to current user');
          throw new Error('No employee linked to current user');
        }

        if (profile.employeeSource === 'employees') {
          return this.evaluationService.saveEmployeeEvaluation(
            profile.employeeId,
            evaluationData
          );
        } else {
          return this.evaluationService.saveTraineeEvaluation(
            profile.employeeId,
            evaluationData
          );
        }
      })
    );
  }

  /**
   * Save an IR report for the currently logged-in user's employee record
   */
  saveCurrentUserIRReport(reportData: IncidentReportPayload): Observable<string> {
    return this.currentUser$.pipe(
      switchMap((profile) => {
        if (!profile?.employeeId || !profile?.employeeSource) {
          console.error('[UserEmployeeService] No employee linked to current user');
          throw new Error('No employee linked to current user');
        }

        return this.reportingService.createIncidentReportFor(
          profile.employeeId,
          profile.employeeSource,
          reportData
        );
      })
    );
  }

  /**
   * Get all evaluations for the currently logged-in user's employee record
   */
  getCurrentUserEvaluations(): Observable<any[]> {
    return this.currentUser$.pipe(
      switchMap((profile) => {
        if (!profile?.employeeId || !profile?.employeeSource) {
          return of([]);
        }

        if (profile.employeeSource === 'employees') {
          return this.evaluationService.getEmployeeEvaluations(profile.employeeId);
        } else {
          return this.evaluationService.getTraineeEvaluations(profile.employeeId);
        }
      })
    );
  }

  /**
   * Get all IR reports for the currently logged-in user's employee record
   */
  getCurrentUserIRReports(): Observable<any[]> {
    return this.currentUser$.pipe(
      switchMap((profile) => {
        if (!profile?.employeeId || !profile?.employeeSource) {
          return of([]);
        }

        return this.employeeSubcollectionService.getEmployeeIRReports(
          profile.employeeId,
          profile.employeeSource
        );
      })
    );
  }

  /**
   * Save evaluation for a specific employee (for team leaders/admins)
   */
  saveEvaluationForEmployee(
    employeeId: string,
    source: 'employees' | 'trainingRecords',
    evaluationData: Omit<EvaluationData, 'evaluatedAt'>
  ): Observable<string> {
    if (source === 'employees') {
      return this.evaluationService.saveEmployeeEvaluation(employeeId, evaluationData);
    } else {
      return this.evaluationService.saveTraineeEvaluation(employeeId, evaluationData);
    }
  }

  /**
   * Save IR report for a specific employee (for team leaders/admins)
   */
  saveIRReportForEmployee(
    employeeId: string,
    source: 'employees' | 'trainingRecords',
    reportData: IncidentReportPayload
  ): Observable<string> {
    return this.reportingService.createIncidentReportFor(employeeId, source, reportData);
  }
}
