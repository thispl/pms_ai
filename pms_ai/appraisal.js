frappe.ui.form.on("Appraisal", {
	refresh(frm) {
		if (!frm.doc.__islocal) {
            if (frappe.has_role('System Manager')) {
                frm.trigger("add_custom_buttons");
            }
            
			frm.trigger("show_feedback_history");
			frm.trigger("setup_chart");
		}

		// don't allow removing image (fetched from employee)
		frm.sidebar.image_wrapper.find(".sidebar-image-actions").addClass("hide");
	},
});