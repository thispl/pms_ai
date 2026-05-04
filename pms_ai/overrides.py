
import frappe
import json

from dateutil.relativedelta import relativedelta

import frappe
from frappe import _
from frappe.desk.reportview import get_match_cond
from frappe.model.document import Document
from frappe.query_builder.functions import Coalesce, Count
from frappe.utils import (
    DATE_FORMAT,
    add_days,
    add_to_date,
    cint,
    comma_and,
    date_diff,
    flt,
    get_link_to_form,
    getdate,
)

from hrms.hr.doctype.appraisal.appraisal import Appraisal
from frappe.utils import add_days, cint, cstr, flt, getdate, rounded, date_diff, money_in_words, formatdate, get_first_day,today

class CustomAppraisal(Appraisal):

    def calculate_total_score(self):
        total_weightage, total, goal_score_percentage = 0, 0, 0
        meta = frappe.get_meta("Appraisal Goal")
        number_of_stars = meta.get_options("score") or 5
        if self.rate_goals_manually:
            table = _("Goals")
            for entry in self.goals:
                if flt(entry.score) > flt(number_of_stars):
                    frappe.throw(
                        _("Row {0}: Goal Score cannot be greater than {1}").format(entry.idx, number_of_stars)
                    )

                entry.score_earned = flt(entry.score) * flt(entry.per_weightage) / 100
                total += flt(entry.score_earned)
                total_weightage += flt(entry.per_weightage)

        else:
            table = _("KRAs")
            for entry in self.appraisal_kra:
                goal_score_percentage += flt(entry.goal_score)
                total_weightage += flt(entry.per_weightage)

            self.goal_score_percentage = flt(goal_score_percentage, self.precision("goal_score_percentage"))
            # convert goal score percentage to total score out of 5
            total = flt(goal_score_percentage) / 20

        if total_weightage and flt(total_weightage, 2) != 100.0:
            frappe.throw(
                _("Total weightage for all {0} must add up to 100. Currently, it is {1}%").format(
                    table, total_weightage
                ),
                title=_("Incorrect Weightage Allocation"),
            )

        self.total_score = flt(total, self.precision("total_score"))
