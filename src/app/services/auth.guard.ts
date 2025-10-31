import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe(
    take(1),
    map((firebaseUser) => {
      console.log('[authGuard] user state evaluated', firebaseUser?.uid ?? null);
      if (firebaseUser) {
        return true;
      }
      const redirect: UrlTree = router.parseUrl('/login');
      console.warn('[authGuard] no user, redirecting to /login');
      return redirect;
    })
  );
};
