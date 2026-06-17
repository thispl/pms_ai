# Copyright (c) 2026, TEAMPRO and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
import frappe
from frappe.utils import nowdate, getdate
from datetime import timedelta
from frappe import _
from frappe.utils import cint
class AppraisalSettings(Document):
	def validate(self):
		for row in self.sub_admin_details:
			user_doc = frappe.get_doc("User", row.user)
			if row.user:
				if row.status == "Active":
					existing_roles = [d.role for d in user_doc.roles]
					# If no role profile exists, add direct role
					if not user_doc.role_profiles:
						if "HR Manager" not in existing_roles:
							user_doc.append("roles", {
								"role": "HR Manager"
							})
							user_doc.save(ignore_permissions=True)
						
					# Handle role profiles in V16
					else:
						for row in user_doc.role_profiles:

							role_profile = frappe.get_doc(
								"Role Profile",
								row.role_profile
							)

							role_profile_roles = [
								d.role for d in role_profile.roles
							]

							if "HR Manager" not in role_profile_roles:
								user_doc.role_profiles =[]
								user_doc.append("roles", {
									"role": "HR Manager"
								})


						# Also ensure direct role exists
						if "HR Manager" not in existing_roles:
							user_doc.append("roles", {
								"role": "HR Manager"
							})

					user_doc.save(ignore_permissions=True)

				elif row.status == "Inactive":

					user_doc.roles = [
						d for d in user_doc.roles
						if d.role != "HR Manager"
					]

					user_doc.save(ignore_permissions=True)


@frappe.whitelist()
def update_assessor(assessor=None, unit=None, employee=None,remarks = None):

	if not assessor:
		frappe.throw(_("Assessor is mandatory"))
	user = frappe.db.get_value("Employee", assessor, "user_id")

	if user:
		user_doc = frappe.get_doc("User", user)

		# Existing direct roles
		existing_roles = [d.role for d in user_doc.roles]

		# If no role profile exists, add direct role
		if not user_doc.role_profiles:
			if "Appraisal Assessor" not in existing_roles:
				user_doc.append("roles", {
					"role": "Appraisal Assessor"
				})

		# Handle role profiles in V16
		else:
			for row in user_doc.role_profiles:

				role_profile = frappe.get_doc(
					"Role Profile",
					row.role_profile
				)

				role_profile_roles = [
					d.role for d in role_profile.roles
				]

				if "Appraisal Assessor" not in role_profile_roles:
					user_doc.role_profiles =[]
					user_doc.append("roles", {
						"role": "Appraisal Assessor"
					})


			# Also ensure direct role exists
			if "Appraisal Assessor" not in existing_roles:
				user_doc.append("roles", {
					"role": "Appraisal Assessor"
				})

		user_doc.save(ignore_permissions=True)

	filters = {
		"status": "Active"
	}

	
			
	message = []
	if employee:
		filters["name"] = employee
	# if unit:
	# 	filters["custom_unit"] = unit
	employees = frappe.get_all(
		"Employee",
		filters=filters,
		fields=["name", "grade", "date_of_joining","company","custom_unit"]
	)
	updated = 0

	assessor_doc = frappe.get_doc("Employee", assessor)
	
	# Validation
	if assessor_doc.grade in [
		"A1", "A2", "A3", "A4",
		"B1", "B2", "B3", "B4", "B5"
	]:
		message.append(
			_("{0}: Minimum assessor grade should be C1 and above").format(
				assessor_doc.employee_name
			)
		)
	doj = getdate(assessor_doc.date_of_joining)

	if (getdate(nowdate()) - doj).days < 90:
		message.append(
			_("{0}: Assessor should complete minimum 3 months in company").format(
			assessor_doc.employee_name
			)
		)
	
	for emp in employees:
		if assessor == emp.name:
			message.append(
				_("{0}: Assessor cannot be self").format(
					assessor_doc.employee_name
				)
			)

		if assessor_doc.company != emp.company:
			message.append(
				_("{0}: Assessor must belong to the same company").format(
					assessor_doc.employee_name
				)
			)

		if assessor_doc.status != "Active":
			message.append(
				_("{0}: Assessor must be an active employee").format(
					assessor_doc.employee_name
				)
			)
		if emp.grade in ["A1", "A2", "A3", "A4"]:
			appraisal_template = f"{emp.grade} - Worker"
		else:
			appraisal_template = f"{emp.grade} - {unit}"
		if not frappe.db.exists("Appraisal Template", appraisal_template):
			message.append(
				_("{0}: Cannot change Unit because Appraisal Template '{1}' does not exist").format(
					emp.name,
					appraisal_template
				)
			)
			continue
		# Assessor should be higher grade
		if emp.grade and assessor_doc.grade and emp.grade >= assessor_doc.grade:
			continue
		if assessor == emp.name:
			continue
		if assessor_doc.status != "Active":
			continue
		if assessor_doc.company != emp.company:
			continue
		emp_doc = frappe.get_doc("Employee",emp.name)
		emp_doc.reports_to = assessor
		emp_doc.custom_unit = unit
		emp_doc.custom_appraisal_template = appraisal_template
		emp_doc.save(ignore_permissions=True)
		if remarks:
			if frappe.db.exists("Appraisal", remarks):
				appraisal_doc = frappe.get_doc("Appraisal", remarks)
				appraisal_doc.custom_assessor = assessor
				appraisal_doc.custom_unit = unit
				appraisal_doc.appraisal_template = appraisal_template
				appraisal_doc.save(ignore_permissions=True)
		else:
			latest_appraisal = frappe.get_all(
				"Appraisal",
				filters={"employee": emp.name,"workflow_state":["in",["Draft","Pending for Assessor"]]},
				fields=["name"],
				order_by="creation desc",
				limit=1
			)

			if latest_appraisal:
				appraisal_doc = frappe.get_doc("Appraisal", latest_appraisal[0].name)
				appraisal_doc.custom_assessor = assessor
				appraisal_doc.custom_unit = unit
				appraisal_doc.appraisal_template = appraisal_template
				appraisal_doc.save(ignore_permissions=True)

		updated += 1

	frappe.db.commit()
	if updated>0:
		message.append(_("{0} employee(s) updated successfully").format(
			updated)
		)
	return message

@frappe.whitelist()
@frappe.validate_and_sanitize_search_inputs
def get_unit_heads(doctype, txt, searchfield, start, page_len, filters):

	unit_heads = frappe.get_all(
		"Unit",
		filters={
			"unit_head": ["is", "set"]
		},
		pluck="unit_head"
	)

	if not unit_heads:
		return []

	return frappe.db.sql("""
		SELECT
			name,
			employee_name
		FROM `tabEmployee`
		WHERE name IN %(unit_heads)s
		AND status = 'Active'
		AND (
			name LIKE %(txt)s
			OR employee_name LIKE %(txt)s
		)
		LIMIT %(start)s, %(page_len)s
	""", {
		"unit_heads": tuple(unit_heads),
		"txt": f"%{txt}%",
		"start": start,
		"page_len": page_len
	})


def validate_employee_eligibility(employee, cycle):

	emp = frappe.get_doc("Employee", employee)

	doj = getdate(emp.date_of_joining)
	year = getdate(nowdate()).year

	if cycle == "Annual Review":

		cutoff = getdate(f"{year}-10-01")

	elif cycle == "Semi-Annual Review":

		cutoff = getdate(f"{year}-04-01")

	if doj > cutoff:
		frappe.throw(
			f"Employee {employee} is not eligible for appraisal cycle"
		)

@frappe.whitelist()
def publish_appraisals(rollout_date=None, cycle=None):

	from frappe.utils import getdate, nowdate

	if not rollout_date:
		frappe.throw("Rollout Date is mandatory")

	today = getdate(nowdate())
	rollout_date = getdate(rollout_date)

	# Prevent publishing before rollout date
	if today < rollout_date:
		return f"Appraisals cannot be published before {rollout_date}"

	# Update Appraisal Cycle
	frappe.db.set_value(
		"Appraisal Cycle",
		cycle,
		{
			"custom_rollout_date": rollout_date,
			"custom_published": 1,
		}
	)

	# Get Appraisals
	appraisals = frappe.get_all(
		"Appraisal",
		filters={
			"appraisal_cycle": cycle
		},
		pluck="name"
	)

	updated = 0

	# Publish each appraisal
	for appraisal in appraisals:

		frappe.db.set_value(
			"Appraisal",
			appraisal,
			{
				"custom_rollout_date": rollout_date,
				"custom_published": 1,
			}
		)

		updated += 1

	frappe.db.commit()

	return f"{updated} appraisals published successfully"

	
@frappe.whitelist()
def lock_appraisals(cycle=None, locking_date=None, lock=0):

	from frappe.utils import getdate, nowdate

	# Convert dates
	today = getdate(nowdate())
	lock_date = getdate(locking_date) if locking_date else None

	# Manual override from button
	restricted = cint(lock)

	# Optional validation
	if restricted and lock_date and today < lock_date:
		return "Lock date not reached yet."

	# Update Appraisal Cycle
	frappe.db.set_value(
		"Appraisal Cycle",
		cycle,
		{
			"custom_locking_date": locking_date,
			"custom_restricted": restricted,
		}
	)

	# Fetch appraisals
	appraisals = frappe.get_all(
		"Appraisal",
		filters={
			"appraisal_cycle": cycle
		},
		pluck="name"
	)

	updated = 0

	for appraisal in appraisals:
		frappe.db.set_value(
			"Appraisal",
			appraisal,
			{
				"custom_restricted": restricted,
			}
		)

		updated += 1

	frappe.db.commit()

	if restricted:
		return f"{updated} appraisals locked successfully."
	else:
		return f"{updated} appraisals unlocked successfully."

import frappe
from frappe.utils import nowdate, getdate


@frappe.whitelist()
def auto_lock_appraisals():

	today = getdate(nowdate())

	# Get all appraisal cycles
	appraisal_cycles = frappe.get_all(
		"Appraisal Cycle",
		filters={
			"custom_locking_date": ["is", "set"],
			"custom_restricted": 0
		},
		fields=["name", "custom_locking_date"]
	)

	locked_count = 0

	for cycle in appraisal_cycles:

		lock_date = getdate(cycle.custom_locking_date)

		# If today's date reached/exceeded locking date
		if today >= lock_date:

			# Lock appraisal cycle
			frappe.db.set_value(
				"Appraisal Cycle",
				cycle.name,
				{
					"custom_restricted": 1
				}
			)

			# Get related appraisals
			appraisals = frappe.get_all(
				"Appraisal",
				filters={
					"appraisal_cycle": cycle.name
				},
				pluck="name"
			)

			# Lock all appraisals
			for appraisal in appraisals:

				frappe.db.set_value(
					"Appraisal",
					appraisal,
					{
						"custom_restricted": 1
					}
				)

			locked_count += len(appraisals)

	frappe.db.commit()

	return f"{locked_count} appraisals auto locked successfully"

import frappe
from frappe.utils import nowdate, getdate


@frappe.whitelist()
def auto_publish_appraisals():

	today = getdate(nowdate())

	# Get appraisal cycles not yet published
	appraisal_cycles = frappe.get_all(
		"Appraisal Cycle",
		filters={
			"custom_rollout_date": ["is", "set"],
			"custom_published": 0
		},
		fields=["name", "custom_rollout_date"]
	)

	published_count = 0

	for cycle in appraisal_cycles:

		rollout_date = getdate(cycle.custom_rollout_date)

		# Publish only when rollout date reached
		if today >= rollout_date:

			# Publish appraisal cycle
			frappe.db.set_value(
				"Appraisal Cycle",
				cycle.name,
				{
					"custom_published": 1
				}
			)

			# Get related appraisals
			appraisals = frappe.get_all(
				"Appraisal",
				filters={
					"appraisal_cycle": cycle.name
				},
				pluck="name"
			)

			# Publish all appraisals
			for appraisal in appraisals:

				frappe.db.set_value(
					"Appraisal",
					appraisal,
					{
						"custom_rollout_date": rollout_date,
						"custom_published": 1,
					}
				)

			published_count += len(appraisals)

	frappe.db.commit()

	return f"{published_count} appraisals auto published successfully"


@frappe.whitelist()
def get_data(reports_to,employee):
	assessor_gec = frappe.db.get_value("Employee",reports_to,'custom_gec_no') or ''
	assessor_name = frappe.db.get_value("Employee",reports_to,'employee_name') or ''
	app_id = frappe.db.get_value("Appraisal",{'employee':employee},['name']) or ''
	appraisal_status = frappe.db.get_value("Appraisal",{'employee':employee},['workflow_state']) or ''

	return assessor_gec, assessor_name, app_id, appraisal_status

@frappe.whitelist()
def get_appraisal_data(employee):
	reports_to = frappe.db.get_value("Employee",employee,'reports_to') or ''
	assessor_gec = frappe.db.get_value("Employee",reports_to,'custom_gec_no') or ''
	assessor_name = frappe.db.get_value("Employee",reports_to,'employee_name') or ''
	latest_appraisal = frappe.get_all(
		"Appraisal",
		filters={"employee": employee,"workflow_state":["in",["Draft","Pending for Assessor"]]},
		fields=["name","workflow_state"],
		order_by="creation desc",
		limit=1
	)

	if latest_appraisal:
		app_id = latest_appraisal[0].name
		appraisal_status = latest_appraisal[0].workflow_state
	else:
		app_id = None
		appraisal_status = ""

	return assessor_gec, assessor_name, app_id, appraisal_status