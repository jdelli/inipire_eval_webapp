import { Injectable, inject } from '@angular/core';
import {
  Auth,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  user,
} from '@angular/fire/auth';
import {
  Firestore,
  Timestamp,
  doc,
  docSnapshots,
  setDoc,
  getDoc,
} from '@angular/fire/firestore';
import { catchError, from, map, Observable, of, switchMap, timeout, merge, delay, take } from 'rxjs';

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  department: string;
  isTeamleader: boolean;
  employeeId?: string;
  employeeSource?: 'employees' | 'trainingRecords';
  employeeName?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  department: string;
  isTeamleader: boolean;
  employeeId?: string;
  employeeSource?: 'employees' | 'trainingRecords';
  employeeName?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);

  readonly user$ = user(this.auth);
  readonly profile$ = this.user$.pipe(
    switchMap((firebaseUser) => {
      console.log('[AuthService] user$ emitted', firebaseUser?.uid ?? null);
      if (!firebaseUser) {
        console.log('[AuthService] no user, returning null profile');
        return of(null);
      }
      const ref = doc(this.firestore, `TLtraineeUsers/${firebaseUser.uid}`);
      console.log('[AuthService] fetching profile doc for uid', firebaseUser.uid);

      // Use getDoc for a one-time fetch instead of docSnapshots for real-time
      return from(getDoc(ref)).pipe(
        map((snapshot) => {
          console.log('[AuthService] profile doc snapshot received, exists:', snapshot.exists());
          if (!snapshot.exists()) {
            console.warn('[AuthService] profile doc missing for uid', firebaseUser.uid);
            return null;
          }
          const data = snapshot.data();
          const profile = {
            uid: firebaseUser.uid,
            email: data['email'] ?? firebaseUser.email ?? '',
            fullName: data['fullName'] ?? firebaseUser.displayName ?? '',
            department: data['department'] ?? '',
            isTeamleader: !!data['isTeamleader'],
            employeeId: data['employeeId'],
            employeeSource: data['employeeSource'],
            employeeName: data['employeeName'],
            createdAt: data['createdAt'],
            updatedAt: data['updatedAt'],
          } as UserProfile;
          console.log('[AuthService] profile loaded:', profile);
          return profile;
        }),
        catchError((err) => {
          console.error('[AuthService] profile fetch error', err);
          return of(null);
        })
      );
    })
  );

  register(payload: RegisterPayload): Observable<void> {
    const { email, password, fullName, department, isTeamleader, employeeId, employeeSource, employeeName } = payload;
    return from(
      createUserWithEmailAndPassword(this.auth, email, password).then(
        async (cred: UserCredential) => {
          if (cred.user) {
            await updateProfile(cred.user, { displayName: fullName });
            const docRef = doc(
              this.firestore,
              `TLtraineeUsers/${cred.user.uid}`
            );
            
            const userData: any = {
              uid: cred.user.uid,
              email,
              fullName,
              department,
              isTeamleader,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            };

            // Add employee reference if provided
            if (employeeId && employeeSource) {
              userData.employeeId = employeeId;
              userData.employeeSource = employeeSource;
              userData.employeeName = employeeName || '';
            }

            await setDoc(docRef, userData);
          }
        }
      )
    );
  }

  login(payload: LoginPayload): Observable<void> {
    const { email, password } = payload;
    return from(
      signInWithEmailAndPassword(this.auth, email, password).then(() => {})
    );
  }

  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(map((firebaseUser) => !!firebaseUser));
  }
}
