# System Flow Diagram

## User Registration Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     REGISTRATION PROCESS                          │
└─────────────────────────────────────────────────────────────────┘

1. User fills basic info (email, password, name)
                    ↓
2. User selects Department
                    ↓
3. EmployeeSelectorComponent fetches:
   - employees where department = selected
   - trainingRecords where department = selected
                    ↓
4. User selects their Employee/Trainee record
                    ↓
5. EmployeeSubcollectionService initializes:
   - {source}/{employeeId}/evaluations/_initialized
   - {source}/{employeeId}/irReports/_initialized
                    ↓
6. AuthService creates user account with:
   - Basic user info
   - employeeId: "emp123"
   - employeeSource: "employees" or "trainingRecords"
   - employeeName: "John Doe"
                    ↓
7. User account created and linked to employee record
```

## Evaluation Submission Flow (Self-Evaluation)
```
┌─────────────────────────────────────────────────────────────────┐
│                   SELF-EVALUATION PROCESS                         │
└─────────────────────────────────────────────────────────────────┘

1. User logs in
                    ↓
2. AuthService.profile$ provides:
   - uid, email, fullName, department
   - employeeId, employeeSource, employeeName
                    ↓
3. User fills evaluation form
                    ↓
4. UserEmployeeService.saveCurrentUserEvaluation()
                    ↓
5. Service reads user's employeeId and employeeSource
                    ↓
6. Calls appropriate method:
   - If source = 'employees': 
     EvaluationService.saveEmployeeEvaluation()
   - If source = 'trainingRecords': 
     EvaluationService.saveTraineeEvaluation()
                    ↓
7. Evaluation saved to:
   {employeeSource}/{employeeId}/evaluations/{autoId}
```

## Team Leader Evaluation Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                 TEAM LEADER EVALUATION PROCESS                    │
└─────────────────────────────────────────────────────────────────┘

1. Team Leader logs in
                    ↓
2. Team Leader selects Department
                    ↓
3. EmployeeSelectorComponent shows team members
                    ↓
4. Team Leader selects Employee to evaluate
                    ↓
5. Form populates with employee info
                    ↓
6. Team Leader fills evaluation form
                    ↓
7. UserEmployeeService.saveEvaluationForEmployee(
     employeeId, source, evaluationData
   )
                    ↓
8. Evaluation saved to:
   {source}/{employeeId}/evaluations/{autoId}
   
   With additional field:
   - evaluatedBy: "Team Leader Name"
```

## Data Relationships
```
┌──────────────────────┐
│  TLtraineeUsers/     │ (User Accounts)
│  {userId}            │
├──────────────────────┤
│ email                │
│ fullName             │
│ department           │
│ isTeamleader         │
│ ├─ employeeId ───────┼───────┐
│ └─ employeeSource    │       │ (Reference)
└──────────────────────┘       │
                               │
                               ↓
              ┌────────────────┴────────────────┐
              │                                 │
    ┌─────────▼─────────┐          ┌──────────▼──────────┐
    │ employees/        │          │ trainingRecords/    │
    │ {employeeId}      │          │ {traineeId}         │
    ├───────────────────┤          ├─────────────────────┤
    │ firstName         │          │ firstName           │
    │ lastName          │          │ lastName            │
    │ department        │          │ department          │
    │ position          │          │ position            │
    │                   │          │                     │
    │ ├─ evaluations/   │          │ ├─ evaluations/     │
    │ │  ├─ {evalId1}   │          │ │  ├─ {evalId1}     │
    │ │  └─ {evalId2}   │          │ │  └─ {evalId2}     │
    │ │                 │          │ │                   │
    │ └─ irReports/     │          │ └─ irReports/       │
    │    ├─ {reportId1} │          │    ├─ {reportId1}   │
    │    └─ {reportId2} │          │    └─ {reportId2}   │
    └───────────────────┘          └─────────────────────┘
```

## Service Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         SERVICE LAYERS                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ Register         │  │ Evaluation       │  │ Team          │ │
│  │ Component        │  │ Component        │  │ Evaluation    │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
└───────────┼────────────────────┼───────────────────┼───────────┘
            │                    │                   │
            ↓                    ↓                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                         │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │           UserEmployeeService (Simplified API)               ││
│  │  - saveCurrentUserEvaluation()                               ││
│  │  - saveCurrentUserIRReport()                                 ││
│  │  - getCurrentUserEvaluations()                               ││
│  │  - saveEvaluationForEmployee()                               ││
│  └──────────────────────────────────────────────────────────────┘│
│                               ↓                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ AuthService      │  │ EvaluationService│  │ ReportingService│
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│           ↓                     ↓                      ↓          │
└───────────┼─────────────────────┼──────────────────────┼─────────┘
            │                     │                      │
            ↓                     ↓                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DATA ACCESS LAYER                          │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │            EmployeeSubcollectionService                      ││
│  │  - initializeSubcollections()                                ││
│  │  - addEvaluation()                                           ││
│  │  - addIRReport()                                             ││
│  │  - getEmployeeEvaluations()                                  ││
│  │  - getEmployeeIRReports()                                    ││
│  └──────────────────────────────────────────────────────────────┘│
│                               ↓                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │               Angular Fire (Firestore)                       ││
│  └──────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                     FIREBASE FIRESTORE                            │
└─────────────────────────────────────────────────────────────────┘
```

## Component Communication
```
┌─────────────────────────────────────────────────────────────────┐
│                 EMPLOYEE SELECTOR COMPONENT                       │
└─────────────────────────────────────────────────────────────────┘

RegisterComponent
    │
    ├─ @Input: selectedDepartment
    │         ↓
    │  EmployeeSelectorComponent
    │         │
    │         ├─ Fetches: PersonnelService.getEmployees()
    │         ├─ Fetches: PersonnelService.getTrainees()
    │         ├─ Filters by department
    │         └─ @Output: employeeSelected
    │                    ↓
    └─ onEmployeeSelected(employee: SelectedEmployee)
              ↓
       {
         id: "emp123",
         name: "John Doe",
         source: "employees",
         department: "IT",
         email: "john@example.com"
       }
```

## Security Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                    FIREBASE SECURITY RULES                        │
└─────────────────────────────────────────────────────────────────┘

Request: Save Evaluation
         ↓
┌────────────────────────────────────────┐
│ Check if user is authenticated         │
└────────┬───────────────────────────────┘
         ↓ YES
┌────────────────────────────────────────┐
│ Is user writing to their own record?   │
│ (TLtraineeUsers/{uid}.employeeId)     │
└────────┬───────────────┬───────────────┘
         ↓ YES           ↓ NO
    ┌────────┐    ┌──────────────────────┐
    │ ALLOW  │    │ Is user a team leader?│
    └────────┘    └──────┬───────────────┘
                         ↓ YES
                    ┌────────┐
                    │ ALLOW  │
                    └────────┘
```
