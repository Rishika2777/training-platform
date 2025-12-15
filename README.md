# Synkup CRM - Enterprise Customer Relationship Management System

Enterprise-grade CRM application built with AngularJS following modular architecture and best practices.

## 🚀 Features

- **Modular Architecture**: Independent feature modules
- **Dynamic Menu System**: Auto-updating menu based on modules
- **Role-Based Access Control (RBAC)**: Menus and routes filtered by user roles
- **Swagger API Ready**: Integrated with MongoDB backend via Swagger
- **Theme System**: CSS variables for easy customization
- **Reusable Components**: Shared UI components
- **Code Quality**: ESLint + Prettier + Husky Git hooks

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Git

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd Synkup_FE
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Git hooks

```bash
npm run prepare
```

This sets up Husky for pre-commit and pre-push hooks.

### 4. Start development server

```bash
npm start
```

The application will be available at `http://localhost:8080`

## 📁 Project Structure

```
app/
├── core/                    # Core application functionality
│   ├── constants/          # App constants, API endpoints
│   ├── services/           # Core services (API, Storage, Error Handler)
│   ├── interceptors/       # HTTP interceptors
│   └── run/                # App initialization
├── shared/                  # Shared/reusable components
│   ├── components/         # Button, Input, Footer directives
│   └── css/                # Theme system
├── features/               # Independent feature modules
│   ├── auth/               # Authentication module
│   ├── dashboard/          # Dashboard module
│   ├── campus/             # Campus management module
│   └── courses/            # Courses management module
├── layout/                  # Layout components
│   ├── header/             # Header component
│   ├── sidebar/            # Dynamic sidebar
│   └── layout.html         # Main layout
└── config/                 # Configuration
    └── routes.config.js     # Route configuration
```

## 🎯 Available Scripts

### Development

```bash
npm start              # Start development server
```

### Code Quality

```bash
npm run lint           # Run ESLint on all files
npm run lint:fix       # Fix auto-fixable linting issues
npm run format         # Format code with Prettier
npm run format:check    # Check code formatting
npm run validate       # Validate build structure
```

### Git Hooks

- **Pre-commit**: Automatically runs linting and formatting on staged files
- **Pre-push**: Runs full linting and build validation before pushing to GitHub

## 🔧 Configuration

### API Configuration

Update API base URL in `app/core/constants/app.constants.js`:

```javascript
API_BASE_URL: 'http://your-backend-url:port/api'
```

### Theme Customization

Edit `app/shared/css/theme.css` to customize:
- Colors
- Spacing
- Font sizes
- Border radius

## 📚 Documentation

All documentation is located in the [`docs/application-overview/`](./docs/application-overview/) folder:

- **[ARCHITECTURE.md](./docs/application-overview/ARCHITECTURE.md)** - Detailed architecture documentation
- **[QUICK_START.md](./docs/application-overview/QUICK_START.md)** - Quick guide for adding new modules
- **[ROLE_BASED_ACCESS.md](./docs/application-overview/ROLE_BASED_ACCESS.md)** - Complete RBAC guide
- **[SETUP_GIT_HOOKS.md](./docs/application-overview/SETUP_GIT_HOOKS.md)** - Git hooks setup guide
- **[IMPLEMENTATION_SUMMARY.md](./docs/application-overview/IMPLEMENTATION_SUMMARY.md)** - Implementation summary
- **[RBAC_IMPLEMENTATION_SUMMARY.md](./docs/application-overview/RBAC_IMPLEMENTATION_SUMMARY.md)** - RBAC implementation details
- **[GIT_HOOKS_SETUP_COMPLETE.md](./docs/application-overview/GIT_HOOKS_SETUP_COMPLETE.md)** - Git hooks setup completion
- **[ANGULARJS_VS_ANGULAR_COMPARISON.md](./docs/application-overview/ANGULARJS_VS_ANGULAR_COMPARISON.md)** - AngularJS vs Modern Angular comparison

## 🧩 Adding a New Module

See [QUICK_START.md](./QUICK_START.md) for detailed instructions.

Quick example:

1. Create module structure in `app/features/your-module/`
2. Register menu item in module config
3. Add module to `app.module.js`
4. Add route in `routes.config.js`
5. Load files in `index.html`

The menu item will appear automatically!

## 🔒 Code Quality

This project uses:

- **ESLint**: Detects unused variables, functions, and code quality issues
- **Prettier**: Automatic code formatting
- **Husky**: Git hooks for pre-commit and pre-push checks

### Unused Variable Detection

ESLint is configured to detect:
- Unused variables
- Unused function parameters
- Unused functions
- Dead code

See [SETUP_GIT_HOOKS.md](./SETUP_GIT_HOOKS.md) for details.

## 🚀 Deployment

1. Update API endpoints in constants
2. Build and optimize assets (if using build system)
3. Deploy to your hosting platform

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure all linting passes (`npm run lint`)
4. Commit (hooks will run automatically)
5. Push (hooks will validate before push)
6. Create a pull request

## 📝 License

ISC

## 👥 Support

For questions or issues, refer to the documentation files or create an issue in the repository.

---

**Built with ❤️ for enterprise Synkup CRM solutions**

