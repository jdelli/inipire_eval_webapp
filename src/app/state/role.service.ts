import { Injectable, signal } from '@angular/core';

export type UserRole = 'team-leader' | 'employee';

@Injectable({ providedIn: 'root' })
export class RoleService {
  readonly role = signal<UserRole>('team-leader');

  setRole(role: UserRole): void {
    this.role.set(role);
  }

  toggle(): void {
    this.role.update((r) => (r === 'team-leader' ? 'employee' : 'team-leader'));
  }
}
