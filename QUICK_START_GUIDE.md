# Quick Start Guide

## 🚀 Getting Started with Employee Subcollections

This is a 5-minute guide to start using the employee subcollection system in your app.

## Step 1: Register a New User (2 minutes)

1. Navigate to the registration page: `/register`

2. Fill in the form:
   - Email: `test@example.com`
   - Password: `password123`
   - Full Name: `Test User`
   - Department: Select from dropdown (e.g., "IT")
   - **Employee/Trainee**: Select from the dropdown that appears
   - Team Leader: Check if applicable

3. Click "Register"

4. ✅ User is now linked to an employee record!

## Step 2: Verify in Firebase (1 minute)

1. Open Firebase Console: https://console.firebase.google.com
2. Go to Firestore Database
3. Check `TLtraineeUsers/{userId}` has:
   - `employeeId`
   - `employeeSource`
   - `employeeName`
4. Check `employees/{employeeId}` or `trainingRecords/{traineeId}` has:
   - `evaluations/_initialized`
   - `irReports/_initialized`

## Step 3: Submit an Evaluation (2 minutes)

### Option A: Use the Example Component

1. Add route to `app.routes.ts`:
```typescript
import { EvaluationExampleComponent } from './pages/evaluation-example.component';

export const routes: Routes = [
  // ... existing routes
  { path: 'evaluation-example', component: EvaluationExampleComponent },
];
```

2. Navigate to `/evaluation-example`
3. Fill out the form
4. Click "Submit Evaluation"
5. ✅ Check Firebase - evaluation appears under employee subcollection!

### Option B: Use in Your Existing Component

```typescript
import { UserEmployeeService } from './services/user-employee.service';

constructor(private userEmployeeService: UserEmployeeService) {}

submitEvaluation() {
  const evaluationData = {
    performance: 4,
    productivity: 5,
    teamwork: 4,
    initiative: 5,
    comments: 'Great work!',
    strengths: 'Excellent communication',
    improvements: 'Time management',
    average: 4.5
  };

  this.userEmployeeService
    .saveCurrentUserEvaluation(evaluationData)
    .subscribe({
      next: (evalId) => console.log('Saved:', evalId),
      error: (err) => console.error('Error:', err)
    });
}
```

## Common Use Cases

### 1. Save Evaluation for Current User
```typescript
// In any component
this.userEmployeeService
  .saveCurrentUserEvaluation(evaluationData)
  .subscribe(evalId => console.log('Evaluation saved:', evalId));
```

### 2. Save IR Report for Current User
```typescript
const reportData = {
  date: '2025-11-01',
  title: 'Network Outage',
  severity: 'high',
  status: 'Open',
  summary: 'Server went down',
  impact: 'All users affected',
  actions: ['Restarted server', 'Contacted IT support']
};

this.userEmployeeService
  .saveCurrentUserIRReport(reportData)
  .subscribe(reportId => console.log('Report saved:', reportId));
```

### 3. Team Leader Evaluating a Team Member
```typescript
// After selecting employee from EmployeeSelectorComponent
this.userEmployeeService
  .saveEvaluationForEmployee(
    employeeId,
    source,  // 'employees' or 'trainingRecords'
    evaluationData
  )
  .subscribe(evalId => console.log('Evaluation saved:', evalId));
```

### 4. View Current User's Evaluations
```typescript
this.userEmployeeService
  .getCurrentUserEvaluations()
  .subscribe(evaluations => {
    console.log('My evaluations:', evaluations);
    this.evaluations = evaluations;
  });
```

### 5. View Specific Employee's Evaluations (Team Leader)
```typescript
if (source === 'employees') {
  this.evaluationService
    .getEmployeeEvaluations(employeeId)
    .subscribe(evals => this.evaluations = evals);
} else {
  this.evaluationService
    .getTraineeEvaluations(traineeId)
    .subscribe(evals => this.evaluations = evals);
}
```

## Integration with Existing Components

### Update Your Evaluation Form Component

**Before:**
```typescript
// Old way - no employee linkage
this.evaluationService
  .saveEmployeeEvaluation(???, evaluationData)  // Which employee?
  .subscribe(...);
```

**After:**
```typescript
// New way - automatically uses logged-in user's employee record
this.userEmployeeService
  .saveCurrentUserEvaluation(evaluationData)
  .subscribe(...);
```

### Update Your IR Report Component

**Before:**
```typescript
// Old way
this.reportingService
  .createIncidentReport(???, reportData)  // Which trainee?
  .subscribe(...);
```

**After:**
```typescript
// New way
this.userEmployeeService
  .saveCurrentUserIRReport(reportData)
  .subscribe(...);
```

## Troubleshooting

### Problem: "No employee linked to current user"

**Solution:**
- User needs to register again OR
- Manually add `employeeId` and `employeeSource` to their user document in Firebase

### Problem: Employee selector shows no employees

**Solution:**
- Check that employees have a `department` field in Firebase
- Make sure department values match exactly (case-sensitive)
- Check Firebase console for employee documents

### Problem: Cannot save evaluation

**Solution:**
- Verify user is logged in: `this.authService.profile$` emits a value
- Verify user has `employeeId` in their profile
- Check browser console for error messages
- Check Firebase security rules

## What Files Do I Need to Touch?

### To use in existing components:

1. **Import the service:**
   ```typescript
   import { UserEmployeeService } from './services/user-employee.service';
   ```

2. **Inject in constructor:**
   ```typescript
   constructor(private userEmployeeService: UserEmployeeService) {}
   ```

3. **Replace evaluation/IR save calls:**
   - Old: `this.evaluationService.saveEmployeeEvaluation(...)`
   - New: `this.userEmployeeService.saveCurrentUserEvaluation(...)`

### To add new routes:

Update `src/app/app.routes.ts`:
```typescript
import { EvaluationExampleComponent } from './pages/evaluation-example.component';
import { TeamEvaluationComponent } from './pages/team-evaluation-example.component';

export const routes: Routes = [
  // ... existing routes
  { path: 'evaluation-example', component: EvaluationExampleComponent },
  { path: 'team-evaluation', component: TeamEvaluationComponent },
];
```

## Testing Checklist

- [ ] Register new user and see employee selector
- [ ] Select employee and complete registration
- [ ] Verify employee link in Firebase Console
- [ ] Submit evaluation as that user
- [ ] See evaluation in Firebase under employee subcollection
- [ ] Submit IR report as that user
- [ ] See IR report in Firebase under employee subcollection
- [ ] Login as team leader
- [ ] Evaluate another team member
- [ ] See evaluation with evaluator name

## Next Steps

1. ✅ Try the example components first
2. ✅ Integrate into your existing evaluation forms
3. ✅ Add Firebase security rules (see EMPLOYEE_SUBCOLLECTION_GUIDE.md)
4. ✅ Update your IR report forms
5. ✅ Create views to display evaluation histories

## Need Help?

- 📖 See `EMPLOYEE_SUBCOLLECTION_GUIDE.md` for detailed documentation
- 📊 See `SYSTEM_FLOW_DIAGRAM.md` for visual flows
- 📝 See `IMPLEMENTATION_SUMMARY.md` for what was created

## Key Concepts

1. **User Account** = Login credentials + profile info
2. **Employee Record** = Person in employees/trainingRecords collection
3. **Link** = User account references an employee record via `employeeId` and `employeeSource`
4. **Subcollections** = Evaluations and IR reports stored under employee documents
5. **UserEmployeeService** = Simplified API that handles the linking automatically

That's it! You're ready to go! 🎉
