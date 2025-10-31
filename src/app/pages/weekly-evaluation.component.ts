import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PersonnelService } from '../services/personnel.service';
import { EvaluationService } from '../services/evaluation.service';
import { Employee, Trainee } from '../models/personnel.model';
import { forkJoin } from 'rxjs';
import { StarRatingComponent } from '../components/star-rating/star-rating.component';

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
  imports: [CommonModule, ReactiveFormsModule, StarRatingComponent],
  templateUrl: './weekly-evaluation.component.html',
  styles: ``,
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

  private filterAndGroup(rows: PersonRow[], filter: string): DepartmentGroupRow[] {
    const q = filter.trim().toLowerCase();
    const filteredRows = !q
      ? rows
      : rows.filter((row) => {
          const hay = [row.name, row.position, row.department].join(' ').toLowerCase();
          return hay.includes(q);
        });
    return this.groupRowsByDepartment(filteredRows);
  }

  readonly filteredEmployeeGroups = computed(() => {
    const employeeRows = this.rows().filter((row) => row.type === 'Employee');
    return this.filterAndGroup(employeeRows, this.employeeFilter());
  });

  readonly filteredTraineeGroups = computed(() => {
    const traineeRows = this.rows().filter((row) => row.type === 'Trainee');
    return this.filterAndGroup(traineeRows, this.traineeFilter());
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

  getFullName(person: Employee | Trainee | null): string {
    if (!person) return '';
    return `${person.firstName || ''} ${person.lastName || ''}`.trim();
  }

  getAverageRating(): number {
    const { performance, productivity, teamwork, initiative } = this.evaluationForm.value;
    return (performance! + productivity! + teamwork! + initiative!) / 4;
  }
}
