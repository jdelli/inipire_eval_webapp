import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { PersonnelService } from '../services/personnel.service';
import { DepartmentGroup, Employee, Trainee } from '../models/personnel.model';

@Component({
  selector: 'app-personnel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './personnel.component.html',
  styles: ``,
})
export class PersonnelComponent {
  private readonly personnelService = inject(PersonnelService);

  readonly employeeGroups = signal<DepartmentGroup<Employee>[]>([]);
  readonly traineeGroups = signal<DepartmentGroup<Trainee>[]>([]);
  readonly loading = signal(true);
  readonly activeTab = signal<'employees' | 'trainees'>('employees');

  constructor() {
    this.loadPersonnel();
  }

  loadPersonnel(): void {
    this.loading.set(true);
  this.personnelService.getAllPersonnelByDepartment().subscribe({
      next: ({ employees, trainees }) => {
        this.employeeGroups.set(employees);
        this.traineeGroups.set(trainees);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error fetching personnel:', err);
        this.loading.set(false);
      },
    });
  }

  setTab(tab: 'employees' | 'trainees'): void {
    this.activeTab.set(tab);
  }

  getFullName(person: Employee | Trainee): string {
    const first = person.firstName || '';
    const middle = person.middleName || '';
    const last = person.lastName || '';
    return `${first} ${middle} ${last}`.trim();
  }

  getTotalCount(groups: DepartmentGroup<any>[]): number {
    return groups.reduce((sum, group) => sum + group.members.length, 0);
  }
}
