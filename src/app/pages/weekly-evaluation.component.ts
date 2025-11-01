import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersonnelService } from '../services/personnel.service';
import { EvaluationService } from '../services/evaluation.service';
import { Employee, Trainee } from '../models/personnel.model';
import { forkJoin } from 'rxjs';
import { StarRatingComponent } from '../components/star-rating/star-rating.component';
import { PaginatorComponent } from '../components/paginator/paginator.component';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';

type PersonType = 'employee' | 'trainee';
interface PersonRow {
  id: string;
  type: 'Employee' | 'Trainee';
  name: string;
  department: string;
  position: string;
  status?: string;
  avatar?: string;
  raw: Employee | Trainee;
}

interface DepartmentGroupRow {
  department: string;
  members: PersonRow[];
  total: number;
}

@Component({
  selector: 'app-weekly-evaluation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StarRatingComponent,
    PaginatorComponent,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatDividerModule,
    MatBadgeModule,
  ],
  templateUrl: './weekly-evaluation.component.html',
  styles: `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-8px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .animate-fade-in {
      animation: fadeIn 0.3s ease-out;
    }

    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    .animate-scale-in {
      animation: scaleIn 0.2s ease-out;
    }

    .row-highlight {
      position: relative;
      transition: all 0.2s ease-in-out;
    }

    .row-highlight::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(to bottom, transparent, var(--primary), transparent);
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
    }

    .row-highlight:hover::before {
      opacity: 1;
    }

    .dept-header {
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s ease-in-out;
    }

    .dept-header:hover {
      background-color: rgba(0, 0, 0, 0.02);
    }

    .chevron-icon {
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .status-pulse {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .evaluate-btn {
      transition: all 0.2s ease-in-out;
    }

    .evaluate-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .evaluate-btn:active {
      transform: translateY(0);
    }
  `,
})
export class WeeklyEvaluationComponent {
  private readonly personnelService = inject(PersonnelService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly fb = inject(FormBuilder);

  readonly employees = signal<Employee[]>([]);
  readonly trainees = signal<Trainee[]>([]);
  readonly loading = signal(true);
  readonly showModal = signal(false);
  readonly selectedPerson = signal<Employee | Trainee | null>(null);
  readonly personType = signal<PersonType>('employee');

  readonly employeeFilter = signal('');
  readonly traineeFilter = signal('');

  readonly employeeCurrentPage = signal(1);
  readonly traineeCurrentPage = signal(1);
  readonly itemsPerPage = 20;

  readonly expandedDepartments = signal<Set<string>>(new Set());
  readonly hoveredRow = signal<string | null>(null);

  readonly rows = computed<PersonRow[]>(() => {
    const empRows: PersonRow[] = this.employees().map((e) => ({
      id: e.id ?? '',
      type: 'Employee',
      name: this.getFullName(e),
      department: e.department || 'N/A',
      position: e.position || 'N/A',
      status: e.status,
      avatar: (e as any).photoURL,
      raw: e,
    }));

    const traineeRows: PersonRow[] = this.trainees().map((t) => ({
      id: t.id ?? '',
      type: 'Trainee',
      name: this.getFullName(t),
      department: t.department || 'N/A',
      position: t.position || 'N/A',
      status: t.progressStatus || t.status,
      avatar: (t as any).profilePicture,
      raw: t,
    }));

    return [...empRows, ...traineeRows];
  });

  private groupRowsByDepartment(rows: PersonRow[]): DepartmentGroupRow[] {
    const map = new Map<string, PersonRow[]>();
    for (const r of rows) {
      const dept = (r.department || 'Unassigned').trim();
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(r);
    }
    const groups: DepartmentGroupRow[] = [];
    for (const [department, members] of map.entries()) {
      const sorted = members.slice().sort((a, b) => a.name.localeCompare(b.name));
      groups.push({ department, members: sorted, total: sorted.length });
    }
    return groups.sort((a, b) => a.department.localeCompare(b.department));
  }

  private filterRows(rows: PersonRow[], filter: string): PersonRow[] {
    const query = filter.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      const haystack = [row.name, row.position, row.department].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }

  private paginateRows(rows: PersonRow[], currentPage: number): PersonRow[] {
    if (!rows.length) return [];

    const maxPage = Math.max(1, Math.ceil(rows.length / this.itemsPerPage));
    const safePage = Math.min(Math.max(1, currentPage), maxPage);
    const startIndex = (safePage - 1) * this.itemsPerPage;

    return rows.slice(startIndex, startIndex + this.itemsPerPage);
  }

  private sortRows(rows: PersonRow[]): PersonRow[] {
    return rows
      .slice()
      .sort((a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name));
  }

  readonly filteredEmployeeRows = computed(() => {
    const employeeRows = this.rows().filter((row) => row.type === 'Employee');
    return this.sortRows(this.filterRows(employeeRows, this.employeeFilter()));
  });

  readonly paginatedEmployeeGroups = computed(() => {
    const paginatedRows = this.paginateRows(this.filteredEmployeeRows(), this.employeeCurrentPage());
    return this.groupRowsByDepartment(paginatedRows);
  });

  readonly filteredTraineeRows = computed(() => {
    const traineeRows = this.rows().filter((row) => row.type === 'Trainee');
    return this.sortRows(this.filterRows(traineeRows, this.traineeFilter()));
  });

  readonly paginatedTraineeGroups = computed(() => {
    const paginatedRows = this.paginateRows(this.filteredTraineeRows(), this.traineeCurrentPage());
    return this.groupRowsByDepartment(paginatedRows);
  });

  readonly evaluationForm = this.fb.nonNullable.group({
    performance: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    productivity: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    teamwork: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    initiative: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
    comments: ['', Validators.required],
    strengths: [''],
    improvements: [''],
  });

  constructor() {
    this.loadPersonnel();

    effect(() => {
      const totalPages = Math.max(1, Math.ceil(this.filteredEmployeeRows().length / this.itemsPerPage));
      const current = this.employeeCurrentPage();
      if (current > totalPages) {
        this.employeeCurrentPage.set(totalPages);
      }
    });

    effect(() => {
      const totalPages = Math.max(1, Math.ceil(this.filteredTraineeRows().length / this.itemsPerPage));
      const current = this.traineeCurrentPage();
      if (current > totalPages) {
        this.traineeCurrentPage.set(totalPages);
      }
    });

    // Auto-expand departments when data changes
    effect(() => {
      const empGroups = this.paginatedEmployeeGroups();
      const traineeGroups = this.paginatedTraineeGroups();
      const expanded = new Set<string>();

      empGroups.forEach(g => expanded.add(`employee-${g.department}`));
      traineeGroups.forEach(g => expanded.add(`trainee-${g.department}`));

      this.expandedDepartments.set(expanded);
    });
  }

  refreshData(): void {
    this.loadPersonnel();
  }

  loadPersonnel(): void {
    this.loading.set(true);
    console.log('🔄 Weekly Evaluation: Starting to load personnel...');
    forkJoin({
      employees: this.personnelService.getEmployees(),
      trainees: this.personnelService.getTrainees(),
    }).subscribe({
      next: ({ employees, trainees }) => {
        console.log('✅ Weekly Evaluation: Data loaded', {
          employeeCount: employees.length,
          traineeCount: trainees.length,
        });
        console.log('📊 Sample employee:', employees[0]);
        console.log('📊 Sample trainee:', trainees[0]);
        const dedupedEmployees = this.dedupeByKey(employees, (e) => e.id);
        const dedupedTrainees = this.dedupeByKey(trainees, (t) => t.id);
        console.log('After deduplication:', {
          employeeCount: dedupedEmployees.length,
          traineeCount: dedupedTrainees.length,
        });
        this.employees.set(dedupedEmployees);
        this.trainees.set(dedupedTrainees);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error fetching personnel:', err);
        this.loading.set(false);
      },
    });
  }

  private dedupeByKey<T>(items: T[], keyFn: (item: T) => string | undefined | null): T[] {
    const seen = new Map<string, T>();
    for (const item of items) {
      const key = keyFn(item);
      if (key && !seen.has(key)) {
        seen.set(key, item);
      }
    }
    return Array.from(seen.values());
  }

  openEvaluationModal(person: Employee | Trainee, type: PersonType): void {
    this.selectedPerson.set(person);
    this.personType.set(type);
    this.evaluationForm.reset({
      performance: 3,
      productivity: 3,
      teamwork: 3,
      initiative: 3,
      comments: '',
      strengths: '',
      improvements: '',
    });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedPerson.set(null);
  }

  submitEvaluation(): void {
    if (this.evaluationForm.invalid) {
      return;
    }

    const person = this.selectedPerson();
    if (!person || !person.id) {
      console.error('❌ Cannot submit evaluation: Invalid person or missing ID');
      return;
    }

    const formValue = this.evaluationForm.getRawValue();
    const average = this.getAverageRating();

    const evaluationData = {
      performance: formValue.performance,
      productivity: formValue.productivity,
      teamwork: formValue.teamwork,
      initiative: formValue.initiative,
      comments: formValue.comments,
      strengths: formValue.strengths,
      improvements: formValue.improvements,
      average: average,
    };

    console.log('💾 Saving evaluation for:', {
      person: this.getFullName(person),
      type: this.personType(),
      data: evaluationData,
    });

    const saveObservable =
      this.personType() === 'employee'
        ? this.evaluationService.saveEmployeeEvaluation(person.id, evaluationData)
        : this.evaluationService.saveTraineeEvaluation(person.id, evaluationData);

    saveObservable.subscribe({
      next: (evaluationId) => {
        console.log('✅ Evaluation saved successfully with ID:', evaluationId);
        alert('Evaluation submitted successfully!');
        this.closeModal();
      },
      error: (err) => {
        console.error('❌ Error saving evaluation:', err);
        alert('Failed to save evaluation. Please try again.');
      },
    });
  }

  onEmployeePageChange(page: number): void {
    const maxPage = Math.max(1, Math.ceil(this.filteredEmployeeRows().length / this.itemsPerPage));
    const nextPage = Math.min(Math.max(1, page), maxPage);
    this.employeeCurrentPage.set(nextPage);
  }

  onTraineePageChange(page: number): void {
    const maxPage = Math.max(1, Math.ceil(this.filteredTraineeRows().length / this.itemsPerPage));
    const nextPage = Math.min(Math.max(1, page), maxPage);
    this.traineeCurrentPage.set(nextPage);
  }

  onEmployeeFilterChange(value: string): void {
    this.employeeFilter.set(value);
    this.employeeCurrentPage.set(1);
  }

  onTraineeFilterChange(value: string): void {
    this.traineeFilter.set(value);
    this.traineeCurrentPage.set(1);
  }

  getStatusBadgeClass(status?: string | null): string {
    const normalized = (status || '').trim().toLowerCase();

    switch (normalized) {
      case 'active':
      case 'in progress':
        return 'bg-emerald-500/10 text-emerald-600';
      case 'scheduled':
      case 'pending':
        return 'bg-sky-500/10 text-sky-600';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600';
      case 'transferred':
      case 'watch':
        return 'bg-amber-500/10 text-amber-600';
      case 'inactive':
      case 'at risk':
        return 'bg-rose-500/10 text-rose-600';
      default:
        return 'bg-muted text-muted-foreground';
    }
  }

  getFullName(person: Employee | Trainee | null): string {
    if (!person) return '';
    return `${person.firstName || ''} ${person.lastName || ''}`.trim();
  }

  getAverageRating(): number {
    const { performance, productivity, teamwork, initiative } = this.evaluationForm.value;
    return (performance! + productivity! + teamwork! + initiative!) / 4;
  }

  trackDepartment(_index: number, group: DepartmentGroupRow): string {
    return group.department;
  }

  trackRow(_index: number, row: PersonRow): string {
    return row.id;
  }

  toggleDepartment(type: 'employee' | 'trainee', department: string): void {
    const key = `${type}-${department}`;
    const expanded = this.expandedDepartments();
    const newExpanded = new Set(expanded);
    
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    
    this.expandedDepartments.set(newExpanded);
  }

  isDepartmentExpanded(type: 'employee' | 'trainee', department: string): boolean {
    const key = `${type}-${department}`;
    return this.expandedDepartments().has(key);
  }

  setHoveredRow(rowId: string | null): void {
    this.hoveredRow.set(rowId);
  }
}
