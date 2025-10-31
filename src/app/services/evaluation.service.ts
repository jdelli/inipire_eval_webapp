import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';

export interface EvaluationData {
  performance: number;
  productivity: number;
  teamwork: number;
  initiative: number;
  comments: string;
  strengths: string;
  improvements: string;
  average: number;
  evaluatedAt: Date;
  evaluatedBy?: string; // Optional: ID of the person who did the evaluation
}

export interface SavedEvaluation extends EvaluationData {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly firestore = inject(Firestore);

  /**
   * Save an evaluation to the subcollection of an employee
   * Path: employees/{employeeId}/evaluations/{evaluationId}
   */
  saveEmployeeEvaluation(
    employeeId: string,
    evaluationData: Omit<EvaluationData, 'evaluatedAt'>
  ): Observable<string> {
    const data = {
      ...evaluationData,
      evaluatedAt: Timestamp.now(),
    };

    const evaluationsRef = collection(
      this.firestore,
      `employees/${employeeId}/evaluations`
    );

    return from(
      addDoc(evaluationsRef, data).then((docRef) => {
        console.log('✅ Employee evaluation saved:', docRef.id);
        return docRef.id;
      })
    );
  }

  /**
   * Save an evaluation to the subcollection of a trainee
   * Path: trainingRecords/{traineeId}/evaluations/{evaluationId}
   */
  saveTraineeEvaluation(
    traineeId: string,
    evaluationData: Omit<EvaluationData, 'evaluatedAt'>
  ): Observable<string> {
    const data = {
      ...evaluationData,
      evaluatedAt: Timestamp.now(),
    };

    const evaluationsRef = collection(
      this.firestore,
      `trainingRecords/${traineeId}/evaluations`
    );

    return from(
      addDoc(evaluationsRef, data).then((docRef) => {
        console.log('✅ Trainee evaluation saved:', docRef.id);
        return docRef.id;
      })
    );
  }

  /**
   * Get all evaluations for an employee
   */
  getEmployeeEvaluations(employeeId: string): Observable<SavedEvaluation[]> {
    const evaluationsRef = collection(
      this.firestore,
      `employees/${employeeId}/evaluations`
    );
    const q = query(evaluationsRef, orderBy('evaluatedAt', 'desc'));

    return from(
      getDocs(q).then((snapshot) => {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          evaluatedAt: doc.data()['evaluatedAt']?.toDate(),
        })) as SavedEvaluation[];
      })
    );
  }

  /**
   * Get all evaluations for a trainee
   */
  getTraineeEvaluations(traineeId: string): Observable<SavedEvaluation[]> {
    const evaluationsRef = collection(
      this.firestore,
      `trainingRecords/${traineeId}/evaluations`
    );
    const q = query(evaluationsRef, orderBy('evaluatedAt', 'desc'));

    return from(
      getDocs(q).then((snapshot) => {
        return snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          evaluatedAt: doc.data()['evaluatedAt']?.toDate(),
        })) as SavedEvaluation[];
      })
    );
  }

  /**
   * Get the most recent evaluation for an employee
   */
  getLatestEmployeeEvaluation(
    employeeId: string
  ): Observable<SavedEvaluation | null> {
    const evaluationsRef = collection(
      this.firestore,
      `employees/${employeeId}/evaluations`
    );
    const q = query(evaluationsRef, orderBy('evaluatedAt', 'desc'), limit(1));

    return from(
      getDocs(q).then((snapshot) => {
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          evaluatedAt: doc.data()['evaluatedAt']?.toDate(),
        } as SavedEvaluation;
      })
    );
  }

  /**
   * Get the most recent evaluation for a trainee
   */
  getLatestTraineeEvaluation(
    traineeId: string
  ): Observable<SavedEvaluation | null> {
    const evaluationsRef = collection(
      this.firestore,
      `trainingRecords/${traineeId}/evaluations`
    );
    const q = query(evaluationsRef, orderBy('evaluatedAt', 'desc'), limit(1));

    return from(
      getDocs(q).then((snapshot) => {
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return {
          id: doc.id,
          ...doc.data(),
          evaluatedAt: doc.data()['evaluatedAt']?.toDate(),
        } as SavedEvaluation;
      })
    );
  }
}
