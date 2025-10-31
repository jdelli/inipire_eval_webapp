import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PersonnelService } from '../services/personnel.service';
import { EvaluationService, SavedEvaluation } from '../services/evaluation.service';
import { Employee, Trainee } from '../models/personnel.model';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { StatusChartComponent, ChartData } from '../components/status-chart/status-chart.component';
import { RoleService } from '../state/role.service';

// Collapsible sections for the team-leader (shell) layout
const DASHBOARD_SECTION_KEYS = [
  'kpis',
  'employeeStatus',
  'traineeProgress',
  'ratingDistribution',
  'departmentPerformance',
  'recentEvaluations',
  'topPerformers',
] as const;
type SectionKey = (typeof DASHBOARD_SECTION_KEYS)[number];

interface EvaluationWithPerson {
  id: string;
  personId: string;
  name: string;
  avatar: string;
  position: string;
  department: string;
  average: number;
  date: Date;
  type: 'employee' | 'trainee';
}

interface Performer {
  rank: number;
  name: string;
  department: string;
  average: number;
  evaluationCount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusChartComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly personnelService = inject(PersonnelService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly roleService = inject(RoleService);

  readonly employees = signal<Employee[]>([]);
  readonly trainees = signal<Trainee[]>([]);
  readonly allEvaluations = signal<EvaluationWithPerson[]>([]);
  readonly loading = signal(true);

  private storageKey(role: string) {
    return `dashboardCollapsed:${role}`;
  }

  private loadCollapsedState(): Record<string, boolean> {
    try {
      const role = this.roleService.role();
      const raw = localStorage.getItem(this.storageKey(role));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed as Record<string, boolean>;
      }
    } catch {
      // ignore read/parse errors
    }
    return {};
  }

  private saveCollapsedState(state: Record<string, boolean>): void {
    try {
      const role = this.roleService.role();
      localStorage.setItem(this.storageKey(role), JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }

  private readonly collapsedState = signal<Record<string, boolean>>(this.loadCollapsedState());

  isCollapsed(section: SectionKey): boolean {
    return !!this.collapsedState()[section];
  }

  toggleSection(section: SectionKey): void {
    const next = { ...this.collapsedState() };
    next[section] = !next[section];
    this.collapsedState.set(next);
    this.saveCollapsedState(next);
  }

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    console.log('🔄 Dashboard: Starting to load data...');
    forkJoin({
      employees: this.personnelService.getEmployees(),
      trainees: this.personnelService.getTrainees(),
    }).subscribe({
      next: ({ employees, trainees }) => {
        console.log('✅ Dashboard: Personnel loaded', {
          employeeCount: employees.length,
          traineeCount: trainees.length,
        });
        this.employees.set(employees);
        this.trainees.set(trainees);
        
        // Load evaluations for all employees and trainees
        this.loadAllEvaluations(employees, trainees);
      },
      error: (err) => {
        console.error('❌ Dashboard: Error loading data:', err);
        this.loading.set(false);
      },
    });
  }

  private loadAllEvaluations(employees: Employee[], trainees: Trainee[]): void {
    const employeeEvals$ = employees.map((emp) =>
      this.evaluationService.getLatestEmployeeEvaluation(emp.id!).pipe(
        map((evaluation) => evaluation ? {
          id: evaluation.id,
          personId: emp.id!,
          name: `${emp.firstName} ${emp.lastName}`.trim(),
          avatar: emp.photoURL || `https://ui-avatars.com/api/?name=${emp.firstName}+${emp.lastName}`,
          position: emp.position,
          department: emp.department,
          average: evaluation.average,
          date: evaluation.evaluatedAt,
          type: 'employee' as const,
        } : null),
        catchError(() => of(null))
      )
    );

    const traineeEvals$ = trainees.map((trainee) =>
      this.evaluationService.getLatestTraineeEvaluation(trainee.id!).pipe(
        map((evaluation) => evaluation ? {
          id: evaluation.id,
          personId: trainee.id!,
          name: `${trainee.firstName} ${trainee.lastName}`.trim(),
          avatar: trainee.profilePicture || `https://ui-avatars.com/api/?name=${trainee.firstName}+${trainee.lastName}`,
          position: trainee.position,
          department: trainee.department,
          average: evaluation.average,
          date: evaluation.evaluatedAt,
          type: 'trainee' as const,
        } : null),
        catchError(() => of(null))
      )
    );

    forkJoin([...employeeEvals$, ...traineeEvals$]).subscribe({
      next: (allEvals) => {
        const validEvals = allEvals.filter((e) => e !== null) as EvaluationWithPerson[];
        console.log('✅ Dashboard: Evaluations loaded', {
          totalEvaluations: validEvals.length,
        });
        this.allEvaluations.set(validEvals);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Dashboard: Error loading evaluations:', err);
        this.loading.set(false);
      },
    });
  }

  private normalizeStatus(s?: string | null): string {
    if (!s) return 'Other';
    const v = String(s).toLowerCase();
    if (v.includes('active') || v.includes('in progress')) return 'Active';
    if (v.includes('completed')) return 'Completed';
    if (v.includes('transferred') || v.includes('watch')) return 'Watch';
    if (v.includes('inactive') || v.includes('at risk')) return 'At Risk';
    return 'Other';
  }

  private calculateSummary(collection: (Employee | Trainee)[]) {
    const statusMap = new Map<string, number>();
    collection.forEach(item => {
            const status = this.normalizeStatus('status' in item ? item.status : (item as Trainee).progressStatus);
      statusMap.set(status, (statusMap.get(status) || 0) + 1);
    });
    
    const summary = {
      total: collection.length,
      counts: Object.fromEntries(statusMap),
    };
    return summary;
  }

  readonly employeeSummary = computed(() => this.calculateSummary(this.employees()));
  readonly traineeSummary = computed(() => this.calculateSummary(this.trainees()));

  private createChartData(summary: { counts: Record<string, number> }): ChartData[] {
    return Object.entries(summary.counts).map(([name, value]) => ({ name, value }));
  }

  readonly employeeChartData = computed(() => this.createChartData(this.employeeSummary()));
  readonly traineeChartData = computed(() => this.createChartData(this.traineeSummary()));

  readonly recentEvaluations = computed<EvaluationWithPerson[]>(() => {
    return this.allEvaluations()
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  });

  readonly topPerformers = computed<Performer[]>(() => {
    const performersMap = new Map<string, { sum: number; count: number; person: EvaluationWithPerson }>();
    
    this.allEvaluations().forEach((evaluation) => {
      const key = evaluation.personId;
      if (performersMap.has(key)) {
        const existing = performersMap.get(key)!;
        existing.sum += evaluation.average;
        existing.count += 1;
      } else {
        performersMap.set(key, {
          sum: evaluation.average,
          count: 1,
          person: evaluation,
        });
      }
    });

    const performers = Array.from(performersMap.values())
      .map(({ sum, count, person }) => ({
        name: person.name,
        department: person.department,
        average: sum / count,
        evaluationCount: count,
        rank: 0,
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 5)
      .map((performer, index) => ({
        ...performer,
        rank: index + 1,
      }));

    return performers;
  });

  readonly averageRatingTrend = computed<ChartData[]>(() => {
    const ratings = [1, 2, 3, 4, 5];
    const ratingCounts = new Map<number, number>();
    
    this.allEvaluations().forEach((evaluation) => {
      const rounded = Math.round(evaluation.average);
      ratingCounts.set(rounded, (ratingCounts.get(rounded) || 0) + 1);
    });

    return ratings.map(rating => ({
      name: `${rating} Star${rating !== 1 ? 's' : ''}`,
      value: ratingCounts.get(rating) || 0,
    }));
  });

  readonly departmentPerformance = computed<ChartData[]>(() => {
    const deptMap = new Map<string, { sum: number; count: number }>();
    
    this.allEvaluations().forEach((evaluation) => {
      const dept = evaluation.department || 'Unassigned';
      if (deptMap.has(dept)) {
        const existing = deptMap.get(dept)!;
        existing.sum += evaluation.average;
        existing.count += 1;
      } else {
        deptMap.set(dept, { sum: evaluation.average, count: 1 });
      }
    });

    return Array.from(deptMap.entries())
      .map(([name, { sum, count }]) => ({
        name,
        value: Number((sum / count).toFixed(2)),
      }))
      .sort((a, b) => b.value - a.value);
  });

  readonly overallAverageRating = computed<string>(() => {
    const evals = this.allEvaluations();
    if (evals.length === 0) return '0.0';
    const sum = evals.reduce((acc, e) => acc + e.average, 0);
    return (sum / evals.length).toFixed(1);
  });
}
