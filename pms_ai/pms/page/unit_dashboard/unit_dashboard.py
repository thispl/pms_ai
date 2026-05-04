import frappe
from frappe.utils import flt


@frappe.whitelist()
def get_goals_competency(appraisal_names):
    """
    Fetch custom_self_score and custom_assessor_score from the
    Appraisal Goal child table for a list of appraisal names.

    Called from unit_dashboard.js via frappe.call.
    appraisal_names: JSON string of list e.g. '["APR-001","APR-002"]'
    """
    import json

    if isinstance(appraisal_names, str):
        names = json.loads(appraisal_names)
    else:
        names = appraisal_names or []

    if not names:
        return []

    # Use frappe.db.sql for reliability with custom fields on child tables
    placeholders = ", ".join(["%s"] * len(names))
    rows = frappe.db.sql(f"""
        SELECT
            ag.parent,
            ag.kra,
            ag.per_weightage,
            ag.custom_self_score,
            ag.custom_assessor_score,
            ag.custom_unit
        FROM `tabAppraisal Goal` ag
        WHERE ag.parent IN ({placeholders})
        ORDER BY ag.parent, ag.idx
    """, tuple(names), as_dict=True)

    return rows