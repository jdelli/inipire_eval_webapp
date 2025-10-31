export interface MetricCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  status: 'up' | 'down';
  note: string;
}

export interface GoalProgress {
  title: string;
  progress: number;
  owner: string;
  timeline: string;
  status: 'on-track' | 'at-risk' | 'watch';
  impact: string;
}

export interface WeeklyCheckIn {
  week: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  focus: string;
  momentum: number;
  highlight: string;
  blockers: string[];
  commitments: string[];
  contributors: string[];
}

export interface RatingCategory {
  category: string;
  score: number;
  benchmark: number;
  delta: number;
  strengths: string[];
  improvements: string[];
}

export interface IncidentReport {
  id: string;
  date: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'Open' | 'Monitoring' | 'Resolved';
  owner: string;
  summary: string;
  impact: string;
  actions: string[];
}

export interface EngagementPulse {
  label: string;
  value: number;
  previous: number;
}

export interface ContributorSpotlight {
  name: string;
  role: string;
  contribution: string;
  sentiment: number;
  avatar: string;
}

export const employeeSnapshot = {
  name: 'Jordan Chen',
  role: 'Director of Product Strategy',
  manager: 'Avery Patel',
  location: 'Seattle, WA',
  tenure: '3.7 years',
  lastPromotion: 'Apr 2023',
  directReports: 8,
  avatar: 'https://i.pravatar.cc/100?img=12',
};

export const metricCards: MetricCard[] = [
  {
    title: 'Engagement Score',
    value: '87%',
    change: 4.2,
    changeLabel: 'since last review',
    status: 'up',
    note: 'Team pulse survey response rate 92%',
  },
  {
    title: 'Strategic Goals',
    value: '6 / 8',
    change: 1,
    changeLabel: 'new initiatives green',
    status: 'up',
    note: 'Launch readiness tracking 92% across streams',
  },
  {
    title: 'Retention Risk',
    value: 'Low',
    change: -1.5,
    changeLabel: 'attrition probability',
    status: 'down',
    note: 'Top performers all committed through Q4',
  },
  {
    title: 'Executive Confidence',
    value: '4.6 / 5',
    change: 0.3,
    changeLabel: 'quarter-over-quarter',
    status: 'up',
    note: 'Board feedback highlights clarity & influence',
  },
];

export const goalProgress: GoalProgress[] = [
  {
    title: 'APAC Expansion Blueprint',
    progress: 78,
    owner: 'Jordan Chen',
    timeline: 'Q3 2025',
    status: 'on-track',
    impact: 'Unlocks $24M net-new ARR with tiered rollout',
  },
  {
    title: 'AI Pricing Copilot',
    progress: 64,
    owner: 'Elena Ruiz',
    timeline: 'Pilot July 14',
    status: 'watch',
    impact: 'Self-serve pricing decisions across sales pods',
  },
  {
    title: 'Service Reliability Reset',
    progress: 52,
    owner: 'Marcus Hall',
    timeline: 'Stability exit criteria July 30',
    status: 'at-risk',
    impact: 'Cloud incident volume cut by 40% vs. baseline',
  },
];

export const weeklyCheckIns: WeeklyCheckIn[] = [
  {
    week: 'Week ending Jun 27',
    sentiment: 'positive',
    focus: 'Shipped the Northstar roadmap narrative for Q3 OKR kickoff.',
    momentum: 86,
    highlight:
      'Executive steering committee aligned on value delivery milestones and investment guardrails.',
    blockers: [
      'Finance requires revised ROI stack-up for the AI Copilot initiative.',
    ],
    commitments: [
      'Finalize cost-benefit scenarios with FP&A by Tuesday.',
      'Host enablement session for GTM leads about roadmap articulation.',
    ],
    contributors: [
      'Elena Ruiz',
      'Marcus Hall',
      'Priya Desai',
    ],
  },
  {
    week: 'Week ending Jun 20',
    sentiment: 'positive',
    focus: 'Stabilized cross-functional delivery operating rhythm.',
    momentum: 74,
    highlight:
      'Weekly product-health review cadence now includes design research signals and CX NPS.',
    blockers: [
      'Need deeper visibility into partner engineering staffing allocation.',
    ],
    commitments: [
      'Draft shared dashboards for engineering and CX leadership.',
      'Publish decision log for expansion go/no-go criteria.',
    ],
    contributors: [
      'Alex Morgan',
      'Sasha Patel',
    ],
  },
  {
    week: 'Week ending Jun 13',
    sentiment: 'neutral',
    focus: 'Reset timeline expectations after upstream vendor delay.',
    momentum: 61,
    highlight:
      'Prevented scope creep by clarifying customer rollout phases with Sales Ops.',
    blockers: [
      'Vendor dataset refresh still pending; may impact analytics launch.',
    ],
    commitments: [
      'Escalate vendor SLA through legal by Monday.',
      'Co-design mitigation paths with Ops team.',
    ],
    contributors: [
      'Dana Williams',
      'Oliver Grant',
    ],
  },
];

export const ratings: RatingCategory[] = [
  {
    category: 'Strategic Clarity',
    score: 4.7,
    benchmark: 4.2,
    delta: 0.4,
    strengths: [
      'Translates vision into crisp, measurable operating guardrails.',
      'Helps peers reframe ambiguous problems into actionable horizons.',
    ],
    improvements: [
      'Push earlier visibility into downstream tradeoffs for Sales.',
    ],
  },
  {
    category: 'Team Leadership',
    score: 4.5,
    benchmark: 4.1,
    delta: 0.3,
    strengths: [
      'Builds calm confidence; consistently unblocks cross-functional partners.',
      'Elevates rising leaders with clear ownership and outcomes.',
    ],
    improvements: [
      'Intensify succession planning depth for APAC rollout pod.',
    ],
  },
  {
    category: 'Operational Cadence',
    score: 4.2,
    benchmark: 3.9,
    delta: 0.2,
    strengths: [
      'Weekly scorecard fosters focus on leading indicators.',
      'Executes retros that translate into measurable adjustments.',
    ],
    improvements: [
      'Shrink feedback loop with Customer Success on go-live blockers.',
    ],
  },
  {
    category: 'Executive Influence',
    score: 4.8,
    benchmark: 4.3,
    delta: 0.5,
    strengths: [
      'Board recognizes Jordan as voice of the customer and operations.',
      'Excellent storytelling connects dots between teams rapidly.',
    ],
    improvements: [
      'Pre-wire analytics investment tradeoffs with Finance VP earlier.',
    ],
  },
];

export const incidents: IncidentReport[] = [
  {
    id: 'INC-2406-07',
    date: 'Jun 24, 2025',
    title: 'Service degradation: pricing API latency spike',
    severity: 'high',
    status: 'Monitoring',
    owner: 'Marcus Hall',
    summary:
      '30% latency increase detected on APAC pricing endpoints. Auto-scale policy misconfigured after infrastructure change freeze.',
    impact: '12 enterprise customers experienced degraded response time during quote generation.',
    actions: [
      'Applied hotfix scaling policy; latency normalized within 42 minutes.',
      'Launching chaos test for upcoming release train this Wednesday.',
      'Post-incident review scheduled with SRE & Platform team.',
    ],
  },
  {
    id: 'INC-2406-04',
    date: 'Jun 19, 2025',
    title: 'Enterprise renewal flagged: retention risk signal',
    severity: 'medium',
    status: 'Open',
    owner: 'Priya Desai',
    summary:
      'Strategic account reported gaps in analytics and governance controls. Renewal valued at $4.3M ARR.',
    impact: 'Executive sponsor requesting remediation roadmap within two weeks to unblock renewal signature.',
    actions: [
      'Joint working session set with Security & Analytics product leads.',
      'Drafting executive response for July QBR, aligning mitigation owners.',
      'Preparing investment scenarios for incremental roadmap acceleration.',
    ],
  },
  {
    id: 'INC-2406-02',
    date: 'Jun 12, 2025',
    title: 'Regulatory audit preparation variance',
    severity: 'low',
    status: 'Resolved',
    owner: 'Alex Morgan',
    summary:
      'Documentation gap identified for GDPR data deletion workflows ahead of external audit.',
    impact: 'No customer-facing impact. Audit readiness at 96% after remediation.',
    actions: [
      'Audit dashboard updated with evidence repository links.',
      'Instituted fortnightly compliance checkpoints through Q4.',
      'Shared learnings during leadership all-hands to reinforce rigor.',
    ],
  },
];

export const engagementPulse: EngagementPulse[] = [
  { label: 'Strategic alignment', value: 92, previous: 88 },
  { label: 'Role clarity', value: 88, previous: 84 },
  { label: 'Wellbeing', value: 83, previous: 79 },
  { label: 'Leadership trust', value: 95, previous: 92 },
];

export const contributorSpotlights: ContributorSpotlight[] = [
  {
    name: 'Elena Ruiz',
    role: 'Lead Product Manager',
    contribution: 'Unlocked cross-region readiness for AI pricing copilot pilot.',
    sentiment: 93,
    avatar: 'https://i.pravatar.cc/100?img=45',
  },
  {
    name: 'Marcus Hall',
    role: 'Principal Engineer',
    contribution: 'Built stability playbook cutting incident MTTR by 34%.',
    sentiment: 88,
    avatar: 'https://i.pravatar.cc/100?img=33',
  },
  {
    name: 'Priya Desai',
    role: 'Customer Strategy Lead',
    contribution: 'Secured executive alignment on enterprise renewal recovery.',
    sentiment: 91,
    avatar: 'https://i.pravatar.cc/100?img=15',
  },
];
