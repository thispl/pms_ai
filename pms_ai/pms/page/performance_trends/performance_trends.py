import frappe
import json

@frappe.whitelist()
def get_historical_performance(unit="__ALL__"):
    """
    Builds year-on-year grade history by combining:

    SOURCE 1 — Appraisal records
        Grade is derived from total_score using the band mapping:
            score >= 4.0  → A (Excellent)
            score >= 3.0  → B (Very Good)
            score >= 2.0  → C (Good)
            score >= 1.0  → D (Acceptable)
            score <  1.0  → E (Poor)
        Year is taken from the appraisal's start_date year.

    SOURCE 2 — Previous Rating child table (Employee → previous_ratings)
        Only included if that employee does NOT already have an Appraisal
        for that year (avoids double-counting).

    Unit filtering uses Employee.custom_unit directly.
    """

    GRADE_SCORE  = {"A": 5, "B": 4, "C": 3, "D": 2, "E": 1}
    VALID_GRADES = {"A", "B", "C", "D", "E"}

    def score_to_grade(score):
        v = float(score or 0)
        if v >= 4.0: return "A"
        if v >= 3.0: return "B"
        if v >= 2.0: return "C"
        if v >= 1.0: return "D"
        return "E"

    def _empty_bucket():
        return {"A": 0, "B": 0, "C": 0, "D": 0, "E": 0, "total": 0}

    # ── 1. Fetch active employees filtered by unit ─────────────────────────────
    emp_filters = [["status", "=", "Active"]]
    if unit != "__ALL__":
        emp_filters.append(["custom_unit", "=", unit])

    employees = frappe.get_all(
        "Employee",
        filters=emp_filters,
        fields=["name", "custom_unit"],
        limit_page_length=10000,
    )

    if not employees:
        return {
            "years": [], "units": [], "combined": {}, "by_unit": {},
            "trend": {"combined": {}, "by_unit": {}}
        }

    # emp_id → unit name  (single lookup, no N+1)
    emp_unit_map = {
        e.name: (e.custom_unit or "Unknown").strip()
        for e in employees
    }
    employee_ids = list(emp_unit_map.keys())

    # ── 2. Fetch ALL appraisals for those employees ────────────────────────────
    #   We need every appraisal (not just current period) to:
    #   (a) build the grade data for appraisal years
    #   (b) know which years to SKIP in Previous Rating
    appraisals = frappe.get_all(
        "Appraisal",
        filters=[
            ["employee", "in", employee_ids],
            ["docstatus", "in", [0, 1]],
            ["total_score", ">", 0],        # only scored appraisals count
        ],
        fields=["employee", "total_score", "start_date"],
        limit_page_length=50000,
    )

    # ── 3. Build appraisal year set per employee + grade data ──────────────────
    #   appraisal_years_per_emp: { emp_id: set(year_strings) }
    #   rows: list of { employee, year, grade, unit }
    appraisal_years_per_emp = {}   # used to filter out Previous Rating rows
    rows = []                       # final merged data rows

    for a in appraisals:
        emp = a.employee
        if not a.start_date:
            continue
        yr    = str(a.start_date)[:4]          # "2023" from "2023-07-01"
        grade = score_to_grade(a.total_score)
        unit_name = emp_unit_map.get(emp, "Unknown")

        # Track which years this employee already has from Appraisal
        if emp not in appraisal_years_per_emp:
            appraisal_years_per_emp[emp] = set()
        appraisal_years_per_emp[emp].add(yr)

        rows.append({
            "employee":  emp,
            "year":      yr,
            "grade":     grade,
            "unit_name": unit_name,
            "source":    "appraisal",
        })

    # ── 4. Fetch Previous Rating rows — skip years covered by Appraisal ───────
    prev_ratings = frappe.get_all(
        "Previous Rating",
        filters=[["parent", "in", employee_ids]],
        fields=["parent as employee", "year", "rating"],
        limit_page_length=100000,
        order_by="year asc",
    )

    for row in prev_ratings:
        emp   = row.employee
        yr    = str(row.year).strip() if row.year else None
        grade = str(row.rating).strip().upper() if row.rating else None

        # Skip if missing / invalid grade
        if not yr or not grade or grade not in VALID_GRADES:
            continue

        # ── KEY RULE: skip if this employee already has an Appraisal for this year
        if yr in appraisal_years_per_emp.get(emp, set()):
            continue

        unit_name = emp_unit_map.get(emp, "Unknown").strip() or "Unknown"

        rows.append({
            "employee":  emp,
            "year":      yr,
            "grade":     grade,
            "unit_name": unit_name,
            "source":    "previous_rating",
        })

    if not rows:
        return {
            "years": [], "units": [], "combined": {}, "by_unit": {},
            "trend": {"combined": {}, "by_unit": {}}
        }

    # ── 5. Aggregate into combined + by_unit buckets ───────────────────────────
    combined  = {}
    by_unit   = {}
    all_years = set()
    all_units = set()

    for r in rows:
        yr        = r["year"]
        grade     = r["grade"]
        unit_name = r["unit_name"]

        all_years.add(yr)
        all_units.add(unit_name)

        # combined
        if yr not in combined:
            combined[yr] = _empty_bucket()
        combined[yr][grade] += 1
        combined[yr]["total"] += 1

        # by_unit
        if unit_name not in by_unit:
            by_unit[unit_name] = {}
        if yr not in by_unit[unit_name]:
            by_unit[unit_name][yr] = _empty_bucket()
        by_unit[unit_name][yr][grade] += 1
        by_unit[unit_name][yr]["total"] += 1

    years_sorted = sorted(all_years)
    units_sorted = sorted(all_units)

    # ── 6. Build weighted avg score trend (A=5 … E=1) ─────────────────────────
    def _avg_score(bucket):
        total = bucket.get("total", 0)
        if not total:
            return None
        raw = sum(GRADE_SCORE.get(g, 0) * bucket.get(g, 0) for g in VALID_GRADES)
        return round(raw / total, 2)

    trend_combined = {
        yr: _avg_score(combined[yr])
        for yr in years_sorted
        if yr in combined
    }

    trend_by_unit = {}
    for u in units_sorted:
        trend_by_unit[u] = {}
        for yr in years_sorted:
            bucket = by_unit.get(u, {}).get(yr)
            if bucket:
                trend_by_unit[u][yr] = _avg_score(bucket)

    return {
        "years":    years_sorted,
        "units":    units_sorted,
        "combined": combined,
        "by_unit":  by_unit,
        "trend": {
            "combined": trend_combined,
            "by_unit":  trend_by_unit,
        },
    }