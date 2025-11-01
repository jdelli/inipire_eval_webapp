# Employee Subcollection Implementation Guide

## Overview
This implementation allows evaluations and incident reports to be stored as subcollections under specific employee or trainee documents in Firebase. When creating a new user, you can link them to an employee/trainee record, and all their evaluations and IR reports will be stored under that person's document.

## Firebase Structure

```
Firestore
├── employees/
│   ├── {employeeId}/
│   │   ├── (employee data)
│   │   ├── evaluations/
│   │   │   ├── {evalId1}/
│   │   │   └── {evalId2}/
│   │   ├── irReports/
│   │   │   ├── {reportId1}/
│   │   │   └── {reportId2}/
│   │   └── dailyReport/
│   │       └── {dateKey}/
│
├── trainingRecords/
│   ├── {traineeId}/
│   │   ├── (trainee data)
│   │   ├── evaluations/
│   │   │   ├── {evalId1}/
│   │   │   └── {evalId2}/
│   │   ├── irReports/
│   │   │   ├── {reportId1}/
│   │   │   └── {reportId2}/
│   │   └── incedentReports/  (legacy)
│   │       └── {reportId}/
│
└── TLtraineeUsers/
    └── {userId}/
        ├── email
        ├── fullName
        ├── department
        ├── isTeamleader
        ├── employeeId       (NEW)
        ├── employeeSource   (NEW: 'employees' | 'trainingRecords')
        └── employeeName     (NEW)
```

## Components Created

### 1. **EmployeeSelectorComponent**
Location: `src/app/components/employee-selector/employee-selector.component.ts`

A reusable dropdown component that:
- Loads employees and trainees from Firebase filtered by department
- Groups them into optgroups (Employees and Trainees)
- Emits selected employee information including their source collection

**Usage:**
```typescript
<app-employee-selector
  [selectedDepartment]="department.value"
  (employeeSelected)="onEmployeeSelected($event)"
></app-employee-selector>
```

**Output Event:**
```typescript
interface SelectedEmployee {
  id: string;
  name: string;
  source: 'employees' | 'trainingRecords';
  department: string;
  email?: string;
}
```

### 2. **EmployeeSubcollectionService**
Location: `src/app/services/employee-subcollection.service.ts`

Core service for managing subcollections:

**Methods:**
- `initializeSubcollections(employeeId, source)` - Creates placeholder documents
- `addEvaluation(employeeId, source, evaluationData)` - Adds evaluation to subcollection
- `addIRReport(employeeId, source, reportData)` - Adds IR report to subcollection
- `getEmployeeEvaluations(employeeId, source)` - Retrieves all evaluations
- `getEmployeeIRReports(employeeId, source)` - Retrieves all IR reports

**Example:**
```typescript
constructor(private employeeSubcollectionService: EmployeeSubcollectionService) {}

// Add an evaluation
this.employeeSubcollectionService
  .addEvaluation('emp123', 'employees', {
    score: 85,
    comments: 'Great work!',
    evaluatorName: 'John Doe',
    evaluationType: 'monthly'
  })
  .subscribe(result => {
    if (result.success) {
      console.log('Evaluation added with ID:', result.id);
    }
  });

// Get all evaluations
this.employeeSubcollectionService
  .getEmployeeEvaluations('emp123', 'employees')
  .subscribe(evaluations => {
    console.log('Evaluations:', evaluations);
  });
```

### 3. **UserEmployeeService**
Location: `src/app/services/user-employee.service.ts`

Bridge service that connects authenticated users to their employee records:

**Methods for Current User:**
- `saveCurrentUserEvaluation(evaluationData)` - Save eval for logged-in user
- `saveCurrentUserIRReport(reportData)` - Save IR report for logged-in user
- `getCurrentUserEvaluations()` - Get logged-in user's evaluations
- `getCurrentUserIRReports()` - Get logged-in user's IR reports

**Methods for Team Leaders/Admins:**
- `saveEvaluationForEmployee(employeeId, source, evaluationData)`
- `saveIRReportForEmployee(employeeId, source, reportData)`

**Example:**
```typescript
constructor(private userEmployeeService: UserEmployeeService) {}

// Save evaluation for current logged-in user
this.userEmployeeService
  .saveCurrentUserEvaluation({
    performance: 4,
    productivity: 5,
    teamwork: 4,
    initiative: 5,
    comments: 'Excellent work this week',
    strengths: 'Great teamwork',
    improvements: 'Time management',
    average: 4.5
  })
  .subscribe(evalId => {
    console.log('Evaluation saved:', evalId);
  });
```

## Updated Services

### AuthService
**Updated:**
- `RegisterPayload` interface now includes `employeeId`, `employeeSource`, `employeeName`
- `UserProfile` interface now includes employee reference fields
- `register()` method saves employee reference in user document

### ReportingService
**Added:**
- `createEmployeeIncidentReport(employeeId, payload)` - For employees collection
- `createIncidentReportFor(personId, source, payload)` - Generic method for both

### EvaluationService
**Already Supports:**
- `saveEmployeeEvaluation(employeeId, evaluationData)`
- `saveTraineeEvaluation(traineeId, evaluationData)`
- `getEmployeeEvaluations(employeeId)`
- `getTraineeEvaluations(traineeId)`

## Updated Components

### RegisterComponent
**Changes:**
- Added employee selector dropdown after department selection
- Stores employee reference when creating new user
- Initializes subcollections when employee is selected
- Validates that an employee is selected before submission

## Usage Examples

### 1. Creating a New User with Employee Link

When a user registers, they must:
1. Select their department
2. Select their employee/trainee record from the dropdown
3. Complete registration

The system will:
- Link the user account to the selected employee/trainee
- Initialize evaluation and IR report subcollections
- Store the reference in the user's profile

### 2. Saving an Evaluation for Current User

```typescript
// In any component
constructor(
  private userEmployeeService: UserEmployeeService,
  private authService: AuthService
) {}

submitEvaluation() {
  const evaluationData = {
    performance: this.form.value.performance,
    productivity: this.form.value.productivity,
    teamwork: this.form.value.teamwork,
    initiative: this.form.value.initiative,
    comments: this.form.value.comments,
    strengths: this.form.value.strengths,
    improvements: this.form.value.improvements,
    average: this.calculateAverage()
  };

  this.userEmployeeService
    .saveCurrentUserEvaluation(evaluationData)
    .subscribe({
      next: (evalId) => {
        console.log('Evaluation saved:', evalId);
        this.showSuccess();
      },
      error: (err) => {
        console.error('Error saving evaluation:', err);
        this.showError();
      }
    });
}
```

### 3. Saving an IR Report

```typescript
submitIncidentReport() {
  const reportData = {
    date: new Date().toISOString().slice(0, 10),
    title: this.form.value.title,
    severity: this.form.value.severity,
    status: 'Open',
    summary: this.form.value.summary,
    impact: this.form.value.impact,
    actions: this.form.value.actions,
    reportedBy: this.currentUserName
  };

  this.userEmployeeService
    .saveCurrentUserIRReport(reportData)
    .subscribe({
      next: (reportId) => {
        console.log('IR Report saved:', reportId);
        this.router.navigate(['/incident-reports']);
      },
      error: (err) => {
        console.error('Error saving IR report:', err);
      }
    });
}
```

### 4. Team Leader Evaluating a Team Member

```typescript
// Get employee info from personnel selection
evaluateEmployee(employeeId: string, source: 'employees' | 'trainingRecords') {
  const evaluationData = {
    performance: 4,
    productivity: 5,
    teamwork: 4,
    initiative: 5,
    comments: 'Great work this week',
    strengths: 'Excellent communication',
    improvements: 'Could improve time management',
    average: 4.5,
    evaluatedBy: this.currentUserId
  };

  this.userEmployeeService
    .saveEvaluationForEmployee(employeeId, source, evaluationData)
    .subscribe({
      next: (evalId) => {
        console.log('Evaluation saved for employee:', evalId);
      }
    });
}
```

### 5. Viewing All Evaluations for Current User

```typescript
ngOnInit() {
  this.userEmployeeService
    .getCurrentUserEvaluations()
    .subscribe(evaluations => {
      this.evaluations = evaluations;
      console.log('My evaluations:', evaluations);
    });
}
```

### 6. Viewing Evaluations for a Specific Employee (Admin/Team Leader)

```typescript
viewEmployeeEvaluations(employeeId: string, source: 'employees' | 'trainingRecords') {
  if (source === 'employees') {
    this.evaluationService
      .getEmployeeEvaluations(employeeId)
      .subscribe(evaluations => {
        this.employeeEvaluations = evaluations;
      });
  } else {
    this.evaluationService
      .getTraineeEvaluations(employeeId)
      .subscribe(evaluations => {
        this.traineeEvaluations = evaluations;
      });
  }
}
```

## Benefits

1. **Data Organization**: All evaluations and reports for a person are in one place
2. **Scalability**: Subcollections allow unlimited documents without affecting parent query performance
3. **Security**: Easy to set up Firebase security rules per employee
4. **Querying**: Can query all evaluations for a specific employee efficiently
5. **Relationship**: Clear link between users and their employee/trainee records

## Firebase Security Rules Example

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Employees subcollections
    match /employees/{employeeId}/evaluations/{evalId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (
        // User can write their own evaluations
        get(/databases/$(database)/documents/TLtraineeUsers/$(request.auth.uid)).data.employeeId == employeeId
        // Or team leaders can write evaluations
        || get(/databases/$(database)/documents/TLtraineeUsers/$(request.auth.uid)).data.isTeamleader == true
      );
    }
    
    match /employees/{employeeId}/irReports/{reportId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && (
        resource.data.reportedBy == request.auth.uid
        || get(/databases/$(database)/documents/TLtraineeUsers/$(request.auth.uid)).data.isTeamleader == true
      );
    }
    
    // Similar rules for trainingRecords
    match /trainingRecords/{traineeId}/evaluations/{evalId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Testing

To test the implementation:

1. **Register a new user:**
   - Navigate to `/register`
   - Fill in email, password, name
   - Select a department
   - Select an employee/trainee from the dropdown
   - Register

2. **Verify in Firebase Console:**
   - Check `TLtraineeUsers/{userId}` has `employeeId` and `employeeSource`
   - Check `employees/{employeeId}/evaluations/_initialized` exists
   - Check `employees/{employeeId}/irReports/_initialized` exists

3. **Create an evaluation:**
   - Use the weekly evaluation form
   - Submit and verify in Firebase under the employee's subcollection

4. **Create an IR report:**
   - Use the incident report form
   - Submit and verify in Firebase under the employee's subcollection

## Migration Notes

If you have existing evaluations or IR reports in a different structure, you'll need to migrate them. Contact your admin for a migration script.

## Troubleshooting

**Issue**: Employee selector shows no employees
- **Solution**: Check that employees have a `department` field in Firebase
- **Solution**: Verify Personnel Service is correctly filtering by department

**Issue**: Subcollections not being created
- **Solution**: Check Firebase permissions
- **Solution**: Verify employeeId and source are correctly passed

**Issue**: Cannot save evaluation/IR report
- **Solution**: Ensure user has `employeeId` and `employeeSource` in their profile
- **Solution**: Check Firebase security rules allow the operation

## Next Steps

1. Update existing evaluation forms to use `UserEmployeeService`
2. Update IR report forms to use the new structure
3. Add UI to view all evaluations/reports for an employee
4. Implement filtering and sorting in the views
5. Add export functionality for reports
