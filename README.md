# My Prime Academy — English Learning Platform

**My Prime Academy** is a full-stack educational platform for managing online English school workflows.
The platform is designed for real school operations: administrators, teachers, students, classrooms, lessons, learning tasks, progress tracking, chat communication, video-call workflows, and AI-assisted feedback.

This repository represents an actively developed production-oriented system used as the technical foundation for a real online English learning environment.

> **Repository status:** Source-available / portfolio and technical review repository.
> The source code is published for transparency, evaluation, collaboration discussions, and demonstration of the project architecture.
> It is **not** free to copy, resell, redistribute, deploy commercially, or use as the basis for a competing product without written permission from the author.

---

## Table of Contents

* [About the Project](#about-the-project)
* [Project Goals](#project-goals)
* [Current Status](#current-status)
* [Key Features](#key-features)
* [Tech Stack](#tech-stack)
* [Architecture Overview](#architecture-overview)
* [Backend Overview](#backend-overview)
* [Frontend Overview](#frontend-overview)
* [Infrastructure Overview](#infrastructure-overview)
* [Project Structure](#project-structure)
* [Main Functional Modules](#main-functional-modules)
* [Environment Variables](#environment-variables)
* [Local Development](#local-development)
* [Running with Docker](#running-with-docker)
* [Running Backend Locally](#running-backend-locally)
* [Running Frontend Locally](#running-frontend-locally)
* [Testing](#testing)
* [Deployment](#deployment)
* [Security Notes](#security-notes)
* [Roadmap](#roadmap)
* [Repository Usage Policy](#repository-usage-policy)
* [License](#license)
* [Maintainer](#maintainer)

---

## About the Project

**My Prime Academy** was created as a practical platform for online English education.
The main idea of the project is to provide a centralized system where a language school can manage the learning process from one place.

The platform supports the typical workflow of a modern online school:

* administrators manage users, teachers, students, classrooms, and access;
* teachers work with students, lessons, tasks, and learning progress;
* students access their classes, learning materials, tasks, and communication tools;
* the system supports real-time communication through chat and call-related modules;
* AI-assisted feedback helps improve the educational workflow and reduce routine work.

The project is not only a code experiment. It is being developed around real educational needs, real school processes, and practical usage scenarios.

---

## Project Goals

The main goals of this project are:

1. **Create a complete online school management platform**
   The platform should cover the basic daily operations of an English school: users, roles, classrooms, lessons, tasks, communication, and progress.

2. **Build a scalable technical foundation**
   The architecture should allow future growth: more students, more teachers, more learning formats, better analytics, and more automation.

3. **Support real learning workflows**
   The system is focused on practical English learning, not only generic content management.

4. **Use modern full-stack technologies**
   The project uses FastAPI, React, PostgreSQL, Redis, Docker, and WebSockets.

5. **Improve teacher productivity**
   AI-assisted feedback and task automation can help teachers spend less time on repetitive checking and more time on actual teaching.

6. **Prepare for long-term maintainability**
   The codebase is structured around separate modules, clear API areas, deployment configuration, and future test coverage expansion.

---

## Current Status

The project is under active development.

Implemented or partially implemented areas include:

* backend API with FastAPI;
* frontend application with React and Vite;
* JWT-based authentication;
* role-based user structure;
* admin dashboard;
* student dashboard;
* teacher/staff-related logic;
* classroom management;
* lesson and task management;
* student progress tracking;
* task result processing;
* AI feedback integration;
* chat API;
* WebSocket chat;
* call API;
* WebSocket call signaling structure;
* Docker-based local and production deployment;
* PostgreSQL database;
* Redis support;
* Nginx reverse proxy configuration;
* basic backend tests.

The platform is continuously improved and extended according to real school needs.

---

## Key Features

### User Roles

The platform supports several user roles and access levels:

* **Admin** — manages the school structure, users, classrooms, subscriptions, and system-level data.
* **Teacher / Staff** — works with students, lessons, tasks, feedback, and learning processes.
* **Student** — accesses assigned classes, tasks, learning materials, communication tools, and progress.

---

### Authentication

The platform includes authentication based on JWT tokens.

Main authentication-related functionality:

* login;
* protected routes;
* user session handling;
* current user profile;
* role-based access checks;
* backend authorization dependencies.

---

### Admin Dashboard

The admin area is intended to manage the school from one place.

Possible admin workflows:

* create users;
* manage students;
* manage teachers/staff;
* assign users to classrooms;
* manage classroom data;
* review learning structure;
* control user access;
* prepare the system for real educational operations.

---

### Student Dashboard

Students can access their learning environment through the frontend.

Student-side functionality may include:

* viewing assigned class;
* accessing lessons;
* working with tasks;
* checking learning progress;
* using chat;
* joining call-related flows;
* seeing personal learning data.

---

### Classroom Management

Classrooms are one of the core parts of the platform.

Classroom-related functionality includes:

* creating classrooms;
* assigning teachers;
* assigning students;
* connecting lessons and tasks;
* tracking classroom activity;
* organizing students by learning groups or individual programs.

---

### Lesson System

The platform includes a lesson structure for organizing English learning content.

Lessons can be used to store and manage:

* learning sections;
* reading tasks;
* grammar exercises;
* vocabulary tasks;
* writing tasks;
* teacher-created materials;
* structured learning flows.

---

### Universal Task System

The project contains a flexible task system that can support different types of learning exercises.

Possible task types:

* multiple-choice questions;
* true / false questions;
* gap-fill tasks;
* open writing tasks;
* reading tasks;
* vocabulary tasks;
* grammar practice;
* custom teacher-created tasks.

The goal of this module is to allow teachers to create reusable learning activities for different classes and students.

---

### Task Results

Students can submit answers to assigned tasks.

The system can store:

* student answer;
* task result;
* score;
* correctness status;
* teacher feedback;
* AI-generated feedback;
* review status.

This makes it possible to track student learning progress over time.

---

### AI Feedback

The project includes AI-assisted feedback functionality.

Possible use cases:

* checking writing tasks;
* giving grammar suggestions;
* generating learning feedback;
* helping teachers review student answers faster;
* creating more detailed feedback for students;
* reducing repetitive manual work.

AI feedback is designed as an assistant for the teacher, not as a replacement for the teacher.

---

### Real-Time Chat

The platform includes chat functionality for communication between users.

Chat-related features include:

* chat API;
* WebSocket-based real-time messages;
* message history;
* communication between students and staff;
* future support for improved notifications and unread message tracking.

---

### Call and Video-Lesson Workflow

The project contains backend and frontend structures for call-related workflows.

Implemented or planned functionality includes:

* call creation;
* joining calls;
* leaving calls;
* call participants;
* WebSocket signaling;
* microphone/camera status handling;
* screen-sharing status structure;
* video lesson interface improvements.

This part of the project is actively developed and is planned to become a stable video-lesson module.

---

### Deployment Infrastructure

The repository includes deployment-related configuration:

* Docker;
* Docker Compose;
* Nginx;
* PostgreSQL;
* Redis;
* Certbot / HTTPS structure.

The goal is to make the platform deployable as a real web application, not only as a local development project.

---

## Tech Stack

### Backend

* **Python**
* **FastAPI**
* **SQLAlchemy Async**
* **PostgreSQL**
* **AsyncPG**
* **Redis**
* **FastAPI Users**
* **Pydantic**
* **JWT Authentication**
* **WebSockets**
* **OpenAI API integration**
* **Pytest**

---

### Frontend

* **React**
* **Vite**
* **React Router**
* **Axios**
* **React Markdown**
* **CSS**
* **Component-based architecture**

---

### Infrastructure

* **Docker**
* **Docker Compose**
* **Nginx**
* **Certbot**
* **PostgreSQL container**
* **Redis container**
* **Production-oriented deployment structure**

---

## Architecture Overview

The project follows a modular full-stack architecture.

The backend is responsible for:

* data models;
* database interaction;
* authentication;
* authorization;
* REST API;
* WebSocket connections;
* AI feedback integration;
* business logic.

The frontend is responsible for:

* user interface;
* page routing;
* API interaction;
* protected pages;
* admin/student dashboards;
* chat and call UI;
* lesson and task UI.

The infrastructure layer is responsible for:

* container orchestration;
* reverse proxy;
* database service;
* Redis service;
* HTTPS configuration;
* production deployment.

---

## Backend Overview

The backend is built with **FastAPI** and follows a domain-based structure.

Main backend areas include:

* `users` — authentication, students, staff, roles;
* `classrooms` — classrooms, classroom tasks, classroom progress;
* `controls` — universal tasks, questions, task results, AI feedback;
* `connection` — chats, WebSocket chat, calls, WebSocket call signaling;
* `core` — database, configuration, authentication utilities;
* `models` — SQLAlchemy database models;
* `schemas` — Pydantic schemas;
* `utils` — helper logic;
* `tests` — backend tests.

The backend uses asynchronous database access and is designed for modern API-based applications.

---

## Frontend Overview

The frontend is built with **React** and **Vite**.

Main frontend areas include:

* login page;
* protected routes;
* admin dashboard;
* student dashboard;
* classroom pages;
* task pages;
* chat components;
* call components;
* profile/photo components;
* API service layer.

The frontend communicates with the backend using REST API requests and WebSocket connections.

---

## Infrastructure Overview

The project includes infrastructure configuration for both development and production-style deployment.

Infrastructure components:

* backend container;
* frontend container;
* PostgreSQL database;
* Redis;
* Nginx reverse proxy;
* Certbot for HTTPS;
* Docker Compose configuration.

This allows the project to be deployed as a complete web platform.

---

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── classrooms/
│   │   │   ├── connection/
│   │   │   ├── controls/
│   │   │   └── users/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── tests/
│   │   └── utils/
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── assets/
│   │   ├── components/
│   │   └── pages/
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.js
│
├── nginx/
├── docker-compose.yml
├── docker-compose.dev.yml
├── README.md
├── LICENSE
├── CONTRIBUTING.md
└── SECURITY.md
```

---

## Main Functional Modules

### 1. Users Module

Responsible for:

* user accounts;
* students;
* teachers/staff;
* admins;
* authentication;
* role-based access;
* user profile data.

---

### 2. Classrooms Module

Responsible for:

* classroom creation;
* classroom editing;
* teacher assignment;
* student assignment;
* classroom progress;
* classroom-specific tasks.

---

### 3. Lessons Module

Responsible for:

* lesson creation;
* lesson sections;
* learning content;
* structured educational materials.

---

### 4. Controls and Tasks Module

Responsible for:

* universal tasks;
* questions;
* task types;
* student submissions;
* task results;
* manual review;
* AI feedback connection.

---

### 5. Chat Module

Responsible for:

* chat creation;
* messages;
* message history;
* WebSocket chat connection;
* real-time communication.

---

### 6. Calls Module

Responsible for:

* call creation;
* call participants;
* call status;
* WebSocket signaling;
* video lesson workflow structure.

---

### 7. AI Feedback Module

Responsible for:

* sending student work to AI;
* receiving generated feedback;
* storing feedback;
* helping teachers review writing and other open tasks.

---

## Environment Variables

The project uses environment variables for configuration.

### Backend example

Create:

```text
backend/.env
```

Example:

```env
DATABASE_URL=postgresql+asyncpg://postgres:password@db:5432/prime_platform_db
SECRET_KEY=change_me_to_a_long_random_secret
OPENAI_API_KEY=your_openai_api_key
REDIS_URL=redis://redis:6379
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change_me
POSTGRES_DB=prime_platform_db
```

### Frontend example

Create:

```text
frontend/.env
```

Example:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

Production values should be different and must never expose real secrets publicly.

---

## Local Development

### Prerequisites

Install:

* Python 3.11+
* Node.js 18+
* PostgreSQL
* Redis
* Docker
* Docker Compose

Docker is recommended for running the full platform.

---

## Running with Docker

### 1. Clone the repository

```bash
git clone https://github.com/Ivan2330/english-platform-deploy.git
cd english-platform-deploy
```

### 2. Create environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit the `.env` files and add your local values.

### 3. Start the project

```bash
docker compose up --build
```

### 4. Open the backend

```text
http://localhost:8000
```

### 5. Open FastAPI documentation

```text
http://localhost:8000/docs
```

---

## Running Backend Locally

Go to the backend folder:

```bash
cd backend
```

Create virtual environment:

```bash
python -m venv venv
```

Activate it:

```bash
# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend will be available at:

```text
http://localhost:8000
```

API documentation:

```text
http://localhost:8000/docs
```

---

## Running Frontend Locally

Go to the frontend folder:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Frontend will be available at the Vite local address, usually:

```text
http://localhost:5173
```

---

## Testing

Backend tests are located in:

```text
backend/app/tests/
```

Run tests from the backend directory:

```bash
pytest
```

Recommended future improvements:

* increase unit test coverage;
* add integration tests;
* add API endpoint tests;
* add WebSocket tests;
* add CI workflow with GitHub Actions.

---

## Deployment

The repository includes deployment configuration for a production-style environment.

Deployment stack:

* FastAPI backend;
* React frontend;
* PostgreSQL;
* Redis;
* Nginx;
* Certbot;
* Docker Compose.

Production deployment should include:

* strong secret keys;
* production database credentials;
* HTTPS;
* secure CORS configuration;
* environment variables outside the repository;
* regular backups;
* dependency updates;
* access control review.

---

## Security Notes

Before using this project in production, review the following areas carefully:

* JWT secret key strength;
* password security;
* admin account creation logic;
* role-based permissions;
* WebSocket authentication;
* CORS configuration;
* database credentials;
* Redis access;
* file upload handling;
* static file access;
* AI API usage;
* rate limiting;
* error handling;
* production logs;
* Docker secrets;
* HTTPS configuration.

Never commit real secrets, API keys, database passwords, private tokens, or production credentials.

---

## Recommended `.gitignore` Rules

Make sure the repository does not include local or secret files.

Recommended entries:

```gitignore
# Python
__pycache__/
*.py[cod]
*.pyo
*.pyd
venv/
.env
.env.*
!.env.example

# Node
node_modules/
dist/
build/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log

# Docker local data
postgres_data/
redis_data/

# Secrets
*.pem
*.key
*.crt
```

---

## Roadmap

Planned improvements include:

### Backend

* improve role-based access control;
* add more automated tests;
* improve database migrations;
* add API versioning;
* improve validation logic;
* improve error handling;
* add better logging;
* improve Redis usage;
* add background tasks where needed.

### Frontend

* improve admin dashboard UX;
* improve student dashboard UX;
* improve lesson pages;
* improve task builder interface;
* improve chat UI;
* improve call UI;
* add better loading states;
* improve mobile responsiveness;
* improve error handling.

### Education Features

* advanced lesson builder;
* progress analytics;
* teacher reports;
* student reports;
* homework management;
* vocabulary practice;
* grammar practice;
* reading practice;
* writing review tools;
* AI-assisted recommendations.

### Communication

* stable video-call workflow;
* better WebSocket reconnect logic;
* unread messages;
* notifications;
* call history;
* lesson meeting records.

### DevOps

* CI/CD pipeline;
* automated tests on pull requests;
* deployment scripts;
* backup strategy;
* monitoring;
* health checks;
* security checks.

---

## Possible Future Open Components

The main platform is currently source-available and protected.

However, selected reusable parts may be opened separately in the future, for example:

* FastAPI school starter template;
* classroom management module;
* task builder module;
* AI feedback helper;
* Docker deployment template;
* educational WebSocket examples.

This would allow the project to support the developer and education community while keeping the main school product protected.

---

## Repository Usage Policy

This repository is published for:

* technical review;
* portfolio demonstration;
* transparency;
* architecture discussion;
* collaboration opportunities;
* educational evaluation.

Unless a separate written agreement is provided by the copyright holder, you may not:

* copy substantial parts of the code into another project;
* redistribute this source code;
* resell this source code;
* deploy this project as your own product;
* use this code commercially;
* create a competing product based on this repository;
* remove copyright notices;
* sublicense the code;
* publish modified copies of the project.

You may view the code for review and evaluation purposes.

For commercial use, partnership, licensing, or collaboration, please contact the repository owner.

---

## License

This project is licensed under a custom source-available proprietary license.

See:

```text
LICENSE
```

The license allows viewing the code but does not allow copying, redistribution, commercial use, resale, or deployment as a competing product without written permission.

---

## Maintainer

**Ivan Kozhevnyk**

GitHub: [Ivan2330](https://github.com/Ivan2330)

Project repository:

```text
https://github.com/Ivan2330/english-platform-deploy
```

---

## Disclaimer

This project is under active development.
Some modules may be incomplete, experimental, or subject to change.

The repository is provided for review and demonstration purposes.
Production usage requires proper configuration, security review, deployment preparation, and permission from the copyright holder.
