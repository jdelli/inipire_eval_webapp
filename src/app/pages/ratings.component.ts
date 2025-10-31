import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
  styles: ``,
})
export class RatingsComponent {
  readonly ratings = ratings;

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
}
