frappe.ui.form.on('Appraisal', {


    form_render(frm) {
        let grid = frm.fields_dict.goals.grid;
        console.log('grid:', grid, 'grid_rows:', grid.grid_rows);
        if (!grid || !grid.grid_rows) return;

        grid.grid_rows.forEach((row, index) => {
            let isEvenRow = index % 2 === 0;

            row.wrapper.css('background-color', '');

            if (isEvenRow) {
                row.wrapper.css('background-color', '#f2f2f2');
            }
        });
    },
    onload_post_render: function (frm) {
        setTimeout(() => {

            // ✅ Collapse sidebar (already working)
            document.querySelector('.collapse-sidebar-link')?.click();

            // 🔥 FORCE DESK FULL WIDTH (v16)
            localStorage.setItem("full_width", "1");

            document.body.classList.add("full-width");

            // Remove boxed container limits
            document.querySelectorAll('.layout-main-section').forEach(el => {
                el.style.maxWidth = "100%";
                el.style.width = "100%";
            });

        }, 500);

        let grid = frm.fields_dict.goals.grid;
        console.log('grid:', grid, 'grid_rows:', grid.grid_rows);
        if (!grid || !grid.grid_rows) return;

        grid.grid_rows.forEach((row, index) => {
            let isEvenRow = index % 2 === 0;

            row.wrapper.css('background-color', '');

            if (isEvenRow) {
                row.wrapper.css('background-color', '#f2f2f2');
            }
        });



    },
    onload(frm) {
        hide_worker_only_rows(frm)
        let grid = frm.fields_dict.goals.grid;

        if (!grid || !grid.grid_rows) return;

        grid.grid_rows.forEach((row, index) => {
            let isEvenRow = index % 2 === 0;


            // Reset background first
            row.wrapper.css('background-color', '');

            if (isEvenRow) {
                row.wrapper.css('background-color', '#f2f2f2');
            }
        });
        frm.get_field('goals')
            .grid
            .update_docfield_property('per_weightage', 'hidden', 1);

        frm.refresh_field('goals');
        // frm.get_field('goals')
        //    .grid
        //    .update_docfield_property('score', 'hidden', 1);

        // frm.refresh_field('goals');
        frm.get_field('goals')
            .grid
            .update_docfield_property('score_earned', 'hidden', 1);

        frm.refresh_field('goals');
        frm.get_field('custom_additional_goals_for_worker_')
            .grid
            .update_docfield_property('per_weightage', 'hidden', 1);

        frm.refresh_field('custom_additional_goals_for_worker_');
        // frm.get_field('custom_additional_goals_for_worker_')
        //    .grid
        //    .update_docfield_property('score', 'hidden', 1);

        // frm.refresh_field('custom_additional_goals_for_worker_');
        frm.get_field('custom_additional_goals_for_worker_')
            .grid
            .update_docfield_property('score_earned', 'hidden', 1);

        frm.refresh_field('goals');

        set_goals_columns(frm);
        if (frm.is_new() && frm.doc.appraisal_template) {
            // set_template_by_default(frm);
            frappe.db.get_doc('Appraisal Template', frm.doc.appraisal_template)
                .then(template => {

                    if (!template) return;

                    frm.doc.goals.forEach((row, i) => {
                        if (template.goals[i]) {
                            row.custom_description = template.goals[i].custom_description || "";
                            row.custom_unit = template.goals[i].custom_unit || "";
                        }
                    });

                    frm.refresh_field('goals');
                });
        }
    },

    refresh(frm) {

        if (!frm.doc.custom_objectives && frm.doc.custom_objectives.length === 0 && ["C1", "C2", "C3", "D1", "D2", "D3", "E1", "E2"].includes(frm.doc.custom_grade)) {
            frm.clear_table('custom_objectives');

            // Fetch all Objectives
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Objectives', // change if different
                    fields: ['name', 'description'],
                    order_by: "creation" // adjust fields
                },
                callback: function (r) {
                    if (r.message) {
                        r.message.forEach(obj => {
                            let row = frm.add_child('custom_objectives');
                            row.objective = obj.name;
                            row.description = obj.description;
                        });

                        frm.refresh_field('custom_objectives');
                    }
                }
            });
        }

        const fields = [
            'custom_significant_achievements',
            'remarks',
            'custom_targets',
            'custom_employee_comments',
            'custom_accessor_comments',
            'custom_objectives'
        ];

        fields.forEach((field, index) => {
            if (frm.fields_dict[field]) {
                let label = frm.fields_dict[field].$wrapper.find('.control-label');

                // Apply styles directly
                label.css({
                    "font-size": "13px",
                    "font-weight": "700",
                    "letter-spacing": "3px",
                    "text-transform": "uppercase",
                    "color": "var(--red)",
                    "display": "flex",
                    "align-items": "center",
                    "gap": "12px",
                    "margin-bottom": "18px",
                    "margin-top": index === 0 ? "0px" : "32px"
                });

                // Add line (simulate ::after)
                if (!label.find('.line-after').length) {
                    label.append(`
                        <span class="line-after" style="
                            flex:1;
                            height:1px;
                            background:linear-gradient(90deg,var(--red-border),transparent);
                        "></span>
                    `);
                }
            }
        });
        $('.grid-heading .grid-row-head th').css('background-color', '#8e1b2e !important');
        if (frm.doc.appraisal_cycle && frm.doc.employee) {
            //     frappe.call({
            // method: "pms_ai.custom.appraisal_html_template",
            // args: { appraisal_name: frm.doc.name },
            // callback: (r) => {
            //     // r.message contains the full HTML string
            //     // let w = window.open();
            //     // w.document.write(r.message);
            //     frm.get_field('custom_appraisal_preview').$wrapper.html(r.message);
            //  }
            // });
            frappe.call({
                method: "pms_ai.custom.appraisal_html_template_employee_overview",
                args: { appraisal_name: frm.doc.name },
                callback: (r) => {
                    // r.message contains the full HTML string
                    // let w = window.open();
                    // w.document.write(r.message);
                    frm.get_field('custom_employee_overview').$wrapper.html(r.message);
                }
            });
        }
        // ── Inject a <style> block once to force navy header on all 3 grids ──────────
        // Using !important via a style tag beats Frappe's inline + specificity overrides
        (function injectGridStyles() {
            if (document.getElementById('appraisal-grid-styles')) return;  // inject once

            var style = document.createElement('style');
            style.id = 'appraisal-grid-styles';
            style.textContent = `
        /* ── Navy header for goals, achievements, targets grids ── */
        [data-fieldname="goals"] .grid-heading,
        [data-fieldname="goals"] .grid-heading .grid-row,
        [data-fieldname="goals"] .grid-heading .col,
        [data-fieldname="goals"] .grid-heading .row-index,
        [data-fieldname="goals"] .grid-heading .row-check,
        [data-fieldname="custom_significant_achievements"] .grid-heading,
        [data-fieldname="custom_significant_achievements"] .grid-heading .grid-row,
        [data-fieldname="custom_significant_achievements"] .grid-heading .col,
        [data-fieldname="custom_significant_achievements"] .grid-heading .row-index,
        [data-fieldname="custom_significant_achievements"] .grid-heading .row-check,
        [data-fieldname="custom_targets"] .grid-heading,
        [data-fieldname="custom_targets"] .grid-heading .grid-row,
        [data-fieldname="custom_targets"] .grid-heading .col,
        [data-fieldname="custom_targets"] .grid-heading .row-index,
        [data-fieldname="custom_targets"] .grid-heading .row-check {
            background-color: #8e1b2e !important;
            background:       #8e1b2e !important;
            color:            #ffffff !important;
            font-weight:      600 !important;
            font-size:        11px !important;
            letter-spacing:   0.5px !important;
            text-transform:   uppercase !important;
            border-color:     rgba(255,255,255,0.1) !important;
        }

        /* Label text inside header cells */
        [data-fieldname="goals"] .grid-heading .col .static-area,
        [data-fieldname="goals"] .grid-heading .col label,
        [data-fieldname="custom_significant_achievements"] .grid-heading .col .static-area,
        [data-fieldname="custom_significant_achievements"] .grid-heading .col label,
        [data-fieldname="custom_targets"] .grid-heading .col .static-area,
        [data-fieldname="custom_targets"] .grid-heading .col label {
            color:          #ffffff !important;
            font-weight:    600 !important;
            font-size:      11px !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
        }

        /* Sort icon in header */
        [data-fieldname="goals"] .grid-heading .col .sort-indicator,
        [data-fieldname="custom_significant_achievements"] .grid-heading .col .sort-indicator,
        [data-fieldname="custom_targets"] .grid-heading .col .sort-indicator {
            color: rgba(255,255,255,0.6) !important;
        }
    `;
            document.head.appendChild(style);
        })();


        // ── Helper: alternating row colors (body rows only) ───────────────────────────
        function colorGrid(frm, fieldname) {
            var grid = frm.fields_dict[fieldname];
            if (!grid || !grid.grid) return;

            setTimeout(function () {
                var $wrapper = $(grid.grid.wrapper);

                // Body rows: alternating white / light blue
                var $rows = $wrapper.find('.grid-body .rows .grid-row');
                $rows.each(function (i) {
                    var $row = $(this);
                    var bg = (i % 2 === 0) ? '#fdf5f6' : '#ffffff';

                    $row.css({ 'background-color': bg });
                    $row.find('div').css({ 'background-color': bg });
                    $row.find('input, select, textarea, .like-disabled-input, .form-control').css({
                        'background-color': bg
                    });
                });

            }, 150);
        }

        // ── Apply on load ─────────────────────────────────────────────────────────────
        colorGrid(frm, 'goals');
        colorGrid(frm, 'custom_significant_achievements');
        colorGrid(frm, 'custom_targets');
        colorGrid(frm, 'custom_additional_goals_for_worker_');
        colorGrid(frm, 'custom_objectives');

        // ── Re-apply on change / add / delete ────────────────────────────────────────
        ['goals', 'custom_significant_achievements', 'custom_targets', 'custom_additional_goals_for_worker_'].forEach(function (fieldname) {
            var grid = frm.fields_dict[fieldname];
            if (!grid || !grid.grid || !grid.grid.wrapper) return;

            grid.grid.wrapper.on('change', function () {
                colorGrid(frm, fieldname);
            });

            grid.grid.wrapper.on('click', '.grid-add-row, .grid-delete-row, .btn-open-row', function () {
                colorGrid(frm, fieldname);
            });
        });
        hide_worker_only_rows(frm)

        frm.fields_dict.remarks.$input.css('background-color', "#fdf5f6");

        frm.fields_dict.custom_employee_comments.$input.css('background-color', "#fdf5f6");
        frm.fields_dict.custom_accessor_comments.$input.css('background-color', "#fdf5f6");
        $(frm.wrapper).find('.control-label').css('font-weight', 'bold');

        $('<style>').text(`
            .frappe-control:not(.read-only) input,
            .frappe-control:not(.read-only) select,
            
            .frappe-control:not(.read-only) .control-input {
                border: 1px solid #d1d8dd !important;
                border-radius: 10px !important;
                background-color: transparent !important;
                box-shadow: none !important;
            }

            /* Optional: Style read-only differently */
            .frappe-control.read-only .control-value,
            .frappe-control .like-disabled-input {
                border: 1px solid #d1d8dd !important;
                border-radius: 10px !important;
            }
        `).appendTo('head');

        frappe.ui.toolbar.full_width = true;
        $(".btn-toggle-sidebar").hide();
        $(".layout-side-section").hide();
        if (!frappe.user.has_role("System Manager")) {
            frm.remove_custom_button("View Goals");
        }
        // Hide timeline safely
        if (frm.timeline && frm.timeline.wrapper) {
            frm.timeline.wrapper.hide();
        }

        // Hide comments safely  
        $(frm.wrapper).find('.form-footer').hide();
        $(frm.wrapper).find('.comment-box').hide();
        if (!frm.doc.__islocal && frm.doc.docstatus != 2 && ["A1", "A2", "A3", "A4"].includes(frm.doc.custom_grade)) {
            frm.add_custom_button(__("Print"), function () {
                var print_format = "Appraisal";
                window.open(frappe.urllib.get_full_url("/api/method/frappe.utils.print_format.download_pdf?" +
                    "doctype=" + encodeURIComponent("Appraisal") +
                    "&name=" + encodeURIComponent(frm.doc.name) +
                    "&trigger_print=1" +
                    "&format=" + print_format +
                    "&no_letterhead=0"
                ));
            });
            frm.add_custom_button(__("PDF"), function () {
                const docname = (frm.doc.name);

                const url = frappe.urllib.get_full_url(
                    "/api/method/pms_ai.custom.download_pdf"
                    + "?filters=" + encodeURIComponent(docname)
                );

                window.open(url);

            });
        }
        const buttonsToHide = ['Help'];

        buttonsToHide.forEach(label => {
            const btn = frm.page.actions.find(`[data-label='${label}']`);

            if (btn && btn.length) {
                btn.hide(); // hide the button itself

                let parent = btn.parent();
                if (parent) parent.hide();

                let grandParent = parent.parent();
                if (grandParent) grandParent.hide();
            }
        });
        frm.fields_dict['goals'].grid.wrapper.find('.btn-open-row').hide();

        // Keep hiding on re-render
        $(frm.fields_dict['goals'].grid.wrapper).on('grid-row-render', function () {
            $(this).find('.btn-open-row').hide();
        });

        // Hide settings/configure column button
        frm.fields_dict['goals'].grid.wrapper.find('.grid-static-col.pointer').hide();
        $(frm.fields_dict['goals'].grid.wrapper).on('grid-row-render', function () {
            $(this).find('.grid-static-col.pointer').hide();
        });

        // Set column widths and sticky


        // Also hide on every row render
        $(frm.fields_dict['goals'].grid.wrapper).on('grid-row-render', function () {
            $(this).find('.btn-open-row').hide();
        });
        frm.fields_dict["goals"].grid.cannot_add_rows = true;
        frm.fields_dict["goals"].grid.wrapper.find('.grid-remove-rows').hide();
        frm.fields_dict["goals"].grid.only_sortable = false;
        frm.fields_dict["goals"].refresh();

        frm.fields_dict["custom_objectives"].grid.cannot_add_rows = true;
        frm.fields_dict["custom_objectives"].grid.wrapper.find('.grid-remove-rows').hide();
        frm.fields_dict["custom_objectives"].grid.only_sortable = false;
        frm.fields_dict["custom_objectives"].refresh();

        frm.get_field('goals')
            .grid
            .update_docfield_property('per_weightage', 'hidden', 1);

        frm.refresh_field('goals');
        // frm.get_field('goals')
        //    .grid
        //    .update_docfield_property('score', 'hidden', 1);

        frm.refresh_field('goals');
        frm.get_field('goals')
            .grid
            .update_docfield_property('score_earned', 'hidden', 1);

        frm.refresh_field('goals');

        set_goals_columns(frm);

        set_goals_columns_in_custom_objectives(frm);


        if (!frm.doc.__islocal) {
            let html_content;
            if (frm.doc.custom_unit == "Worker") {
                html_content = `
                    <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px; border:1px solid black;">
                        <tr style="background:#8DB4E2; font-weight:bold;">
                            <td colspan="5" style="border:1px solid black;">PERFORMANCE GRID</td>
                        </tr>
                        <tr style="background:#C5D9F1; font-weight:bold;">
                            <td style="border:1px solid black;">1. Poor</td>
                            <td style="border:1px solid black;">2. Acceptable</td>
                            <td style="border:1px solid black;">3. Good</td>
                            <td style="border:1px solid black;">4. Very Good</td>
                            <td style="border:1px solid black;">5. Excellent</td>
                        </tr>
                        <tr style="text-align:left;">
                            <td style="border:1px solid black; padding:10px;">Performance is below expectations; behavior is contrary to company standards.</td>
                            <td style="border:1px solid black; padding:10px;">Inconsistent demonstration of this value; requires coaching or behavioral adjustment.</td>
                            <td style="border:1px solid black; padding:10px;">Consistently demonstrates this value in day-to-day work; meets the standard.</td>
                            <td style="border:1px solid black; padding:10px;">Frequently goes above and beyond standard requirements regarding this value.</td>
                            <td style="border:1px solid black; padding:10px;">Consistently far exceeds expectations; acts as a role model and champions this value to others.</td>
                        </tr>
                    </table>
                    <br>
                    <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px; border:1px solid black;">
                        <tr style="background:#C5D9F1; font-weight:bold;">
                            <td colspan="5" style="border:1px solid black;">EVALUATION CRITERIA</td>
                        </tr>
                        <tr style="font-weight:bold;">
                            <td style="border:1px solid black;">1. Poor</td>
                            <td style="border:1px solid black;">2. Acceptable</td>
                            <td style="border:1px solid black;">3. Good</td>
                            <td style="border:1px solid black;">4. Very Good</td>
                            <td style="border:1px solid black;">5. Excellent</td>
                        </tr>
                        <tr style="background:#B1A0C7; font-weight:bold;">
                            <td colspan="5" style="border:1px solid black;">PRODUCTIVITY % (Range)</td>
                        </tr>
                        <tr>
                            <td style="border:1px solid black;">Below 86%</td>
                            <td style="border:1px solid black;">From 87% to 90%</td>
                            <td style="border:1px solid black;">From 91% to 100%</td>
                            <td style="border:1px solid black;">From 101% to 120%</td>
                            <td style="border:1px solid black;">Above 120%</td>
                        </tr>
                        <tr style="background:#FFCC99; font-weight:bold;">
                            <td colspan="5" style="border:1px solid black;">ABSENCES</td>
                        </tr>
                        <tr>
                            <td style="border:1px solid black;">7 Days +</td>
                            <td style="border:1px solid black;">5 to 6 Days</td>
                            <td style="border:1px solid black;">3 to 4 Days</td>
                            <td style="border:1px solid black;">1 to 2 Days</td>
                            <td style="border:1px solid black;">Zero Unauthorized</td>
                        </tr>
                    </table>
                    
                    

                <br><br>
                <table style="width:100%; border-collapse:collapse; text-align:center; font-size:18px; border:1px solid black;">
                    <tr style="background:#C5D9F1; height:60px;"> <!-- Increase height here -->
                        <td style="width:80%; border:1px solid black; font-weight:bold; padding:15px 5px;">
                            OVERALL EFFECTIVENESS
                        </td>
                        <td style="width:20%; border:1px solid black; font-weight:bold; font-size:18px; vertical-align:middle; padding:15px 5px;">
                            ${frm.doc.total_score}<br>
                        </td>
                    </tr>
                </table>
                `;
            }
            else if (["B1", "B2", "B3", "B4", "B5"].includes(frm.doc.custom_grade)) {
                html_content = `
                <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px; border:1px solid black;">
                    <tr style="background:#FFFF00; font-weight:bold;">
                        <td colspan="5" style="border:1px solid black;">PERFORMANCE GRID</td>
                    </tr>
                    <tr style="background:#fffe9a; font-weight:bold;">
                        <td style="border:1px solid black;">1. Poor</td>
                        <td style="border:1px solid black;">2. Acceptable</td>
                        <td style="border:1px solid black;">3. Good</td>
                        <td style="border:1px solid black;">4. Very Good</td>
                        <td style="border:1px solid black;">5. Excellent</td>
                    </tr>
                    <tr style="text-align:left;">
                        <td style="border:1px solid black; padding:10px;">Performance is below expectations; behavior is contrary to company standards.</td>
                        <td style="border:1px solid black; padding:10px;">Inconsistent demonstration of this value; requires coaching or behavioral adjustment.</td>
                        <td style="border:1px solid black; padding:10px;">Consistently demonstrates this value in day-to-day work; meets the standard.</td>
                        <td style="border:1px solid black; padding:10px;">Frequently goes above and beyond standard requirements regarding this value.</td>
                        <td style="border:1px solid black; padding:10px;">Consistently far exceeds expectations; acts as a role model and champions this value to others.</td>
                    </tr>
                </table>
                
                <br>
                <br>
                
                <table style="width:100%; border-collapse:collapse; text-align:center; font-size:18px;border:1px solid black;">
                    <tr style="background:#fffe9a;">
                        <td  style="width:80%;border:1px solid black; font-weight:bold;">OVERALL EFFECTIVENESS</td>
                        <td  style="width:20%;border:1px solid black; font-weight:bold;font-size:18px;vertical-align:middle; ">
                            ${frm.doc.total_score}<br>
                        </td>
                        

                    </tr>
                    
                </table>
            `;
            }
            else if (["C1", "C2", "C3"].includes(frm.doc.custom_grade)) {
                html_content = `
                <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px; border:1px solid black;">
                    <tr style="background:#8fff8f; font-weight:bold;">
                        <td colspan="5" style="border:1px solid black;">PERFORMANCE GRID</td>
                    </tr>
                    <tr style="background:#cdffcc; font-weight:bold;">
                        <td style="border:1px solid black;">1. Poor</td>
                        <td style="border:1px solid black;">2. Acceptable</td>
                        <td style="border:1px solid black;">3. Good</td>
                        <td style="border:1px solid black;">4. Very Good</td>
                        <td style="border:1px solid black;">5. Excellent</td>
                    </tr>
                    <tr style="text-align:left;">
                        <td style="border:1px solid black; padding:10px;">Performance is below expectations; behavior is contrary to company standards.</td>
                        <td style="border:1px solid black; padding:10px;">Inconsistent demonstration of this value; requires coaching or behavioral adjustment.</td>
                        <td style="border:1px solid black; padding:10px;">Consistently demonstrates this value in day-to-day work; meets the standard.</td>
                        <td style="border:1px solid black; padding:10px;">Frequently goes above and beyond standard requirements regarding this value.</td>
                        <td style="border:1px solid black; padding:10px;">Consistently far exceeds expectations; acts as a role model and champions this value to others.</td>
                    </tr>
                </table>
                
                <br>
                <br>
                
                <table style="width:100%; border-collapse:collapse; text-align:center; font-size:18px; border:1px solid black;">
                    <tr style="background:#8fff8f;">
                        <td  style="width:80%;border:1px solid black; font-weight:bold;">OVERALL EFFECTIVENESS</td>
                        <td  style="width:20%;border:1px solid black; font-weight:bold;">
                            ${frm.doc.total_score}<br>
                        </td>
                        

                    </tr>
                    
                </table>
            `;
            }
            else {
                html_content = `
                <table style="width:100%; border-collapse:collapse; text-align:center; font-size:12px; border:1px solid black;">
                    <tr style="background:#E6B8B7; font-weight:bold;">
                        <td colspan="5" style="border:1px solid black;">PERFORMANCE GRID</td>
                    </tr>
                    <tr style="background:#F2DCDB; font-weight:bold;">
                        <td style="border:1px solid black;">1. Poor</td>
                        <td style="border:1px solid black;">2. Acceptable</td>
                        <td style="border:1px solid black;">3. Good</td>
                        <td style="border:1px solid black;">4. Very Good</td>
                        <td style="border:1px solid black;">5. Excellent</td>
                    </tr>
                    <tr style="text-align:left;">
                        <td style="border:1px solid black; padding:10px;">Performance is below expectations; behavior is contrary to company standards.</td>
                        <td style="border:1px solid black; padding:10px;">Inconsistent demonstration of this value; requires coaching or behavioral adjustment.</td>
                        <td style="border:1px solid black; padding:10px;">Consistently demonstrates this value in day-to-day work; meets the standard.</td>
                        <td style="border:1px solid black; padding:10px;">Frequently goes above and beyond standard requirements regarding this value.</td>
                        <td style="border:1px solid black; padding:10px;">Consistently far exceeds expectations; acts as a role model and champions this value to others.</td>
                    </tr>
                </table>
                
                <br>
                <br>
                
                <table style="width:100%; border-collapse:collapse; text-align:center; font-size:18px; border:1px solid black;">
                    <tr style="background:#E6B8B7;">
                        <td  style="width:80%;border:1px solid black; font-weight:bold;">OVERALL EFFECTIVENESS</td>
                        <td  style="width:20%;border:1px solid black; font-weight:bold;">
                            ${frm.doc.total_score}<br>
                        </td>
                        

                    </tr>
                    
                </table>
            `;
            }

            frm.get_field('overview_html').$wrapper.html(html_content);
        } else {
            frm.get_field('overview_html').$wrapper.html("");
        }

        frm.get_field('custom_note').$wrapper.html("Note: If anyone scores 1&2 in Safety  it will not be considered as 4 & 5 in Overall Effectiveness rating.");
        if (frappe.user.has_role("System Manager")) {
            frm.add_custom_button(
                __("Generate AI Insights ✨ "),
                function () {
                    frm.trigger("generate_ai_insights");
                }

            );
        }
        if (frm.is_new() && frm.doc.appraisal_template) {
            if (["C1", "C2", "C3", "D1", "D2", "D3", "E1", "E2"].includes(frm.doc.custom_grade)) {
                frm.clear_table('custom_objectives');

                // Fetch all Objectives
                frappe.call({
                    method: 'frappe.client.get_list',
                    args: {
                        doctype: 'Objectives', // change if different
                        fields: ['name', 'description'] // adjust fields
                    },
                    callback: function (r) {
                        if (r.message) {
                            r.message.forEach(obj => {
                                let row = frm.add_child('custom_objectives');
                                row.objective = obj.name;
                                row.description = obj.description;
                            });

                            frm.refresh_field('custom_objectives');
                        }
                    }
                });
            }
            // set_template_by_default(frm);
            frappe.db.get_doc('Appraisal Template', frm.doc.appraisal_template)
                .then(template => {

                    if (!template) return;

                    frm.doc.goals.forEach((row, i) => {
                        if (template.goals[i]) {
                            row.custom_description = template.goals[i].custom_description || "";
                        }
                    });

                    frm.refresh_field('goals');
                });
        }
    },

    generate_ai_insights: function (frm) {
        // 1. Show the animated progress bar dialog
        let loading_dialog = frappe.msgprint({
            title: __('✨ Generating AI Insights'),
            message: `
                <div style="text-align: center; padding: 10px;">
                    <p style="font-size: 14px; color: #555;">Gemini is reading the competencies and writing an L&D action plan...</p>
                    <div class="progress" style="height: 12px; margin-top: 15px; border-radius: 6px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" style="width: 100%; background-color: #2490ef;"></div>
                    </div>
                </div>
            `,
            indicator: 'blue'
        });

        // 2. Call the Python API
        frappe.call({
            method: 'pms_ai.api.generate_individual_insights',
            args: {
                docname: frm.doc.name
            },
            callback: function (r) {
                // 3. Close the loading dialog
                loading_dialog.hide();

                if (r.message === "Success") {
                    frappe.show_alert({ message: 'AI Coaching Insights Ready!', indicator: 'green' });

                    // 4. Reload the form to instantly show the new text editor content
                    frm.reload_doc();

                    // Optional: Automatically switch to the AI tab so the manager sees it immediately
                    // Replace 'ai_insights_tab' with the actual fieldname of your tab break
                    frm.scroll_to_field('ai_insights_tab');
                } else {
                    frappe.msgprint({
                        title: __('Notice'),
                        message: __('AI Generation finished with a note: ') + r.message,
                        indicator: 'orange'
                    });
                }
            }
        });
    },
    custom_grade(frm) {
        set_template_by_default(frm);

    },
    custom_unit(frm) {
        set_template_by_default(frm);
    },
    employee(frm) {
        set_template_by_default(frm);
    },
    validate(frm) {
        if (frm.doc.custom_date_of_joining) {
            let doj = frappe.datetime.str_to_obj(frm.doc.custom_date_of_joining);
            let today = frappe.datetime.str_to_obj(frappe.datetime.get_today());
            let months =
                (today.getFullYear() - doj.getFullYear()) * 12 +
                (today.getMonth() - doj.getMonth());
            let internal_years = (months / 12).toFixed(2); // decimal years
            frm.set_value("custom_internal_work_experience", internal_years);
            let prev_years = flt(frm.doc.custom_previous_work_experience);
            let text = `Pre-Galfar: ${prev_years} Years,\n Galfar: ${internal_years} Years`;

            frm.set_value("custom_experience", text);
        }

        frm.doc.goals.forEach(function (row) {

            if (row.kra === "SAFETY") {

                if (row.score < 2 && row.total_score >= 4) {

                    frappe.msgprint(
                        "Invalid Score: If Safety score is 1 or 2, it cannot be considered as 4 or 5 in Overall Effectiveness rating."
                    );

                    frappe.validated = false; // Stop saving
                }
            }

        });

    }

});

function set_goals_columns_in_custom_objectives(frm) {
    if (!frm.fields_dict.custom_objectives) return;

    let grid = frm.fields_dict.custom_objectives.grid;

    // Define column layout
    let columns = [];
    if (frappe.user.has_role("Appraisal Assessor")) {
        columns = [
            { fieldname: "objective", columns: 3, sticky: 1 },
            { fieldname: "description", columns: 4, sticky: 0 },
            { fieldname: "employee_comments", columns: 3, sticky: 0 },
            { fieldname: "assessor_comments", columns: 3, sticky: 0 }
        ];
    }
    else {
        columns = [
            { fieldname: "objective", columns: 3, sticky: 1 },
            { fieldname: "description", columns: 4, sticky: 0 },
            { fieldname: "employee_comments", columns: 4, sticky: 0 },
        ];
    }
    let value = {};
    value[grid.doctype] = columns.map(col => ({
        fieldname: col.fieldname,
        columns: col.columns,
        sticky: col.sticky
    }));

    // Save grid view settings
    frappe.model.user_settings.save(frm.doctype, "GridView", value).then(r => {
        frappe.model.user_settings[frm.doctype] = r.message || r;

        grid.reset_grid();

        // Hide row open icon and pointer column
        grid.wrapper.find(".btn-open-row").hide();
        grid.wrapper.find(".grid-static-col.pointer").hide();
    });
}
function set_goals_columns(frm) {
    let grid = frm.fields_dict['goals'].grid;

    // Save column settings to user settings
    let columns = [
        { fieldname: 'kra', columns: 3, sticky: 1 },
        { fieldname: 'custom_description', columns: 6, sticky: 0 },
        { fieldname: 'custom_self_score', columns: 2, sticky: 0 },
        { fieldname: 'custom_assessor_score', columns: 2, sticky: 0 },
    ];

    let value = {};
    value[grid.doctype] = columns.map(col => ({
        fieldname: col.fieldname,
        columns: col.columns,
        sticky: col.sticky,
    }));

    frappe.model.user_settings.save(frm.doctype, 'GridView', value).then(r => {
        frappe.model.user_settings[frm.doctype] = r.message || r;
        grid.reset_grid();

        // Re-hide icons after grid reset
        grid.wrapper.find('.btn-open-row').hide();
        grid.wrapper.find('.grid-static-col.pointer').hide();
    });
}
function set_template_by_default(frm) {

    if (!frm.doc.custom_unit || !frm.doc.custom_grade) return;


    let template_name;

    if (["A1", "A2", "A3", "A4"].includes(frm.doc.custom_grade)) {
        template_name = frm.doc.custom_grade + ' - ' + 'Worker';
    } else {
        template_name = frm.doc.custom_grade + ' - ' + frm.doc.custom_unit;
    }

    frappe.db.exists('Appraisal Template', template_name)
        .then(exists => {

            if (!exists) {
                frm.set_value('appraisal_template', "");
                frm.clear_table('goals');
                frm.refresh_field('goals');
                frappe.msgprint("Appraisal Template not found");
                return;
            }

            frappe.db.get_doc('Appraisal Template', template_name)
                .then(template => {
                    frm.set_value('appraisal_template', template_name);
                    frm.set_value('rate_goals_manually', 1);

                    // Fetch template
                    frappe.db.get_doc('Appraisal Template', template_name)
                        .then(template => {

                            if (!template) {
                                frappe.msgprint("Appraisal Template not found");
                                return;
                            }

                            // Clear existing rows
                            frm.clear_table('goals');
                            frm.clear_table('custom_additional_goals_for_worker_');
                            // Copy goals
                            (template.goals || []).forEach(d => {
                                let row = frm.add_child('goals');

                                row.kra = d.key_result_area;      // adjust if needed
                                row.per_weightage = d.per_weightage;
                                row.custom_description = d.custom_description || "";
                                if (["PRODUCTIVITY", "ABSENCES"].includes(d.key_result_area)) {
                                    let addtional_row = frm.add_child('custom_additional_goals_for_worker_');

                                    addtional_row.kra = d.key_result_area;      // adjust if needed
                                    addtional_row.per_weightage = d.per_weightage;
                                    addtional_row.custom_description = d.custom_description || "";
                                }
                            });

                            frm.refresh_field('goals');
                            frm.refresh_field('custom_additional_goals_for_worker_');
                            hide_worker_only_rows(frm)

                        })
                        .catch(() => {
                            frappe.msgprint("Unable to fetch Appraisal Template");
                        });
                });

        });


}
function color_goal_rows(frm) {
    // Small delay to let Frappe finish painting the DOM
    setTimeout(function () {

        // Frappe grid structure:
        // .form-grid > .grid-body > .rows > div.grid-row > div.row.data-row > div > div > div.col

        let $rows = $(frm.fields_dict.goals.grid.wrapper).find('.grid-body .rows .grid-row');

        $rows.each(function (i) {
            let $row = $(this);
            let bg = (i % 2 === 0) ? '#ffffff' : '#fdf5f6';

            // The row container itself
            $row.css({ 'background-color': bg });

            // Every div inside the row (Frappe uses divs, not tds, in newer versions)
            $row.find('div').css({ 'background-color': bg });

            // Also kill any Frappe hover/focus overrides on inputs
            $row.find('input, select, textarea, .like-disabled-input, .form-control').css({
                'background-color': bg
            });
        });

    }, 150);
}
function hide_worker_only_rows(frm) {
    setTimeout(() => {
        frm.fields_dict["goals"].grid.grid_rows.forEach(function (grid_row) {
            let kra = grid_row.doc && grid_row.doc.kra;

            if (["PRODUCTIVITY", "ABSENCES"].includes(kra)) {
                $(grid_row.row).hide();
            }
        });
    }, 300);
}
frappe.ui.form.on('Appraisal Goal', {
    custom_self_score: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let self_score = Math.round((flt(row.custom_self_score) || 0) * 5);

        frappe.model.set_value(cdt, cdn, 'score', self_score);

        // If changed in additional table, sync to goals table
        if (row.parentfield === 'custom_additional_goals_for_worker_') {
            (frm.doc.goals || []).forEach(function (g) {
                if (g.kra === row.kra) {
                    frappe.model.set_value('Appraisal Goal', g.name, 'custom_self_score', row.custom_self_score);
                    frappe.model.set_value('Appraisal Goal', g.name, 'score', self_score);
                }
            });
        }

        // If changed in goals table, sync to additional table
        if (row.parentfield === 'goals') {
            (frm.doc.custom_additional_goals_for_worker_ || []).forEach(function (g) {
                if (g.kra === row.kra) {
                    frappe.model.set_value('Appraisal Goal', g.name, 'custom_self_score', row.custom_self_score);
                }
            });
        }

        // Recalculate total from goals table
        let total = 0;
        (frm.doc.goals || []).forEach(function (g) {
            let score = Math.round((flt(g.custom_self_score) || 0) * 5);
            let weight = flt(g.per_weightage) || 0;
            total += (score * weight) / 100;
        });

        frm.set_value("custom_total_self_score", total);
    },

    custom_assessor_score: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let assessor_score = Math.round((flt(row.custom_assessor_score) || 0) * 5);

        frappe.model.set_value(cdt, cdn, 'score', assessor_score);

        // If changed in additional table, sync to goals table
        if (row.parentfield === 'custom_additional_goals_for_worker_') {
            (frm.doc.goals || []).forEach(function (g) {
                if (g.kra === row.kra) {
                    frappe.model.set_value('Appraisal Goal', g.name, 'custom_assessor_score', row.custom_assessor_score);
                    frappe.model.set_value('Appraisal Goal', g.name, 'score', assessor_score);
                }
            });
        }

        // If changed in goals table, sync to additional table
        if (row.parentfield === 'goals') {
            (frm.doc.custom_additional_goals_for_worker_ || []).forEach(function (g) {
                if (g.kra === row.kra) {
                    frappe.model.set_value('Appraisal Goal', g.name, 'custom_assessor_score', row.custom_assessor_score);
                }
            });
        }

        // Recalculate total from goals table
        let total = 0;
        (frm.doc.goals || []).forEach(function (g) {
            let score = Math.round((flt(g.custom_assessor_score) || 0) * 5);
            let weight = flt(g.per_weightage) || 0;
            total += (score * weight) / 100;
        });

        frm.set_value("custom_total_assessor_score", total);
    }
});
