import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap, tap, map } from 'rxjs';
import { DepartmentFeedService, DepartmentPost, DepartmentPostType } from '../services/department-feed.service';
import { RoleService } from '../state/role.service';

@Component({
  selector: 'app-department-feed',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatListModule,
  ],
  templateUrl: './department-feed.component.html',
})
export class DepartmentFeedComponent {
  @Input() variant: 'page' | 'embedded' = 'page';

  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleService);
  private readonly feedService = inject(DepartmentFeedService);
  private readonly destroyRef = inject(DestroyRef);

  readonly profile = this.roleService.profile;
  readonly department = this.roleService.department;
  readonly role = this.roleService.role;

  readonly posts = signal<DepartmentPost[]>([]);
  readonly loading = signal(true);
  readonly feedError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly submitNotice = signal<string | null>(null);
  readonly composerOpen = signal(false);

  readonly avatarInitial = computed(() =>
    (this.profile()?.fullName?.charAt(0) ?? '?').toUpperCase()
  );

  // Mock right-rail suggestions (can be sourced later from backend)
  readonly suggestions = signal<
    Array<{ id: string; name: string; title: string; badge?: string }>
  >([
    { id: '1', name: 'Bill Gates', title: 'Breakthrough Energy', badge: 'in' },
    { id: '2', name: 'Sundar Pichai', title: 'CEO at Google', badge: 'in' },
    { id: '3', name: 'Matt Watson', title: 'Founder & CTO', badge: 'in' },
  ]);

  readonly trendingTopics = signal<
    Array<{ topic: string; postCount: string }>
  >([
    { topic: '#ProductLaunch', postCount: '1,200 posts' },
    { topic: '#Q4Goals', postCount: '800 posts' },
  ]);

  readonly postForm = this.fb.group({
    type: ['announcement' as DepartmentPostType, Validators.required],
    title: ['', [Validators.required, Validators.maxLength(140)]],
    body: ['', [Validators.required, Validators.maxLength(2000)]],
    dueDate: [''],
  });

  readonly canPost = computed(() => {
    const profile = this.profile();
    const department = this.department();
    return !!profile && !!department;
  });

  constructor() {
    toObservable(this.department)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.feedError.set(null);
        }),
        switchMap((department) => {
          if (!department) {
            return of<DepartmentPost[]>([]);
          }
          return this.feedService.streamDepartmentPosts(department).pipe(
            catchError((error) => {
              console.error('[DepartmentFeedComponent] feed error', error);
              this.feedError.set('Unable to load your department feed right now.');
              return of<DepartmentPost[]>([]);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((posts) => {
        this.posts.set(posts);
        this.loading.set(false);
        this.hydrateLikesState(posts);
      });

    this.postForm
      .get('type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        if (type !== 'task') {
          this.postForm.patchValue({ dueDate: '' }, { emitEvent: false });
        }
      });
  }

  submitPost(): void {
    this.submitError.set(null);
    this.submitNotice.set(null);
    if (this.postForm.invalid) {
      this.postForm.markAllAsTouched();
      this.submitError.set('Fill in all required fields before posting.');
      return;
    }

    const profile = this.profile();
    if (!profile) {
      this.submitError.set('Sign in again to share updates.');
      return;
    }

    const department = this.department();
    if (!department) {
      this.submitError.set('Join a department to start posting.');
      return;
    }

    const { type, title, body, dueDate } = this.postForm.getRawValue();
    const trimmedTitle = (title ?? '').trim();
    const trimmedBody = (body ?? '').trim();

    if (!trimmedTitle || !trimmedBody) {
      this.submitError.set('Share a title and some context for your update.');
      return;
    }

    let due: Date | null = null;
    if (type === 'task' && dueDate) {
      const parsed = new Date(dueDate);
      if (!Number.isNaN(parsed.getTime())) {
        due = parsed;
      }
    }

    const payload = {
      type: (type as DepartmentPostType) ?? 'announcement',
      title: trimmedTitle,
      body: trimmedBody,
      dueDate: due,
    };

    this.submitting.set(true);

    this.feedService
      .createPost(profile, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitNotice.set('Shared with your department.');
          this.postForm.reset({
            type: payload.type,
            title: '',
            body: '',
            dueDate: '',
          });
        },
        error: (error) => {
          console.error('[DepartmentFeedComponent] submit error', error);
          this.submitting.set(false);
          this.submitError.set('Could not publish your update. Try again.');
        },
      });
  }

  timeAgo(date: Date): string {
    const now = Date.now();
    const elapsed = now - date.getTime();
    if (elapsed < 60_000) {
      return 'Just now';
    }
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 60) {
      return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }
    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks}w ago`;
    }
    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo ago`;
    }
    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }

  trackByPostId(_: number, post: DepartmentPost): string {
    return post.id;
  }

  trackBySuggestion(_: number, s: { id: string }): string {
    return s.id;
  }

  // ---------- Interactivity: likes & comments ----------
  private likes = signal<Record<string, { liked: boolean; count: number }>>({});
  private commentsOpen = signal<Record<string, boolean>>({});
  private commentDraft = signal<Record<string, string>>({});
  private commentsMap = signal<Record<string, Array<{ id: string; text: string; createdAt: Date; by: { uid: string; name: string } }>>>({});

  liked(postId: string): boolean {
    return !!this.likes()[postId]?.liked;
  }
  likeCount(postId: string): number {
    return this.likes()[postId]?.count ?? 0;
  }
  isCommentsOpen(postId: string): boolean {
    return !!this.commentsOpen()[postId];
  }
  getDraft(postId: string): string {
    return this.commentDraft()[postId] ?? '';
  }
  commentsFor(postId: string) {
    return this.commentsMap()[postId] ?? [];
  }

  private hydrateLikesState(posts: DepartmentPost[]): void {
    const dept = this.department();
    const profile = this.profile();
    if (!dept || !profile) return;
    const next: Record<string, { liked: boolean; count: number }> = { ...this.likes() };
    posts.forEach((p) => {
      next[p.id] = { liked: next[p.id]?.liked ?? false, count: p.likesCount ?? 0 };
      this.feedService
        .streamUserLike(dept, p.id, profile.uid)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((liked) => {
          this.likes.update((m) => ({ ...m, [p.id]: { liked, count: m[p.id]?.count ?? (p.likesCount ?? 0) } }));
        });
    });
    this.likes.set(next);
  }

  toggleLike(post: DepartmentPost): void {
    const dept = this.department();
    const profile = this.profile();
    if (!dept || !profile) return;
    this.feedService
      .toggleLike(dept, post.id, profile.uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((state) => {
        this.likes.update((m) => {
          const current = m[post.id] ?? { liked: false, count: post.likesCount ?? 0 };
          const liked = state === 'liked';
          const delta = liked ? 1 : -1;
          return { ...m, [post.id]: { liked, count: Math.max(0, (current.count ?? 0) + delta) } };
        });
      });
  }

  openCommentsFor(post: DepartmentPost): void {
    const dept = this.department();
    if (!dept) return;
    this.commentsOpen.update((m) => ({ ...m, [post.id]: true }));
    // load once and keep live updates
    this.feedService
      .streamComments(dept, post.id, 50)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.commentsMap.update((m) => ({ ...m, [post.id]: items }));
      });
  }

  updateDraft(postId: string, value: string): void {
    this.commentDraft.update((m) => ({ ...m, [postId]: value }));
  }

  submitComment(post: DepartmentPost): void {
    const dept = this.department();
    const profile = this.profile();
    if (!dept || !profile) return;
    const text = (this.commentDraft()[post.id] ?? '').trim();
    if (!text) return;
    this.feedService
      .addComment(profile, dept, post.id, text)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.commentDraft.update((m) => ({ ...m, [post.id]: '' }));
      });
  }
}
