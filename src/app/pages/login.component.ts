import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12 text-sm text-foreground">
      <div class="w-full max-w-md rounded-3xl border bg-card/95 p-8 shadow-lg">
        <div class="mb-6 text-center">
          <h1 class="text-2xl font-semibold text-foreground">Welcome back</h1>
          <p class="mt-2 text-xs text-muted-foreground">
            Sign in to submit your daily report or file an incident.
          </p>
        </div>

        <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
          <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Email
            <input
              type="email"
              formControlName="email"
              class="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/20 transition focus:ring-2"
              placeholder="you@example.com"
            />
          </label>
          <p *ngIf="email.invalid && (email.dirty || email.touched)" class="text-[11px] text-destructive">
            Enter a valid email address.
          </p>

          <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Password
            <input
              type="password"
              formControlName="password"
              class="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/20 transition focus:ring-2"
              placeholder="Your password"
            />
          </label>
          <p *ngIf="password.invalid && (password.dirty || password.touched)" class="text-[11px] text-destructive">
            Password is required.
          </p>

          <div *ngIf="error()" class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
            {{ error() }}
          </div>

          <button
            type="submit"
            class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-70"
            [disabled]="form.invalid || loading()"
          >
            <ng-container *ngIf="loading(); else loginLabel">Signing in...</ng-container>
            <ng-template #loginLabel>Sign in</ng-template>
          </button>
        </form>

        <p class="mt-6 text-center text-xs text-muted-foreground">
          Need an account?
          <a routerLink="/register" class="font-semibold text-primary hover:underline">Register here</a>
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    console.log('[LoginComponent] initialized');
    this.authService.user$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((firebaseUser) => {
        console.log('[LoginComponent] auth state', firebaseUser?.uid ?? null);
        if (firebaseUser) {
          this.router.navigate(['/dashboard']);
        }
      });
  }

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login error', err);
        this.loading.set(false);
        this.error.set(this.parseError(err));
      },
    });
  }

  private parseError(err: unknown): string {
    if (typeof err === 'object' && err && 'code' in err) {
      const code = (err as { code: string }).code;
      switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          return 'Invalid email or password.';
        case 'auth/too-many-requests':
          return 'Too many attempts. Please try again later.';
        default:
          return 'Failed to sign in. Please try again.';
      }
    }
    return 'Failed to sign in. Please try again.';
  }
}
