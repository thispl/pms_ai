frappe.ui.form.on('Appraisal', {


    form_render(frm) {
        let grid = frm.fields_dict.goals.grid;
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
        
   
    // Also lock it on every rendered row
    frm.fields_dict["custom_objectives"].grid.grid_rows.forEach(row => {
        row.on_grid_fields_dict?.["employee_comments"]?.df &&
        (row.on_grid_fields_dict["employee_comments"].df.read_only = 1);
        row.on_grid_fields_dict?.["employee_comments"]?.refresh();
    });
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
        if (frm.doc.appraisal_cycle && frm.doc.workflow_state != 'Approved' && frm.doc.workflow_state != 'Accepted' && frm.doc.workflow_state != 'Cancelled') {
            frappe.db.get_value('Appraisal Cycle', frm.doc.appraisal_cycle, 'custom_locking_date', (r) => {
                if (r && r.custom_locking_date) {
                    let locking_date = r.custom_locking_date;
                    let today = frappe.datetime.get_today();

                    if (today > locking_date && frm.doc.custom_appraisal_status != 'Overdue') {
                            frm.set_value('custom_appraisal_status', 'Overdue');
                            frm.save();
                            
                    }
                    if (today < locking_date && frm.doc.custom_appraisal_status == 'Overdue') {
                            frm.set_value('custom_appraisal_status', 'Draft');
                            frm.save();
                            
                    }
                }
            });
        }
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

        loadLanguageView(frm);
    },

    workflow_state(frm) {
        handle_workflow_state_change(frm);
    },

    after_save(frm) {
        setup_remarks_watchers(frm);

        // Force re-translate if in Arabic mode (content may have changed)
        if (frm.doc.custom_language === 'Arabic') {
            fetchAndApplyArabicTranslations(frm, true);  // force=true bypasses cache
        }
    },

    refresh(frm) {
        let is_assessor = frappe.user.has_role('Appraisal Assessor');
         frappe.db.get_value("Employee", { user_id: frappe.session.user }, "name")
            .then(r => {
                let doc = r.message;
                if (!frm.doc.__islocal) {
                     frm.add_custom_button(__('Update Image'), function() {
                        let d = new frappe.ui.Dialog({
                            title: __('Upload Employee Image'),
                            fields: [
                                {
                                    label: __('Select Image'),
                                    fieldname: 'new_image',
                                    fieldtype: 'AttachImage',
                                    reqd: 1
                                }
                            ],
                            primary_action_label: __('Submit'),
                            primary_action(values) {
                                if (!values.new_image) return;
                                frappe.dom.freeze(__('Validating and Updating Image...'));
                                frappe.call({
                                    method: "pms_ai.custom.validate_and_set_image", 
                                    args: { 
                                        "file_url": values.new_image,
                                        "employee": frm.doc.employee
                                    },
                                    callback: function(r) {
                                        frappe.dom.unfreeze(); 
                                        if (r.message === "Not Allow") {
                                            d.set_value('new_image', ''); 
                                            frappe.msgprint("File size is too large. It must be less than 100 KB.");
                                        } else if (r.message === "Success") {
                                            d.hide();
                                            frappe.msgprint(__('Updated'));
                                            setTimeout(() => {
                                                frm.refresh();
                                            }, 1000);
                                        }
                                    },
                                    error: function() {
                                        frappe.dom.unfreeze();
                                    }
                                });
                            }
                        });

                        d.show();
                    });
                }
            });
       
        $(".layout-side-section").hide();
        $(".sidebar-toggle-btn").hide();
        $(".layout-main-section").removeClass("col-sm-9").addClass("col-sm-12");
        const fields = [
            'custom_significant_achievements',
            'remarks',
            'custom_targets',
            'custom_employee_comments',
            'custom_accessor_comments',
            'custom_objectives',
            "employee_comments",
            'assessor_comments',
            'custom_rejected_significant_achievements',
            'custom_training_needed',
            'custom_training_recommendation',
            'custom_rejected_significant_achievements'
        ];

        
        if(frm.doc.workflow_state != "Draft"){
            const b_grades = ["B1", "B2", "B3", "B4", "B5"];
            let grade = frm.doc.custom_grade;
            if (b_grades.includes(grade)) {
                frm.set_df_property("remarks", "read_only", 1);
                
            }
            
            if (frm.doc.custom_employment_type=='Worker'){
                frm.set_df_property("custom_training_recommendation", "read_only", 0);
            }else{
                frm.set_df_property("custom_training_needed", "read_only", 1);
            }
            
            
            if (frm.doc.workflow_state != "Pending for Assessor") {
                frm.set_df_property("custom_accessor_comments", 'read_only', 1); 
            }
            if (!is_assessor && frm.doc.custom_published==0){
                frm.set_df_property("custom_training_recommendation", "hidden", 1);
            }
            frappe.db.get_value(
            "Employee",
            { user_id: frappe.session.user },
            "name"
        ).then(r => {

            

            // Prevent self assessment
            if (r.message.name == frm.doc.employee) {
                is_assessor = false;

                frm.doc.custom_objectives.forEach((row) => {
                    frappe.model.set_value(
                        row.doctype,
                        row.name,
                        "read_only_check",
                        0
                    );
                });

            }
            else{
                frm.set_df_property("custom_employee_comments", "read_only", 1);

                frm.doc.custom_objectives.forEach((row) => {
                    frappe.model.set_value(
                        row.doctype,
                        row.name,
                        "read_only_check",
                        1
                    );
                });
                    // Also lock it on every rendered row
                    
                frm.refresh_field("custom_objectives");
            }

            if (!is_assessor) {
                //  frm.set_df_property("custom_training_recommendation", "hidden", 1);
                fields.forEach(field => {

                    if (frm.fields_dict[field]) {
                        frm.set_df_property(field, 'read_only', 1);

                        // For child tables
                        if (frm.fields_dict[field].grid) {
                            frm.set_df_property(field, 'read_only', 1);
                            
                        }

                        frm.refresh_field(field);
                    }
                });
            }
            
        });
        }
        if(frm.doc.workflow_state =="Draft"){
            const b_grades = ["B1", "B2", "B3", "B4", "B5"];
            let grade = frm.doc.custom_grade;
            if (b_grades.includes(grade)) {
                frm.set_df_property("remarks", "read_only", 1);
               
            }
            frm.set_df_property("custom_accessor_comments", 'read_only', 1);
    
            frappe.db.get_value(
                "Employee",
                { user_id: frappe.session.user },
                "name"
            ).then(r => {
            if (r.message.name !== frm.doc.employee && !["A1", "A2", "A3", "A4", "A5"].includes(frm.doc.custom_grade)) { 
                if(frappe.session.user !="Administrator"){
                    frm.set_read_only();
                }
                
            }
            if (is_assessor && ["A1", "A2", "A3", "A4", "A5"].includes(frm.doc.custom_grade)){
                frm.set_df_property("custom_employee_comments", "read_only", 0);
                 
            }
            if (frm.doc.custom_employment_type=='Worker'){
                frm.set_df_property("custom_training_recommendation", "hidden", 0);
                frm.set_df_property("custom_training_needed", "read_only", 1);
            }else{
                frm.set_df_property("custom_training_recommendation", "hidden", 1);
            }
            
            if (!is_assessor && frm.doc.custom_published==0){
                frm.set_df_property("custom_training_recommendation", "hidden", 1);
            }
            });
             frm.doc.custom_objectives.forEach((row) => {
                    frappe.model.set_value(
                        row.doctype,
                        row.name,
                        "read_only_check",
                        0
                    );
                });
                    // Also lock it on every rendered row
                    
                frm.refresh_field("custom_objectives");
        }
        if(frm.doc.workflow_state=="Approved"){
            frm.set_read_only();
            // frm.save()
        }

        if (frm.doc.custom_restricted) {

            frm.fields.forEach(field => {
                frm.set_df_property(field.df.fieldname, 'read_only', 1);
            });

        }
            // ── Remarks field editable only for Appraisal Assessor ───────────────
        
        

        setup_remarks_watchers(frm);

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
                        });

                        frm.refresh_field('custom_objectives');
                    }
                }
            });
        }

        
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
        // if (frm.doc.appraisal_cycle && frm.doc.employee) {
        //     //     frappe.call({
        //     // method: "pms_ai.custom.appraisal_html_template",
        //     // args: { appraisal_name: frm.doc.name },
        //     // callback: (r) => {
        //     //     // r.message contains the full HTML string
        //     //     // let w = window.open();
        //     //     // w.document.write(r.message);
        //     //     frm.get_field('custom_appraisal_preview').$wrapper.html(r.message);
        //     //  }
        //     // });
        //     frappe.call({
        //         method: "pms_ai.custom.appraisal_html_template_employee_overview",
        //         args: { appraisal_name: frm.doc.name },
        //         callback: (r) => {
        //             // r.message contains the full HTML string
        //             // let w = window.open();
        //             // w.document.write(r.message);
        //             frm.get_field('custom_employee_overview').$wrapper.html(r.message);

        //             // frm.get_field('custom_arabic_overview').$wrapper.html(r.message);
        //         }
        //     });

        //     frappe.call({
        //         method: "pms_ai.public.py.appraisal_arabic.appraisal_html_template_employee_overview_arabic",
        //         args: { appraisal_name: frm.doc.name },
        //         callback: (r) => {

        //             frm.get_field('custom_arabic_overview')
        //                 .$wrapper.html(r.message);
        //         }
        //     });
        // }
        


if (frm.doc.appraisal_cycle && frm.doc.employee) {

    // Load English by default on form refresh
    // frappe.call({
    //     method: "pms_ai.custom.appraisal_html_template_employee_overview",
    //     args: { appraisal_name: frm.doc.name },
    //     callback: function(r) {
    //         if (r.message) {
    //             frm._cached_english_html = r.message;
    //             frm.get_field('custom_employee_overview').$wrapper.html(r.message);
    //             // frm._current_language = 'English';

    //             // // If was Arabic before refresh, re-apply
    //             // if (frm._current_language === 'Arabic') {
    //             //     triggerIframeTranslation(
    //             //         frm.get_field('custom_employee_overview').$wrapper
    //             //     );
    //             // }

    //             // if (frm.doc.custom_language === 'Arabic') {

    //             //     setTimeout(() => {
    //             //         loadLanguageView(frm);
    //             //     }, 300);
    //             // }
    //         }
    //     }
    // });

    frappe.call({
    method: "pms_ai.custom.appraisal_html_template_employee_overview",
    args: { appraisal_name: frm.doc.name },
    callback: function(r) {
        if (r.message) {
            frm._cached_english_html = r.message;
            // Only inject English HTML if NOT currently in Arabic mode
            if (frm.doc.custom_language !== 'Arabic') {
                frm.get_field('custom_employee_overview').$wrapper.html(r.message);
            } else {
                // Re-render Arabic iframe with fresh data (scores may have changed after save)
                frm._arabic_loaded = false;   // force re-render with updated data
                loadLanguageView(frm);
            }
        }
    }
});

    frm.page.remove_inner_button(__("🌐 Language"));

    frm.add_custom_button(__("🌐 Language"), function () {

        let d = new frappe.ui.Dialog({
            title: '🌐 Select Language / اختر اللغة',
            fields: [
                {
                    fieldtype: 'Select',
                    fieldname: 'language',
                    label: 'Language / اللغة',
                    options: ['English', 'Arabic'],
                    // default: frm._current_language || 'English'
                    default: frm.doc.custom_language || 'English'
                }
            ],
            primary_action_label: __('Apply / تطبيق'),
            // primary_action(values) {
            //     d.hide();
            //     let lang = values.language;
            //     // frm._current_language = lang;
            //     frm.set_value("custom_language", lang);

            //     // let $wrapper = frm.get_field('custom_employee_overview').$wrapper;

            //     // if (lang === 'Arabic') {
            //     //     frappe.show_alert({ message: '🔄 Loading Arabic...', indicator: 'blue' });

            //     //     frappe.call({
            //     //         method: "pms_ai.custom.appraisal_html_template_employee_overview",
            //     //         args: { appraisal_name: frm.doc.name },
            //     //         callback: function(r) {
            //     //             if (!r.message) return;
            //     //             frm._cached_english_html = r.message;

            //     //             // ── Render inside a real iframe so Chrome Translate works ──
            //     //             renderInTranslatableIframe($wrapper, r.message, 'ar', function() {
            //     //                 frappe.show_alert({
            //     //                     message: '✅ تم التحميل بالعربية',
            //     //                     indicator: 'green'
            //     //                 }, 3);
            //     //             });
            //     //         }
            //     //     });
            //     //     applyArabicToFrappeFields(frm);

            //     // } else {
            //     //     // Restore English
            //     //     frappe.call({
            //     //         method: "pms_ai.custom.appraisal_html_template_employee_overview",
            //     //         args: { appraisal_name: frm.doc.name },
            //     //         callback: function(r) {
            //     //             if (!r.message) return;
            //     //             $wrapper.html(r.message);
            //     //             frappe.show_alert({ message: '✅ Loaded in English', indicator: 'green' }, 3);
            //     //         }
            //     //     });
            //     // }

            //         loadLanguageView(frm);
            //                 }

            primary_action(values) {
    d.hide();
    let lang = values.language;
    frm.set_value("custom_language", lang);

    // ── Set User language ──────────────────────────
    let user_language = lang === 'Arabic' ? 'ar' : 'en';

    frappe.call({
        method: 'frappe.client.set_value',
        args: {
            doctype: 'User',
            name: frappe.session.user,
            fieldname: 'language',
            value: user_language
        },
        callback: function(r) {
            if (!r.exc) {
                frappe.show_alert({
                    message: lang === 'Arabic' ? '✅ تم التحييل للعربية' : '✅ Switched to English',
                    indicator: 'green'
                }, 2);

                // ── Save first, then reload ────────────
                frappe.call({
                    method: 'frappe.client.set_value',
                    args: {
                        doctype: 'Appraisal',
                        name: frm.doc.name,
                        fieldname: 'custom_language',
                        value: lang
                    },
                    callback: function() {
                        setTimeout(function() {
                            window.location.reload();
                        }, 700);
                    }
                });
            }
        }
    });
}
                        });

                        d.show();
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
        colorGrid(frm, 'custom_training_needed');
        colorGrid(frm, 'custom_training_recommendation');

        // ── Re-apply on change / add / delete ────────────────────────────────────────
        ['goals', 'custom_training_recommendation','custom_significant_achievements', 'custom_targets', 'custom_additional_goals_for_worker_','custom_training_needed'].forEach(function (fieldname) {
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
        frm.remove_custom_button("View Goals");
        
        // // Hide timeline safely
        if (frm.timeline && frm.timeline.wrapper) {
            frm.timeline.wrapper.hide();
        }

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
        }
        if (!frm.doc.__islocal && frm.doc.docstatus != 2) {
            frm.add_custom_button(__("PDF"), function () {

    // ── 1. Load libraries ──
    function loadScript(src) {
        return new Promise(function(resolve, reject) {
            if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
            let s = document.createElement('script');
            s.src = src; s.onload = resolve; s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    Promise.all([
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
        loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    ]).then(function() {

        // ── 2. Get the HTML content from Python ──
        frappe.call({
            method: "pms_ai.custom.appraisal_html_template_employee_overview",
            args: { appraisal_name: frm.doc.name },
            callback: function(r) {
                if (!r.message) {
                    frappe.msgprint("Could not load appraisal data.");
                    return;
                }

                // ── 3. Create a full-size hidden iframe ──
                $('#appraisal-pdf-iframe').remove();

                let $iframe = $('<iframe>', {
                    id: 'appraisal-pdf-iframe',
                    css: {
                        position:   'fixed',
                        top:        '0',
                        left:       '-9999px',
                        width:      '1100px',   // fixed width for consistent layout
                        height:     '10px',
                        border:     'none',
                        visibility: 'hidden'
                    }
                }).appendTo('body');

                let iframe    = $iframe[0];
                let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                // ── 4. Inject prep CSS into the HTML ──
                let prepCSS = `
                <style id="pdf-prep">
                    * { animation: none !important; transition: none !important; }
                    body { 
                        margin: 0 !important; 
                        padding: 20px !important; 
                        background: #faf8f4 !important;
                        width: 1060px !important;
                    }
                    /* Expand all sections */
                    .collapsible-body,
                    .collapsible-body.collapsed {
                        max-height: none !important;
                        overflow:   visible !important;
                        opacity:    1 !important;
                        display:    block !important;
                        height:     auto !important;
                    }
                    /* Hide UI-only elements */
                    .coll-icon,
                    #kra-dd-portal,
                    .kra-dropdown,
                    #goals-save-status { display: none !important; }
                    /* Show full descriptions */
                    .desc-cell {
                        -webkit-line-clamp: unset !important;
                        display:    block !important;
                        overflow:   visible !important;
                        max-width:  none !important;
                        white-space: normal !important;
                    }
                    .table-scroll { overflow: visible !important; }
                    /* KRA input as plain text */
                    .kra-input {
                        border:     none !important;
                        background: transparent !important;
                        padding:    0 !important;
                        font-size:  12px !important;
                        font-weight: 600 !important;
                        box-shadow: none !important;
                        outline:    none !important;
                    }
                    /* Fix gold frame for screenshot */
                    .gold-frame {
                        padding: 4px !important;
                        box-shadow: none !important;
                        background: linear-gradient(45deg,#5c3d08,#c9a84c,#f5d97a,#c9a84c,#8B6508) !important;
                    }
                    /* Score card shimmer → static */
                    .score-card::before {
                        animation: none !important;
                        background: linear-gradient(90deg,#8a0d1a,#CE1426,#c9a84c,#e8c97a,#c9a84c,#8a0d1a) !important;
                        background-position: 0 center !important;
                    }
                </style>`;

                let htmlContent = r.message.replace('</head>', prepCSS + '</head>');

                // ── 5. Also inject a script to replace inputs + expand ──
                let prepScript = `
                <script id="pdf-prep-script">
                (function() {
                    // Replace KRA inputs with spans
                    document.querySelectorAll('.kra-input').forEach(function(input) {
                        var val  = input.value || input.getAttribute('value') || '';
                        var span = document.createElement('span');
                        span.textContent = val;
                        span.style.cssText = 'font-size:12px;font-weight:600;color:#1a1a2e;display:block;';
                        if (input.parentNode) input.parentNode.replaceChild(span, input);
                    });
                    // Expand all
                    document.querySelectorAll('.collapsible-body').forEach(function(el) {
                        el.style.maxHeight = 'none';
                        el.style.overflow  = 'visible';
                        el.style.opacity   = '1';
                        el.style.display   = 'block';
                        el.style.height    = 'auto';
                        el.classList.remove('collapsed');
                    });
                    // Full desc
                    document.querySelectorAll('.desc-cell').forEach(function(el) {
                        el.style.webkitLineClamp = 'unset';
                        el.style.display    = 'block';
                        el.style.overflow   = 'visible';
                        el.style.maxWidth   = 'none';
                        el.style.whiteSpace = 'normal';
                    });
                })();
                <\/script>`;

                htmlContent = htmlContent.replace('</body>', prepScript + '</body>');

                // ── 6. Write HTML into iframe ──
                iframeDoc.open();
                iframeDoc.write(htmlContent);
                iframeDoc.close();

                // ── 7. Wait for iframe content + fonts to fully render ──
                iframe.onload = function() {
                    setTimeout(function() {

                        // Resize iframe to full content height
                        let iframeBody = iframe.contentDocument.body;
                        let fullHeight = iframeBody.scrollHeight;
                        $iframe.css({ height: fullHeight + 'px' });


                        // ── 8. Screenshot with html2canvas ──
                        html2canvas(iframeBody, {
                            scale:           2,
                            useCORS:         true,
                            allowTaint:      true,
                            backgroundColor: '#faf8f4',
                            scrollX:         0,
                            scrollY:         0,
                            windowWidth:     1100,
                            windowHeight:    fullHeight,
                            logging:         false
                        }).then(function(canvas) {

    frappe.show_alert({ message: '📄 Building PDF...', indicator: 'blue' });

    // ── 9. Build PDF ──
    let { jsPDF } = window.jspdf;
    let pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let pageW = pdf.internal.pageSize.getWidth();   // 210mm
    let pageH = pdf.internal.pageSize.getHeight();  // 297mm

    // ── Margins ──
    let marginTop    = 12;
    let marginBottom = 16;
    let marginSide   = 8;
    let printW       = pageW - marginSide * 2;           // 194mm
    let printH       = pageH - marginTop - marginBottom; // 269mm

    let canvasW = canvas.width;
    let canvasH = canvas.height;

    // px ↔ mm conversion based on canvas-to-printW ratio
    let scale = printW / canvasW;   // mm per canvas-px

    // ── Find safe page-break points from the iframe DOM ──
    // Collect bottom-edge positions (in canvas px) of all block-level elements
    let iframeBody  = iframe.contentDocument.body;
    let bodyRect    = iframeBody.getBoundingClientRect();
    let canvasScale = canvasH / (bodyRect.height || fullHeight); // DOM px → canvas px

    let breakCandidates = [0]; // always start with 0

    // Query all meaningful block elements
    let blockEls = iframeBody.querySelectorAll(
    'tr, .card, .collapsible-body, ' +
    '.score-card, .value-card, .kra-row, ' +
    'h1, h2, h3, h4, h5, ' +
    '.section-label, .section-title, [class*="section-head"], ' +
    'p, .row, [class*="section"], [class*="block"], [class*="collapsible-header"]'
);

let elBoxes = [];

blockEls.forEach(function(el) {
    let rect   = el.getBoundingClientRect();
    let top    = (rect.top    - bodyRect.top) * canvasScale;
    let bottom = (rect.bottom - bodyRect.top) * canvasScale;

    if (bottom > 0 && bottom < canvasH && (bottom - top) > 2) {
        let tag = el.tagName ? el.tagName.toLowerCase() : '';
        let cls = el.className || '';

        let isHeading = (
            ['h1','h2','h3','h4','h5'].includes(tag) ||
            cls.includes('section-label')       ||
            cls.includes('section-title')        ||
            cls.includes('section-head')         ||
            cls.includes('galfar-values')        ||
            cls.includes('goals')                ||
            cls.includes('score-summary')        ||
            cls.includes('evaluation')           ||
            cls.includes('collapsible-header')           ||
            cls.includes('performance-grid')
        );

        elBoxes.push({
            top:       Math.round(top),
            bottom:    Math.round(bottom),
            isHeading: isHeading
        });
    }
});

    // Sort by top position
    elBoxes.sort(function(a, b) { return a.top - b.top; });

    
    // Sort and deduplicate
    for (let k = 0; k < elBoxes.length; k++) {
        let curr = elBoxes[k];
        let next = elBoxes[k + 1];

        if (!next) {
            // Last element — always safe to break after it
            breakCandidates.push(curr.bottom);
            continue;
        }

        if (next.isHeading) {
            // Next element is a heading — break BEFORE it (at its top), not after current
            breakCandidates.push(next.top);
        } else if (!curr.isHeading) {
            // Safe to break after a non-heading element followed by non-heading
            breakCandidates.push(curr.bottom);
        }
        // If curr is a heading, don't add its bottom as a break point
        // (heading must stay with its following content)
    }

    // Sort and deduplicate
    breakCandidates = [...new Set(breakCandidates)].sort(function(a, b) { return a - b; });
    breakCandidates.push(canvasH);// sentinel end

    // ── Build page slices by fitting as much content as possible per page ──
    let printH_px = printH / scale;  // max canvas-px per page

    let pageSlices = []; // [{srcY, srcH}]
    let cursor     = 0;

    while (cursor < canvasH) {
        let maxEnd = cursor + printH_px;

        if (maxEnd >= canvasH) {
            // Last slice — take everything remaining
            pageSlices.push({ srcY: cursor, srcH: canvasH - cursor });
            break;
        }

        // Find the best break point ≤ maxEnd
        // Prefer the largest candidate that doesn't exceed maxEnd
        let bestBreak = cursor; // fallback: hard cut at maxEnd
        for (let k = 0; k < breakCandidates.length; k++) {
            let bp = breakCandidates[k];
            if (bp > cursor && bp <= maxEnd) {
                bestBreak = bp;
            } else if (bp > maxEnd) {
                break;
            }
        }

        // If no clean break found within range, hard-cut at maxEnd
        if (bestBreak === cursor) bestBreak = Math.round(maxEnd);

        pageSlices.push({ srcY: cursor, srcH: bestBreak - cursor });
        cursor = bestBreak;
    }

    // ── Merge orphan last page (< 20% of a full page) into previous ──
    if (pageSlices.length > 1) {
        let last = pageSlices[pageSlices.length - 1];
        if (last.srcH < printH_px * 0.20) {
            let prev = pageSlices[pageSlices.length - 2];
            prev.srcH += last.srcH;   // extend previous slice to absorb orphan
            pageSlices.pop();
        }
    }

    let pages = pageSlices.length;

    // ── Employee info ──
    let empName  = (frm.doc.employee_name || 'Appraisal').replace(/[^a-zA-Z0-9]/g, '_');
    let cycle    = (frm.doc.appraisal_cycle || '').replace(/[^a-zA-Z0-9]/g, '_');
    let empLabel = frm.doc.employee_name || 'Appraisal';
    let cycLabel = frm.doc.appraisal_cycle || '';
    let today    = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

    for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();

        let isLastPage = (i === pages - 1);
        let { srcY, srcH } = pageSlices[i];

        // ── Slice canvas for this page ──
        let slice    = document.createElement('canvas');
        slice.width  = canvasW;
        slice.height = Math.ceil(srcH);
        let ctx      = slice.getContext('2d');
        ctx.fillStyle = '#faf8f4';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, canvasW, srcH, 0, 0, canvasW, srcH);

        let imgData = slice.toDataURL('image/jpeg', 0.92);
        let imgH_mm = srcH * scale;

        // ── Add content image ──
        pdf.addImage(imgData, 'JPEG', marginSide, marginTop, printW, imgH_mm);

        // ── Gold top border — all pages ──
        

        // ── Header text — page 2+ only ──
        if (i > 0) {
            pdf.setFontSize(8);
            pdf.setTextColor(138, 13, 26);
            pdf.setFont('helvetica', 'bold');

            pdf.setFontSize(8);
            pdf.setTextColor(139, 101, 8);
            pdf.setFont('helvetica', 'normal');
        }

        // ── Bottom footer ──
        let contentEndMm = marginTop + imgH_mm;
        let footerY = isLastPage
            ? Math.min(contentEndMm + 8, pageH - marginBottom + 4)
            : pageH - marginBottom + 4;

        // Gold separator above footer
        // pdf.setDrawColor(201, 168, 76);
        // pdf.setLineWidth(0.4);
        // pdf.line(marginSide, footerY - 1, pageW - marginSide, footerY - 1);

        // Left — employee | cycle
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');

        // Center — generated date
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Page ' + (i + 1) + ' of ' + pages, pageW / 2, footerY + 3, { align: 'center' });

        // Right — page number
        pdf.setFontSize(8);
        pdf.setTextColor(138, 13, 26);
        pdf.setFont('helvetica', 'bold');

        
    }
    
    // ── 10. Save + cleanup ──
    let filename = 'Appraisal_' + empName + '_' + cycle + '.pdf';
    pdf.save(filename);
    $('#appraisal-pdf-iframe').remove();

    frappe.show_alert({
        message:   '✅ PDF saved: ' + filename,
        indicator: 'green'
    }, 6);

}).catch(function(err) {
    $('#appraisal-pdf-iframe').remove();
    console.error('html2canvas error:', err);
    frappe.msgprint('Screenshot failed: ' + err.message);
});

                    }, 1200); // wait 1.2s for fonts/images to load
                };

            } // end frappe.call callback
        }); // end frappe.call
        
        frappe.call({
            method: "pms_ai.public.py.appraisal_arabic.appraisal_html_template_employee_overview_arabic",
            args: { appraisal_name: frm.doc.name },
            callback: function(r) {
                if (!r.message) {
                    frappe.msgprint("Could not load appraisal data.");
                    return;
                }

                // ── 3. Create a full-size hidden iframe ──
                $('#appraisal-pdf-iframe').remove();

                let $iframe = $('<iframe>', {
                    id: 'appraisal-pdf-iframe',
                    css: {
                        position:   'fixed',
                        top:        '0',
                        left:       '-9999px',
                        width:      '1100px',   // fixed width for consistent layout
                        height:     '10px',
                        border:     'none',
                        visibility: 'hidden'
                    }
                }).appendTo('body');

                let iframe    = $iframe[0];
                let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

                // ── 4. Inject prep CSS into the HTML ──
                let prepCSS = `
                <style id="pdf-prep">
                    * { animation: none !important; transition: none !important; }
                    body { 
                        margin: 0 !important; 
                        padding: 20px !important; 
                        background: #faf8f4 !important;
                        width: 1060px !important;
                    }
                    /* Expand all sections */
                    .collapsible-body,
                    .collapsible-body.collapsed {
                        max-height: none !important;
                        overflow:   visible !important;
                        opacity:    1 !important;
                        display:    block !important;
                        height:     auto !important;
                    }
                    /* Hide UI-only elements */
                    .coll-icon,
                    #kra-dd-portal,
                    .kra-dropdown,
                    #goals-save-status { display: none !important; }
                    /* Show full descriptions */
                    .desc-cell {
                        -webkit-line-clamp: unset !important;
                        display:    block !important;
                        overflow:   visible !important;
                        max-width:  none !important;
                        white-space: normal !important;
                    }
                    .table-scroll { overflow: visible !important; }
                    /* KRA input as plain text */
                    .kra-input {
                        border:     none !important;
                        background: transparent !important;
                        padding:    0 !important;
                        font-size:  12px !important;
                        font-weight: 600 !important;
                        box-shadow: none !important;
                        outline:    none !important;
                    }
                    /* Fix gold frame for screenshot */
                    .gold-frame {
                        padding: 4px !important;
                        box-shadow: none !important;
                        background: linear-gradient(45deg,#5c3d08,#c9a84c,#f5d97a,#c9a84c,#8B6508) !important;
                    }
                    /* Score card shimmer → static */
                    .score-card::before {
                        animation: none !important;
                        background: linear-gradient(90deg,#8a0d1a,#CE1426,#c9a84c,#e8c97a,#c9a84c,#8a0d1a) !important;
                        background-position: 0 center !important;
                    }
                </style>`;

                let htmlContent = r.message.replace('</head>', prepCSS + '</head>');

                // ── 5. Also inject a script to replace inputs + expand ──
                let prepScript = `
                <script id="pdf-prep-script">
                (function() {
                    // Replace KRA inputs with spans
                    document.querySelectorAll('.kra-input').forEach(function(input) {
                        var val  = input.value || input.getAttribute('value') || '';
                        var span = document.createElement('span');
                        span.textContent = val;
                        span.style.cssText = 'font-size:12px;font-weight:600;color:#1a1a2e;display:block;';
                        if (input.parentNode) input.parentNode.replaceChild(span, input);
                    });
                    // Expand all
                    document.querySelectorAll('.collapsible-body').forEach(function(el) {
                        el.style.maxHeight = 'none';
                        el.style.overflow  = 'visible';
                        el.style.opacity   = '1';
                        el.style.display   = 'block';
                        el.style.height    = 'auto';
                        el.classList.remove('collapsed');
                    });
                    // Full desc
                    document.querySelectorAll('.desc-cell').forEach(function(el) {
                        el.style.webkitLineClamp = 'unset';
                        el.style.display    = 'block';
                        el.style.overflow   = 'visible';
                        el.style.maxWidth   = 'none';
                        el.style.whiteSpace = 'normal';
                    });
                })();
                <\/script>`;

                htmlContent = htmlContent.replace('</body>', prepScript + '</body>');

                // ── 6. Write HTML into iframe ──
                iframeDoc.open();
                iframeDoc.write(htmlContent);
                iframeDoc.close();

                // ── 7. Wait for iframe content + fonts to fully render ──
                iframe.onload = function() {
                    setTimeout(function() {

                        // Resize iframe to full content height
                        let iframeBody = iframe.contentDocument.body;
                        let fullHeight = iframeBody.scrollHeight;
                        $iframe.css({ height: fullHeight + 'px' });

                        frappe.show_alert({ message: '🖼️ Rendering pages...', indicator: 'blue' });

                        // ── 8. Screenshot with html2canvas ──
                        html2canvas(iframeBody, {
                            scale:           2,
                            useCORS:         true,
                            allowTaint:      true,
                            backgroundColor: '#faf8f4',
                            scrollX:         0,
                            scrollY:         0,
                            windowWidth:     1100,
                            windowHeight:    fullHeight,
                            logging:         false
                        }).then(function(canvas) {

    frappe.show_alert({ message: '📄 Building PDF...', indicator: 'blue' });

    // ── 9. Build PDF ──
    let { jsPDF } = window.jspdf;
    let pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    let pageW = pdf.internal.pageSize.getWidth();   // 210mm
    let pageH = pdf.internal.pageSize.getHeight();  // 297mm

    // ── Margins ──
    let marginTop    = 12;
    let marginBottom = 16;
    let marginSide   = 8;
    let printW       = pageW - marginSide * 2;           // 194mm
    let printH       = pageH - marginTop - marginBottom; // 269mm

    let canvasW = canvas.width;
    let canvasH = canvas.height;

    // px ↔ mm conversion based on canvas-to-printW ratio
    let scale = printW / canvasW;   // mm per canvas-px

    // ── Find safe page-break points from the iframe DOM ──
    // Collect bottom-edge positions (in canvas px) of all block-level elements
    let iframeBody  = iframe.contentDocument.body;
    let bodyRect    = iframeBody.getBoundingClientRect();
    let canvasScale = canvasH / (bodyRect.height || fullHeight); // DOM px → canvas px

    let breakCandidates = [0]; // always start with 0

    // Query all meaningful block elements
    let blockEls = iframeBody.querySelectorAll(
    'tr, .card, .collapsible-body, ' +
    '.score-card, .value-card, .kra-row, ' +
    'h1, h2, h3, h4, h5, ' +
    '.section-label, .section-title, [class*="section-head"], ' +
    'p, .row, [class*="section"], [class*="block"], [class*="collapsible-header"]'
);

let elBoxes = [];

blockEls.forEach(function(el) {
    let rect   = el.getBoundingClientRect();
    let top    = (rect.top    - bodyRect.top) * canvasScale;
    let bottom = (rect.bottom - bodyRect.top) * canvasScale;

    if (bottom > 0 && bottom < canvasH && (bottom - top) > 2) {
        let tag = el.tagName ? el.tagName.toLowerCase() : '';
        let cls = el.className || '';

        let isHeading = (
            ['h1','h2','h3','h4','h5'].includes(tag) ||
            cls.includes('section-label')       ||
            cls.includes('section-title')        ||
            cls.includes('section-head')         ||
            cls.includes('galfar-values')        ||
            cls.includes('goals')                ||
            cls.includes('score-summary')        ||
            cls.includes('evaluation')           ||
            cls.includes('collapsible-header')           ||
            cls.includes('performance-grid')
        );

        elBoxes.push({
            top:       Math.round(top),
            bottom:    Math.round(bottom),
            isHeading: isHeading
        });
    }
});

    // Sort by top position
    elBoxes.sort(function(a, b) { return a.top - b.top; });

    
    // Sort and deduplicate
    for (let k = 0; k < elBoxes.length; k++) {
        let curr = elBoxes[k];
        let next = elBoxes[k + 1];

        if (!next) {
            // Last element — always safe to break after it
            breakCandidates.push(curr.bottom);
            continue;
        }

        if (next.isHeading) {
            // Next element is a heading — break BEFORE it (at its top), not after current
            breakCandidates.push(next.top);
        } else if (!curr.isHeading) {
            // Safe to break after a non-heading element followed by non-heading
            breakCandidates.push(curr.bottom);
        }
        // If curr is a heading, don't add its bottom as a break point
        // (heading must stay with its following content)
    }

    // Sort and deduplicate
    breakCandidates = [...new Set(breakCandidates)].sort(function(a, b) { return a - b; });
    breakCandidates.push(canvasH);// sentinel end

    // ── Build page slices by fitting as much content as possible per page ──
    let printH_px = printH / scale;  // max canvas-px per page

    let pageSlices = []; // [{srcY, srcH}]
    let cursor     = 0;

    while (cursor < canvasH) {
        let maxEnd = cursor + printH_px;

        if (maxEnd >= canvasH) {
            // Last slice — take everything remaining
            pageSlices.push({ srcY: cursor, srcH: canvasH - cursor });
            break;
        }

        // Find the best break point ≤ maxEnd
        // Prefer the largest candidate that doesn't exceed maxEnd
        let bestBreak = cursor; // fallback: hard cut at maxEnd
        for (let k = 0; k < breakCandidates.length; k++) {
            let bp = breakCandidates[k];
            if (bp > cursor && bp <= maxEnd) {
                bestBreak = bp;
            } else if (bp > maxEnd) {
                break;
            }
        }

        // If no clean break found within range, hard-cut at maxEnd
        if (bestBreak === cursor) bestBreak = Math.round(maxEnd);

        pageSlices.push({ srcY: cursor, srcH: bestBreak - cursor });
        cursor = bestBreak;
    }

    // ── Merge orphan last page (< 20% of a full page) into previous ──
    if (pageSlices.length > 1) {
        let last = pageSlices[pageSlices.length - 1];
        if (last.srcH < printH_px * 0.20) {
            let prev = pageSlices[pageSlices.length - 2];
            prev.srcH += last.srcH;   // extend previous slice to absorb orphan
            pageSlices.pop();
        }
    }

    let pages = pageSlices.length;

    // ── Employee info ──
    let empName  = (frm.doc.employee_name || 'Appraisal').replace(/[^a-zA-Z0-9]/g, '_');
    let cycle    = (frm.doc.appraisal_cycle || '').replace(/[^a-zA-Z0-9]/g, '_');
    let empLabel = frm.doc.employee_name || 'Appraisal';
    let cycLabel = frm.doc.appraisal_cycle || '';
    let today    = new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });

    for (let i = 0; i < pages; i++) {
        if (i > 0) pdf.addPage();

        let isLastPage = (i === pages - 1);
        let { srcY, srcH } = pageSlices[i];

        // ── Slice canvas for this page ──
        let slice    = document.createElement('canvas');
        slice.width  = canvasW;
        slice.height = Math.ceil(srcH);
        let ctx      = slice.getContext('2d');
        ctx.fillStyle = '#faf8f4';
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, canvasW, srcH, 0, 0, canvasW, srcH);

        let imgData = slice.toDataURL('image/jpeg', 0.92);
        let imgH_mm = srcH * scale;

        // ── Add content image ──
        pdf.addImage(imgData, 'JPEG', marginSide, marginTop, printW, imgH_mm);

        // ── Gold top border — all pages ──
        

        // ── Header text — page 2+ only ──
        if (i > 0) {
            pdf.setFontSize(8);
            pdf.setTextColor(138, 13, 26);
            pdf.setFont('helvetica', 'bold');

            pdf.setFontSize(8);
            pdf.setTextColor(139, 101, 8);
            pdf.setFont('helvetica', 'normal');
        }

        // ── Bottom footer ──
        let contentEndMm = marginTop + imgH_mm;
        let footerY = isLastPage
            ? Math.min(contentEndMm + 8, pageH - marginBottom + 4)
            : pageH - marginBottom + 4;

        // Gold separator above footer
        // pdf.setDrawColor(201, 168, 76);
        // pdf.setLineWidth(0.4);
        // pdf.line(marginSide, footerY - 1, pageW - marginSide, footerY - 1);

        // Left — employee | cycle
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');

        // Center — generated date
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Page ' + (i + 1) + ' of ' + pages, pageW / 2, footerY + 3, { align: 'center' });

        // Right — page number
        pdf.setFontSize(8);
        pdf.setTextColor(138, 13, 26);
        pdf.setFont('helvetica', 'bold');

        
    }
    
    // ── 10. Save + cleanup ──
    let filename = 'Appraisal_' + empName + '_' + cycle + '.pdf';
    pdf.save(filename);
    $('#appraisal-pdf-iframe').remove();

    frappe.show_alert({
        message:   '✅ PDF saved: ' + filename,
        indicator: 'green'
    }, 6);

}).catch(function(err) {
    $('#appraisal-pdf-iframe').remove();
    console.error('html2canvas error:', err);
    frappe.msgprint('Screenshot failed: ' + err.message);
});

                    }, 1200); // wait 1.2s for fonts/images to load
                };

            } // end frappe.call callback
        }); // end frappe.call


    }).catch(function(err) {
        frappe.msgprint('Failed to load PDF libraries: ' + err);
    });
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
       if (frm.doc.workflow_state != 'Draft') {
        // 1. Handle "custom_significant_achievements" Table
        frm.fields_dict["custom_significant_achievements"].grid.cannot_add_rows = true;
        frm.fields_dict["custom_significant_achievements"].grid.cannot_delete_rows = true; // Prevents row deletion
        frm.fields_dict["custom_significant_achievements"].grid.wrapper.find('.grid-remove-rows').hide(); // Hides bulk delete
        frm.fields_dict["custom_significant_achievements"].grid.only_sortable = false;
        frm.fields_dict["custom_significant_achievements"].refresh();

        // 2. Handle "custom_targets" Table
        frm.fields_dict["custom_targets"].grid.cannot_add_rows = true;
        frm.fields_dict["custom_targets"].grid.cannot_delete_rows = true; // Prevents row deletion
        frm.fields_dict["custom_targets"].grid.wrapper.find('.grid-remove-rows').hide(); // Hides bulk delete
        frm.fields_dict["custom_targets"].grid.only_sortable = false;
        frm.fields_dict["custom_targets"].refresh();
    }
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
        if (frappe.user.has_role("Appraisal Assessor")) {
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
        
       
        // ── Force translate all grid headers after render ────────────────────────
        if (frm.doc.custom_language === 'Arabic') {
            [300, 700, 1200, 2000, 3500].forEach(function(delay) {
                setTimeout(_forceTranslateAllGridHeaders, delay);
            });
            _attachGridObserver(frm);
        }

        // Force translate significant_achievements header
// Force translate grid headers — multiple delays to catch re-renders
// [500, 1000, 1500, 2500, 4000].forEach(function(delay) {
//     setTimeout(function() {
//         [
//             'custom_significant_achievements',
//             'custom_targets',
//             'custom_rejected_significant_achievements',
//             'custom_rejected_targets'
//         ].forEach(function(fieldname) {
//             var wrapper = document.querySelector(
//                 '[data-fieldname="' + fieldname + '"]'
//             );
//             if (!wrapper) return;
//             wrapper.querySelectorAll(
//                 '.grid-heading .col .static-area, .grid-heading .col label'
//             ).forEach(function(el) {
//                 var txt = el.textContent.trim();
//                 if (txt === 'Description')      el.textContent = 'الوصف';
//                 if (txt === 'Assessor Remarks') el.textContent = 'ملاحظات المقيِّم';
//                 if (txt === 'No.')              el.textContent = 'م';
//             });
//         });
//     }, delay);
// });
    },


    
    generate_ai_insights: function (frm) {
        // 1. Show the animated progress bar dialog
        let loading_dialog = frappe.msgprint({
            title: __('✨ Generating AI Insights'),
            message: `
                <div style="text-align: center; padding: 10px;">
                    <p style="font-size: 14px; color: #555;">AI is reading the competencies and writing an L&D action plan...</p>
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
        setTimeout(() => {
            frappe.dom.freeze(__('Updating Data...'));
            window.location.reload();
        }, 400);
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


// function applyArabicTransform(html) {

//     // ── 1. Replace text content INSIDE specific HTML tags only ───────────
//     // This targets .lbl divs, .section spans, th/td text, etc.
//     // without accidentally replacing CSS class names or attribute values

//     const labelMap = {
//         // ── Section Headers ──
//         "Employee Details":         "بيانات الموظف",
//         "Performance Grid":         "شبكة الأداء",
//         "Galfar Values":            "قيم غالفار",
//         "Goals":                    "الأهداف",
//         "Score Summary":            "ملخص الدرجات",

//         // ── Employee Details Labels ──
//         "GEC No":                   "رقم GEC",
//         "Employee Name":            "اسم الموظف",
//         "Company":                  "الشركة",
//         "Grade":                    "الدرجة",
//         "Unit":                     "الوحدة",
//         "Project":                  "المشروع",
//         "Designation":              "المسمى الوظيفي",
//         "Assessment Date":          "تاريخ التقييم",
//         "Date of Joining":          "تاريخ الالتحاق",
//         "Qualification":            "المؤهل العلمي",
//         "Certifications":           "الشهادات",
//         "Experience":               "الخبرة",

//         // ── Appraisal Cycle row labels (with emoji) ──
//         "📅 Appraisal Cycle":       "📅 دورة التقييم",
//         "🗓️ Period":                "🗓️ الفترة",
//         "🏅 Total Score":           "🏅 الدرجة الإجمالية",
//         "👤 Assessor":              "👤 المقيِّم",
//         "Previous Ratings":         "التقييمات السابقة",

//         // ── Badges (header area) ──
//         "Cycle:":                   "الدورة:",
//         "Grade:":                   "الدرجة:",

//         // ── Performance Grid ──
//         "PERFORMANCE RATING GRID":  "شبكة تقييم الأداء",
//         "Poor":                     "ضعيف",
//         "Acceptable":               "مقبول",
//         "Good":                     "جيد",
//         "Very Good":                "جيد جداً",
//         "Excellent":                "ممتاز",
//         "Performance is below expectations; behavior is contrary to company standards.":
//             "الأداء دون المستوى المطلوب؛ السلوك مخالف لمعايير الشركة.",
//         "Inconsistent demonstration of this value; requires coaching or behavioral adjustment.":
//             "تطبيق غير منتظم لهذه القيمة؛ يتطلب توجيهاً أو تعديلاً في السلوك.",
//         "Consistently demonstrates this value in day-to-day work; meets the standard.":
//             "يُظهر هذه القيمة باستمرار في عمله اليومي؛ يستوفي المعيار.",
//         "Frequently goes above and beyond standard requirements regarding this value.":
//             "كثيراً ما يتجاوز المتطلبات القياسية فيما يخص هذه القيمة.",
//         "Consistently far exceeds expectations; acts as a role model and champions this value to others.":
//             "يتجاوز التوقعات باستمرار؛ يُعدّ قدوة ويُروّج لهذه القيمة للآخرين.",

//         // ── Overall Effectiveness ──
//         "OVERALL EFFECTIVENESS":    "الفاعلية الإجمالية",

//         // ── Worker Criteria ──
//         "⚙️ Evaluation Criteria":   "⚙️ معايير التقييم",
//         "📈 Productivity %":        "📈 نسبة الإنتاجية %",
//         "📅 Absences":              "📅 الغيابات",
//         "1 - Poor":                 "1 - ضعيف",
//         "2 - Acceptable":           "2 - مقبول",
//         "3 - Good":                 "3 - جيد",
//         "4 - Very Good":            "4 - جيد جداً",
//         "5 - Excellent":            "5 - ممتاز",
//         "Below 86%":                "أقل من 86%",
//         "87% – 90%":                "87% – 90%",
//         "91% – 100%":               "91% – 100%",
//         "101% – 120%":              "101% – 120%",
//         "Above 120%":               "أكثر من 120%",
//         "7 Days +":                 "7 أيام فأكثر",
//         "5 – 6 Days":               "5 – 6 أيام",
//         "3 – 4 Days":               "3 – 4 أيام",
//         "1 – 2 Days":               "1 – 2 يوم",
//         "Zero Unauthorized":        "صفر غياب غير مأذون",

//         // ── Goals Table Headers ──
//         "No.":                      "م",
//         "Goal":                     "الهدف",
//         "Description":              "الوصف",
//         "Wt %":                     "الوزن %",
//         "Self Score":               "التقييم الذاتي",
//         "Assessor Score":           "تقييم المقيِّم",
//         "Rating":                   "التقدير",
//         "Add KRA...":               "أضف KRA...",
//         "Self":                     "ذاتي",
//         "Assessor":                 "المقيِّم",

//         // ── Score Summary Cards ──
//         "OVERALL EFFECTIVENESS - SELF ASSESSMENT":
//             "الفاعلية الإجمالية - التقييم الذاتي",
//         "OVERALL EFFECTIVENESS - ASSESSOR ASSESSMENT":
//             "الفاعلية الإجمالية - تقييم المقيِّم",
//         "out of 5.00":              "من 5.00",

//         // ── Status Labels ──
//         "Draft":                    "مسودة",
//         "Approved":                 "معتمد",
//         "Pending for Assessor":     "بانتظار المقيِّم",
//         "Accepted":                 "مقبول",
//         "Cancelled":                "ملغى",

//         // ── Footer ──
//         "If anyone scores 1&amp;2 in Safety it will not be considered as 4 &amp; 5 in Overall Effectiveness rating.":
//             "إذا حصل أي موظف على درجة 1 أو 2 في السلامة، فلن يُحتسب تقييمه 4 أو 5 في الفاعلية الإجمالية.",
//         "Note":                     "ملاحظة",

//         // ── Experience ──
//         "Pre-Galfar:":              "قبل غالفار:",
//         "Galfar :":                 "غالفار :",
//         "Years":                    "سنوات",

//         // ── Saved Status ──
//         "✓ Saved":                  "✓ تم الحفظ",
//     };

//     // ── 2. Smart replacement: only inside >TEXT< boundaries ──────────────
//     // Replaces text that appears between > and < (i.e. actual HTML text nodes)
//     // This prevents accidentally replacing CSS values, class names, or JS vars

//     Object.entries(labelMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

//         // Match the English text only when it appears as HTML text content
//         // i.e. preceded by > (with optional whitespace) and followed by < or end of text node
//         let regex = new RegExp('(>\\s*)(' + escaped + ')(\\s*(?:<|&))', 'g');
//         html = html.replace(regex, '$1' + ar + '$3');

//         // Also handle cases where text is at end of tag content (before newline or </tag>)
//         let regex2 = new RegExp('(>\\s*)(' + escaped + ')(\\s*\\n)', 'g');
//         html = html.replace(regex2, '$1' + ar + '$3');

//         // Handle placeholder attributes like placeholder="Add KRA..."
//         if (en === 'Add KRA...') {
//             html = html.replace(/placeholder="Add KRA\.\.\."/g, 'placeholder="أضف KRA..."');
//         }
//     });

//     // ── 3. Fix lbl divs specifically — these are the main culprit ────────
//     // Pattern: <div class="lbl">TEXT</div>  →  replace TEXT with Arabic
//     const lblMap = {
//         "GEC No":           "رقم GEC",
//         "Employee Name":    "اسم الموظف",
//         "Company":          "الشركة",
//         "Grade":            "الدرجة",
//         "Unit":             "الوحدة",
//         "Project":          "المشروع",
//         "Designation":      "المسمى الوظيفي",
//         "Assessment Date":  "تاريخ التقييم",
//         "Date of Joining":  "تاريخ الالتحاق",
//         "Qualification":    "المؤهل العلمي",
//         "Certifications":   "الشهادات",
//         "Experience":       "الخبرة",
//         "📅 Appraisal Cycle": "📅 دورة التقييم",
//         "🗓️ Period":        "🗓️ الفترة",
//         "🏅 Total Score":   "🏅 الدرجة الإجمالية",
//         "👤 Assessor":      "👤 المقيِّم",
//     };

//     Object.entries(lblMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         // Target specifically: <div class="lbl">LABEL</div>
//         html = html.replace(
//             new RegExp('(<div class="lbl">)' + escaped + '(</div>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // ── 4. Fix section header spans specifically ──────────────────────────
//     // Pattern: <span style='font-size:15px;'>TEXT</span>
//     const sectionMap = {
//         "Employee Details": "بيانات الموظف",
//         "Performance Grid": "شبكة الأداء",
//         "Galfar Values":    "قيم غالفار",
//         "Goals":            "الأهداف",
//         "Score Summary":    "ملخص الدرجات",
//     };

//     Object.entries(sectionMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         // With style attribute
//         html = html.replace(
//             new RegExp("(<span style='font-size:15px;'>)" + escaped + "(</span>)", 'g'),
//             '$1' + ar + '$2'
//         );
//         // Without style attribute (plain span)
//         html = html.replace(
//             new RegExp('(<span>)' + escaped + '(</span>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // ── 5. Fix table headers <th> ─────────────────────────────────────────
//     const thMap = {
//         "No.":              "م",
//         "Goal":             "الهدف",
//         "Description":      "الوصف",
//         "Wt %":             "الوزن %",
//         "Self Score":       "التقييم الذاتي",
//         "Assessor Score":   "تقييم المقيِّم",
//         "Rating":           "التقدير",
//     };

//     Object.entries(thMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         html = html.replace(
//             new RegExp('(<th[^>]*>\\s*)' + escaped + '(\\s*</th>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // ── 6. Fix score card labels <div class="sc-label"> ──────────────────
//     html = html.replace(
//         /(<div class="sc-label">)OVERALL EFFECTIVENESS - SELF ASSESSMENT(<\/div>)/g,
//         '$1الفاعلية الإجمالية - التقييم الذاتي$2'
//     );
//     html = html.replace(
//         /(<div class="sc-label">)OVERALL EFFECTIVENESS - ASSESSOR ASSESSMENT(<\/div>)/g,
//         '$1الفاعلية الإجمالية - تقييم المقيِّم$2'
//     );
//     html = html.replace(
//         /(<div class="sc-sub">)out of 5\.00(<\/div>)/g,
//         '$1من 5.00$2'
//     );

//     // ── 7. Fix performance grid title ────────────────────────────────────
//     html = html.replace(
//         /(<th colspan="5" class="pg-main-title">)PERFORMANCE RATING GRID(<\/th>)/g,
//         '$1شبكة تقييم الأداء$2'
//     );

//     // ── 8. Fix pg-col-label spans (Poor/Acceptable/Good/Very Good/Excellent)
//     const pgLabelMap = {
//         "Poor":      "ضعيف",
//         "Acceptable": "مقبول",
//         "Good":      "جيد",
//         "Very Good": "جيد جداً",
//         "Excellent": "ممتاز",
//     };
//     Object.entries(pgLabelMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         html = html.replace(
//             new RegExp('(<span class="pg-col-label"[^>]*>)' + escaped + '(</span>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // ── 9. Fix pg-desc-text paragraphs ───────────────────────────────────
//     const pgDescMap = {
//         "Performance is below expectations; behavior is contrary to company standards.":
//             "الأداء دون المستوى المطلوب؛ السلوك مخالف لمعايير الشركة.",
//         "Inconsistent demonstration of this value; requires coaching or behavioral adjustment.":
//             "تطبيق غير منتظم لهذه القيمة؛ يتطلب توجيهاً أو تعديلاً في السلوك.",
//         "Consistently demonstrates this value in day-to-day work; meets the standard.":
//             "يُظهر هذه القيمة باستمرار في عمله اليومي؛ يستوفي المعيار.",
//         "Frequently goes above and beyond standard requirements regarding this value.":
//             "كثيراً ما يتجاوز المتطلبات القياسية فيما يخص هذه القيمة.",
//         "Consistently far exceeds expectations; acts as a role model and champions this value to others.":
//             "يتجاوز التوقعات باستمرار؛ يُعدّ قدوة ويُروّج لهذه القيمة للآخرين.",
//     };
//     Object.entries(pgDescMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         html = html.replace(
//             new RegExp('(<p class="pg-desc-text"[^>]*>)' + escaped + '(</p>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // ── 10. Fix Overall Effectiveness bar ────────────────────────────────
//     html = html.replace(
//         /(<span class="pg-oe-label"[^>]*>)OVERALL EFFECTIVENESS(<\/span>)/g,
//         '$1الفاعلية الإجمالية$2'
//     );

//     // ── 11. Fix worker criteria titles ───────────────────────────────────
//     html = html.replace(
//         /(<div class="wc-title">)⚙️ Evaluation Criteria(<\/div>)/g,
//         '$1⚙️ معايير التقييم$2'
//     );
//     html = html.replace(
//         /(<div class="wc-card-title">)📈 Productivity %(<\/div>)/g,
//         '$1📈 نسبة الإنتاجية %$2'
//     );
//     html = html.replace(
//         /(<div class="wc-card-title">)📅 Absences(<\/div>)/g,
//         '$1📅 الغيابات$2'
//     );

//     // ── 12. Fix worker criteria rows (wc-row spans) ───────────────────────
//     const wcRowMap = {
//         "1 - Poor":         "1 - ضعيف",
//         "2 - Acceptable":   "2 - مقبول",
//         "3 - Good":         "3 - جيد",
//         "4 - Very Good":    "4 - جيد جداً",
//         "5 - Excellent":    "5 - ممتاز",
//         "Below 86%":        "أقل من 86%",
//         "87% – 90%":        "87% – 90%",
//         "91% – 100%":       "91% – 100%",
//         "101% – 120%":      "101% – 120%",
//         "Above 120%":       "أكثر من 120%",
//         "7 Days +":         "7 أيام فأكثر",
//         "5 – 6 Days":       "5 – 6 أيام",
//         "3 – 4 Days":       "3 – 4 أيام",
//         "1 – 2 Days":       "1 – 2 يوم",
//         "Zero Unauthorized":"صفر غياب غير مأذون",
//     };
//     Object.entries(wcRowMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         html = html.replace(
//             new RegExp('(<span>)' + escaped + '(</span>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // ── 13. Fix KRA card "Self" and "Assessor" row labels ─────────────────
//     html = html.replace(
//         /(<div class="kra-row-label">)Self(<\/div>)/g,
//         '$1ذاتي$2'
//     );
//     html = html.replace(
//         /(<div class="kra-row-label"[^>]*>)Assessor(<\/div>)/g,
//         '$1المقيِّم$2'
//     );

//     // ── 14. Fix footer ────────────────────────────────────────────────────
//     html = html.replace(
//         /(<div class="footer-left">)If anyone scores 1&amp;2 in Safety it will not be considered as 4 &amp; 5 in Overall Effectiveness rating\.(<\/div>)/g,
//         '$1إذا حصل أي موظف على درجة 1 أو 2 في السلامة، فلن يُحتسب تقييمه 4 أو 5 في الفاعلية الإجمالية.$2'
//     );
//     html = html.replace(
//         /(<div class="footer-right">)Note(<\/div>)/g,
//         '$1ملاحظة$2'
//     );

//     // ── 15. Fix Previous Ratings label ───────────────────────────────────
//     html = html.replace(
//         /Previous Ratings/g,
//         'التقييمات السابقة'
//     );

//     // ── 16. Fix badge text (Cycle: / Grade:) ─────────────────────────────
//     html = html.replace(/Cycle: /g, 'الدورة: ');
//     html = html.replace(/Grade: /g,  'الدرجة: ');

//     // ── 17. Fix experience string ─────────────────────────────────────────
//     html = html.replace(/Pre-Galfar:/g, 'قبل غالفار:');
//     html = html.replace(/Galfar :/g,    'غالفار :');
//     html = html.replace(/ Years/g,      ' سنوات');

//     // ── 18. Fix doc status labels ─────────────────────────────────────────
//     html = html.replace(/>● Draft</g,               '>● مسودة<');
//     html = html.replace(/>● Approved</g,            '>● معتمد<');
//     html = html.replace(/>● Pending for Assessor</g,'>● بانتظار المقيِّم<');
//     html = html.replace(/>● Accepted</g,            '>● مقبول<');
//     html = html.replace(/>● Cancelled</g,           '>● ملغى<');

//     // ── 19. Load Arabic font once ─────────────────────────────────────────
//     if (!document.getElementById('arabic-font-link')) {
//         let link  = document.createElement('link');
//         link.id   = 'arabic-font-link';
//         link.rel  = 'stylesheet';
//         link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap';
//         document.head.appendChild(link);
//     }

//     // ── 20. RTL override styles ───────────────────────────────────────────
//     let rtlStyles = `
//     <style id="rtl-override">
//         body, .form, .body, .header-inner, .info-table,
//         .goals-table, .pg-table, .kra-cards-grid, .score-cards, .footer {
//             direction:   rtl !important;
//             text-align:  right !important;
//             font-family: 'Cairo', sans-serif !important;
//         }
//         .header-inner  { flex-direction: row-reverse !important; }
//         .badges        { flex-direction: row-reverse !important; }
//         .assessor-cell { flex-direction: row-reverse !important; }
//         .star-row      { flex-direction: row-reverse !important; }
//         .pg-oe-bar     { flex-direction: row-reverse !important; }
//         .wc-row        { flex-direction: row-reverse !important; }
//         .footer        { flex-direction: row-reverse !important; }

//         .doc-meta  { left: 40px !important; right: auto !important; text-align: left !important; }
//         .logo-html { left: 1px !important;  right: auto !important; }

//         .goals-table thead th                   { text-align: right !important; }
//         .col-no, .col-weight, .col-stars, .col-pill { text-align: center !important; }
//         .goals-table tbody td, .info-table td   { text-align: right !important; }

//         .section::after {
//             background: linear-gradient(270deg, var(--gold-bright), rgba(201,168,76,.3), transparent) !important;
//         }

//         .kra-card       { text-align: right !important; align-items: flex-end !important; }
//         .kra-card-title { text-align: right !important; justify-content: flex-end !important; }
//         .kra-row-label  { text-align: right !important; }

//         .score-card, .sc-label, .sc-val, .sc-sub { text-align: right !important; }

//         .kra-input { text-align: right !important; direction: rtl !important; }

//         .lbl            { font-size: 11px !important; letter-spacing: 0 !important; }
//         .val            { font-size: 13px !important; }
//         .emp-name,
//         .pg-oe-label,
//         .pg-main-title,
//         .sc-label       { letter-spacing: 0 !important; font-family: 'Cairo', sans-serif !important; }

//         /* Fix pg-desc-text RTL alignment */
//         .pg-desc-text   { text-align: right !important; direction: rtl !important; }

//         /* Fix wc-row to show label on right, value on left in RTL */
//         .wc-row         { direction: rtl !important; }

//         /* Fix collapsible section header text */
//         .section span   { font-family: 'Cairo', sans-serif !important; }

//         /* Previous ratings center */
//         [colspan="4"] div { text-align: center !important; }
//     </style>`;

//     html = html.replace('</head>', rtlStyles + '</head>');

//     // ── 21. Set RTL on html and body ──────────────────────────────────────
//     html = html.replace('<html lang="en">', '<html lang="ar" dir="rtl">');
//     html = html.replace('<body>',           '<body dir="rtl">');

//         // ── Fix Objectives Section ────────────────────────────────────────────

//     // Section header
//     html = html.replace(
//         /(<span[^>]*>)Main Objectives - Linked to Galfar Strategic Priorities(<\/span>)/g,
//         '$1الأهداف الرئيسية - المرتبطة بالأولويات الاستراتيجية لغالفار$2'
//     );

//     // Also try without style attribute (plain span)
//     html = html.replace(
//         />Main Objectives - Linked to Galfar Strategic Priorities</g,
//         '>الأهداف الرئيسية - المرتبطة بالأولويات الاستراتيجية لغالفار<'
//     );

//     // Table headers in objectives child table
//     const objectivesThMap = {
//         "Objective":                "الهدف",
//         "Description":              "الوصف",
//         "Self Rating":              "التقييم الذاتي",
//         "Assessor Rating":          "تقييم المقيِّم",
//         "Self Comments":            "تعليقات الموظف",
//         "Assessor Comments":        "تعليقات المقيِّم",
//         "Weightage":                "الوزن",
//         "Score":                    "الدرجة",
//         "Target":                   "الهدف المستهدف",
//         "Achievement":              "الإنجاز",
//         "Status":                   "الحالة",
//         "Actions":                  "الإجراءات",
//         "No.":                      "م",
//         "Sr. No":                   "م",
//         "Sr No":                    "م",
//     };

//     Object.entries(objectivesThMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         html = html.replace(
//             new RegExp('(<th[^>]*>\\s*)' + escaped + '(\\s*</th>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // Table cell labels inside objectives rows
//     const objectivesTdMap = {
//         "Objective":        "الهدف",
//         "Description":      "الوصف",
//         "Self Rating":      "التقييم الذاتي",
//         "Assessor Rating":  "تقييم المقيِّم",
//         "Self Comments":    "تعليقات الموظف",
//         "Assessor Comments":"تعليقات المقيِّم",
//         "Not Started":      "لم يبدأ",
//         "In Progress":      "قيد التنفيذ",
//         "Completed":        "مكتمل",
//         "Pending":          "معلق",
//         "Cancelled":        "ملغى",
//     };

//     Object.entries(objectivesTdMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         html = html.replace(
//             new RegExp('(<td[^>]*>\\s*)' + escaped + '(\\s*</td>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // .lbl inside objectives table
//     const objectivesLblMap = {
//         "Objective":        "الهدف",
//         "Description":      "الوصف",
//         "Self Rating":      "التقييم الذاتي",
//         "Assessor Rating":  "تقييم المقيِّم",
//         "Self Comments":    "تعليقات الموظف",
//         "Assessor Comments":"تعليقات المقيِّم",
//         "Weightage":        "الوزن",
//         "Score":            "الدرجة",
//         "Target":           "الهدف المستهدف",
//         "Achievement":      "الإنجاز",
//         "Status":           "الحالة",
//     };

//     Object.entries(objectivesLblMap).forEach(([en, ar]) => {
//         let escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
//         html = html.replace(
//             new RegExp('(<div class="lbl">)' + escaped + '(</div>)', 'g'),
//             '$1' + ar + '$2'
//         );
//     });

//     // ── Convert Western numerals to Arabic-Indic numerals ──────────────────
//     function toArabicNumerals(str) {
//         return str.replace(/[0-9]/g, function(d) {
//             return '٠١٢٣٤٥٦٧٨٩'[d];
//         });
//     }

//     // Apply to specific HTML text content only (not CSS values, IDs, or JS vars)
//     // Target: .val divs, .lbl divs, score pills, table cells, pg-oe-val, sc-val, etc.

//     // .val content
//     html = html.replace(
//         /(<div class="val"[^>]*>)([\s\S]*?)(<\/div>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // score pills  e.g.  "3 / 5"
//     html = html.replace(
//         /(<span class="score-pill[^"]*"[^>]*>)([\s\S]*?)(<\/span>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // score-sub  e.g.  "3 / 5"  and  "out of 5.00" (already translated)
//     html = html.replace(
//         /(<div class="score-sub">)([\s\S]*?)(<\/div>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // sc-val  (big score number in summary cards)
//     html = html.replace(
//         /(<div class="sc-val"[^>]*>)([\s\S]*?)(<\/div>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // pg-oe-val  (Overall Effectiveness score)
//     html = html.replace(
//         /(<span class="pg-oe-val"[^>]*>)([\s\S]*?)(<\/span>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // hdr-total-score inside .val
//     html = html.replace(
//         /(<div class="val"[^>]*id="hdr-total-score"[^>]*>)([\s\S]*?)(<\/div>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // weightage % in table  e.g. "20%"
//     html = html.replace(
//         /(<td class="col-weight"[^>]*>)([\s\S]*?)(<\/td>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // row index numbers  <td class="col-no">
//     html = html.replace(
//         /(<td class="col-no">)([\s\S]*?)(<\/td>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // Previous rating year labels  e.g. "Rating 2023"
//     html = html.replace(
//         /(<div class="lbl">تقييم )([\s\S]*?)(<\/div>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // Previous rating values
//     html = html.replace(
//         /(<div class="val">)([\d.]+)(<\/div>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // doc name / appraisal number in header
//     html = html.replace(
//         /(<div class="doc-no">📄 )([\s\S]*?)(<\/div>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // star score text  e.g.  "3 / 5"  inside tbl-score spans
//     html = html.replace(
//         /(<span id="tbl-score-\d+"[^>]*>)(\d+)(<\/span>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );
//     html = html.replace(
//         /(<span id="tbl-self-score-\d+"[^>]*>)(\d+)(<\/span>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // pg-oe-score span
//     html = html.replace(
//         /(<span[^>]*id="pg-oe-score"[^>]*>)([\s\S]*?)(<\/span>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );

//     // summary-total-goal span
//     html = html.replace(
//         /(<div class="sc-val"[^>]*id="summary-total-goal"[^>]*>)([\s\S]*?)(<\/div>)/g,
//         function(match, open, content, close) {
//             return open + toArabicNumerals(content) + close;
//         }
//     );
//     return html;
// }


function renderInTranslatableIframe($wrapper, htmlContent, targetLang, onDone) {
    
    // ── 1. Inject a <meta> tag that tells Google Translate the page language ──
    let prepHTML = htmlContent
    .replace('<html lang="en">', '<html lang="en" translate="yes">')
    .replace('<head>',
        `<head>
        <meta name="google" content="notranslate" id="notranslate-meta" style="display:none">
        <meta http-equiv="Content-Language" content="en">
        <style>
            /* Hide Google Translate toolbar */
            .goog-te-banner-frame,
            .goog-te-banner-frame.skiptranslate,
            #goog-gt-tt,
            .goog-tooltip,
            .goog-tooltip:hover,
            .goog-text-highlight { 
                display: none !important; 
                visibility: hidden !important;
            }
            body { top: 0 !important; }
            body.translated-ltr,
            body.translated-rtl { top: 0 !important; }
        </style>
        <script>
            function notifyTranslated() {
                try { window.parent.postMessage({ type: 'translation-done' }, '*'); } catch(e) {}
            }
        <\/script>`
    );

    // ── 2. Remove old iframe if any ──
    $wrapper.find('#translate-iframe').remove();

    // ── 3. Create visible iframe inside the wrapper ──
    let $iframe = $('<iframe>', {
        id:            'translate-iframe',
        frameborder:   '0',
        scrolling:     'no',
        css: {
            width:      '100%',
            border:     'none',
            display:    'block',
            minHeight:  '200px',
        }
    });

    $wrapper.html('');
    $wrapper.append($iframe);

    let iframe    = $iframe[0];
    let iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // ── 4. Write English HTML into iframe ──
    iframeDoc.open();
    iframeDoc.write(prepHTML);
    iframeDoc.close();

    // ── 5. Auto-resize iframe to content height ──
    function resizeIframe() {
        try {
            let h = iframeDoc.body.scrollHeight;
            $iframe.css('height', (h + 40) + 'px');
        } catch(e) {}
    }

    // ── 6. Programmatically trigger Google Translate ──
    iframe.onload = function() {
        resizeIframe();

        function hideGoogleBar() {
            try {
                // ── Target the banner injected into the PARENT page ──
                const selectors = [
                    '.goog-te-banner-frame',
                    '.skiptranslate',
                    '#goog-gt-tt',
                    '.goog-te-ftab-float',
                ];

                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        el.style.setProperty('display', 'none', 'important');
                        el.style.setProperty('visibility', 'hidden', 'important');
                    });
                });

                // ── Fix body being pushed down ──
                document.body.style.setProperty('top', '0px', 'important');
                document.documentElement.style.setProperty('top', '0px', 'important');

                // ── Also target inside the iframe ──
                try {
                    const iframeDoc = iframe.contentDocument;
                    if (iframeDoc && iframeDoc.body) {
                        iframeDoc.body.style.setProperty('top', '0', 'important');
                        selectors.forEach(sel => {
                            iframeDoc.querySelectorAll(sel).forEach(el => {
                                el.style.setProperty('display', 'none', 'important');
                            });
                        });
                    }
                } catch(e) {}

            } catch(e) {}
        }



    // Run immediately and repeatedly since Google re-injects it
    hideGoogleBar();
    var bannerKiller = setInterval(hideGoogleBar, 300);
    
        setTimeout(function() {

            try {
                let iframeWin = iframe.contentWindow;

                // ── Method A: Use Google Translate Element if available ──
                if (typeof iframeWin.google !== 'undefined' &&
                    typeof iframeWin.google.translate !== 'undefined') {

                    new iframeWin.google.translate.TranslateElement(
                        {
                            pageLanguage:     'en',
                            includedLanguages: 'ar',
                            autoDisplay:       true,
                            layout: iframeWin.google.translate.TranslateElement.InlineLayout.SIMPLE
                        },
                        iframeDoc.body
                    );

                } else {
                    // ── Method B: Inject Google Translate script into iframe ──
                    let gtScript = iframeDoc.createElement('script');
                    gtScript.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateInit';
                    iframeDoc.head.appendChild(gtScript);

                    // Define the callback inside the iframe
                    iframeWin.googleTranslateInit = function() {
                        new iframeWin.google.translate.TranslateElement(
                            {
                                pageLanguage:      'en',
                                includedLanguages:  'ar',
                                autoDisplay:        true,
                            },
                            iframeDoc.getElementById('google-translate-container') || iframeDoc.body
                        );

                        // Force Arabic selection after widget loads
                        setTimeout(function() {
                            let select = iframeDoc.querySelector('.goog-te-combo');
                            if (select) {
                                select.value = 'ar';
                                select.dispatchEvent(new Event('change'));
                            }
                            resizeIframe();
                            if (onDone) onDone();
                        }, 1500);
                    };
                }

            } catch(e) {
                console.warn('Google Translate inject failed:', e);

                // ── Method C: Fallback — open in new tab with Google Translate ──
                frappe.show_alert({
                    message: '⚠️ Auto-translate blocked. Opening in translator...',
                    indicator: 'orange'
                }, 4);

                // Encode the HTML as a data URI and open in Google Translate
                let blob    = new Blob([prepHTML], { type: 'text/html' });
                let blobUrl = URL.createObjectURL(blob);
                window.open(
                    'https://translate.google.com/translate?sl=en&tl=ar&u=' + encodeURIComponent(blobUrl),
                    '_blank'
                );
            }

            resizeIframe();

        }, 800);
    };

    // ── 7. Resize again after a delay (translation adds content) ──
    setTimeout(resizeIframe, 3000);
    setTimeout(resizeIframe, 5000);
}

    // ── Arabic grid translation globals ─────────────────────────────────────────
var GRID_COL_MAP = {
    "No.":               "م",
    "Description":       "الوصف",
    "Assessor Remarks":  "ملاحظات المقيِّم",
    "Assessor Comments": "تعليقات المقيِّم",
    "Employee Comments": "تعليقات الموظف",
    "Self Comments":     "تعليقات الموظف",
    "Objective":         "الهدف",
    "Self Rating":       "التقييم الذاتي",
    "Assessor Rating":   "تقييم المقيِّم",
    "Weightage":         "الوزن",
    "Score":             "الدرجة",
    "Status":            "الحالة",
    "Remarks":           "ملاحظات",
    "Add row":           "إضافة صف",
    "Goal":              "الهدف",
    "Wt %":              "الوزن %",
    "Self Score":        "التقييم الذاتي",
    "Rating":            "التقدير",
    "Achievement":       "الإنجاز",
    "Target":            "الهدف المستهدف",
    "Actions":           "الإجراءات",
    "Acceptable":        "مقبول",
    "Not Acceptable":    "غير مقبول",
    "KRA":               "مؤشر الأداء",
    "Per Weightage":     "نسبة الوزن",
    "Score Earned":      "الدرجة المكتسبة",
    "Employee Comment":  "تعليق الموظف",
};

var ARABIC_GRID_FIELDNAMES = [
    'custom_significant_achievements',
    'custom_rejected_significant_achievements',
    'custom_targets',
    'custom_rejected_targets',
    'custom_objectives',
    'goals'
];

// function _translateGridWrapper(wrapper) {
//     if (!wrapper) return;

//     // 1. Column headers
//     wrapper.querySelectorAll(
//         '.grid-heading .col .static-area, .grid-heading .col label'
//     ).forEach(function(el) {
//         var txt = (el.textContent || '').trim();
//         if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
//     });

//     // 2. Read-only cell values (collapsed rows)
//     wrapper.querySelectorAll('.like-disabled-input').forEach(function(el) {
//         var txt = (el.textContent || '').trim();
//         if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
//     });

//     // 3. Static area values inside body rows
//     wrapper.querySelectorAll(
//         '.grid-body .rows .grid-row .col .static-area'
//     ).forEach(function(el) {
//         var txt = (el.textContent || '').trim();
//         if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
//     });

//     // 4. Expanded row field labels
//     wrapper.querySelectorAll(
//         '.grid-form .form-column .frappe-control .control-label'
//     ).forEach(function(el) {
//         var txt = (el.textContent || '').trim();
//         if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
//     });

//     // 5. Expanded row select options and displayed values
//     wrapper.querySelectorAll(
//         '.grid-form select option, .grid-form .like-disabled-input'
//     ).forEach(function(el) {
//         var txt = (el.textContent || '').trim();
//         if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
//     });

//     // 6. "Add row" button
//     wrapper.querySelectorAll('.grid-footer .grid-add-row').forEach(function(el) {
//         if ((el.textContent || '').trim() === 'Add row') {
//             el.textContent = 'إضافة صف';
//         }
//     });

//     // 7. RTL on all columns
//     wrapper.querySelectorAll(
//         '.grid-heading .col, .grid-body .rows .grid-row .col'
//     ).forEach(function(el) {
//         el.style.direction  = 'rtl';
//         el.style.textAlign  = 'right';
//         el.style.fontFamily = "'Cairo', sans-serif";
//     });
// }

function _translateGridWrapper(wrapper) {
    if (!wrapper) return;

    // 1. Column headers — always translate
    wrapper.querySelectorAll(
        '.grid-heading .col .static-area, .grid-heading .col label'
    ).forEach(function(el) {
        var txt = (el.textContent || '').trim();
        if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
    });
    var fieldname = (wrapper.getAttribute && wrapper.getAttribute('data-fieldname'))
        || (wrapper.closest && wrapper.closest('[data-fieldname]') && 
            wrapper.closest('[data-fieldname]').getAttribute('data-fieldname'));
    var isGoalsGrid = (fieldname === 'goals' ||
                      fieldname === 'custom_additional_goals_for_worker_');

    if (!isGoalsGrid) {
        // Safe to translate cell values in non-KRA grids
        wrapper.querySelectorAll('.like-disabled-input').forEach(function(el) {
            var txt = (el.textContent || '').trim();
            if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
        });
        wrapper.querySelectorAll(
            '.grid-body .rows .grid-row .col .static-area'
        ).forEach(function(el) {
            var txt = (el.textContent || '').trim();
            if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
        });
    }
    // 3. Expanded row field labels (translate labels, not values)
    wrapper.querySelectorAll(
        '.grid-form .form-column .frappe-control .control-label'
    ).forEach(function(el) {
        var txt = (el.textContent || '').trim();
        if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
        else if (ARABIC_LABEL_MAP[txt]) el.textContent = ARABIC_LABEL_MAP[txt];
    });

    // 4. Expanded row select options (Remarks dropdown: Acceptable/Not Acceptable)
    wrapper.querySelectorAll(
        '.grid-form select option, .grid-form .like-disabled-input'
    ).forEach(function(el) {
        var txt = (el.textContent || '').trim();
        if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
    });

    // 5. "Add row" button
    wrapper.querySelectorAll('.grid-footer .grid-add-row').forEach(function(el) {
        if ((el.textContent || '').trim() === 'Add row') {
            el.textContent = 'إضافة صف';
        }
    });

    // 6. RTL on all columns
    wrapper.querySelectorAll(
        '.grid-heading .col, .grid-body .rows .grid-row .col'
    ).forEach(function(el) {
        el.style.direction  = 'rtl';
        el.style.textAlign  = 'right';
        el.style.fontFamily = "'Cairo', sans-serif";
    });
}

function _observeGrid(wrapper) {
    if (!wrapper || wrapper.__arabicObserver) return;

    var observer = new MutationObserver(function() {
        clearTimeout(wrapper.__arabicObserverTimer);
        wrapper.__arabicObserverTimer = setTimeout(function() {
            _translateGridWrapper(wrapper);
        }, 80);
    });

    observer.observe(wrapper, { childList: true, subtree: true });
    wrapper.__arabicObserver = observer;
}

function _attachGridObserver(frm) {
    ARABIC_GRID_FIELDNAMES.forEach(function(fieldname) {
        var fieldObj = frm && frm.fields_dict && frm.fields_dict[fieldname];
        var wrapper  = fieldObj
            ? (fieldObj.grid && fieldObj.grid.wrapper && fieldObj.grid.wrapper[0])
            : document.querySelector('[data-fieldname="' + fieldname + '"]');

        if (!wrapper) return;

        // Translate immediately
        _translateGridWrapper(wrapper);

        // Watch for any future DOM changes
        _observeGrid(wrapper);

        // Catch row expand clicks with a small delay
        $(wrapper).off('click.arabic-row').on('click.arabic-row', function() {
            setTimeout(function() { _translateGridWrapper(wrapper); }, 120);
            setTimeout(function() { _translateGridWrapper(wrapper); }, 400);
        });
    });
}

function _forceTranslateAllGridHeaders() {
    ARABIC_GRID_FIELDNAMES.forEach(function(fieldname) {
        var wrapper = document.querySelector('[data-fieldname="' + fieldname + '"]');
        _translateGridWrapper(wrapper);
    });

    // Global fallback
    document.querySelectorAll('.grid-heading .col .static-area').forEach(function(el) {
        var txt = (el.textContent || '').trim();
        if (GRID_COL_MAP[txt]) el.textContent = GRID_COL_MAP[txt];
    });
}



function applyArabicToFrappeFields(frm) {

    // Load Arabic font once
    if (!document.getElementById('arabic-font-link')) {
        var link  = document.createElement('link');
        link.id   = 'arabic-font-link';
        link.rel  = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap';
        document.head.appendChild(link);
    }

    // ── 1. Translate ALL control labels on the form ──────────────────────
    // This catches every field label including new ones automatically
    $(frm.wrapper).find('.control-label, .label-area').each(function() {
        _translateElement(this, ARABIC_LABEL_MAP);
    });

    // ── 2. Translate all Tab labels ──────────────────────────────────────
    $(frm.wrapper).find('.form-tabs-list .nav-link, .tab-content .tab-pane .section-head').each(function() {
        _translateElement(this, ARABIC_LABEL_MAP);
    });

    // ── 3. Translate all grid column headers across ALL grids ────────────
    $(frm.wrapper).find('.grid-heading .col .static-area, .grid-heading .col label').each(function() {
        _translateElement(this, ARABIC_LABEL_MAP);
    });

    // // ── 4. Translate all read-only field values ──────────────────────────
    // $(frm.wrapper).find('.like-disabled-input, .control-value').each(function() {
    //     _translateElement(this, ARABIC_LABEL_MAP);
    // });
    // ── 4. Translate all read-only field values ──────────────────────────

   // In the section that translates read-only field values:
    $(frm.wrapper).find('.like-disabled-input, .control-value').each(function() {
        var inGoalsGrid = $(this).closest(
            '[data-fieldname="goals"], [data-fieldname="custom_additional_goals_for_worker_"]'
        ).length > 0;
        // Also skip kra-input elements entirely
        if (!inGoalsGrid && !$(this).hasClass('kra-input')) {
            _translateElement(this, ARABIC_LABEL_MAP);
        }
    });

    // ── 5. Translate link field display values ───────────────────────────
    $(frm.wrapper).find('.control-input .link-btn, .control-input a').each(function() {
        _translateElement(this, ARABIC_LABEL_MAP);
    });

    // ── 6. Translate section headings ────────────────────────────────────
    $(frm.wrapper).find('.section-head .label-area').each(function() {
        _translateElement(this, ARABIC_LABEL_MAP);
    });

    // ── 7. Translate custom button labels ────────────────────────────────
    $(frm.page.inner_toolbar).find('.btn-custom').each(function() {
        _translateElement(this, ARABIC_LABEL_MAP);
    });

    // ── 8. Translate mandatory field markers' adjacent labels ────────────
    $(frm.wrapper).find('.reqd-asterisk').siblings('.label-area').each(function() {
        _translateElement(this, ARABIC_LABEL_MAP);
    });

    // ── 10. Translate field description texts (shown below field labels) ──────
    var DESCRIPTION_MAP = {
        "Significant Achievements / Noteworthy effects if any":
            "الإنجازات البارزة / التأثيرات الجديرة بالملاحظة إن وجدت",
        "Average of Goal Score, Feedback Score, and Self Appraisal Score":
            "متوسط درجة الهدف ودرجة التغذية الراجعة ودرجة التقييم الذاتي",
    };

    $(frm.wrapper).find('.help-box, .field-description, .form-group .help-block').each(function() {
        var txt = ($(this).text() || '').trim();
        Object.keys(DESCRIPTION_MAP).forEach(function(key) {
            if (txt === key || txt.includes(key)) {
                $(this).text(DESCRIPTION_MAP[key]);
            }
        }.bind(this));
    });

    
    
    // ── 9. Apply RTL styles to ALL fields ────────────────────────────────
    _applyRTLStyles(frm);
    _forceTranslateAllGridHeaders(frm);

    // ── Re-translate on any grid interaction ─────────────────────────────────
    $(frm.wrapper).find('.form-grid').off('click.arabic').on('click.arabic', function() {
        setTimeout(_forceTranslateAllGridHeaders, 200);
        setTimeout(_forceTranslateAllGridHeaders, 600);
    });
    // Re-run grid translation after delays (grids render late)
    setTimeout(function() { _translateGridsDeep(frm); _forceTranslateAllGridHeaders(); }, 400);
    setTimeout(function() { _translateGridsDeep(frm); _forceTranslateAllGridHeaders(); }, 1200);
    setTimeout(function() { _forceTranslateAllGridHeaders(); }, 2500);
}

// ── Helper: translate a single element ──────────────────────────────────────
function _translateElement(el, map) {
    if (!el) return;
    var txt = (el.textContent || '').trim();
    if (!txt) return;

    // Sort keys longest first to avoid partial replacement of longer phrases
    var keys = Object.keys(map).sort(function(a, b) { return b.length - a.length; });

    for (var i = 0; i < keys.length; i++) {
        if (txt === keys[i]) {
            el.textContent = map[keys[i]];
            return;
        }
    }
    // Partial match fallback
    for (var i = 0; i < keys.length; i++) {
        if (txt.includes(keys[i])) {
            el.textContent = txt.split(keys[i]).join(map[keys[i]]);
            return;
        }
    }
}


function _translateGridsDeep(frm) {
    $(frm.wrapper).find('.form-grid').each(function() {
        var fieldname = $(this).closest('[data-fieldname]').attr('data-fieldname');
        var isKraGrid = (fieldname === 'goals' || 
                         fieldname === 'custom_additional_goals_for_worker_');

        // Column headers — always translate
        $(this).find('.grid-heading .col .static-area, .grid-heading .col label').each(function() {
            _translateElement(this, ARABIC_LABEL_MAP);
        });

        // Body cell values — SKIP KRA grids
        if (!isKraGrid) {
            $(this).find('.grid-body .rows .grid-row .col .static-area').each(function() {
                _translateElement(this, ARABIC_LABEL_MAP);
            });
            $(this).find('.like-disabled-input').each(function() {
                _translateElement(this, ARABIC_LABEL_MAP);
            });
        }
    });

    $(frm.wrapper).find('.control-label').each(function() {
        _translateElement(this, ARABIC_LABEL_MAP);
    });
}

// ── Helper: apply RTL to the entire form ────────────────────────────────────
function _applyRTLStyles(frm) {
    if (document.getElementById('frappe-arabic-rtl')) return; // inject once

    var style = document.createElement('style');
    style.id  = 'frappe-arabic-rtl';
    style.textContent = `
        /* Apply RTL to ALL form controls */
        .form-column .frappe-control .control-label {
            direction: rtl !important;
            text-align: right !important;
            font-family: 'Cairo', sans-serif !important;
            letter-spacing: 0 !important;
        }
        .form-column .frappe-control input,
        .form-column .frappe-control textarea,
        .form-column .frappe-control select,
        .form-column .frappe-control .control-value,
        .form-column .frappe-control .like-disabled-input {
            direction: rtl !important;
            text-align: right !important;
            font-family: 'Cairo', sans-serif !important;
        }
        /* Grid headers RTL */
        .form-grid .grid-heading .col {
            direction: rtl !important;
            text-align: right !important;
            font-family: 'Cairo', sans-serif !important;
        }
        /* Grid body cells RTL */
        .form-grid .grid-body .col {
            direction: rtl !important;
            font-family: 'Cairo', sans-serif !important;
        }
        /* Section headers RTL */
        .form-section .section-head .label-area {
            direction: rtl !important;
            font-family: 'Cairo', sans-serif !important;
        }
        /* Tab labels RTL */
        .form-tabs-list .nav-link {
            font-family: 'Cairo', sans-serif !important;
        }
    `;
    document.head.appendChild(style);
}

// ── removeArabicView: restore English ────────────────────────────────────────
function removeArabicView(frm) {
    // Remove RTL styles
    var rtlStyle = document.getElementById('frappe-arabic-rtl');
    if (rtlStyle) rtlStyle.remove();

    // Reload the English HTML preview
    var $wrapper = frm.get_field('custom_employee_overview').$wrapper;
    if (frm._cached_english_html) {
        $wrapper.html(frm._cached_english_html);
    } else {
        frappe.call({
            method: "pms_ai.custom.appraisal_html_template_employee_overview",
            args: { appraisal_name: frm.doc.name },
            callback: function(r) {
                if (r.message) $wrapper.html(r.message);
            }
        });
    }

    // // Reload the page to restore all English labels
    // frappe.show_alert({ message: '🔄 Switching to English...', indicator: 'blue' }, 2);
    // setTimeout(function() {
    //     window.location.reload();
    // }, 600);
    // frm.refresh();
}

// function applyArabicToFrappeFields(frm) {

//     const FIELD_LABEL_MAP = {
//         // ── Field labels ──
//         "Significant Achievements, if any":                         "الإنجازات البارزة، إن وجدت",
//         "Significant Achievements / Noteworthy effects if any":     "الإنجازات البارزة / التأثيرات الجديرة بالملاحظة إن وجدت",
//         "Remarks":                                                   "ملاحظات",
//         "remarks":                                                   "ملاحظات",
//         "Main Objectives - Linked to Galfar Strategic Priorities":  "الأهداف الرئيسية - المرتبطة بالأولويات الاستراتيجية لغالفار",
//         "Employee Comments":                                         "تعليقات الموظف",
//         "Assessor Comments":                                         "تعليقات المقيِّم",
//         "Accessor Comments":                                         "تعليقات المقيِّم",

//         // ── Objectives table column headers ──
//         "No.":                          "م",
//         "Objective":                    "الهدف",
//         "Description":                  "الوصف",
//         "Self Rating":                  "التقييم الذاتي",
//         "Assessor Rating":              "تقييم المقيِّم",
//         "Self Comments":                "تعليقات الموظف",
//         "Weightage":                    "الوزن",
//         "Score":                        "الدرجة",
//         "Target":                       "الهدف المستهدف",
//         "Achievement":                  "الإنجاز",
//         "Status":                       "الحالة",
//         "Actions":                      "الإجراءات",

//         // ── Objective names ──
//         "People and Culture":           "الناس والثقافة",
//         "Technical Innovation":         "الابتكار التقني",
//         "Project Operation Excellence": "التميز في تشغيل المشاريع",
//         "Sustainability and Diversity": "الاستدامة والتنوع",
//         "Financial Liquidity":          "السيولة المالية",
//         "Other Personal Objectives":    "الأهداف الشخصية الأخرى",

//         // ── Objective descriptions ──
//         "Nationals in key positions (C1 – E2) (Company) Strategic Workforce Plan to be presented by end of Q3 Employee turnover":
//             "المواطنون في المناصب الرئيسية (C1 – E2) خطة القوى العاملة الاستراتيجية للشركة معدل دوران الموظفين",
//         "Adopt new technologies Digital Transformation Progress Cost Savings from Technologies Implemented":
//             "اعتماد التقنيات الجديدة تقدم التحول الرقمي توفير التكاليف من التقنيات المطبقة",
//         "Improve project schedule management Improve project cost management Improve Labour Productivity":
//             "تحسين إدارة جدول المشروع تحسين إدارة تكاليف المشروع تحسين إنتاجية العمالة",
//         "Gender Balance and Career development D&I Index":
//             "التوازن بين الجنسين والتطوير الوظيفي مؤشر التنوع والشمول",
//         "Gross Profit Margin (%) Improve cash flow Operating Cash Flow to Current Liabilities Cash Conversion Cycle (DSO+DIO-DPO)":
//             "هامش الربح الإجمالي (%) تحسين التدفق النقدي التدفق النقدي التشغيلي إلى الالتزامات المتداولة دورة تحويل النقد",
//         "Self Training & Development":  "التدريب والتطوير الذاتي",
//     };

//     // ── Helper: translate a single DOM element's text ──────────────────
//     function translateEl(el) {
//         if (!el) return;
//         let original = el.textContent.trim();
//         // Sort keys longest first so longer phrases match before substrings
//         let keys = Object.keys(FIELD_LABEL_MAP).sort((a,b) => b.length - a.length);
//         for (let key of keys) {
//             if (original === key) {
//                 el.textContent = FIELD_LABEL_MAP[key];
//                 return;
//             }
//         }
//         // Partial match — replace within text
//         for (let key of keys) {
//             if (original.includes(key)) {
//                 el.textContent = original.split(key).join(FIELD_LABEL_MAP[key]);
//                 original = el.textContent;
//             }
//         }
//     }

//     // ── 1. Translate field-level control labels ────────────────────────
//     const fieldNames = [
//         'custom_significant_achievements',
//         'remarks',
//         'custom_employee_comments',
//         'custom_accessor_comments',
//         'custom_objectives',
//         'custom_targets',
//         'description'
//     ];

//     fieldNames.forEach(function(fieldname) {
//         let field = frm.fields_dict[fieldname];
//         if (!field) return;

//         // Main label
//         let $label = field.$wrapper.find('.control-label');
//         if ($label.length) translateEl($label[0]);

//         // Grid column headers
//         field.$wrapper.find('.grid-heading .col .static-area, .grid-heading .col label').each(function() {
//             translateEl(this);
//         });

//         // Grid body cell values (links, text)
//         field.$wrapper.find('.grid-body .rows .grid-row .col .static-area').each(function() {
//             translateEl(this);
//         });

//         // Input values inside grid rows
//         field.$wrapper.find('.grid-body .rows .grid-row input[type="text"], .grid-body .rows .grid-row textarea').each(function() {
//             let val = $(this).val().trim();
//             let keys = Object.keys(FIELD_LABEL_MAP).sort((a,b) => b.length - a.length);
//             for (let key of keys) {
//                 if (val === key) {
//                     $(this).val(FIELD_LABEL_MAP[key]);
//                     break;
//                 }
//             }
//         });

//         // Rendered read-only values (.like-disabled-input, .control-value)
//         field.$wrapper.find('.like-disabled-input, .control-value').each(function() {
//             translateEl(this);
//         });

//         // Link field display text (anchor tags)
//         field.$wrapper.find('a').each(function() {
//             translateEl(this);
//         });
//     });

//     // ── 2. Translate grid column headers specifically ──────────────────
//     // (Sometimes Frappe renders them outside field wrapper)
//     [
//         '[data-fieldname="custom_objectives"]',
//         '[data-fieldname="custom_significant_achievements"]',
//         '[data-fieldname="custom_targets"]',
//         '[data-fieldname="remarks"]',
//     ].forEach(function(selector) {
//         $(selector).find('.grid-heading .col').each(function() {
//             let $area = $(this).find('.static-area, label');
//             $area.each(function() { translateEl(this); });
//         });

//         // Row data cells
//         $(selector).find('.grid-body .rows .grid-row').each(function() {
//             $(this).find('.col .static-area, .col .like-disabled-input, .col a').each(function() {
//                 translateEl(this);
//             });
//         });
//     });

//     // ── 3. Apply RTL to these Frappe fields ───────────────────────────
//     let rtlCSS = `
//         [data-fieldname="custom_significant_achievements"] .grid-heading .col,
//         [data-fieldname="custom_significant_achievements"] .grid-body .col,
//         [data-fieldname="custom_objectives"] .grid-heading .col,
//         [data-fieldname="custom_objectives"] .grid-body .col,
//         [data-fieldname="custom_targets"] .grid-heading .col,
//         [data-fieldname="custom_targets"] .grid-body .col,
//         [data-fieldname="remarks"] .control-input,
//         [data-fieldname="custom_employee_comments"] .control-input,
//         [data-fieldname="custom_accessor_comments"] .control-input {
//             direction:   rtl !important;
//             text-align:  right !important;
//             font-family: 'Cairo', sans-serif !important;
//         }
//         [data-fieldname="custom_significant_achievements"] .control-label,
//         [data-fieldname="custom_objectives"] .control-label,
//         [data-fieldname="custom_targets"] .control-label,
//         [data-fieldname="remarks"] .control-label,
//         [data-fieldname="custom_employee_comments"] .control-label,
//         [data-fieldname="custom_accessor_comments"] .control-label {
//             direction:   rtl !important;
//             text-align:  right !important;
//             font-family: 'Cairo', sans-serif !important;
//             letter-spacing: 0 !important;
//         }
//     `;

//     if (!document.getElementById('frappe-arabic-rtl')) {
//         let style = document.createElement('style');
//         style.id  = 'frappe-arabic-rtl';
//         style.textContent = rtlCSS;
//         document.head.appendChild(style);
//     }

//     // ── 4. Re-run after grid renders (Frappe re-renders on scroll/expand) ─
//     setTimeout(function() { applyArabicToFrappeFields_rerender(frm, FIELD_LABEL_MAP); }, 500);
//     setTimeout(function() { applyArabicToFrappeFields_rerender(frm, FIELD_LABEL_MAP); }, 1500);
// }

// function normalizeText(txt) {
//     return (txt || "")
//         .replace(/\u00A0/g, " ")   // nbsp
//         .replace(/\s+/g, " ")      // multiple spaces/newlines
//         .trim();
// }

// ── Re-render pass (called after grid paint delay) ─────────────────────
// function applyArabicToFrappeFields_rerender(frm, FIELD_LABEL_MAP) {
//     let keys = Object.keys(FIELD_LABEL_MAP).sort((a,b) => b.length - a.length);

//     [
//         'custom_significant_achievements',
//         'custom_objectives',
//         'description',
//         'custom_targets',
//         'remarks',
//         'employee_comments',
//         'assessor_comments',
//     ].forEach(function(fieldname) {
//         let field = frm.fields_dict[fieldname];
//         if (!field) return;

//         field.$wrapper.find(
//             '.static-area, label, .like-disabled-input, .control-value, a, .control-label'
//         ).each(function() {
//             let el  = this;
//             let txt = el.textContent.trim();
//             for (let key of keys) {
//                 if (txt === key) {
//                     el.textContent = FIELD_LABEL_MAP[key];
//                     return;
//                 }
//             }
//         });
//     });
//     // ── Translate description field inside custom_objectives child table ──
// let objectives_field = frm.fields_dict["custom_objectives"];

// if (objectives_field) {
//     objectives_field.$wrapper.find(
//     '[data-fieldname="description"] textarea, \
//      [data-fieldname="description"] .control-value, \
//      [data-fieldname="description"] .static-area, \
//      [data-fieldname="description"] .like-disabled-input'
// ).each(function () {

//     let $el = $(this);

//     let current_text = $el.is("textarea")
//         ? normalizeText($el.val())
//         : normalizeText($el.text());

//     Object.keys(FIELD_LABEL_MAP).forEach(function(key) {

//         let normalized_key = normalizeText(key);

//         // partial OR full match
//         if (current_text.includes(normalized_key)) {

//             let translated =
//                 current_text.replace(
//                     normalized_key,
//                     FIELD_LABEL_MAP[key]
//                 );

//             if ($el.is("textarea")) {
//                 $el.val(translated);
//             } else {
//                 $el.text(translated);
//             }
//         }
//     });
// });
// }
// }

// ── Complete Arabic label map — covers ALL fields including new ones ──────
var ARABIC_LABEL_MAP = {

    // ── Tab labels ──
    "Overview":                                         "نظرة عامة",
    "Appraisal":                                        "التقييم",
    "Analytics":                                        "التحليلات",
    "Arabic Appraisal Form":                            "نموذج التقييم بالعربية",

    // ── Section / field labels ──
    "Employee":                                         "الموظف",
    "Employee Name":                                    "اسم الموظف",
    "Appraisal Cycle":                                  "دورة التقييم",
    "Company":                                          "الشركة",
    "Department":                                       "القسم",
    "Designation":                                      "المسمى الوظيفي",
    "Employment Type":                                  "نوع التوظيف",
    "Grade":                                            "الدرجة",
    "Unit":                                             "الوحدة",
    "GEC No":                                           "رقم GEC",
    "Division":                                         "القسم / المشروع",
    "Qualification":                                    "المؤهل العلمي",
    "Certifications":                                   "الشهادات",
    "Experience":                                       "الخبرة",
    "Date of Joining":                                  "تاريخ الالتحاق",
    "Assessor":                                         "المقيِّم",
    "Assessor Name":                                    "اسم المقيِّم",
    "Language":                                         "اللغة",
    "Arabic":                                           "العربية",
    "English":                                          "الإنجليزية",

    // ── Score fields ──
    "OVERALL EFFECTIVENESS":                            "الفاعلية الإجمالية",
    "TOTAL SELF SCORE":                                 "مجموع التقييم الذاتي",
    "Total Assessor Score":                             "مجموع تقييم المقيِّم",
    "Final Score":                                      "الدرجة النهائية",
    "Goal Score (%)":                                   "نسبة درجة الهدف",
    "Accepteable":                                      "مقبول",

    // ── Main content fields ──
    "Significant Achievements, if any":                 "الإنجازات البارزة، إن وجدت",
    "Significant Achievements / Noteworthy effects if any": "الإنجازات البارزة / التأثيرات الجديرة بالملاحظة",
    "Significant Achievements During  The Review Period": "الإنجازات البارزة خلال فترة المراجعة",
    "Targets For Next Appraisal Period":                "الأهداف للفترة القادمة",
    "Main Objectives - Linked to Galfar Strategic Priorities": "الأهداف الرئيسية - المرتبطة بالأولويات الاستراتيجية لغالفار",
    "Employee Comments":                                "تعليقات الموظف",
    "Assessor Comments":                                "تعليقات المقيِّم",
    "Accessor Comments":                                "تعليقات المقيِّم",
    "Remarks":                                          "ملاحظات",
    "remarks":                                          "ملاحظات",
    "Note":                                             "ملاحظة",
    "AI Insights":                                      "رؤى الذكاء الاصطناعي",
    "Arabic Overview":                                  "النظرة العامة بالعربية",
    "Employee Overview":                                "نظرة عامة على الموظف",
    "Appraisal Template":                               "نموذج التقييم",
    "Goals":                                            "الأهداف",
    "Additional Goals for Worker":                      "أهداف إضافية للعامل",
    "Appraisal Preview":                                "معاينة التقييم",

    // ── Rejected tables ──
    "Rejected Significant Achievements":                "الإنجازات المرفوضة",
    "Rejected Targets":                                 "الأهداف المرفوضة",

    // ── Grid column headers ──
    "No.":                                              "م",
    "Objective":                                        "الهدف",
    "Description":                                      "الوصف",
    "Self Rating":                                      "التقييم الذاتي",
    "Assessor Rating":                                  "تقييم المقيِّم",
    "Self Comments":                                    "تعليقات الموظف",
    "Weightage":                                        "الوزن",
    "Score":                                            "الدرجة",
    "Target":                                           "الهدف المستهدف",
    "Achievement":                                      "الإنجاز",
    "Status":                                           "الحالة",
    "Actions":                                          "الإجراءات",
    "Goal":                                             "الهدف",
    "Wt %":                                             "الوزن %",
    "Self Score":                                       "التقييم الذاتي",
    "Rating":                                           "التقدير",

    // ── Objective names ──
    "People and Culture":                               "الناس والثقافة",
    "Technical Innovation":                             "الابتكار التقني",
    "Project Operation Excellence":                     "التميز في تشغيل المشاريع",
    "Sustainability and Diversity":                     "الاستدامة والتنوع",
    "Financial Liquidity":                              "السيولة المالية",
    "Other Personal Objectives":                        "الأهداف الشخصية الأخرى",

    // ── Status values ──
    "Draft":                                            "مسودة",
    "Approved":                                         "معتمد",
    "Pending for Assessor":                             "بانتظار المقيِّم",
    "Accepted":                                         "مقبول",
    "Cancelled":                                        "ملغى",
    "Overdue":                                          "متأخر",
    "Completed":                                        "مكتمل",

    // ── Dates ──
    "Self Approval Date":                               "تاريخ الموافقة الذاتية",
    "Submitted Date":                                   "تاريخ التقديم",
    "Assessment Date":                                  "تاريخ التقييم",
    "Start Date":                                       "تاريخ البداية",
    "End Date":                                         "تاريخ النهاية",

    // ── Buttons ──
    "Save":                                             "حفظ",
    "Submit":                                           "إرسال",
    "Cancel":                                           "إلغاء",
    "Amend":                                            "تعديل",
    "PDF":                                              "PDF",
    "Print":                                            "طباعة",
    "Language":                                         "اللغة",
    "Generate AI Insights ✨ ":                         "توليد رؤى الذكاء الاصطناعي ✨",
    "🌐 Language":                                      "🌐 اللغة",
};

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


// function loadLanguageView(frm) {
//     var $wrapper = frm.get_field('custom_employee_overview').$wrapper;

//     if (frm.doc.custom_language === "Arabic") {

//         // ── Load overview HTML (once) ──────────────────────────────────
//         if (!frm._arabic_loaded) {
//             frm._arabic_loaded = true;

//             frappe.call({
//                 method: "pms_ai.custom.appraisal_html_template_employee_overview",
//                 args: { appraisal_name: frm.doc.name },
//                 callback: function(r) {
//                     if (!r.message) return;
//                     frm._cached_english_html = r.message;
//                     renderInTranslatableIframe($wrapper, r.message, 'ar');
//                     applyArabicToFrappeFields(frm);

//                     // ── Fetch + inject child table translations ────────
//                     fetchAndApplyArabicTranslations(frm, false);

//                     [500, 1000, 1800, 3000].forEach(function(d) {
//                         setTimeout(_forceTranslateAllGridHeaders, d);
//                     });

//                     // Re-inject at staggered delays (grids render late)
//                     [600, 1200, 2500].forEach(function(d) {
//                         setTimeout(function() {
//                             _injectTranslationsIntoAllGrids(frm);
//                         }, d);
//                     });
//                 }
//             });
//             fetchAndApplyArabicTranslations(frm);
//         } else {
//             applyArabicToFrappeFields(frm);
//             _injectTranslationsIntoAllGrids(frm);   // re-inject from cache
//         }

//     } else {
//         frm._arabic_loaded = false;
//         frappe.call({
//             method: 'frappe.client.set_value',
//             args: {
//                 doctype: 'Appraisal',
//                 name: frm.doc.name,
//                 fieldname: 'custom_language',
//                 value: 'English'
//             },
//             callback: function() {
//                 frappe.show_alert({ message: '🔄 Switching to English...', indicator: 'blue' }, 2);
//                 setTimeout(function() { window.location.reload(); }, 700);
//             }
//         });
//     }
// }

function loadLanguageView(frm) {
    var $wrapper = frm.get_field('custom_employee_overview').$wrapper;

    if (frm.doc.custom_language === "Arabic") {

        if (!frm._arabic_loaded) {
            frm._arabic_loaded = true;

            frappe.call({
                method: "pms_ai.custom.appraisal_html_template_employee_overview",
                args: { appraisal_name: frm.doc.name },
                callback: function(r) {
                    if (!r.message) return;
                    frm._cached_english_html = r.message;
                    renderInTranslatableIframe($wrapper, r.message, 'ar');
                    applyArabicToFrappeFields(frm);
                    fetchAndApplyArabicTranslations(frm, false);

                    [500, 1000, 1800, 3000].forEach(function(d) {
                        setTimeout(_forceTranslateAllGridHeaders, d);
                    });

                    [600, 1200, 2500].forEach(function(d) {
                        setTimeout(function() {
                            _injectTranslationsIntoAllGrids(frm);
                        }, d);
                    });
                }
            });
            fetchAndApplyArabicTranslations(frm);
        } else {
            applyArabicToFrappeFields(frm);
            _injectTranslationsIntoAllGrids(frm);
        }

    } else {
        // ✅ English — just restore view, NO reload
        frm._arabic_loaded = false;
        removeArabicView(frm);
    }
}

frappe.ui.form.on('Appraisal Goal', {
    custom_self_score: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let self_score = Math.round((flt(row.custom_self_score) || 0) * 5);
        frappe.model.set_value(cdt, cdn, 'score', 0);
        frappe.model.set_value(cdt, cdn, 'custom_self_score_with_weighted', self_score*(row.per_weightage/100));

        // If changed in additional table, sync to goals table
        if (row.parentfield === 'custom_additional_goals_for_worker_') {
            (frm.doc.goals || []).forEach(function (g) {
                if (g.kra === row.kra) {
                    frappe.model.set_value('Appraisal Goal', g.name, 'custom_self_score', row.custom_self_score);
                    frappe.model.set_value('Appraisal Goal', g.name, 'custom_self_score_with_weighted', self_score*(row.per_weightage/100));
                }
            });
        }

        // If changed in goals table, sync to additional table
        if (row.parentfield === 'goals') {
            (frm.doc.custom_additional_goals_for_worker_ || []).forEach(function (g) {
                if (g.kra === row.kra) {
                    frappe.model.set_value('Appraisal Goal', g.name, 'custom_self_score_with_weighted', row.custom_self_score*(row.per_weightage/100));
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

function setup_remarks_watchers(frm) {}
frappe.ui.form.on("Objective Details", {
    form_render(frm, cdt, cdn) {
        frm.fields_dict["custom_objectives"].grid.update_docfield_property(
            "employee_comments", "read_only", 1
        );

        let row_form = frm.fields_dict["custom_objectives"].grid
            .get_row(cdn)?.grid_form;

        if (row_form?.fields_dict?.["employee_comments"]) {
            row_form.fields_dict["employee_comments"].df.read_only = 1;
            row_form.fields_dict["employee_comments"].refresh();
        }
    }
});
frappe.ui.form.on('Significant Achievements', {
    remarks(frm, cdt, cdn) {
        handle_assessor_remarks_change(frm, cdt, cdn, 'custom_significant_achievements', 'custom_rejected_significant_achievements');
    },
    
    achievement_justification(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        
        if (row.achievement_justification) {
            
            frappe.dom.freeze(__('Validating uploaded file...'));
            
            frappe.call({
                method: "pms_ai.custom.validate_and_set_image", 
                args: { 
                    "file_url": row.achievement_justification,
                    "employee": frm.doc.employee 
                },
                callback: function(r) {
                    frappe.dom.unfreeze(); 
                    
                    if (r.message === "Not Allow") {
                        frappe.model.set_value(cdt, cdn, 'achievement_justification', '');
                        frappe.throw(__("File size is too large. It must be less than 100 KB."));
                    } else if (r.message === "Success") {
                        frappe.show_alert({message: __('File verified successfully!'), indicator: 'green'});
                    }
                },
                error: function() {
                    frappe.dom.unfreeze();
                }
            });
        }
    }
});

frappe.ui.form.on('Targets', {
    remarks(frm, cdt, cdn) {
        handle_assessor_remarks_change(frm, cdt, cdn, 'custom_targets', 'custom_rejected_targets');
    }
});

function handle_assessor_remarks_change(frm, cdt, cdn, source_table, rejected_table) {
    const row = locals[cdt][cdn];

    console.log('remarks fired | value:', row.remarks, '| state:', frm.doc.workflow_state, '| role:', frappe.user.has_role('Appraisal Assessor'));

    if (!frappe.user.has_role('Appraisal Assessor')) return;
    if (frm.doc.workflow_state !== 'Pending for Assessor') return;
    if (row.remarks !== 'Not Acceptable') return;

    const dialog = new frappe.ui.Dialog({
        title: __('Reason for Not Acceptable'),
        fields: [{
            fieldtype: 'Small Text',
            fieldname: 'typed_reason',
            label: __('Assessor Remarks'),
            reqd: 1,
            description: __('Please provide a reason why this item is not acceptable.')
        }],
        primary_action_label: __('Submit'),
        // primary_action(values) {
        //     if (!values.typed_reason) {
        //         frappe.msgprint(__('Please enter remarks before submitting.'));
        //         return;
        //     }

        //     // ── Step 1: Copy original row to rejected table ────────────────
        //     const old_description = row.description;
        //     const new_rejected_row = frm.add_child(rejected_table);
        //     new_rejected_row.description = old_description;
        //     new_rejected_row.remarks = row.remarks;
        //     new_rejected_row.assessor_remarks = values.typed_reason;
        //     new_rejected_row.source_row_name = row.name;
        //     frm.refresh_field(rejected_table);

        //     // ── Step 2: Update same row's description with assessor's reason
        //     frappe.model.set_value(cdt, cdn, 'description', values.typed_reason);
        //     frappe.model.set_value(cdt, cdn, 'assessor_remarks', values.typed_reason);

        //     dialog.hide();
        //     frm.dirty();

        //     frappe.show_alert({
        //         message: __('Remarks saved and old description moved to rejected table.'),
        //         indicator: 'orange'
        //     }, 5);
        // },
        
        primary_action(values) {
                if (!values.typed_reason) {
                    frappe.msgprint(__('Please enter remarks before submitting.'));
                    return;
                }

                // ── Step 1: Copy original row to rejected table ────────────────
                const old_description = row.description;
                const new_rejected_row = frm.add_child(rejected_table);
                new_rejected_row.description = old_description;
                new_rejected_row.remarks = row.remarks;
                new_rejected_row.assessor_remarks = values.typed_reason;
                new_rejected_row.source_row_name = row.name;
                frm.refresh_field(rejected_table);

                // ── Step 2: Update same row ────────────────────────────────────
                frappe.model.set_value(cdt, cdn, 'description', values.typed_reason);
                frappe.model.set_value(cdt, cdn, 'assessor_remarks', values.typed_reason);
                frappe.model.set_value(cdt, cdn, 'remarks', '');  // ← add here

                dialog.hide();
                frm.dirty();

                frappe.show_alert({
                    message: __('Remarks saved and old description moved to rejected table.'),
                    indicator: 'orange'
                }, 5);
            },
        
        secondary_action_label: __('Cancel'),
        secondary_action() {
            frappe.model.set_value(cdt, cdn, 'remarks', '');
            dialog.hide();
        }
    });

    dialog.show();
}

function handle_workflow_state_change(frm) {
    // No move needed at Accepted — already handled at Pending for Assessor stage
}
