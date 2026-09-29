# ShopLoc - Web App

Web application for the **ShopLoc** platform.


## Table of Contents
- [0. Prerequisites](#0-prerequisites)
- [1. Tech Stack](#1-tech-stack)
- [2. Installation & Setup](#2-installation--setup)
  - [2.1. Root Initialization & Husky](#21-root-initialization--husky)
  - [2.2. Frontend Dependencies (ShopLoc)](#22-frontend-dependencies-shoploc)
- [3. Launch & Test](#3-launch--test)
  - [3.1. Local Development (Node.js)](#31-local-development-nodejs)
  - [3.2. Running with Docker](#32-running-with-docker)
- [4. Project Structure](#4-project-structure)
- [5. Workflow](#5-workflow)
  - [5.1 Semantic Versioning](#51-semantic-versioning)
  - [5.2 Quality Pipeline](#52-quality-pipeline)
    - [5.2.1 (Husky) Pre-commit](#521-husky-pre-commit)
    - [5.2.2 GitHub Actions (CI / CD)](#522-github-actions-ci--cd)


## 0. Prerequisites

- **Node.js**: `>= 22.12.0` (v24 recommended)
- **npm**: `>= 10.0.0`
- **Docker & Docker Compose** (for containerized execution)
- **Git**


## 1. Tech Stack

The frontend application is located in the [`shoploc/`](./shoploc) directory and is built with:
- **Astro**: Content-driven, performance-focused web framework using island architecture
- **React** (v19): Component library for interactive client-side islands
- **Tailwind CSS** (v4 with `@tailwindcss/vite`): Modern utility-first responsive styling
- **Lucide React**: Clean, customizable icon set
- **TypeScript**: Strict static type checking
- **ESLint** & **eslint-plugin-astro**: Static code analysis and linting (with `typescript-eslint`)
- **Prettier** & **prettier-plugin-astro**: Automated code formatting across Astro, TypeScript, and CSS
- **lint-staged**: Runs linters and formatters only against Git-staged files


## 2. Installation & Setup

### 2.1. Root Initialization & Husky
Husky Git hooks are mandatory to enforce quality standards before committing code.

```bash
# At the root of the project (installs Husky and sets up Git hooks)
npm install
```

### 2.2. Frontend Dependencies (ShopLoc)
Install dependencies for the frontend application:

```bash
# From the root directory
npm --prefix shoploc install

# Or directly from the shoploc folder
cd shoploc
npm install
```


## 3. Launch & Test

### 3.1. Local Development (Node.js)

Convenience scripts are available directly from the project root:

| Command (Root) | Command (inside `shoploc/`) | Description |
| :--- | :--- | :--- |
| `npm run dev` | `npm run dev` | Starts the local dev server (`http://localhost:4321`) |
| `npm run check` | `npm run check` | Verifies TypeScript types and Astro file diagnostics |
| `npm run lint` | `npm run lint` | Lints code using ESLint |
| `npm run lint:fix` | `npm run lint:fix` | Fixes autofixable ESLint errors |
| `npm run format` | `npm run format` | Formats all code with Prettier |
| `npm run format:check` | `npm run format:check` | Checks code formatting without modifying files |
| `npm run build` | `npm run build` | Builds the production bundle (`shoploc/dist/`) |
| `npm run preview` | `npm run preview` | Previews the production build locally |

### 3.2. Running with Docker

Run the Astro SSR application using Docker Compose:

```bash
# Build and run container in background
docker compose up --build -d

# View container logs
docker compose logs -f frontend

# Stop containers
docker compose down
```

The application will be accessible at `http://localhost:3000`.

---

## 4. Project Structure

```text
├── .github/
│   ├── workflows/
│   │   ├── CI.yml               # Continuous Integration (Format, Lint, Check & Build)
│   │   ├── cd-dev.yml           # Continuous Deployment to Dev (Build Docker & deploy to K3s)
│   │   └── cd-prod.yml          # Continuous Deployment to Prod (Semantic Release, Docker & K3s)
│   └── pull_request_template.md # Pull Request template
├── .husky/
│   └── pre-commit               # Git pre-commit hook (lint-staged, check, build)
├── shoploc/                     # Frontend Application (Astro + React)
│   ├── public/                  # Static assets (favicons, logos, images)
│   ├── src/
│   │   ├── components/          # React and Astro components (.tsx, .astro)
│   │   │   └── ShopLocHero.tsx  # Example React component with Lucide & Tailwind
│   │   ├── pages/               # Astro routes and pages
│   │   │   └── index.astro      # Home page
│   │   └── styles/
│   │       └── global.css       # Global Tailwind CSS stylesheet
│   ├── .prettierrc.mjs          # Prettier configuration (prettier-plugin-astro)
│   ├── .prettierignore          # Files and folders excluded from Prettier
│   ├── eslint.config.mjs        # ESLint flat configuration (Astro & TypeScript)
│   ├── astro.config.mjs         # Astro integrations & Node SSR adapter config
│   ├── tsconfig.json            # TypeScript configuration (react-jsx)
│   └── package.json             # ShopLoc dependencies, scripts & lint-staged config
├── .dockerignore                # Excludes host artifacts from Docker build
├── docker-compose.yml           # Docker Compose definition (frontend service)
├── Dockerfile                   # Multi-stage Docker build for Astro SSR
├── package.json                 # Root dependencies (Husky) and shortcut scripts
└── README.md
```

---

## 5. Workflow

### 5.1 Semantic Versioning
This repository adheres to the **Conventional Commits** standard to automate version bumping upon release:
- `fix:` → Patch increment (e.g. `1.0.0` → `1.0.1`)
- `feat:` → Minor increment (e.g. `1.0.0` → `1.1.0`)
- `BREAKING CHANGE:` (or `feat!:`) → Major increment (e.g. `1.0.0` → `2.0.0`)

### 5.2 Quality Pipeline

#### 5.2.1 (Husky) Pre-commit
A pre-commit hook runs automatically on every Git commit to:
1. **Run `lint-staged`**: Automatically format modified files with **Prettier** and fix lint issues with **ESLint**.
2. **Type Check**: Validate TypeScript typings and Astro syntax (`npm run check`).
3. **Build Verification**: Ensure production build integrity (`npm run build`).

If the hook aborts your commit, run manually to diagnose:
```bash
npm run format:check
npm run lint
npm run check
# and/or
npm run build
```

#### 5.2.2 GitHub Actions (CI / CD)

- **CI (`CI.yml`)**:
  - **Trigger**: Pull Requests and Pushes targeting `main` and `dev` branches.
  - **Steps**: Fresh dependency installation (`npm ci`), Prettier format check (`npm run format:check`), ESLint linting (`npm run lint`), TypeScript check (`npm run check`), and production build verification (`npm run build`).

- **CD Dev (`cd-dev.yml`)**:
  - **Trigger**: Push to the `dev` branch or manual trigger (`workflow_dispatch`).
  - **Jobs**:
    1. **Frontend Quality & Build**: Runs full frontend validation (`format:check`, `lint`, `check`, `build`).
    2. **Build & Push Docker**: Builds the frontend Docker image and pushes it to GitHub Container Registry tagged with `ghcr.io/<repo>:dev`.
    3. **Deploy to K3s Dev**: Updates the Kubernetes deployment in the development namespace (`kubectl set image`) and triggers a rollout restart.

- **CD Prod (`cd-prod.yml`)**:
  - **Trigger**: Push to the `main` branch or manual trigger (`workflow_dispatch`).
  - **Jobs**:
    1. **Frontend Quality & Build**: Runs full frontend validation (`format:check`, `lint`, `check`, `build`).
    2. **Semantic Release**: Calculates the next version tag from Conventional Commits, creates a GitHub Release and Git tag (e.g. `v1.2.0`).
    3. **Build & Push Docker**: Builds the production Docker image and publishes it to GHCR with the new version tag (`:vX.Y.Z`) and `:latest`.
    4. **Deploy to K3s Prod**: Deploys the tagged release image to the production namespace on the K3s cluster.
