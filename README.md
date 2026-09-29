# ShopLoc - Web App

Web application for the **ShopLoc** platform.


## Table of Contents
- [0. Prerequisites](#0-prerequisites)
- [1. Tech Stack](#1-tech-stack)
- [2. Installation & Setup](#2-installation--setup)
  - [2.1. Root Initialization & Husky](#21-root-initialization--husky)
  - [2.2. Frontend Dependencies (ShopLoc)](#22-frontend-dependencies-shoploc)
- [3. Launch & Test](#3-launch--test)
- [4. Project Structure](#4-project-structure)
- [5. Workflow](#5-workflow)
  - [5.1 Semantic Versioning](#51-semantic-versioning)
  - [5.2 Quality Pipeline](#52-quality-pipeline)
    - [5.2.1 (Husky) Pre-commit](#521-husky-pre-commit)
    - [5.2.2 GitHub Actions (CI / CD)](#522-github-actions-ci--cd)


## 0. Prerequisites

- **Node.js**: `>= 22.12.0` (v24 recommended)
- **npm**: `>= 10.0.0`
- **Git**


## 1. Tech Stack

The frontend application is located in the [`shoploc/`](./shoploc) directory and is built with:
- **Astro**: Content-driven, performance-focused web framework using island architecture
- **React** (v19): Component library for interactive client-side islands
- **Tailwind CSS** (v4 with `@tailwindcss/vite`): Modern utility-first responsive styling
- **Lucide React**: Clean, customizable icon set
- **TypeScript**: Strict static type checking

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

Convenience scripts are available directly from the project root:

| Command (Root) | Command (inside `shoploc/`) | Description |
| :--- | :--- | :--- |
| `npm run dev` | `npm run dev` | Starts the local dev server (`http://localhost:4321`) |
| `npm run check` | `npm run check` | Verifies TypeScript types and Astro file diagnostics |
| `npm run build` | `npm run build` | Builds the production bundle (`shoploc/dist/`) |
| `npm run preview` | `npm run preview` | Previews the production build locally |

---

## 4. Project Structure

```text
├── .github/
│   ├── workflows/
│   │   ├── CI.yml               # Continuous Integration (Type check & Build)
│   │   └── CD.yml               # Continuous Deployment & Semantic Release
│   └── pull_request_template.md # Pull Request template
├── .husky/
│   └── pre-commit               # Git pre-commit hook script
├── shoploc/                     # Frontend Application (Astro + React)
│   ├── public/                  # Static assets (favicons, logos, images)
│   ├── src/
│   │   ├── components/          # React and Astro components (.tsx, .astro)
│   │   │   └── ShopLocHero.tsx  # Example React component with Lucide & Tailwind
│   │   ├── pages/               # Astro routes and pages
│   │   │   └── index.astro      # Home page
│   │   └── styles/
│   │       └── global.css       # Global Tailwind CSS stylesheet
│   ├── astro.config.mjs         # Astro integrations configuration (React & Tailwind)
│   ├── tsconfig.json            # TypeScript configuration (react-jsx)
│   └── package.json             # ShopLoc dependencies and npm scripts
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
1. Validate TypeScript typings and Astro syntax (`npm --prefix shoploc run check`).
2. Verify production build integrity (`npm --prefix shoploc run build`).

If the hook aborts your commit, run manually to diagnose:
```bash
npm run check
# and/or
npm run build
```

#### 5.2.2 GitHub Actions (CI / CD)
- **CI (`CI.yml`)**:
  - Automatically triggered on **Pull Request** and **Push** targeting `main` and `dev` branches.
  - Runs fresh dependencies installation, type checking (`npm run check`), and production build (`npm run build`).
- **CD (`CD.yml`)**:
  - Triggered on **Push** to the `main` branch.
  - Automatically handles semantic version calculation, Git tagging, and GitHub release creation via Semantic Release.
