import frappe
from frappe.utils import flt

import frappe
from deep_translator import GoogleTranslator

import re
from deep_translator import GoogleTranslator

@frappe.whitelist()
def update_appraisal_score(doc, method):

    total_assessor_score = 0
    total_self_score = 0

    for row in doc.goals:

        # Rating field stores 0.0–1.0, multiply by 5 to get star count (1–5)
        assessor_score = round(flt(row.custom_assessor_score) * 5)
        self_score_stars = round(flt(row.custom_self_score) * 5)
        weighted_self_score = (self_score_stars * flt(row.per_weightage)) / 100

        total_assessor_score += assessor_score
        total_self_score += weighted_self_score

        # Copy assessor score to system score
        if assessor_score:
            row.score = assessor_score

        # --- SAFETY RULE VALIDATION ---
        if row.kra == "Safety":
            if 0 < assessor_score <= 2 and doc.workflow_state == "Draft":
                
                # if doc.custom_grade not in ["A1","A2","A3","A4"]:
                #     overall = flt(doc.custom_total_self_score) or 0
                # else:
                overall = flt(doc.total_score) or 0
                if overall >= 3.5:
                    if doc.workflow_state == "Pending for Assessor" and doc.custom_grade not in ["A1","A2","A3","A4"]:
                        doc.total_score = 3
                    elif doc.workflow_state == "Draft" and doc.custom_grade in ["A1","A2","A3","A4"]:
                        doc.total_score = 3
                    frappe.msgprint(
                            "If Safety score is 1 or 2, "
                            "Overall Effectiveness rating cannot be 4 or 5.",
                            title="Invalid Rating",
                            indicator="red"
                    )

            else:
                if 0 < round(flt(row.custom_self_score) * 5) <= 2:
                    if doc.custom_grade not in ["A1","A2","A3","A4"]:
                        overall = flt(doc.custom_total_self_score) or 0
                    else:
                        overall = flt(doc.total_score) or 0

                    if overall >= 4:
                        doc.custom_total_self_score = 3
                        frappe.msgprint(
                                "If Safety score is 1 or 2, "
                                "Overall Effectiveness rating cannot be 4 or 5.",
                                title="Invalid Rating",
                                indicator="red"
                        )

    # Set totals
    doc.custom_total_assessor_score = total_assessor_score
    doc.custom_total_self_score = total_self_score
    for row in doc.goals:
            if row.kra == "Safety":
                    if 0 < flt(row.custom_self_score)*5 <= 2 and doc.workflow_state == "Draft":
                            if overall >= 4:
                                doc.custom_total_self_score =3
                                doc.custom_total_assessor_score =3


    seen_kras = set()

    for row in doc.goals:
        if row.kra and row.kra in seen_kras:
            frappe.throw(
                f"Duplicate KRA detected: '{row.kra}'. Each KRA can only be assigned once."
            )

        if row.kra:
            seen_kras.add(row.kra)
    # --- WORKFLOW VALIDATION ---
    previous = doc.get_doc_before_save()

    if previous and previous.workflow_state != doc.workflow_state:

            if doc.workflow_state == "Pending for Assessor":

                    if total_self_score <= 0:
                            frappe.throw(
                                    "Self Appraisal must be completed before submitting to Assessor."
                            )
            if doc.workflow_state == "Approved" and flt(doc.total_score) == 0:
                frappe.throw("Total Score cannot be Zero.")
# pms_ai/api.py
@frappe.whitelist()
def update_appraisal_from_kra(doc, method):
    for row in doc.goals:
        if row.kra and not row.custom_description:
            row.custom_unit = frappe.db.get_value("KRA",row.kra,"custom_unit") or ""
            kra_details = frappe.get_all(
                "KRA Details",
                filters={
                    "parent": row.kra,
                    "grade": doc.custom_grade
                },
                fields=["description"],
                limit_page_length=1
            )

            if kra_details:
                row.custom_description = kra_details[0].description
@frappe.whitelist()
def update_all_appraisal_templates():
    
    templates = frappe.get_all("Appraisal Template", fields=["name"])

    for template in templates:
        # if template.name !="C2 - HC":
        # 	return
        doc = frappe.get_doc("Appraisal Template", template.name)

        updated = False

        for row in doc.goals:
            if row.key_result_area:
                row.custom_unit = frappe.db.get_value("KRA",row.key_result_area,"custom_unit") or ""
                doc.save(ignore_permissions=True)
                # Fetch KRA description
        # 		kra_details = frappe.get_all(
        # 			"KRA Details",
        # 			filters={
        # 				"parent": row.key_result_area,
        # 				"grade": doc.custom_grade
        # 			},
        # 			fields=["description"],
        # 			limit_page_length=1
        # 		)

        # 		if kra_details:
        # 			row.custom_description = kra_details[0].description
        # 			updated = False

        # if updated:
        # 	doc.save(ignore_permissions=True)

    return "All Appraisal Templates updated successfully"

import frappe


@frappe.whitelist()
def get_kra_description(kra, grade):
    if frappe.db.exists("KRA",{"custom_unit":"Common","name":kra}):
        return frappe.get_all(
            "KRA Details",
            filters={
                "parent": kra,
                "grade": grade
            },
            fields=["description"],
            order_by="name",
            limit_page_length=1
        )
    else:
        return frappe.get_all(
            "KRA",
            filters={
                "name": kra,
            },
            fields=["description"],
            order_by="name",
            limit_page_length=1
        )
@frappe.whitelist()
def update_appraisal_score_old_ver(doc, method):

        total_assessor_score = 0
        total_self_score = 0

        for row in doc.goals:

                assessor_score = flt(row.custom_assessor_score)
                self_score = (flt(row.custom_self_score)*flt(row.per_weightage))/100

                total_assessor_score += assessor_score
                total_self_score += self_score

                # Copy assessor score to system score
                if assessor_score:
                        row.score = assessor_score

                # --- SAFETY RULE VALIDATION ---
                if row.kra == "SAFETY":

                        if 0 < flt(row.custom_self_score) <= 2 and doc.workflow_state == "Draft":
                                # Use overall score AFTER calculation
                                overall = flt(doc.total_score)

                                if overall >= 4:
                                        doc.total_score = 3
                                        doc.custom_total_self_score =3
                                        frappe.msgprint(
                                                "If Safety score is 1 or 2, "
                                                "Overall Effectiveness rating cannot be 4 or 5.",
                                                title="Invalid Rating",
                                                indicator="red"
                                        )
                        else:
                                if 0 < assessor_score <= 2:
                                # Use overall score AFTER calculation
                                        overall = flt(doc.total_score)

                                        if overall >= 4:
                                                doc.total_score = 3
                                                frappe.msgprint(
                                                        "If Safety score is 1 or 2, "
                                                        "Overall Effectiveness rating cannot be 4 or 5.",
                                                        title="Invalid Rating",
                                                        indicator="red"
                                                )
                                        

        # Set totals
        doc.custom_total_assessor_score = total_assessor_score
        doc.custom_total_self_score = total_self_score
        
        # --- WORKFLOW VALIDATION ---
        previous = doc.get_doc_before_save()

        if previous and previous.workflow_state != doc.workflow_state:

                if doc.workflow_state == "Pending for Assessor":

                        if total_self_score <= 0:
                                frappe.throw(
                                        "Self Appraisal must be completed before submitting to Assessor."
                                )



import frappe

# def set_template_by_default(doc, method):

# 	# if not doc.is_new():
# 	# 	return

# 	grade = (doc.custom_grade or "").strip()
# 	unit = (doc.custom_unit or "").strip()

# 	if not grade or not unit:
# 		return


# 	if grade in ["A1", "A2", "A3", "A4"]:
# 		template_name = f"{grade} - Worker"
# 	else:
# 		template_name = f"{grade} - {unit}"


# 	if not frappe.db.exists("Appraisal Template", template_name):
# 		doc.appraisal_template = ""
# 		doc.set("goals", [])
# 		doc.set("custom_additional_goals_for_worker_", [])
# 		return

# 	try:
# 		template = frappe.get_doc("Appraisal Template", template_name)

# 		doc.appraisal_template = template_name
# 		doc.rate_goals_manually = 1

# 		doc.set("goals", [])
# 		doc.set("custom_additional_goals_for_worker_", [])

# 		for d in template.get("goals") or []:
# 			row = doc.append("goals", {})
# 			row.kra = d.key_result_area
# 			row.per_weightage = d.per_weightage
# 			row.custom_description = d.custom_description or ""

# 			if d.key_result_area in ["PRODUCTIVITY", "ABSENCES"]:
# 				add_row = doc.append("custom_additional_goals_for_worker_", {})
# 				add_row.kra = d.key_result_area
# 				add_row.per_weightage = d.per_weightage
# 				add_row.custom_description = d.custom_description or ""

# 	except Exception:
# 		frappe.log_error(frappe.get_traceback(), "Appraisal Template Error")


import frappe

def set_template_by_default(doc, method):

    if not doc.is_new():
        return

    grade = (doc.custom_grade or "").strip().upper()
    unit = (doc.custom_unit or "").strip()

    # Must have grade
    if not grade:
        return

    # A1–A4 → Worker default, else keep unit
    if grade in ["A1", "A2", "A3", "A4"]:
        template_name = f"{grade} - Worker"
    else:
        template_name = f"{grade} - {unit}"

    # Check template exists
    if not frappe.db.exists("Appraisal Template", template_name):
        doc.appraisal_template = ""
        doc.set("goals", [])
        doc.set("custom_additional_goals_for_worker_", [])
        frappe.msgprint(f"Appraisal Template not found: {template_name}")
        return

    try:
        # Fetch template
        template = frappe.get_doc("Appraisal Template", template_name)

        # Set template and manual rate
        doc.appraisal_template = template_name
        doc.rate_goals_manually = 1

        # Clear existing rows
        doc.set("goals", [])
        doc.set("custom_additional_goals_for_worker_", [])

        # Copy goals from template
        for d in template.get("goals") or []:
            row = doc.append("goals", {})
            row.kra = d.key_result_area
            row.per_weightage = d.per_weightage
            row.custom_description = d.custom_description or ""
            row.custom_unit = d.custom_unit or ""
            # Additional goals for PRODUCTIVITY / ABSENCES
            if d.key_result_area in ["PRODUCTIVITY", "ABSENCES"]:
                add_row = doc.append("custom_additional_goals_for_worker_", {})
                add_row.kra = d.key_result_area
                add_row.per_weightage = d.per_weightage
                add_row.custom_description = d.custom_description or ""
                add_row.custom_unit = d.custom_unit or ""

    except Exception:
        frappe.log_error(frappe.get_traceback(), "Appraisal Template Error")




import frappe

def set_template_by_default_in_appraisal_cycle(doc, method):

    

    for row in doc.appraisees:
        if row.appraisal_template:
            continue
        grade = (row.custom_employee_grade or "").strip()
        unit = (row.custom_unit or "").strip()

        # Skip if no grade
        if not grade or not unit:
            continue

        # A1–A4 → Worker template
        if grade in ["A1", "A2", "A3", "A4"]:
            template_name = f"{grade} - Worker"
        else:
            template_name = f"{grade} - {unit}"
        # Check template exists
        if not frappe.db.exists(
            "Appraisal Template",
            template_name
        ):

            row.appraisal_template = ""

           

            continue

        # Set template
        row.appraisal_template = template_name


def populate_objectives(doc, method=None):
    if not doc.is_new():
        return
    valid_grades = ["C1","C2","C3","D1","D2","D3","E1","E2"]

    # Condition check
    if doc.custom_grade in valid_grades:

        # Clear table (safe)
        doc.set("custom_objectives", [])

        # Fetch Objectives
        objectives = frappe.get_all(
            "Objectives",
            fields=["name", "description"],
            order_by="creation"
        )

        # Add rows
        for obj in objectives:
            doc.append("custom_objectives", {
                "objective": obj.name,
                # "description": obj.description
            })


@frappe.whitelist()
def get_assessor_grade_counts():
    user = frappe.session.user

    # Check role
    roles = frappe.get_roles(user)
    if "Assessor" not in roles:
        return []

    # Get employee linked to user
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")

    if not employee:
        return []

    data = frappe.db.sql("""
        SELECT 
            appraisal.grade,
            COUNT(*) as count
        FROM 
            `tabAppraisal` appraisal
        JOIN 
            `tabEmployee` emp ON appraisal.employee = emp.name
        WHERE 
            appraisal.workflow_state = 'Draft'
            AND emp.reports_to = %s
        GROUP BY 
            appraisal.grade
    """, (employee,), as_dict=True)

    return data
import frappe
from frappe.utils import flt


def validate_total_score_for_assessor(doc, method):

        previous = doc.get_doc_before_save()

        # Check workflow transition
        if previous and previous.workflow_state != doc.workflow_state:

                if doc.workflow_state == "Approved":

                        if flt(doc.total_score) <= 0:
                                frappe.throw(
                                        "Total Goal Score must be greater than zero before approval."
                                )

from frappe.utils import nowdate
@frappe.whitelist()
def update_appraisal_approved_date(doc, method):
        if doc.has_value_changed("workflow_state") and doc.workflow_state == "Pending for Assessor":
                doc.custom_self_approval_date = frappe.utils.nowdate()
        if doc.has_value_changed("workflow_state") and doc.workflow_state == "Approved":
                doc.custom_submitted_date = frappe.utils.nowdate()


import frappe
from frappe.utils import flt, cstr, formatdate
import json
import html as _html

KRA_ICON_MAP = {
    "safety":"🦺","quality":"✅","productivity":"⚡","attendance":"🗓️",
    "discipline":"📋","initiative":"💡","teamwork":"🤝","communication":"💬",
    "leadership":"🏆","training":"📚","cost":"💰","delivery":"🚚",
    "innovation":"🔬","customer":"🌟","environment":"🌿","integrity":"🤲",
    "simplicity":"🎯","respect":"🫱","continuous":"🔄","project":"📐",
    "energy":"⚡","governance":"⚖️",
}

def _kra_icon(kra_name):
    lower = (kra_name or "").lower()
    for k, v in KRA_ICON_MAP.items():
        if k in lower: return v
    return "🎯"

def safe(val):
    return _html.escape(cstr(val), quote=True)

def safe_js(val):
    return cstr(val).replace('\\','\\\\').replace('"','\\"').replace("'","\\'")\
                    .replace('\n','\\n').replace('\r','').replace('</script>','<\\/script>')


@frappe.whitelist()
def appraisal_html_template_employee_overview(appraisal_name):
    doc = frappe.get_doc("Appraisal", appraisal_name)

    def initials(name):
        parts = (name or "?").split()
        return (parts[0][0] + (parts[1][0] if len(parts) > 1 else parts[0][1])).upper()

    def score_class(score, max_score=5):
        if flt(score) >= flt(max_score) * 0.8: return "score-high"
        if flt(score) >= flt(max_score) * 0.5: return "score-mid"
        return "score-low"

    # ── Role / stage flags ─────────────────────────────────────────────────
    is_worker        = (doc.get("custom_grade") or "") in ["A1","A2","A3","A4"]
    is_draft         = doc.workflow_state == "Draft"
    current_user     = frappe.session.user

    assessor_employee = doc.get("custom_assessor") or ""
    is_assessor       = "Appraisal Assessor" in frappe.get_roles(frappe.session.user)
    is_admin       = "HR Manager" in frappe.get_roles(frappe.session.user)
    is_appraisal_user = "Appraisal User"     in frappe.get_roles(frappe.session.user)
    is_restricted = doc.get("custom_restricted")
    is_published = doc.get("custom_published")
    logined_employee = frappe.db.get_value("Employee",{"user_id":frappe.session.user},["name"]) or ""
    if logined_employee == doc.get("employee") and is_assessor:
        is_assessor = False
        is_admin = False
    
    self_editable     = is_draft and is_appraisal_user and not is_worker and not is_assessor and not doc.get("custom_restricted")
    assessor_editable = is_assessor and doc.workflow_state == "Pending for Assessor" and not doc.get("custom_restricted")
    if is_worker and is_draft:
        assessor_editable = is_assessor and not doc.get("custom_restricted")
    show_oe = is_published or is_assessor or is_admin
    show_assessor_stars = is_published or is_assessor or is_admin
    if logined_employee != doc.get("employee"):
        self_editable = False

    if frappe.session.user =="Administrator":
        self_editable = True
        assessor_editable = True
        is_admin = True
    # ── Theme based on role ────────────────────────────────────────────────
    # WORKER CATEGORY (A1–A4): Navy + Gold theme matching the screenshot
    if is_worker:
        T = {
            # ── Core palette: light navy blue ──────────────────────────────────
            "primary":            "#1e4d8c",          # lighter navy (was #0f1f3d)
            "primary_dark":       "#163a6b",
            "primary_mid":        "#2a5fa8",           # mid-light blue
            "primary_light":      "#eef4fc",           # very light blue tint background

            # ── Gold accent (unchanged) ────────────────────────────────────────
            "accent":             "#c9a84c",
            "accent_lt":          "#f0d080",           # brighter gold for shine
            "accent_deep":        "#8B6508",
            "accent_bright":      "#f5c518",           # vivid shine gold
            "accent_pale":        "#FBF0C0",
            "accent_dim":         "rgba(201,168,76,0.15)",
            "accent_glow":        "rgba(201,168,76,0.50)",
            "accent_border":      "rgba(201,168,76,0.55)",
            "accent_border_hex":  "#c9a84c",

            # ── Header: light-to-mid navy with shine sweep ─────────────────────
            "header_grad":        "linear-gradient(135deg,#163a6b 0%,#1e4d8c 40%,#2a5fa8 70%,#3a7fd4 100%)",
            "header_border":      "#f0d080",

            # ── Gold frame (brighter, more shimmer) ────────────────────────────
            "frame_grad":         "conic-gradient(from 0deg,#5c3d08 0deg,#c9a84c 35deg,#f5d97a 70deg,#fff4a0 100deg,#f5d97a 130deg,#c9a84c 160deg,#8B6508 195deg,#f5c518 230deg,#fff4a0 255deg,#f5d97a 290deg,#c9a84c 320deg,#5c3d08 360deg)",
            "frame_glow1":        "rgba(201,168,76,0.90)",
            "frame_glow2":        "rgba(201,168,76,0.65)",
            "frame_glow3":        "rgba(201,168,76,0.30)",
            "frame_glow4":        "rgba(30,77,140,0.20)",

            # ── Stripe: light navy + bright gold shine ─────────────────────────
            "stripe":             "linear-gradient(90deg,#163a6b 0%,#1e4d8c 18%,#c9a84c 42%,#fff4a0 55%,#f5d97a 65%,#c9a84c 78%,#2a5fa8 88%,#163a6b 100%)",
            "stripe_glow":        "rgba(245,217,122,0.45)",

            # ── Section headings ───────────────────────────────────────────────
            "section_color":      "#1e4d8c",
            "section_line":       "linear-gradient(90deg,#f5c518,rgba(201,168,76,0.35),transparent)",

            # ── Table rows ────────────────────────────────────────────────────
            "odd_row":            "#eef4fc",           # light blue tint
            "even_row":           "#ffffff",
            "hover_row":          "#dbeafe",           # soft blue hover

            # ── Table headers ─────────────────────────────────────────────────
            "table_header_grad":  "linear-gradient(135deg,#163a6b 0%,#2a5fa8 100%)",
            "table_border":       "rgba(201,168,76,0.55)",
            "table_border_hex":   "rgba(201,168,76,0.18)",
            "table_cell_border":  "rgba(201,168,76,0.18)",

            # ── Info panel ────────────────────────────────────────────────────
            "info_border":        "rgba(201,168,76,0.55)",
            "info_shadow":        "rgba(30,77,140,0.10)",
            "lbl_color":          "#1e4d8c",

            # ── KRA inputs / dropdown ──────────────────────────────────────────
            "kra_input_border":       "rgba(201,168,76,0.55)",
            "kra_input_focus_shadow": "rgba(245,197,24,0.22)",
            "kra_dd_border":          "rgba(201,168,76,0.55)",
            "kra_dd_shadow":          "rgba(30,77,140,0.15)",
            "kra_dd_hover_bg":        "#dbeafe",
            "kra_dd_hover_color":     "#1e4d8c",

            # ── KRA cards ─────────────────────────────────────────────────────
            "kra_card_border":        "rgba(201,168,76,0.55)",
            "kra_card_top":           "#c9a84c",
            "kra_card_bg":            "linear-gradient(160deg,#fff 50%,#eef4fc 100%)",
            "kra_card_hover_shadow":  "rgba(30,77,140,0.22)",
            "kra_tooltip_bg":         "linear-gradient(135deg,#163a6b,#1e4d8c)",
            "kra_tooltip_border":     "rgba(201,168,76,0.40)",
            "kra_tooltip_color":      "#e0f0ff",
            "kra_tooltip_strong":     "#f0d080",

            # ── Score cards ───────────────────────────────────────────────────
            "score_card_bg":      "linear-gradient(160deg,#fff 45%,#eef4fc 100%)",
            "score_card_top":     "linear-gradient(90deg,#163a6b 0%,#1e4d8c 15%,#c9a84c 35%,#fff4a0 50%,#f5d97a 60%,#c9a84c 75%,#2a5fa8 88%,#163a6b 100%)",
            "score_card_border":  "rgba(201,168,76,0.55)",
            "score_card_shadow":  "0 4px 24px rgba(30,77,140,0.18),0 1px 8px rgba(201,168,76,0.20)",
            "sc_label_color":     "#1e4d8c",

            # ── Badges ────────────────────────────────────────────────────────
            "badge_gold_bg":      "rgba(201,168,76,0.16)",
            "badge_gold_clr":     "#f0d080",
            "badge_gold_bdr":     "rgba(201,168,76,0.35)",

            # ── Performance grid title ─────────────────────────────────────────
            "pg_title_grad":      "linear-gradient(135deg,#163a6b 0%,#1e4d8c 55%,#2a5fa8 100%)",
            "pg_title_border":    "#f0d080",

            # ── Overall effectiveness bar ──────────────────────────────────────
            "pg_oe_bar":          "linear-gradient(135deg,#163a6b 0%,#1e4d8c 50%,#2a5fa8 100%)",
            "pg_oe_border":       "#f0d080",
            "pg_oe_color":        "#f0d080",
            "pg_oe_val_color":    "#f0d080",
            "pg_oe_val_bg":       "rgba(201,168,76,0.12)",
            "pg_oe_val_border":   "rgba(201,168,76,0.35)",

            # ── Perf grid wrapper ──────────────────────────────────────────────
            "pg_wrap_border":     "rgba(30,77,140,0.28)",
            "pg_wrap_shadow":     "0 4px 32px rgba(30,77,140,0.12)",

            # ── Worker criteria box ────────────────────────────────────────────
            "wc_bg":              "linear-gradient(135deg,#eef4fc,#dbeafe)",
            "wc_border":          "rgba(201,168,76,0.50)",
            "wc_title_color":     "#1e4d8c",
            "wc_card_border":     "rgba(201,168,76,0.50)",
            "wc_card_title":      "#1e4d8c",
            "wc_row_dash":        "#93c5fd",           # light blue dash

            # ── Avatars ───────────────────────────────────────────────────────
            "ass_avatar_bg":      "linear-gradient(145deg,#163a6b,#2a5fa8)",
            "ass_avatar_border":  "#c9a84c",
            "emp_avatar_bg":      "linear-gradient(145deg,#163a6b,#2a5fa8)",  # blue-to-gold shine

            # ── Score pills ───────────────────────────────────────────────────
            "score_pill_low_bg":  "rgba(192,57,43,0.10)",
            "score_pill_low_clr": "#c0392b",
            "score_pill_low_bdr": "rgba(192,57,43,0.20)",

            # ── Shadows ───────────────────────────────────────────────────────
            "shadow_sm":          "0 1px 4px rgba(30,77,140,0.10)",
            "shadow_md":          "0 4px 20px rgba(30,77,140,0.14)",
            "shadow_lg":          "0 24px 64px rgba(30,77,140,0.18)",

            # ── Footer ────────────────────────────────────────────────────────
            "footer_bg":          "linear-gradient(90deg,#eef4fc,#dbeafe,#eef4fc)",
            "footer_right_bg":    "linear-gradient(135deg,#FBF0C0,#fff8d0)",
            "footer_right_bdr":   "rgba(201,168,76,0.50)",
            "footer_right_clr":   "#8B6508",
            "footer_right_shadow":"rgba(201,168,76,0.22)",
        }
    else:
        T = {
            "primary":            "#CE1426",
            "primary_dark":       "#8a0d1a",
            "primary_mid":        "#a81020",
            "primary_light":      "#fdf0f2",
            "accent":             "#c9a84c",
            "accent_lt":          "#e8c97a",
            "accent_deep":        "#8B6508",
            "accent_bright":      "#D4A017",
            "accent_pale":        "#FBF0C0",
            "accent_dim":         "rgba(201,168,76,0.15)",
            "accent_glow":        "rgba(201,168,76,0.40)",
            "accent_border":      "rgba(201,168,76,0.50)",
            "accent_border_hex":  "#c9a84c",
            "header_grad":        "linear-gradient(135deg,#8a0d1a 0%,#CE1426 55%,#fdf5f6 100%)",
            "header_border":      "#c9a84c",
            "frame_grad":         "conic-gradient(from 0deg,#5c3d08 0deg,#c9a84c 40deg,#f5d97a 80deg,#e8c97a 110deg,#c9a84c 150deg,#8B6508 190deg,#D4A017 230deg,#f5d97a 260deg,#c9a84c 300deg,#8B6508 330deg,#5c3d08 360deg)",
            "frame_glow1":        "rgba(201,168,76,0.70)",
            "frame_glow2":        "rgba(201,168,76,0.45)",
            "frame_glow3":        "rgba(201,168,76,0.18)",
            "frame_glow4":        "rgba(200,16,46,0.20)",
            "stripe":             "linear-gradient(90deg,#8a0d1a 0%,#CE1426 25%,#c9a84c 55%,#e8c97a 75%,#c9a84c 90%,#8a0d1a 100%)",
            "stripe_glow":        "rgba(201,168,76,0.30)",
            "section_color":      "#CE1426",
            "section_line":       "linear-gradient(90deg,#D4A017,rgba(201,168,76,0.30),transparent)",
            "odd_row":            "#fff9f0",
            "even_row":           "#ffffff",
            "hover_row":          "#fce8eb",
            "table_header_grad":  "linear-gradient(135deg,#8a0d1a 0%,#CE1426 100%)",
            "table_border":       "rgba(201,168,76,0.50)",
            "table_border_hex":   "rgba(201,168,76,0.15)",
            "table_cell_border":  "rgba(201,168,76,0.15)",
            "info_border":        "rgba(201,168,76,0.50)",
            "info_shadow":        "rgba(201,168,76,0.12)",
            "lbl_color":          "#8B6508",
            "kra_input_border":   "rgba(201,168,76,0.50)",
            "kra_input_focus_shadow": "rgba(201,168,76,0.18)",
            "kra_dd_border":      "rgba(201,168,76,0.50)",
            "kra_dd_shadow":      "rgba(201,168,76,0.15)",
            "kra_dd_hover_bg":    "#fff9f0",
            "kra_dd_hover_color": "#CE1426",
            "kra_card_border":    "rgba(201,168,76,0.50)",
            "kra_card_top":       "#c9a84c",
            "kra_card_bg":        "linear-gradient(160deg,#fff 55%,#fff9ee 100%)",
            "kra_card_hover_shadow": "rgba(201,168,76,0.28)",
            "kra_tooltip_bg":     "linear-gradient(135deg,#8a0d1a,#2a1010)",
            "kra_tooltip_border": "rgba(201,168,76,0.35)",
            "kra_tooltip_color":  "#f0e0c0",
            "kra_tooltip_strong": "#e8c97a",
            "score_card_bg":      "linear-gradient(160deg,#fff 50%,#fff9ee 100%)",
            "score_card_top":     "linear-gradient(90deg,#8a0d1a,#CE1426,#c9a84c,#e8c97a,#c9a84c,#8a0d1a)",
            "score_card_border":  "rgba(201,168,76,0.50)",
            "score_card_shadow":  "0 4px 24px rgba(201,168,76,0.30)",
            "sc_label_color":     "#CE1426",
            "badge_gold_bg":      "rgba(201,168,76,0.18)",
            "badge_gold_clr":     "#e8c97a",
            "badge_gold_bdr":     "rgba(201,168,76,0.38)",
            "pg_title_grad":      "linear-gradient(135deg,#8a0d1a 0%,#CE1426 60%,#e8253c 100%)",
            "pg_title_border":    "#c9a84c",
            "pg_oe_bar":          "linear-gradient(135deg,#8a0d1a 0%,#CE1426 55%,#9a1a00 100%)",
            "pg_oe_border":       "#c9a84c",
            "pg_oe_color":        "#e8c97a",
            "pg_oe_val_color":    "#e8c97a",
            "pg_oe_val_bg":       "rgba(201,168,76,0.10)",
            "pg_oe_val_border":   "rgba(201,168,76,0.30)",
            "pg_wrap_border":     "rgba(201,168,76,0.50)",
            "pg_wrap_shadow":     "0 4px 32px rgba(206,20,38,0.10)",
            "wc_bg":              "linear-gradient(135deg,#fff9f0,#fff3e0)",
            "wc_border":          "rgba(201,168,76,0.50)",
            "wc_title_color":     "#CE1426",
            "wc_card_border":     "rgba(201,168,76,0.50)",
            "wc_card_title":      "#CE1426",
            "wc_row_dash":        "#e5c880",
            "ass_avatar_bg":      "linear-gradient(145deg,#8a0d1a,#CE1426)",
            "ass_avatar_border":  "#c9a84c",
            "emp_avatar_bg":      "linear-gradient(145deg,#8a0d1a,#a81020)",
            "score_pill_low_bg":  "rgba(200,16,46,0.10)",
            "score_pill_low_clr": "#CE1426",
            "score_pill_low_bdr": "rgba(200,16,46,0.20)",
            "shadow_sm":          "0 1px 4px rgba(200,16,46,0.08)",
            "shadow_md":          "0 4px 20px rgba(200,16,46,0.12)",
            "shadow_lg":          "0 24px 64px rgba(200,16,46,0.15)",
            "footer_bg":          "linear-gradient(90deg,#fff9f0,#fff6e8,#fff9f0)",
            "footer_right_bg":    "linear-gradient(135deg,#FBF0C0,#fff8d0)",
            "footer_right_bdr":   "rgba(201,168,76,0.50)",
            "footer_right_clr":   "#8B6508",
            "footer_right_shadow":"rgba(201,168,76,0.20)",
        }

    # ── Employee photo ─────────────────────────────────────────────────────
    emp_image  = doc.get("image") or frappe.db.get_value("Employee", doc.employee, "image")
    image_html = (f'<img src="{emp_image}" alt="{safe(doc.employee_name)}">'
                  if emp_image else f'<div class="emp-avatar-initials">{initials(doc.employee_name)}</div>')
    logo_image_html = '<img src="/files/galfar-logo.png" alt="Logo">'

    # ── Badges ─────────────────────────────────────────────────────────────
    badges = ""
    if doc.company:             badges += f'<span class="badge badge-accent">🏢 {safe(doc.company)}</span>'
    if doc.appraisal_cycle:     badges += f'<span class="badge badge-white">Cycle: {safe(doc.appraisal_cycle)}</span>'
    if doc.get("custom_grade"): badges += f'<span class="badge badge-white">Grade: {safe(doc.custom_grade)}</span>'

    # ── KRA List for dropdown ──────────────────────────────────────────────
    kra_list = frappe.get_all(
    "KRA",
    filters=[
        ["Unit Details", "unit", "=", doc.get("custom_unit")]
    ],
    fields=["name"],
    order_by="name asc"
)
    kra_options_json = json.dumps([k["name"] for k in kra_list]).replace('</script>','<\\/script>')

    kra_arabic_map = {
        "Safety":        "السلامة",
        "Quality":       "الجودة",
        "Productivity":  "الإنتاجية",
        "Absences":      "الغيابات",
        "Teamwork":      "العمل الجماعي",
        "Communication": "التواصل",
        "Leadership":    "القيادة",
        "Initiative":    "المبادرة",
        "Integrity":     "النزاهة",
    }
    kra_arabic_map_json = json.dumps(kra_arabic_map).replace('</script>','<\\/script>')

    # ── Row map ────────────────────────────────────────────────────────────
    goals = doc.get("goals") or []
    row_map = {}
    for tbl_idx, row in enumerate(goals):
        assessor_raw   = flt(row.get("custom_assessor_score") or 0)
        self_raw       = flt(row.get("custom_self_score") or 0)
        weightage      = flt(row.get("per_weightage") or 0)
        assessor_stars = round(assessor_raw * 5)
        self_stars_val = round(self_raw * 5)
        goal_score_val = round(assessor_stars * weightage / 100, 2)
        row_map[tbl_idx] = {
            "name":           cstr(row.name),
            "cdt":            "Appraisal Goal",
            "weightage":      weightage,
            "assessor_stars": assessor_stars,
            "self_stars":     self_stars_val,
            "goal_score":     goal_score_val,
            "total_score":    goal_score_val,
            "kra":            cstr(row.get("kra") or ""),
            "per_weightage":  weightage,
        }
    row_map_json = json.dumps(row_map).replace('</script>','<\\/script>')
    def productivity_rating(pct):
        if pct <= 86:  return 1
        if pct <= 90:  return 2
        if pct <= 100: return 3
        if pct <= 120: return 4
        return 5
    # ── KRA Cards ──────────────────────────────────────────────────────────
    cards = ""; card_idx = 0
    for tbl_idx, row in enumerate(goals):
        if (row.get("custom_unit") or "").strip() not in ["Common","Worker"]: continue
        kra_name           = cstr(row.get("kra") or "")
        custom_description = cstr(row.get("custom_description") or "")
        weightage          = flt(row.get("per_weightage") or 0)
        self_stars         = round(flt(row.get("custom_self_score") or 0) * 5)
        assessor_stars     = round(flt(row.get("custom_assessor_score") or 0) * 5)
        goal_score_val     = round(assessor_stars * weightage / 100, 2)
        icon               = _kra_icon(kra_name)
        pill_cls           = score_class(assessor_stars)
        desc_safe          = safe(custom_description)

        self_section_html = ""
        # ── Special metric cards for PRODUCTIVITY and A ─────────────
        if kra_name in ["Productivity", "Absences"] and is_worker:
            # achieved_val = (flt(row.get("custom_achieved") or 0))
            # absence_days = flt(row.get("custom_absence_days") or 0)
            # icon         = "⚡" if kra_name == "Productivity" else "🗓️"
            # pill_cls     = score_class(assessor_stars)
            # assr_cursor  = "pointer" if assessor_editable else "default"
            # assr_pointer = "auto" if assessor_editable else "none"   # ← NEW

            # assessor_html_card = "".join(
            #     f'<span class="kra-star {"checked" if s <= assessor_stars else ""}" '
            #     f'data-tbl="{tbl_idx}" data-val="{s}" '
            #     + (f'onclick="starClick(this)"' if assessor_editable else '') +
            #     f' style="cursor:{assr_cursor};pointer-events:{assr_pointer};">'   # ← pointer-events added
            #     f'{"★" if s <= assessor_stars else "☆"}</span>'
            #     for s in range(1, 6))
            if kra_name in ["Productivity", "Absences"] and is_worker:
                achieved_val = (flt(row.get("custom_achieved") or 0))
                absence_days = flt(row.get("custom_absence_days") or 0)
                icon         = "⚡" if kra_name == "Productivity" else "🗓️"
                pill_cls     = score_class(assessor_stars)

                # Always readonly — stars are auto-calculated from % or days input
                assessor_html_card = "".join(
                    f'<span class="kra-star {"checked" if s <= assessor_stars else ""}" '
                    f'data-tbl="{tbl_idx}" data-val="{s}" '
                    f'style="cursor:default;pointer-events:none;">'
                    f'{"★" if s <= assessor_stars else "☆"}</span>'
                    for s in range(1, 6))

            if kra_name == "Productivity":
                inp_readonly = 'readonly' if not assessor_editable else ''
                # desc_safe    = "Rating based on productivity % achieved. Below 87%=Poor, 87–90%=Acceptable, 91–100%=Good, 101–120%=Very Good, Above 120%=Excellent."
                metric_block = f"""
                <div class="mc-wrap">
                    <div class="mc-row">
                        <span class="mc-lbl">%</span>
                        <input class="mc-inp" type="number" step="0.01" min="0"
                            id="metric-achieved-{tbl_idx}"
                            value="{achieved_val if achieved_val else ''}"
                            placeholder="0.00"
                            oninput="calcProductivity({tbl_idx})"
                            {inp_readonly}/>
                    </div>
                </div>"""
            else:
                inp_readonly = 'readonly' if not assessor_editable else ''
                # desc_safe    = "Rating based on unauthorized absence days. 0 days=Excellent, 1–2=Very Good, 3–4=Good, 5–6=Acceptable, 7+=Poor."
                metric_block = f"""
                <div class="mc-wrap">
                    <div class="mc-row">
                        <span class="mc-lbl">Days</span>
                        <input class="mc-inp" type="number" step="1" min="0"
                            id="metric-days-{tbl_idx}"
                            value="{int(absence_days) if absence_days else 0}"
                            placeholder=" "
                            oninput="calcAbsences({tbl_idx})"
                            {inp_readonly}/>
                    </div>
                </div>"""
            if is_published or is_assessor or is_admin:
                cards += f"""
                <div class="kra-card" id="kra-card-{card_idx}" data-tbl="{tbl_idx}"
                    data-desc="{desc_safe}"
                    onmouseenter="showKraTooltip(this)" onmouseleave="hideKraTooltip()">
                    <div class="kra-card-icon">{icon}</div>
                    <div class="kra-card-title">{safe(kra_name)}</div>
                    {metric_block}
                    <div class="kra-row-label" style="margin-top:7px;">Assessor</div>
                    <div class="star-row assessor-stars" id="card-assessor-{card_idx}">{assessor_html_card}</div>
                    <input type="hidden" id="metric-rating-{tbl_idx}" value="{assessor_stars}"/>
                    <div class="kra-card-score-wrap">
                        <span class="score-pill {pill_cls}" id="card-pill-{card_idx}">{assessor_stars} / 5</span>
                    </div>
                </div>"""
            else:
                cards += f"""
                <div class="kra-card" id="kra-card-{card_idx}" data-tbl="{tbl_idx}"
                    data-desc="{desc_safe}"
                    onmouseenter="showKraTooltip(this)" onmouseleave="hideKraTooltip()">
                    <div class="kra-card-icon">{icon}</div>
                    <div class="kra-card-title">{safe(kra_name)}</div>
                </div>"""
            card_idx += 1
            continue
        if not is_worker:
            self_cursor = "pointer" if self_editable else "default"
            self_html = "".join(
                f'<span class="kra-star {"checked" if s <= self_stars else ""}" '
                f'data-tbl="{tbl_idx}" data-val="{s}" data-type="self" '
                + (f'onclick="selfStarClick(this)"' if self_editable else '') +
                f' style="cursor:{self_cursor}">{"★" if s <= self_stars else "☆"}</span>'
                for s in range(1, 6))
            self_section_html = f'''
            <div class="kra-row-label">Self</div>
            <div class="star-row self-stars" id="card-self-{card_idx}">{self_html}</div>'''

        assessor_cursor = "pointer" if assessor_editable else "default"
        assessor_html = "".join(
            f'<span class="kra-star {"checked" if s <= assessor_stars else ""}" '
            f'data-tbl="{tbl_idx}" data-val="{s}" '
            + (f'onclick="starClick(this)"' if assessor_editable else '') +
            f' style="cursor:{assessor_cursor}">{"★" if s <= assessor_stars else "☆"}</span>'
            for s in range(1, 6))

        # In the non-worker KRA card generation, replace:
        assessor_section_html = ""
        if is_published or is_assessor or is_admin:
            assessor_section_html = f"""
            <div class="kra-row-label" style="margin-top:6px;">Assessor</div>
            <div class="star-row assessor-stars" id="card-assessor-{card_idx}">{assessor_html}</div>
            <div class="kra-card-score-wrap">
                <span class="score-pill {pill_cls}" id="card-pill-{card_idx}">{assessor_stars} / 5</span>
            </div>"""
        else:
            assessor_section_html = """
            <div class="kra-card-score-wrap" style="margin-top:6px;">
                <span style="color:#9ca3af;font-size:11px;"></span>
            </div>"""

        cards += f"""
        <div class="kra-card" id="kra-card-{card_idx}" data-tbl="{tbl_idx}" data-desc="{desc_safe}"
            onmouseenter="showKraTooltip(this)" onmouseleave="hideKraTooltip()">
            <div class="kra-card-icon">{icon}</div>
            <div class="kra-card-title">{safe(kra_name)}</div>
            {self_section_html}
            {assessor_section_html}
        </div>"""
        # cards += f"""
        # <div class="kra-card" id="kra-card-{card_idx}" data-tbl="{tbl_idx}" data-desc="{desc_safe}"
        #      onmouseenter="showKraTooltip(this)" onmouseleave="hideKraTooltip()">
        #     <div class="kra-card-icon">{icon}</div>
        #     <div class="kra-card-title">{safe(kra_name)}</div>
        #     {self_section_html}
        #     <div class="kra-row-label" style="margin-top:6px;">Assessor</div>
        #     <div class="star-row assessor-stars" id="card-assessor-{card_idx}">{assessor_html}</div>
        #     <div class="kra-card-score-wrap">
        #         <span class="score-pill {pill_cls}" id="card-pill-{card_idx}">{assessor_stars} / 5</span>
        #     </div>
        # </div>"""
        card_idx += 1

    kra_cards_html = f"""
    <div class="collapsible-section" style="text-align:center;">
        <div class="section collapsible-header" onclick="toggleSection(this)">
            <span style='font-size:15px;'>Galfar Values</span><span class="coll-icon">▼</span>
        </div>
        <div class="collapsible-body" style="text-align:center;">
            <div class="kra-cards-grid" style="text-align:center;">{cards}</div>
            <div id="kra-tooltip-panel" class="kra-tooltip-panel" style="display:none;text-align:center;"></div>
        </div>
    </div>""" if cards else ""

    # ── Goals Table ────────────────────────────────────────────────────────
    goal_rows = ""; index = 0
    for tbl_idx, row in enumerate(goals):
        if (row.get("custom_unit") or "").strip() in ["Common" ,"Worker"]:
            if row.get("kra") not in ["PRODUCTIVITY","ABSENCES"]: continue
        index += 1
        kra_name           = cstr(row.get("kra") or "")
        weightage          = flt(row.get("per_weightage") or 0)
        custom_description = cstr(row.get("custom_description") or "")
        self_stars         = round(flt(row.get("custom_self_score") or 0) * 5)
        assessor_stars     = round(flt(row.get("custom_assessor_score") or 0) * 5)
        goal_score_val     = round(assessor_stars * weightage / 100, 2)
        pill_cls           = score_class(assessor_stars)
        kra_name_safe      = safe(kra_name) or  ""
        # kra_name_safe      = safe(kra_name) if row.get("custom_is_new_goal") else ""

        kra_td = f"""
            <td class="col-goal">
            <div class="edit-cell">
                <input class="kra-input" type="text"
                    data-tbl="{tbl_idx}" data-field="kra"
                    data-kra-english="{kra_name_safe}"
                    value="{kra_name_safe}" placeholder="Add KRA..."
                    autocomplete="off"
                    oninput="filterKraDropdown(this)"
                    onfocus="showKraDropdown(this)"
                    onblur="hideKraDropdownDelayed(this)"
                    {'readonly' if not self_editable else ''}
                />
            </div>
        </td>"""

        wt_td = f'<td class="col-weight" style="text-align:center;">{weightage}%</td>'

        if not is_worker:
            self_cursor = "pointer" if self_editable else "default"
            self_stars_html = "".join(
                f'<span class="kra-star {"checked" if s <= self_stars else ""}" '
                f'data-tbl="{tbl_idx}" data-val="{s}" data-type="self" '
                + (f'onclick="selfStarClick(this)"' if self_editable else '') +
                f' style="cursor:{self_cursor}">{"★" if s <= self_stars else "☆"}</span>'
                for s in range(1, 6))
            self_td = f"""
            <td class="col-stars" style="text-align:center;">
                <div class="star-row self-stars center-stars" id="tbl-self-{tbl_idx}">{self_stars_html}</div>
                <div class="score-sub"><span id="tbl-self-score-{tbl_idx}">{self_stars}</span> / 5</div>
            </td>"""
        else:
            self_td = ""

        assessor_cursor = "pointer" if assessor_editable else "default"
        assessor_html = "".join(
            f'<span class="kra-star {"checked" if s <= assessor_stars else ""}" '
            f'data-tbl="{tbl_idx}" data-val="{s}" '
            + (f'onclick="starClick(this)"' if assessor_editable else '') +
            f' style="cursor:{assessor_cursor}">{"★" if s <= assessor_stars else "☆"}</span>'
            for s in range(1, 6))
        if show_assessor_stars:
            assessor_td = f"""
            <td class="col-stars" style="text-align:center;">
                <div class="star-row assessor-stars center-stars" id="tbl-assessor-{tbl_idx}">{assessor_html}</div>
                <div class="score-sub"><span id="tbl-score-{tbl_idx}">{assessor_stars}</span> / 5</div>
            </td>
            <td class="col-pill" style="text-align:center;">
                <span class="score-pill {pill_cls}" id="tbl-pill-{tbl_idx}">{assessor_stars} / 5</span>
            </td>"""
        else:
            assessor_td = """
            <td class="col-stars" style="text-align:center;">
                <div style="color:#9ca3af;font-size:12px;">—</div>
            </td>
            <td class="col-pill" style="text-align:center;">
                <span style="color:#9ca3af;font-size:12px;">—</span>
            </td>"""
        # goal_rows += f"""
        # <tr id="goal-row-{tbl_idx}" data-tbl="{tbl_idx}" data-rowname="{safe(row.name)}">
        #     <td class="col-no">{index}</td>
        #     {kra_td}
        #     <td class="col-desc">
        #         <div class="desc-cell" id="desc-cell-{tbl_idx}" title="{safe(custom_description)}">{safe(custom_description)}</div>
        #     </td>
        #     {wt_td}
        #     {self_td}
        #     <td class="col-stars" style="text-align:center;">
        #         <div class="star-row assessor-stars center-stars" id="tbl-assessor-{tbl_idx}">{assessor_html}</div>
        #         <div class="score-sub"><span id="tbl-score-{tbl_idx}">{assessor_stars}</span> / 5</div>
        #     </td>
        #     <td class="col-pill" style="text-align:center;">
        #         <span class="score-pill {pill_cls}" id="tbl-pill-{tbl_idx}">{assessor_stars} / 5</span>
        #     </td>
        # </tr>"""
        goal_rows += f"""
            <tr id="goal-row-{tbl_idx}" data-tbl="{tbl_idx}" data-rowname="{safe(row.name)}">
                <td class="col-no">{index}</td>
                {kra_td}
                <td class="col-desc">
                    <div class="desc-cell" id="desc-cell-{tbl_idx}" title="{safe(custom_description)}">{safe(custom_description)}</div>
                </td>
                {wt_td}
                {self_td}
                {assessor_td}
            </tr>"""

    self_score_th = '' if is_worker else '<th class="col-stars">Self Score</th>'
    col_self_col  = '' if is_worker else '<col class="col-stars">'

    goals_section = f"""
    <div class="collapsible-section">
        <div class="section collapsible-header" onclick="toggleSection(this)">
            <span style='font-size:15px;'>Goals</span><span class="coll-icon">▼</span>
        </div>
        <div class="collapsible-body">
            <div class="table-scroll">
            <table class="child-table goals-table" id="goals-table">
                <colgroup>
                    <col class="col-no"><col class="col-goal"><col class="col-desc">
                    <col class="col-weight">{col_self_col}<col class="col-stars"><col class="col-pill">
                </colgroup>
                <thead><tr>
                    <th class="col-no">No.</th>
                    <th class="col-goal">Competency</th>
                    <th class="col-desc">Description</th>
                    <th class="col-weight">Wt %</th>
                    {self_score_th}
                    <th class="col-stars">Assessor Score</th>
                    <th class="col-pill">Rating</th>
                </tr></thead>
                <tbody id="goals-tbody">{goal_rows}</tbody>
            </table></div>
            <div id="goals-save-status" style="margin-top:6px;font-size:12px;color:var(--green);display:none;">✓ Saved</div>
        </div>
    </div>""" if goal_rows else ""

    # ── Score summary ──────────────────────────────────────────────────────
    total_goal_score_str = doc.get("total_score") or 0 if doc.get("workflow_state") == "Draft" else doc.get("total_score")
    self_score_str       = doc.get("custom_total_self_score" or 0)

    # ── Assessor ───────────────────────────────────────────────────────────
    reviewer_name  = doc.get("custom_assessor_name") or ""
    reviewer_id    = frappe.db.get_value("Employee", doc.get("custom_assessor"), "designation") or ""
    assessor_image = None
    if doc.get("custom_assessor"):
        assessor_image = frappe.db.get_value("Employee", doc.custom_assessor, "image")

    # ── Dates / misc ───────────────────────────────────────────────────────
    start_date = formatdate(doc.get("start_date"))             if doc.get("start_date")             else ""
    end_date   = formatdate(doc.get("end_date"))               if doc.get("end_date")               else ""
    doj        = formatdate(doc.get("custom_date_of_joining")) if doc.get("custom_date_of_joining") else ""

    pre_exp    = flt(doc.get("custom_previous_work_experience"))
    galfar_exp = flt(doc.get("custom_internal_work_experience"))
    exp_str    = f"Pre-Galfar: {int(pre_exp)} Years, Galfar : {galfar_exp:.2f} Years"

    status_label = doc.get('custom_appraisal_status') if doc.get("custom_appraisal_status") else "Draft"

    if doc.get("workflow_state") in ["Draft", "Pending for Assessor"]:
        status_class = "draft"
    elif doc.get("workflow_state") in ["Approved", "Accepted"]:
        status_class = "approved"
    else:
        status_class = "draft"

    # ── Performance Grid ───────────────────────────────────────────────────
    PG_COLS = [
        {"num":"1","label":"Excellent",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><polygon points="10,2 12.5,7.5 18.5,8 14,12.5 15.5,18.5 10,15.5 4.5,18.5 6,12.5 1.5,8 7.5,7.5" fill="#b8860b" opacity=".2" stroke="#b8860b" stroke-width="1.2" stroke-linejoin="round"/></svg>',
         "color":"#b8860b","light":"#fefce8","border":"#fde68a","text":"#78530a",
         "bar":"linear-gradient(90deg,#b8860b,#d4a017)"},
        {"num":"2","label":"Very Good",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#15803d" opacity=".12" stroke="#15803d" stroke-width="1.5"/><polyline points="5,10 8.5,13.5 15,7" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8,10 11.5,13.5 18,7" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/></svg>',
         "color":"#15803d","light":"#f0fdf5","border":"#bbf7d0","text":"#0d5c2b",
         "bar":"linear-gradient(90deg,#15803d,#22c55e)"},
        {"num":"3","label":"Good",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#0369a1" opacity=".12" stroke="#0369a1" stroke-width="1.5"/><polyline points="5.5,10.5 8.5,13.5 14.5,7" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
         "color":"#0369a1","light":"#f0f7fd","border":"#bae0f7","text":"#024e7a",
         "bar":"linear-gradient(90deg,#0369a1,#0ea5e9)"},
        {"num":"4","label":"Acceptable",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#c06000" opacity=".13" stroke="#c06000" stroke-width="1.5"/><line x1="6" y1="10" x2="14" y2="10" stroke="#c06000" stroke-width="2.2" stroke-linecap="round"/></svg>',
         "color":"#c06000","light":"#fff8f0","border":"#fdd9aa","text":"#7a3d00",
         "bar":"linear-gradient(90deg,#c06000,#e07820)"},
         {"num":"5","label":"Poor",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#CE1426" opacity=".15" stroke="#CE1426" stroke-width="1.5"/><line x1="6" y1="6" x2="14" y2="14" stroke="#CE1426" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="6" x2="6" y2="14" stroke="#CE1426" stroke-width="2" stroke-linecap="round"/></svg>',
         "color":"#CE1426","light":"#fdf2f3","border":"#f5c2c7","text":"#8a0d1a",
         "bar":"linear-gradient(90deg,#CE1426,#e84a5a)"},
        
    ]
    PG_DESCS = [
        "Consistently far exceeds expectations; acts as a role model and champions this value to others.",
        "Frequently goes above and beyond standard requirements regarding this value.",
        "Consistently demonstrates this value in day-to-day work; meets the standard.",
        "Performance is below expectations; behavior is contrary to company standards.",
        "Inconsistent demonstration of this value; requires coaching or behavioral adjustment.",
    ]
    pg_headers = ""; pg_cells = ""
    for i, col in enumerate(PG_COLS):
        stars = "".join(
            f'<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:13px;height:13px;margin:0 2px;">'
            f'<polygon points="7,1 8.8,5.3 13.3,5.7 10,8.8 11,13.2 7,10.8 3,13.2 4,8.8 0.7,5.7 5.2,5.3"'
            f' fill="{"" + col["color"] + "" if j < (5 - i) else "none"}"'
            f' stroke="{col["color"] if j < (5 - i) else col["border"]}"'
            f' stroke-width="1.1" stroke-linejoin="round"'
            f' opacity="{"1" if j < (5 - i) else "0.5"}"/>'
            f'</svg>'
            for j in range(5)
        )
        pg_headers += f"""
        <th class="pg-col-head" style="background:{col['light']};border-right:1px solid {col['border']};border-bottom:4px solid {col['color']};">
            <div style="width:46px;height:46px;border-radius:12px;background:{col['light']};border:1.5px solid {col['border']};display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 2px 8px {col['color']}22;">
                {col['icon_svg']}
            </div>
            <span class="pg-num-badge" style="background:{col['color']};box-shadow:0 2px 6px {col['color']}44;">{col['num']}</span>
            <span class="pg-col-label" style="color:{col['text']};font-size:12px;font-weight:700;">{col['label']}</span>
            <div style="margin-top:8px;line-height:1;">{stars}</div>
        </th>"""
        pg_cells += f"""
        <td class="pg-desc-cell" style="background:{col['light']};border-right:1px solid {col['border']};">
            <div style="height:4px;background:{col['bar']};opacity:.85;"></div>
            <p class="pg-desc-text" style="color:#1e293b;">{PG_DESCS[i]}</p>
        </td>"""
    if is_admin:
        manual_lock = f"""<tr>
            <td>
                <div class="lbl"></div>
                <div class="val">
                    <input type="checkbox" id="chk-restricted"
                        {'checked' if doc.get("custom_restricted") else ''}
                        onchange="toggleRestricted(this)"
                        style="width:18px;height:18px;cursor:pointer;accent-color:var(--primary);"
                    />
                </div>
            </td>
            <td><div class="lbl">Auto Lock</div><div class="val"></div></td>
            <td><div class="lbl">Locking Date</div><div class="val">{formatdate(doc.get("custom_locking_date") or "")}</div></td>
            <td><div class="lbl">Manual Lock</div><div class="val"></div></td>
        </tr>"""
    else:
        manual_lock =""
    # ── Previous Ratings ──────────────────────────────────────────────────
    custom_previous_rating = frappe.db.sql("""
        SELECT
            child.year,
            child.rating
        FROM `tabPrevious Rating` AS child
        INNER JOIN `tabEmployee` AS emp
            ON child.parent = emp.name
        WHERE emp.custom_gec_no = %s
        AND IFNULL(child.appraisal, '') != %s
        ORDER BY child.year DESC
    """, (
        doc.get("custom_gec_no"),
        doc.get("name")
    ), as_dict=True)
    
    previous_rating_html = ""
    if custom_previous_rating:
        previous_rating_html = """<tr>
            <td colspan="4"><div style="font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:{T['section_color']};margin-bottom:4px;text-align:center">Previous Ratings</div></td>
        </tr>"""
        for idx in range(0, len(custom_previous_rating), 4):
            chunk = custom_previous_rating[idx:idx + 4]
            pr_cells = ""
            for i in chunk:
                pr_cells += f'<td><div class="lbl">Rating {i.year}</div><div class="val">{i.rating if i.rating else "-"}</div></td>'
            for _ in range(4 - len(chunk)):
                pr_cells += '<td></td>'
            previous_rating_html += f"<tr>{pr_cells}</tr>"
    else:
        previous_rating_html = """<tr>
            <td colspan="4"><div style="font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:{T['section_color']};margin-bottom:4px;text-align:center">Previous Ratings</div></td>
        </tr>
        <tr>
            <td colspan="4"><div style="text-align:center;color:#94a3b8;font-size:13px;padding:8px 0;">-</div></td>
        </tr>"""
    # ── Performance Grid HTML ──────────────────────────────────────────────
    perf_grid_html = f"""
    <div class="pg-wrap">
        <table class="pg-table">
            <thead>
                <tr><th colspan="5" class="pg-main-title">PERFORMANCE RATING GRID</th></tr>
                <tr>{pg_headers}</tr>
            </thead>
            <tbody><tr>{pg_cells}</tr></tbody>
        </table>"""
    if is_worker:
        perf_grid_html += f"""
        <div class="worker-criteria">
            <div class="wc-title">⚙️ Evaluation Criteria</div>
            <div class="wc-grid">
                <div class="wc-card">
                    <div class="wc-card-title">📈 Productivity %</div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#A32D2D"/></svg></div>
                            <span>Poor</span>
                        </div>
                        <span>Below 86%</span>
                    </div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#BA7517"/></svg></div>
                            <span>Acceptable</span>
                        </div>
                        <span>87% – 90%</span>
                    </div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#185FA5"/></svg></div>
                            <span>Good</span>
                        </div>
                        <span>91% – 100%</span>
                    </div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#0F6E56"/></svg></div>
                            <span>Very Good</span>
                        </div>
                        <span>101% – 120%</span>
                    </div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#C69B2A"/></svg></div>
                            <span>Excellent</span>
                        </div>
                        <span>Above 120%</span>
                    </div>
                </div>
                <div class="wc-card">
                    <div class="wc-card-title">📅 Absences</div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#A32D2D"/></svg></div>
                            <span>Poor</span>
                        </div>
                        <span>7 Days +</span>
                    </div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#BA7517"/></svg></div>
                            <span>Acceptable</span>
                        </div>
                        <span>5 – 6 Days</span>
                    </div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#185FA5"/></svg></div>
                            <span>Good</span>
                        </div>
                        <span>3 – 4 Days</span>
                    </div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#0F6E56"/></svg></div>
                            <span>Very Good</span>
                        </div>
                        <span>1 – 2 Days</span>
                    </div>
                    <div class="wc-row">
                        <div class="wc-row-left">
                            <div class="arrow-indicator"><svg width="12" height="12" viewBox="0 0 12 12"><polygon points="0,0 12,6 0,12" fill="#C69B2A"/></svg></div>
                            <span>Excellent</span>
                        </div>
                        <span>Zero Unauthorized</span>
                    </div>
                </div>
            </div>
        </div>"""
    if show_oe:
        perf_grid_html += f"""
            <div class="pg-oe-bar">
                <span class="pg-oe-label" style='font-size:20px;'>OVERALL EFFECTIVENESS</span>
                <span class="pg-oe-val" style='font-size:20px;' id="pg-oe-score">{total_goal_score_str or "0"}</span>
            </div>
        </div>"""

    # ── Score Summary Cards ────────────────────────────────────────────────
    score_cards_html = """<div class="score-cards score-cards-single"><div class="score-cards">"""
    if not is_worker:
        score_cards_html += f"""
        <div class="score-card">
            <div class="sc-label">OVERALL EFFECTIVENESS - SELF ASSESSMENT</div>
            <div class="sc-val">{self_score_str}</div>
            <div class="sc-sub">out of 5.00</div>
        </div>"""
    if is_published or is_assessor or is_admin:
        score_cards_html += f"""
            <div class="score-card">
                <div class="sc-label">OVERALL EFFECTIVENESS - ASSESSOR ASSESSMENT</div>
                <div class="sc-val" id="summary-total-goal">{total_goal_score_str}</div>
                <div class="sc-sub">out of 5.00</div>
            </div>
    </div></div>"""

    grade_js = safe_js(doc.get("custom_grade") or "")

    # ══════════════════════════════════════════════════════════════════════
    # HTML OUTPUT
    # ══════════════════════════════════════════════════════════════════════
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Appraisal – {safe(doc.employee_name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet"/>
    <style>
        :root {{
            --primary:       {T['primary']};
            --primary-dark:  {T['primary_dark']};
            --primary-mid:   {T['primary_mid']};
            --accent:        {T['accent']};
            --accent-lt:     {T['accent_lt']};
            --accent-deep:   {T['accent_deep']};
            --accent-bright: {T['accent_bright']};
            --accent-pale:   {T['accent_pale']};
            --accent-dim:    {T['accent_dim']};
            --accent-glow:   {T['accent_glow']};
            --accent-border: {T['accent_border']};
            --cream:         #faf8f4;
            --white:         #ffffff;
            --text:          #1a1a2e;
            --label:         #6b7280;
            --muted:         #9ca3af;
            --odd-row:       {T['odd_row']};
            --even-row:      {T['even_row']};
            --green:         #2d7a4f;
            --self-blue:     #3b82f6;
            --shadow-sm:     {T['shadow_sm']};
            --shadow-md:     {T['shadow_md']};
            --shadow-lg:     {T['shadow_lg']};
        }}
        *{{ box-sizing:border-box; margin:0; padding:0; }}
        body{{ font-family:'DM Sans',sans-serif; background:var(--cream); padding:40px 20px; color:var(--text); }}

        /* ── FRAME ── */
        .gold-frame {{
            padding:5px; border-radius:26px;
            background:{T['frame_grad']};
            box-shadow:0 0 0 1px {T['frame_glow1']},0 0 24px {T['frame_glow2']},0 0 60px {T['frame_glow3']},0 12px 48px {T['frame_glow4']};
            animation:frame-pulse 5s ease-in-out infinite;
        }}
        @keyframes frame-pulse {{
            0%,100% {{ box-shadow:0 0 0 1px {T['frame_glow1']},0 0 24px {T['frame_glow2']},0 0 60px {T['frame_glow3']},0 12px 48px {T['frame_glow4']}; }}
            50%      {{ box-shadow:0 0 0 2px {T['frame_glow1']},0 0 36px {T['frame_glow2']},0 0 90px {T['frame_glow3']},0 12px 48px {T['frame_glow4']}; }}
        }}
        .form{{ background:var(--white); border-radius:22px; overflow:hidden; box-shadow:var(--shadow-lg); }}

        /* ── HEADER ── */
        .header{{
            background:{T['header_grad']};
            padding:32px 48px 28px; position:relative; overflow:hidden;
            border-bottom:3px solid {T['header_border']};
        }}
        .header::before{{ content:''; position:absolute; top:-80px; right:-80px; width:340px; height:340px; border-radius:50%; background:rgba(255,255,255,.05); pointer-events:none; }}
        .header::after{{ content:''; position:absolute; bottom:-60px; left:-60px; width:220px; height:220px; border-radius:50%; background:rgba(0,0,0,.07); pointer-events:none; }}
        .header-ring{{ position:absolute; top:-40px; right:80px; width:200px; height:200px; border-radius:50%; border:40px solid {T['accent_dim']}; pointer-events:none; }}

        .doc-meta{{ position:absolute; top:20px; right:40px; text-align:right; z-index:2; }}
        .doc-no{{ font-size:12px; font-weight:700; letter-spacing:1.5px; color:black; }}
        .doc-status{{ display:inline-block; margin-top:6px; padding:3px 13px; border-radius:20px; font-size:11px; font-weight:700; letter-spacing:.5px; }}
        .doc-status.draft{{ background:#D4A017; color:#000; border:1px solid #000; }}
        .doc-status.approved{{ background:#d4edda; color:#155724; border:1px solid #155724; }}

        .logo-html{{ position:absolute; right:1px; top:50px; padding:10px 18px; border-radius:8px; display:inline-flex; align-items:center; justify-content:center; }}
        .logo-html img{{ max-height:60px; width:auto; display:block; }}

        .header-inner{{ display:flex; align-items:center; gap:28px; position:relative; z-index:1; }}
        .emp-avatar{{
            width:114px; height:114px; border-radius:50%; flex-shrink:0;
            background:{T['emp_avatar_bg']};
            overflow:hidden; display:flex; align-items:center; justify-content:center;
            border:3px solid {T['accent_border_hex']};
            box-shadow:0 0 0 5px {T['accent_dim']},0 0 0 9px {T['accent_dim']},0 8px 28px rgba(0,0,0,.35);
        }}
        .emp-avatar img{{ width:100%; height:100%; object-fit:cover; border-radius:50%; }}
        .emp-avatar-initials{{ font-family:'Playfair Display',serif; font-size:36px; color:{T['accent_lt']}; }}
        .header-info{{ flex:1; }}
        .emp-name{{ font-family:'Playfair Display',serif; font-size:28px; color:#fff; margin-bottom:6px; line-height:1.2; }}
        .emp-sub{{ font-size:13px; color:rgba(255,255,255,.65); letter-spacing:.3px; }}
        .badges{{ display:flex; gap:9px; flex-wrap:wrap; margin-top:13px; }}
        .badge{{ padding:4px 13px; border-radius:20px; font-size:11px; font-weight:500; }}
        .badge-accent{{ background:{T['badge_gold_bg']}; color:{T['badge_gold_clr']}; border:1px solid {T['badge_gold_bdr']}; }}
        .badge-white{{ background:rgba(255,255,255,.12); color:rgba(255,255,255,.8); border:1px solid rgba(255,255,255,.2); }}

        /* ── STRIPE ── */
        .stripe{{ height:5px; background:{T['stripe']}; box-shadow:0 2px 8px {T['stripe_glow']}; }}

        /* ── BODY ── */
        .body{{ padding:36px 48px 44px; }}
        .collapsible-section{{ margin-bottom:0; }}
        .collapsible-body{{ overflow:visible; transition:max-height .35s ease,opacity .25s ease; max-height:9999px; opacity:1; }}
        .collapsible-body.collapsed{{ max-height:0 !important; opacity:0; overflow:hidden !important; }}
        .section{{
            font-size:12px; font-weight:700; letter-spacing:3px; text-transform:uppercase;
            color:{T['section_color']}; display:flex; align-items:center; gap:12px;
            margin-bottom:18px; margin-top:32px; cursor:pointer; user-select:none;
        }}
        .section:first-child{{ margin-top:0; }}
        .section::after{{ content:''; flex:1; height:2px; background:{T['section_line']}; border-radius:2px; }}
        .coll-icon{{ font-size:10px; color:{T['accent_bright']}; transition:transform .3s; flex-shrink:0; margin-left:4px; }}
        .coll-icon.rotated{{ transform:rotate(-90deg); }}

        /* ── INFO TABLE ── */
        .info-table{{
            width:100%; border-collapse:collapse;
            border:1.5px solid {T['info_border']};
            border-radius:12px; overflow:hidden; margin-bottom:4px;
            box-shadow:0 2px 12px {T['info_shadow']};
        }}
        .info-table tr:nth-child(odd) td{{ background:var(--odd-row); }}
        .info-table tr:nth-child(even) td{{ background:var(--even-row); }}
        .info-table tr:last-child td{{ border-bottom:none; }}
        .info-table td{{
            padding:13px 20px; border-bottom:1px solid {T['table_cell_border']};
            border-right:1px solid {T['table_cell_border']}; vertical-align:top; width:25%;
        }}
        .info-table td:last-child{{ border-right:none; }}
        .lbl{{ font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:{T['lbl_color']}; margin-bottom:4px; }}
        .val{{ font-size:13.5px; font-weight:500; color:var(--text); }}

        /* ── ASSESSOR AVATAR ── */
        .assessor-cell{{ display:flex; align-items:center; gap:10px; }}
        .ass-avatar-sm{{
            width:38px; height:38px; border-radius:50%; flex-shrink:0;
            background:{T['ass_avatar_bg']};
            display:flex; align-items:center; justify-content:center;
            border:2px solid {T['ass_avatar_border']}; overflow:hidden;
            box-shadow:0 0 0 2px {T['accent_dim']};
        }}
        .ass-avatar-sm img{{ width:100%; height:100%; object-fit:cover; border-radius:50%; }}
        .ass-initials-sm{{ font-family:'Playfair Display',serif; font-size:14px; color:{T['accent_lt']}; }}
        .ass-name-sm{{ font-size:13px; font-weight:600; color:var(--text); }}
        .ass-id-sm{{ font-size:11px; color:var(--muted); margin-top:1px; }}

        /* ── GOALS TABLE ── */
        .table-scroll{{ overflow-x:auto; overflow-y:visible; }}
        .goals-table{{
            width:100%; table-layout:auto; border-collapse:collapse;
            border:1.5px solid {T['table_border']};
            border-radius:12px; font-size:13px;
            box-shadow:0 2px 12px {T['info_shadow']};
        }}
        .goals-table thead tr{{ background:{T['table_header_grad']}; border-bottom:2px solid {T['accent_border_hex']}; }}
        .goals-table thead th{{ padding:12px 14px; text-align:center; font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,.9); border-right:1px solid rgba(255,255,255,.12); white-space:nowrap; }}
        .goals-table thead th:first-child,.goals-table thead th:nth-child(2),.goals-table thead th:nth-child(3){{ text-align:left; }}
        .goals-table thead th:last-child{{ border-right:none; }}
        .goals-table tbody tr:nth-child(odd) td{{ background:var(--odd-row); }}
        .goals-table tbody tr:nth-child(even) td{{ background:var(--even-row); }}
        .goals-table tbody tr:hover td{{ background:{T['hover_row']}; transition:background .15s; }}
        .goals-table tbody tr:last-child td{{ border-bottom:none; }}
        .goals-table tbody td{{ padding:10px 14px; border-bottom:1px solid {T['table_border_hex']}; border-right:1px solid {T['table_border_hex']}; vertical-align:middle; }}
        .goals-table tbody td:last-child{{ border-right:none; }}
        .col-no{{ width:36px; text-align:center; }}
        .col-goal{{ width:200px; white-space:normal; }}
        .col-weight{{ width:56px; text-align:center !important; }}
        .col-desc{{ width:180px; }}
        .col-stars{{ width:140px; text-align:center; }}
        .col-pill{{ width:110px; text-align:center; }}
        .desc-cell{{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:13px; color:var(--label); line-height:1.45; max-width:200px; word-break:break-word; }}
        .center-stars{{ justify-content:center; }}

        /* ── KRA INPUT / DROPDOWN ── */
        .kra-input{{
            width:100%; padding:5px 8px; border:1px solid {T['kra_input_border']};
            border-radius:6px; font-size:12px; font-family:'DM Sans',sans-serif;
            background:#fff; color:var(--text); outline:none;
            transition:border-color .15s,box-shadow .15s;
        }}
        .kra-input:focus{{ border-color:{T['accent_bright']}; box-shadow:0 0 0 2px {T['kra_input_focus_shadow']}; }}
        .edit-cell{{ position:relative; overflow:visible; white-space:normal; }}
        .kra-dropdown{{
            position:fixed; z-index:999999; background:#fff;
            border:1.5px solid {T['kra_dd_border']};
            border-radius:8px;
            box-shadow:0 8px 32px rgba(0,0,0,.18),0 2px 8px {T['kra_dd_shadow']};
            max-height:200px; overflow-y:auto; min-width:220px; display:none;
        }}
        .kra-dd-item{{ padding:8px 12px; font-size:12px; cursor:pointer; color:var(--text); border-bottom:1px solid {T['accent_dim']}; transition:background .1s; }}
        .kra-dd-item:last-child{{ border-bottom:none; }}
        .kra-dd-item:hover{{ background:{T['kra_dd_hover_bg']}; color:{T['kra_dd_hover_color']}; }}
        .kra-dd-item.dd-empty{{ color:var(--muted); cursor:default; font-style:italic; }}

        /* ── PILLS ── */
        .score-pill{{ display:inline-block; padding:4px 12px; border-radius:20px; font-weight:700; font-size:11px; white-space:nowrap; }}
        .score-high{{ background:rgba(45,122,79,.12); color:var(--green); border:1px solid rgba(45,122,79,.25); }}
        .score-mid{{ background:{T['accent_dim']}; color:{T['accent_deep']}; border:1px solid {T['accent_border']}; }}
        .score-low{{ background:{T['score_pill_low_bg']}; color:{T['score_pill_low_clr']}; border:1px solid {T['score_pill_low_bdr']}; }}
        .score-sub{{ font-size:10px; color:var(--muted); margin-top:3px; text-align:center; }}

        /* ── STARS ── */
        .star-row{{ display:flex; gap:2px; font-size:18px; line-height:1; align-items:center; flex-wrap:nowrap; }}
        .kra-star{{ color:#e2d0b0; transition:color .12s,transform .1s; user-select:none; }}
        .self-stars .kra-star.checked{{ color:var(--self-blue); }}
        .self-stars .kra-star:hover{{ color:#93c5fd; transform:scale(1.2); }}
        .assessor-stars .kra-star.checked{{ color:{T['accent']}; }}
        .assessor-stars .kra-star:hover{{ color:{T['accent_lt']}; transform:scale(1.2); }}

        /* ── KRA CARDS ── */
        .kra-cards-grid{{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px; margin-bottom:8px; justify-items:center; }}
        .kra-card{{
            width:180px; border:1.5px solid {T['kra_card_border']}; border-top:3px solid {T['kra_card_top']};
            border-radius:14px; padding:16px 12px 14px;
            background:{T['kra_card_bg']};
            box-shadow:var(--shadow-sm);
            display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px;
            transition:box-shadow .2s,transform .15s,border-color .15s; cursor:default;
        }}
        .kra-card:hover{{ box-shadow:0 6px 28px {T['kra_card_hover_shadow']},var(--shadow-md); transform:translateY(-3px); border-color:{T['accent_bright']}; }}
        .kra-card-icon{{ font-size:28px; line-height:1; margin-bottom:2px; }}
        .kra-card-title{{ font-size:12px; font-weight:700; color:var(--text); line-height:1.3; text-transform:uppercase; min-height:28px; display:flex; align-items:center; justify-content:center; }}
        .kra-card-score-wrap{{ margin-top:6px; width:100%; text-align:center; }}
        .kra-row-label{{ font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:var(--label); margin-top:4px; }}
        .kra-tooltip-panel{{
            margin-top:10px; background:{T['kra_tooltip_bg']};
            color:{T['kra_tooltip_color']}; font-size:13px; line-height:1.7;
            padding:13px 18px; border-radius:10px;
            box-shadow:0 8px 28px rgba(0,0,0,.25);
            border:1px solid {T['kra_tooltip_border']}; transition:opacity .15s;
        }}
        .kra-tooltip-panel strong{{ color:{T['kra_tooltip_strong']}; font-size:11px; letter-spacing:1px; text-transform:uppercase; display:block; margin-bottom:4px; }}

        /* ── SCORE CARDS ── */
        .score-cards{{ display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:4px; }}
        .score-cards-single{{ grid-template-columns:1fr; max-width:320px; }}
        .score-card{{
            border:1.5px solid {T['score_card_border']}; border-radius:14px;
            padding:24px 20px; text-align:center;
            background:{T['score_card_bg']};
            box-shadow:{T['score_card_shadow']},var(--shadow-sm);
            position:relative; overflow:hidden;
        }}
        .score-card::before{{
            content:''; position:absolute; top:0; left:0; right:0; height:4px;
            background:{T['score_card_top']};
            background-size:200% 100%; animation:shimmer-bar 3s linear infinite;
        }}
        @keyframes shimmer-bar{{ 0%{{ background-position:200% center; }} 100%{{ background-position:-200% center; }} }}
        .sc-label{{ font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:{T['sc_label_color']}; margin-bottom:10px; }}
        .sc-val{{ font-family:'Playfair Display',serif; font-size:32px; color:var(--text); }}
        .sc-sub{{ font-size:11px; color:var(--muted); margin-top:6px; }}

        /* ── PERFORMANCE GRID ── */
        .pg-wrap{{ border-radius:16px; overflow:hidden; border:1.5px solid {T['pg_wrap_border']}; box-shadow:{T['pg_wrap_shadow']}; margin-bottom:4px; }}
        .pg-table{{ width:100%; border-collapse:collapse; table-layout:fixed; font-size:13px; }}
        .pg-main-title{{
            background:{T['pg_title_grad']};
            color:#fff; font-family:'Playfair Display',serif; font-size:14px; font-weight:700;
            letter-spacing:3px; text-transform:uppercase; text-align:center; padding:16px 20px;
            border-bottom:2px solid {T['pg_title_border']};
        }}
        .pg-col-head{{ padding:18px 10px 14px; text-align:center; vertical-align:middle; width:20%; transition:background .15s; }}
        .pg-col-head:last-child{{ border-right:none !important; }}
        .pg-num-badge{{ display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:8px; color:#fff; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; margin-bottom:7px; }}
        .pg-col-label{{ display:block; font-size:12px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; margin-top:3px; }}
        .pg-desc-cell{{ vertical-align:top; padding:0; width:20%; }}
        .pg-desc-cell:last-child{{ border-right:none !important; }}
        .pg-desc-text{{ padding:14px 14px 18px; font-size:12px; line-height:1.7; }}
        .pg-oe-bar{{
            display:flex; align-items:center;
            background:{T['pg_oe_bar']};
            border-top:2px solid {T['pg_oe_border']};
        }}
        .pg-oe-label{{ flex:1; padding:14px 22px; font-family:'Playfair Display',serif; font-size:13px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:{T['pg_oe_color']}; }}
        .pg-oe-val{{ padding:14px 22px; font-family:'Playfair Display',serif; font-size:28px; font-weight:700; color:{T['pg_oe_val_color']}; border-left:1px solid {T['pg_oe_val_border']}; background:{T['pg_oe_val_bg']}; line-height:1; }}

        /* ── WORKER CRITERIA ── */
        .worker-criteria{{ margin-top:20px; border:1.5px solid {T['wc_border']}; border-radius:12px; padding:18px; background:{T['wc_bg']}; }}
        .wc-title{{ font-weight:700; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; color:{T['wc_title_color']}; margin-bottom:14px; }}
        .wc-grid{{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; }}
        .wc-card{{ background:#fff; border:1px solid {T['wc_card_border']}; border-radius:10px; padding:12px 14px; box-shadow:var(--shadow-sm); }}
        .wc-card-title{{ font-size:12px; font-weight:700; margin-bottom:8px; color:{T['wc_card_title']}; }}
        .wc-row{{ display:flex; justify-content:space-between; font-size:11.5px; padding:4px 0; border-bottom:1px dashed {T['wc_row_dash']}; }}
        .wc-row:last-child{{ border-bottom:none; }}
        .wc-row {{ display: flex; align-items: center; justify-content: space-between; padding: 7px 14px; border-bottom: 0.5px solid #e0e0e0; font-size: 13px; }}
    .wc-row:last-child {{ border-bottom: none; }}
    .wc-row-left {{ display: flex; align-items: center; gap: 8px; }}
    .arrow-indicator {{ width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }}
    .arrow-indicator svg {{ display: block; }}
        .mc-wrap{{
    background:rgba(201,168,76,0.06);
    border:1px solid rgba(201,168,76,0.28);
    border-radius:10px;
    padding:10px 12px;
    margin-top:8px;
}}

.mc-row{{
    display:flex;
    align-items:center;
    gap:12px;
    margin-bottom:8px;
}}

.mc-row:last-child{{
    margin-bottom:0;
}}

.mc-lbl{{
    font-size:11px;
    font-weight:700;
    letter-spacing:.7px;
    text-transform:uppercase;
    color:#8B6508;
    flex-shrink:0;
}}

/* FIXED CLEAN INPUT */
.mc-inp{{
    width:100%;
    max-width:120px;
    padding:2px 6px;
    border:1px solid rgba(201,168,76,0.45);
    border-radius:10px;
    font-size:14px;
    font-weight:600;
    font-family:'DM Sans',sans-serif;
    background:#ffffff;
    color:#1a1a2e;
    outline:none;
    box-sizing:border-box;

    appearance:textfield;
    -moz-appearance:textfield;
}}

.mc-inp::-webkit-outer-spin-button,
.mc-inp::-webkit-inner-spin-button{{
    -webkit-appearance:none;
    margin:0;
}}

.mc-inp:focus{{
    border-color:#D4A017;
    box-shadow:0 0 0 3px rgba(201,168,76,0.18);
}}

.mc-inp[readonly]{{
    background:#f8f8f8;
    color:#777;
    cursor:not-allowed;
}}

.mc-pct-row{{
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding-top:8px;
    border-top:1px dashed rgba(201,168,76,0.25);
    margin-top:6px;
}}

.mc-pct-lbl{{
    font-size:11px;
    font-weight:700;
    color:#8B6508;
}}

.mc-pct-val{{
    font-size:14px;
    font-weight:800;
    color:#0f1f3d;
}}

.mc-rating-lbl{{
    font-size:11px;
    font-weight:600;
    color:#8B6508;
    letter-spacing:.3px;
    margin-top:5px;
}}
        /* ── FOOTER ── */
        .footer{{ border-top:2px solid {T['accent_border']}; padding:16px 48px; display:flex; justify-content:space-between; align-items:center; background:{T['footer_bg']}; }}
        .footer-left{{ font-size:11px; color:var(--label); }}
        .footer-right{{ font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:{T['footer_right_clr']}; background:{T['footer_right_bg']}; border:1px solid {T['footer_right_bdr']}; padding:4px 14px; border-radius:20px; box-shadow:0 1px 6px {T['footer_right_shadow']}; }}

        @media(max-width:768px){{
            .header,.body,.footer{{ padding-left:22px; padding-right:22px; }}
            .header-inner{{ flex-direction:column; align-items:center; text-align:center; }}
            .doc-meta{{ position:static; text-align:center; margin-bottom:16px; }}
            .badges{{ justify-content:center; }}
            .score-cards{{ grid-template-columns:1fr; }}
            .info-table td{{ width:50%; }}
            .info-table tr{{ display:flex; flex-wrap:wrap; }}
            .kra-cards-grid{{ grid-template-columns:repeat(2,1fr); }}
            .col-desc{{ width:150px; }}
        }}
    </style>
</head>
<body>
<div class="gold-frame">
<div class="form">

    <div class="header">
        <div class="doc-meta">
            <div class="doc-no">📄 {safe(doc.name)}</div>
            <div class="doc-status {status_class}">● {status_label}</div>
            <div class="logo-html">{logo_image_html}</div>
        </div>
        <div class="header-inner">
            <div class="emp-avatar">{image_html}</div>
            <div class="header-info">
                <div class="emp-name">{safe(doc.employee_name)}</div>
                <div class="emp-sub">{safe(doc.get("designation") or "")} {"&nbsp;·&nbsp; " + (frappe.db.get_value("Employee", doc.get("employee"), "custom_division") or "")}</div>
                <div class="badges">{badges}</div>
            </div>
        </div>
    </div>
    <div class="stripe"></div>

    <div class="body">

        <div class="collapsible-section">
            <div class="section collapsible-header" onclick="toggleSection(this)">
                <span style='font-size:15px;'>Employee Details</span><span class="coll-icon">▼</span>
            </div>
            <div class="collapsible-body">
                <table class="info-table">
                    <tr>
                        <td><div class="lbl">GEC No</div><div class="val">{safe(doc.custom_gec_no) or ""}</div></td>
                        <td><div class="lbl">Employee Name</div><div class="val">{safe(doc.employee_name)}</div></td>
                        <td><div class="lbl">Company</div><div class="val">{safe(doc.company)}</div></td>
                        <td><div class="lbl">Assessment Date</div><div class="val">{formatdate(doc.get("creation") or "")}</div></td>

                    </tr>
                    <tr>
                        <td><div class="lbl">Unit</div><div class="val">{safe(doc.get("custom_unit") or "")}</div></td>
                        <td><div class="lbl">Project</div><div class="val">{frappe.db.get_value("Employee", doc.get("employee"), "custom_job_description") or "-"}</div></td>
                        <td><div class="lbl">Designation</div><div class="val">{safe(doc.get("designation") or "")}</div></td>
                        <td><div class="lbl">Grade</div><div class="val">{safe(doc.get("custom_grade") or "")}</div></td>

                    </tr>
                    <tr>
                        <td><div class="lbl">Date of Joining</div><div class="val">{doj}</div></td>
                        <td><div class="lbl">Qualification</div><div class="val">{safe(doc.get("custom_qualification") or "-")}</div></td>
                        <td><div class="lbl">Certifications</div><div class="val">{safe(doc.get("custom_certifications") or "-")}</div></td>
                        <td><div class="lbl">Experience</div><div class="val">{exp_str}</div></td>
                    </tr>
                    <tr>
                        <td>
                            <div class="lbl">📅 Appraisal Cycle</div>
                            <div class="val">{safe(doc.get("appraisal_cycle") or "—")}</div>
                        </td>
                        <td>
                            <div class="lbl">🗓️ Period</div>
                            <div class="val">{start_date or "—"} &nbsp;→&nbsp; {end_date or "—"}</div>
                        </td>
                        <td>
                            <div class="lbl">🏅 Total Score</div>
                            <div class="val" style="font-family:'Playfair Display',serif;font-size:20px;color:{T['accent_deep']};" id="hdr-total-score">{total_goal_score_str or "-" if (is_published or is_assessor or is_admin) else "—"}</div>
                        </td>
                        <td>
                            <div class="lbl">👤 Assessor</div>
                            <div class="assessor-cell">
                                <div class="ass-avatar-sm">
                                    {'<img src="' + assessor_image + '" alt="' + safe(reviewer_name) + '">' if assessor_image else '<div class="ass-initials-sm">' + (initials(reviewer_name) if reviewer_name else "?") + '</div>'}
                                </div>
                                <div>
                                    <div class="ass-name-sm">{safe(reviewer_name) or "—"}</div>
                                    <div class="ass-id-sm">{safe(reviewer_id)}</div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    {manual_lock}
                    {previous_rating_html}
                </table>
            </div>
        </div>

        <div class="collapsible-section">
            <div class="section collapsible-header" onclick="toggleSection(this)">
                <span style='font-size:15px;'>Performance Grid</span><span class="coll-icon">▼</span>
            </div>
            <div class="collapsible-body">
                {perf_grid_html}
            </div>
        </div>

        {kra_cards_html}
        {goals_section}

        <div class="collapsible-section">
            <div class="section collapsible-header" onclick="toggleSection(this)">
                <span style='font-size:15px;'>Score Summary</span><span class="coll-icon">▼</span>
            </div>
            <div class="collapsible-body">
                {score_cards_html}
            </div>
        </div>

    </div>

    <div class="footer">
        <div class="footer-left">If anyone scores 1&amp;2 in Safety it will not be considered as 4 &amp; 5 in Overall Effectiveness rating.</div>
        <div class="footer-right">Note</div>
    </div>

</div>
</div>

<!-- ── Single shared dropdown portal ── -->
<div class="kra-dropdown" id="kra-dd-portal"></div>

<script>
var APPRAISAL_NAME = "{safe_js(doc.name)}";
var ROW_MAP        = {row_map_json};
var SELF_EDITABLE  = {"true" if self_editable else "false"};
var ASSR_EDITABLE  = {"true" if assessor_editable else "false"};
var IS_WORKER      = {"true" if is_worker else "false"};
var KRA_LIST       = {kra_options_json};
var KRA_ARABIC_MAP = {kra_arabic_map_json};

var _activeTblIdx = null;
var _activeInput  = null;
var _portal       = document.getElementById('kra-dd-portal');

/* ── Collapsible ── */
function toggleSection(headerEl) {{
    var icon = headerEl.querySelector('.coll-icon');
    var body = headerEl.closest('.collapsible-section').querySelector('.collapsible-body');
    if (!body) return;
    var isCollapsed = body.classList.contains('collapsed');
    body.classList.toggle('collapsed', !isCollapsed);
    if (icon) icon.classList.toggle('rotated', !isCollapsed);
}}

/* ── KRA Tooltip ── */
function showKraTooltip(cardEl) {{
    var desc = cardEl.getAttribute('data-desc') || '';
    if (!desc) return;
    var title = cardEl.querySelector('.kra-card-title');
    var label = title ? title.textContent.trim() : '';
    var panel = document.getElementById('kra-tooltip-panel');
    if (!panel) return;
    panel.innerHTML = '<strong>' + label + '</strong>' + desc;
    panel.style.display = 'block';
}}
function hideKraTooltip() {{
    var panel = document.getElementById('kra-tooltip-panel');
    if (panel) panel.style.display = 'none';
}}

/* ── Portal positioning ── */
function positionPortal(input) {{
    var rect = input.getBoundingClientRect();
    _portal.style.top   = (rect.bottom + 2) + 'px';
    _portal.style.left  = rect.left + 'px';
    _portal.style.width = Math.max(rect.width, 240) + 'px';
}}

function showKraDropdown(input) {{
    _activeInput  = input;
    _activeTblIdx = parseInt(input.dataset.tbl);
    positionPortal(input);
    buildDropdownItems(input.value || '');
    _portal.style.display = 'block';
}}

function filterKraDropdown(input) {{
    if (_activeTblIdx !== parseInt(input.dataset.tbl)) {{ showKraDropdown(input); return; }}
    positionPortal(input);
    buildDropdownItems(input.value || '');
    _portal.style.display = 'block';
}}

function buildDropdownItems(q) {{
    q = (q || '').trim().toLowerCase();
    var filtered = q ? KRA_LIST.filter(function(k) {{ return k.toLowerCase().indexOf(q) !== -1; }}) : KRA_LIST;
    if (!filtered.length) {{
        _portal.innerHTML = '<div class="kra-dd-item dd-empty">No KRA found</div>';
    }} else {{
        _portal.innerHTML = filtered.slice(0, 30).map(function(k) {{
            /* Store English name in data-english, display translated if Arabic mode */
            var isArabic = false;
            try {{
                isArabic = window.parent && 
                           window.parent.cur_frm && 
                           window.parent.cur_frm.doc.custom_language === 'Arabic';
            }} catch(e) {{}}

            var displayText = k;
            if (isArabic && typeof KRA_ARABIC_MAP !== 'undefined' && KRA_ARABIC_MAP[k]) {{
                displayText = KRA_ARABIC_MAP[k];
            }}

            return '<div class="kra-dd-item" data-english="' + k.replace(/"/g, '&quot;') + '" onmousedown="selectKra(this)">' + displayText + '</div>';
        }}).join('');
    }}
}}

function hideKraDropdownDelayed(input) {{
    setTimeout(function() {{
        if (_activeInput === input) {{
            _portal.style.display = 'none';
            _activeTblIdx = null;
            _activeInput  = null;
        }}
    }}, 200);
}}

document.addEventListener('mousedown', function(e) {{
    if (!_portal.contains(e.target) && e.target !== _activeInput) {{
        _portal.style.display = 'none';
        _activeTblIdx = null;
        _activeInput  = null;
    }}
}});
window.addEventListener('scroll', function() {{
    if (_activeInput && _portal.style.display === 'block') positionPortal(_activeInput);
}}, true);
window.addEventListener('resize', function() {{
    if (_activeInput && _portal.style.display === 'block') positionPortal(_activeInput);
}});

function selectKra(item) {{
    var kraName = item.getAttribute('data-english') || item.textContent.trim();
    var kraDisplay = item.textContent.trim();  /* Arabic display text if translated, else same as kraName */
    var tblIdx  = _activeTblIdx;

    _portal.style.display = 'none';
    _activeTblIdx = null;

    var input = document.querySelector('.kra-input[data-tbl="' + tblIdx + '"]');
    if (input) {{
        input.setAttribute('data-kra-english', kraName);  /* Always store English for saving */
        
        /* Check if Arabic mode is active on parent form */
        var isArabic = false;
        try {{
            isArabic = window.parent && 
                       window.parent.cur_frm && 
                       window.parent.cur_frm.doc.custom_language === 'Arabic';
        }} catch(e) {{}}
        
        /* Show Arabic display text if in Arabic mode, else show English */
        input.value = isArabic ? kraDisplay : kraName;
        _activeInput = null;
    }}

    if (ROW_MAP[tblIdx]) ROW_MAP[tblIdx].kra = kraName;

    var info = ROW_MAP[tblIdx];
    if (!info) return;

    var parentFrappe = null;
    try {{ parentFrappe = window.parent && window.parent.frappe; }} catch(e) {{}}
    var _frappe = parentFrappe || frappe;

    var frm = getLiveForm();
    if (frm) {{
        /* Save English name to Frappe link field */
        _frappe.model.set_value(info.cdt, info.name, "kra", kraName).then(function() {{ frm.dirty(); showSaveStatus(); }});
        _frappe.model.set_value("Appraisal Goal", info.name, "custom_is_new_goal", 1).then(function() {{ frm.dirty(); }});
    }} else {{
        _frappe.model.set_value("Appraisal Goal", info.name, "kra", kraName);
        _frappe.model.set_value("Appraisal Goal", info.name, "custom_is_new_goal", 1);
        showSaveStatus();
    }}

    frappe.call({{
        method: "pms_ai.custom.get_kra_description",
        args: {{ kra: kraName, grade: "{grade_js}" }},
        callback: function(r) {{
            if (r.message && r.message.length) {{
                var desc  = r.message[0].description || "";
                var frm2  = getLiveForm();
                if (frm2) {{
                    _frappe.model.set_value(info.cdt, info.name, "custom_description", desc).then(function() {{ frm2.dirty(); }});
                }} else {{
                    _frappe.model.set_value("Appraisal Goal", info.name, "custom_description", desc);
                }}
                var descEl = document.getElementById("desc-cell-" + tblIdx);
                if (descEl) {{ descEl.textContent = desc; descEl.title = desc; }}
            }}
        }}
    }});
}}

function showSaveStatus() {{
    var status = document.getElementById("goals-save-status");
    if (status) {{ status.style.display = 'inline'; setTimeout(function() {{ status.style.display = 'none'; }}, 1500); }}
}}

function getLiveForm() {{
    try {{
        var frm = window.cur_frm || (window.parent && window.parent.cur_frm);
        return (frm && frm.doc && frm.doc.name === APPRAISAL_NAME) ? frm : null;
    }} catch(e) {{ return null; }}
}}

function pillClass(score) {{
    if (score >= 4.0) return "score-high";
    if (score >= 2.5) return "score-mid";
    return "score-low";
}}

function renderStars(containerId, val) {{
    var el = document.getElementById(containerId);
    if (!el) return;
    el.querySelectorAll(".kra-star").forEach(function(s, i) {{
        var v = i + 1;
        s.textContent = v <= val ? "★" : "☆";
        s.classList.toggle("checked", v <= val);
    }});
}}

function syncAssessorUI(tblIdx, starVal) {{
    if (!ASSR_EDITABLE) return;
    var info = ROW_MAP[tblIdx];
    if (!info) return;
    var weightage  = info.weightage || 0;
    var goalScore  = parseFloat(starVal.toFixed(2));
    var totalscore = parseFloat((starVal * weightage / 100).toFixed(2));
    renderStars("tbl-assessor-" + tblIdx, starVal);
    var sc = document.getElementById("tbl-score-" + tblIdx);
    if (sc) sc.textContent = starVal;
    var pill = document.getElementById("tbl-pill-" + tblIdx);
    if (pill) {{ pill.textContent = goalScore.toFixed(2) + " / 5"; pill.className = "score-pill " + pillClass(goalScore); }}
    document.querySelectorAll(".kra-card").forEach(function(card) {{
        if (parseInt(card.dataset.tbl) === tblIdx) {{
            var cIdx = card.id.replace("kra-card-", "");
            renderStars("card-assessor-" + cIdx, starVal);
            var cp = document.getElementById("card-pill-" + cIdx);
            if (cp) cp.textContent = starVal + " / 5";
        }}
    }});
    ROW_MAP[tblIdx].assessor_stars = starVal;
    ROW_MAP[tblIdx].goal_score     = goalScore;
    ROW_MAP[tblIdx].weighted_score = totalscore;
    var totalWeightedStars = 0, totalWeight = 0;
    Object.values(ROW_MAP).forEach(function(r) {{
        if ((r.assessor_stars || 0) > 0) {{
            totalWeightedStars += (r.assessor_stars || 0) * (r.weightage || 0);
            totalWeight        += (r.weightage || 0);
        }}
    }});
    var totalOf5 = totalWeight > 0 ? parseFloat((totalWeightedStars / totalWeight).toFixed(0)) : 0;
    ["summary-total-goal","pg-oe-score","hdr-total-score"].forEach(function(id) {{
        var el = document.getElementById(id);
        if (el) el.textContent = totalOf5;
    }});
    var frm = getLiveForm();
    if (frm) {{ frm.doc["total_score"] = totalOf5; frm.dirty(); }}
}}

function syncSelfUI(tblIdx, starVal) {{
    if (!SELF_EDITABLE || IS_WORKER) return;
    var info = ROW_MAP[tblIdx];
    if (!info) return;
    renderStars("tbl-self-" + tblIdx, starVal);
    var selfSc = document.getElementById("tbl-self-score-" + tblIdx);
    if (selfSc) selfSc.textContent = starVal;
    document.querySelectorAll(".kra-card").forEach(function(card) {{
        if (parseInt(card.dataset.tbl) === tblIdx) {{
            var cIdx = card.id.replace("kra-card-", "");
            renderStars("card-self-" + cIdx, starVal);
        }}
    }});
    ROW_MAP[tblIdx].self_stars = starVal;
    var totalSelfWeighted = 0, totalWeight = 0;
    Object.values(ROW_MAP).forEach(function(r) {{
        totalSelfWeighted += (r.self_stars || 0) * (r.weightage || 0);
        totalWeight       += (r.weightage || 0);
    }});
    var avgSelf = totalWeight > 0 ? parseFloat((totalSelfWeighted / totalWeight).toFixed(2)) : 0;
    var se = document.getElementById("summary-self-score");
    if (se) se.textContent = avgSelf.toFixed(2);
}}

function starClick(starEl) {{
    if (!ASSR_EDITABLE) return;
    var tblIdx  = parseInt(starEl.dataset.tbl);
    var starVal = parseInt(starEl.dataset.val);
    syncAssessorUI(tblIdx, starVal);
    var info = ROW_MAP[tblIdx];
    if (!info) return;
    var parentFrappe = null;
    try {{ parentFrappe = window.parent && window.parent.frappe; }} catch(e) {{}}
    var _frappe = parentFrappe || frappe;
    var frm = getLiveForm();
    if (frm) {{
        var rowObj = _frappe.get_doc(info.cdt, info.name);
        if (rowObj) {{ rowObj["custom_assessor_score"] = starVal / 5; rowObj["score"] = starVal; }}
        frm.dirty();
    }} else {{
        _frappe.model.set_value(info.cdt, info.name, "custom_assessor_score", starVal / 5);
        _frappe.model.set_value(info.cdt, info.name, "score", starVal);
    }}
}}

function selfStarClick(starEl) {{
    if (!SELF_EDITABLE || IS_WORKER) return;

    var tblIdx  = parseInt(starEl.dataset.tbl);
    var starVal = parseInt(starEl.dataset.val);
    ROW_MAP[tblIdx].self_stars = starVal;
    syncSelfUI(tblIdx, starVal);

    var info = ROW_MAP[tblIdx];
    if (!info) return;

    var totalSelfWeighted = 0, totalWeight = 0;
    Object.values(ROW_MAP).forEach(function(r) {{
        totalSelfWeighted += (r.self_stars    || 0) * (r.per_weightage || 0);
        totalWeight       += (r.per_weightage || 0);
    }});

    var avgOf5    = totalWeight > 0 ? parseFloat((totalSelfWeighted / totalWeight).toFixed(2)) : 0;
    var selfScore = parseFloat((starVal / 5).toFixed(2));

    var parentFrappe = null;
    try {{ parentFrappe = window.parent && window.parent.frappe; }} catch(e) {{}}
    var _frappe = parentFrappe || frappe;

    var frm = getLiveForm();
    if (frm) {{
        var rowObj = _frappe.get_doc(info.cdt, info.name);
        if (rowObj) {{
            rowObj["custom_self_score"] = selfScore;
            rowObj["custom_self_score_with_weighted"] = starVal * info.per_weightage / 100;
        }}
        frm.doc["custom_total_self_score"] = avgOf5;
        ["summary-total-goal", "pg-oe-score", "hdr-total-score"].forEach(function(id) {{
            var el = document.getElementById(id);
            if (el) el.textContent = avgOf5.toFixed(2);
        }});
        frm.dirty();
    }} else {{
        _frappe.model.set_value(info.cdt, info.name, "custom_self_score",               selfScore);
        _frappe.model.set_value(info.cdt, info.name, "custom_self_score_with_weighted", starVal * info.per_weightage / 100);
        _frappe.model.set_value(info.cdt, info.name, "custom_total_self_score",         avgOf5);
    }}
}}
/* ── Productivity auto-rating ─────────────────────────────────────── */
var RATING_LABELS = {{0:"—",1:"Poor",2:"Acceptable",3:"Good",4:"Very Good",5:"Excellent"}};
var PILL_MAP = {{1:"score-low",2:"score-low",3:"score-mid",4:"score-high",5:"score-high"}};

function applyMetricRating(tblIdx, rating) {{
    var starsEl = document.getElementById("metric-stars-" + tblIdx);
    var labelEl = document.getElementById("metric-label-" + tblIdx);
    var pillEl  = document.getElementById("metric-pill-"  + tblIdx);
    var hiddenEl= document.getElementById("metric-rating-"+ tblIdx);

    if (starsEl) {{
        var stars = "";
        for (var s = 1; s <= 5; s++) {{
            stars += '<span class="kra-star assessor-stars' + (s <= rating ? ' checked' : '') + '">'
                   + (s <= rating ? "★" : "☆") + "</span>";
        }}
        starsEl.innerHTML = stars;
    }}
    if (labelEl) labelEl.textContent = rating ? (rating + " — " + RATING_LABELS[rating]) : "Enter values above";
    if (pillEl)  {{ pillEl.textContent = rating ? (rating + " / 5") : "— / 5"; pillEl.className = "score-pill " + (PILL_MAP[rating] || "score-mid"); }}
    if (hiddenEl) hiddenEl.value = rating;

    /* sync ROW_MAP + total score display */
    if (ROW_MAP[tblIdx]) {{
        ROW_MAP[tblIdx].assessor_stars = rating;
        ROW_MAP[tblIdx].goal_score     = rating;
        var wt   = ROW_MAP[tblIdx].weightage || 0;
        var wscore = parseFloat((rating * wt / 100).toFixed(2));
        ROW_MAP[tblIdx].weighted_score = wscore;
    }}
    recalcTotal();
    document.querySelectorAll(".kra-card").forEach(function(card) {{
        if (parseInt(card.dataset.tbl) === tblIdx) {{
            var cIdx = card.id.replace("kra-card-", "");
            renderStars("card-assessor-" + cIdx, rating);
            var cp = document.getElementById("card-pill-" + cIdx);
            if (cp) {{ cp.textContent = rating + " / 5"; cp.className = "score-pill " + (PILL_MAP[rating] || "score-mid"); }}
            var lbl = document.getElementById("metric-label-" + tblIdx);
            var RLABELS = {{0:"Enter values above",1:"1 — Poor",2:"2 — Acceptable",3:"3 — Good",4:"4 — Very Good",5:"5 — Excellent"}};
            if (lbl) lbl.textContent = RLABELS[rating] || "—";
        }}
    }});
}}

function calcProductivity(tblIdx) {{
    var pctInpEl = document.getElementById("metric-achieved-" + tblIdx);
    var pctEl    = document.getElementById("metric-pct-"      + tblIdx);
    var pct      = parseFloat(pctInpEl ? pctInpEl.value : "");

    if (isNaN(pct) || pct < 0) {{
        applyMetricRating(tblIdx, 0);
        return;
    }}

    var rating;
    if      (pct <  87)  rating = 1;   /* Below 87% → Poor        */
    else if (pct <= 90)  rating = 2;   /* 87% – 90% → Acceptable  */
    else if (pct <= 100) rating = 3;   /* 91% – 100% → Good       */
    else if (pct <= 120) rating = 4;   /* 101% – 120% → Very Good */
    else                 rating = 5;   /* Above 120% → Excellent  */
    applyMetricRating(tblIdx, rating);
    saveMetricField(tblIdx, "custom_achieved",       pct);
    saveMetricField(tblIdx, "custom_assessor_score", rating / 5);
}}

function calcAbsences(tblIdx) {{
    var inp  = document.getElementById("metric-days-" + tblIdx);
    if (!inp || inp.value === "") {{ applyMetricRating(tblIdx, 0); return; }}
    var days = parseFloat(inp.value);
    if (isNaN(days)) {{ applyMetricRating(tblIdx, 0); return; }}

    var rating = days === 0 ? 5 : days <= 2 ? 4 : days <= 4 ? 3 : days <= 6 ? 2 : 1;
    applyMetricRating(tblIdx, rating);
    saveMetricField(tblIdx, "custom_absence_days",   days);
    saveMetricField(tblIdx, "custom_assessor_score", rating / 5);
}}

function saveMetricField(tblIdx, field, value) {{
    var info = ROW_MAP[tblIdx];
    if (!info) return;
    var parentFrappe = null;
    try {{ parentFrappe = window.parent && window.parent.frappe; }} catch(e) {{}}
    var _frappe = parentFrappe || frappe;
    var frm = getLiveForm();
    if (frm) {{
        _frappe.model.set_value(info.cdt, info.name, field, value);
        frm.dirty();
    }} else {{
        _frappe.model.set_value("Appraisal Goal", info.name, field, value);
    }}
}}
function toggleRestricted(chk) {{
    var val = chk.checked ? 1 : 0;

    var parentFrappe = null;
    try {{ parentFrappe = window.parent && window.parent.frappe; }} catch(e) {{}}
    var _frappe = parentFrappe || frappe;

    var frm = getLiveForm();
    if (frm) {{
        frm.doc["custom_restricted"] = val;
        frm.dirty();
        /* Also refresh the field in the Frappe form UI if visible */
        try {{ frm.refresh_field("custom_restricted"); }} catch(e) {{}}
    }} else {{
        _frappe.model.set_value("Appraisal", APPRAISAL_NAME, "custom_restricted", val);
    }}

    /* Visual feedback */
    chk.style.outline = "2px solid " + (val ? "#CE1426" : "#2d7a4f");
    setTimeout(function() {{ chk.style.outline = "none"; }}, 800);
}}
function recalcTotal() {{
    var totalWeighted = 0, totalWeight = 0;
    Object.values(ROW_MAP).forEach(function(r) {{
        if ((r.assessor_stars || 0) > 0) {{
            totalWeighted += (r.assessor_stars || 0) * (r.weightage || 0);
            totalWeight   += (r.weightage || 0);
        }}
    }});
    var totalOf5 = totalWeight > 0 ? parseFloat((totalWeighted / totalWeight).toFixed(2)) : 0;
    ["summary-total-goal","pg-oe-score","hdr-total-score"].forEach(function(id) {{
        var el = document.getElementById(id);
        if (el) el.textContent = totalOf5;
    }});
    var frm = getLiveForm();
    if (frm) {{ frm.doc["total_score"] = totalOf5; frm.dirty(); }}
}}


</script>
</body>
</html>"""

    return html
    
import frappe
from frappe.utils.pdf import get_pdf

# ── main ──────────────────────────────────────────────────────────────────────




import frappe
from frappe.utils import getdate, today

@frappe.whitelist()
def update_overdue_appraisals():
    current_date = getdate(today())
    
    expired_cycles = frappe.get_all("Appraisal Cycle", 
        filters={"custom_locking_date": ["<", current_date]},
        pluck="name"
    )
    appraisals = frappe.get_all("Appraisal",
        filters=[
            ["appraisal_cycle", "in", expired_cycles],
            ["custom_appraisal_status", "!=", "Overdue"],
            ["workflow_state", "not in", ["Approved", "Cancelled"]],
            ["docstatus", "<", 2]
        ],
        fields=["name"]
    )
    for entry in appraisals:
        doc = frappe.get_doc("Appraisal", entry.name)
        doc.custom_appraisal_status = "Overdue"
        doc.save(ignore_permissions=True)
    not_expired_cycles = frappe.get_all("Appraisal Cycle", 
        filters={"custom_locking_date": [">", current_date]},
        pluck="name"
    )
    appraisals = frappe.get_all("Appraisal",
        filters=[
            ["appraisal_cycle", "in", not_expired_cycles],
            ["custom_appraisal_status", "=", "Overdue"],
            ["workflow_state", "not in", ["Approved", "Cancelled"]],
            ["docstatus", "<", 2]
        ],
        fields=["name"]
    )
    for entry in appraisals:
        doc = frappe.get_doc("Appraisal", entry.name)
        doc.custom_appraisal_status = "Draft"
        doc.save(ignore_permissions=True)
        


import frappe
from frappe.utils import flt, getdate


@frappe.whitelist()
def appraisal_rating_update(doc, method=None):
    if not doc.has_value_changed("workflow_state"):
        return

    employee = frappe.get_doc("Employee", doc.employee)

    year = getdate(doc.end_date).year if doc.end_date else ""

    score = flt(doc.total_score or 0)

    # # Staff Rating Logic
    # if doc.custom_employment_type == "Staff":

    #     if 0 <= score <= 1:
    #         grade = "E"
    #     elif 1 < score <= 2:
    #         grade = "D"
    #     elif 2 < score <= 3:
    #         grade = "C"
    #     elif 3 < score <= 4:
    #         grade = "B"
    #     elif 4 < score <= 5:
    #         grade = "A"
    #     else:
    #         grade = ""

    # # Worker Rating Logic
    # elif doc.custom_employment_type == "Worker":

    #     # Example:
    #     # 0 - 2   -> C
    #     # 2 - 4   -> B
    #     # 4 - 5   -> A

    #     if 0 <= score <= 2:
    #         grade = "C"
    #     elif 2 < score <= 4:
    #         grade = "B"
    #     elif 4 < score <= 5:
    #         grade = "A"
    #     else:
    #         grade = ""

    # else:
        # grade = ""

    if doc.workflow_state == "Approved":

        exists = False

        for row in employee.custom_previous_rating:
            if row.appraisal == doc.name:
                exists = True
                row.rating = score
                row.year = year

        if not exists:
            employee.append("custom_previous_rating", {
                "appraisal": doc.name,
                "rating": score,
                "year": year
            })

        employee.save(ignore_permissions=True)
        
    elif doc.workflow_state == "Cancelled":

        employee.custom_previous_rating = [
            row for row in employee.custom_previous_rating
            if row.appraisal != doc.name
        ]

        employee.save(ignore_permissions=True)





import frappe
from deep_translator import GoogleTranslator

@frappe.whitelist()
def translate_child_headers():
    # 1. Update this to your exact Child DocType Name
    child_doctype = "Significant Achievements" 
    
    # Fetch the child doctype configuration
    doc = frappe.get_doc("DocType", child_doctype)
    
    for field in doc.fields:
        if field.label:
            # Automatically translates the current English label to Arabic
            translated_text = GoogleTranslator(source='en', target='ar').translate(field.label)
            
            # This safely injects the translation into Frappe's translation system
            if not frappe.db.exists("Translation", {"source_text": field.label, "language": "ar"}):
                translation_doc = frappe.get_doc({
                    "doctype": "Translation",
                    "language": "ar",
                    "source_text": field.label,
                    "translated_text": translated_text
                })
                translation_doc.insert(ignore_permissions=True)
            else:
                frappe.db.set_value("Translation", {"source_text": field.label, "language": "ar"}, "translated_text", translated_text)
            
    # Clears system cache so the new Arabic text loads immediately
    frappe.clear_cache(doctype=child_doctype)
    frappe.db.commit()
    
    return "Translations completed successfully!"

def update_the_kra_in_units():
    # Get all appraisal assessor employees
    assessors = frappe.get_all(
        "Appraisal",
        fields=["custom_assessor"],
        filters={"custom_assessor": ["is", "set"]}
    )

    employee_list = list(set([d.custom_assessor for d in assessors if d.custom_assessor]))
    count = 0
    for employee in employee_list:
        # Get User ID from Employee
        user_id = frappe.db.get_value("Employee", employee, "user_id")

        if user_id:
            user = frappe.get_doc("User", user_id)

            # Check role already exists
            existing_roles = [d.role for d in user.roles]

            if "Appraisal Assessor" not in existing_roles:
                user.append("roles", {
                    "role": "Appraisal Assessor"
                })
                count +=1
                # user.save(ignore_permissions=True)
                print(f"Role added for: {user_id}")

    # frappe.db.commit()

    print(count)

def update_empty_fields_value(doc, method):
    if doc.custom_significant_achievements:
        for i in doc.custom_significant_achievements:
            if i.achievement_justification:
                size_check=validate_and_set_image(i.achievement_justification,doc.employee)
                if size_check=='Not Allow':
                    frappe.throw("File size is too large. It must be less than 100 KB.")
    
    previous = doc.get_doc_before_save()
    if not previous or (previous and previous.workflow_state == doc.workflow_state):
   
        if doc.custom_employment_type == 'Worker':
            # 1. Fetch rows. If it's empty, create a new row.
            if not doc.get('custom_training_needed'):
                # This adds a new row if the table was empty
                new_row = doc.append('custom_training_needed', {})
                new_row.description = "-"
                new_row.needed_training = "-"
            else:
                # 2. If rows ALREADY exist, loop and fill missing fields
                for row in doc.custom_training_needed:
                    modified = False
                    
                    if not row.get("description"):
                        row.description = "-"
                        modified = True
                        
                    if not row.get("needed_training"):
                        row.needed_training = "-"
                        modified = True
                    
                    # Direct Frappe to register the change if a value was updated
                    if modified:
                        row.flags.updater_reference = True
    if previous and previous.workflow_state != doc.workflow_state:

        if doc.workflow_state in ["Pending for Assessor", "Approved", "Accepted"]:
            fieldlists = [
                "custom_significant_achievements",
                "custom_targets",
                    "custom_accessor_comments",
                "custom_employee_comments",
                "custom_objectives",
                "custom_training_recommendation",
                "custom_training_needed"
            ]
           

            for field_name in fieldlists:

                # Get field meta
                field = doc.meta.get_field(field_name)

                if not field:
                    continue

                field_type = field.fieldtype

                # Skip unwanted field types
                if field_type in ["Section Break","Column Break","Heading","Read Only","Date","HTML","Select","Link","Float","Int","Tab Break","Attach Image"]:
                    continue

                # Handle Child Tables
                if field_type == "Table":

                    table_rows = doc.get(field_name)

                    if field_name in ["custom_significant_achievements","custom_targets","custom_objectives"]:
                        if not table_rows:

                            child = doc.append(field_name, {})

                            # Get child table meta
                            child_meta = frappe.get_meta(field.options)

                            # Set "-" for child table fields
                            for child_field in child_meta.fields:

                                if child_field.fieldtype in ["Section Break","Column Break","Heading","Read Only","Table","Date","Select","Link"]:
                                    continue
                                if child_field.fieldname in ["description" ,'assessee_remark' ,"recommended_training","needed_training"]:
                                    child.set(child_field.fieldname, "-")
                        
                        else:
                            if field_name == "custom_objectives":
                                for row in table_rows:
                                    if doc.workflow_state == "Pending for Assessor":
                                        if not row.get("description"):
                                            row.set("description", "-")
                                        if not row.get("employee_comments"):
                                            row.set("employee_comments", "-")
                                    if doc.workflow_state == "Approved":
                                        if not row.get("assessor_comments"):
                                            row.set("assessor_comments", "-")
                            elif field_name=='custom_significant_achievements':
                                for row in table_rows:
                                    if doc.workflow_state == "Pending for Assessor":
                                        if not row.get("description"):
                                            row.set("description", "-")
                                        if not row.get("assessee_remark"):
                                            row.set("assessee_remark", "-")
                                    if doc.workflow_state == "Approved":
                                        if not row.get("assessor_remarks"):
                                            row.set("assessor_remarks", "-")
                            elif field_name=='custom_targets':
                                for row in table_rows:
                                    if doc.workflow_state == "Pending for Assessor":
                                        if not row.get("description"):
                                            row.set("description", "-")
                                        if not row.get("assesie_remark"):
                                            row.set("assesie_remark", "-")
                                    if doc.workflow_state == "Approved":
                                        if not row.get("assessor_remarks"):
                                            row.set("assessor_remarks", "-")
                            elif field_name=='custom_training_recommendation':
                                for row in table_rows:
                                    if doc.workflow_state in ["Pending for Assessor","Approved"]  :
                                        if not row.get("description"):
                                            row.set("description", "-")
                                        if not row.get("recommended_training"):
                                            row.set("recommended_training", "-")

                            elif field_name=='custom_training_needed':
                                for row in table_rows:
                                    if doc.workflow_state in ["Pending for Assessor","Approved"]  :
                                        if not row.get("description"):
                                            row.set("description", "-")
                                        if not row.get("needed_training"):
                                            row.set("needed_training", "-")
                                    
                    if field_name in ["custom_training_recommendation", "custom_training_needed"]:
                        table_rows = doc.get(field_name) or []
                        
                        if not table_rows:
                            new_row = doc.append(field_name, {})
                            table_rows = [new_row]

                        if doc.workflow_state == "Pending for Assessor":
                            if field_name == 'custom_training_needed':
                                for row in table_rows:
                                    if not row.get("description"):
                                        row.description = "-"
                                    if not row.get("needed_training"):
                                        row.needed_training = "-"

                        elif doc.workflow_state == "Approved" and doc.custom_employment_type == 'Worker':
                            if field_name == 'custom_training_needed':
                                for row in table_rows:
                                    if not row.get("description"):
                                        row.description = "-"
                                    if not row.get("needed_training"):
                                        row.needed_training = "-"
                            else: 
                                for row in table_rows:
                                    if not row.get("description"):
                                        row.description = "-"
                                    if not row.get("recommended_training"):
                                        row.recommended_training = "-"

                        elif doc.workflow_state == "Approved" and doc.custom_employment_type == 'Staff':
                            if field_name == 'custom_training_recommendation':
                                for row in table_rows:
                                    if not row.get("description"):
                                        row.description = "-"
                                    if not row.get("recommended_training"):
                                        row.recommended_training = "-"
                                        
                                        
                else:

                # Handle normal custom fields
                    value = doc.get(field_name)

                    # Skip accessor comments during Pending for Assessor
                    if (
                        field_name == "custom_accessor_comments"
                        and doc.workflow_state == "Pending for Assessor"
                    ):
                        continue

                    # Set "-" if empty
                    if value in [None, "", []]:
                        doc.set(field_name, "-")


@frappe.whitelist(allow_guest=True)
def validate_kb(file_url):
    file_size = frappe.db.get_value('File', {'file_url': file_url}, ['file_size'])
    if file_size and file_size > 102400:
        return 'Not Allow'
    return 'Allow'


@frappe.whitelist()
def validate_and_set_image(file_url, employee):
    size_check=validate_kb(file_url)
    if size_check == 'Not Allow':
        
        return "Not Allow"
    frappe.db.set_value('Employee', employee, 'image', file_url, update_modified=True)
    frappe.db.commit()
    
    return "Success"



@frappe.whitelist()
def update_worker_user_id():
    employees = frappe.get_all(
        "Employee",
        fields=[
            "name",
            "custom_unit",
            "grade",
            "custom_appraisal_template"
        ]
    )

    updated = 0

    for row in employees:

        # Skip if template already assigned
        if row.custom_appraisal_template:
            continue

        grade = (row.grade or "").strip()
        unit = (row.custom_unit or "").strip()

        if not grade or not unit:
            continue

        # A1–A4 → Worker template
        if grade in ["A1", "A2", "A3", "A4"]:
            template_name = f"{grade} - Worker"
        else:
            template_name = f"{grade} - {unit}"

        # Check template exists
        if frappe.db.exists("Appraisal Template", template_name):

            frappe.db.set_value(
                "Employee",
                row.name,
                "custom_appraisal_template",
                template_name  # variable, not string
            )

            updated += 1

    frappe.db.commit()

    return f"{updated} employee(s) appraisal template updated successfully"