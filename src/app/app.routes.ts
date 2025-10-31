import { Routes } from '@angular/router';
import { RoleHostComponent } from './layout/role-host.component';
import { DashboardComponent } from './pages/dashboard.component';
import { WeeklyEvaluationComponent } from './pages/weekly-evaluation.component';
import { RatingsComponent } from './pages/ratings.component';
import { IncidentReportsComponent } from './pages/incident-reports.component';
import { PersonnelComponent } from './pages/personnel.component';
import { FirebaseTestComponent } from './pages/firebase-test.component';
import { LoginComponent } from './pages/login.component';
import { RegisterComponent } from './pages/register.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: '',
    canActivate: [authGuard],
    component: RoleHostComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'weekly-evaluation', component: WeeklyEvaluationComponent },
      { path: 'ratings', component: RatingsComponent },
      { path: 'incident-reports', component: IncidentReportsComponent },
      { path: 'personnel', component: PersonnelComponent },
      { path: 'firebase-test', component: FirebaseTestComponent },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
