import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-firebase-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h2 class="text-xl font-bold mb-4">Firebase Connection Test</h2>
      <div class="space-y-2">
        <p><strong>Status:</strong> {{ status }}</p>
        <p><strong>Employees Count:</strong> {{ employeesCount }}</p>
        <p><strong>Trainees Count:</strong> {{ traineesCount }}</p>
        <div *ngIf="error" class="rounded border border-red-500 bg-red-50 p-4 text-red-700">
          <strong>Error:</strong> {{ error }}
        </div>
      </div>
    </div>
  `,
})
export class FirebaseTestComponent implements OnInit {
  private readonly firestore = inject(Firestore);
  
  status = 'Connecting...';
  employeesCount = 0;
  traineesCount = 0;
  error = '';

  async ngOnInit() {
    try {
      console.log('Testing Firebase connection...');
      
      // Test employees collection
      const employeesRef = collection(this.firestore, 'employees');
      const employeesSnap = await getDocs(employeesRef);
      this.employeesCount = employeesSnap.size;
      console.log('Employees found:', this.employeesCount);
      employeesSnap.forEach(doc => {
        console.log('Employee:', doc.id, doc.data());
      });
      
      // Test trainingRecords collection
      const traineesRef = collection(this.firestore, 'trainingRecords');
      const traineesSnap = await getDocs(traineesRef);
      this.traineesCount = traineesSnap.size;
      console.log('Trainees found:', this.traineesCount);
      traineesSnap.forEach(doc => {
        console.log('Trainee:', doc.id, doc.data());
      });
      
      this.status = 'Connected successfully!';
    } catch (err: any) {
      console.error('Firebase error:', err);
      this.error = err.message || JSON.stringify(err);
      this.status = 'Connection failed';
    }
  }
}
