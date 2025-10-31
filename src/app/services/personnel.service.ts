import { Injectable, inject } from '@angular/core';
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

@Injectable({ providedIn: 'root' })
export class PersonnelService {
  private readonly firestore = inject(Firestore);
  private readonly defaultCompanyId = environment.defaultCompanyId;

  getEmployees(companyId?: string | null): Observable<Employee[]> {
    const resolvedCompanyId = companyId === null ? null : (companyId ?? this.defaultCompanyId);
    console.log('🔍 PersonnelService: Fetching employees', resolvedCompanyId ? `for company: ${resolvedCompanyId}` : '(all companies)');
    const employeesRef = collection(this.firestore, 'employees');
    const q = resolvedCompanyId
      ? query(employeesRef, where('companyId', '==', resolvedCompanyId))
      : employeesRef;

    return from(
      getDocs(q).then((snapshot) => {
        console.log('📦 Employees snapshot received, size:', snapshot.size);
        const employees = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Employee[];
        console.log('👥 Employees parsed:', employees.length);
        return employees;
      })
    );
  }

  getTrainees(companyId?: string | null): Observable<Trainee[]> {
    const resolvedCompanyId = companyId === null ? null : (companyId ?? this.defaultCompanyId);
    console.log('🔍 PersonnelService: Fetching trainees', resolvedCompanyId ? `for company: ${resolvedCompanyId}` : '(all companies)');
    const traineesRef = collection(this.firestore, 'trainingRecords');
    const q = resolvedCompanyId
      ? query(traineesRef, where('companyId', '==', resolvedCompanyId))
      : traineesRef;

    return from(
      getDocs(q).then((snapshot) => {
        console.log('📦 Trainees snapshot received, size:', snapshot.size);
        const trainees = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Trainee[];
        console.log('🎓 Trainees parsed:', trainees.length);
        return trainees;
      })
    );
  }

  getEmployeesByDepartment(companyId?: string | null): Observable<DepartmentGroup<Employee>[]> {
    return this.getEmployees(companyId).pipe(
      map((employees) => this.groupByDepartment(employees))
    );
  }

  getTraineesByDepartment(companyId?: string | null): Observable<DepartmentGroup<Trainee>[]> {
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
