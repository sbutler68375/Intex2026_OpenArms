"""Create the Open Arms schema in a Supabase (Postgres) database and load the sample data.

Usage (from the repo root):
    pip install -r database/requirements.txt
    python database/setup_db.py                 # build everything
    python database/setup_db.py --permissions   # only re-apply access rules
                                                # (run after ml-pipelines/jobs/run_all.py,
                                                # which recreates the ML tables)

The connection string comes from the DATABASE_URL environment variable, or from
Supabase:DatabaseUrl in backend/appsettings.Development.json.

WARNING: a full run drops and recreates every table, so any existing data is replaced.

Column types come from the backend's C# models (backend/Models/Models.cs) so the
API deserializes PostgREST JSON cleanly: int -> integer, decimal -> numeric,
bool -> boolean, DateTime -> timestamp, string -> date when every value is
YYYY-MM-DD, else text.
"""
import csv
import json
import os
import re
import sys
from pathlib import Path

import bcrypt
import psycopg2
from psycopg2.extras import execute_values

REPO = Path(__file__).resolve().parent.parent
CSV_DIR = REPO / "database" / "data"


def database_url():
    url = os.getenv("DATABASE_URL", "").strip()
    if url:
        return url
    settings = REPO / "backend" / "appsettings.Development.json"
    if settings.exists():
        url = json.loads(settings.read_text()).get("Supabase", {}).get("DatabaseUrl", "")
    if not url or "PASTE" in url:
        raise SystemExit("Set DATABASE_URL or Supabase:DatabaseUrl in backend/appsettings.Development.json")
    return url


# ---- C# model -> {snake_column: sql_type} --------------------------------
CS_TYPES = {"int": "integer", "decimal": "numeric", "bool": "boolean",
            "DateTime": "timestamp", "string": "text"}


def snake(name):
    s = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "_", name).lower()
    return s.replace("is4ps", "is_4ps")  # CSV column is family_is_4ps


def load_models():
    src = (REPO / "backend" / "Models" / "Models.cs").read_text()
    models = {}
    for m in re.finditer(r"public class (\w+)\s*\{(.*?)\n\}", src, re.S):
        cols = {}
        for p in re.finditer(r"(?:\[JsonPropertyName\(\"(\w+)\"\)\]\s*)?public (\w+)\??\s+(\w+)\s*\{", m.group(2)):
            json_name, cs_type, prop = p.groups()
            cols[json_name or snake(prop)] = CS_TYPES.get(cs_type, "text")
        models[m.group(1)] = cols
    return models


TABLES = {  # table -> (model class, primary key)
    "safehouses": ("Safehouse", "safehouse_id"),
    "partners": ("Partner", "partner_id"),
    "partner_assignments": ("PartnerAssignment", "assignment_id"),
    "supporters": ("Supporter", "supporter_id"),
    "donations": ("Donation", "donation_id"),
    "in_kind_donation_items": ("InKindDonationItem", "item_id"),
    "donation_allocations": ("DonationAllocation", "allocation_id"),
    "residents": ("Resident", "resident_id"),
    "process_recordings": ("ProcessRecording", "recording_id"),
    "home_visitations": ("HomeVisitation", "visitation_id"),
    "education_records": ("EducationRecord", "education_record_id"),
    "health_wellbeing_records": ("HealthWellbeingRecord", "health_record_id"),
    "intervention_plans": ("InterventionPlan", "plan_id"),
    "incident_reports": ("IncidentReport", "incident_id"),
    "social_media_posts": ("SocialMediaPost", "post_id"),
    "safehouse_monthly_metrics": ("SafehouseMonthlyMetric", "metric_id"),
    "public_impact_snapshots": ("PublicImpactSnapshot", "snapshot_id"),
}

# Filled by ml-pipelines/jobs/run_all.py; created empty here so the API can read them.
ML_TABLES = {
    "donor_churn_predictions": "DonorChurnPrediction",
    "ml_case_escalation_predictions": "CaseEscalationPredictionRow",
    "ml_reintegration_predictions": "ReintegrationPredictionRow",
    "ml_education_progress_predictions": "EducationProgressPredictionRow",
    "ml_health_alert_predictions": "HealthAlertPredictionRow",
    "ml_home_visitation_predictions": "HomeVisitationPredictionRow",
    "ml_intervention_plan_predictions": "InterventionPlanPredictionRow",
    "ml_safehouse_strain_predictions": "SafehouseStrainPredictionRow",
}

# Demo logins (sample data only -- not real accounts).
DEMO_USERS = [
    # username, password, display name, role, supporter_id
    ("admin", "admin", "Admin", "staff", None),
    ("user", "user", None, "donor", 54),  # donor portal shows supporter 54's giving history
]

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def convert(value, sql_type):
    if value == "":
        return None
    if sql_type == "integer":
        return int(float(value))
    if sql_type == "boolean":
        return {"true": True, "false": False, "1": True, "0": False}[value.strip().lower()]
    return value


def create_data_tables(cur, models):
    for table, (model, pk) in TABLES.items():
        types = models[model]
        with open(CSV_DIR / f"{table}.csv", newline="", encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        header = list(rows[0].keys())
        missing = [c for c in header if c not in types]
        if missing:
            raise SystemExit(f"{table}: CSV columns not in model {model}: {missing}")

        col_types = {}
        for col, t in types.items():
            if t == "text" and col in header:
                vals = [r[col] for r in rows if r[col] != ""]
                if vals and all(DATE_RE.match(v) for v in vals):
                    t = "date"
            col_types[col] = t

        defs = [f"{col} integer generated by default as identity primary key" if col == pk
                else f"{col} {t}" for col, t in col_types.items()]
        cur.execute(f"drop table if exists {table} cascade")
        cur.execute(f"create table {table} ({', '.join(defs)})")
        data = [tuple(convert(r[c], col_types[c]) for c in header) for r in rows]
        execute_values(cur, f"insert into {table} ({', '.join(header)}) values %s", data)
        cur.execute(f"select setval(pg_get_serial_sequence('{table}', '{pk}'), (select max({pk}) from {table}))")
        print(f"  {table:28} {len(data):5} rows")


def create_users(cur):
    cur.execute("drop table if exists users cascade")
    cur.execute("""
        create table users (
          id integer generated by default as identity primary key,
          username text not null unique,
          password_hash text,
          display_name text,
          email text unique,
          role text not null default 'staff',
          is_active boolean default true,
          created_at timestamp default now(),
          updated_at timestamp default now(),
          supporter_id integer references supporters(supporter_id)
        )""")
    for username, password, display, role, supporter_id in DEMO_USERS:
        if display is None:
            cur.execute("select display_name from supporters where supporter_id = %s", (supporter_id,))
            display = cur.fetchone()[0]
        pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()
        cur.execute(
            "insert into users (username, password_hash, display_name, role, supporter_id) values (%s, %s, %s, %s, %s)",
            (username, pw_hash, display, role, supporter_id))
    print(f"  users                        {len(DEMO_USERS):5} rows (demo logins)")


def create_ml_tables(cur, models):
    for table, model in ML_TABLES.items():
        cols = ", ".join(f"{c} {t}" for c, t in models[model].items())
        cur.execute(f"drop table if exists {table} cascade")
        cur.execute(f"create table {table} (id bigint generated by default as identity primary key, {cols})")
    print(f"  + {len(ML_TABLES)} empty ML prediction tables")


def lock_down(cur):
    """Only the backend's service_role key may read or write; the public anon key gets nothing."""
    cur.execute("select tablename from pg_tables where schemaname = 'public'")
    for (t,) in cur.fetchall():
        cur.execute(f"alter table {t} enable row level security")
    cur.execute("grant usage on schema public to service_role")
    cur.execute("grant all on all tables in schema public to service_role")
    cur.execute("grant all on all sequences in schema public to service_role")
    cur.execute("revoke all on all tables in schema public from anon, authenticated")


def main():
    conn = psycopg2.connect(database_url())
    if "--permissions" in sys.argv:
        with conn, conn.cursor() as cur:
            lock_down(cur)
        conn.close()
        print("Access rules applied.")
        return

    models = load_models()
    with conn, conn.cursor() as cur:
        print("Creating tables and loading data:")
        create_data_tables(cur, models)
        create_users(cur)
        create_ml_tables(cur, models)
        lock_down(cur)
    conn.close()
    print("Done.")


if __name__ == "__main__":
    main()
