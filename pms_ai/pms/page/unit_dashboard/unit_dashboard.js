frappe.pages['unit-dashboard'].on_page_load = function(wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Unit Appraisal Dashboard',
        single_column: true
    });

    page.add_inner_button('📄 Export PDF', function () {
        export_pdf();
    });

    $('head').append(`<style id="unit-dash-styles">
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .ud-wrap * { box-sizing: border-box; font-family: 'Inter', sans-serif; }

        .ud-filter-bar {
            display: flex; gap: 12px; align-items: flex-end;
            background: #fff; padding: 14px 20px;
            border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06);
            margin-bottom: 18px; flex-wrap: wrap;
        }
        .ud-filter-bar .frappe-control { min-width: 160px; margin: 0; }

        .ud-unit-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .ud-unit-tab {
            padding: 7px 18px; border-radius: 20px; font-size: 12px;
            font-weight: 600; cursor: pointer; border: 2px solid #dee2e6;
            background: #fff; color: #495057; transition: all .2s; white-space: nowrap;
        }
        .ud-unit-tab:hover  { border-color: #C8102E; color: #C8102E; }
        .ud-unit-tab.active { background: #C8102E; border-color: #C8102E; color: #fff; }
        .ud-unit-tab.all    { background: #0f1f3d; border-color: #0f1f3d; color: #fff; }

        .ud-kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 18px; }
        .ud-kpi-card {
            background: #fff; border-radius: 10px; padding: 14px 16px; text-align: center;
            box-shadow: 0 2px 8px rgba(0,0,0,.06); cursor: pointer;
            transition: transform .15s, box-shadow .15s; border-top: 3px solid #dee2e6;
        }
        .ud-kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.1); }
        .ud-kpi-card .kpi-val { font-size: 26px; font-weight: 700; color: #0f1f3d; line-height: 1.1; }
        .ud-kpi-card .kpi-lbl { font-size: 10px; font-weight: 600; color: #868e96; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .ud-kpi-card.blue   { border-top-color: #C8102E; } .ud-kpi-card.blue   .kpi-val { color: #C8102E; }
        .ud-kpi-card.green  { border-top-color: #28a745; } .ud-kpi-card.green  .kpi-val { color: #28a745; }
        .ud-kpi-card.orange { border-top-color: #ffc107; } .ud-kpi-card.orange .kpi-val { color: #e6a800; }
        .ud-kpi-card.red    { border-top-color: #e53935; } .ud-kpi-card.red    .kpi-val { color: #e53935; }
        .ud-kpi-card.purple { border-top-color: #7b1fa2; } .ud-kpi-card.purple .kpi-val { color: #7b1fa2; }
        .ud-kpi-card.teal   { border-top-color: #00796b; } .ud-kpi-card.teal   .kpi-val { color: #00796b; }

        /* IMPORTANT: Remove overflow:hidden — it clips content in print */
        .ud-section { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); margin-bottom: 18px; }
        .ud-section-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 12px 18px; background: #f8f9fa;
            border-bottom: 1px solid #e9ecef; cursor: pointer;
            border-radius: 10px 10px 0 0;
        }
        .ud-section-header h4 { margin: 0; font-size: 13px; font-weight: 700; color: #0f1f3d; }
        .ud-section-body { padding: 18px; }

        .ud-chart-wrap { position: relative; width: 100%; }
        .ud-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .ud-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .ud-table th { background: #0f1f3d; color: #fff; padding: 9px 12px; text-align: left; font-size: 11px; letter-spacing: 0.5px; }
        .ud-table td { padding: 9px 12px; border-bottom: 1px solid #e9ecef; }
        .ud-table tr:nth-child(odd)  td { background: #f8f9fa; }
        .ud-table tr:nth-child(even) td { background: #fff; }
        .ud-table tr:hover td { background: #fce8ec; }
        .ud-table tr.kra-group-header td {
            background: #0f1f3d !important; color: #fff;
            font-size: 11px; font-weight: 700; letter-spacing: 0.5px; padding: 7px 12px;
        }
        .ud-table tr.kra-group-header.common td { background: #C8102E !important; }

        .ud-bell-tbl { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
        .ud-bell-tbl th { padding: 6px 10px; text-align: center; font-size: 10px; font-weight: 700; }
        .ud-bell-tbl td { padding: 6px 10px; text-align: center; border-bottom: 1px solid #e9ecef; }
        .ud-bell-tbl tr:nth-child(odd)  td { background: #f8f9fa; }
        .ud-bell-tbl tr:nth-child(even) td { background: #fff; }

        .ud-bell-tab-bar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .ud-bell-tab-btn {
            padding: 5px 16px; border-radius: 20px; font-size: 11px; font-weight: 700;
            cursor: pointer; border: 2px solid #dee2e6; background: #fff;
            color: #495057; transition: all .2s; white-space: nowrap; font-family: 'Inter', sans-serif;
        }
        .ud-bell-tab-btn:hover { opacity: 0.85; }
        .ud-bell-tab-btn.active-combined { background: #0f1f3d; border-color: #0f1f3d; color: #fff; }
        .ud-bell-tab-btn.active-worker   { background: #C8102E; border-color: #C8102E; color: #fff; }
        .ud-bell-tab-btn.active-staff    { background: #2d7a4f; border-color: #2d7a4f; color: #fff; }

        .ud-prog { background: #e9ecef; border-radius: 4px; height: 8px; overflow: hidden; }
        .ud-prog-fill { height: 100%; border-radius: 4px; transition: width .4s; }

        .ud-badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 10px; font-weight: 700; }
        .ud-badge-green  { background: rgba(40,167,69,.12);  color: #28a745; }
        .ud-badge-orange { background: rgba(255,193,7,.15);  color: #e6a800; }
        .ud-badge-red    { background: rgba(229,57,53,.1);   color: #e53935; }
        .ud-badge-blue   { background: rgba(200,16,46,.1);   color: #C8102E; }

        .ud-loading { display: flex; align-items: center; justify-content: center; padding: 40px; color: #868e96; font-size: 13px; gap: 10px; }
        .ud-collapsible-body { display: block; }
        .ud-toggle-icon { font-size: 11px; color: #868e96; }

        @media (max-width: 768px) {
            .ud-kpi-row { grid-template-columns: repeat(3,1fr); }
            .ud-2col { grid-template-columns: 1fr; }
        }

        /* ── Print header & footer (hidden on screen) ── */
        .ud-print-header, .ud-footer { display: none; }

        /* ── PRINT STYLES ── */
     @media print {

    @page {
        size: A4 portrait;
        margin: 10mm;
    }

    /* ── Force Frappe containers to not clip ── */
    html, body,
    .page-wrapper, .page-container,
    .page-content, .page-body,
    .page-body-wrapper,
    .frappe-app, .app-wrapper,
    .main-section, .layout-main,
    .layout-main-section,
    .page-head, .container,
    [data-page-route],
    .ud-wrap {
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
        min-height: 0 !important;
        position: static !important;
    }

    /* ── Hide all Frappe UI ── */
    .navbar,
    .sidebar-section,
    .desk-sidebar,
    .page-head,
    .page-actions,
    .page-form,
    .ud-filter-bar,
    .ud-unit-tabs,
    .ud-print-hide,
    .frappe-timestamp,
    #freeze,
    #toolbar,
    .layout-side-section {
        display: none !important;
    }

    /* ── Show print-only elements ── */
    .ud-print-header {
        display: flex !important;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 8px;
        border-bottom: 2px solid #C8102E;
        margin-bottom: 12px;
    }

    .ud-footer {
        display: block !important;
        position: fixed;
        bottom: 0; left: 0; right: 0;
        text-align: center;
        font-size: 9px;
        color: #868e96;
        border-top: 1px solid #dee2e6;
        padding: 3px 0;
        background: #fff;
    }

    /* ── PDF page breaks ── */
    .pdf-page {
        page-break-after: always !important;
        break-after: page !important;
        page-break-inside: auto !important;
        break-inside: auto !important;
        display: block !important;
        width: 100% !important;
        overflow: visible !important;
    }

    .pdf-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
    }

    /* ── Sections ── */
    .ud-section {
        page-break-inside: auto !important;
        break-inside: auto !important;
        overflow: visible !important;
        box-shadow: none !important;
        border: 1px solid #dee2e6 !important;
        margin-bottom: 10px !important;
    }

    .ud-section-header {
        page-break-after: avoid !important;
        break-after: avoid !important;
    }

    /* ── KPI cards ── */
    .ud-kpi-row {
        display: grid !important;
        grid-template-columns: repeat(6, 1fr) !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }

    .ud-kpi-card {
        box-shadow: none !important;
        border: 1px solid #dee2e6 !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }

    /* ── Tables ── */
    .ud-table, .ud-bell-tbl {
        page-break-inside: auto !important;
        break-inside: auto !important;
    }

    .ud-table thead, .ud-bell-tbl thead {
        display: table-header-group !important;
    }

    .ud-table tr, .ud-bell-tbl tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }

    /* ── Charts ── */
    .ud-chart-wrap {
        overflow: visible !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }

    .ud-chart-wrap img,
    .ud-chart-wrap canvas {
        max-height: 220px !important;
        width: 100% !important;
        object-fit: contain !important;
        display: block !important;
    }

    /* ── Bell panels: show ALL in print ── */
    .ud-bell-panel {
    display: block !important;
}
.ud-bell-panel-hidden {
    display: none !important;
}

    /* ── Collapsibles: always open ── */
    .ud-collapsible-body {
        display: block !important;
    }

    /* ── 2-col layout ── */
    .ud-2col {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 12px !important;
    }

    /* ── Progress bars: force color printing ── */
    .ud-prog-fill {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    /* ── Badges ── */
    .ud-badge {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    /* ── Table header colors ── */
    .ud-table th,
    .ud-table tr.kra-group-header td {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
}
    </style>`);

    $(page.body).html(`
        <div class="ud-wrap" style="padding:16px;">
            <div class="ud-print-header">
                <div class="ud-title-block">
                    <div class="ud-title">Unit Appraisal Dashboard</div>
                    <div class="ud-subtitle"></div>
                </div>
                <div class="ud-print-logo" style="font-size:11px;color:#C8102E;font-weight:700;">GALFAR</div>
            </div>
            <div class="ud-filter-bar" id="ud-filters"></div>
            <div class="ud-unit-tabs" id="ud-unit-tabs">
                <div class="ud-loading"><span class="spinner-border spinner-border-sm"></span> Loading units...</div>
            </div>
            <div id="ud-main"></div>
            <div class="ud-footer">Unit Appraisal Dashboard | Confidential</div>
        </div>
    `);

    let $page          = $(page.body);
    let chartInstances = {};
    let currentUnit    = '__ALL__';

    let _combTarget, _combCounts;
    let _workerTarget, _workerCounts;
    let _staffTarget, _staffCounts;
    let _renderBell;
    let _load_unit_dashboard;

    frappe.require(['https://cdn.jsdelivr.net/npm/chart.js'], function() { init(); });
      function waitForAsyncSections(cb) {
    let maxWait = 3000; // 3 sec safety
    let interval = 200;
    let waited = 0;

    let timer = setInterval(() => {
        let loading = $('.ud-loading:visible').length;

        if (loading === 0 || waited >= maxWait) {
            clearInterval(timer);
            cb();
        }

        waited += interval;
    }, interval);
}  
function export_pdf() {

    let $wrap = $('.ud-wrap');
    if (!$wrap.length) { frappe.msgprint('Dashboard not loaded yet'); return; }

    frappe.show_progress('Preparing PDF...', 10, 100);

    // STEP 1: Expand all collapsible sections
    $wrap.find('.ud-collapsible-body').show();
    $wrap.find('.ud-toggle-icon').text('▼');

    // STEP 2: Render all 3 bell charts into their canvases BEFORE hiding panels,
    //         then snapshot each to <img> so nothing is blank in print.
    //         Hidden panels are kept hidden (display:none) — print CSS must NOT override this.
    if (typeof _renderBell === 'function') {
        // Temporarily make hidden panels visible (but off-screen) so Chart.js can draw
        $wrap.find('.ud-bell-panel-hidden').each(function () {
            $(this)
                .css({ position: 'absolute', left: '-9999px', top: '-9999px', display: 'block' })
                .addClass('_pdf-temp-visible');
        });
    }

    // STEP 3: Convert ALL canvases → images (wait for charts to finish rendering)
    setTimeout(() => {

        frappe.show_progress('Preparing PDF...', 40, 100);

        // Snapshot ALL canvases (including the temporarily visible bell panels)
        $wrap.find('canvas').each(function () {
            let canvas = this;
            try {
                if (canvas.width > 0 && canvas.height > 0) {
                    let img = document.createElement('img');
                    img.src = canvas.toDataURL('image/png', 1.0);
                    img.style.width  = '100%';
                    img.style.maxHeight = '280px';
                    img.style.objectFit = 'contain';
                    img.style.display = 'block';
                    canvas.parentNode.replaceChild(img, canvas);
                }
            } catch (e) {
                console.warn('Canvas capture failed:', e);
            }
        });

        // STEP 4: Restore hidden bell panels to their original hidden state
        $wrap.find('._pdf-temp-visible').each(function () {
            $(this)
                .css({ position: '', left: '', top: '', display: '' })
                .removeClass('_pdf-temp-visible')
                .addClass('ud-bell-panel-hidden')
                .hide();          // back to display:none
        });

        // STEP 5: Set header info
        let unit = $('.ud-unit-tab.active').text().trim();
        let date = frappe.datetime.nowdate();
        $('.ud-subtitle').text(`${unit} | Generated on ${date}`);

        let originalTitle = document.title;
        document.title = `Unit Dashboard - ${unit} - ${date}`;

        frappe.show_progress('Preparing PDF...', 80, 100);

        // STEP 6: Give browser time to reflow, then print
        setTimeout(() => {
            frappe.hide_progress();
            window.print();

            // STEP 7: Restore dashboard after print dialog closes
            setTimeout(() => {
                document.title = originalTitle;
                if (typeof _load_unit_dashboard === 'function') {
                    _load_unit_dashboard(currentUnit);
                }
            }, 1500);

        }, 600);

    }, 900); // slightly longer wait to allow off-screen chart renders
}   // ── Export PDF ─────────────────────────────────────────────────────────────
    function build_pdf_pages() {

    let $wrap = $('.ud-wrap');

    // Remove old pages if re-printing
    $wrap.find('.pdf-page').children().unwrap();

    let elements = $wrap.children().not('.ud-print-header, .ud-footer');

    let currentPage = $('<div class="pdf-page"></div>');
    $wrap.prepend(currentPage);

    let pageHeight = 1000; // safe pixel height for A4
    let usedHeight = 0;

    elements.each(function () {

        let el = $(this);

        // Skip header/footer
        if (el.hasClass('ud-print-header') || el.hasClass('ud-footer')) return;

        let clone = el;

        currentPage.append(clone);

        let h = clone.outerHeight(true);
        usedHeight += h;

        // If exceeds page → move to next page
        if (usedHeight > pageHeight) {

            clone.detach();

            currentPage = $('<div class="pdf-page"></div>');
            $wrap.append(currentPage);

            currentPage.append(clone);

            usedHeight = clone.outerHeight(true);
        }

    });
}

    function _replaceAllChartsWithImages(snapshotDataUrls) {
        // First, try to get fresh dataURL from each live canvas
        let freshSnapshots = {};
        Object.keys(chartInstances).forEach(function(id) {
            try {
                let canvas = chartInstances[id].canvas;
                if (canvas && canvas.width > 0 && canvas.height > 0) {
                    freshSnapshots[id] = canvas.toDataURL('image/png', 1.0);
                }
            } catch(e) {}
        });

        // Replace every canvas in DOM with <img>
        $page.find('canvas').each(function() {
            let canvas   = this;
            let canvasId = canvas.id;
            let src      = null;

            try {
                // Try live canvas first
                if (canvas.width > 0 && canvas.height > 0) {
                    src = canvas.toDataURL('image/png', 1.0);
                }
            } catch(e) {}

            // Fallback to fresh snapshot, then pre-flight snapshot
            if (!src) src = freshSnapshots[canvasId] || snapshotDataUrls[canvasId] || null;

            if (!src) {
                // If no image available, hide the canvas gracefully
                $(canvas).closest('.ud-chart-wrap').html('<div style="padding:20px;text-align:center;color:#999;font-size:11px;">Chart not available</div>');
                return;
            }

            let img          = document.createElement('img');
            img.src          = src;
            img.style.width  = '100%';
            img.style.height = 'auto';
            img.style.maxHeight = '300px';
            img.style.objectFit = 'contain';
            canvas.parentNode.replaceChild(img, canvas);
        });

        // Destroy all Chart.js instances (canvases are gone)
        Object.keys(chartInstances).forEach(function(id) {
            try { chartInstances[id].destroy(); } catch(e) {}
        });
        chartInstances = {};
    }

    // ── init ───────────────────────────────────────────────────────────────────
    function init() {

        let initializing = true;
        let reload_timer = null;

        let from_field = frappe.ui.form.make_control({
            df: { label: 'From Date', fieldtype: 'Date', fieldname: 'from_date', change: () => debounced_reload() },
            parent: $page.find('#ud-filters'), render_input: true
        });
        let to_field = frappe.ui.form.make_control({
            df: { label: 'To Date', fieldtype: 'Date', fieldname: 'to_date', change: () => debounced_reload() },
            parent: $page.find('#ud-filters'), render_input: true
        });

        from_field.set_value(frappe.datetime.month_start(), true);
        to_field.set_value(frappe.datetime.month_end(), true);
        initializing = false;

        function debounced_reload() {
            if (initializing) return;
            clearTimeout(reload_timer);
            reload_timer = setTimeout(() => load_unit_dashboard(currentUnit), 300);
        }

        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Appraisal',
                fields:  ['custom_unit'],
                filters: [['docstatus', 'in', [0, 1]]],
                limit_page_length: 1000,
                group_by: 'custom_unit'
            },
            callback: function(r) {
                let units = [...new Set(
                    (r.message || []).map(d => d.custom_unit).filter(u => u)
                )].sort();

                let tabHtml = `<div class="ud-unit-tab all active" data-unit="__ALL__">🏢 All Units</div>`;
                units.forEach(u => { tabHtml += `<div class="ud-unit-tab" data-unit="${u}">${u}</div>`; });
                $page.find('#ud-unit-tabs').html(tabHtml);

                $page.find('#ud-unit-tabs').on('click', '.ud-unit-tab', function() {
                    $page.find('.ud-unit-tab').removeClass('active all');
                    $(this).addClass('active');
                    if ($(this).data('unit') === '__ALL__') $(this).addClass('all');
                    currentUnit = $(this).data('unit');
                    load_unit_dashboard(currentUnit);
                });

                load_unit_dashboard('__ALL__');
            }
        });

        function getHalfYearPeriod() {
            let today = frappe.datetime.now_date();
            let year  = today.split('-')[0];
            let month = parseInt(today.split('-')[1]);
            let start_date, end_date;
            if (month <= 6) {
                start_date = year + '-01-01';
                end_date   = year + '-06-30';
            } else {
                start_date = year + '-07-01';
                end_date   = year + '-12-31';
            }
            return { start_date, end_date };
        }

        function load_unit_dashboard(unit) {
            $page.find('#ud-main').html(`
                <div class="ud-loading">
                    <span class="spinner-border spinner-border-sm"></span>
                    Loading dashboard for <strong>${unit === '__ALL__' ? 'All Units' : unit}</strong>...
                </div>`);

            Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch(e){} });
            chartInstances = {};

            let period = getHalfYearPeriod();
            let filters = [
                ['docstatus', 'in', [0, 1]],
                ['start_date', 'between', [period.start_date, period.end_date]]
            ];
            if (unit !== '__ALL__') filters.push(['custom_unit', '=', unit]);

            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Appraisal',
                    fields: [
                        'name', 'employee', 'employee_name',
                        'department', 'custom_unit', 'custom_grade',
                        'total_score', 'avg_feedback_score',
                        'custom_total_self_score', 'final_score',
                        'docstatus', 'start_date', 'modified',
                        'appraisal_cycle', 'appraisal_template',
                        'custom_submitted_date', 'custom_self_approval_date', 'workflow_state'
                    ],
                    filters: filters,
                    limit_page_length: 2000
                },
                callback: function(r) { render_dashboard(r.message || [], unit); }
            });
        }

        _load_unit_dashboard = load_unit_dashboard;

        // ── render_dashboard ───────────────────────────────────────────────────
        function render_dashboard(data, unit) {

            const WORKER_GRADES   = ['A1','A2','A3','A4'];
            const isWorker        = g => WORKER_GRADES.includes((g||''));
            const BELL_LABELS     = ['E (Poor)','D (Acceptable)','C (Good)','B (Very Good)','A (Excellent)'];
            const BELL_TARGET_PCT = [0.05, 0.15, 0.50, 0.20, 0.10];
            const BELL_COLORS     = ['#e53935','#ffa726','#66bb6a','#42a5f5','#C8102E'];

            function bellBucket(s) {
                let v = parseFloat(s) || 0;
                if (v <= 0)    return -1;
                if (v <= 1.00) return 0;
                if (v <= 2.00) return 1;
                if (v <= 3.00) return 2;
                if (v <= 4.00) return 3;
                return 4;
            }
            function buildBellCounts(rows) {
                let c = [0,0,0,0,0];
                rows.forEach(d => { let b = bellBucket(d.total_score); if (b >= 0) c[b]++; });
                return c;
            }
            function buildTargets(total) { return BELL_TARGET_PCT.map(p => Math.round(total * p)); }
            function scorePill(s) {
                let v = parseFloat(s) || 0;
                let cls = v >= 4 ? 'green' : v >= 3 ? 'blue' : v >= 2 ? 'orange' : 'red';
                return `<span class="ud-badge ud-badge-${cls}">${v ? v.toFixed(2) : 'N/A'}</span>`;
            }
            function pct(a, b) { return b ? Math.round((a/b)*100) : 0; }
            function destroyChart(id) {
                if (chartInstances[id]) { try { chartInstances[id].destroy(); } catch(e){} delete chartInstances[id]; }
            }

            let total     = data.length;
            let completed = data.filter(d => ['Approved','Accepted'].includes(d.workflow_state)).length;
            let pending   = total - completed;
            let scored    = data.filter(d => parseFloat(d.total_score) > 0);
            let avgScore  = scored.length ? (scored.reduce((s,d) => s + parseFloat(d.total_score), 0) / scored.length).toFixed(2) : 'N/A';
            let topPerf   = scored.filter(d => parseFloat(d.total_score) > 3.5).length;
            let lowPerf   = scored.filter(d => parseFloat(d.total_score) < 2.5).length;

            let unitMap = {};
            data.forEach(d => {
                let u = d.custom_unit || 'Unknown';
                if (!unitMap[u]) unitMap[u] = { total:0, completed:0, scored:[] };
                unitMap[u].total++;
                if (['Approved','Accepted'].includes(d.workflow_state)) unitMap[u].completed++;
                if (parseFloat(d.total_score) > 0) unitMap[u].scored.push(parseFloat(d.total_score));
            });

            let workerRows   = data.filter(d => isWorker(d.custom_grade));
            let staffRows    = data.filter(d => !isWorker(d.custom_grade));
            let workerScored = workerRows.filter(d => parseFloat(d.total_score) > 0);
            let staffScored  = staffRows.filter(d => parseFloat(d.total_score) > 0);

            _combCounts   = buildBellCounts(data);
            _combTarget   = buildTargets(scored.length);
            _workerCounts = buildBellCounts(workerRows);
            _workerTarget = buildTargets(workerScored.length);
            _staffCounts  = buildBellCounts(staffRows);
            _staffTarget  = buildTargets(staffScored.length);

            let trendMap = {};
            data.forEach(d => {
                let dt = d.custom_submitted_date || (d.modified || '').split(' ')[0];
                if (!dt) return;
                if (!trendMap[dt]) trendMap[dt] = { completed:0, pending:0, scores:[] };
                if (['Approved','Accepted'].includes(d.workflow_state)) trendMap[dt].completed++;
                else trendMap[dt].pending++;
                if (parseFloat(d.total_score) > 0) trendMap[dt].scores.push(parseFloat(d.total_score));
            });
            let trendDates     = Object.keys(trendMap).sort();
            let trendCompleted = trendDates.map(d => trendMap[d].completed);
            let trendPending   = trendDates.map(d => trendMap[d].pending);
            let trendAvgScore  = trendDates.map(d => {
                let s = trendMap[d].scores;
                return s.length ? (s.reduce((a,b)=>a+b,0)/s.length).toFixed(2) : null;
            });

            let deptMap = {};
            data.forEach(d => {
                let dep = d.custom_unit || 'Unknown';
                if (!deptMap[dep]) deptMap[dep] = { total:0, completed:0 };
                deptMap[dep].total++;
                if (d.docstatus === 1) deptMap[dep].completed++;
            });

            let unitLabel = unit === '__ALL__' ? 'All Units' : `Unit: ${unit}`;

            // ── KPI Cards ──────────────────────────────────────────────────────
            let kpiHtml = `
            <div class="ud-kpi-row">
                <div class="ud-kpi-card blue"   id="ud-card-total">  <div class="kpi-val">${total}</div>               <div class="kpi-lbl">Total Employees</div></div>
                <div class="ud-kpi-card green"  id="ud-card-completed"><div class="kpi-val">${pct(completed,total)}%</div><div class="kpi-lbl">Completed (${completed})</div></div>
                <div class="ud-kpi-card orange" id="ud-card-pending"> <div class="kpi-val">${pct(pending,total)}%</div>  <div class="kpi-lbl">Pending (${pending})</div></div>
                <div class="ud-kpi-card teal"   id="ud-card-avg">     <div class="kpi-val">${avgScore}</div>             <div class="kpi-lbl">Avg Score</div></div>
                <div class="ud-kpi-card purple" id="ud-card-top">     <div class="kpi-val">${topPerf}</div>              <div class="kpi-lbl">Top Performers</div></div>
                <div class="ud-kpi-card red"    id="ud-card-low">     <div class="kpi-val">${lowPerf}</div>              <div class="kpi-lbl">Low Performers</div></div>
            </div>`;

            // ── Completion Table ───────────────────────────────────────────────
            let compTableRows = Object.keys(unitMap).sort().map(u => {
                let um   = unitMap[u];
                let comp = pct(um.completed, um.total);
                let avg  = um.scored.length ? (um.scored.reduce((a,b)=>a+b,0)/um.scored.length).toFixed(2) : 'N/A';
                let cls  = comp >= 80 ? 'green' : comp >= 50 ? 'orange' : 'red';
                return `<tr>
                    <td style="font-weight:600;">${u}</td>
                    <td style="text-align:center;">${um.total}</td>
                    <td style="text-align:center;">${um.completed}</td>
                    <td style="text-align:center;">${um.total - um.completed}</td>
                    <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="ud-prog" style="flex:1;"><div class="ud-prog-fill" style="width:${comp}%;background:#28a745;"></div></div>
                            <span class="ud-badge ud-badge-${cls}">${comp}%</span>
                        </div>
                    </td>
                    <td style="text-align:center;">${avg}</td>
                </tr>`;
            }).join('');

            let completionHtml = `
            <div class="ud-section">
                <div class="ud-section-header ud-toggle" data-target="ud-body-completion">
                    <h4>📋 Completion Status — ${unitLabel}</h4><span class="ud-toggle-icon">▼</span>
                </div>
                <div class="ud-section-body ud-collapsible-body" id="ud-body-completion">
                    <div class="ud-2col" style="margin-bottom:16px;">
                        <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-donut-chart"></canvas></div>
                        <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-dept-bar-chart"></canvas></div>
                    </div>
                    <table class="ud-table">
                        <thead><tr>
                            <th>Unit</th>
                            <th style="text-align:center;">Total</th>
                            <th style="text-align:center;">Completed</th>
                            <th style="text-align:center;">Pending</th>
                            <th>Progress</th>
                            <th style="text-align:center;">Avg Score</th>
                        </tr></thead>
                        <tbody>${compTableRows}</tbody>
                    </table>
                </div>
            </div>`;

            // ── Trend Section ──────────────────────────────────────────────────
            let trendHtml = `
            <div class="ud-section">
                <div class="ud-section-header ud-toggle" data-target="ud-body-trend">
                    <h4>📈 Rating Trends — ${unitLabel}</h4><span class="ud-toggle-icon">▼</span>
                </div>
                <div class="ud-section-body ud-collapsible-body" id="ud-body-trend">
                    <div class="ud-2col">
                        <div>
                            <div style="font-size:12px;font-weight:600;color:#495057;margin-bottom:8px;">Daily Completion Trend</div>
                            <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-trend-line-chart"></canvas></div>
                        </div>
                        <div>
                            <div style="font-size:12px;font-weight:600;color:#495057;margin-bottom:8px;">Average Score Trend</div>
                            <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-score-trend-chart"></canvas></div>
                        </div>
                    </div>
                </div>
            </div>`;

            // ── Competency Section ─────────────────────────────────────────────
            let compHtml = `
            <div class="ud-section">
                <div class="ud-section-header ud-toggle" data-target="ud-body-comp">
                    <h4>🎯 Galfar Values & Competency-wise Status — ${unitLabel}</h4><span class="ud-toggle-icon">▼</span>
                </div>
                <div class="ud-section-body ud-collapsible-body" id="ud-body-comp">
                    <div id="ud-comp-loading" class="ud-loading">
                        <span class="spinner-border spinner-border-sm"></span> Loading competency data...
                    </div>
                    <div id="ud-comp-content" style="display:none;">
                        <div class="ud-2col" style="margin-bottom:16px;">
                            <div><div class="ud-chart-wrap" style="height:280px;"><canvas id="ud-kra-bar-chart"></canvas></div></div>
                            <div><div class="ud-chart-wrap" style="height:280px;"><canvas id="ud-kra-radar-chart"></canvas></div></div>
                        </div>
                        <div id="ud-kra-table" style="margin-top:4px;"></div>
                    </div>
                    <div id="ud-comp-empty" style="display:none;padding:20px;text-align:center;color:#868e96;font-size:13px;"></div>
                </div>
            </div>`;

            // ── Bell inner HTML ────────────────────────────────────────────────
            function bellSectionInnerHtml(id, title, color, targetArr, actualArr, na) {
                let tgt      = [...targetArr].reverse();
                let act      = [...actualArr].reverse();
                let tgtTotal = tgt.reduce((a,b)=>a+b,0);
                let actTotal = act.reduce((a,b)=>a+b,0);
                let headerCells = ['A (Excellent)','B (Very Good)','C (Good)','D (Acceptable)','E (Poor)'].map((l,i) =>
                    `<th style="background:${BELL_COLORS[4-i]}22;color:${BELL_COLORS[4-i]};padding:5px 8px;font-size:10px;">${l}</th>`
                ).join('');
                let tgtCells = tgt.map(v => `<td style="font-weight:700;color:#C8102E;padding:5px 8px;">${v}</td>`).join('');
                let actCells = act.map(v => `<td style="font-weight:700;color:#0f1f3d;padding:5px 8px;">${v}</td>`).join('');
                let pctCells = ['10%','20%','50%','15%','5%'].map(p => `<td style="color:#999;font-size:10px;padding:3px 8px;">${p}</td>`).join('');
                return `
                <div style="padding:18px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <div style="font-size:13px;font-weight:700;color:${color};">${title}</div>
                        <div style="display:flex;gap:14px;align-items:center;font-size:11px;color:#868e96;">
                            <span>🔴 Target: <strong>${tgtTotal}</strong></span>
                            <span>🔵 Scored: <strong>${actTotal}</strong></span>
                            <span>N/A: <strong>${na}</strong></span>
                        </div>
                    </div>
                    <div class="ud-chart-wrap" style="height:280px;">
                        <canvas id="ud-bell-${id}"></canvas>
                    </div>
                    <table class="ud-bell-tbl" style="margin-top:12px;">
                        <thead><tr>
                            <th style="text-align:left;padding:5px 8px;background:#f8f9fa;">Rating</th>
                            ${headerCells}
                            <th style="padding:5px 8px;background:#f8f9fa;">Total</th>
                        </tr></thead>
                        <tbody>
                            <tr><td style="font-weight:600;color:#C8102E;text-align:left;">🔴 Target</td>${tgtCells}<td style="font-weight:700;color:#C8102E;">${tgtTotal}</td></tr>
                            <tr><td style="color:#999;text-align:left;font-size:10px;"></td>${pctCells}<td style="color:#999;font-size:10px;">100%</td></tr>
                            <tr><td style="font-weight:600;color:#0f1f3d;text-align:left;">🔵 Evaluated</td>${actCells}<td style="font-weight:700;color:#0f1f3d;">${actTotal}</td></tr>
                        </tbody>
                    </table>
                </div>`;
            }

            let workerNA = workerRows.length - workerScored.length;
            let staffNA  = staffRows.length  - staffScored.length;
            let combNA   = data.length       - scored.length;

            // ── Bell Curve Section ─────────────────────────────────────────────
            // NOTE: All 3 panels are visible in DOM (no display:none) — hidden via CSS class for screen only
            let bellHtml = `
            <div class="ud-section">
                <div class="ud-section-header ud-toggle" data-target="ud-body-bell">
                    <h4>🔔 Bell Curve Distribution — ${unitLabel}</h4>
                    <div style="display:flex;align-items:center;gap:8px;" onclick="event.stopPropagation();">
                        <div class="ud-bell-tab-bar">
                            <button class="ud-bell-tab-btn active-combined" data-bell="combined">👥 Combined</button>
                            <button class="ud-bell-tab-btn" data-bell="worker">🔧 Worker</button>
                            <button class="ud-bell-tab-btn" data-bell="staff">💼 Staff</button>
                        </div>
                        <span class="ud-toggle-icon" style="margin-left:8px;">▼</span>
                    </div>
                </div>
                <div class="ud-collapsible-body" id="ud-body-bell">
                    <div class="ud-bell-panel" id="ud-bell-panel-combined">
                        ${bellSectionInnerHtml('combined','👥 Combined Bell Curve — Worker + Staff','#0f1f3d',_combTarget,_combCounts,combNA)}
                    </div>
                    <div class="ud-bell-panel ud-bell-panel-hidden" id="ud-bell-panel-worker">
                        ${bellSectionInnerHtml('worker','🔧 Worker Bell Curve — Grades A1 to A4','#C8102E',_workerTarget,_workerCounts,workerNA)}
                    </div>
                    <div class="ud-bell-panel ud-bell-panel-hidden" id="ud-bell-panel-staff">
                        ${bellSectionInnerHtml('staff','💼 Staff Bell Curve','#2d7a4f',_staffTarget,_staffCounts,staffNA)}
                    </div>
                </div>
            </div>`;

            // ── Employee Detail ────────────────────────────────────────────────
            let empRows = data.slice(0, 500).map((d, i) => `
                <tr onclick="window.open('/app/appraisal/${d.name}','_blank')" style="cursor:pointer;">
                    <td>${i + 1}</td>
                    <td>${d.employee || ''}</td>
                    <td>${d.employee_name || ''}</td>
                    <td>${d.custom_unit || ''}</td>
                    <td style="text-align:center;">${d.custom_grade || ''}</td>
                    <td style="text-align:center;">${scorePill(d.custom_total_self_score)}</td>
                    <td style="text-align:center;">${scorePill(d.total_score)}</td>
                    <td style="text-align:center;">
                        <span class="ud-badge ${['Approved','Accepted'].includes(d.workflow_state) ? 'ud-badge-green' : 'ud-badge-orange'}">
                            ${['Approved','Accepted'].includes(d.workflow_state) ? 'Completed' : (d.workflow_state || 'Draft')}
                        </span>
                    </td>
                </tr>`).join('');

            let empHtml = `
            <div class="ud-section large">
                <div class="ud-section-header ud-toggle" data-target="ud-body-emp">
                    <h4>👤 Employee Detail — ${unitLabel} (${total} records)</h4><span class="ud-toggle-icon">▼</span>
                </div>
                <div class="ud-section-body ud-collapsible-body" id="ud-body-emp" style="overflow-x:auto;">
                    <table class="ud-table" style="min-width:800px;">
                        <thead><tr>
                            <th>S.No</th><th>Employee ID</th><th>Name</th><th>Unit</th>
                            <th style="text-align:center;">Grade</th>
                            <th style="text-align:center;">Self Score</th>
                            <th style="text-align:center;">Goal Score</th>
                            <th style="text-align:center;">Status</th>
                        </tr></thead>
                        <tbody>${empRows}</tbody>
                    </table>
                    ${total > 500 ? `<div style="text-align:center;padding:10px;font-size:12px;color:#868e96;">Showing first 500 of ${total} records</div>` : ''}
                </div>
            </div>`;

            // CHANGE: Remove the <div class="pdf-page"> wrappers
$page.find('#ud-main').html(
    kpiHtml
    + completionHtml
    + trendHtml
    + compHtml
    + bellHtml
    + empHtml
);

            // Add screen-only hiding for bell panels
            $('<style>').text(`
                .ud-bell-panel-hidden { display: none; }
                @media print { .ud-bell-panel-hidden { display: block !important; } }
               
            `).appendTo('head');

            // ── Chart helpers ──────────────────────────────────────────────────
            const dlPlugin = {
                id: 'dlPlugin',
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    chart.data.datasets.forEach((ds, di) => {
                        chart.getDatasetMeta(di).data.forEach((pt, idx) => {
                            let v = ds.data[idx];
                            if (!v && v !== 0) return;
                            let { x, y } = pt.getProps(['x','y'], true);
                            ctx.save();
                            ctx.font = 'bold 10px Inter, sans-serif';
                            ctx.fillStyle = ds.borderColor || '#333';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                            ctx.fillText(v, x, y - 12);
                            ctx.restore();
                        });
                    });
                }
            };

            function mkChart(id, config, usePlugin) {
                destroyChart(id);
                let el = $page.find('#' + id)[0];
                if (!el) return;
                // Always disable animation for reliable canvas capture
                config.options = config.options || {};
                config.options.animation = config.options.animation !== undefined ? config.options.animation : { duration: 800 };
                if (usePlugin) config.plugins = [dlPlugin];
                chartInstances[id] = new Chart(el, config);
            }

            // ── Standard charts ────────────────────────────────────────────────
            mkChart('ud-donut-chart', {
                type: 'doughnut',
                data: {
                    labels: ['Completed','Pending'],
                    datasets: [{
                        data: [completed, pending],
                        backgroundColor: ['#28a745','#ffc107'],
                        borderColor: ['#fff','#fff'],
                        borderWidth: 3
                    }]
                },
                options: {
                    responsive:true, maintainAspectRatio:false, cutout:'62%',
                    plugins: {
                        legend:{ position:'bottom' },
                        tooltip:{ callbacks:{ label: ctx => `${ctx.label}: ${ctx.raw} (${pct(ctx.raw, total)}%)` } }
                    }
                }
            });

            let deptKeys = Object.keys(deptMap).sort();
            mkChart('ud-dept-bar-chart', {
                type: 'bar',
                data: {
                    labels: deptKeys,
                    datasets: [
                        { label:'Completed %', data: deptKeys.map(k => pct(deptMap[k].completed, deptMap[k].total)), backgroundColor:'#28a745' },
                        { label:'Pending %',   data: deptKeys.map(k => pct(deptMap[k].total - deptMap[k].completed, deptMap[k].total)), backgroundColor:'#ffc107' }
                    ]
                },
                options: {
                    responsive:true, maintainAspectRatio:false,
                    scales:{ y:{ beginAtZero:true, max:100, ticks:{ callback: v => v+'%' } } },
                    plugins:{ legend:{ position:'bottom' } }
                }
            });

            mkChart('ud-trend-line-chart', {
                type: 'line',
                data: {
                    labels: trendDates,
                    datasets: [
                        { label:'Completed', data: trendCompleted, borderColor:'#28a745', backgroundColor:'rgba(40,167,69,.1)', tension:.4, fill:true },
                        { label:'Pending',   data: trendPending,   borderColor:'#ffc107', backgroundColor:'rgba(255,193,7,.1)',  tension:.4, fill:true }
                    ]
                },
                options: {
                    responsive:true, maintainAspectRatio:false,
                    plugins:{ legend:{ position:'bottom' } }
                }
            });

            mkChart('ud-score-trend-chart', {
                type: 'line',
                data: {
                    labels: trendDates,
                    datasets: [{
                        label:'Avg Score', data: trendAvgScore,
                        borderColor:'#C8102E', backgroundColor:'rgba(200,16,46,.08)',
                        tension:.4, fill:true, pointRadius:5
                    }]
                },
                options: {
                    responsive:true, maintainAspectRatio:false,
                    scales:{ y:{ beginAtZero:false, min:0, max:5 } },
                    plugins:{ legend:{ position:'bottom' } }
                }
            });

            // ── Bell curve renderer ────────────────────────────────────────────
            function renderBell(id, targets, actuals) {
                mkChart('ud-bell-' + id, {
                    type: 'line',
                    data: {
                        labels: BELL_LABELS,
                        datasets: [
                            {
                                label: 'Bell Curve (Target)',
                                data: targets,
                                borderColor: '#C8102E',
                                backgroundColor: 'rgba(200,16,46,.07)',
                                borderWidth: 2.5,
                                pointStyle: 'rectRot',
                                pointRadius: 8,
                                pointBackgroundColor: '#C8102E',
                                tension: .4,
                                fill: true
                            },
                            {
                                label: 'Evaluated Curve',
                                data: actuals,
                                borderColor: '#0f1f3d',
                                backgroundColor: 'rgba(15,31,61,.07)',
                                borderWidth: 2.5,
                                pointStyle: 'triangle',
                                pointRadius: 8,
                                pointBackgroundColor: '#0f1f3d',
                                tension: .4,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: { padding: { top: 28 } },
                        scales: {
                            y: { beginAtZero:true, grid:{ color:'rgba(0,0,0,.06)' }, ticks:{ font:{ size:11 } } },
                            x: { grid:{ display:false }, ticks:{ font:{ size:11, weight:'bold' } } }
                        },
                        plugins: {
                            legend: { position:'top', align:'end', labels:{ usePointStyle:true, font:{ size:11 }, padding:16 } },
                            tooltip: { callbacks:{ label: c => c.dataset.label+': '+c.raw+' employees' } }
                        }
                    }
                }, true);
            }

            _renderBell = renderBell;

            // Render all three bells immediately (all canvases exist in DOM)
            renderBell('combined', _combTarget,   _combCounts);
            renderBell('worker',   _workerTarget, _workerCounts);
            renderBell('staff',    _staffTarget,  _staffCounts);

            // ── Bell tab switcher ──────────────────────────────────────────────
            let bellColorMap = { combined:'#0f1f3d', worker:'#C8102E', staff:'#2d7a4f' };

            $page.find('.ud-bell-tab-btn').on('click', function(e) {
                e.stopPropagation();
                let chosen = $(this).data('bell');

                $page.find('.ud-bell-tab-btn').each(function() {
                    let btnBell  = $(this).data('bell');
                    let col      = bellColorMap[btnBell] || '#0f1f3d';
                    let isActive = btnBell === chosen;
                    $(this)
                        .removeClass('active-combined active-worker active-staff')
                        .css({ background:'#fff', color:'#495057', borderColor:'#dee2e6' });
                    if (isActive) {
                        $(this)
                            .addClass('active-' + btnBell)
                            .css({ background:col, color:'#fff', borderColor:col });
                    }
                });

                // Show/hide using the hidden class (preserves canvas dimensions)
                $page.find('.ud-bell-panel').each(function() {
                    let panelId = $(this).attr('id'); // e.g. ud-bell-panel-worker
                    let bellKey = panelId.replace('ud-bell-panel-', '');
                    if (bellKey === chosen) {
                        $(this).removeClass('ud-bell-panel-hidden').show();
                        renderBell(chosen,
                            chosen === 'combined' ? _combTarget   : (chosen === 'worker' ? _workerTarget : _staffTarget),
                            chosen === 'combined' ? _combCounts   : (chosen === 'worker' ? _workerCounts : _staffCounts)
                        );
                    } else {
                        $(this).addClass('ud-bell-panel-hidden').hide();
                    }
                });
            });

            // ── Competency ─────────────────────────────────────────────────────
            let appraisalNames = data.map(d => d.name);

            if (!appraisalNames.length) {
                $page.find('#ud-comp-loading').hide();
                $page.find('#ud-comp-empty').text('No appraisal data found.').show();
            } else {
                frappe.call({
                    method: 'pms_ai.pms.page.unit_dashboard.unit_dashboard.get_goals_competency',
                    args: { appraisal_names: JSON.stringify(appraisalNames) },
                    callback: function(r) {
                        let goalData = r.message || [];

                        if (!goalData.length) {
                            $page.find('#ud-comp-loading').hide();
                            $page.find('#ud-comp-empty').text('No competency / KRA data found for this selection.').show();
                            return;
                        }

                        let kraAgg = {};
                        goalData.forEach(function(row) {
                            let name    = (row.kra         || 'Unknown').trim();
                            let kraUnit = (row.custom_unit || 'Unknown').trim();
                            if (!kraAgg[name]) kraAgg[name] = { totalSelf:0, totalAssr:0, count:0, unit:kraUnit };
                            kraAgg[name].totalSelf += parseFloat(row.custom_self_score)     || 0;
                            kraAgg[name].totalAssr += parseFloat(row.custom_assessor_score) || 0;
                            kraAgg[name].count++;
                        });

                        function kraUnitSort(a, b) {
                            let ua = (kraAgg[a] && kraAgg[a].unit ? kraAgg[a].unit : '').trim().toLowerCase();
                            let ub = (kraAgg[b] && kraAgg[b].unit ? kraAgg[b].unit : '').trim().toLowerCase();
                            let aIsCommon = ua === 'common';
                            let bIsCommon = ub === 'common';
                            if  (aIsCommon && !bIsCommon) return -1;
                            if  (!aIsCommon && bIsCommon) return  1;
                            let unitCmp = ua.localeCompare(ub, undefined, { sensitivity:'base' });
                            if (unitCmp !== 0) return unitCmp;
                            return a.toLowerCase().localeCompare(b.toLowerCase(), undefined, { sensitivity:'base' });
                        }

                        let kraNames   = Object.keys(kraAgg).sort(kraUnitSort);
                        let kraAvgSelf = kraNames.map(n => kraAgg[n].count ? parseFloat((kraAgg[n].totalSelf / kraAgg[n].count).toFixed(2)) : 0);
                        let kraAvgAssr = kraNames.map(n => kraAgg[n].count ? parseFloat((kraAgg[n].totalAssr / kraAgg[n].count).toFixed(2)) : 0);
                        let kraCounts  = kraNames.map(n => kraAgg[n].count);

                        $page.find('#ud-comp-loading').hide();
                        $page.find('#ud-comp-content').show();

                        mkChart('ud-kra-bar-chart', {
                            type: 'bar',
                            data: {
                                labels: kraNames,
                                datasets: [
                                    { label:'Avg Self Score',     data: kraAvgSelf, backgroundColor:'rgba(200,16,46,0.65)', borderColor:'#C8102E', borderWidth:1, borderRadius:5 },
                                    { label:'Avg Assessor Score', data: kraAvgAssr, backgroundColor:'rgba(15,31,61,0.70)',  borderColor:'#0f1f3d', borderWidth:1, borderRadius:5 }
                                ]
                            },
                            options: {
                                responsive:true, maintainAspectRatio:false, indexAxis:'y',
                                scales: {
                                    x: { beginAtZero:true, max:5, grid:{ color:'rgba(0,0,0,.05)' } },
                                    y: { ticks:{ font:{ size:11 } } }
                                },
                                plugins: {
                                    legend:{ position:'bottom' },
                                    title:{ display:true, text:'Avg Self & Assessor Score per KRA (out of 5)', font:{ size:12 } }
                                }
                            }
                        });

                        mkChart('ud-kra-radar-chart', {
                            type: 'radar',
                            data: {
                                labels: kraNames,
                                datasets: [
                                    { label:'Avg Self Score',     data: kraAvgSelf, borderColor:'#C8102E', backgroundColor:'rgba(200,16,46,.15)', pointBackgroundColor:'#C8102E', pointRadius:4 },
                                    { label:'Avg Assessor Score', data: kraAvgAssr, borderColor:'#0f1f3d', backgroundColor:'rgba(15,31,61,.15)',  pointBackgroundColor:'#0f1f3d', pointRadius:4 }
                                ]
                            },
                            options: {
                                responsive:true, maintainAspectRatio:false,
                                scales:{ r:{ beginAtZero:true, max:5, ticks:{ font:{ size:9 } } } },
                                plugins: {
                                    legend:{ position:'bottom' },
                                    title:{ display:true, text:'Galfar Values & Competency Radar (out of 5)', font:{ size:12 } }
                                }
                            }
                        });

                        let kraTableRows = kraNames.map((n, i) => {
                            let selfAvg = kraAvgSelf[i];
                            let asrAvg  = kraAvgAssr[i];
                            let cnt     = kraCounts[i];
                            let cls     = asrAvg >= 4 ? 'green' : asrAvg >= 2.5 ? 'orange' : 'red';
                            let barW    = Math.min((asrAvg / 5) * 100, 100);
                            return `<tr>
                                <td style="font-weight:600;">${n}</td>
                                <td style="text-align:center;">${cnt}</td>
                                <td style="text-align:center;color:#C8102E;font-weight:700;">${selfAvg.toFixed(2)}</td>
                                <td style="text-align:center;color:#0f1f3d;font-weight:700;">${asrAvg.toFixed(2)}</td>
                                <td>
                                    <div style="display:flex;align-items:center;gap:8px;">
                                        <div class="ud-prog" style="flex:1;"><div class="ud-prog-fill" style="width:${barW}%;background:#0f1f3d;"></div></div>
                                        <span class="ud-badge ud-badge-${cls}">${asrAvg.toFixed(2)} / 5</span>
                                    </div>
                                </td>
                            </tr>`;
                        }).join('');

                        $page.find('#ud-kra-table').html(`
                            <table class="ud-table">
                                <thead><tr>
                                    <th>Competency</th>
                                    <th style="text-align:center;">Employees</th>
                                    <th style="text-align:center;">🔴 Avg Self (/ 5)</th>
                                    <th style="text-align:center;">🔵 Avg Assessor (/ 5)</th>
                                    <th>Assessor Progress</th>
                                </tr></thead>
                                <tbody>${kraTableRows}</tbody>
                            </table>
                        `);
                    }
                });
            }

            // ── Collapsible toggle ─────────────────────────────────────────────
            $page.find('.ud-toggle').off('click').on('click', function() {
                let target = $(this).data('target');
                let $body  = $page.find('#' + target);
                let $icon  = $(this).find('.ud-toggle-icon');
                $body.slideToggle(250);
                $icon.text($body.is(':visible') ? '▼' : '▶');
            });

            // ── KPI card clicks ────────────────────────────────────────────────
            let period  = getHalfYearPeriod();
            let fromVal = period.start_date;
            let toVal   = period.end_date;

            function openList(extra = {}) {
                let filters = { start_date: ['between', [fromVal, toVal]] };
                if (unit !== '__ALL__') filters.custom_unit = unit;
                Object.keys(extra).forEach(key => { filters[key] = extra[key]; });
                frappe.open_in_new_tab = true;
                frappe.set_route('List', 'Appraisal', filters);
            }

            $page.find('#ud-card-total').off('click').on('click',     () => openList());
            $page.find('#ud-card-completed').off('click').on('click', () => openList({ workflow_state: ['in', ['Approved','Accepted']] }));
            $page.find('#ud-card-pending').off('click').on('click',   () => openList({ workflow_state: ['not in', ['Approved','Accepted']] }));
            $page.find('#ud-card-avg').off('click').on('click',       () => openList());
            $page.find('#ud-card-top').off('click').on('click',       () => openList({ total_score: ['>', 3.5] }));
            $page.find('#ud-card-low').off('click').on('click',       () => openList({ total_score: ['<', 2.5] }));

        } // end render_dashboard

    } // end init

}; // end on_page_load