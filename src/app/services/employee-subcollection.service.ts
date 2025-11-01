import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDocs,
  setDoc,
  Timestamp,
  query,
  orderBy,
  CollectionReference,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';

export interface EvaluationData {
  score?: number;
  rating?: number;
  comments?: string;
  evaluatorName?: string;
  evaluatorId?: string;
  evaluationType?: string;
  weekNumber?: number;
  weekStartDate?: string;
  weekEndDate?: string;
  status?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  [key: string]: any;
}

export interface IRReportData {
  incidentType?: string;
  description?: string;
  severity?: string;
  reportedBy?: string;
  reporterId?: string;
  dateOccurred?: string;
  status?: string;
  resolution?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class EmployeeSubcollectionService {
  private readonly firestore = inject(Firestore);

  /**
   * Initialize subcollections for an employee/trainee
   * Creates placeholder documents if needed
   */
  initializeSubcollections(
    employeeId: string,
    source: 'employees' | 'trainingRecords'
  ): Observable<{ success: boolean; error?: any }> {
    return from(
      (async () => {
        try {
          const employeeRef = doc(this.firestore, source, employeeId);

          // Create a placeholder in evaluations subcollection
          const evalRef = collection(employeeRef, 'evaluations');
          await setDoc(doc(evalRef, '_initialized'), {
            initialized: true,
            createdAt: Timestamp.now(),
          });

          // Create a placeholder in irReports subcollection
          const irRef = collection(employeeRef, 'irReports');
          await setDoc(doc(irRef, '_initialized'), {
            initialized: true,
            createdAt: Timestamp.now(),
          });

          console.log(
            `[EmployeeSubcollectionService] Initialized subcollections for ${source}/${employeeId}`
          );

          return { success: true };
        } catch (error) {
          console.error(
            '[EmployeeSubcollectionService] Error initializing subcollections:',
            error
          );
          return { success: false, error };
        }
      })()
    );
  }

  /**
   * Add an evaluation to an employee's evaluations subcollection
   */
  addEvaluation(
    employeeId: string,
    source: 'employees' | 'trainingRecords',
    evaluationData: EvaluationData
  ): Observable<{ success: boolean; id?: string; error?: any }> {
    return from(
      (async () => {
        try {
          const employeeRef = doc(this.firestore, source, employeeId);
          const evalRef = collection(employeeRef, 'evaluations');

          const dataToSave = {
            ...evaluationData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            status: evaluationData.status || 'pending',
          };

          const newEvalDoc = await addDoc(evalRef, dataToSave);

          console.log(
            `[EmployeeSubcollectionService] Added evaluation ${newEvalDoc.id} to ${source}/${employeeId}`
          );

          return { success: true, id: newEvalDoc.id };
        } catch (error) {
          console.error(
            '[EmployeeSubcollectionService] Error adding evaluation:',
            error
          );
          return { success: false, error };
        }
      })()
    );
  }

  /**
   * Add an IR report to an employee's irReports subcollection
   */
  addIRReport(
    employeeId: string,
    source: 'employees' | 'trainingRecords',
    reportData: IRReportData
  ): Observable<{ success: boolean; id?: string; error?: any }> {
    return from(
      (async () => {
        try {
          const employeeRef = doc(this.firestore, source, employeeId);
          const irRef = collection(employeeRef, 'irReports');

          const dataToSave = {
            ...reportData,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            status: reportData.status || 'open',
          };

          const newReportDoc = await addDoc(irRef, dataToSave);

          console.log(
            `[EmployeeSubcollectionService] Added IR report ${newReportDoc.id} to ${source}/${employeeId}`
          );

          return { success: true, id: newReportDoc.id };
        } catch (error) {
          console.error(
            '[EmployeeSubcollectionService] Error adding IR report:',
            error
          );
          return { success: false, error };
        }
      })()
    );
  }

  /**
   * Get all evaluations for an employee
   */
  getEmployeeEvaluations(
    employeeId: string,
    source: 'employees' | 'trainingRecords'
  ): Observable<EvaluationData[]> {
    return from(
      (async () => {
        try {
          const employeeRef = doc(this.firestore, source, employeeId);
          const evalRef = collection(employeeRef, 'evaluations');
          const q = query(evalRef, orderBy('createdAt', 'desc'));

          const snapshot = await getDocs(q);

          const evaluations: EvaluationData[] = [];
          snapshot.forEach((doc) => {
            // Skip the initialization placeholder
            if (doc.id !== '_initialized') {
              evaluations.push({ id: doc.id, ...doc.data() } as EvaluationData);
            }
          });

          console.log(
            `[EmployeeSubcollectionService] Fetched ${evaluations.length} evaluations for ${source}/${employeeId}`
          );

          return evaluations;
        } catch (error) {
          console.error(
            '[EmployeeSubcollectionService] Error fetching evaluations:',
            error
          );
          return [];
        }
      })()
    );
  }

  /**
   * Get all IR reports for an employee
   */
  getEmployeeIRReports(
    employeeId: string,
    source: 'employees' | 'trainingRecords'
  ): Observable<IRReportData[]> {
    return from(
      (async () => {
        try {
          const employeeRef = doc(this.firestore, source, employeeId);
          const irRef = collection(employeeRef, 'irReports');
          const q = query(irRef, orderBy('createdAt', 'desc'));

          const snapshot = await getDocs(q);

          const reports: IRReportData[] = [];
          snapshot.forEach((doc) => {
            // Skip the initialization placeholder
            if (doc.id !== '_initialized') {
              reports.push({ id: doc.id, ...doc.data() } as IRReportData);
            }
          });

          console.log(
            `[EmployeeSubcollectionService] Fetched ${reports.length} IR reports for ${source}/${employeeId}`
          );

          return reports;
        } catch (error) {
          console.error(
            '[EmployeeSubcollectionService] Error fetching IR reports:',
            error
          );
          return [];
        }
      })()
    );
  }
}
