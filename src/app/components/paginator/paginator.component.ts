import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-3 rounded-xl border border-dashed border-muted bg-card/60 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <span class="text-xs text-muted-foreground">
        {{ totalItems ? ('Showing ' + rangeStart + '-' + rangeEnd + ' of ' + totalItems + ' records') : 'No records to display' }}
      </span>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          (click)="onPageChange(currentPage - 1)"
          [disabled]="currentPage <= 1"
        >
          Previous
        </button>
        <div class="rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-semibold text-foreground">
          Page {{ currentPage }} of {{ totalPages() }}
        </div>
        <button
          type="button"
          class="inline-flex items-center rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          (click)="onPageChange(currentPage + 1)"
          [disabled]="currentPage >= totalPages()"
        >
          Next
        </button>
      </div>
    </div>
  `,
})
export class PaginatorComponent {
  @Input() currentPage = 1;
  @Input() totalItems = 0;
  @Input() itemsPerPage = 20;
  @Output() pageChange = new EventEmitter<number>();

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get rangeEnd(): number {
    if (!this.totalItems) return 0;
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  totalPages(): number {
    const pageSize = this.itemsPerPage > 0 ? this.itemsPerPage : 1;
    const total = Math.ceil(this.totalItems / pageSize);
    return Math.max(1, total || 1);
  }

  onPageChange(page: number): void {
    const totalPages = this.totalPages();
    if (page >= 1 && page <= totalPages) {
      this.pageChange.emit(page);
    }
  }
}
