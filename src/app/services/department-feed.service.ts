import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  collectionData,
  doc,
  getDoc,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
} from '@angular/fire/firestore';
import { increment } from 'firebase/firestore';
import { Observable, from, map } from 'rxjs';
import { UserProfile } from './auth.service';
import { UserRole } from '../state/role.service';

export type DepartmentPostType = 'announcement' | 'task';

export interface DepartmentPost {
  id: string;
  department: string;
  type: DepartmentPostType;
  title: string;
  body: string;
  createdAt: Date;
  createdBy: {
    uid: string;
    name: string;
    role: UserRole;
  };
  dueDate?: Date | null;
  likesCount?: number;
  commentsCount?: number;
}

export interface CreateDepartmentPostPayload {
  type: DepartmentPostType;
  title: string;
  body: string;
  dueDate?: Date | null;
}

@Injectable({ providedIn: 'root' })
export class DepartmentFeedService {
  private readonly firestore = inject(Firestore);

  streamDepartmentPosts(department: string, limitCount = 50): Observable<DepartmentPost[]> {
  const postsRef = collection(this.firestore, `departments/${department}/posts`);
  const postsQuery = query(postsRef, orderBy('createdAt', 'desc'), limit(limitCount));

    return collectionData(postsQuery, { idField: 'id' }).pipe(
      map((items) =>
        items.map((raw) => {
          const data = raw as any;
          return {
            id: data.id,
            department: data.department ?? department,
            type: (data.type ?? 'announcement') as DepartmentPostType,
            title: data.title ?? '',
            body: data.body ?? '',
            createdAt: this.toDateOrNow(data.createdAt),
            createdBy: {
              uid: data.createdBy?.uid ?? 'unknown',
              name: data.createdBy?.name ?? 'Unknown user',
              role: data.createdBy?.role ?? 'employee',
            },
            dueDate: this.toDateOrNull(data.dueDate),
            likesCount: Number(data.likesCount ?? 0),
            commentsCount: Number(data.commentsCount ?? 0),
          } satisfies DepartmentPost;
        })
      )
    );
  }

  createPost(profile: UserProfile, payload: CreateDepartmentPostPayload): Observable<string> {
    if (!profile.department) {
      throw new Error('User profile is missing department information.');
    }

    const postsRef = collection(this.firestore, `departments/${profile.department}/posts`);
    const now = Timestamp.now();

    return from(
      addDoc(postsRef, {
        department: profile.department,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        createdAt: now,
        createdBy: {
          uid: profile.uid,
          name: profile.fullName,
          role: profile.isTeamleader ? 'team-leader' : 'employee',
        },
        dueDate: payload.dueDate ? Timestamp.fromDate(payload.dueDate) : null,
        likesCount: 0,
        commentsCount: 0,
      }).then((docRef) => docRef.id)
    );
  }

  /** Toggle like for the current user and keep a counter on the post document */
  toggleLike(department: string, postId: string, uid: string): Observable<'liked' | 'unliked'> {
    const likeDoc = doc(this.firestore, `departments/${department}/posts/${postId}/likes/${uid}`);
    const postDoc = doc(this.firestore, `departments/${department}/posts/${postId}`);
    return from(
      getDoc(likeDoc).then(async (snap) => {
        if (snap.exists()) {
          await deleteDoc(likeDoc);
          await updateDoc(postDoc, { likesCount: increment(-1) });
          return 'unliked' as const;
        } else {
          await setDoc(likeDoc, { uid, createdAt: Timestamp.now() });
          await updateDoc(postDoc, { likesCount: increment(1) });
          return 'liked' as const;
        }
      })
    );
  }

  /** Stream whether a given user liked a post */
  streamUserLike(department: string, postId: string, uid: string): Observable<boolean> {
    const likeDoc = doc(this.firestore, `departments/${department}/posts/${postId}/likes/${uid}`);
    return from(getDoc(likeDoc)).pipe(map((s) => s.exists()));
  }

  /** Comments model */
  streamComments(department: string, postId: string, limitCount = 20) {
    const commentsRef = collection(this.firestore, `departments/${department}/posts/${postId}/comments`);
    const q = query(commentsRef, orderBy('createdAt', 'asc'), limit(limitCount));
    return collectionData(q, { idField: 'id' }).pipe(
      map((items) =>
        items.map((raw) => {
          const d = raw as any;
          return {
            id: d.id,
            text: d.text ?? '',
            createdAt: this.toDateOrNow(d.createdAt),
            by: { uid: d.by?.uid ?? 'unknown', name: d.by?.name ?? 'Unknown user' },
          } as { id: string; text: string; createdAt: Date; by: { uid: string; name: string } };
        })
      )
    );
  }

  addComment(profile: UserProfile, department: string, postId: string, text: string): Observable<string> {
    const commentsRef = collection(this.firestore, `departments/${department}/posts/${postId}/comments`);
    const postDoc = doc(this.firestore, `departments/${department}/posts/${postId}`);
    const now = Timestamp.now();
    return from(
      addDoc(commentsRef, {
        text,
        createdAt: now,
        by: { uid: profile.uid, name: profile.fullName },
      }).then(async (docRef) => {
        await updateDoc(postDoc, { commentsCount: increment(1) });
        return docRef.id;
      })
    );
  }

  private toDateOrNow(value: any): Date {
    const date = this.toDateOrNull(value);
    return date ?? new Date();
  }

  private toDateOrNull(value: any): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Timestamp) {
      return value.toDate();
    }

    if (typeof value.toDate === 'function') {
      return value.toDate();
    }

    if (value instanceof Date) {
      return value;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }
}
