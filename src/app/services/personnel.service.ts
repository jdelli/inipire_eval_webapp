import { Injectable, computed, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, from, combineLatest, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Employee, Trainee, DepartmentGroup } from '../models/personnel.model';
import { environment } from '../../environments/environment';
import { RoleService } from '../state/role.service';

export interface TLUser {
  uid: string;
  email: string;
  fullName: string;
  department: string;
  isTeamleader: boolean;
  employeeId?: string;
  employeeSource?: 'employees' | 'trainingRecords';
  employeeName?: string;
}

export interface EnrichedEmployee extends Employee {
  userId?: string; // The TLtraineeUsers ID if linked
  userEmail?: string; // The user's email if linked
}

@Injectable({ providedIn: 'root' })
export class PersonnelService {
  private readonly firestore = inject(Firestore);
  private readonly roleService = inject(RoleService);
  private readonly defaultCompanyId = environment.defaultCompanyId;

  private readonly restrictedDepartment = computed(() =>
    this.roleService.role() === 'team-leader' ? this.roleService.department() : null
  );

  getEmployees(companyId?: string | null): Observable<Employee[]> {
    const resolvedCompanyId =
      companyId === null ? null : companyId ?? this.defaultCompanyId;
    const departmentFilter = this.restrictedDepartment();

    console.log(
      '[PersonnelService] Fetching employees',
      resolvedCompanyId ? `company=${resolvedCompanyId}` : 'all companies',
      departmentFilter ? `department=${departmentFilter}` : 'all departments'
    );

  const employeesRef = collection(this.firestore, 'employees');
  const constraints = [];

    // If team leader with department filter, skip companyId filter
    // Department filtering is already restrictive enough
    if (resolvedCompanyId && !departmentFilter) {
      constraints.push(where('companyId', '==', resolvedCompanyId));
    }
    if (departmentFilter) {
      constraints.push(where('department', '==', departmentFilter));
    }
    // Only active employees
    constraints.push(where('status', '==', 'Active'));

    const q = constraints.length ? query(employeesRef, ...constraints) : employeesRef;

    return from(
      getDocs(q).then((snapshot) => {
        console.log('[PersonnelService] Employees snapshot size:', snapshot.size);
        const employees = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Employee[];

        // Debug logging to see what's being filtered
        if (snapshot.size === 0) {
          console.warn('[PersonnelService] No employees found with filters:', {
            companyId: resolvedCompanyId,
            department: departmentFilter,
            status: 'Active'
          });
          console.warn('[PersonnelService] Suggest checking: 1) status field (case-sensitive "Active"), 2) department match, 3) companyId match');
          console.warn('[PersonnelService] Try removing companyId filter or checking if department "IT" employees have the correct companyId');
        } else {
          console.log('[PersonnelService] Sample employee:', employees[0]);
          console.log('[PersonnelService] Found', employees.length, 'employees with filters');
        }

        return employees;
      })
    );
  }

  // Return only the latest record for each person based on updatedAt/createdAt
  getEmployeesCanonical(companyId?: string | null): Observable<Employee[]> {
    return this.getEmployees(companyId).pipe(map((items) => this.dedupeLatest(items)));
  }

  getTrainees(companyId?: string | null): Observable<Trainee[]> {
    const resolvedCompanyId =
      companyId === null ? null : companyId ?? this.defaultCompanyId;
    const departmentFilter = this.restrictedDepartment();

    console.log(
      '[PersonnelService] Fetching trainees',
      resolvedCompanyId ? `company=${resolvedCompanyId}` : 'all companies',
      departmentFilter ? `department=${departmentFilter}` : 'all departments'
    );

  const traineesRef = collection(this.firestore, 'trainingRecords');
  const constraints = [];

    // If team leader with department filter, skip companyId filter
    // Department filtering is already restrictive enough
    if (resolvedCompanyId && !departmentFilter) {
      constraints.push(where('companyId', '==', resolvedCompanyId));
    }
    if (departmentFilter) {
      constraints.push(where('department', '==', departmentFilter));
    }
    // For trainees, we want "Ongoing" status (not "Active")
    // Based on the data: Transferred, Scheduled, Completed, Ongoing, Cancelled
    constraints.push(where('status', '==', 'Ongoing'));

    const q = constraints.length ? query(traineesRef, ...constraints) : traineesRef;

    return from(
      getDocs(q).then((snapshot) => {
        console.log('[PersonnelService] Trainees snapshot size:', snapshot.size);
        const trainees = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trainee[];

        // Debug logging to see what's being filtered
        if (snapshot.size === 0) {
          console.warn('[PersonnelService] No trainees found with filters:', {
            companyId: resolvedCompanyId,
            department: departmentFilter,
            status: 'Ongoing'
          });
          console.warn('[PersonnelService] Suggest checking: 1) status field (should be "Ongoing" for trainees), 2) department match, 3) companyId match');
        } else {
          console.log('[PersonnelService] Sample trainee:', trainees[0]);
        }

        return trainees;
      })
    );
  }

  // Return only the latest record for each trainee based on updatedAt/createdAt
  getTraineesCanonical(companyId?: string | null): Observable<Trainee[]> {
    return this.getTrainees(companyId).pipe(map((items) => this.dedupeLatest(items)));
  }

  getEmployeesByDepartment(
    companyId?: string | null
  ): Observable<DepartmentGroup<Employee>[]> {
    return this.getEmployees(companyId).pipe(
      map((employees) => this.groupByDepartment(employees))
    );
  }

  getTraineesByDepartment(
    companyId?: string | null
  ): Observable<DepartmentGroup<Trainee>[]> {
    return this.getTrainees(companyId).pipe(
      map((trainees) => this.groupByDepartment(trainees))
    );
  }

  getAllPersonnelByDepartment(
    companyId?: string | null
  ): Observable<{
    employees: DepartmentGroup<Employee>[];
    trainees: DepartmentGroup<Trainee>[];
  }> {
    return combineLatest({
      employees: this.getEmployeesByDepartment(companyId),
      trainees: this.getTraineesByDepartment(companyId),
    });
  }

  /**
   * DIAGNOSTIC: Fetch all employees without filters to debug
   */
  getAllEmployeesUnfiltered(): Observable<any[]> {
    const employeesRef = collection(this.firestore, 'employees');
    return from(
      getDocs(employeesRef).then((snapshot) => {
        console.log('[PersonnelService] DIAGNOSTIC: Total employees in DB:', snapshot.size);
        const all = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          };
        });

        // Log first few to see structure
        console.log('[PersonnelService] DIAGNOSTIC: First 3 employees:', all.slice(0, 3));

        // Count by status
        const statusCounts = all.reduce((acc, emp: any) => {
          const status = emp.status ?? 'missing';
          acc[status] = (acc[status] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[PersonnelService] DIAGNOSTIC: Status distribution:', statusCounts);

        // Count by department
        const deptCounts = all.reduce((acc, emp: any) => {
          const dept = emp.department ?? 'missing';
          acc[dept] = (acc[dept] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[PersonnelService] DIAGNOSTIC: Department distribution:', deptCounts);

        return all;
      })
    );
  }

  /**
   * DIAGNOSTIC: Fetch all trainees without filters to debug
   */
  getAllTraineesUnfiltered(): Observable<any[]> {
    const traineesRef = collection(this.firestore, 'trainingRecords');
    return from(
      getDocs(traineesRef).then((snapshot) => {
        console.log('[PersonnelService] DIAGNOSTIC: Total trainees in DB:', snapshot.size);
        const all = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
          };
        });

        // Log first few to see structure
        console.log('[PersonnelService] DIAGNOSTIC: First 3 trainees:', all.slice(0, 3));

        // Count by status
        const statusCounts = all.reduce((acc, trainee: any) => {
          const status = trainee.status ?? 'missing';
          acc[status] = (acc[status] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[PersonnelService] DIAGNOSTIC: Status distribution:', statusCounts);

        // Count by department
        const deptCounts = all.reduce((acc, trainee: any) => {
          const dept = trainee.department ?? 'missing';
          acc[dept] = (acc[dept] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log('[PersonnelService] DIAGNOSTIC: Department distribution:', deptCounts);

        return all;
      })
    );
  }

  /**
   * Fetch TLtraineeUsers from a specific department and enrich with employee/trainee data
   * This is useful for team leaders to see which employees/trainees have user accounts
   */
  getTeamMembersWithAccounts(department?: string): Observable<EnrichedEmployee[]> {
    const targetDepartment = department ?? this.restrictedDepartment() ?? '';

    if (!targetDepartment) {
      console.warn('[PersonnelService] No department specified for getTeamMembersWithAccounts');
      return of([]);
    }

    console.log('[PersonnelService] Fetching team members with accounts for department:', targetDepartment);

    const usersRef = collection(this.firestore, 'TLtraineeUsers');
    const q = query(
      usersRef,
      where('department', '==', targetDepartment),
      where('isTeamleader', '==', false) // Exclude team leaders from the list
    );

    return from(getDocs(q)).pipe(
      switchMap(async (snapshot) => {
        console.log('[PersonnelService] Found', snapshot.size, 'users in department', targetDepartment);

        const users: TLUser[] = snapshot.docs.map((doc) => ({
          uid: doc.id,
          email: doc.data()['email'] ?? '',
          fullName: doc.data()['fullName'] ?? '',
          department: doc.data()['department'] ?? '',
          isTeamleader: !!doc.data()['isTeamleader'],
          employeeId: doc.data()['employeeId'],
          employeeSource: doc.data()['employeeSource'],
          employeeName: doc.data()['employeeName'],
        }));

        // Fetch employee/trainee data for each user
        const enrichedPromises = users.map(async (user) => {
          if (!user.employeeId || !user.employeeSource) {
            console.warn('[PersonnelService] User has no employee link:', user.uid, user.fullName);
            return null;
          }

          const empDoc = doc(this.firestore, `${user.employeeSource}/${user.employeeId}`);
          const empSnapshot = await getDoc(empDoc);

          if (!empSnapshot.exists()) {
            console.warn('[PersonnelService] Employee/trainee not found:', user.employeeSource, user.employeeId);
            return null;
          }

          const empData = empSnapshot.data();
          return {
            ...empData,
            id: user.employeeId, // Use the employeeId from TLtraineeUsers (this is the ID in employees/trainingRecords)
            userId: user.uid,
            userEmail: user.email,
            userFullName: user.fullName, // The name from TLtraineeUsers
            source: user.employeeSource, // Add source for easy reference
          } as unknown as EnrichedEmployee;
        });

        const enriched = await Promise.all(enrichedPromises);
        return enriched.filter((e) => e !== null) as EnrichedEmployee[];
      }),
      catchError((err) => {
        console.error('[PersonnelService] Error fetching team members with accounts:', err);
        return of([]);
      })
    );
  }

  private groupByDepartment<T extends { department: string }>(
    items: T[]
  ): DepartmentGroup<T>[] {
    const grouped = items.reduce(
      (acc, item) => {
        const dept = item.department || 'Unassigned';
        if (!acc[dept]) {
          acc[dept] = [];
        }
        acc[dept].push(item);
        return acc;
      },
      {} as Record<string, T[]>
    );

    return Object.entries(grouped)
      .map(([department, members]) => ({
        department,
        members,
      }))
      .sort((a, b) => a.department.localeCompare(b.department));
  }

  // ---------- Helpers: dedupe and timestamps ----------
  private normalizeName(p: any): string {
    const first = (p.firstName ?? '').toString();
    const last = (p.lastName ?? '').toString();
    return `${first} ${last}`.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private identityKey(p: any): string {
    const name = this.normalizeName(p);
    const dept = (p.department ?? '').toString().trim().toLowerCase();
    const email = (p.email ?? p.emailAddress ?? '').toString().trim().toLowerCase();
    return `${name}|${dept}|${email}`;
  }

  private toMillis(ts: any): number {
    if (!ts) return 0;
    if (typeof ts === 'object' && typeof ts.seconds === 'number') {
      return ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1_000_000);
    }
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? 0 : parsed;
  }

  private dedupeLatest<T extends any>(items: T[]): T[] {
    const map = new Map<string, T>();
    for (const p of items) {
      const key = this.identityKey(p);
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, p);
        continue;
      }
      const existingTs = this.toMillis((existing as any).updatedAt ?? (existing as any).createdAt);
      const currentTs = this.toMillis((p as any).updatedAt ?? (p as any).createdAt);
      if (currentTs >= existingTs) {
        map.set(key, p);
      }
    }
    return Array.from(map.values());
  }
}
