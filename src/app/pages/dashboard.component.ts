import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PersonnelService } from '../services/personnel.service';
import { Employee, Trainee } from '../models/personnel.model';
import { forkJoin } from 'rxjs';
import { StatusChartComponent, ChartData } from '../components/status-chart/status-chart.component';

interface Evaluation {
  id: string;
  personId: string;
  name: string;
  avatar: string;
  position: string;
  average: number;
  date: Date;
}

interface Performer {
  rank: number;
  name: string;
  department: string;
  average: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StatusChartComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly personnelService = inject(PersonnelService);

  readonly employees = signal<Employee[]>([]);
  readonly trainees = signal<Trainee[]>([]);
  readonly evaluations = signal<Evaluation[]>([]); // This would be fetched from a service
  readonly loading = signal(true);

  constructor() {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    forkJoin({
      employees: this.personnelService.getEmployees(),
      trainees: this.personnelService.getTrainees(),
      // evaluations: this.personnelService.getEvaluations(), // Assuming this method exists
    }).subscribe({
      next: ({ employees, trainees }) => {
        this.employees.set(employees);
        this.trainees.set(trainees);
        // this.evaluations.set(this.processEvaluations(evaluations));
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
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

  readonly recentEvaluations = computed<Evaluation[]>(() => {
    // Mock data until service is ready
    return [
      { id: '1', personId: '1', name: 'Angela Rosero', avatar: 'https://ui-avatars.com/api/?name=Angela+Rosero', position: 'Admin Assistant', average: 4.5, date: new Date() },
      { id: '2', personId: '2', name: 'Kristel Anne Marie Sopranes Gabriel', avatar: 'https://ui-avatars.com/api/?name=Kristel+Anne', position: 'Assist Internal Audit', average: 4.2, date: new Date(Date.now() - 86400000) },
    ];
  });

  readonly topPerformers = computed<Performer[]>(() => {
    // Mock data until service is ready
    return [
      { rank: 1, name: 'Benedick Labaya Cervantes', department: 'IT Department', average: 4.8 },
      { rank: 2, name: 'Angela Rosero', department: 'Admin Department', average: 4.5 },
      { rank: 3, name: 'Gerlie Fabian De Asis', department: 'HR Department', average: 4.4 },
    ];
  });
}
