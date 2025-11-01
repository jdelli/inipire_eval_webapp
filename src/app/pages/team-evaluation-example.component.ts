import { CommonModule } from '@angular/common';
import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { EmployeeSelectorComponent, SelectedEmployee } from '../components/employee-selector/employee-selector.component';
import { UserEmployeeService } from '../services/user-employee.service';
import { EvaluationService } from '../services/evaluation.service';
import { AuthService } from '../services/auth.service';

/**
 * Example component for team leaders to evaluate their team members
 */
@Component({
  selector: 'app-team-evaluation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, EmployeeSelectorComponent],
  template: `
    <div class="p-6 max-w-3xl mx-auto">
      <h2 class="text-2xl font-bold mb-4">Team Member Evaluation</h2>
      
      <!-- Current User Info -->
      <div *ngIf="userProfile$ | async as profile" class="mb-6 p-4 bg-blue-50 rounded-lg">
        <p class="text-sm"><strong>Evaluator:</strong> {{ profile.fullName }}</p>
        <p class="text-sm"><strong>Department:</strong> {{ profile.department }}</p>
        <p class="text-sm" *ngIf="!profile.isTeamleader" class="text-amber-600">
          ⚠️ You are not marked as a team leader
        </p>
      </div>

      <!-- Step 1: Select Employee -->
      <div class="mb-6 p-4 border rounded-lg">
        <h3 class="text-lg font-semibold mb-3">Step 1: Search & Select Employee/Trainee</h3>
        <app-employee-selector
          (employeeSelected)="onEmployeeSelected($event)"
        ></app-employee-selector>

        <div *ngIf="selectedEmployee()" class="mt-4 p-3 bg-green-50 rounded">
          <p class="text-sm font-medium">Selected: {{ selectedEmployee()?.name }}</p>
          <p class="text-xs text-gray-600">
            Type: {{ selectedEmployee()?.source === 'employees' ? 'Employee' : 'Trainee' }}
          </p>
        </div>
      </div>

      <!-- Step 2: Evaluation Form -->
      <div class="mb-6 p-4 border rounded-lg" *ngIf="selectedEmployee()">
        <h3 class="text-lg font-semibold mb-3">Step 2: Submit Evaluation</h3>
        
        <form [formGroup]="evalForm" (ngSubmit)="submitEvaluation()" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <label class="flex flex-col">
              <span class="text-sm font-medium mb-1">Performance (1-5)</span>
              <input 
                type="number" 
                formControlName="performance" 
                min="1" 
                max="5"
                class="border rounded px-3 py-2"
              />
            </label>

            <label class="flex flex-col">
              <span class="text-sm font-medium mb-1">Productivity (1-5)</span>
              <input 
                type="number" 
                formControlName="productivity" 
                min="1" 
                max="5"
                class="border rounded px-3 py-2"
              />
            </label>

            <label class="flex flex-col">
              <span class="text-sm font-medium mb-1">Teamwork (1-5)</span>
              <input 
                type="number" 
                formControlName="teamwork" 
                min="1" 
                max="5"
                class="border rounded px-3 py-2"
              />
            </label>

            <label class="flex flex-col">
              <span class="text-sm font-medium mb-1">Initiative (1-5)</span>
              <input 
                type="number" 
                formControlName="initiative" 
                min="1" 
                max="5"
                class="border rounded px-3 py-2"
              />
            </label>
          </div>

          <label class="flex flex-col">
            <span class="text-sm font-medium mb-1">Comments</span>
            <textarea 
              formControlName="comments" 
              rows="3"
              class="border rounded px-3 py-2"
              placeholder="Overall feedback and observations..."
            ></textarea>
          </label>

          <label class="flex flex-col">
            <span class="text-sm font-medium mb-1">Strengths</span>
            <textarea 
              formControlName="strengths" 
              rows="2"
              class="border rounded px-3 py-2"
              placeholder="What this person does well..."
            ></textarea>
          </label>

          <label class="flex flex-col">
            <span class="text-sm font-medium mb-1">Areas for Improvement</span>
            <textarea 
              formControlName="improvements" 
              rows="2"
              class="border rounded px-3 py-2"
              placeholder="Areas where this person can grow..."
            ></textarea>
          </label>

          <div *ngIf="successMessage()" class="p-3 bg-green-100 text-green-800 rounded">
            {{ successMessage() }}
          </div>

          <div *ngIf="errorMessage()" class="p-3 bg-red-100 text-red-800 rounded">
            {{ errorMessage() }}
          </div>

          <button 
            type="submit"
            [disabled]="evalForm.invalid || loading() || !selectedEmployee()"
            class="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {{ loading() ? 'Saving...' : 'Submit Evaluation' }}
          </button>
        </form>
      </div>

      <!-- View Employee's Evaluation History -->
      <div class="p-4 border rounded-lg" *ngIf="selectedEmployee()">
        <h3 class="text-lg font-semibold mb-3">Evaluation History</h3>
        <button 
          (click)="loadEmployeeEvaluations()"
          class="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Load Previous Evaluations
        </button>

        <div *ngIf="evaluationsLoading()" class="text-gray-600">Loading...</div>

        <div *ngIf="evaluations().length === 0 && !evaluationsLoading()" class="text-gray-600">
          No previous evaluations found
        </div>

        <div class="space-y-4">
          <div 
            *ngFor="let eval of evaluations()" 
            class="border rounded p-4 bg-gray-50"
          >
            <div class="flex justify-between items-start mb-2">
              <div>
                <p class="font-medium">Average: {{ eval.average }}/5</p>
                <p class="text-sm text-gray-600">
                  {{ eval.evaluatedAt | date:'medium' }}
                </p>
                <p class="text-xs text-gray-500" *ngIf="eval.evaluatedBy">
                  Evaluated by: {{ eval.evaluatedBy }}
                </p>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm mb-2">
              <p>Performance: {{ eval.performance }}</p>
              <p>Productivity: {{ eval.productivity }}</p>
              <p>Teamwork: {{ eval.teamwork }}</p>
              <p>Initiative: {{ eval.initiative }}</p>
            </div>
            <p class="text-sm mt-2"><strong>Comments:</strong> {{ eval.comments }}</p>
            <p class="text-sm"><strong>Strengths:</strong> {{ eval.strengths }}</p>
            <p class="text-sm"><strong>Improvements:</strong> {{ eval.improvements }}</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class TeamEvaluationComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userEmployeeService = inject(UserEmployeeService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly authService = inject(AuthService);

  readonly userProfile$ = this.authService.profile$;
  readonly loading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly evaluations = signal<any[]>([]);
  readonly evaluationsLoading = signal(false);
  readonly selectedEmployee = signal<SelectedEmployee | null>(null);

  readonly evalForm = this.fb.nonNullable.group({
    performance: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    productivity: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    teamwork: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    initiative: [0, [Validators.required, Validators.min(1), Validators.max(5)]],
    comments: ['', Validators.required],
    strengths: ['', Validators.required],
    improvements: ['', Validators.required],
  });

  ngOnInit(): void {
    // Component initialization - no department pre-selection needed
  }

  onEmployeeSelected(employee: SelectedEmployee | null): void {
    this.selectedEmployee.set(employee);
    this.evaluations.set([]);
    this.evalForm.reset();
    
    if (employee) {
      this.loadEmployeeEvaluations();
    }
  }

  submitEvaluation(): void {
    const employee = this.selectedEmployee();
    
    if (this.evalForm.invalid || !employee) {
      this.evalForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const formValues = this.evalForm.getRawValue();
    const average = (
      formValues.performance +
      formValues.productivity +
      formValues.teamwork +
      formValues.initiative
    ) / 4;

    // Get current user info for evaluatedBy field
    this.authService.profile$.subscribe((profile) => {
      if (!profile) {
        this.errorMessage.set('You must be logged in to submit evaluations');
        this.loading.set(false);
        return;
      }

      const evaluationData = {
        ...formValues,
        average: Math.round(average * 100) / 100,
        evaluatedBy: profile.fullName,
      };

      this.userEmployeeService
        .saveEvaluationForEmployee(employee.id, employee.source, evaluationData)
        .subscribe({
          next: (evalId) => {
            console.log('Evaluation saved with ID:', evalId);
            this.loading.set(false);
            this.successMessage.set(
              `Evaluation for ${employee.name} submitted successfully!`
            );
            this.evalForm.reset();
            
            // Reload evaluations to show the new one
            this.loadEmployeeEvaluations();
            
            // Clear success message after 3 seconds
            setTimeout(() => this.successMessage.set(null), 3000);
          },
          error: (err: any) => {
            console.error('Error saving evaluation:', err);
            this.loading.set(false);
            this.errorMessage.set(
              err.message || 'Failed to save evaluation. Please try again.'
            );
          },
        });
    });
  }

  loadEmployeeEvaluations(): void {
    const employee = this.selectedEmployee();
    if (!employee) return;

    this.evaluationsLoading.set(true);
    
    const evaluations$ = employee.source === 'employees'
      ? this.evaluationService.getEmployeeEvaluations(employee.id)
      : this.evaluationService.getTraineeEvaluations(employee.id);

    evaluations$.subscribe({
      next: (evals) => {
        this.evaluations.set(evals);
        this.evaluationsLoading.set(false);
        console.log('Loaded evaluations:', evals);
      },
      error: (err: any) => {
        console.error('Error loading evaluations:', err);
        this.evaluationsLoading.set(false);
        this.errorMessage.set('Failed to load evaluations.');
      },
    });
  }
}
