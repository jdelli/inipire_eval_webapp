# ExecEval

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.17.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
# inipire_eval_webapp

## Deploying to Vercel

This project is ready to deploy on Vercel as a static Angular app.

- Build command: `npm run build`
- Output directory: `dist/exec-eval/browser`
- SPA routing: Configured via `vercel.json` to rewrite all routes to `index.html`.

### Environment variables

Firebase keys and related settings are now sourced from environment variables. Provide them via a local `.env` file (for dev) or Vercel Project Settings (for Preview/Production builds):

Required keys:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_MEASUREMENT_ID` (optional)
- `DEFAULT_COMPANY_ID` (optional; defaults to `inspire-holdings` in dev and `inspire-next` in prod)

The build hooks generate `src/environments/environment.ts` and `src/environments/environment.production.ts` from these variables.

### One-time setup (CLI)

1. Install Vercel CLI (optional): `npm i -g vercel`
2. From the project root, link the project: `vercel link`
3. Deploy a preview: `vercel`
4. Deploy to production: `vercel --prod`

### GitHub integration

Alternatively, connect the repository in the Vercel Dashboard. Vercel will detect Angular automatically and use:

- Build Command: `npm run build`
- Output Directory: `dist/exec-eval`

Environment variables (e.g., Firebase) are read from `src/environments`. If you later move secrets to runtime env vars, add them in the Project Settings on Vercel.
