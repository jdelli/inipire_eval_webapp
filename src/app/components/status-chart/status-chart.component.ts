import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType, LegendPosition } from '@swimlane/ngx-charts';

export interface ChartData {
  name: string;
  value: number;
}

type ChartVariant = 'doughnut' | 'pie' | 'bar';

@Component({
  selector: 'app-status-chart',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  template: `
    <div class="chart-container" *ngIf="chartData.length">
      <ng-container [ngSwitch]="variant">
        <ngx-charts-pie-chart
          *ngSwitchCase="'pie'"
          [results]="chartData"
          [gradient]="true"
          [legend]="true"
          [legendPosition]="legendPosition"
          [doughnut]="false"
          [arcWidth]="0.4"
          [animations]="true"
          [scheme]="colorScheme"
        >
        </ngx-charts-pie-chart>

        <ngx-charts-pie-chart
          *ngSwitchCase="'doughnut'"
          [results]="chartData"
          [gradient]="true"
          [legend]="true"
          [legendPosition]="legendPosition"
          [doughnut]="true"
          [arcWidth]="0.55"
          [animations]="true"
          [scheme]="colorScheme"
        >
        </ngx-charts-pie-chart>

        <ngx-charts-bar-vertical
          *ngSwitchCase="'bar'"
          [results]="chartData"
          [gradient]="false"
          [legend]="false"
          [xAxis]="true"
          [yAxis]="true"
          [roundDomains]="true"
          [animations]="true"
          [scheme]="colorScheme"
        >
        </ngx-charts-bar-vertical>

        <ngx-charts-pie-chart
          *ngSwitchDefault
          [results]="chartData"
          [gradient]="true"
          [legend]="true"
          [legendPosition]="legendPosition"
          [doughnut]="true"
          [arcWidth]="0.5"
          [animations]="true"
          [scheme]="colorScheme"
        >
        </ngx-charts-pie-chart>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .chart-container {
        height: 300px;
      }
    `,
  ],
})
export class StatusChartComponent implements OnChanges {
  @Input() data: ChartData[] = [];
  @Input() variant: ChartVariant = 'doughnut';

  chartData: ChartData[] = [];
  legendPosition = LegendPosition.Below;

  colorScheme: Color = {
    name: 'statusColors',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#6B7280'],
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.chartData = this.data;
    }
  }
}
