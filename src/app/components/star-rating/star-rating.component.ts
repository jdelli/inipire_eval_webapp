import { Component, forwardRef, Input, Output, EventEmitter } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './star-rating.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => StarRatingComponent),
      multi: true,
    },
  ],
})
export class StarRatingComponent implements ControlValueAccessor {
  @Input() maxRating = 5;
  @Input() value = 0;
  @Output() valueChange = new EventEmitter<number>();
  
  rating = 0;
  hoveredRating = 0;

  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    if (this.value) {
      this.rating = this.value;
    }
  }

  get stars(): number[] {
    return Array(this.maxRating)
      .fill(0)
      .map((_, i) => i + 1);
  }

  writeValue(value: number): void {
    this.rating = value;
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setRating(rating: number): void {
    this.rating = rating;
    this.onChange(this.rating);
    this.onTouched();
    this.valueChange.emit(this.rating);
  }

  setHoveredRating(rating: number): void {
    this.hoveredRating = rating;
  }

  resetHoveredRating(): void {
    this.hoveredRating = 0;
  }
}
