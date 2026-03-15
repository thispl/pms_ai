import frappe
from frappe.utils import flt


def update_appraisal_score(doc, method):

    for row in doc.goals:

        # Copy assessor score
        if row.custom_assessor:
            row.score = row.custom_assessor

        # Safety rule validation
        if row.kra == "SAFETY":

            score = flt(row.score)
            total = flt(doc.total_score)

            if score < 2 and total >= 4:
                frappe.throw(
                    "Invalid Score: If Safety score is 1 or 2, "
                    "it cannot be considered as 4 or 5 in Overall Effectiveness rating."
                )