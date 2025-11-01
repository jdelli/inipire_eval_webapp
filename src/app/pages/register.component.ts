import { CommonModule } from '@angular/common';
import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { EmployeeSelectorComponent, SelectedEmployee } from '../components/employee-selector/employee-selector.component';
import { EmployeeSubcollectionService } from '../services/employee-subcollection.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, EmployeeSelectorComponent],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 text-sm text-foreground">
      <div class="w-full max-w-md rounded-3xl border bg-card/95 p-8 shadow-lg">
        <div class="mb-6 text-center">
          <h1 class="text-2xl font-semibold text-foreground">Create your account</h1>
          <p class="mt-2 text-xs text-muted-foreground">
            Register to access daily reporting and incident tracking.
          </p>
        </div>

        <form class="space-y-5" [formGroup]="form" (ngSubmit)="submit()">
          <!-- Two Column Grid for Basic Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Email
                <input
                  type="email"
                  formControlName="email"
                  class="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/20 transition focus:ring-2"
                  placeholder="you@example.com"
                />
              </label>
              <p *ngIf="email.invalid && (email.dirty || email.touched)" class="mt-1 text-[11px] text-destructive">
                Enter a valid email address.
              </p>
            </div>

            <div>
              <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Password
                <input
                  type="password"
                  formControlName="password"
                  class="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/20 transition focus:ring-2"
                  placeholder="At least 6 characters"
                />
              </label>
              <p *ngIf="password.invalid && (password.dirty || password.touched)" class="mt-1 text-[11px] text-destructive">
                Password must be at least 6 characters.
              </p>
            </div>

            <div>
              <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Complete name
                <input
                  type="text"
                  formControlName="fullName"
                  class="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/20 transition focus:ring-2"
                  placeholder="Jordan Chen"
                />
              </label>
              <p *ngIf="fullName.invalid && (fullName.dirty || fullName.touched)" class="mt-1 text-[11px] text-destructive">
                Please enter your full name (min 3 characters).
              </p>
            </div>

            <div>
              <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                Department
                <select
                  formControlName="department"
                  class="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/20 transition focus:ring-2"
                >
                  <option value="" disabled [selected]="!department.value">Select department</option>
                  <option *ngFor="let dept of departments" [value]="dept">{{ dept }}</option>
                </select>
              </label>
              <p *ngIf="department.invalid && (department.dirty || department.touched)" class="mt-1 text-[11px] text-destructive">
                Department is required.
              </p>
            </div>
          </div>

          <!-- Employee Selector - Full Width -->
          <div class="border-t border-border pt-4">
            <app-employee-selector
              (employeeSelected)="onEmployeeSelected($event)"
            ></app-employee-selector>
          </div>

          <!-- Selected Employee Display -->
          <div *ngIf="selectedEmployee()" class="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <h4 class="text-xs font-semibold text-foreground mb-2">Selected Employee/Trainee:</h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              <p><span class="font-medium">Name:</span> {{ selectedEmployee()?.name }}</p>
              <p><span class="font-medium">Type:</span> {{ selectedEmployee()?.source === 'employees' ? 'Employee' : 'Trainee' }}</p>
              <p><span class="font-medium">Department:</span> {{ selectedEmployee()?.department }}</p>
            </div>
          </div>

          <!-- Team Leader Toggle -->
          <label class="flex items-start gap-3 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
            <input
              type="checkbox"
              formControlName="isTeamleader"
              class="mt-1 size-4 rounded border-input text-primary focus:ring-primary/30"
            />
            <span>
              <span class="block font-semibold text-foreground">Team leader access</span>
              <span class="mt-1 block leading-5">
                Check this if you manage a team and need leader capabilities.
              </span>
            </span>
          </label>

          <!-- Messages -->
          <div *ngIf="error()" class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            {{ error() }}
          </div>
          <div *ngIf="success()" class="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-600">
            {{ success() }}
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            class="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
            [disabled]="form.invalid || loading()"
          >
            <ng-container *ngIf="loading(); else registerLabel">Creating account...</ng-container>
            <ng-template #registerLabel>Register</ng-template>
          </button>
        </form>

        <p class="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?
          <a routerLink="/login" class="font-semibold text-primary hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly employeeSubcollectionService = inject(EmployeeSubcollectionService);

  readonly departments = [
    'IT',
    'Admin',
    'IT Solution',
    'Real State',
    'Telemarketers',
    'Inspire Wallet',
    'I-Beauty',
  ];
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly selectedEmployee = signal<SelectedEmployee | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    department: ['', Validators.required],
    isTeamleader: [false],
  });

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  get fullName() {
    return this.form.controls.fullName;
  }

  get department() {
    return this.form.controls.department;
  }

  onEmployeeSelected(employee: SelectedEmployee | null): void {
    this.selectedEmployee.set(employee);
    
    // Initialize subcollections when an employee is selected
    if (employee) {
      console.log('[RegisterComponent] Employee selected:', employee);
      this.employeeSubcollectionService
        .initializeSubcollections(employee.id, employee.source)
        .subscribe({
          next: (result) => {
            if (result.success) {
              console.log('[RegisterComponent] Subcollections initialized successfully');
            } else {
              console.warn('[RegisterComponent] Failed to initialize subcollections:', result.error);
            }
          },
          error: (err) => {
            console.error('[RegisterComponent] Error initializing subcollections:', err);
          },
        });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const employee = this.selectedEmployee();
    if (!employee) {
      this.error.set('Please select an employee or trainee.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    const registerPayload = {
      ...this.form.getRawValue(),
      employeeId: employee.id,
      employeeSource: employee.source,
      employeeName: employee.name,
    };

    this.authService
      .register(registerPayload)
      .subscribe({
        next: () => {
          console.log('[RegisterComponent] registration success');
          this.loading.set(false);
          this.success.set(
            'Account created successfully. You can now sign in.'
          );
          setTimeout(() => {
            this.authService.logout().subscribe({
              next: () => this.router.navigate(['/login']),
              error: (err) => {
                console.error('Logout after register failed', err);
                this.router.navigate(['/login']);
              },
            });
          }, 1200);
        },
        error: (err) => {
          console.error('Registration error', err);
          this.loading.set(false);
          this.error.set(this.parseError(err));
        },
      });
  }

  private parseError(err: unknown): string {
    if (typeof err === 'object' && err && 'code' in err) {
      const code = (err as { code: string }).code;
      switch (code) {
        case 'auth/email-already-in-use':
          return 'Email already registered. Try signing in instead.';
        case 'auth/weak-password':
          return 'Password too weak. Try adding more characters.';
        default:
          return 'Failed to create account. Please try again.';
      }
    }
    return 'Failed to create account. Please try again.';
  }
}
