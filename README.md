# Open Arms

A full-stack web application for a (fictional) Philippine nonprofit that runs safehouses for girls who are survivors of abuse and trafficking. Built as a group project for BYU INTEX, Winter 2026.

The site has three sides:

- **Public site** – the organization's mission, a live impact dashboard (residents served, reintegration rate, donation trends), awareness content, and an online donation page. Available in English and Tagalog.
- **Donor portal** – supporters sign up, log in, and see their own giving history and the impact of their donations.
- **Staff portal** – case management for residents (counseling sessions, home visits, health and education records, intervention plans, incidents), donor and donation management, safehouses, partners, social media performance, and analytics.

Machine learning models flag at-risk cases and donors directly in the staff portal: donor churn, case escalation risk, reintegration readiness, health deterioration alerts, education progress, home visit follow-up priority, intervention plan completion risk, and safehouse capacity strain.

All data in this project is fake sample data.

## Team

| Name | GitHub |
|---|---|
| TODO | [jadesanford](https://github.com/jadesanford) |
| TODO | [lukehoop](https://github.com/lukehoop) |
| TODO | [natesaez](https://github.com/natesaez) |
| TODO | [sbutler68375](https://github.com/sbutler68375) |

## Tech stack

| Part | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query, Recharts |
| Backend | .NET 10 C# Web API, JWT auth in an HttpOnly cookie, bcrypt password hashing |
| Database | PostgreSQL on Supabase (accessed through Supabase's REST API) |
| Machine learning | Python, scikit-learn, pandas (Jupyter notebooks for training, scheduled jobs for scoring) |

## Project structure

```
frontend/        React app (public site, donor portal, staff portal)
backend/         .NET Web API
database/        Setup script + sample data (17 CSV files)
ml-pipelines/    Model training notebooks, trained models, and the scoring jobs
```

## Getting it running

### 1. Install the tools

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 20 or newer
- [Python](https://www.python.org/) 3.10 or newer
- A free [Supabase](https://supabase.com) account

### 2. Create the database

1. In Supabase, create a new project and save the database password you choose.
2. Copy `backend/appsettings.Development.example.json` to `backend/appsettings.Development.json` (this file is gitignored, so your keys stay off GitHub) and fill in:
   - **Url** – Project Settings → API → Project URL
   - **ServiceRoleKey** – Project Settings → API Keys → *Legacy API keys* → `service_role` (starts with `eyJ`). The newer `sb_secret_` keys won't work with this backend.
   - **DatabaseUrl** – the **Connect** button → **Session pooler** connection string, with your database password filled in. If the password contains special characters like `#`, `@`, or `/`, URL-encode them (for example `#` becomes `%23`).
   - **Jwt:Key** – any random string of at least 32 characters (used to sign login tokens).
3. Build the tables and load the sample data:
   ```bash
   pip install -r database/requirements.txt
   python database/setup_db.py
   ```
   This creates all tables, loads the data, adds the demo logins, and locks the tables so only the backend can access them. Running it again resets the database.

### 3. Fill in the ML predictions

The models are already trained (`ml-pipelines/artifacts/`). This scores the data and saves the predictions the staff portal shows:

```bash
pip install -r ml-pipelines/requirements.txt
cd ml-pipelines/jobs
python run_all.py
cd ../..
python database/setup_db.py --permissions
```

The last command re-applies the database access rules, since the scoring job recreates the prediction tables.

### 4. Start the backend

```bash
cd backend
dotnet run --launch-profile http
```

The API runs at http://localhost:5215.

### 5. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

### Demo logins

Go to http://localhost:5173/login:

| Username | Password | Role |
|---|---|---|
| `admin` | `admin` | Staff – full access to the staff portal |
| `user` | `user` | Donor – donor portal with a sample donor's giving history |

## Retraining the models

The notebooks in `ml-pipelines/` (one per model) clean the data, train and compare models, and save the best one to `ml-pipelines/artifacts/`. After retraining, run step 3 again to refresh the predictions.
