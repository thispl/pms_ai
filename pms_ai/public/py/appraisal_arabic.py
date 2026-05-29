
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


import frappe
from frappe.utils.pdf import get_pdf

import frappe
from frappe.utils import flt, cstr, formatdate
from frappe.utils.pdf import get_pdf


# ── helpers ───────────────────────────────────────────────────────────────────

def _safe(val):
    import html as _html
    return _html.escape(cstr(val or ""))


def _initials(name):
    parts = (name or "?").split()
    if len(parts) > 1:
        return (parts[0][0] + parts[1][0]).upper()
    return (parts[0][:2]).upper()


def _pill_cls(stars):
    if stars >= 4: return "score-high"
    if stars >= 3: return "score-mid"
    return "score-low"


PILL_STYLES = {
    "score-high": "background:rgba(45,122,79,.15);color:#2d7a4f;border:1px solid rgba(45,122,79,.3);",
    "score-mid":  "background:rgba(201,168,76,.18);color:#8B6508;border:1px solid rgba(201,168,76,.4);",
    "score-low":  "background:rgba(200,16,46,.12);color:#CE1426;border:1px solid rgba(200,16,46,.25);",
}


def _stars_html(val, kind="assessor"):
    """Render HTML entity stars — no emoji, fully WeasyPrint-safe."""
    color = "#c9a84c" if kind == "assessor" else "#3b82f6"
    out = ""
    for i in range(1, 6):
        c = color if i <= val else "#ddd"
        ch = "&#9733;" if i <= val else "&#9734;"
        out += f'<span style="color:{c};font-size:15px;">{ch}</span>'
    return out


def _kra_badge(name):
    """Return (letter, bg_color) — a coloured circle instead of emoji."""
    n = (name or "").lower()
    MAP = [
        ("safety",        "/files/safety.png",  "#CE1426"),
        ("integrity",     "/files/safety.png", "#b8860b"),
        ("quality",       "/files/safety.png",  "#0369a1"),
        ("simplicity",    "/files/safety.png", "#0891b2"),
        ("respect",       "/files/safety.png", "#CE1426"),
        ("continuous",    "/files/safety.png", "#15803d"),
        ("productivity",  "/files/safety.png",  "#15803d"),
        ("attendance",    "/files/safety.png",  "#b8860b"),
        ("absences",      "/files/safety.png", "#CE1426"),
        ("discipline",    "/files/safety.png",  "#c06000"),
        ("initiative",    "/files/safety.png",  "#7c3aed"),
        ("teamwork",      "/files/safety.png",  "#0891b2"),
        ("communication", "/files/safety.png",  "#0369a1"),
        ("leadership",    "/files/safety.png",  "#b8860b"),
        ("training",      "/files/safety.png", "#15803d"),
        ("cost",          "/files/safety.png", "#c06000"),
        ("delivery",      "/files/safety.png", "#0369a1"),
        ("innovation",    "/files/safety.png", "#7c3aed"),
        ("customer",      "/files/safety.png", "#CE1426"),
        ("environment",   "/files/safety.png", "#15803d"),
        ("project",       "/files/safety.png", "#0369a1"),
        ("energy",        "/files/safety.png",  "#c06000"),
        ("governance",    "/files/safety.png",  "#7c3aed"),
    ]
    for key, letter, color in MAP:
        if key in n:
            return letter, color
    return name[:2].upper() if name else "?", "#c9a84c"


def _section_head(title):
    return (
        f'<div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;'
        f'color:#CE1426;margin:24px 0 14px;padding-bottom:5px;'
        f'border-bottom:2px solid #D4A017;">{title}</div>'
    )


# ── main ──────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def download_pdf(filters):
    """
    Generate a clean WeasyPrint PDF for the given Appraisal docname.

    Client:
        window.open(frappe.urllib.get_full_url(
            "/api/method/pms_ai.custom.download_pdf?filters="
            + encodeURIComponent(frm.doc.name)
        ));
    """
    appraisal_name = filters
    frappe.has_permission("Appraisal", doc=appraisal_name, throw=True)

    doc   = frappe.get_doc("Appraisal", appraisal_name)
    goals = doc.get("goals") or []

    is_worker = (doc.get("custom_grade") or "") in ["A1", "A2", "A3", "A4"]

    # ── Images ───────────────────────────────────────────────────────────
    emp_image = doc.get("image") or frappe.db.get_value("Employee", doc.employee, "image")
    emp_img_html = (
        f'<img src="{_safe(emp_image)}" style="width:100%;height:100%;object-fit:cover;">'
        if emp_image
        else f'<span style="font-family:Georgia,serif;font-size:28px;color:#c9a84c;line-height:88px;">'
             f'{_initials(doc.employee_name)}</span>'
    )

    assessor_image = None
    if doc.get("custom_assessor"):
        assessor_image = frappe.db.get_value("Employee", doc.custom_assessor, "image")
    ass_img_html = (
        f'<img src="{_safe(assessor_image)}" style="width:100%;height:100%;object-fit:cover;">'
        if assessor_image
        else f'<span style="font-family:Georgia,serif;font-size:12px;color:#c9a84c;line-height:32px;">'
             f'{_initials(doc.get("custom_assessor_name") or "?")}</span>'
    )

    # ── Misc ─────────────────────────────────────────────────────────────
    reviewer_name = _safe(doc.get("custom_assessor_name") or "—")
    reviewer_desg = _safe(
        frappe.db.get_value("Employee", doc.get("custom_assessor"), "designation") or ""
    )
    division    = frappe.db.get_value("Employee", doc.get("employee"), "custom_division") \
                  or _safe(doc.get("department") or "")
    pre_exp     = flt(doc.get("custom_previous_work_experience"))
    galfar_exp  = flt(doc.get("custom_internal_work_experience"))
    exp_str     = f"Pre-Galfar: {int(pre_exp)} Yrs &nbsp;|&nbsp; Galfar: {galfar_exp:.2f} Yrs"
    doj         = formatdate(doc.get("custom_date_of_joining")) if doc.get("custom_date_of_joining") else "—"
    start_date  = formatdate(doc.get("start_date")) if doc.get("start_date") else "—"
    end_date    = formatdate(doc.get("end_date"))   if doc.get("end_date")   else "—"
    total_score = _safe(doc.get("total_score") or "0")
    self_score  = _safe(doc.get("custom_total_self_score") or "")

    status_map   = {0: "Draft", 1: "Approved", 2: "Cancelled"}
    # status_label = status_map.get(doc.docstatus, "Draft")
    status_label = doc.get('custom_appraisal_status') if doc.get("custom_appraisal_status") else "Draft"
    status_bg    = "#D4A017" if status_label == "Draft" else "#28a745"
    status_color = "#000"    if status_label == "Draft" else "#fff"

    logo_src = "/files/galfar-logo.png"

    # ── Performance grid columns ──────────────────────────────────────────
    PG = [
        ("1", "Poor",      "#CE1426", "#fdf2f3", "#f5c2c7",
         "Performance is below expectations; behavior is contrary to company standards."),
        ("2", "Acceptable","#c06000", "#fff8f0", "#fdd9aa",
         "Inconsistent demonstration of this value; requires coaching or behavioral adjustment."),
        ("3", "Good",      "#0369a1", "#f0f7fd", "#bae0f7",
         "Consistently demonstrates this value in day-to-day work; meets the standard."),
        ("4", "Very Good", "#15803d", "#f0fdf5", "#bbf7d0",
         "Frequently goes above and beyond standard requirements regarding this value."),
        ("5", "Excellent", "#b8860b", "#fefce8", "#fde68a",
         "Consistently far exceeds expectations; acts as a role model and champions this value to others."),
    ]

    pg_heads = ""
    pg_descs = ""
    for num, label, color, light, border, desc in PG:
        dots = "".join(
            f'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;margin:0 2px;'
            f'background:{color if j < int(num) else border};"></span>'
            for j in range(5)
        )
        pg_heads += (
            f'<td style="width:20%;background:{light};border-right:1px solid {border};'
            f'border-bottom:4px solid {color};padding:12px 6px 10px;text-align:center;vertical-align:top;">'
            f'<div style="width:32px;height:32px;border-radius:7px;background:{color};'
            f'color:#fff;font-size:13px;font-weight:700;text-align:center;'
            f'line-height:32px;margin:0 auto 6px;">{num}</div>'
            f'<div style="font-size:11px;font-weight:700;color:{color};text-transform:uppercase;'
            f'letter-spacing:.5px;margin-bottom:5px;">{label}</div>'
            f'<div>{dots}</div></td>'
        )
        pg_descs += (
            f'<td style="width:20%;background:{light};border-right:1px solid {border};'
            f'vertical-align:top;padding:0;">'
            f'<div style="height:3px;background:{color};"></div>'
            f'<div style="padding:9px 9px 12px;font-size:10.5px;line-height:1.6;color:#1e293b;">{desc}</div>'
            f'</td>'
        )

    # worker criteria
    worker_html = ""
    if is_worker:
        worker_html = """
        <div style="margin:14px;border:1.5px solid rgba(201,168,76,0.5);border-radius:9px;
                    padding:12px;background:#fff9f0;">
            <div style="font-weight:700;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;
                        color:#CE1426;margin-bottom:10px;">Evaluation Criteria</div>
            <table style="width:100%;border-collapse:collapse;font-size:10px;">
                <tr>
                    <td style="width:50%;vertical-align:top;padding-right:8px;">
                        <div style="background:#fff;border:1px solid rgba(201,168,76,0.5);border-radius:6px;padding:8px 10px;">
                            <div style="font-weight:700;color:#CE1426;margin-bottom:5px;">Productivity %</div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #e5c880;"><span>1 - Poor</span><span>Below 86%</span></div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #e5c880;"><span>2 - Acceptable</span><span>87%–90%</span></div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #e5c880;"><span>3 - Good</span><span>91%–100%</span></div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #e5c880;"><span>4 - Very Good</span><span>101%–120%</span></div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;"><span>5 - Excellent</span><span>Above 120%</span></div>
                        </div>
                    </td>
                    <td style="width:50%;vertical-align:top;padding-left:8px;">
                        <div style="background:#fff;border:1px solid rgba(201,168,76,0.5);border-radius:6px;padding:8px 10px;">
                            <div style="font-weight:700;color:#CE1426;margin-bottom:5px;">Absences</div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #e5c880;"><span>1 - Poor</span><span>7 Days+</span></div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #e5c880;"><span>2 - Acceptable</span><span>5–6 Days</span></div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #e5c880;"><span>3 - Good</span><span>3–4 Days</span></div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px dashed #e5c880;"><span>4 - Very Good</span><span>1–2 Days</span></div>
                            <div style="display:flex;justify-content:space-between;padding:2px 0;"><span>5 - Excellent</span><span>Zero Unauthorized</span></div>
                        </div>
                    </td>
                </tr>
            </table>
        </div>"""

    # ── KRA cards ─────────────────────────────────────────────────────────
    kra_cells = []
    for row in goals:
        if (row.get("custom_unit") or "").strip() != "Common":
            continue
        if row.get("kra") in ["PRODUCTIVITY", "ABSENCES"]:
            continue
        kra_name   = cstr(row.get("kra") or "")
        assr_stars = round(flt(row.get("custom_assessor_score") or 0) * 5)
        self_stars = round(flt(row.get("custom_self_score") or 0) * 5)
        letter, color = _kra_badge(kra_name)
        pill_css   = PILL_STYLES.get(_pill_cls(assr_stars), "")

        self_section = ""
        if not is_worker:
            self_section = (
                f'<div style="font-size:8px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;'
                f'color:#6b7280;margin-top:4px;">Self</div>'
                f'<div style="line-height:1;">{_stars_html(self_stars, "self")}</div>'
            )

        kra_cells.append(
            f'<td style="width:25%;padding:4px;vertical-align:top;">'
            f'<div style="border:1.5px solid rgba(201,168,76,0.5);border-top:3px solid #c9a84c;'
            f'border-radius:10px;padding:10px 7px 8px;'
            f'background:linear-gradient(160deg,#fff 55%,#fff9ee 100%);'
            f'text-align:center;page-break-inside:avoid;">'
            f'<div style="width:36px;height:36px;border-radius:50%;'
            f'color:#fff;font-size:12px;font-weight:700;text-align:center;'
            f'line-height:36px;margin:0 auto 5px;"><img src="{letter}" style="max-height:30px;width:auto;"></div>'
            f'<div style="font-size:9px;font-weight:700;color:#1a1a2e;text-transform:uppercase;'
            f'line-height:1.3;min-height:22px;">{_safe(kra_name)}</div>'
            f'{self_section}'
            f'<div style="font-size:8px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;'
            f'color:#6b7280;margin-top:4px;">Assessor</div>'
            f'<div style="line-height:1;">{_stars_html(assr_stars, "assessor")}</div>'
            f'<div style="margin-top:4px;">'
            f'<span style="display:inline-block;padding:2px 8px;border-radius:20px;'
            f'font-weight:700;font-size:9px;{pill_css}">{assr_stars} / 5</span>'
            f'</div></div></td>'
        )

    kra_section_html = ""
    if kra_cells:
        rows_html = ""
        for i in range(0, len(kra_cells), 4):
            chunk = kra_cells[i:i+4]
            while len(chunk) < 4:
                chunk.append('<td style="width:25%;"></td>')
            rows_html += f"<tr>{''.join(chunk)}</tr>"
        kra_section_html = (
            _section_head("Galfar Values") +
            f'<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">{rows_html}</table>'
        )

    # ── Goals table ───────────────────────────────────────────────────────
    goal_rows_html = ""
    idx = 0
    for row in goals:
        if (row.get("custom_unit") or "").strip() == "Common":
            if row.get("kra") not in ["PRODUCTIVITY", "ABSENCES"]:
                continue
        idx += 1
        kra_name   = _safe(row.get("kra") or "")
        weightage  = flt(row.get("per_weightage") or 0)
        desc       = _safe(row.get("custom_description") or "")
        assr_stars = round(flt(row.get("custom_assessor_score") or 0) * 5)
        self_stars = round(flt(row.get("custom_self_score") or 0) * 5)
        pill_css   = PILL_STYLES.get(_pill_cls(assr_stars), "")
        row_bg     = "#fff9f0" if idx % 2 == 1 else "#ffffff"
        td         = f"padding:8px 10px;border-right:1px solid rgba(201,168,76,.15);background:{row_bg};"

        self_td = ""
        if not is_worker:
            self_td = (
                f'<td style="{td}text-align:center;">'
                f'{_stars_html(self_stars, "self")}'
                f'<div style="font-size:8px;color:#9ca3af;margin-top:1px;">{self_stars} / 5</div>'
                f'</td>'
            )

        goal_rows_html += (
            f'<tr style="page-break-inside:avoid;">'
            f'<td style="{td}text-align:center;width:30px;">{idx}</td>'
            f'<td style="{td}font-weight:600;">{kra_name}</td>'
            f'<td style="{td}font-size:10px;color:#6b7280;">{desc}</td>'
            f'<td style="{td}text-align:center;width:50px;">{int(weightage)}%</td>'
            f'{self_td}'
            f'<td style="{td}text-align:center;">'
            f'{_stars_html(assr_stars, "assessor")}'
            f'<div style="font-size:8px;color:#9ca3af;margin-top:1px;">{assr_stars} / 5</div>'
            f'</td>'
            f'<td style="padding:8px 10px;text-align:center;background:{row_bg};">'
            f'<span style="display:inline-block;padding:2px 8px;border-radius:20px;'
            f'font-weight:700;font-size:9px;{pill_css}">{assr_stars} / 5</span>'
            f'</td></tr>'
        )

    self_th = (
        '<th style="padding:9px 10px;text-align:center;color:rgba(255,255,255,.9);'
        'border-right:1px solid rgba(255,255,255,.12);font-size:8px;font-weight:700;'
        'letter-spacing:1px;text-transform:uppercase;white-space:nowrap;">Self Score</th>'
    ) if not is_worker else ""

    goals_section_html = ""
    if goal_rows_html:
        def _th(txt, align="center", extra=""):
            return (
                f'<th style="padding:9px 10px;text-align:{align};color:rgba(255,255,255,.9);'
                f'border-right:1px solid rgba(255,255,255,.12);font-size:8px;font-weight:700;'
                f'letter-spacing:1px;text-transform:uppercase;white-space:nowrap;{extra}">{txt}</th>'
            )
        goals_section_html = (
            _section_head("Goals") +
            f'<table style="width:100%;border-collapse:collapse;'
            f'border:1.5px solid rgba(201,168,76,0.5);border-radius:10px;overflow:hidden;font-size:11px;">'
            f'<thead><tr style="background:linear-gradient(135deg,#8a0d1a 0%,#CE1426 100%);'
            f'border-bottom:2px solid #c9a84c;">'
            f'{_th("#","center","width:30px;")}'
            f'{_th("Goal (KRA)","left")}'
            f'{_th("Description","left")}'
            f'{_th("Wt %","center","width:50px;")}'
            f'{self_th}'
            f'{_th("Assessor Score","center")}'
            f'{_th("Rating","center","border-right:none;")}'
            f'</tr></thead>'
            f'<tbody>{goal_rows_html}</tbody></table>'
        )

    # ── Score summary ─────────────────────────────────────────────────────
    def _score_card(label, value):
        return (
            f'<td style="width:50%;padding:4px;vertical-align:top;">'
            f'<div style="border:1.5px solid rgba(201,168,76,0.5);border-radius:12px;'
            f'padding:18px 16px;text-align:center;'
            f'background:linear-gradient(160deg,#fff 50%,#fff9ee 100%);'
            f'position:relative;overflow:hidden;">'
            f'<div style="position:absolute;top:0;left:0;right:0;height:4px;'
            f'background:linear-gradient(90deg,#8a0d1a,#CE1426,#c9a84c,#e8c97a,#c9a84c,#8a0d1a);"></div>'
            f'<div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;'
            f'color:#CE1426;margin-bottom:7px;">{label}</div>'
            f'<div style="font-family:Georgia,serif;font-size:28px;color:#1a1a2e;">{value}</div>'
            f'<div style="font-size:9px;color:#9ca3af;margin-top:4px;">out of 5.00</div>'
            f'</div></td>'
        )

    score_cells = ""
    if self_score and not is_worker:
        score_cells += _score_card("Overall Effectiveness – Self Assessment", self_score)
    score_cells += _score_card("Overall Effectiveness – Assessor Assessment", total_score)

    # pad to 2 cols if only 1 card
    if not (self_score and not is_worker):
        score_cells = (
            f'<td style="width:50%;padding:4px;vertical-align:top;">'
            + _score_card("Overall Effectiveness – Assessor Assessment", total_score).split("</td>")[0]
            + "</td><td></td>"
        )

    score_summary_html = (
        _section_head("Score Summary") +
        f'<table style="width:100%;border-collapse:collapse;max-width:600px;">'
        f'<tr>{score_cells}</tr></table>'
    )

    # ── Full HTML ─────────────────────────────────────────────────────────
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  @page {{ size: A4; margin: 8mm; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #1a1a2e;
    background: #faf8f4;
  }}
  .gold-frame {{
    border: 5px solid #c9a84c;
    border-radius: 14px;
    overflow: hidden;
    background: #faf8f4;
  }}
  .inner {{
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
  }}
</style>
</head>
<body>
<div class="gold-frame">
<div class="inner">

<!-- ═══ HEADER ═══ -->
<div style="background:#CE1426;padding:22px 28px 18px;border-bottom:3px solid #c9a84c;position:relative;">
    <table style="width:100%;border-collapse:collapse;">
        <tr>
            <td style="width:88px;vertical-align:middle;padding-right:18px;">
                <div style="width:88px;height:88px;border-radius:50%;overflow:hidden;
                            border:3px solid #c9a84c;background:#8a0d1a;
                            text-align:center;display:table-cell;vertical-align:middle;">
                    {emp_img_html}
                </div>
            </td>
            <td style="vertical-align:top;padding-top:4px;">
                <div style="font-family:Georgia,serif;font-size:22px;color:#fff;
                            margin-bottom:3px;line-height:1.2;">{_safe(doc.employee_name)}</div>
                <div style="font-size:11px;color:rgba(255,255,255,.7);margin-bottom:8px;">
                    {_safe(doc.get("designation") or "")}
                    {"&nbsp;&middot;&nbsp;" + _safe(division) if division else ""}
                </div>
                <span style="background:rgba(201,168,76,.2);color:#e8c97a;
                             border:1px solid rgba(201,168,76,.4);
                             padding:2px 9px;border-radius:20px;font-size:9px;font-weight:600;margin-right:5px;">
                    {_safe(doc.company)}
                </span>
                <span style="background:rgba(255,255,255,.12);color:rgba(255,255,255,.8);
                             border:1px solid rgba(255,255,255,.2);
                             padding:2px 9px;border-radius:20px;font-size:9px;font-weight:600;margin-right:5px;">
                    Cycle: {_safe(doc.appraisal_cycle or "")}
                </span>
                <span style="background:rgba(255,255,255,.12);color:rgba(255,255,255,.8);
                             border:1px solid rgba(255,255,255,.2);
                             padding:2px 9px;border-radius:20px;font-size:9px;font-weight:600;">
                    Grade: {_safe(doc.get("custom_grade") or "")}
                </span>
            </td>
            <td style="width:160px;text-align:right;vertical-align:top;">
                <div style="font-size:10px;font-weight:700;color:#e8c97a;letter-spacing:.8px;margin-bottom:5px;">
                    &#x1F4C4; {_safe(doc.name)}
                </div>
                <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:9px;
                             font-weight:700;background:{status_bg};color:{status_color};
                             border:1px solid rgba(0,0,0,.3);">
                    &#x25CF; {status_label}
                </span>
                <div style="margin-top:8px;">
                    <img src="{logo_src}" style="max-height:46px;width:auto;">
                </div>
            </td>
        </tr>
    </table>
</div>
<!-- stripe -->
<div style="height:5px;background:linear-gradient(90deg,#8a0d1a 0%,#CE1426 25%,#c9a84c 55%,#e8c97a 75%,#c9a84c 90%,#8a0d1a 100%);"></div>

<!-- ═══ BODY ═══ -->
<div style="padding:22px 28px 28px;background:#fff;">

    <!-- Employee Details -->
    {_section_head("Employee Details")}
    <table style="width:100%;border-collapse:collapse;border:1.5px solid rgba(201,168,76,0.5);
                  border-radius:8px;overflow:hidden;margin-bottom:4px;">
        <tr>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff9f0;width:25%;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">GEC No</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.get("custom_gec_no") or "")}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff9f0;width:25%;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Employee Name</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.employee_name)}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff9f0;width:25%;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Company</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.company)}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);background:#fff9f0;width:25%;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Grade</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.get("custom_grade") or "")}</div>
            </td>
        </tr>
        <tr>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Project</div>
                <div style="font-size:12px;font-weight:500;">{_safe(division)}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Designation</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.get("designation") or "")}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Unit</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.get("custom_unit") or "")}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);background:#fff;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Assessment Date</div>
                <div style="font-size:12px;font-weight:500;">{formatdate(doc.get("creation") or "")}</div>
            </td>
        </tr>
        <tr>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff9f0;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Date of Joining</div>
                <div style="font-size:12px;font-weight:500;">{doj}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff9f0;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Qualification</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.get("custom_qualification") or "")}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);border-right:1px solid rgba(201,168,76,.2);background:#fff9f0;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Certifications</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.get("custom_certifications") or "")}</div>
            </td>
            <td style="padding:9px 13px;border-bottom:1px solid rgba(201,168,76,.2);background:#fff9f0;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Experience</div>
                <div style="font-size:12px;font-weight:500;">{exp_str}</div>
            </td>
        </tr>
        <tr>
            <td style="padding:9px 13px;border-right:1px solid rgba(201,168,76,.2);background:#fff;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Appraisal Cycle</div>
                <div style="font-size:12px;font-weight:500;">{_safe(doc.get("appraisal_cycle") or "—")}</div>
            </td>
            <td style="padding:9px 13px;border-right:1px solid rgba(201,168,76,.2);background:#fff;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Period</div>
                <div style="font-size:12px;font-weight:500;">{start_date} &rarr; {end_date}</div>
            </td>
            <td style="padding:9px 13px;border-right:1px solid rgba(201,168,76,.2);background:#fff;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:3px;">Total Score</div>
                <div style="font-family:Georgia,serif;font-size:20px;color:#8B6508;font-weight:700;">{total_score}</div>
            </td>
            <td style="padding:9px 13px;background:#fff;vertical-align:top;">
                <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#8B6508;margin-bottom:5px;">Assessor</div>
                <table style="border-collapse:collapse;">
                    <tr>
                        <td style="width:32px;padding-right:7px;vertical-align:middle;">
                            <div style="width:32px;height:32px;border-radius:50%;background:#8a0d1a;
                                        border:2px solid #c9a84c;overflow:hidden;
                                        text-align:center;display:table-cell;vertical-align:middle;">
                                {ass_img_html}
                            </div>
                        </td>
                        <td style="vertical-align:middle;">
                            <div style="font-size:11px;font-weight:600;">{reviewer_name}</div>
                            <div style="font-size:9px;color:#9ca3af;">{reviewer_desg}</div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>


    <!-- Performance Grid -->
    {_section_head("Performance Grid")}
    <div style="border:1.5px solid rgba(201,168,76,0.5);border-radius:10px;overflow:hidden;margin-bottom:4px;">
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
            <tr>
                <td colspan="5" style="background:#CE1426;color:#fff;
                                       font-family:Georgia,serif;font-size:12px;font-weight:700;
                                       letter-spacing:3px;text-transform:uppercase;text-align:center;
                                       padding:11px 14px;border-bottom:2px solid #c9a84c;">
                    PERFORMANCE RATING GRID
                </td>
            </tr>
            <tr>{pg_heads}</tr>
            <tr>{pg_descs}</tr>
        </table>
        {worker_html}
        <!-- OE bar -->
        <table style="width:100%;border-collapse:collapse;background:#CE1426;border-top:2px solid #c9a84c;">
            <tr>
                <td style="padding:11px 18px;font-family:Georgia,serif;font-size:12px;font-weight:700;
                           letter-spacing:2px;text-transform:uppercase;color:#e8c97a;">
                    OVERALL EFFECTIVENESS
                </td>
                <td style="padding:11px 18px;text-align:right;font-family:Georgia,serif;font-size:24px;
                           font-weight:700;color:#e8c97a;border-left:1px solid rgba(201,168,76,.3);
                           width:120px;background:rgba(201,168,76,.1);">
                    {total_score}
                </td>
            </tr>
        </table>
    </div>

    <!-- KRA Cards (Galfar Values) -->
    {kra_section_html}

    <!-- Goals Table -->
    {goals_section_html}

    <!-- Score Summary -->
    {score_summary_html}

</div>

<!-- ═══ FOOTER ═══ -->
<table style="width:100%;border-collapse:collapse;border-top:2px solid rgba(201,168,76,0.5);
              background:linear-gradient(90deg,#fff9f0,#fff6e8,#fff9f0);padding:10px 28px;">
    <tr>
        <td style="padding:10px 28px;font-size:10px;color:#6b7280;vertical-align:middle;">
            If anyone scores 1 &amp; 2 in Safety it will not be considered as 4 &amp; 5 in Overall Effectiveness rating.
        </td>
        <td style="padding:10px 28px;text-align:right;vertical-align:middle;width:120px;">
            <span style="font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
                         color:#8B6508;background:linear-gradient(135deg,#FBF0C0,#fff8d0);
                         border:1px solid rgba(201,168,76,0.5);padding:3px 10px;border-radius:20px;">
                Note
            </span>
        </td>
    </tr>
</table>

</div><!-- inner -->
</div><!-- gold-frame -->
</body>
</html>"""

    # ── Generate & stream ─────────────────────────────────────────────────
    pdf_bytes = get_pdf(html, {"page-size": "A4", "margin-top": "8mm", "margin-right": "8mm",
                                "margin-bottom": "8mm", "margin-left": "8mm", "encoding": "UTF-8"})

    emp_name = (doc.employee_name or appraisal_name).replace(" ", "_")
    frappe.local.response.filename    = f"Appraisal_{emp_name}_{appraisal_name}.pdf"
    frappe.local.response.filecontent = pdf_bytes
    frappe.local.response.type        = "pdf"


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
        


import frappe
from frappe.utils import flt, getdate


@frappe.whitelist()
def appraisal_rating_update(doc, method=None):
    if not doc.has_value_changed("workflow_state"):
        return

    employee = frappe.get_doc("Employee", doc.employee)

    year = getdate(doc.end_date).year if doc.end_date else ""

    score = flt(doc.total_score or 0)

    # Staff Rating Logic
    if doc.custom_employment_type == "Staff":

        if 0 <= score <= 1:
            grade = "E"
        elif 1 < score <= 2:
            grade = "D"
        elif 2 < score <= 3:
            grade = "C"
        elif 3 < score <= 4:
            grade = "B"
        elif 4 < score <= 5:
            grade = "A"
        else:
            grade = ""

    # Worker Rating Logic
    elif doc.custom_employment_type == "Worker":

        # Example:
        # 0 - 2   -> C
        # 2 - 4   -> B
        # 4 - 5   -> A

        if 0 <= score <= 2:
            grade = "C"
        elif 2 < score <= 4:
            grade = "B"
        elif 4 < score <= 5:
            grade = "A"
        else:
            grade = ""

    else:
        grade = ""

    if doc.workflow_state == "Approved":

        exists = False

        for row in employee.custom_previous_rating:
            if row.appraisal == doc.name:
                exists = True
                row.rating = grade
                row.year = year

        if not exists:
            employee.append("custom_previous_rating", {
                "appraisal": doc.name,
                "rating": grade,
                "year": year
            })

        employee.save(ignore_permissions=True)
        
    elif doc.workflow_state == "Cancelled":

        employee.custom_previous_rating = [
            row for row in employee.custom_previous_rating
            if row.appraisal != doc.name
        ]

        employee.save(ignore_permissions=True)



# @frappe.whitelist()
# def appraisal_html_template_employee_overview_arabic(appraisal_name):
#     doc = frappe.get_doc("Appraisal", appraisal_name)

#     def initials(name):
#         parts = (name or "?").split()
#         return (parts[0][0] + (parts[1][0] if len(parts) > 1 else parts[0][1])).upper()

#     def score_class(score, max_score=5):
#         if flt(score) >= flt(max_score) * 0.8: return "score-high"
#         if flt(score) >= flt(max_score) * 0.5: return "score-mid"
#         return "score-low"

#     # ── Role / stage flags ─────────────────────────────────────────────────
#     is_worker        = translate_the_value((doc.get("custom_grade") or "") in ["A1","A2","A3","A4"])
#     is_draft         = doc.workflow_state == "Draft"
#     current_user     = frappe.session.user

#     assessor_employee = doc.get("custom_assessor") or ""
#     is_assessor       = "Appraisal Assessor" in frappe.get_roles(frappe.session.user)
#     is_appraisal_user = "Appraisal User"     in frappe.get_roles(frappe.session.user)

#     self_editable     = is_draft and is_appraisal_user and not is_worker and not is_assessor
#     assessor_editable = is_assessor and doc.workflow_state =="Pending for Assessor"
#     if is_worker and is_draft:
#         assessor_editable = is_assessor

#     # ── Employee photo ─────────────────────────────────────────────────────
#     emp_image  = doc.get("image") or frappe.db.get_value("Employee", doc.employee, "image")
#     image_html = (f'<img src="{emp_image}" alt="{safe(doc.employee_name)}">'
#                   if emp_image else f'<div class="emp-avatar-initials">{initials(doc.employee_name)}</div>')
#     logo_image_html = (f'<img src="/files/galfar-logo.png" alt="Logo">')

#     # ── Badges ─────────────────────────────────────────────────────────────
#     badges = ""
#     if doc.company:             badges += f'<span class="badge badge-gold">🏢 {safe(doc.company)}</span>'
#     if doc.appraisal_cycle:     badges += f'<span class="badge badge-white">Cycle: {safe(doc.appraisal_cycle)}</span>'
#     if doc.get("custom_grade"): badges += f'<span class="badge badge-white">Grade: {safe(doc.custom_grade)}</span>'

#     # ── KRA List for dropdown ──────────────────────────────────────────────
#     kra_list         = frappe.get_all("KRA", filters={"custom_unit": doc.get("custom_unit")}, fields=["name"], order_by="name asc")
#     kra_options_json = json.dumps([k["name"] for k in kra_list]).replace('</script>','<\\/script>')

#     # ── Row map ────────────────────────────────────────────────────────────
#     goals = doc.get("goals") or []
#     row_map = {}
#     for tbl_idx, row in enumerate(goals):
#         assessor_raw   = flt(row.get("custom_assessor_score") or 0)
#         self_raw       = flt(row.get("custom_self_score") or 0)
#         weightage      = flt(row.get("per_weightage") or 0)
#         assessor_stars = round(assessor_raw * 5)
#         self_stars_val = round(self_raw * 5)
#         goal_score_val = round(assessor_stars * weightage / 100, 2)
#         row_map[tbl_idx] = {
#             "name":           cstr(row.name),
#             "cdt":            "Appraisal Goal",
#             "weightage":      weightage,
#             "assessor_stars": assessor_stars,
#             "self_stars":     self_stars_val,
#             "goal_score":     goal_score_val,
#             "total_score":    goal_score_val,
#             "kra":            cstr(row.get("kra") or ""),
#             "per_weightage":  weightage,
#         }
#     row_map_json = json.dumps(row_map).replace('</script>','<\\/script>')

#     # ── KRA Cards ──────────────────────────────────────────────────────────
#     cards = ""; card_idx = 0
#     for tbl_idx, row in enumerate(goals):
#         if (row.get("custom_unit") or "").strip() != "Common": continue
#         if row.get("kra") in ["PRODUCTIVITY","ABSENCES"]: continue
#         kra_name           = cstr(row.get("kra") or "")
#         custom_description = cstr(row.get("custom_description") or "")
#         weightage          = flt(row.get("per_weightage") or 0)
#         self_stars         = round(flt(row.get("custom_self_score") or 0) * 5)
#         assessor_stars     = round(flt(row.get("custom_assessor_score") or 0) * 5)
#         goal_score_val     = round(assessor_stars * weightage / 100, 2)
#         icon               = _kra_icon(kra_name)
#         pill_cls           = score_class(assessor_stars)
#         desc_safe          = safe(custom_description)

#         self_section_html = ""
#         if not is_worker:
#             self_cursor = "pointer" if self_editable else "default"
#             self_html = "".join(
#                 f'<span class="kra-star {"checked" if s <= self_stars else ""}" '
#                 f'data-tbl="{tbl_idx}" data-val="{s}" data-type="self" '
#                 + (f'onclick="selfStarClick(this)"' if self_editable else '') +
#                 f' style="cursor:{self_cursor}">{"★" if s <= self_stars else "☆"}</span>'
#                 for s in range(1, 6))
#             self_section_html = f'''
#             <div class="kra-row-label">Self</div>
#             <div class="star-row self-stars" id="card-self-{card_idx}">{self_html}</div>'''

#         assessor_cursor = "pointer" if assessor_editable else "default"
#         assessor_html = "".join(
#             f'<span class="kra-star {"checked" if s <= assessor_stars else ""}" '
#             f'data-tbl="{tbl_idx}" data-val="{s}" '
#             + (f'onclick="starClick(this)"' if assessor_editable else '') +
#             f' style="cursor:{assessor_cursor}">{"★" if s <= assessor_stars else "☆"}</span>'
#             for s in range(1, 6))

#         cards += f"""
#         <div class="kra-card" id="kra-card-{card_idx}" data-tbl="{tbl_idx}" data-desc="{desc_safe}"
#              onmouseenter="showKraTooltip(this)" onmouseleave="hideKraTooltip()">
#             <div class="kra-card-icon">{icon}</div>
#             <div class="kra-card-title">{safe(kra_name)}</div>
#             {self_section_html}
#             <div class="kra-row-label" style="margin-top:6px;">Assessor</div>
#             <div class="star-row assessor-stars" id="card-assessor-{card_idx}">{assessor_html}</div>
#             <div class="kra-card-score-wrap">
#                 <span class="score-pill {pill_cls}" id="card-pill-{card_idx}">{assessor_stars} / 5</span>
#             </div>
#         </div>"""
#         card_idx += 1

#     kra_cards_html = f"""
#     <div class="collapsible-section" style="text-align:center;">
#         <div class="section collapsible-header" onclick="toggleSection(this)">
#             <span style='font-size:15px;'>Galfar Values</span><span class="coll-icon">▼</span>
#         </div>
#         <div class="collapsible-body" style="text-align:center;">
#             <div class="kra-cards-grid" style="text-align:center;">{cards}</div>
#             <div id="kra-tooltip-panel" class="kra-tooltip-panel" style="display:none;text-align:center;"></div>
#         </div>
#     </div>""" if cards else ""

#     # ── Goals Table ────────────────────────────────────────────────────────
#     goal_rows = ""; index = 0
#     for tbl_idx, row in enumerate(goals):
#         if (row.get("custom_unit") or "").strip() == "Common":
#             if row.get("kra") not in ["PRODUCTIVITY","ABSENCES"]: continue
#         index += 1
#         kra_name           = cstr(row.get("kra") or "")
#         weightage          = flt(row.get("per_weightage") or 0)
#         custom_description = cstr(row.get("custom_description") or "")
#         self_stars         = round(flt(row.get("custom_self_score") or 0) * 5)
#         assessor_stars     = round(flt(row.get("custom_assessor_score") or 0) * 5)
#         goal_score_val     = round(assessor_stars * weightage / 100, 2)
#         pill_cls           = score_class(assessor_stars)
#         kra_name_safe      = safe(kra_name) if row.get("custom_is_new_goal") else ""
    
#         kra_td = f"""
#             <td class="col-goal">
#             <div class="edit-cell">
#                 <input class="kra-input" type="text"
#                     data-tbl="{tbl_idx}" data-field="kra"
#                     value="{kra_name_safe}" placeholder="Add KRA..."
#                     autocomplete="off"
#                     oninput="filterKraDropdown(this)"
#                     onfocus="showKraDropdown(this)"
#                     onblur="hideKraDropdownDelayed(this)"
#                     {f'readonly' if not self_editable else ''}
#                 />
#             </div>
#         </td>"""

#         wt_td = f'<td class="col-weight" style="text-align:center;">{weightage}%</td>'

#         if not is_worker:
#             self_cursor = "pointer" if self_editable else "default"
#             self_stars_html = "".join(
#                 f'<span class="kra-star {"checked" if s <= self_stars else ""}" '
#                 f'data-tbl="{tbl_idx}" data-val="{s}" data-type="self" '
#                 + (f'onclick="selfStarClick(this)"' if self_editable else '') +
#                 f' style="cursor:{self_cursor}">{"★" if s <= self_stars else "☆"}</span>'
#                 for s in range(1, 6))
#             self_td = f"""
#             <td class="col-stars" style="text-align:center;">
#                 <div class="star-row self-stars center-stars" id="tbl-self-{tbl_idx}">{self_stars_html}</div>
#                 <div class="score-sub"><span id="tbl-self-score-{tbl_idx}">{self_stars}</span> / 5</div>
#             </td>"""
#         else:
#             self_td = ""

#         assessor_cursor = "pointer" if assessor_editable else "default"
#         assessor_html = "".join(
#             f'<span class="kra-star {"checked" if s <= assessor_stars else ""}" '
#             f'data-tbl="{tbl_idx}" data-val="{s}" '
#             + (f'onclick="starClick(this)"' if assessor_editable else '') +
#             f' style="cursor:{assessor_cursor}">{"★" if s <= assessor_stars else "☆"}</span>'
#             for s in range(1, 6))

#         goal_rows += f"""
#         <tr id="goal-row-{tbl_idx}" data-tbl="{tbl_idx}" data-rowname="{safe(row.name)}">
#             <td class="col-no">{index}</td>
#             {kra_td}
#             <td class="col-desc">
#                 <div class="desc-cell" id="desc-cell-{tbl_idx}" title="{safe(custom_description)}">{safe(custom_description)}</div>
#             </td>
#             {wt_td}
#             {self_td}
#             <td class="col-stars" style="text-align:center;">
#                 <div class="star-row assessor-stars center-stars" id="tbl-assessor-{tbl_idx}">{assessor_html}</div>
#                 <div class="score-sub"><span id="tbl-score-{tbl_idx}">{assessor_stars}</span> / 5</div>
#             </td>
#             <td class="col-pill" style="text-align:center;">
#                 <span class="score-pill {pill_cls}" id="tbl-pill-{tbl_idx}">{assessor_stars} / 5</span>
#             </td>
#         </tr>"""

#     self_score_th = '' if is_worker else '<th class="col-stars">Self Score</th>'
#     col_self_col  = '' if is_worker else '<col class="col-stars">'

#     goals_section = f"""
#     <div class="collapsible-section">
#         <div class="section collapsible-header" onclick="toggleSection(this)">
#             <span style='font-size:15px;'>Goals</span><span class="coll-icon">▼</span>
#         </div>
#         <div class="collapsible-body">
#             <div class="table-scroll">
#             <table class="child-table goals-table" id="goals-table">
#                 <colgroup>
#                     <col class="col-no"><col class="col-goal"><col class="col-desc">
#                     <col class="col-weight">{col_self_col}<col class="col-stars"><col class="col-pill">
#                 </colgroup>
#                 <thead><tr>
#                     <th class="col-no">No.</th>
#                     <th class="col-goal">Goal</th>
#                     <th class="col-desc">Description</th>
#                     <th class="col-weight">Wt %</th>
#                     {self_score_th}
#                     <th class="col-stars">Assessor Score</th>
#                     <th class="col-pill">Rating</th>
#                 </tr></thead>
#                 <tbody id="goals-tbody">{goal_rows}</tbody>
#             </table></div>
#             <div id="goals-save-status" style="margin-top:6px;font-size:12px;color:var(--green);display:none;">✓ Saved</div>
#         </div>
#     </div>""" if goal_rows else ""

#     # ── Score summary ──────────────────────────────────────────────────────
#     total_goal_score_str = doc.get("total_score") or 0 if doc.get("workflow_state") == "Draft" else doc.get("total_score")
#     self_score_str       = doc.get("custom_total_self_score" or 0)

#     # ── Assessor ───────────────────────────────────────────────────────────
#     reviewer_name  = doc.get("custom_assessor_name") or ""
#     reviewer_id    = frappe.db.get_value("Employee",doc.get("custom_assessor"),"designation") or ""
#     assessor_image = None
#     if doc.get("custom_assessor"):
#         assessor_image = frappe.db.get_value("Employee", doc.custom_assessor, "image")

#     # ── Dates / misc ───────────────────────────────────────────────────────
#     start_date = formatdate(doc.get("start_date"))             if doc.get("start_date")             else ""
#     end_date   = formatdate(doc.get("end_date"))               if doc.get("end_date")               else ""
#     doj        = formatdate(doc.get("custom_date_of_joining")) if doc.get("custom_date_of_joining") else ""
#     pre_exp    = doc.get("custom_previous_work_experience")
#     exp_str    = (f"Pre-Galfar: {safe_js(str(pre_exp))} Yrs &nbsp;|&nbsp; " if pre_exp else "") + safe(doc.get("custom_experience") or "")

#     pre_exp = flt(doc.get("custom_previous_work_experience"))
#     galfar_exp = flt(doc.get("custom_internal_work_experience"))

#     exp_str = f"Pre-Galfar: {int(pre_exp)} Years, Galfar : {galfar_exp:.2f} Years"
#     status_map   = {0: "Draft", 1: "Approved", 2: "Cancelled"}
#     # status_label = status_map.get(doc.docstatus, "Draft")
#     status_label = doc.get('custom_appraisal_status') if doc.get("custom_appraisal_status") else "Draft"
#     # status_label = doc.get(doc.custom_appraisal_status,'')
    
#     if doc.get("workflow_state") in ["Draft","Pending for Assessor"]:
#         status_class = "draft"
#     elif doc.get("workflow_state") in ["Approved","Accepted"]:
#         status_class = "approved"
#     else:
#         status_class = "draft"
    

#     # ── Performance Grid ───────────────────────────────────────────────────
#     PG_COLS = [
#         {"num":"1","label":"Poor",
#          "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#CE1426" opacity=".15" stroke="#CE1426" stroke-width="1.5"/><line x1="6" y1="6" x2="14" y2="14" stroke="#CE1426" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="6" x2="6" y2="14" stroke="#CE1426" stroke-width="2" stroke-linecap="round"/></svg>',
#          "color":"#CE1426","light":"#fdf2f3","border":"#f5c2c7","text":"#8a0d1a",
#          "bar":"linear-gradient(90deg,#CE1426,#e84a5a)"},
#         {"num":"2","label":"Acceptable",
#          "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#c06000" opacity=".13" stroke="#c06000" stroke-width="1.5"/><line x1="6" y1="10" x2="14" y2="10" stroke="#c06000" stroke-width="2.2" stroke-linecap="round"/></svg>',
#          "color":"#c06000","light":"#fff8f0","border":"#fdd9aa","text":"#7a3d00",
#          "bar":"linear-gradient(90deg,#c06000,#e07820)"},
#         {"num":"3","label":"Good",
#          "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#0369a1" opacity=".12" stroke="#0369a1" stroke-width="1.5"/><polyline points="5.5,10.5 8.5,13.5 14.5,7" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
#          "color":"#0369a1","light":"#f0f7fd","border":"#bae0f7","text":"#024e7a",
#          "bar":"linear-gradient(90deg,#0369a1,#0ea5e9)"},
#         {"num":"4","label":"Very Good",
#          "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#15803d" opacity=".12" stroke="#15803d" stroke-width="1.5"/><polyline points="5,10 8.5,13.5 15,7" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8,10 11.5,13.5 18,7" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/></svg>',
#          "color":"#15803d","light":"#f0fdf5","border":"#bbf7d0","text":"#0d5c2b",
#          "bar":"linear-gradient(90deg,#15803d,#22c55e)"},
#         {"num":"5","label":"Excellent",
#          "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><polygon points="10,2 12.5,7.5 18.5,8 14,12.5 15.5,18.5 10,15.5 4.5,18.5 6,12.5 1.5,8 7.5,7.5" fill="#b8860b" opacity=".2" stroke="#b8860b" stroke-width="1.2" stroke-linejoin="round"/></svg>',
#          "color":"#b8860b","light":"#fefce8","border":"#fde68a","text":"#78530a",
#          "bar":"linear-gradient(90deg,#b8860b,#d4a017)"},
#     ]
#     PG_DESCS = [
#         "Performance is below expectations; behavior is contrary to company standards.",
#         "Inconsistent demonstration of this value; requires coaching or behavioral adjustment.",
#         "Consistently demonstrates this value in day-to-day work; meets the standard.",
#         "Frequently goes above and beyond standard requirements regarding this value.",
#         "Consistently far exceeds expectations; acts as a role model and champions this value to others.",
#     ]
#     pg_headers = ""; pg_cells = ""
#     for i, col in enumerate(PG_COLS):
#         dots = "".join(
#             f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;background:{"" + col["color"] if j <= i else col["border"]};opacity:{"1" if j <= i else "0.5"};"></span>'
#             for j in range(5))
#         pg_headers += f"""
#         <th class="pg-col-head" style="background:{col['light']};border-right:1px solid {col['border']};border-bottom:4px solid {col['color']};">
#             <div style="width:46px;height:46px;border-radius:12px;background:{col['light']};border:1.5px solid {col['border']};display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 2px 8px {col['color']}22;">
#                 {col['icon_svg']}
#             </div>
#             <span class="pg-num-badge" style="background:{col['color']};box-shadow:0 2px 6px {col['color']}44;">{col['num']}</span>
#             <span class="pg-col-label" style="color:{col['text']};font-size:12px;font-weight:700;">{col['label']}</span>
#             <div style="margin-top:8px;line-height:1;">{dots}</div>
#         </th>"""
#         pg_cells += f"""
#         <td class="pg-desc-cell" style="background:{col['light']};border-right:1px solid {col['border']};">
#             <div style="height:4px;background:{col['bar']};opacity:.85;"></div>
#             <p class="pg-desc-text" style="color:#1e293b;">{PG_DESCS[i]}</p>
#         </td>"""
#     pr_headers = ""; pr_cells = ""
#     custom_previous_rating = frappe.db.sql("""
#         SELECT 
#             child.year, 
#             child.rating
#         FROM 
#             `tabPrevious Rating` child
#         INNER JOIN 
#             `tabEmployee` emp ON child.parent = emp.name
#         WHERE 
#             emp.custom_gec_no = %s
#         ORDER BY child.year
#     """, (doc.custom_gec_no,), as_dict=True)

#     previous_rating_html = ""

#     # Split into chunks of 4
#     for idx in range(0, len(custom_previous_rating), 4):
#         chunk = custom_previous_rating[idx:idx + 4]

#         pr_cells = ""

#         for i in chunk:
#             pr_cells += f'''
#                 <td>
#                     <div class="lbl">Rating {i.year}</div>
#                     <div class="val">{i.rating}</div>
#                 </td>
#             '''

#         # Fill empty columns if less than 4
#         remaining = 4 - len(chunk)

#         for _ in range(remaining):
#             pr_cells += '<td class="pg-desc-cell"></td>'

#         previous_rating_html += f"""
#             <tr>
#                 {pr_cells}
#             </tr>
#         """
#     # custom_previous_rating = frappe.db.sql("""
#     # 	SELECT 
#     # 		child.year, 
#     # 		child.rating
#     # 	FROM 
#     # 		`tabPrevious Rating` child
#     # 	INNER JOIN 
#     # 		`tabEmployee` emp ON child.parent = emp.name
#     # 	WHERE 
#     # 		emp.custom_gec_no = %s
#     # """, (doc.custom_gec_no,), as_dict=True)
    
#     # for i in custom_previous_rating:
#     # 	pr_headers += f'<th class="pg-main-title">{i.year}</th>'
#     # 	pr_cells += f'<td class="pg-desc-cell"><div class="lbl">Rating {i.year}</div><div class="val">{i.rating}</div></td>'
        
#     # previous_rating_html = f"""
#     # 		<tr>{pr_headers}</tr>
#     # 		<tr>{pr_cells}</tr>"""

    
    
#     perf_grid_html = f"""
#     <div class="pg-wrap">
#         <table class="pg-table">
#             <thead>
#                 <tr><th colspan="5" class="pg-main-title">PERFORMANCE RATING GRID</th></tr>
#                 <tr>{pg_headers}</tr>
#             </thead>
#             <tbody><tr>{pg_cells}</tr></tbody>
#         </table>"""
    
#     if is_worker:
#         perf_grid_html += f"""
#     <div class="worker-criteria">
#         <div class="wc-title">⚙️ Evaluation Criteria</div>
#         <div class="wc-grid">
#             <div class="wc-card">
#                 <div class="wc-card-title">📈 Productivity %</div>
#                 <div class="wc-row"><span>1 - Poor</span><span>Below 86%</span></div>
#                 <div class="wc-row"><span>2 - Acceptable</span><span>87% – 90%</span></div>
#                 <div class="wc-row"><span>3 - Good</span><span>91% – 100%</span></div>
#                 <div class="wc-row"><span>4 - Very Good</span><span>101% – 120%</span></div>
#                 <div class="wc-row"><span>5 - Excellent</span><span>Above 120%</span></div>
#             </div>
#             <div class="wc-card">
#                 <div class="wc-card-title">📅 Absences</div>
#                 <div class="wc-row"><span>1 - Poor</span><span>7 Days +</span></div>
#                 <div class="wc-row"><span>2 - Acceptable</span><span>5 – 6 Days</span></div>
#                 <div class="wc-row"><span>3 - Good</span><span>3 – 4 Days</span></div>
#                 <div class="wc-row"><span>4 - Very Good</span><span>1 – 2 Days</span></div>
#                 <div class="wc-row"><span>5 - Excellent</span><span>Zero Unauthorized</span></div>
#             </div>
#         </div>
#     </div>"""

#     perf_grid_html += f"""
#         <div class="pg-oe-bar">
#             <span class="pg-oe-label" style='font-size:20px;'>OVERALL EFFECTIVENESS</span>
#             <span class="pg-oe-val" style='font-size:20px;' id="pg-oe-score">{total_goal_score_str or "0"}</span>
#         </div>
#     </div>"""
#     score_cards_html = f"""<div class="score-cards score-cards-single"><div class="score-cards">"""
#     if doc.get("workflow_state") != "Draft" and not is_worker:
#         score_cards_html +=f"""
#         <div class="score-card">
#             <div class="sc-label">OVERALL EFFECTIVENESS - SELF ASSESSMENT</div>
#             <div class="sc-val">{self_score_str}</div>
#             <div class="sc-sub">out of 5.00</div>
#         </div>"""

#     # ── Score Summary Cards ────────────────────────────────────────────────
#     score_cards_html += f"""
#         <div class="score-card">
#             <div class="sc-label">OVERALL EFFECTIVENESS - ASSESSOR ASSESSMENT</div>
#             <div class="sc-val" id="summary-total-goal">{total_goal_score_str}</div>
#             <div class="sc-sub">out of 5.00</div>
#         </div>
#     </div></div>"""

#     grade_js = safe_js(doc.get("custom_grade") or "")

#     html = f"""<!DOCTYPE html>
# <html lang="en">
# <head>
#     <meta charset="UTF-8"/>
#     <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
#     <title>Appraisal – {safe(doc.employee_name)}</title>
#     <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet"/>
#     <style>
#         :root {{
#             --red:         #CE1426;
#             --red-dark:    #8a0d1a;
#             --red-mid:     #a81020;
#             --red-deep:    #5e0911;
#             --red-light:   #fdf0f2;
#             --red-border:  #f5c2ca;
#             --gold:        #c9a84c;
#             --gold-lt:     #e8c97a;
#             --gold-deep:   #8B6508;
#             --gold-bright: #D4A017;
#             --gold-pale:   #FBF0C0;
#             --gold-dim:    rgba(201,168,76,0.15);
#             --gold-glow:   rgba(201,168,76,0.40);
#             --gold-border: rgba(201,168,76,0.50);
#             --cream:       #faf8f4;
#             --white:       #ffffff;
#             --border:      #edd8b0;
#             --text:        #1a1a2e;
#             --label:       #6b7280;
#             --muted:       #9ca3af;
#             --odd-row:     #fff9f0;
#             --even-row:    #ffffff;
#             --green:       #2d7a4f;
#             --amber:       #b45309;
#             --self-blue:   #3b82f6;
#             --shadow-sm:   0 1px 4px rgba(200,16,46,.08);
#             --shadow-md:   0 4px 20px rgba(200,16,46,.12);
#             --shadow-lg:   0 24px 64px rgba(200,16,46,.15);
#             --shadow-gold: 0 4px 24px rgba(201,168,76,.30);
#         }}
#         *{{ box-sizing:border-box; margin:0; padding:0; }}
#         body{{ font-family:'DM Sans',sans-serif; background:var(--cream); padding:40px 20px; color:var(--text); }}

#         .gold-frame {{
#             padding:5px; border-radius:26px;
#             background: conic-gradient(from 0deg,#5c3d08 0deg,#c9a84c 40deg,#f5d97a 80deg,#e8c97a 110deg,#c9a84c 150deg,#8B6508 190deg,#D4A017 230deg,#f5d97a 260deg,#c9a84c 300deg,#8B6508 330deg,#5c3d08 360deg);
#             box-shadow:0 0 0 1px rgba(201,168,76,.7),0 0 24px rgba(201,168,76,.45),0 0 60px rgba(201,168,76,.18),0 12px 48px rgba(200,16,46,.20);
#             animation: frame-pulse 5s ease-in-out infinite;
#         }}
#         @keyframes frame-pulse {{
#             0%,100% {{ box-shadow:0 0 0 1px rgba(201,168,76,.7),0 0 24px rgba(201,168,76,.45),0 0 60px rgba(201,168,76,.18),0 12px 48px rgba(200,16,46,.20); }}
#             50%      {{ box-shadow:0 0 0 2px rgba(201,168,76,.9),0 0 36px rgba(201,168,76,.65),0 0 90px rgba(201,168,76,.30),0 12px 48px rgba(200,16,46,.25); }}
#         }}
#         .form{{ background:var(--white); border-radius:22px; overflow:hidden; box-shadow:var(--shadow-lg); }}

#         .header{{
#             background:linear-gradient(135deg,var(--red-dark) 0%,var(--red) 55%,#fdf5f6 100%);
#             padding:32px 48px 28px; position:relative; overflow:hidden;
#             border-bottom:3px solid var(--gold);
#         }}
#         .header::before{{ content:''; position:absolute; top:-80px; right:-80px; width:340px; height:340px; border-radius:50%; background:rgba(255,255,255,.05); pointer-events:none; }}
#         .header::after{{ content:''; position:absolute; bottom:-60px; left:-60px; width:220px; height:220px; border-radius:50%; background:rgba(0,0,0,.07); pointer-events:none; }}
#         .header-ring{{ position:absolute; top:-40px; right:80px; width:200px; height:200px; border-radius:50%; border:40px solid rgba(201,168,76,.06); pointer-events:none; }}
#         .doc-meta{{ position:absolute; top:20px; right:40px; text-align:right; z-index:2; }}
#         .doc-no{{ font-size:12px; font-weight:700;  letter-spacing:1.5px; }}
#         .doc-status{{
#         display:inline-block;
#         margin-top:6px;
#         padding:3px 13px;
#         border-radius:20px;
#         font-size:11px;
#         font-weight:700;
#         letter-spacing:.5px;
#         }}

#         /* Draft Status - Yellow */
#         .doc-status.draft{{
#             background:#D4A017;
#             color:black;
#             border:1px solid black;
#         }}

#         /* Approved Status - Green */
#         .doc-status.approved{{
#             background:#d4edda;
#             color:dark-green;
#             border:1px solid black;
#         }}
#         .logo-html{{
#             position:absolute;
#             right:1px;
#             top:50px;
#             padding:10px 18px;
#             border-radius:8px;
#             display:inline-flex;
#             align-items:right;
#             justify-content:right;
#         }}

#         .logo-html img{{
#             max-height:60px;
#             width:auto;
#             display:block;
#         }}
#         .header-inner{{ display:flex; align-items:center; gap:28px; position:relative; z-index:1; }}
#         .emp-avatar{{
#             width:114px; height:114px; border-radius:50%; flex-shrink:0;
#             background:linear-gradient(145deg,var(--red-dark),var(--red-mid));
#             overflow:hidden; display:flex; align-items:center; justify-content:center;
#             border:3px solid var(--gold);
#             box-shadow:0 0 0 5px rgba(201,168,76,.22),0 0 0 9px rgba(201,168,76,.08),0 8px 28px rgba(0,0,0,.35);
#         }}
#         .emp-avatar img{{ width:100%; height:100%; object-fit:cover; border-radius:50%; }}
#         .emp-avatar-initials{{ font-family:'Playfair Display',serif; font-size:36px; color:var(--gold); }}
#         .header-info{{ flex:1; }}
#         .emp-id{{ font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--gold); margin-bottom:5px; }}
#         .emp-name{{ font-family:'Playfair Display',serif; font-size:28px; color:#fff; margin-bottom:6px; line-height:1.2; }}
#         .emp-sub{{ font-size:13px; color:rgba(255,255,255,.65); letter-spacing:.3px; }}
#         .badges{{ display:flex; gap:9px; flex-wrap:wrap; margin-top:13px; }}
#         .badge{{ padding:4px 13px; border-radius:20px; font-size:11px; font-weight:500; }}
#         .badge-gold{{ background:rgba(201,168,76,.18); color:var(--gold-lt); border:1px solid rgba(201,168,76,.38); }}
#         .badge-white{{ background:rgba(255,255,255,.12); color:rgba(255,255,255,.8); border:1px solid rgba(255,255,255,.2); }}
#         .stripe{{ height:5px; background:linear-gradient(90deg,var(--red-dark) 0%,var(--red) 25%,var(--gold) 55%,var(--gold-lt) 75%,var(--gold) 90%,var(--red-dark) 100%); box-shadow:0 2px 8px rgba(201,168,76,.3); }}

#         .body{{ padding:36px 48px 44px; }}
#         .collapsible-section{{ margin-bottom:0; }}
#         .collapsible-body{{ overflow:visible; transition:max-height .35s ease, opacity .25s ease; max-height:9999px; opacity:1; }}
#         .collapsible-body.collapsed{{ max-height:0 !important; opacity:0; overflow:hidden !important; }}
#         .section{{
#             font-size:12px; font-weight:700; letter-spacing:3px; text-transform:uppercase;
#             color:var(--red); display:flex; align-items:center; gap:12px;
#             margin-bottom:18px; margin-top:32px; cursor:pointer; user-select:none;
#         }}
#         .section:first-child{{ margin-top:0; }}
#         .section::after{{ content:''; flex:1; height:2px; background:linear-gradient(90deg,var(--gold-bright),rgba(201,168,76,.3),transparent); border-radius:2px; }}
#         .coll-icon{{ font-size:10px; color:var(--gold); transition:transform .3s; flex-shrink:0; margin-left:4px; }}
#         .coll-icon.rotated{{ transform:rotate(-90deg); }}

#         .info-table{{
#             width:100%; border-collapse:collapse;
#             border:1.5px solid var(--gold-border);
#             border-radius:12px; overflow:hidden; margin-bottom:4px;
#             box-shadow:0 2px 12px rgba(201,168,76,.12);
#         }}
#         .info-table tr:nth-child(odd) td{{ background:var(--odd-row); }}
#         .info-table tr:nth-child(even) td{{ background:var(--even-row); }}
#         .info-table tr:last-child td{{ border-bottom:none; }}
#         .info-table td{{
#             padding:13px 20px; border-bottom:1px solid rgba(201,168,76,.2);
#             border-right:1px solid rgba(201,168,76,.2); vertical-align:top; width:25%;
#         }}
#         .info-table td:last-child{{ border-right:none; }}
#         .lbl{{ font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold-deep); margin-bottom:4px; }}
#         .val{{ font-size:13.5px; font-weight:500; color:var(--text); }}
#         .val.mono{{ font-family:'Courier New',monospace; font-size:13px; }}
#         .assessor-cell{{ display:flex; align-items:center; gap:10px; }}
#         .ass-avatar-sm{{
#             width:38px; height:38px; border-radius:50%; flex-shrink:0;
#             background:linear-gradient(145deg,var(--red-dark),var(--red));
#             display:flex; align-items:center; justify-content:center;
#             border:2px solid var(--gold); overflow:hidden;
#             box-shadow:0 0 0 2px rgba(201,168,76,.2);
#         }}
#         .ass-avatar-sm img{{ width:100%; height:100%; object-fit:cover; border-radius:50%; }}
#         .ass-initials-sm{{ font-family:'Playfair Display',serif; font-size:14px; color:var(--gold); }}
#         .ass-name-sm{{ font-size:13px; font-weight:600; color:var(--text); }}
#         .ass-id-sm{{ font-size:11px; color:var(--muted); margin-top:1px; }}

#         /* ── GOALS TABLE ── */
#         .table-scroll{{ overflow-x:auto; overflow-y:visible; }}
#         .goals-table{{
#             width:100%; table-layout:auto; border-collapse:collapse;
#             border:1.5px solid var(--gold-border);
#             border-radius:12px; font-size:13px;
#             box-shadow:0 2px 12px rgba(201,168,76,.12);
#         }}
#         .goals-table thead tr{{ background:linear-gradient(135deg,var(--red-dark) 0%,var(--red) 100%); border-bottom:2px solid var(--gold); }}
#         .goals-table thead th{{ padding:12px 14px; text-align:center; font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,.9); border-right:1px solid rgba(255,255,255,.12); white-space:nowrap; }}
#         .goals-table thead th:first-child,.goals-table thead th:nth-child(2),.goals-table thead th:nth-child(3){{ text-align:left; }}
#         .goals-table thead th:last-child{{ border-right:none; }}
#         .goals-table tbody tr:nth-child(odd) td{{ background:var(--odd-row); }}
#         .goals-table tbody tr:nth-child(even) td{{ background:var(--even-row); }}
#         .goals-table tbody tr:hover td{{ background:#fce8eb; transition:background .15s; }}
#         .goals-table tbody tr:last-child td{{ border-bottom:none; }}
#         .goals-table tbody td{{ padding:10px 14px; border-bottom:1px solid rgba(201,168,76,.15); border-right:1px solid rgba(201,168,76,.15); vertical-align:middle; }}
#         .goals-table tbody td:last-child{{ border-right:none; }}
#         .col-no{{ width:36px; text-align:center; }}
#         .col-goal{{ width:200px; white-space:normal; }}
#         .col-weight{{ width:56px; text-align:center !important; }}
#         .col-desc{{ width:180px; }}
#         .col-stars{{ width:140px; text-align:center; }}
#         .col-pill{{ width:110px; text-align:center; }}
#         .desc-cell{{ display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; font-size:13px; color:var(--label); line-height:1.45; max-width:200px; word-break:break-word; }}
#         .center-stars{{ justify-content:center; }}

#         /* ── KRA INPUT / DROPDOWN ── */
#         .kra-input {{
#             width:100%; padding:5px 8px; border:1px solid var(--gold-border);
#             border-radius:6px; font-size:12px; font-family:'DM Sans',sans-serif;
#             background:#fff; color:var(--text); outline:none;
#             transition:border-color .15s, box-shadow .15s;
#         }}
#         .kra-input:focus {{
#             border-color:var(--gold); box-shadow:0 0 0 2px rgba(201,168,76,.18);
#         }}
#         .edit-cell {{
#             position:relative;
#             overflow:visible;
#             white-space:normal;
#         }}

#         /* The dropdown is appended to <body> and uses position:fixed via JS */
#         .kra-dropdown {{
#             position:fixed;
#             z-index:999999;
#             background:#fff;
#             border:1.5px solid var(--gold-border);
#             border-radius:8px;
#             box-shadow:0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(201,168,76,.15);
#             max-height:200px;
#             overflow-y:auto;
#             min-width:220px;
#             display:none;
#         }}
#         .kra-dd-item {{
#             padding:8px 12px; font-size:12px; cursor:pointer; color:var(--text);
#             border-bottom:1px solid rgba(201,168,76,.1);
#             transition:background .1s;
#         }}
#         .kra-dd-item:last-child {{ border-bottom:none; }}
#         .kra-dd-item:hover {{ background:var(--odd-row); color:var(--red); }}
#         .kra-dd-item.dd-empty {{ color:var(--muted); cursor:default; font-style:italic; }}

#         /* ── PILLS ── */
#         .score-pill{{ display:inline-block; padding:4px 12px; border-radius:20px; font-weight:700; font-size:11px; white-space:nowrap; }}
#         .score-high{{ background:rgba(45,122,79,.12); color:var(--green); border:1px solid rgba(45,122,79,.25); }}
#         .score-mid{{ background:rgba(201,168,76,.15); color:var(--gold-deep); border:1px solid rgba(201,168,76,.35); }}
#         .score-low{{ background:rgba(200,16,46,.1); color:var(--red); border:1px solid rgba(200,16,46,.2); }}
#         .score-sub{{ font-size:10px; color:var(--muted); margin-top:3px; text-align:center; }}

#         /* ── STARS ── */
#         .star-row{{ display:flex; gap:2px; font-size:18px; line-height:1; align-items:center; flex-wrap:nowrap; }}
#         .kra-star{{ color:#e2d0b0; transition:color .12s, transform .1s; user-select:none; }}
#         .self-stars .kra-star.checked{{ color:var(--self-blue); }}
#         .self-stars .kra-star:hover{{ color:#93c5fd; transform:scale(1.2); }}
#         .assessor-stars .kra-star.checked{{ color:var(--gold); }}
#         .assessor-stars .kra-star:hover{{ color:var(--gold-lt); transform:scale(1.2); }}

#         /* ── KRA CARDS ── */
#         .kra-cards-grid{{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px; margin-bottom:8px; justify-items:center; }}
#         .kra-card{{
#             width:180px; border:1.5px solid var(--gold-border); border-top:3px solid var(--gold);
#             border-radius:14px; padding:16px 12px 14px;
#             background:linear-gradient(160deg,#fff 55%,#fff9ee 100%);
#             box-shadow:var(--shadow-sm);
#             display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px;
#             transition:box-shadow .2s, transform .15s, border-color .15s; cursor:default;
#         }}
#         .kra-card:hover{{ box-shadow:0 6px 28px rgba(201,168,76,.28),var(--shadow-md); transform:translateY(-3px); border-color:var(--gold-bright); }}
#         .kra-card-icon{{ font-size:28px; line-height:1; margin-bottom:2px; }}
#         .kra-card-title{{ font-size:12px; font-weight:700; color:var(--text); line-height:1.3; text-transform:uppercase; min-height:28px; display:flex; align-items:center; justify-content:center; }}
#         .kra-card-score-wrap{{ margin-top:6px; width:100%; text-align:center; }}
#         .kra-row-label{{ font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:var(--label); margin-top:4px; }}
#         .kra-tooltip-panel{{
#             margin-top:10px;
#             background:linear-gradient(135deg,var(--red-dark),#2a1010);
#             color:#f0e0c0; font-size:13px; line-height:1.7;
#             padding:13px 18px; border-radius:10px;
#             box-shadow:0 8px 28px rgba(0,0,0,.25);
#             border:1px solid rgba(201,168,76,.35); transition:opacity .15s;
#         }}
#         .kra-tooltip-panel strong{{ color:var(--gold-lt); font-size:11px; letter-spacing:1px; text-transform:uppercase; display:block; margin-bottom:4px; }}

#         /* ── SCORE CARDS ── */
#         .score-cards{{ display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:4px; }}
#         .score-cards-single{{ grid-template-columns:1fr; max-width:320px; }}
#         .score-card{{
#             border:1.5px solid var(--gold-border); border-radius:14px;
#             padding:24px 20px; text-align:center;
#             background:linear-gradient(160deg,#fff 50%,#fff9ee 100%);
#             box-shadow:var(--shadow-gold),var(--shadow-sm); position:relative; overflow:hidden;
#         }}
#         .score-card::before{{
#             content:''; position:absolute; top:0; left:0; right:0; height:4px;
#             background:linear-gradient(90deg,var(--red-dark),var(--red),var(--gold),var(--gold-lt),var(--gold),var(--red-dark));
#             background-size:200% 100%; animation:shimmer-bar 3s linear infinite;
#         }}
#         @keyframes shimmer-bar{{ 0%{{ background-position:200% center; }} 100%{{ background-position:-200% center; }} }}
#         .sc-label{{ font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--red); margin-bottom:10px; }}
#         .sc-val{{ font-family:'Playfair Display',serif; font-size:32px; color:var(--text); }}
#         .sc-sub{{ font-size:11px; color:var(--muted); margin-top:6px; }}

#         /* ── PERFORMANCE GRID ── */
#         .pg-wrap{{ border-radius:16px; overflow:hidden; border:1.5px solid var(--gold-border); box-shadow:0 4px 32px rgba(206,20,38,.10),var(--shadow-gold); margin-bottom:4px; }}
#         .pg-table{{ width:100%; border-collapse:collapse; table-layout:fixed; font-size:13px; }}
#         .pg-main-title{{
#             background:linear-gradient(135deg,var(--red-dark) 0%,var(--red) 60%,#e8253c 100%);
#             color:#fff; font-family:'Playfair Display',serif; font-size:14px; font-weight:700;
#             letter-spacing:3px; text-transform:uppercase; text-align:center; padding:16px 20px;
#             border-bottom:2px solid var(--gold);
#         }}
#         .pg-col-head{{ padding:18px 10px 14px; text-align:center; vertical-align:middle; width:20%; transition:background .15s; }}
#         .pg-col-head:last-child{{ border-right:none !important; }}
#         .pg-num-badge{{ display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:8px; color:#fff; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; margin-bottom:7px; }}
#         .pg-col-label{{ display:block; font-size:12px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; margin-top:3px; }}
#         .pg-desc-cell{{ vertical-align:top; padding:0; width:20%; }}
#         .pg-desc-cell:last-child{{ border-right:none !important; }}
#         .pg-desc-text{{ padding:14px 14px 18px; font-size:12px; line-height:1.7; }}
#         .pg-oe-bar{{ display:flex; align-items:center; background:linear-gradient(135deg,var(--red-dark) 0%,var(--red) 55%,#9a1a00 100%); border-top:2px solid var(--gold); }}
#         .pg-oe-label{{ flex:1; padding:14px 22px; font-family:'Playfair Display',serif; font-size:13px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:var(--gold-lt); }}
#         .pg-oe-val{{ padding:14px 22px; font-family:'Playfair Display',serif; font-size:28px; font-weight:700; color:var(--gold-lt); border-left:1px solid rgba(201,168,76,.3); background:rgba(201,168,76,.1); line-height:1; }}

#         .worker-criteria{{ margin-top:20px; border:1.5px solid var(--gold-border); border-radius:12px; padding:18px; background:linear-gradient(135deg,#fff9f0,#fff3e0); }}
#         .wc-title{{ font-weight:700; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; color:var(--red); margin-bottom:14px; }}
#         .wc-grid{{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; }}
#         .wc-card{{ background:#fff; border:1px solid var(--gold-border); border-radius:10px; padding:12px 14px; box-shadow:var(--shadow-sm); }}
#         .wc-card-title{{ font-size:12px; font-weight:700; margin-bottom:8px; color:var(--red); }}
#         .wc-row{{ display:flex; justify-content:space-between; font-size:11.5px; padding:4px 0; border-bottom:1px dashed #e5c880; }}
#         .wc-row:last-child{{ border-bottom:none; }}

#         .footer{{ border-top:2px solid var(--gold-border); padding:16px 48px; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(90deg,#fff9f0,#fff6e8,#fff9f0); }}
#         .footer-left{{ font-size:11px; color:var(--label); }}
#         .footer-right{{ font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--gold-deep); background:linear-gradient(135deg,var(--gold-pale),#fff8d0); border:1px solid var(--gold-border); padding:4px 14px; border-radius:20px; box-shadow:0 1px 6px rgba(201,168,76,.2); }}

#         @media(max-width:768px){{
#             .header,.body,.footer{{ padding-left:22px; padding-right:22px; }}
#             .header-inner{{ flex-direction:column; align-items:center; text-align:center; }}
#             .doc-meta{{ position:static; text-align:center; margin-bottom:16px; }}
#             .badges{{ justify-content:center; }}
#             .score-cards{{ grid-template-columns:1fr; }}
#             .info-table td{{ width:50%; }}
#             .info-table tr{{ display:flex; flex-wrap:wrap; }}
#             .kra-cards-grid{{ grid-template-columns:repeat(2,1fr); }}
#             .col-desc{{ width:150px; }}
#         }}
#     </style>
# </head>
# <body>
# <div class="gold-frame">
# <div class="form">

#     <div class="header">
#         <div class="header-ring"></div>
#         <div class="doc-meta">
#             <div class="doc-no">📄 {safe(doc.name)}</div>
#             <div class="doc-status {status_class}">● {status_label}</div>
#             <div class="logo-html">{logo_image_html}</div>
#         </div>
#         <div class="header-inner">
#             <div class="emp-avatar">{image_html}</div>
#             <div class="header-info">
#                 <div class="emp-name">{safe(doc.employee_name)}</div>
#                 <div class="emp-sub">{safe(doc.get("designation") or "")} {"&nbsp;·&nbsp; " + frappe.db.get_value("Employee",doc.get("employee"),"custom_division") or ""}</div>
#                 <div class="badges">{badges}</div>
#             </div>
#         </div>
#     </div>
#     <div class="stripe"></div>
    
#     <div class="body">

#         <div class="collapsible-section">
#             <div class="section collapsible-header" onclick="toggleSection(this)">
#                 <span style='font-size:15px;'>Employee Details</span><span class="coll-icon">▼</span>
#             </div>
#             <div class="collapsible-body">
#                 <table class="info-table">
#                     <tr>
#                         <td>
#                             <div class="lbl">{translate_the_value("GEC No")}</div>
#                             <div class="val">{translate_the_value(safe(doc.custom_gec_no)) or ""}</div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Employee Name")}</div>
#                             <div class="val">{translate_the_value(safe(doc.employee_name))}</div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Company")}</div>
#                             <div class="val">{translate_the_value(safe(doc.company))}</div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Grade")}</div>
#                             <div class="val">{translate_the_value(safe(doc.get("custom_grade") or ""))}</div>
#                         </td>
#                     </tr>

#                     <tr>
#                         <td>
#                             <div class="lbl">{translate_the_value("Project")}</div>
#                             <div class="val">
#                                 {translate_the_value(frappe.db.get_value("Employee",doc.get("employee"),"custom_division") or safe(doc.get("department") or ""))}
#                             </div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Designation")}</div>
#                             <div class="val">{translate_the_value(safe(doc.get("designation") or ""))}</div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Unit")}</div>
#                             <div class="val">{translate_the_value(safe(doc.get("custom_unit") or ""))}</div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Assessment Date")}</div>
#                             <div class="val">{translate_the_value(formatdate(doc.get("creation") or ""))}</div>
#                         </td>
#                     </tr>

#                     <tr>
#                         <td>
#                             <div class="lbl">{translate_the_value("Date of Joining")}</div>
#                             <div class="val">{translate_the_value(doj)}</div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Qualification")}</div>
#                             <div class="val">{translate_the_value(safe(doc.get("custom_qualification") or ""))}</div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Certifications")}</div>
#                             <div class="val">{translate_the_value(safe(doc.get("custom_certifications") or ""))}</div>
#                         </td>

#                         <td>
#                             <div class="lbl">{translate_the_value("Experience")}</div>
#                             <div class="val">{translate_the_value(exp_str)}</div>
#                         </td>
#                     </tr>
#                     <tr>
#                         <td>
#                             <div class="lbl">📅 {translate_the_value("Appraisal Cycle")}</div>
#                             <div class="val">{safe(doc.get("appraisal_cycle") or "—")}</div>
#                         </td>
#                         <td>
#                             <div class="lbl">🗓️ {translate_the_value("Period")}</div>
#                             <div class="val">{start_date or "—"} &nbsp;→&nbsp; {end_date or "—"}</div>
#                         </td>
#                         <td>
#                             <div class="lbl">{translate_the_value("🏅 Total Score")}</div>
#                             <div class="val" style="font-family:'Playfair Display',serif;font-size:20px;color:var(--gold-deep);" id="hdr-total-score">{total_goal_score_str or "—"}</div>
#                         </td>
#                         <td>
#                              <div class="lbl">👤 {translate_the_value("Assessor")}</div>
#                             <div class="assessor-cell">
#                                 <div class="ass-avatar-sm">
#                                     {'<img src="' + assessor_image + '" alt="' + safe(reviewer_name) + '">' if assessor_image else '<div class="ass-initials-sm">' + (initials(reviewer_name) if reviewer_name else "?") + '</div>'}
#                                 </div>
#                                 <div>
#                                     <div class="ass-name-sm">{translate_the_value(safe(reviewer_name) or "—")}</div>
#                                     <div class="ass-id-sm">{translate_the_value(safe(reviewer_id))}</div>
#                                 </div>
#                             </div>
#                         </td>
#                     </tr>
#                     <tr>
#                         <td colspan = 4><div  style="font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold-deep); margin-bottom:4px; text-align:center">Previous Ratings</div></td>
#                     </tr>
#                    {translate_the_value(previous_rating_html)}

#                 </table>
#             </div>
#         </div>
        

#         <div class="collapsible-section">
#             <div class="section collapsible-header" onclick="toggleSection(this)">
#                 <span>{translate_the_value("Performance Grid")}</span><span class="coll-icon">▼</span>
#             </div>
#             <div class="collapsible-body">
#                 {translate_the_value(perf_grid_html)}
#             </div>
#         </div>

#         {kra_cards_html}
#         {goals_section}

#         <div class="collapsible-section">
#             <div class="section collapsible-header" onclick="toggleSection(this)">
#                 <span style='font-size:15px;'>Score Summary</span><span class="coll-icon">▼</span>
#             </div>
#             <div class="collapsible-body">
#                 {score_cards_html}
#             </div>
#         </div>

#     </div>

#     <div class="footer">
#         <div class="footer-left">If anyone scores 1&amp;2 in Safety it will not be considered as 4 &amp; 5 in Overall Effectiveness rating.</div>
#         <div class="footer-right">Note</div>
#     </div>

# </div>
# </div>

# <!-- ── Single shared dropdown portal (appended to body, avoids all overflow clipping) ── -->
# <div class="kra-dropdown" id="kra-dd-portal"></div>

# <script>
# var APPRAISAL_NAME = "{safe_js(doc.name)}";
# var ROW_MAP        = {row_map_json};
# var SELF_EDITABLE  = {"true" if self_editable else "false"};
# var ASSR_EDITABLE  = {"true" if assessor_editable else "false"};
# var IS_WORKER      = {"true" if is_worker else "false"};
# var KRA_LIST       = {kra_options_json};

# /* ── Active dropdown state ── */
# var _activeTblIdx  = null;
# var _activeInput   = null;
# var _portal        = document.getElementById('kra-dd-portal');

# /* ── Collapsible ── */
# function toggleSection(headerEl) {{
#     var icon = headerEl.querySelector('.coll-icon');
#     var body = headerEl.closest('.collapsible-section').querySelector('.collapsible-body');
#     if (!body) return;
#     var isCollapsed = body.classList.contains('collapsed');
#     body.classList.toggle('collapsed', !isCollapsed);
#     if (icon) icon.classList.toggle('rotated', !isCollapsed);
# }}

# /* ── KRA Tooltip ── */
# function showKraTooltip(cardEl) {{
#     var desc = cardEl.getAttribute('data-desc') || '';
#     if (!desc) return;
#     var title = cardEl.querySelector('.kra-card-title');
#     var label = title ? title.textContent.trim() : '';
#     var panel = document.getElementById('kra-tooltip-panel');
#     if (!panel) return;
#     panel.innerHTML = '<strong>' + label + '</strong>' + desc;
#     panel.style.display = 'block';
# }}
# function hideKraTooltip() {{
#     var panel = document.getElementById('kra-tooltip-panel');
#     if (panel) panel.style.display = 'none';
# }}

# /* ── Position portal under the focused input ── */
# function positionPortal(input) {{
#     var rect = input.getBoundingClientRect();
#     _portal.style.top    = (rect.bottom + 2) + 'px';
#     _portal.style.left   = rect.left + 'px';
#     _portal.style.width  = Math.max(rect.width, 240) + 'px';
# }}

# /* ── Show dropdown ── */
# function showKraDropdown(input) {{
#     _activeInput  = input;
#     _activeTblIdx = parseInt(input.dataset.tbl);
#     positionPortal(input);
#     buildDropdownItems(input.value || '');
#     _portal.style.display = 'block';
# }}

# /* ── Filter as user types ── */
# function filterKraDropdown(input) {{
#     if (_activeTblIdx !== parseInt(input.dataset.tbl)) {{
#         showKraDropdown(input);
#         return;
#     }}
#     positionPortal(input);
#     buildDropdownItems(input.value || '');
#     _portal.style.display = 'block';
# }}

# /* ── Build list items ── */
# function buildDropdownItems(q) {{
#     q = (q || '').trim().toLowerCase();
#     var filtered = q ? KRA_LIST.filter(function(k) {{ return k.toLowerCase().indexOf(q) !== -1; }}) : KRA_LIST;
#     if (!filtered.length) {{
#         _portal.innerHTML = '<div class="kra-dd-item dd-empty">No KRA found</div>';
#     }} else {{
#         _portal.innerHTML = filtered.slice(0, 30).map(function(k) {{
#             return '<div class="kra-dd-item" onmousedown="selectKra(this)">' + k + '</div>';
#         }}).join('');
#     }}
# }}

# /* ── Hide dropdown with delay (allows mousedown on item to fire first) ── */
# function hideKraDropdownDelayed(input) {{
#     setTimeout(function() {{
#         if (_activeInput === input) {{
#             _portal.style.display = 'none';
#             _activeTblIdx = null;
#             _activeInput  = null;
#         }}
#     }}, 200);
# }}

# /* ── Close on outside click ── */
# document.addEventListener('mousedown', function(e) {{
#     if (!_portal.contains(e.target) && e.target !== _activeInput) {{
#         _portal.style.display = 'none';
#         _activeTblIdx = null;
#         _activeInput  = null;
#     }}
# }});

# /* ── Close on scroll / resize (reposition or hide) ── */
# window.addEventListener('scroll', function() {{
#     if (_activeInput && _portal.style.display === 'block') {{
#         positionPortal(_activeInput);
#     }}
# }}, true);
# window.addEventListener('resize', function() {{
#     if (_activeInput && _portal.style.display === 'block') {{
#         positionPortal(_activeInput);
#     }}
# }});

# /* ── SELECT KRA ── */
# function selectKra(item) {{
#     var tblIdx  = _activeTblIdx;
#     var kraName = item.textContent.trim();

#     /* Close portal */
#     _portal.style.display = 'none';
#     _activeTblIdx = null;

#     /* Update input display */
#     var input = document.querySelector('.kra-input[data-tbl="' + tblIdx + '"]');
#     if (input) {{ input.value = kraName; _activeInput = null; }}

#     /* Update ROW_MAP cache */
#     if (ROW_MAP[tblIdx]) ROW_MAP[tblIdx].kra = kraName;

#     var info = ROW_MAP[tblIdx];
#     if (!info) return;

#     /* Update Frappe model */
#     var frm = getLiveForm();
#     if (frm) {{
#         frappe.model.set_value(info.cdt, info.name, "kra", kraName).then(function() {{
#             frm.dirty();
#             showSaveStatus();
#         }});
#         frappe.model.set_value("Appraisal Goal", info.name, "custom_is_new_goal", 1).then(function() {{
#             frm.dirty();
#             showSaveStatus();
#         }});
#     }} else {{
#         frappe.model.set_value("Appraisal Goal", info.name, "kra", kraName);
#         frappe.model.set_value("Appraisal Goal", info.name, "custom_is_new_goal", 1);
#         showSaveStatus();
#     }}

#     /* Fetch description */
#     frappe.call({{
#         method: "pms_ai.custom.get_kra_description",
#         args: {{ kra: kraName, grade: "{grade_js}" }},
#         callback: function(r) {{
#             if (r.message && r.message.length) {{
#                 var desc = r.message[0].description || "";
#                 var frm2 = getLiveForm();
#                 if (frm2) {{
#                     frappe.model.set_value(info.cdt, info.name, "custom_description", desc)
#                         .then(function() {{ frm2.dirty(); }});
#                 }} else {{
#                     frappe.model.set_value("Appraisal Goal", info.name, "custom_description", desc);
#                 }}
#                 var descEl = document.getElementById("desc-cell-" + tblIdx);
#                 if (descEl) {{ descEl.textContent = desc; descEl.title = desc; }}
#             }}
#         }}
#     }});
# }}

# /* ── SAVE STATUS ── */
# function showSaveStatus() {{
#     var status = document.getElementById("goals-save-status");
#     if (status) {{
#         status.style.display = 'inline';
#         setTimeout(function() {{ status.style.display = 'none'; }}, 1500);
#     }}
# }}

# /* ── Helpers ── */
# function getLiveForm() {{
#     try {{
#         var frm = window.cur_frm || (window.parent && window.parent.cur_frm);
#         return (frm && frm.doc && frm.doc.name === APPRAISAL_NAME) ? frm : null;
#     }} catch(e) {{ return null; }}
# }}
# function pillClass(score) {{
#     if (score >= 4.0) return "score-high";
#     if (score >= 2.5) return "score-mid";
#     return "score-low";
# }}
# function renderStars(containerId, val) {{
#     var el = document.getElementById(containerId);
#     if (!el) return;
#     el.querySelectorAll(".kra-star").forEach(function(s, i) {{
#         var v = i + 1;
#         s.textContent = v <= val ? "★" : "☆";
#         s.classList.toggle("checked", v <= val);
#     }});
# }}

# /* ── ASSESSOR STAR SYNC ── */
# function syncAssessorUI(tblIdx, starVal) {{
#     if (!ASSR_EDITABLE) return;
#     var info = ROW_MAP[tblIdx];
#     if (!info) return;
#     var weightage  = info.weightage || 0;
#     var goalScore  = parseFloat(starVal.toFixed(2));
#     var totalscore = parseFloat((starVal * weightage / 100).toFixed(2));

#     renderStars("tbl-assessor-" + tblIdx, starVal);
#     var sc = document.getElementById("tbl-score-" + tblIdx);
#     if (sc) sc.textContent = starVal;

#     var pill = document.getElementById("tbl-pill-" + tblIdx);
#     if (pill) {{ pill.textContent = goalScore.toFixed(2) + " / 5"; pill.className = "score-pill " + pillClass(goalScore); }}

#     document.querySelectorAll(".kra-card").forEach(function(card) {{
#         if (parseInt(card.dataset.tbl) === tblIdx) {{
#             var cIdx = card.id.replace("kra-card-", "");
#             renderStars("card-assessor-" + cIdx, starVal);
#             var cp = document.getElementById("card-pill-" + cIdx);
#             if (cp) cp.textContent = starVal + " / 5";
#         }}
#     }});

#     ROW_MAP[tblIdx].assessor_stars = starVal;
#     ROW_MAP[tblIdx].goal_score     = goalScore;
#     ROW_MAP[tblIdx].weighted_score = totalscore;

#     var totalWeightedStars = 0, totalWeight = 0;
#     Object.values(ROW_MAP).forEach(function(r) {{
#         if ((r.assessor_stars || 0) > 0) {{
#             totalWeightedStars += (r.assessor_stars || 0) * (r.weightage || 0);
#             totalWeight        += (r.weightage || 0);
#         }}
#     }});
#     var totalOf5 = totalWeight > 0 ? parseFloat((totalWeightedStars / totalWeight).toFixed(0)) : 0;
#     ["summary-total-goal","pg-oe-score","hdr-total-score"].forEach(function(id) {{
#         var el = document.getElementById(id);
#         if (el) el.textContent = totalOf5;
#     }});
#     var frm = getLiveForm();
#     if (frm) {{ frm.doc["total_score"] = totalOf5; frm.dirty(); }}
# }}

# /* ── SELF STAR SYNC ── */
# function syncSelfUI(tblIdx, starVal) {{
#     if (!SELF_EDITABLE || IS_WORKER) return;
#     var info = ROW_MAP[tblIdx];
#     if (!info) return;
#     renderStars("tbl-self-" + tblIdx, starVal);
#     var selfSc = document.getElementById("tbl-self-score-" + tblIdx);
#     if (selfSc) selfSc.textContent = starVal;
#     document.querySelectorAll(".kra-card").forEach(function(card) {{
#         if (parseInt(card.dataset.tbl) === tblIdx) {{
#             var cIdx = card.id.replace("kra-card-", "");
#             renderStars("card-self-" + cIdx, starVal);
#         }}
#     }});
#     ROW_MAP[tblIdx].self_stars = starVal;
#     var totalSelfWeighted = 0, totalWeight = 0;
#     Object.values(ROW_MAP).forEach(function(r) {{
#         totalSelfWeighted += (r.self_stars || 0) * (r.weightage || 0);
#         totalWeight       += (r.weightage || 0);
#     }});
#     var avgSelf = totalWeight > 0 ? parseFloat((totalSelfWeighted / totalWeight).toFixed(2)) : 0;
#     var se = document.getElementById("summary-self-score");
#     if (se) se.textContent = avgSelf.toFixed(2);
# }}

# /* ── STAR CLICK HANDLERS ── */
# function starClick(starEl) {{
#     if (!ASSR_EDITABLE) return;
#     var tblIdx  = parseInt(starEl.dataset.tbl);
#     var starVal = parseInt(starEl.dataset.val);
#     syncAssessorUI(tblIdx, starVal);
#     var info = ROW_MAP[tblIdx];
#     if (!info) return;
#     var frm = getLiveForm();
#     if (frm) {{
#         var rowObj = frappe.get_doc(info.cdt, info.name);
#         if (rowObj) {{
#             rowObj["custom_assessor_score"] = starVal / 5;
#             rowObj["score"] = starVal;
#         }}
#         frm.dirty();
#     }} else {{
#         frappe.model.set_value(info.cdt, info.name, "custom_assessor_score", starVal / 5);
#         frappe.model.set_value(info.cdt, info.name, "score", starVal);
#     }}
# }}

# function selfStarClick(starEl) {{
#     if (!SELF_EDITABLE || IS_WORKER) return;
#     var tblIdx  = parseInt(starEl.dataset.tbl);
#     var starVal = parseInt(starEl.dataset.val);
#     ROW_MAP[tblIdx].self_stars = starVal;
#     syncSelfUI(tblIdx, starVal);
#     var info = ROW_MAP[tblIdx];
#     if (!info) return;
#     var totalSelfWeighted = 0, totalWeight = 0;
#     Object.values(ROW_MAP).forEach(function(r) {{
#         totalSelfWeighted += (r.self_stars || 0) * (r.weightage || 0);
#         totalWeight       += (r.weightage || 0);
#     }});
#     var avgOf5    = totalWeight > 0 ? parseFloat((totalSelfWeighted / totalWeight).toFixed(2)) : 0;
#     var selfScore = parseFloat((starVal / 5).toFixed(2));
#     var frm = getLiveForm();
#     if (frm) {{
#         var rowObj = frappe.get_doc(info.cdt, info.name);
#         if (rowObj) {{
#             rowObj["custom_self_score"] = selfScore;
#             rowObj["score"] = starVal;
#         }}
#         frm.doc["custom_total_self_score"] = avgOf5;
#         var se = document.getElementById("summary-total-goal");
#         if (se) se.textContent = avgOf5.toFixed(2);
#         var oe = document.getElementById("pg-oe-score");
#         if (oe) oe.textContent = avgOf5.toFixed(2);
#         var hdr = document.getElementById("hdr-total-score");
#         if (hdr) hdr.textContent = avgOf5.toFixed(2);
#         frm.dirty();
#     }} else {{
#         frappe.model.set_value(info.cdt, info.name, "custom_self_score", selfScore);
#         frappe.model.set_value(info.cdt, info.name, "score", starVal);
#     }}
# }}
# </script>
# </body>
# </html>"""

#     return html




@frappe.whitelist()
def appraisal_html_template_employee_overview_arabic(appraisal_name):
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
    is_appraisal_user = "Appraisal User"     in frappe.get_roles(frappe.session.user)

    self_editable     = is_draft and is_appraisal_user and not is_worker and not is_assessor
    assessor_editable = is_assessor and doc.workflow_state =="Pending for Assessor"
    if is_worker and is_draft:
        assessor_editable = is_assessor

    # ── Employee photo ─────────────────────────────────────────────────────
    emp_image  = doc.get("image") or frappe.db.get_value("Employee", doc.employee, "image")
    image_html = (f'<img src="{emp_image}" alt="{safe(doc.employee_name)}">'
                  if emp_image else f'<div class="emp-avatar-initials">{initials(doc.employee_name)}</div>')
    logo_image_html = (f'<img src="/files/galfar-logo.png" alt="Logo">')

    # ── Badges ─────────────────────────────────────────────────────────────
    badges = ""
    if doc.company:             badges += f'<span class="badge badge-gold">🏢 {safe(doc.company)}</span>'
    if doc.appraisal_cycle:     badges += f'<span class="badge badge-white">Cycle: {safe(doc.appraisal_cycle)}</span>'
    if doc.get("custom_grade"): badges += f'<span class="badge badge-white">Grade: {safe(doc.custom_grade)}</span>'

    # ── KRA List for dropdown ──────────────────────────────────────────────
    kra_list         = frappe.get_all("KRA", filters={"custom_unit": doc.get("custom_unit")}, fields=["name"], order_by="name asc")
    kra_options_json = json.dumps([k["name"] for k in kra_list]).replace('</script>','<\\/script>')

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

    # ── KRA Cards ──────────────────────────────────────────────────────────
    cards = ""; card_idx = 0
    for tbl_idx, row in enumerate(goals):
        if (row.get("custom_unit") or "").strip() != "Common": continue
        if row.get("kra") in ["PRODUCTIVITY","ABSENCES"]: continue
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

        cards += f"""
        <div class="kra-card" id="kra-card-{card_idx}" data-tbl="{tbl_idx}" data-desc="{desc_safe}"
             onmouseenter="showKraTooltip(this)" onmouseleave="hideKraTooltip()">
            <div class="kra-card-icon">{icon}</div>
            <div class="kra-card-title">{safe(kra_name)}</div>
            {self_section_html}
            <div class="kra-row-label" style="margin-top:6px;">Assessor</div>
            <div class="star-row assessor-stars" id="card-assessor-{card_idx}">{assessor_html}</div>
            <div class="kra-card-score-wrap">
                <span class="score-pill {pill_cls}" id="card-pill-{card_idx}">{assessor_stars} / 5</span>
            </div>
        </div>"""
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
        if (row.get("custom_unit") or "").strip() == "Common":
            if row.get("kra") not in ["PRODUCTIVITY","ABSENCES"]: continue
        index += 1
        kra_name           = cstr(row.get("kra") or "")
        weightage          = flt(row.get("per_weightage") or 0)
        custom_description = cstr(row.get("custom_description") or "")
        self_stars         = round(flt(row.get("custom_self_score") or 0) * 5)
        assessor_stars     = round(flt(row.get("custom_assessor_score") or 0) * 5)
        goal_score_val     = round(assessor_stars * weightage / 100, 2)
        pill_cls           = score_class(assessor_stars)
        kra_name_safe      = safe(kra_name) if row.get("custom_is_new_goal") else ""
    
        kra_td = f"""
            <td class="col-goal">
            <div class="edit-cell">
                <input class="kra-input" type="text"
                    data-tbl="{tbl_idx}" data-field="kra"
                    value="{kra_name_safe}" placeholder="Add KRA..."
                    autocomplete="off"
                    oninput="filterKraDropdown(this)"
                    onfocus="showKraDropdown(this)"
                    onblur="hideKraDropdownDelayed(this)"
                    {f'readonly' if not self_editable else ''}
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

        goal_rows += f"""
        <tr id="goal-row-{tbl_idx}" data-tbl="{tbl_idx}" data-rowname="{safe(row.name)}">
            <td class="col-no">{index}</td>
            {kra_td}
            <td class="col-desc">
                <div class="desc-cell" id="desc-cell-{tbl_idx}" title="{safe(custom_description)}">{safe(custom_description)}</div>
            </td>
            {wt_td}
            {self_td}
            <td class="col-stars" style="text-align:center;">
                <div class="star-row assessor-stars center-stars" id="tbl-assessor-{tbl_idx}">{assessor_html}</div>
                <div class="score-sub"><span id="tbl-score-{tbl_idx}">{assessor_stars}</span> / 5</div>
            </td>
            <td class="col-pill" style="text-align:center;">
                <span class="score-pill {pill_cls}" id="tbl-pill-{tbl_idx}">{assessor_stars} / 5</span>
            </td>
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
                    <th class="col-goal">Goal</th>
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
    reviewer_id    = frappe.db.get_value("Employee",doc.get("custom_assessor"),"designation") or ""
    assessor_image = None
    if doc.get("custom_assessor"):
        assessor_image = frappe.db.get_value("Employee", doc.custom_assessor, "image")

    # ── Dates / misc ───────────────────────────────────────────────────────
    start_date = formatdate(doc.get("start_date"))             if doc.get("start_date")             else ""
    end_date   = formatdate(doc.get("end_date"))               if doc.get("end_date")               else ""
    doj        = formatdate(doc.get("custom_date_of_joining")) if doc.get("custom_date_of_joining") else ""
    pre_exp    = doc.get("custom_previous_work_experience")
    exp_str    = (f"Pre-Galfar: {safe_js(str(pre_exp))} Yrs &nbsp;|&nbsp; " if pre_exp else "") + safe(doc.get("custom_experience") or "")

    pre_exp = flt(doc.get("custom_previous_work_experience"))
    galfar_exp = flt(doc.get("custom_internal_work_experience"))

    exp_str = f"Pre-Galfar: {int(pre_exp)} Years, Galfar : {galfar_exp:.2f} Years"
    status_map   = {0: "Draft", 1: "Approved", 2: "Cancelled"}
    # status_label = status_map.get(doc.docstatus, "Draft")
    status_label = doc.get('custom_appraisal_status') if doc.get("custom_appraisal_status") else "Draft"
    # status_label = doc.get(doc.custom_appraisal_status,'')
    
    if doc.get("workflow_state") in ["Draft","Pending for Assessor"]:
        status_class = "draft"
    elif doc.get("workflow_state") in ["Approved","Accepted"]:
        status_class = "approved"
    else:
        status_class = "draft"
    

    # ── Performance Grid ───────────────────────────────────────────────────
    PG_COLS = [
        {"num":"1","label":"Poor",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#CE1426" opacity=".15" stroke="#CE1426" stroke-width="1.5"/><line x1="6" y1="6" x2="14" y2="14" stroke="#CE1426" stroke-width="2" stroke-linecap="round"/><line x1="14" y1="6" x2="6" y2="14" stroke="#CE1426" stroke-width="2" stroke-linecap="round"/></svg>',
         "color":"#CE1426","light":"#fdf2f3","border":"#f5c2c7","text":"#8a0d1a",
         "bar":"linear-gradient(90deg,#CE1426,#e84a5a)"},
        {"num":"2","label":"Acceptable",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#c06000" opacity=".13" stroke="#c06000" stroke-width="1.5"/><line x1="6" y1="10" x2="14" y2="10" stroke="#c06000" stroke-width="2.2" stroke-linecap="round"/></svg>',
         "color":"#c06000","light":"#fff8f0","border":"#fdd9aa","text":"#7a3d00",
         "bar":"linear-gradient(90deg,#c06000,#e07820)"},
        {"num":"3","label":"Good",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#0369a1" opacity=".12" stroke="#0369a1" stroke-width="1.5"/><polyline points="5.5,10.5 8.5,13.5 14.5,7" stroke="#0369a1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
         "color":"#0369a1","light":"#f0f7fd","border":"#bae0f7","text":"#024e7a",
         "bar":"linear-gradient(90deg,#0369a1,#0ea5e9)"},
        {"num":"4","label":"Very Good",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><circle cx="10" cy="10" r="9" fill="#15803d" opacity=".12" stroke="#15803d" stroke-width="1.5"/><polyline points="5,10 8.5,13.5 15,7" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="8,10 11.5,13.5 18,7" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".5"/></svg>',
         "color":"#15803d","light":"#f0fdf5","border":"#bbf7d0","text":"#0d5c2b",
         "bar":"linear-gradient(90deg,#15803d,#22c55e)"},
        {"num":"5","label":"Excellent",
         "icon_svg":'<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:22px;height:22px;"><polygon points="10,2 12.5,7.5 18.5,8 14,12.5 15.5,18.5 10,15.5 4.5,18.5 6,12.5 1.5,8 7.5,7.5" fill="#b8860b" opacity=".2" stroke="#b8860b" stroke-width="1.2" stroke-linejoin="round"/></svg>',
         "color":"#b8860b","light":"#fefce8","border":"#fde68a","text":"#78530a",
         "bar":"linear-gradient(90deg,#b8860b,#d4a017)"},
    ]
    PG_DESCS = [
        "Performance is below expectations; behavior is contrary to company standards.",
        "Inconsistent demonstration of this value; requires coaching or behavioral adjustment.",
        "Consistently demonstrates this value in day-to-day work; meets the standard.",
        "Frequently goes above and beyond standard requirements regarding this value.",
        "Consistently far exceeds expectations; acts as a role model and champions this value to others.",
    ]
    pg_headers = ""; pg_cells = ""
    for i, col in enumerate(PG_COLS):
        dots = "".join(
            f'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin:0 2px;background:{"" + col["color"] if j <= i else col["border"]};opacity:{"1" if j <= i else "0.5"};"></span>'
            for j in range(5))
        pg_headers += f"""
        <th class="pg-col-head" style="background:{col['light']};border-right:1px solid {col['border']};border-bottom:4px solid {col['color']};">
            <div style="width:46px;height:46px;border-radius:12px;background:{col['light']};border:1.5px solid {col['border']};display:flex;align-items:center;justify-content:center;margin:0 auto 10px;box-shadow:0 2px 8px {col['color']}22;">
                {col['icon_svg']}
            </div>
            <span class="pg-num-badge" style="background:{col['color']};box-shadow:0 2px 6px {col['color']}44;">{col['num']}</span>
            <span class="pg-col-label" style="color:{col['text']};font-size:12px;font-weight:700;">{col['label']}</span>
            <div style="margin-top:8px;line-height:1;">{dots}</div>
        </th>"""
        pg_cells += f"""
        <td class="pg-desc-cell" style="background:{col['light']};border-right:1px solid {col['border']};">
            <div style="height:4px;background:{col['bar']};opacity:.85;"></div>
            <p class="pg-desc-text" style="color:#1e293b;">{PG_DESCS[i]}</p>
        </td>"""
    pr_headers = ""; pr_cells = ""
    custom_previous_rating = frappe.db.sql("""
        SELECT 
            child.year, 
            child.rating
        FROM 
            `tabPrevious Rating` child
        INNER JOIN 
            `tabEmployee` emp ON child.parent = emp.name
        WHERE 
            emp.custom_gec_no = %s
        ORDER BY child.year
    """, (doc.custom_gec_no,), as_dict=True)

    previous_rating_html = ""

    # Split into chunks of 4
    if custom_previous_rating:
        previous_rating_html = """<tr>
            <td colspan = 4><div  style="font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold-deep); margin-bottom:4px; text-align:center">Previous Ratings</div></td>
        </tr>"""
    for idx in range(0, len(custom_previous_rating), 4):
        chunk = custom_previous_rating[idx:idx + 4]

        pr_cells = ""

        for i in chunk:
            pr_cells += f'''
                <td>
                    <div class="lbl">Rating {i.year}</div>
                    <div class="val">{i.rating}</div>
                </td>
            '''

        # Fill empty columns if less than 4
        remaining = 4 - len(chunk)

        for _ in range(remaining):
            pr_cells += '<td class="pg-desc-cell"></td>'

        previous_rating_html += f"""
            <tr>
                {pr_cells}
            </tr>
        """
    # custom_previous_rating = frappe.db.sql("""
    # 	SELECT 
    # 		child.year, 
    # 		child.rating
    # 	FROM 
    # 		`tabPrevious Rating` child
    # 	INNER JOIN 
    # 		`tabEmployee` emp ON child.parent = emp.name
    # 	WHERE 
    # 		emp.custom_gec_no = %s
    # """, (doc.custom_gec_no,), as_dict=True)
    
    # for i in custom_previous_rating:
    # 	pr_headers += f'<th class="pg-main-title">{i.year}</th>'
    # 	pr_cells += f'<td class="pg-desc-cell"><div class="lbl">Rating {i.year}</div><div class="val">{i.rating}</div></td>'
        
    # previous_rating_html = f"""
    # 		<tr>{pr_headers}</tr>
    # 		<tr>{pr_cells}</tr>"""

    
    
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
                <div class="wc-row"><span>1 - Poor</span><span>Below 86%</span></div>
                <div class="wc-row"><span>2 - Acceptable</span><span>87% – 90%</span></div>
                <div class="wc-row"><span>3 - Good</span><span>91% – 100%</span></div>
                <div class="wc-row"><span>4 - Very Good</span><span>101% – 120%</span></div>
                <div class="wc-row"><span>5 - Excellent</span><span>Above 120%</span></div>
            </div>
            <div class="wc-card">
                <div class="wc-card-title">📅 Absences</div>
                <div class="wc-row"><span>1 - Poor</span><span>7 Days +</span></div>
                <div class="wc-row"><span>2 - Acceptable</span><span>5 – 6 Days</span></div>
                <div class="wc-row"><span>3 - Good</span><span>3 – 4 Days</span></div>
                <div class="wc-row"><span>4 - Very Good</span><span>1 – 2 Days</span></div>
                <div class="wc-row"><span>5 - Excellent</span><span>Zero Unauthorized</span></div>
            </div>
        </div>
    </div>"""

    perf_grid_html += f"""
        <div class="pg-oe-bar">
            <span class="pg-oe-label" style='font-size:20px;'>OVERALL EFFECTIVENESS</span>
            <span class="pg-oe-val" style='font-size:20px;' id="pg-oe-score">{total_goal_score_str or "0"}</span>
        </div>
    </div>"""
    score_cards_html = f"""<div class="score-cards score-cards-single"><div class="score-cards">"""
    if doc.get("workflow_state") != "Draft" and not is_worker:
        score_cards_html +=f"""
        <div class="score-card">
            <div class="sc-label">OVERALL EFFECTIVENESS - SELF ASSESSMENT</div>
            <div class="sc-val">{self_score_str}</div>
            <div class="sc-sub">out of 5.00</div>
        </div>"""

    # ── Score Summary Cards ────────────────────────────────────────────────
    score_cards_html += f"""
        <div class="score-card">
            <div class="sc-label">OVERALL EFFECTIVENESS - ASSESSOR ASSESSMENT</div>
            <div class="sc-val" id="summary-total-goal">{total_goal_score_str}</div>
            <div class="sc-sub">out of 5.00</div>
        </div>
    </div></div>"""

    grade_js = safe_js(doc.get("custom_grade") or "")

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Appraisal – {safe(doc.employee_name)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&display=swap" rel="stylesheet"/>
    <style>
        :root {{
            --red:         #CE1426;
            --red-dark:    #8a0d1a;
            --red-mid:     #a81020;
            --red-deep:    #5e0911;
            --red-light:   #fdf0f2;
            --red-border:  #f5c2ca;
            --gold:        #c9a84c;
            --gold-lt:     #e8c97a;
            --gold-deep:   #8B6508;
            --gold-bright: #D4A017;
            --gold-pale:   #FBF0C0;
            --gold-dim:    rgba(201,168,76,0.15);
            --gold-glow:   rgba(201,168,76,0.40);
            --gold-border: rgba(201,168,76,0.50);
            --cream:       #faf8f4;
            --white:       #ffffff;
            --border:      #edd8b0;
            --text:        #1a1a2e;
            --label:       #6b7280;
            --muted:       #9ca3af;
            --odd-row:     #fff9f0;
            --even-row:    #ffffff;
            --green:       #2d7a4f;
            --amber:       #b45309;
            --self-blue:   #3b82f6;
            --shadow-sm:   0 1px 4px rgba(200,16,46,.08);
            --shadow-md:   0 4px 20px rgba(200,16,46,.12);
            --shadow-lg:   0 24px 64px rgba(200,16,46,.15);
            --shadow-gold: 0 4px 24px rgba(201,168,76,.30);
        }}
        *{{ box-sizing:border-box; margin:0; padding:0; }}
        body{{ font-family:'DM Sans',sans-serif; background:var(--cream); padding:40px 20px; color:var(--text); }}

        .gold-frame {{
            padding:5px; border-radius:26px;
            background: conic-gradient(from 0deg,#5c3d08 0deg,#c9a84c 40deg,#f5d97a 80deg,#e8c97a 110deg,#c9a84c 150deg,#8B6508 190deg,#D4A017 230deg,#f5d97a 260deg,#c9a84c 300deg,#8B6508 330deg,#5c3d08 360deg);
            box-shadow:0 0 0 1px rgba(201,168,76,.7),0 0 24px rgba(201,168,76,.45),0 0 60px rgba(201,168,76,.18),0 12px 48px rgba(200,16,46,.20);
            animation: frame-pulse 5s ease-in-out infinite;
        }}
        @keyframes frame-pulse {{
            0%,100% {{ box-shadow:0 0 0 1px rgba(201,168,76,.7),0 0 24px rgba(201,168,76,.45),0 0 60px rgba(201,168,76,.18),0 12px 48px rgba(200,16,46,.20); }}
            50%      {{ box-shadow:0 0 0 2px rgba(201,168,76,.9),0 0 36px rgba(201,168,76,.65),0 0 90px rgba(201,168,76,.30),0 12px 48px rgba(200,16,46,.25); }}
        }}
        .form{{ background:var(--white); border-radius:22px; overflow:hidden; box-shadow:var(--shadow-lg); }}

        .header{{
            background:linear-gradient(135deg,var(--red-dark) 0%,var(--red) 55%,#fdf5f6 100%);
            padding:32px 48px 28px; position:relative; overflow:hidden;
            border-bottom:3px solid var(--gold);
        }}
        .header::before{{ content:''; position:absolute; top:-80px; right:-80px; width:340px; height:340px; border-radius:50%; background:rgba(255,255,255,.05); pointer-events:none; }}
        .header::after{{ content:''; position:absolute; bottom:-60px; left:-60px; width:220px; height:220px; border-radius:50%; background:rgba(0,0,0,.07); pointer-events:none; }}
        .header-ring{{ position:absolute; top:-40px; right:80px; width:200px; height:200px; border-radius:50%; border:40px solid rgba(201,168,76,.06); pointer-events:none; }}
        .doc-meta{{ position:absolute; top:20px; right:40px; text-align:right; z-index:2; }}
        .doc-no{{ font-size:12px; font-weight:700;  letter-spacing:1.5px; }}
        .doc-status{{
        display:inline-block;
        margin-top:6px;
        padding:3px 13px;
        border-radius:20px;
        font-size:11px;
        font-weight:700;
        letter-spacing:.5px;
        }}

        /* Draft Status - Yellow */
        .doc-status.draft{{
            background:#D4A017;
            color:black;
            border:1px solid black;
        }}

        /* Approved Status - Green */
        .doc-status.approved{{
            background:#d4edda;
            color:dark-green;
            border:1px solid black;
        }}
        .logo-html{{
            position:absolute;
            right:1px;
            top:50px;
            padding:10px 18px;
            border-radius:8px;
            display:inline-flex;
            align-items:right;
            justify-content:right;
        }}

        .logo-html img{{
            max-height:60px;
            width:auto;
            display:block;
        }}
        .header-inner{{ display:flex; align-items:center; gap:28px; position:relative; z-index:1; }}
        .emp-avatar{{
            width:114px; height:114px; border-radius:50%; flex-shrink:0;
            background:linear-gradient(145deg,var(--red-dark),var(--red-mid));
            overflow:hidden; display:flex; align-items:center; justify-content:center;
            border:3px solid var(--gold);
            box-shadow:0 0 0 5px rgba(201,168,76,.22),0 0 0 9px rgba(201,168,76,.08),0 8px 28px rgba(0,0,0,.35);
        }}
        .emp-avatar img{{ width:100%; height:100%; object-fit:cover; border-radius:50%; }}
        .emp-avatar-initials{{ font-family:'Playfair Display',serif; font-size:36px; color:var(--gold); }}
        .header-info{{ flex:1; }}
        .emp-id{{ font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:var(--gold); margin-bottom:5px; }}
        .emp-name{{ font-family:'Playfair Display',serif; font-size:28px; color:#fff; margin-bottom:6px; line-height:1.2; }}
        .emp-sub{{ font-size:13px; color:rgba(255,255,255,.65); letter-spacing:.3px; }}
        .badges{{ display:flex; gap:9px; flex-wrap:wrap; margin-top:13px; }}
        .badge{{ padding:4px 13px; border-radius:20px; font-size:11px; font-weight:500; }}
        .badge-gold{{ background:rgba(201,168,76,.18); color:var(--gold-lt); border:1px solid rgba(201,168,76,.38); }}
        .badge-white{{ background:rgba(255,255,255,.12); color:rgba(255,255,255,.8); border:1px solid rgba(255,255,255,.2); }}
        .stripe{{ height:5px; background:linear-gradient(90deg,var(--red-dark) 0%,var(--red) 25%,var(--gold) 55%,var(--gold-lt) 75%,var(--gold) 90%,var(--red-dark) 100%); box-shadow:0 2px 8px rgba(201,168,76,.3); }}

        .body{{ padding:36px 48px 44px; }}
        .collapsible-section{{ margin-bottom:0; }}
        .collapsible-body{{ overflow:visible; transition:max-height .35s ease, opacity .25s ease; max-height:9999px; opacity:1; }}
        .collapsible-body.collapsed{{ max-height:0 !important; opacity:0; overflow:hidden !important; }}
        .section{{
            font-size:12px; font-weight:700; letter-spacing:3px; text-transform:uppercase;
            color:var(--red); display:flex; align-items:center; gap:12px;
            margin-bottom:18px; margin-top:32px; cursor:pointer; user-select:none;
        }}
        .section:first-child{{ margin-top:0; }}
        .section::after{{ content:''; flex:1; height:2px; background:linear-gradient(90deg,var(--gold-bright),rgba(201,168,76,.3),transparent); border-radius:2px; }}
        .coll-icon{{ font-size:10px; color:var(--gold); transition:transform .3s; flex-shrink:0; margin-left:4px; }}
        .coll-icon.rotated{{ transform:rotate(-90deg); }}

        .info-table{{
            width:100%; border-collapse:collapse;
            border:1.5px solid var(--gold-border);
            border-radius:12px; overflow:hidden; margin-bottom:4px;
            box-shadow:0 2px 12px rgba(201,168,76,.12);
        }}
        .info-table tr:nth-child(odd) td{{ background:var(--odd-row); }}
        .info-table tr:nth-child(even) td{{ background:var(--even-row); }}
        .info-table tr:last-child td{{ border-bottom:none; }}
        .info-table td{{
            padding:13px 20px; border-bottom:1px solid rgba(201,168,76,.2);
            border-right:1px solid rgba(201,168,76,.2); vertical-align:top; width:25%;
        }}
        .info-table td:last-child{{ border-right:none; }}
        .lbl{{ font-size:12px; font-weight:700; letter-spacing:1.8px; text-transform:uppercase; color:var(--gold-deep); margin-bottom:4px; }}
        .val{{ font-size:13.5px; font-weight:500; color:var(--text); }}
        .val.mono{{ font-family:'Courier New',monospace; font-size:13px; }}
        .assessor-cell{{ display:flex; align-items:center; gap:10px; }}
        .ass-avatar-sm{{
            width:38px; height:38px; border-radius:50%; flex-shrink:0;
            background:linear-gradient(145deg,var(--red-dark),var(--red));
            display:flex; align-items:center; justify-content:center;
            border:2px solid var(--gold); overflow:hidden;
            box-shadow:0 0 0 2px rgba(201,168,76,.2);
        }}
        .ass-avatar-sm img{{ width:100%; height:100%; object-fit:cover; border-radius:50%; }}
        .ass-initials-sm{{ font-family:'Playfair Display',serif; font-size:14px; color:var(--gold); }}
        .ass-name-sm{{ font-size:13px; font-weight:600; color:var(--text); }}
        .ass-id-sm{{ font-size:11px; color:var(--muted); margin-top:1px; }}

        /* ── GOALS TABLE ── */
        .table-scroll{{ overflow-x:auto; overflow-y:visible; }}
        .goals-table{{
            width:100%; table-layout:auto; border-collapse:collapse;
            border:1.5px solid var(--gold-border);
            border-radius:12px; font-size:13px;
            box-shadow:0 2px 12px rgba(201,168,76,.12);
        }}
        .goals-table thead tr{{ background:linear-gradient(135deg,var(--red-dark) 0%,var(--red) 100%); border-bottom:2px solid var(--gold); }}
        .goals-table thead th{{ padding:12px 14px; text-align:center; font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,.9); border-right:1px solid rgba(255,255,255,.12); white-space:nowrap; }}
        .goals-table thead th:first-child,.goals-table thead th:nth-child(2),.goals-table thead th:nth-child(3){{ text-align:left; }}
        .goals-table thead th:last-child{{ border-right:none; }}
        .goals-table tbody tr:nth-child(odd) td{{ background:var(--odd-row); }}
        .goals-table tbody tr:nth-child(even) td{{ background:var(--even-row); }}
        .goals-table tbody tr:hover td{{ background:#fce8eb; transition:background .15s; }}
        .goals-table tbody tr:last-child td{{ border-bottom:none; }}
        .goals-table tbody td{{ padding:10px 14px; border-bottom:1px solid rgba(201,168,76,.15); border-right:1px solid rgba(201,168,76,.15); vertical-align:middle; }}
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
        .kra-input {{
            width:100%; padding:5px 8px; border:1px solid var(--gold-border);
            border-radius:6px; font-size:12px; font-family:'DM Sans',sans-serif;
            background:#fff; color:var(--text); outline:none;
            transition:border-color .15s, box-shadow .15s;
        }}
        .kra-input:focus {{
            border-color:var(--gold); box-shadow:0 0 0 2px rgba(201,168,76,.18);
        }}
        .edit-cell {{
            position:relative;
            overflow:visible;
            white-space:normal;
        }}

        /* The dropdown is appended to <body> and uses position:fixed via JS */
        .kra-dropdown {{
            position:fixed;
            z-index:999999;
            background:#fff;
            border:1.5px solid var(--gold-border);
            border-radius:8px;
            box-shadow:0 8px 32px rgba(0,0,0,.18), 0 2px 8px rgba(201,168,76,.15);
            max-height:200px;
            overflow-y:auto;
            min-width:220px;
            display:none;
        }}
        .kra-dd-item {{
            padding:8px 12px; font-size:12px; cursor:pointer; color:var(--text);
            border-bottom:1px solid rgba(201,168,76,.1);
            transition:background .1s;
        }}
        .kra-dd-item:last-child {{ border-bottom:none; }}
        .kra-dd-item:hover {{ background:var(--odd-row); color:var(--red); }}
        .kra-dd-item.dd-empty {{ color:var(--muted); cursor:default; font-style:italic; }}

        /* ── PILLS ── */
        .score-pill{{ display:inline-block; padding:4px 12px; border-radius:20px; font-weight:700; font-size:11px; white-space:nowrap; }}
        .score-high{{ background:rgba(45,122,79,.12); color:var(--green); border:1px solid rgba(45,122,79,.25); }}
        .score-mid{{ background:rgba(201,168,76,.15); color:var(--gold-deep); border:1px solid rgba(201,168,76,.35); }}
        .score-low{{ background:rgba(200,16,46,.1); color:var(--red); border:1px solid rgba(200,16,46,.2); }}
        .score-sub{{ font-size:10px; color:var(--muted); margin-top:3px; text-align:center; }}

        /* ── STARS ── */
        .star-row{{ display:flex; gap:2px; font-size:18px; line-height:1; align-items:center; flex-wrap:nowrap; }}
        .kra-star{{ color:#e2d0b0; transition:color .12s, transform .1s; user-select:none; }}
        .self-stars .kra-star.checked{{ color:var(--self-blue); }}
        .self-stars .kra-star:hover{{ color:#93c5fd; transform:scale(1.2); }}
        .assessor-stars .kra-star.checked{{ color:var(--gold); }}
        .assessor-stars .kra-star:hover{{ color:var(--gold-lt); transform:scale(1.2); }}

        /* ── KRA CARDS ── */
        .kra-cards-grid{{ display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px; margin-bottom:8px; justify-items:center; }}
        .kra-card{{
            width:180px; border:1.5px solid var(--gold-border); border-top:3px solid var(--gold);
            border-radius:14px; padding:16px 12px 14px;
            background:linear-gradient(160deg,#fff 55%,#fff9ee 100%);
            box-shadow:var(--shadow-sm);
            display:flex; flex-direction:column; align-items:center; text-align:center; gap:4px;
            transition:box-shadow .2s, transform .15s, border-color .15s; cursor:default;
        }}
        .kra-card:hover{{ box-shadow:0 6px 28px rgba(201,168,76,.28),var(--shadow-md); transform:translateY(-3px); border-color:var(--gold-bright); }}
        .kra-card-icon{{ font-size:28px; line-height:1; margin-bottom:2px; }}
        .kra-card-title{{ font-size:12px; font-weight:700; color:var(--text); line-height:1.3; text-transform:uppercase; min-height:28px; display:flex; align-items:center; justify-content:center; }}
        .kra-card-score-wrap{{ margin-top:6px; width:100%; text-align:center; }}
        .kra-row-label{{ font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:var(--label); margin-top:4px; }}
        .kra-tooltip-panel{{
            margin-top:10px;
            background:linear-gradient(135deg,var(--red-dark),#2a1010);
            color:#f0e0c0; font-size:13px; line-height:1.7;
            padding:13px 18px; border-radius:10px;
            box-shadow:0 8px 28px rgba(0,0,0,.25);
            border:1px solid rgba(201,168,76,.35); transition:opacity .15s;
        }}
        .kra-tooltip-panel strong{{ color:var(--gold-lt); font-size:11px; letter-spacing:1px; text-transform:uppercase; display:block; margin-bottom:4px; }}

        /* ── SCORE CARDS ── */
        .score-cards{{ display:grid; grid-template-columns:repeat(2,1fr); gap:16px; margin-bottom:4px; }}
        .score-cards-single{{ grid-template-columns:1fr; max-width:320px; }}
        .score-card{{
            border:1.5px solid var(--gold-border); border-radius:14px;
            padding:24px 20px; text-align:center;
            background:linear-gradient(160deg,#fff 50%,#fff9ee 100%);
            box-shadow:var(--shadow-gold),var(--shadow-sm); position:relative; overflow:hidden;
        }}
        .score-card::before{{
            content:''; position:absolute; top:0; left:0; right:0; height:4px;
            background:linear-gradient(90deg,var(--red-dark),var(--red),var(--gold),var(--gold-lt),var(--gold),var(--red-dark));
            background-size:200% 100%; animation:shimmer-bar 3s linear infinite;
        }}
        @keyframes shimmer-bar{{ 0%{{ background-position:200% center; }} 100%{{ background-position:-200% center; }} }}
        .sc-label{{ font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--red); margin-bottom:10px; }}
        .sc-val{{ font-family:'Playfair Display',serif; font-size:32px; color:var(--text); }}
        .sc-sub{{ font-size:11px; color:var(--muted); margin-top:6px; }}

        /* ── PERFORMANCE GRID ── */
        .pg-wrap{{ border-radius:16px; overflow:hidden; border:1.5px solid var(--gold-border); box-shadow:0 4px 32px rgba(206,20,38,.10),var(--shadow-gold); margin-bottom:4px; }}
        .pg-table{{ width:100%; border-collapse:collapse; table-layout:fixed; font-size:13px; }}
        .pg-main-title{{
            background:linear-gradient(135deg,var(--red-dark) 0%,var(--red) 60%,#e8253c 100%);
            color:#fff; font-family:'Playfair Display',serif; font-size:14px; font-weight:700;
            letter-spacing:3px; text-transform:uppercase; text-align:center; padding:16px 20px;
            border-bottom:2px solid var(--gold);
        }}
        .pg-col-head{{ padding:18px 10px 14px; text-align:center; vertical-align:middle; width:20%; transition:background .15s; }}
        .pg-col-head:last-child{{ border-right:none !important; }}
        .pg-num-badge{{ display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:8px; color:#fff; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; margin-bottom:7px; }}
        .pg-col-label{{ display:block; font-size:12px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; margin-top:3px; }}
        .pg-desc-cell{{ vertical-align:top; padding:0; width:20%; }}
        .pg-desc-cell:last-child{{ border-right:none !important; }}
        .pg-desc-text{{ padding:14px 14px 18px; font-size:12px; line-height:1.7; }}
        .pg-oe-bar{{ display:flex; align-items:center; background:linear-gradient(135deg,var(--red-dark) 0%,var(--red) 55%,#9a1a00 100%); border-top:2px solid var(--gold); }}
        .pg-oe-label{{ flex:1; padding:14px 22px; font-family:'Playfair Display',serif; font-size:13px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:var(--gold-lt); }}
        .pg-oe-val{{ padding:14px 22px; font-family:'Playfair Display',serif; font-size:28px; font-weight:700; color:var(--gold-lt); border-left:1px solid rgba(201,168,76,.3); background:rgba(201,168,76,.1); line-height:1; }}

        .worker-criteria{{ margin-top:20px; border:1.5px solid var(--gold-border); border-radius:12px; padding:18px; background:linear-gradient(135deg,#fff9f0,#fff3e0); }}
        .wc-title{{ font-weight:700; font-size:13px; letter-spacing:1.5px; text-transform:uppercase; color:var(--red); margin-bottom:14px; }}
        .wc-grid{{ display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; }}
        .wc-card{{ background:#fff; border:1px solid var(--gold-border); border-radius:10px; padding:12px 14px; box-shadow:var(--shadow-sm); }}
        .wc-card-title{{ font-size:12px; font-weight:700; margin-bottom:8px; color:var(--red); }}
        .wc-row{{ display:flex; justify-content:space-between; font-size:11.5px; padding:4px 0; border-bottom:1px dashed #e5c880; }}
        .wc-row:last-child{{ border-bottom:none; }}

        .footer{{ border-top:2px solid var(--gold-border); padding:16px 48px; display:flex; justify-content:space-between; align-items:center; background:linear-gradient(90deg,#fff9f0,#fff6e8,#fff9f0); }}
        .footer-left{{ font-size:11px; color:var(--label); }}
        .footer-right{{ font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:var(--gold-deep); background:linear-gradient(135deg,var(--gold-pale),#fff8d0); border:1px solid var(--gold-border); padding:4px 14px; border-radius:20px; box-shadow:0 1px 6px rgba(201,168,76,.2); }}

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
        <div class="header-ring"></div>
        <div class="doc-meta">
            <div class="doc-no">📄 {safe(doc.name)}</div>
            <div class="doc-status {status_class}">● {status_label}</div>
            <div class="logo-html">{logo_image_html}</div>
        </div>
        <div class="header-inner">
            <div class="emp-avatar">{image_html}</div>
            <div class="header-info">
                <div class="emp-name">{safe(doc.employee_name)}</div>
                <div class="emp-sub">{safe(doc.get("designation") or "")} {"&nbsp;·&nbsp; " + frappe.db.get_value("Employee",doc.get("employee"),"custom_division") or ""}</div>
                <div class="badges">{badges}</div>
            </div>
        </div>
    </div>
    <div class="stripe"></div>
    
    <div class="body">

        <div class="collapsible-section">
            <div class="section collapsible-header" onclick="toggleSection(this)">
                <span style='font-size:15px;'>{translate_the_value("Employee Details")}</span><span class="coll-icon">▼</span>
            </div>
            <div class="collapsible-body">
                <table class="info-table">
                    <tr>
                        <td><div class="lbl">{translate_the_value("GEC No")}</div><div class="val">{translate_the_value(safe(doc.custom_gec_no) or "")}</div></td>
                        <td><div class="lbl">{translate_the_value("Employee Name")}</div><div class="val">{translate_the_value(safe(doc.employee_name))}</div></td>
                        <td><div class="lbl">{translate_the_value("Company")}</div><div class="val">{translate_the_value(safe(doc.company))}</div></td>
                        <td><div class="lbl">{translate_the_value("Grade")}</div><div class="val">{translate_the_value(safe(doc.get("custom_grade") or ""))}</div></td>
                    </tr>
                    <tr>
                        <td><div class="lbl">{translate_the_value("Unit")}</div><div class="val">{translate_the_value(safe(doc.get("custom_unit") or ""))}</div></td>
                        <td><div class="lbl">{translate_the_value("Project")}</div><div class="val">{translate_the_value(frappe.db.get_value("Employee",doc.get("employee"),"custom_division") or safe(doc.get("department") or ""))}</div></td>
                        <td><div class="lbl">{translate_the_value("Designation")}</div><div class="val">{translate_the_value(safe(doc.get("designation") or ""))}</div></td>
                        <td><div class="lbl">{translate_the_value("Assessment Date")}</div><div class="val">{translate_the_value(formatdate(doc.get("creation") or ""))}</div></td>
                    </tr>
                    <tr>
                        <td><div class="lbl">{translate_the_value("Date of Joining")}</div><div class="val">{translate_the_value(doj)}</div></td>
                        <td><div class="lbl">{translate_the_value("Qualification")}</div><div class="val">{translate_the_value(safe(doc.get("custom_qualification") or "-"))}</div></td>
                        <td><div class="lbl">{translate_the_value("Certifications")}</div><div class="val">{translate_the_value(safe(doc.get("custom_certifications") or "-"))}</div></td>
                        <td><div class="lbl">{translate_the_value("Experience")}</div><div class="val">{translate_the_value(exp_str)}</div></td>
                    </tr>
                    <tr>
                        <td>
                            <div class="lbl">📅 {translate_the_value("Appraisal Cycle")}</div>
                            <div class="val">{translate_the_value(safe(doc.get("appraisal_cycle") or "—"))}</div>
                        </td>
                        <td>
                            <div class="lbl">🗓️ {translate_the_value("Period")}</div>
                            
                             <div class="val">
                                {translate_the_value(start_date or "—")}
                                &nbsp;→&nbsp;
                                {translate_the_value(end_date or "—")}
                            </div>
                        </td>
                        <td>
                            <div class="lbl">🏅 {translate_the_value("Total Score")}</div>
                            <div class="val"
                                style="font-family:'Playfair Display',serif;font-size:20px;color:var(--gold-deep);"
                                id="hdr-total-score">
                                {translate_the_value(total_goal_score_str or "—")}
                            </div>
                        </td>

                        <td>
                            <div class="lbl">👤 {translate_the_value("Assessor")}</div>

                            <div class="assessor-cell">
                                <div class="ass-avatar-sm">
                                    {'<img src="' + assessor_image + '" alt="' + safe(reviewer_name) + '">' if assessor_image else '<div class="ass-initials-sm">' + (initials(reviewer_name) if reviewer_name else "?") + '</div>'}
                                </div>

                                <div>
                                    <div class="ass-name-sm">
                                        {translate_the_value(safe(reviewer_name) or "—")}
                                    </div>

                                    <div class="ass-id-sm">
                                        {translate_the_value(safe(reviewer_id))}
                                    </div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    
                    {translate_the_value(previous_rating_html)}

                </table>
            </div>
        </div>
        

        <div class="collapsible-section">
            <div class="section collapsible-header" onclick="toggleSection(this)">
                <span>Performance Grid</span><span class="coll-icon">▼</span>
            </div>
            <div class="collapsible-body">
                {perf_grid_html}
            </div>
        </div>

        {translate_the_value(kra_cards_html)}

        {translate_the_value(goals_section)}

        <div class="collapsible-section">
            <div class="section collapsible-header" onclick="toggleSection(this)">
                <span style='font-size:15px;'>{translate_the_value("Score Summary")}</span><span class="coll-icon">▼</span>
            </div>
            <div class="collapsible-body">
                 {translate_the_value(score_cards_html)}
            </div>
        </div>

    </div>

    <div class="footer">
        <div class="footer-left"> {translate_the_value("If anyone scores 1 & 2 in Safety it will not be considered as 4 & 5 in Overall Effectiveness rating.")}</div>
        <div class="footer-right">{translate_the_value("Note")}</div>
    </div>

</div>
</div>

<!-- ── Single shared dropdown portal (appended to body, avoids all overflow clipping) ── -->
<div class="kra-dropdown" id="kra-dd-portal"></div>

<script>
var APPRAISAL_NAME = "{safe_js(doc.name)}";
var ROW_MAP        = {row_map_json};
var SELF_EDITABLE  = {"true" if self_editable else "false"};
var ASSR_EDITABLE  = {"true" if assessor_editable else "false"};
var IS_WORKER      = {"true" if is_worker else "false"};
var KRA_LIST       = {kra_options_json};

/* ── Active dropdown state ── */
var _activeTblIdx  = null;
var _activeInput   = null;
var _portal        = document.getElementById('kra-dd-portal');

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

/* ── Position portal under the focused input ── */
function positionPortal(input) {{
    var rect = input.getBoundingClientRect();
    _portal.style.top    = (rect.bottom + 2) + 'px';
    _portal.style.left   = rect.left + 'px';
    _portal.style.width  = Math.max(rect.width, 240) + 'px';
}}

/* ── Show dropdown ── */
function showKraDropdown(input) {{
    _activeInput  = input;
    _activeTblIdx = parseInt(input.dataset.tbl);
    positionPortal(input);
    buildDropdownItems(input.value || '');
    _portal.style.display = 'block';
}}

/* ── Filter as user types ── */
function filterKraDropdown(input) {{
    if (_activeTblIdx !== parseInt(input.dataset.tbl)) {{
        showKraDropdown(input);
        return;
    }}
    positionPortal(input);
    buildDropdownItems(input.value || '');
    _portal.style.display = 'block';
}}

/* ── Build list items ── */
function buildDropdownItems(q) {{
    q = (q || '').trim().toLowerCase();
    var filtered = q ? KRA_LIST.filter(function(k) {{ return k.toLowerCase().indexOf(q) !== -1; }}) : KRA_LIST;
    if (!filtered.length) {{
        _portal.innerHTML = '<div class="kra-dd-item dd-empty">No KRA found</div>';
    }} else {{
        _portal.innerHTML = filtered.slice(0, 30).map(function(k) {{
            return '<div class="kra-dd-item" onmousedown="selectKra(this)">' + k + '</div>';
        }}).join('');
    }}
}}

/* ── Hide dropdown with delay (allows mousedown on item to fire first) ── */
function hideKraDropdownDelayed(input) {{
    setTimeout(function() {{
        if (_activeInput === input) {{
            _portal.style.display = 'none';
            _activeTblIdx = null;
            _activeInput  = null;
        }}
    }}, 200);
}}

/* ── Close on outside click ── */
document.addEventListener('mousedown', function(e) {{
    if (!_portal.contains(e.target) && e.target !== _activeInput) {{
        _portal.style.display = 'none';
        _activeTblIdx = null;
        _activeInput  = null;
    }}
}});

/* ── Close on scroll / resize (reposition or hide) ── */
window.addEventListener('scroll', function() {{
    if (_activeInput && _portal.style.display === 'block') {{
        positionPortal(_activeInput);
    }}
}}, true);
window.addEventListener('resize', function() {{
    if (_activeInput && _portal.style.display === 'block') {{
        positionPortal(_activeInput);
    }}
}});

/* ── SELECT KRA ── */
function selectKra(item) {{
    var tblIdx  = _activeTblIdx;
    var kraName = item.textContent.trim();

    /* Close portal */
    _portal.style.display = 'none';
    _activeTblIdx = null;

    /* Update input display */
    var input = document.querySelector('.kra-input[data-tbl="' + tblIdx + '"]');
    if (input) {{ input.value = kraName; _activeInput = null; }}

    /* Update ROW_MAP cache */
    if (ROW_MAP[tblIdx]) ROW_MAP[tblIdx].kra = kraName;

    var info = ROW_MAP[tblIdx];
    if (!info) return;

    /* Update Frappe model */
    var frm = getLiveForm();
    if (frm) {{
        frappe.model.set_value(info.cdt, info.name, "kra", kraName).then(function() {{
            frm.dirty();
            showSaveStatus();
        }});
        frappe.model.set_value("Appraisal Goal", info.name, "custom_is_new_goal", 1).then(function() {{
            frm.dirty();
            showSaveStatus();
        }});
    }} else {{
        frappe.model.set_value("Appraisal Goal", info.name, "kra", kraName);
        frappe.model.set_value("Appraisal Goal", info.name, "custom_is_new_goal", 1);
        showSaveStatus();
    }}

    /* Fetch description */
    frappe.call({{
        method: "pms_ai.custom.get_kra_description",
        args: {{ kra: kraName, grade: "{grade_js}" }},
        callback: function(r) {{
            if (r.message && r.message.length) {{
                var desc = r.message[0].description || "";
                var frm2 = getLiveForm();
                if (frm2) {{
                    frappe.model.set_value(info.cdt, info.name, "custom_description", desc)
                        .then(function() {{ frm2.dirty(); }});
                }} else {{
                    frappe.model.set_value("Appraisal Goal", info.name, "custom_description", desc);
                }}
                var descEl = document.getElementById("desc-cell-" + tblIdx);
                if (descEl) {{ descEl.textContent = desc; descEl.title = desc; }}
            }}
        }}
    }});
}}

/* ── SAVE STATUS ── */
function showSaveStatus() {{
    var status = document.getElementById("goals-save-status");
    if (status) {{
        status.style.display = 'inline';
        setTimeout(function() {{ status.style.display = 'none'; }}, 1500);
    }}
}}

/* ── Helpers ── */
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

/* ── ASSESSOR STAR SYNC ── */
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

/* ── SELF STAR SYNC ── */
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

/* ── STAR CLICK HANDLERS ── */
function starClick(starEl) {{
    if (!ASSR_EDITABLE) return;
    var tblIdx  = parseInt(starEl.dataset.tbl);
    var starVal = parseInt(starEl.dataset.val);
    syncAssessorUI(tblIdx, starVal);
    var info = ROW_MAP[tblIdx];
    if (!info) return;
    var frm = getLiveForm();
    if (frm) {{
        var rowObj = frappe.get_doc(info.cdt, info.name);
        if (rowObj) {{
            rowObj["custom_assessor_score"] = starVal / 5;
            rowObj["score"] = starVal;
        }}
        frm.dirty();
    }} else {{
        frappe.model.set_value(info.cdt, info.name, "custom_assessor_score", starVal / 5);
        frappe.model.set_value(info.cdt, info.name, "score", starVal);
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
        totalSelfWeighted += (r.self_stars || 0) * (r.weightage || 0);
        totalWeight       += (r.weightage || 0);
    }});
    var avgOf5    = totalWeight > 0 ? parseFloat((totalSelfWeighted / totalWeight).toFixed(2)) : 0;
    var selfScore = parseFloat((starVal / 5).toFixed(2));
    var frm = getLiveForm();
    if (frm) {{
        var rowObj = frappe.get_doc(info.cdt, info.name);
        if (rowObj) {{
            rowObj["custom_self_score"] = selfScore;
            rowObj["score"] = starVal;
        }}
        frm.doc["custom_total_self_score"] = avgOf5;
        var se = document.getElementById("summary-total-goal");
        if (se) se.textContent = avgOf5.toFixed(2);
        var oe = document.getElementById("pg-oe-score");
        if (oe) oe.textContent = avgOf5.toFixed(2);
        var hdr = document.getElementById("hdr-total-score");
        if (hdr) hdr.textContent = avgOf5.toFixed(2);
        frm.dirty();
    }} else {{
        frappe.model.set_value(info.cdt, info.name, "custom_self_score", selfScore);
        frappe.model.set_value(info.cdt, info.name, "score", starVal);
    }}
}}
</script>
</body>
</html>"""

    return html



import frappe
from deep_translator import GoogleTranslator

import re
from deep_translator import GoogleTranslator
import frappe
from deep_translator import GoogleTranslator

@frappe.whitelist()
def translate_the_value(value):

    def convert_to_arabic_numerals(val):
        en_to_ar = str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩")
        return str(val).translate(en_to_ar)

    try:

        if str(value).isdigit():
            return convert_to_arabic_numerals(value)

        arabic_text = GoogleTranslator(
            source='auto',
            target='ar'
        ).translate(str(value))

        arabic_text = convert_to_arabic_numerals(arabic_text)

        return arabic_text

    except Exception:
        return convert_to_arabic_numerals(value)