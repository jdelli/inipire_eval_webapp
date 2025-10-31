import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule, Color, ScaleType, LegendPosition } from '@swimlane/ngx-charts';

export interface ChartData {
  name: string;
  value: number;
}

@Component({
  selector: 'app-status-chart',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  template: `
    <div class="chart-container" *ngIf="chartData.length">
      <ngx-charts-pie-chart
        [results]="chartData"
        [gradient]="true"
        [legend]="true"
        [legendPosition]="legendPosition"
        [doughnut]="true"
        [arcWidth]="0.5"
        [scheme]="colorScheme"
      >
      </ngx-charts-pie-chart>
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
