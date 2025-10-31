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
    <ng-container *ngIf="role() === 'team-leader'; else emp">
      <app-shell />
    </ng-container>
    <ng-template #emp>
      <app-employee-shell />
    </ng-template>

    <!-- Floating toggle to switch roles for demo purposes -->
    <div class="fixed bottom-4 right-4 z-50 select-none">
      <div class="flex items-center gap-2 rounded-full border bg-background/95 px-3 py-1.5 shadow">
        <span class="text-xs font-medium" [class.text-primary]="role() === 'team-leader'">Team leader</span>
        <button
          type="button"
          class="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition"
          (click)="toggle()"
          aria-label="Toggle role"
        >
          <span
            class="inline-block size-4 translate-x-1 rounded-full bg-background shadow transition"
            [style.transform]="role() === 'employee' ? 'translateX(1.25rem)' : 'translateX(0.25rem)'"
          ></span>
        </button>
        <span class="text-xs font-medium" [class.text-primary]="role() === 'employee'">Employee</span>
      </div>
    </div>
  `,
})
export class RoleHostComponent {
  private readonly roleService = inject(RoleService);
  readonly role = computed(() => this.roleService.role());

  toggle(): void {
    this.roleService.toggle();
  }
}
