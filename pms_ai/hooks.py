app_name = "pms_ai"
app_title = "PMS"
app_publisher = "TEAMPRO"
app_description = "Performance Management System enhanced with AI"
app_email = "erp@groupteampro.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "pms_ai",
# 		"logo": "/assets/pms_ai/logo.png",
# 		"title": "PMS",
# 		"route": "/pms_ai",
# 		"has_permission": "pms_ai.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/pms_ai/css/pms_ai.css"
app_include_js = ["/assets/pms_ai/js/custom_workspace.js","/assets/pms_ai/js/desktop_redirect.js"]
# login_redirect_url = "/app/pms-dashboard"

# include js, css files in header of web template
# web_include_css = "/assets/pms_ai/css/pms_ai.css"
# web_include_js = "/assets/pms_ai/js/pms_ai.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "pms_ai/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}
doctype_js = {
    "Appraisal" : "public/js/appraisal.js",
}
# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "pms_ai/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
home_page = "desk/pms-dashboard"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "pms_ai.utils.jinja_methods",
# 	"filters": "pms_ai.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "pms_ai.install.before_install"
# after_install = "pms_ai.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "pms_ai.uninstall.before_uninstall"
# after_uninstall = "pms_ai.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "pms_ai.utils.before_app_install"
# after_app_install = "pms_ai.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "pms_ai.utils.before_app_uninstall"
# after_app_uninstall = "pms_ai.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "pms_ai.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
	"Appraisal": {
		"validate": ["pms_ai.custom.update_appraisal_score","pms_ai.custom.update_appraisal_approved_date","pms_ai.custom.update_empty_fields_value",
		"pms_ai.custom.update_appraisal_from_kra","pms_ai.custom.populate_objectives","pms_ai.custom.set_template_by_default"],
		"on_submit": "pms_ai.custom.validate_total_score_for_assessor",		
		"after_insert":["pms_ai.custom.update_appraisal_from_kra"],
        "on_update":"pms_ai.custom.appraisal_rating_update",
        "before_save":"pms_ai.public.py.appraisal.tracking_remarks"
	},
	"Appraisal Cycle":{
		"validate":"pms_ai.custom.set_template_by_default_in_appraisal_cycle"
	}
}

# Scheduled Tasks
# ---------------

scheduler_events = {
# 	"all": [
# 		"pms_ai.tasks.all"
# 	],
	"daily": [
		"pms_ai.custom.update_overdue_appraisals",
		'pms_ai.public.py.appraisal.self_assessment_pending_email_notification',
		'pms_ai.public.py.appraisal.assessor_email_notification',
		'pms_ai.public.py.appraisal.hr_incomplete_approval_email_notification',
		'pms_ai.public.py.appraisal.hr_delayed_assessment_email_notification',
		"pms_ai.pms.doctype.appraisal_settings.appraisal_settings.auto_lock_appraisals",
		"pms_ai.pms.doctype.appraisal_settings.appraisal_settings.auto_publish_appraisals"
	],
# 	"hourly": [
# 		"pms_ai.tasks.hourly"
# 	],
# 	"weekly": [
# 		"pms_ai.tasks.weekly"
# 	],
# 	"monthly": [
# 		"pms_ai.tasks.monthly"
# 	],
}

# Testing
# -------

# before_tests = "pms_ai.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "pms_ai.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "pms_ai.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "pms_ai.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["pms_ai.utils.before_request"]
# after_request = ["pms_ai.utils.after_request"]

# Job Events
# ----------
# before_job = ["pms_ai.utils.before_job"]
# after_job = ["pms_ai.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"pms_ai.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Translation
# ------------
# List of apps whose translatable strings should be excluded from this app's translations.
# ignore_translatable_strings_from = []

