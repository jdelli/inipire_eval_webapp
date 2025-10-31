import { Injectable, computed, inject } from '@angular/core';
import {
  Firestore,
  collection,
  getDocs,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, from, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Employee, Trainee, DepartmentGroup } from '../models/personnel.model';
import { environment } from '../../environments/environment';
import { RoleService } from '../state/role.service';

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

    if (resolvedCompanyId) {
      constraints.push(where('companyId', '==', resolvedCompanyId));
    }
    if (departmentFilter) {
      constraints.push(where('department', '==', departmentFilter));
    }

    const q = constraints.length ? query(employeesRef, ...constraints) : employeesRef;

    return from(
      getDocs(q).then((snapshot) => {
        console.log('[PersonnelService] Employees snapshot size:', snapshot.size);
        const employees = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Employee[];
        return employees;
      })
    );
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

    if (resolvedCompanyId) {
      constraints.push(where('companyId', '==', resolvedCompanyId));
    }
    if (departmentFilter) {
      constraints.push(where('department', '==', departmentFilter));
    }

    const q = constraints.length ? query(traineesRef, ...constraints) : traineesRef;

    return from(
      getDocs(q).then((snapshot) => {
        console.log('[PersonnelService] Trainees snapshot size:', snapshot.size);
        const trainees = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trainee[];
        return trainees;
      })
    );
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
}
