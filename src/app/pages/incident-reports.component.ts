import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { incidents } from '../data/mock-data';

interface IncidentMetric {
  label: string;
  value: string;
  delta: string;
  status: 'positive' | 'neutral' | 'negative';
}

interface PlaybookItem {
  title: string;
  owner: string;
  due: string;
  detail: string;
  status: 'In progress' | 'Completed' | 'Planned';
}

@Component({
  selector: 'app-incident-reports',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './incident-reports.component.html',
  styles: ``,
})
export class IncidentReportsComponent {
  readonly incidents = incidents;

  readonly incidentMetrics: IncidentMetric[] = [
    {
      label: 'Active incidents',
      value: '2',
      delta: '-1 vs last week',
      status: 'positive',
    },
    {
      label: 'MTTR (rolling 30d)',
      value: '58 min',
      delta: '-34% improvement',
      status: 'positive',
    },
    {
      label: 'Executive visibility',
      value: '3 open actions',
      delta: 'All owners confirmed',
      status: 'neutral',
    },
    {
      label: 'Customer impact',
      value: '12 accounts',
      delta: 'Proactive comms sent',
      status: 'neutral',
    },
  ];

  readonly playbook: PlaybookItem[] = [
    {
      title: 'APAC latency stabilization',
      owner: 'Marcus Hall',
      due: 'Jul 2',
      detail: 'Run chaos drill, finalize auto-scale policy, publish RCA with prevention steps.',
      status: 'In progress',
    },
    {
      title: 'Enterprise renewal mitigation',
      owner: 'Priya Desai',
      due: 'Jul 5',
      detail: 'Deliver remediation roadmap + exec response for $4.3M account.',
      status: 'In progress',
    },
    {
      title: 'Compliance readiness dashboard',
      owner: 'Alex Morgan',
      due: 'Jun 30',
      detail: 'Embed documentation health metrics into leadership scorecard.',
      status: 'Completed',
    },
  ];
}
