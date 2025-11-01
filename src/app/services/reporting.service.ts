import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';

export interface DailyReportEntry {
  hour: string;
  activity: string;
}

export interface DailyReportRecord {
  id: string;
  date: string;
  entries: DailyReportEntry[];
  submittedBy?: string | null;
  notes?: string | null;
  complete: boolean;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface SaveDailyReportPayload {
  date: string;
  entries: DailyReportEntry[];
  submittedBy?: string | null;
  notes?: string | null;
  complete: boolean;
}

export interface IncidentReportPayload {
  date: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'Open' | 'Monitoring' | 'Resolved';
  summary: string;
  impact: string;
  actions: string[];
  reportedBy?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ReportingService {
  private readonly firestore = inject(Firestore);

  getDailyReport(
    employeeId: string,
    dateKey: string
  ): Observable<DailyReportRecord | null> {
    const reportDoc = doc(
      this.firestore,
      `employees/${employeeId}/dailyReport/${dateKey}`
    );

    return from(
      getDoc(reportDoc).then((snapshot) => {
        if (!snapshot.exists()) {
          return null;
        }

        const data = snapshot.data() as any;
        return {
          id: snapshot.id,
          date: data.date ?? snapshot.id,
          entries: Array.isArray(data.entries) ? data.entries : [],
          submittedBy: data.submittedBy ?? null,
          notes: data.notes ?? null,
          complete: !!data.complete,
          createdAt: this.toDate(data.createdAt),
          updatedAt: this.toDate(data.updatedAt),
        } as DailyReportRecord;
      })
    );
  }

  saveDailyReport(
    employeeId: string,
    payload: SaveDailyReportPayload
  ): Observable<void> {
    const reportDoc = doc(
      this.firestore,
      `employees/${employeeId}/dailyReport/${payload.date}`
    );

    return from(
      (async () => {
        const now = Timestamp.now();
        const existing = await getDoc(reportDoc);
        const createdAt = existing.exists()
          ? (existing.data()['createdAt'] as Timestamp | undefined) ?? now
          : now;

        const data = {
          date: payload.date,
          entries: payload.entries,
          submittedBy: payload.submittedBy ?? null,
          notes: payload.notes ?? null,
          complete: payload.complete,
          createdAt,
          updatedAt: now,
        };

        await setDoc(reportDoc, data, { merge: true });
      })()
    );
  }

  getMissingDailyReportDates(
    employeeId: string,
    lookbackDays: number,
    options: { excludeWeekends?: boolean } = {}
  ): Observable<string[]> {
    const excludeWeekends = options.excludeWeekends ?? true;
    const targetDates = this.buildLookbackDates(lookbackDays, excludeWeekends);

    if (!targetDates.length) {
      return from(Promise.resolve([]));
    }

    const newest = targetDates[0];
    const oldest = targetDates[targetDates.length - 1];

    const reportsRef = collection(
      this.firestore,
      `employees/${employeeId}/dailyReport`
    );
    const q = query(
      reportsRef,
      where('date', '>=', oldest),
      where('date', '<=', newest)
    );

    return from(
      getDocs(q).then((snapshot) => {
        const present = new Set<string>();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          const date = data.date ?? docSnap.id;
          if (typeof date === 'string') {
            present.add(date);
          }
        });

        return targetDates.filter((dateKey) => !present.has(dateKey));
      })
    );
  }

  createIncidentReport(
    traineeId: string,
    payload: IncidentReportPayload
  ): Observable<string> {
    const incidentsRef = collection(
      this.firestore,
      `trainingRecords/${traineeId}/incedentReports`
    );
    const now = Timestamp.now();

    return from(
      addDoc(incidentsRef, {
        ...payload,
        createdAt: now,
        updatedAt: now,
      }).then((docRef) => docRef.id)
    );
  }

  /**
   * Create an incident report for an employee
   * Path: employees/{employeeId}/irReports/{reportId}
   */
  createEmployeeIncidentReport(
    employeeId: string,
    payload: IncidentReportPayload
  ): Observable<string> {
    const incidentsRef = collection(
      this.firestore,
      `employees/${employeeId}/irReports`
    );
    const now = Timestamp.now();

    return from(
      addDoc(incidentsRef, {
        ...payload,
        createdAt: now,
        updatedAt: now,
      }).then((docRef) => docRef.id)
    );
  }

  /**
   * Generic method to create incident report for either employees or trainees
   */
  createIncidentReportFor(
    personId: string,
    source: 'employees' | 'trainingRecords',
    payload: IncidentReportPayload
  ): Observable<string> {
    if (source === 'employees') {
      return this.createEmployeeIncidentReport(personId, payload);
    } else {
      return this.createIncidentReport(personId, payload);
    }
  }

  private buildLookbackDates(
    lookbackDays: number,
    excludeWeekends: boolean
  ): string[] {
    const today = new Date();
    const dates: string[] = [];
    let dayOffset = 1;

    while (dates.length < lookbackDays) {
      const candidate = new Date(
        Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        )
      );
      candidate.setUTCDate(candidate.getUTCDate() - dayOffset);

      dayOffset += 1;

      if (
        excludeWeekends &&
        (candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6)
      ) {
        continue;
      }

      dates.push(this.toDateKey(candidate));
    }

    return dates;
  }

  private toDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toDate(value: any): Date | null {
    if (value instanceof Timestamp) {
      return value.toDate();
    }
    if (value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }
}
