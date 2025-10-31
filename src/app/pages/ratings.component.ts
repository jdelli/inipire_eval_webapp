import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { ratings } from '../data/mock-data';

interface ThemeCard {
  title: string;
  description: string;
  evidence: string;
}

interface FeedbackSnippet {
  source: string;
  role: string;
  highlight: string;
  quote: string;
}

@Component({
  selector: 'app-ratings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ratings.component.html',
  styles: `
    /* Soft vignette gradient background similar to Employees tab */
    .audit-hero {
      background-image: radial-gradient(1200px 400px at 20% 0%, #eef6ff 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,1) 60%);
    }

    /* Shimmer for stat cards */
    .shimmer {
      position: relative;
      overflow: hidden;
    }
    .shimmer::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-100%);
      background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 100%);
      animation: shimmer 2.2s infinite;
    }
    @keyframes shimmer {
      100% { transform: translateX(100%); }
    }
  `,
})
export class RatingsComponent {
  readonly ratings = ratings;

  // Sorting & paging controls
  readonly sortKey = signal<'category' | 'score'>('category');
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  readonly rowsPerPage = signal<number>(20);
  readonly currentPage = signal<number>(1);

  readonly sortedRatings = computed(() => {
    const key = this.sortKey();
    const dir = this.sortDir();
    const mul = dir === 'asc' ? 1 : -1;
    return [...this.ratings].sort((a, b) => {
      if (key === 'category') {
        return a.category.localeCompare(b.category) * mul;
      }
      return (a.score - b.score) * mul;
    });
  });

  readonly paginatedRatings = computed(() => {
    const page = this.currentPage();
    const size = this.rowsPerPage();
    const start = (page - 1) * size;
    return this.sortedRatings().slice(start, start + size);
  });

  setSort(key: 'category' | 'score') {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    this.currentPage.set(1);
  }

  setRows(size: number) {
    this.rowsPerPage.set(size);
    this.currentPage.set(1);
  }

  readonly strengthThemes: ThemeCard[] = [
    {
      title: 'Strategic storytelling',
      description:
        'Transforms complex tradeoffs into narratives that align leadership and teams quickly.',
      evidence: 'ELT reports faster consensus during roadmap and investment reviews.',
    },
    {
      title: 'Operator mindset',
      description:
        'Maintains predictable operating rhythm, with leading indicators and fast course correction.',
      evidence: 'Cross-functional partners cite “calm control” during escalations.',
    },
    {
      title: 'Talent acceleration',
      description:
        'Elevates emerging leaders by granting clear ownership and modeling high-trust feedback.',
      evidence: 'Two direct reports promoted in H1 with strong succession depth built.',
    },
  ];

  readonly growthAreas: ThemeCard[] = [
    {
      title: 'Finance co-creation',
      description: 'Bring partners into earlier scenario modeling for significant investments.',
      evidence: 'Request to pre-wire ROI for AI pricing initiative before board review.',
    },
    {
      title: 'Reliability storytelling',
      description: 'Translate technical mitigation plans into executive-ready business framing.',
      evidence: 'Operations asks for clearer “so what” for platform resiliency by July.',
    },
  ];

  readonly feedbackSnippets: FeedbackSnippet[] = [
    {
      source: 'Avery Patel',
      role: 'Chief Product Officer',
      highlight: 'Executive sponsor',
      quote:
        'Jordan connects dots across teams faster than anyone on my staff. Board-ready within days of joining an initiative.',
    },
    {
      source: 'Elena Ruiz',
      role: 'Lead PM, Growth',
      highlight: 'Direct report',
      quote:
        'The weekly scorecard is the calm anchor. Expectations are clear and I always know how to unblock across functions.',
    },
    {
      source: 'Marcus Hall',
      role: 'Principal Engineer',
      highlight: 'Partner',
      quote:
        'During incidents Jordan balances urgency and trust—keeps the room focused on customers with zero blame.',
    },
  ];

  get overallScore(): number {
    if (!this.ratings.length) {
      return 0;
    }
    const total = this.ratings.reduce((sum, item) => sum + item.score, 0);
    return Number((total / this.ratings.length).toFixed(1));
  }

  get highestCategory(): string {
    const [top] = [...this.ratings].sort((a, b) => b.score - a.score);
    return top?.category ?? '';
  }

  // UI stats for header cards
  get inViewCount(): number {
    return this.ratings.length;
  }

  get totalRecordsCount(): number {
    return this.ratings.length;
  }

  get categoryCount(): number {
    return new Set(this.ratings.map((r) => r.category)).size;
  }
}
