import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, OnInit, signal, inject, computed, isDevMode, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PersonnelService } from '../../services/personnel.service';
import { RoleService } from '../../state/role.service';
import { combineLatest, startWith } from 'rxjs';

export interface SelectedEmployee {
  id: string;
  name: string;
  source: 'employees' | 'trainingRecords';
  department: string;
  email?: string;
}

@Component({
  selector: 'app-employee-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="employee-selector relative">
      <label class="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Select Employee/Trainee
        <div class="relative">
          <input type="text" [formControl]="searchControl" placeholder="Type to search by name or department..." (focus)="isDropdownOpen.set(true)" (blur)="onBlur()" class="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-primary/20 transition focus:ring-2" [disabled]="loading()"/>
          <div *ngIf="isDropdownOpen() && !loading()" class="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-background border border-input rounded-lg shadow-lg">
            <div *ngIf="filteredEmployees().length === 0 && filteredTrainees().length === 0" class="px-3 py-2 text-xs text-muted-foreground">No employees or trainees found</div>
            <div *ngIf="filteredEmployees().length > 0">
              <div class="px-3 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/50 sticky top-0">Employees</div>
              <ng-container *ngFor="let emp of filteredEmployees()">
                <div (mousedown)="selectEmployee('emp', emp)" class="w-full cursor-pointer px-3 py-2 text-sm hover:bg-muted/50 transition-colors" [ngClass]="{ 'bg-primary/10': selectedId() === 'emp_' + emp.id }">
                  <div class="font-medium">{{ emp.firstName }} {{ emp.lastName }}</div>
                  <div class="text-xs text-muted-foreground">{{ emp.department }} (Employee)</div>
                </div>
              </ng-container>
            </div>
            <div *ngIf="filteredTrainees().length > 0">
              <div class="px-3 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/50 sticky top-0">Trainees</div>
              <ng-container *ngFor="let trainee of filteredTrainees()">
                <div (mousedown)="selectEmployee('trainee', trainee)" class="w-full cursor-pointer px-3 py-2 text-sm hover:bg-muted/50 transition-colors" [ngClass]="{ 'bg-primary/10': selectedId() === 'trainee_' + trainee.id }">
                  <div class="font-medium">{{ trainee.firstName }} {{ trainee.lastName }}</div>
                  <div class="text-xs text-muted-foreground">{{ trainee.department }} (Trainee)</div>
                </div>
              </ng-container>
            </div>
          </div>
        </div>
      </label>
      <p *ngIf="loading()" class="mt-1 text-[11px] text-muted-foreground">Loading personnel...</p>
      <p *ngIf="!loading() && !isDropdownOpen()" class="mt-1 text-[11px] text-muted-foreground">{{ selectedId() ? 'Selected: ' + selectedName() : 'Showing ' + (allEmployees().length + allTrainees().length) + ' total personnel' }}</p>
    </div>
  `,
})
export class EmployeeSelectorComponent implements OnInit {
  @Output() employeeSelected = new EventEmitter<SelectedEmployee | null>();

  private readonly personnelService = inject(PersonnelService);
  private readonly roleService = inject(RoleService);

  readonly searchControl = new FormControl('');
  // Bridge reactive forms to signals so filtering updates as the user types
  readonly searchTerm = toSignal(this.searchControl.valueChanges.pipe(startWith('')), { initialValue: '' });
  readonly allEmployees = signal<any[]>([]);
  readonly allTrainees = signal<any[]>([]);
  readonly loading = signal(false);
  readonly isDropdownOpen = signal(false);
  readonly selectedId = signal<string>('');
  readonly selectedName = signal<string>('');

  // Get current user's profile to check if they're a team leader
  readonly profile = this.roleService.profile;
  readonly role = this.roleService.role;

  // Canonical lists with duplicates collapsed by name+department+email, prefer latest updatedAt/createdAt
  readonly canonicalEmployees = computed(() => this.dedupeByIdentity(this.allEmployees()));
  readonly canonicalTrainees = computed(() => this.dedupeByIdentity(this.allTrainees()));

  // Computed signals for filtered results
  readonly filteredEmployees = computed(() => {
    const search = (this.searchTerm() ?? '').toLowerCase().trim();
    const base = this.canonicalEmployees().filter(emp => (emp.status?.toLowerCase?.() ?? 'active') === 'active');
    if (!search) return base;
    
    return base.filter(emp => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const department = emp.department?.toLowerCase() || '';
      return fullName.includes(search) || department.includes(search);
    });
  });

  readonly filteredTrainees = computed(() => {
    const search = (this.searchTerm() ?? '').toLowerCase().trim();
    const base = this.canonicalTrainees().filter(t => (t.status?.toLowerCase?.() ?? 'active') === 'active');
    if (!search) return base;
    
    return base.filter(trainee => {
      const fullName = `${trainee.firstName} ${trainee.lastName}`.toLowerCase();
      const department = trainee.department?.toLowerCase() || '';
      return fullName.includes(search) || department.includes(search);
    });
  });

  ngOnInit(): void {
    this.fetchAllPersonnel();

    // Dev-only diagnostics: whenever search changes, log duplicates for matching names
    if (isDevMode()) {
      effect(() => {
        const query = (this.searchTerm() ?? '').trim().toLowerCase();
        if (query.length >= 3) {
          this.logDuplicateDiagnostics(query);
        }
      });
    }
  }

  private fetchAllPersonnel(): void {
    this.loading.set(true);

    // Fetch users with accounts from TLtraineeUsers (for team leaders)
    // This ensures we only show employees/trainees who have user accounts
    this.personnelService.getTeamMembersWithAccounts().subscribe({
      next: (members) => {
        // Separate into employees and trainees based on source
        const employees = members.filter((m: any) => m.source === 'employees');
        const trainees = members.filter((m: any) => m.source === 'trainingRecords');

        this.allEmployees.set(employees as any[]);
        this.allTrainees.set(trainees as any[]);
        this.loading.set(false);

        console.log('[EmployeeSelector] Loaded from TLtraineeUsers:', {
          totalMembers: members.length,
          employees: employees.length,
          trainees: trainees.length,
          userRole: this.role(),
          userDepartment: this.profile()?.department,
        });

        // Initial pass to surface any obvious duplicates in dev
        if (isDevMode()) {
          this.logDuplicateDiagnostics('');
        }
      },
      error: (err) => {
        console.error('[EmployeeSelector] Error fetching personnel:', err);
        this.loading.set(false);
      },
    });
  }

  selectEmployee(type: string, person: any): void {
    const fullName = `${person.firstName} ${person.lastName}`;
    const id = type === 'emp' ? `emp_${person.id}` : `trainee_${person.id}`;
    
    this.selectedId.set(id);
    this.selectedName.set(`${fullName} - ${person.department}`);
  // Update input and trigger valueChanges so the searchTerm signal stays in sync
  this.searchControl.setValue(fullName);
    this.isDropdownOpen.set(false);

    if (type === 'emp') {
      this.employeeSelected.emit({
        id: person.id!,
        name: fullName,
        source: 'employees',
        department: person.department,
        email: person.email,
      });
    } else {
      this.employeeSelected.emit({
        id: person.id!,
        name: fullName,
        source: 'trainingRecords',
        department: person.department,
        email: person.emailAddress,
      });
    }
  }

  onBlur(): void {
    // Delay to allow mousedown event on options to fire first
    setTimeout(() => {
      this.isDropdownOpen.set(false);
    }, 200);
  }

  // -------- Diagnostics (dev only) --------
  private normalizeName(person: any): string {
    const first = (person.firstName ?? '').toString();
    const last = (person.lastName ?? '').toString();
    return `${first} ${last}`.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private identityKey(p: any): string {
    const name = this.normalizeName(p);
    const dept = (p.department ?? '').toString().trim().toLowerCase();
    const email = (p.email ?? p.emailAddress ?? '').toString().trim().toLowerCase();
    return `${name}|${dept}|${email}`;
  }

  private toMillis(ts: any): number {
    if (!ts) return 0;
    if (typeof ts === 'object' && typeof ts.seconds === 'number') {
      return ts.seconds * 1000 + Math.floor((ts.nanoseconds ?? 0) / 1_000_000);
    }
    const parsed = Date.parse(ts);
    return isNaN(parsed) ? 0 : parsed;
  }

  private dedupeByIdentity(list: any[]): any[] {
    const map = new Map<string, any>();
    for (const p of list) {
      const key = this.identityKey(p);
      if (!key) continue;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, p);
        continue;
      }
      const existingTs = this.toMillis(existing.updatedAt ?? existing.createdAt);
      const currentTs = this.toMillis(p.updatedAt ?? p.createdAt);
      // Keep the most recently updated/created record
      if (currentTs >= existingTs) {
        map.set(key, p);
      }
    }
    return Array.from(map.values());
  }

  private logDuplicateDiagnostics(filter: string): void {
    try {
      const all = [
        ...this.allEmployees().map((p) => ({ ...p, _source: 'employees' })),
        ...this.allTrainees().map((p) => ({ ...p, _source: 'trainingRecords' })),
      ];
      const groups = new Map<string, any[]>();
      for (const p of all) {
        const key = this.normalizeName(p);
        if (!key) continue;
        if (filter && !key.includes(filter)) continue;
        const arr = groups.get(key) ?? [];
        arr.push(p);
        groups.set(key, arr);
      }
      for (const [key, arr] of groups) {
        if (arr.length > 1) {
          console.groupCollapsed(`[Diagnostics] Duplicate name: "${key}" (${arr.length})`);
          console.table(
            arr.map((x) => ({
              docPath: `${x._source}/${x.id}`,
              id: x.id,
              source: x._source,
              status: x.status,
              department: x.department,
              email: x.email ?? x.emailAddress ?? '',
              companyId: x.companyId ?? '',
              createdAt: x.createdAt ?? '',
              updatedAt: x.updatedAt ?? '',
            }))
          );
          console.groupEnd();
        }
      }
    } catch (e) {
      console.warn('[Diagnostics] Duplicate scan error:', e);
    }
  }
}
