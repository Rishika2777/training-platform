# Synkup

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

## Setup

If you encounter npm segmentation fault or out of memory errors on Windows (especially in Git Bash), see [SETUP.md](./SETUP.md) for troubleshooting steps.

## Development server

To start a local development server, run:

```bash
npm start
```

**For memory issues**, use the local development scripts (gitignored, won't affect other systems):
- PowerShell: `.\start-dev.ps1` (or `.\start-dev-low-memory.ps1` for < 8GB RAM)
- CMD: `start-dev.bat` (or `start-dev-low-memory.bat` for < 8GB RAM)
- Git Bash: `bash start-dev.sh` (or `bash start-dev-low-memory.sh` for < 8GB RAM)

Or use Angular CLI directly:
```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
