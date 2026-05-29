$(document).on("page-change", function () {
    const route = frappe.get_route();

    // if (route[0] === "Workspaces" || route[0] === "workspace") {
        frappe.ui.toolbar.toggle_full_width(true);
    // }
});