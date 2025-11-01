import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService, UserProfile } from '../services/auth.service';

export type UserRole = 'team-leader' | 'employee';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly authService = inject(AuthService);
  private readonly profileSource = toSignal(this.authService.profile$, {
    requireSync: false,
  });

  readonly role = signal<UserRole | null>(null);
  readonly department = signal<string | null>(null);
  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);

  constructor() {
    effect(() => {
      try {
        const profile = this.profileSource();
        console.log('[RoleService] profile signal update', profile);

        // Skip if profile hasn't loaded yet (undefined means still loading)
        if (profile === undefined) {
          console.log('[RoleService] profile still loading (undefined)');
          return;
        }

        // Use untracked to prevent signal writes from re-triggering this effect
        untracked(() => {
          console.log('[RoleService] setting profile to signal');
          this.profile.set(profile);

          if (profile) {
            console.log('[RoleService] profile exists, setting role based on isTeamleader:', profile.isTeamleader);
            this.role.set(profile.isTeamleader ? 'team-leader' : 'employee');
            this.department.set(profile.department ?? null);
          } else {
            console.log('[RoleService] profile is null, setting default employee role');
            this.role.set('employee');
            this.department.set(null);
          }

          console.log('[RoleService] setting loading to false');
          // Set loading to false once we have a result (null or profile)
          this.loading.set(false);

          console.log(
            '[RoleService] computed role',
            this.role(),
            'department',
            this.department(),
            'loading',
            this.loading()
          );
        });
      } catch (error) {
        console.error('[RoleService] effect error:', error);
        // Even on error, set loading to false to prevent infinite loading
        untracked(() => this.loading.set(false));
      }
    });
  }
}
