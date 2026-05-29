frappe.provide("frappe.ui.toolbar");

// Override the desktop button click
$(document).on("click", ".navbar-home, [data-label='Desktop']", function(e) {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = "/desk/pms-dashboard";
});

// Also override if user navigates to /app directly
frappe.router.on("change", function() {
    if (frappe.get_route_str() === "" || frappe.get_route_str() === "desktop") {
        window.location.href = "/desk/pms-dashboard";
    }
});