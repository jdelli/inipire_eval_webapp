import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ShellComponent } from './shell.component';
import { EmployeeShellComponent } from './employee-shell.component';
import { RoleService } from '../state/role.service';

@Component({
  selector: 'app-role-host',
  standalone: true,
  imports: [CommonModule, ShellComponent, EmployeeShellComponent],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-muted/20" *ngIf="loading(); else layout">
      <div class="rounded-2xl border border-input bg-background px-6 py-4 text-xs text-muted-foreground shadow-sm">
        Checking your access…
      </div>
    </div>

    <ng-template #layout>
      <ng-container *ngIf="role() === 'team-leader'; else emp">
        <app-shell />
      </ng-container>
      <ng-template #emp>
        <app-employee-shell />
      </ng-template>
    </ng-template>
  `,
})
export class RoleHostComponent {
  private readonly roleService = inject(RoleService);
  readonly role = this.roleService.role;
  readonly loading = this.roleService.loading;
}
