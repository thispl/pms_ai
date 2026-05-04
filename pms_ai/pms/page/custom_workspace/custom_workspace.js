frappe.pages['custom-workspace'].on_page_load = function(wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Employee Appraisal Dashboard",
        single_column: true
    });

    $(page.body).html(frappe.render_template("custom_workspace", {}));
    let $page = $(page.body);

    frappe.require([
        "https://cdn.jsdelivr.net/npm/chart.js",
        "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"
    ], function() {
        init_dashboard();
    });

    function init_dashboard() {

    let start = frappe.datetime.month_start();
    let end   = frappe.datetime.month_end();

    let completionDonutChart, trendChart;
    let activeBellChart = null;
    let dashboard_raw_data = {};

    // Bell curve state — default to Combined
    let currentBellView = 'combined';

    const WORKER_GRADES = ['A1', 'A2', 'A3', 'A4', 'A5'];
    function isWorker(grade) { return WORKER_GRADES.includes((grade || '').trim().toUpperCase()); }

    const BELL_LABELS = [
        'E  (Poor)',
        'D  (Acceptable)',
        'C  (Good)',
        'B  (Very Good)',
        'A  (Excellent)'
    ];

    const BELL_TARGET_PCT = [0.05, 0.15, 0.50, 0.20, 0.10];

    const BELL_RATING_LABELS = ['A (Excellent)', 'B (Very Good)', 'C (Good)', 'D (Acceptable)', 'E (Poor)'];
    const BELL_RATING_COLORS = ['#1565C0', '#2d7a4f', '#f57c00', '#e53935', '#6d4c41'];

    function buildBellCounts(scores) {
        let counts = [0, 0, 0, 0, 0];
        scores.forEach(s => {
            let v = parseFloat(s) || 0;
            if (v <= 0) return;
            if      (v <= 1.00) counts[0]++;
            else if (v <= 2.00) counts[1]++;
            else if (v <= 3.00) counts[2]++;
            else if (v <= 4.00) counts[3]++;
            else                counts[4]++;
        });
        return counts;
    }

    function buildTargetCounts(total) {
        return BELL_TARGET_PCT.map(p => Math.round(total * p));
    }

    const dataLabelPlugin = {
        id: 'dataLabelPlugin',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, di) => {
                const meta = chart.getDatasetMeta(di);
                meta.data.forEach((point, idx) => {
                    const value = dataset.data[idx];
                    const { x, y } = point.getProps(['x', 'y'], true);
                    ctx.save();
                    ctx.font = 'bold 12px Arial';
                    ctx.fillStyle = dataset.borderColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(value, x, y - 12);
                    ctx.restore();
                });
            });
        }
    };

    function buildBellTable(targetCounts, evaluatedCounts) {
        let tgt = [...targetCounts].reverse();
        let act = [...evaluatedCounts].reverse();
        let tgtTotal = tgt.reduce((a,b) => a+b, 0);
        let actTotal = act.reduce((a,b) => a+b, 0);
        let tgtPcts  = ['10%', '20%', '50%', '15%', '5%'];

        let headerCells = BELL_RATING_LABELS.map((lbl, i) =>
            `<th style="padding:5px 8px; text-align:center; font-size:10px;
                        background:${BELL_RATING_COLORS[i]}20;
                        color:${BELL_RATING_COLORS[i]}; border-right:1px solid #e8eaf0;">${lbl}</th>`
        ).join('');

        let tgtCells = tgt.map(v =>
            `<td style="padding:5px 8px; text-align:center; font-size:11px; font-weight:600;
                        border-right:1px solid #e8eaf0; color:#e53935;">${v}</td>`
        ).join('');

        let pctCells = tgtPcts.map(p =>
            `<td style="padding:3px 8px; text-align:center; font-size:10px;
                        border-right:1px solid #e8eaf0; color:#999;">${p}</td>`
        ).join('');

        let actCells = act.map(v =>
            `<td style="padding:5px 8px; text-align:center; font-size:11px; font-weight:700;
                        border-right:1px solid #e8eaf0; color:#1565C0;">${v}</td>`
        ).join('');

        return `
        <div style="overflow-x:auto; margin-top:10px;">
          <table style="width:100%; border-collapse:collapse; border:1px solid #e8eaf0; border-radius:8px; overflow:hidden; font-family:sans-serif;">
            <thead>
              <tr style="background:#f5f7fa;">
                <th style="padding:5px 10px; text-align:left; font-size:10px; color:#666; border-right:1px solid #e8eaf0; white-space:nowrap;">Rating</th>
                ${headerCells}
                <th style="padding:5px 8px; text-align:center; font-size:10px; color:#666;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#fff8f8;">
                <td style="padding:5px 10px; font-size:10px; font-weight:600; color:#e53935; border-right:1px solid #e8eaf0;">🔴 Target</td>
                ${tgtCells}
                <td style="padding:5px 8px; text-align:center; font-size:11px; font-weight:700; color:#e53935;">${tgtTotal}</td>
              </tr>
              <tr style="background:#f5f7fa; font-size:9px;">
                <td style="padding:3px 10px; color:#999; border-right:1px solid #e8eaf0;"></td>
                ${pctCells}
                <td style="padding:3px 8px; text-align:center; color:#999;">100%</td>
              </tr>
              <tr style="background:#f0f8ff;">
                <td style="padding:5px 10px; font-size:10px; font-weight:600; color:#1565C0; border-right:1px solid #e8eaf0;">🔵 Evaluated</td>
                ${actCells}
                <td style="padding:5px 8px; text-align:center; font-size:11px; font-weight:700; color:#1565C0;">${actTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>`;
    }

    function renderBellChart(canvasEl, targetCounts, evaluatedCounts) {
        if (activeBellChart) { activeBellChart.destroy(); activeBellChart = null; }
        activeBellChart = new Chart(canvasEl, {
            type: 'line',
            data: {
                labels: BELL_LABELS,
                datasets: [
                    {
                        label: 'Bell Curve (Target)',
                        data: targetCounts,
                        borderColor: '#e53935',
                        backgroundColor: 'rgba(229,57,53,0.08)',
                        borderWidth: 2.5,
                        pointStyle: 'rectRot',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#e53935',
                        pointBorderColor: '#e53935',
                        tension: 0.45,
                        fill: true
                    },
                    {
                        label: 'Evaluated Curve',
                        data: evaluatedCounts,
                        borderColor: '#1565C0',
                        backgroundColor: 'rgba(21,101,192,0.08)',
                        borderWidth: 2.5,
                        pointStyle: 'triangle',
                        pointRadius: 8,
                        pointHoverRadius: 10,
                        pointBackgroundColor: '#1565C0',
                        pointBorderColor: '#1565C0',
                        tension: 0.45,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 28, bottom: 4, left: 4, right: 4 } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.07)' },
                        ticks: { font: { size: 10 }, color: '#444' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 10, weight: 'bold' }, color: '#222' }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            font: { size: 10, weight: 'bold' },
                            padding: 20,
                            color: '#222'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ctx.dataset.label + ': ' + ctx.raw + ' employees'
                        }
                    }
                }
            },
            plugins: [dataLabelPlugin]
        });
        return activeBellChart;
    }

    // ── Unified Bell Curve Section with Toggle ─────────────────────────────
    function buildBellSection() {
        return `
        <button class="collapsible-btn active">📊 Bell Curve Distribution</button>
        <div class="collapsible-wrapper" style="display:block;">
          <div style="background:white; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.06);
                      padding:16px; border-top:3px solid #1565C0; margin-bottom:4px;">

            <!-- Header row: title + toggle buttons -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
              <div style="font-size:13px; font-weight:700; color:#1565C0;" id="bell-section-title">
                👥 Combined — Worker + Staff
              </div>
              <!-- Toggle Buttons -->
              <div style="display:flex; gap:6px;">
                <button id="bell-btn-combined"
                  style="padding:5px 14px; font-size:12px; font-weight:600; border-radius:20px; border:2px solid #1565C0;
                         background:#1565C0; color:#fff; cursor:pointer; transition:all 0.2s;">
                  👥 Combined
                </button>
                <button id="bell-btn-worker"
                  style="padding:5px 14px; font-size:12px; font-weight:600; border-radius:20px; border:2px solid #e53935;
                         background:#fff; color:#e53935; cursor:pointer; transition:all 0.2s;">
                  🔧 Worker
                </button>
                <button id="bell-btn-staff"
                  style="padding:5px 14px; font-size:12px; font-weight:600; border-radius:20px; border:2px solid #2d7a4f;
                         background:#fff; color:#2d7a4f; cursor:pointer; transition:all 0.2s;">
                  💼 Staff
                </button>
              </div>
            </div>

            <!-- Stats bar -->
            <div id="bell-stats-bar" style="display:flex; gap:12px; font-size:11px; color:#777; margin-bottom:12px; flex-wrap:wrap;">
            </div>

            <!-- Chart -->
            <div style="position:relative; width:100%; height:40vw; max-height:420px; min-height:220px;">
              <canvas id="bellUnifiedChart"></canvas>
            </div>

            <!-- Table -->
            <div id="bellUnifiedTable"></div>
          </div>

          <!-- AI Insight -->
          <div class="ai-insight-card">
            <div class="ai-card-header">
              <h4>✨ Distribution Insights</h4>
              <button class="btn btn-sm btn-primary" id="btn-ai-bell">Generate Insight</button>
            </div>
            <div id="ai-content-bell" class="ai-insight-content">
              Click Generate Insight to check for manager bias across Worker and Staff groups.
            </div>
          </div>
        </div>`;
    }

    // ── Export PDF ─────────────────────────────────────────────────────────
    page.add_inner_button(__('Export to PDF'), function() {
        let element = $page.find('#dashboard-export-wrapper')[0];
        if (!element) { frappe.msgprint("Cannot export: Wrapper ID missing."); return; }

        let $btn = $(this);
        $btn.prop('disabled', true).text('Generating...');
        frappe.show_alert({ message: 'Preparing PDF... This may take a few seconds.', indicator: 'blue' });
        $page.find('.collapsible-wrapper').show();

        setTimeout(() => {
            let opt = {
                margin: 0.3,
                filename: 'Appraisal_Dashboard.pdf',
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 1.5, useCORS: true, logging: false },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save().then(() => {
                $page.find('.collapsible-btn:not(.active)').next('.collapsible-wrapper').hide();
                $btn.prop('disabled', false).text('Export to PDF');
                frappe.show_alert({ message: 'PDF Downloaded Successfully!', indicator: 'green' });
            }).catch(err => {
                console.error("PDF Generation Error: ", err);
                $btn.prop('disabled', false).text('Export to PDF');
                frappe.msgprint("An error occurred while generating the PDF. Check console.");
            });
        }, 500);
    });

    // ── Overall Summary ────────────────────────────────────────────────────
    page.set_primary_action(__('Generate Overall Summary ✨'), function() {
        let $summary_box = $page.find('#overall-ai-summary');
        let $content     = $page.find('#overall-ai-content');
        if ($summary_box.length === 0) return frappe.msgprint("Summary Box missing.");

        $summary_box.slideDown();
        $content.html("<div style='text-align:center; padding: 20px;'><span class='spinner-border spinner-border-sm text-primary'></span> Reading dashboard data...</div>");

        frappe.call({
            method: 'pms_ai.api.generate_master_summary',
            args: { dashboard_data: JSON.stringify(dashboard_raw_data) },
            callback: function(r) {
                if (r.message) $content.html(r.message.replace(/\n/g, "<br>"));
                else $content.html("Error: Could not retrieve summary.");
            }
        });
    });

    // ── Filters ────────────────────────────────────────────────────────────
    let initializing  = true;
    let reload_timeout = null;

    function trigger_dashboard_reload() {
        if (initializing) return;
        clearTimeout(reload_timeout);
        reload_timeout = setTimeout(() => { load_dashboard(); }, 300);
    }

    let unit_field = frappe.ui.form.make_control({ df: { label: "Unit", fieldtype: 'Link', options: 'Unit', fieldname: 'custom_unit', change: () => trigger_dashboard_reload() }, parent: $page.find('#filter-area'), render_input: true });
    let from_date_field  = frappe.ui.form.make_control({ df: { label: "From Date",   fieldtype: 'Date', fieldname: 'from_date',   change: () => trigger_dashboard_reload() }, parent: $page.find('#filter-area'), render_input: true });
    let to_date_field    = frappe.ui.form.make_control({ df: { label: "To Date",     fieldtype: 'Date', fieldname: 'to_date',     change: () => trigger_dashboard_reload() }, parent: $page.find('#filter-area'), render_input: true });

    from_date_field.set_value(start, true);
    to_date_field.set_value(end, true);
    initializing = false;

    // ── AI Insight Fetcher ─────────────────────────────────────────────────
    function fetch_ai_insights(btn_element, content_id, context_type, chart_data) {
        let $btn     = $(btn_element);
        let $content = $page.find(`#${content_id}`);
        $btn.prop("disabled", true).html("✨ Analyzing...");
        $content.html("<span class='spinner-border spinner-border-sm text-primary'></span> Analyzing...");

        frappe.call({
            method: 'pms_ai.api.analyze_dashboard_chart',
            args: { chart_context: context_type, chart_data: JSON.stringify(chart_data) },
            callback: function(r) {
                $btn.prop("disabled", false).html("🔄 Refresh Insights");
                if (r.message) $content.html(r.message.replace(/\n/g, "<br>"));
            }
        });
    }
    function getHalfYearPeriod() {

    let today = frappe.datetime.now_date();
    let year  = today.split("-")[0];
    let month = parseInt(today.split("-")[1]);

    let start_date, end_date;

    // Q1 : Jan → Jun
    if (month <= 6) {
        start_date = year + "-01-01";
        end_date   = year + "-06-30";
    }
    // Q2 : Jul → Dec
    else {
        start_date = year + "-07-01";
        end_date   = year + "-12-31";
    }

    return { start_date, end_date };
}
    // ── Core Dashboard Rendering ───────────────────────────────────────────
    function load_dashboard() {
        let period = getHalfYearPeriod();
        let filters = [
            ["start_date", "between", [period.start_date, period.end_date]],
            ["docstatus", "in", [0, 1]]
        ];
        if (unit_field.get_value()) {
            filters.push(["custom_unit", "=", unit_field.get_value()]);
        }

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Appraisal",
                fields: [
                    "name", "employee", "employee_name", "total_score",
                    "custom_unit", "custom_grade", "docstatus", "start_date",
                    "custom_self_approval_date", "custom_submitted_date","workflow_state"
                ],
                filters: filters,
                limit_page_length: 1000
            },
            callback: function(r) {
                let data = r.message || [];

                // ── Per-unit stats ─────────────────────────────────────
                let tableData = {};
                data.forEach(d => {
                    let dept = d.custom_unit || "Unknown";
                    if (!tableData[dept]) tableData[dept] = { total: 0, completed: 0, pending: 0 };
                    tableData[dept].total += 1;
                    if (["Approved","Accepted"].includes(d.workflow_state)) tableData[dept].completed += 1;
                    else tableData[dept].pending += 1;
                });

                let totalAll = { total: 0, completed: 0, pending: 0 };
                Object.values(tableData).forEach(d => {
                    totalAll.total     += d.total;
                    totalAll.completed += d.completed;
                    totalAll.pending   += d.pending;
                });

                // ── Score arrays ───────────────────────────────────────
                let allScores    = [];
                let workerScores = [];
                let staffScores  = [];

                data.forEach(d => {
                    let s = parseFloat(d.total_score) || 0;
                    allScores.push(s);
                    if (isWorker(d.custom_grade)) workerScores.push(s);
                    else staffScores.push(s);
                });

                let total     = allScores.length;
                let avg_score = total ? Math.round(allScores.reduce((a, b) => a + b, 0) / total) : 0;

                // ── Bell counts ────────────────────────────────────────
                let allScored    = allScores.filter(s => s > 0);
                let workerScored = workerScores.filter(s => s > 0);
                let staffScored  = staffScores.filter(s => s > 0);

                let combActual   = buildBellCounts(allScores);
                let workerActual = buildBellCounts(workerScores);
                let staffActual  = buildBellCounts(staffScores);

                let combTarget   = buildTargetCounts(allScored.length);
                let workerTarget = buildTargetCounts(workerScored.length);
                let staffTarget  = buildTargetCounts(staffScored.length);

                let workerNA = workerScores.length - workerScored.length;
                let staffNA  = staffScores.length  - staffScored.length;
                let combNA   = allScores.length    - allScored.length;

                // ── Bell view data map ────────────────────────────────
                const bellViewData = {
                    combined: {
                        title:  '👥 Combined — Worker + Staff',
                        color:  '#1565C0',
                        target: combTarget,
                        actual: combActual,
                        scored: allScored.length,
                        na:     combNA
                    },
                    worker: {
                        title:  '🔧 Worker — Grades A1 to A4',
                        color:  '#e53935',
                        target: workerTarget,
                        actual: workerActual,
                        scored: workerScored.length,
                        na:     workerNA
                    },
                    staff: {
                        title:  '💼 Staff',
                        color:  '#2d7a4f',
                        target: staffTarget,
                        actual: staffActual,
                        scored: staffScored.length,
                        na:     staffNA
                    }
                };

                function switchBellView(view) {
                    currentBellView = view;
                    const d = bellViewData[view];

                    // Update title
                    $page.find('#bell-section-title').text(d.title).css('color', d.color);

                    // Update stats bar
                    $page.find('#bell-stats-bar').html(`
                        <span>🔴 Target: <strong style="color:#e53935;">${d.target.reduce((a,b)=>a+b,0)}</strong></span>
                        <span>🔵 Scored: <strong style="color:#1565C0;">${d.scored}</strong></span>
                        <span style="color:#aaa;">N/A: <strong>${d.na}</strong></span>
                    `);

                    // Toggle button active styles
                    const btnStyles = {
                        combined: { active: { bg:'#1565C0', color:'#fff', border:'#1565C0' }, inactive: { bg:'#fff', color:'#1565C0', border:'#1565C0' } },
                        worker:   { active: { bg:'#e53935', color:'#fff', border:'#e53935' }, inactive: { bg:'#fff', color:'#e53935', border:'#e53935' } },
                        staff:    { active: { bg:'#2d7a4f', color:'#fff', border:'#2d7a4f' }, inactive: { bg:'#fff', color:'#2d7a4f', border:'#2d7a4f' } }
                    };
                    ['combined', 'worker', 'staff'].forEach(v => {
                        const s = v === view ? btnStyles[v].active : btnStyles[v].inactive;
                        $page.find(`#bell-btn-${v}`).css({
                            background: s.bg,
                            color: s.color,
                            'border-color': s.border
                        });
                    });

                    // Re-render chart
                    renderBellChart($page.find('#bellUnifiedChart')[0], d.target, d.actual);

                    // Re-render table
                    $page.find('#bellUnifiedTable').html(buildBellTable(d.target, d.actual));
                }

                // ── 9-Box matrix ───────────────────────────────────────
                let boxData = { box1:[], box2:[], box3:[], box4:[], box5:[], box6:[], box7:[], box8:[], box9:[] };
                data.forEach(emp => {
                    let score       = parseFloat(emp.total_score) || 0;
                    let performance = score < 2.5 ? "poor"        : score < 3.5 ? "good"     : "outstanding";
                    let potential   = score < 2.5 ? "low"         : score < 3.5 ? "moderate" : "high";
                    let box = "";
                    if      (performance == "poor"        && potential == "high")     box = "box1";
                    else if (performance == "good"        && potential == "high")     box = "box2";
                    else if (performance == "outstanding" && potential == "high")     box = "box3";
                    else if (performance == "poor"        && potential == "moderate") box = "box4";
                    else if (performance == "good"        && potential == "moderate") box = "box5";
                    else if (performance == "outstanding" && potential == "moderate") box = "box6";
                    else if (performance == "poor"        && potential == "low")      box = "box7";
                    else if (performance == "good"        && potential == "low")      box = "box8";
                    else if (performance == "outstanding" && potential == "low")      box = "box9";
                    if (box) boxData[box].push(emp.employee);
                });

                // ── KPI Cards ──────────────────────────────────────────
                let fromVal = from_date_field.get_value();
                let toVal   = to_date_field.get_value();
                let deptVal = unit_field.get_value();

                // ── FIXED: openAppraisalList builds correct URL filters ──
                function openAppraisalList(extraFilters) {

    let period = getHalfYearPeriod();

    let filters = {
        start_date: ["between", [period.start_date, period.end_date]]
    };

    if (deptVal) {
        filters["custom_unit"] = deptVal;
    }

    (extraFilters || []).forEach(f => {
        filters[f[0]] = [f[1], f[2]];
    });

    if (!filters["docstatus"]) {
        filters["docstatus"] = ["in", [0,1]];
    }
    frappe.open_in_new_tab = true;
    frappe.set_route("List", "Appraisal", filters);
}

                $page.find("#total_emp").text(total);
                $page.find("#total_completed").text(total ? ((totalAll.completed / totalAll.total) * 100).toFixed(0) + "%" : "0%");
                $page.find("#total_pending").text(total   ? ((totalAll.pending   / totalAll.total) * 100).toFixed(0) + "%" : "0%");
                $page.find("#avg_score").text(avg_score);
                $page.find("#top_perf").text(boxData.box3.length + boxData.box6.length + boxData.box9.length);
                $page.find("#low_perf").text(boxData.box1.length + boxData.box4.length + boxData.box7.length);
                
                // ── FIXED: bindCard with correct Frappe list filter format ──
                function bindCard(id, extraFilters) {
                    $page.find("#" + id).off("click").on("click", function() {
                        openAppraisalList(extraFilters);
                    }).css({ cursor: "pointer" });
                }

                bindCard("card_total_emp",  [["docstatus", "in", [0, 1]]]);

                bindCard("card_completed",  [["workflow_state", "in", ["Approved","Accepted"]]]);

                bindCard("card_pending",    [["workflow_state", "=", "Draft"]]);

                bindCard("card_avg_score",  [["docstatus", "in", [0, 1]]]);

                bindCard("card_top_perf",   [["total_score", ">", 3.5]]);

                bindCard("card_low_perf",   [["total_score", "<", 2.5]]);

                let htmlBuffer = "";

                // ── Table + Donut + Bar ────────────────────────────────
                let deptNames = [], completedPerc = [], pendingPerc = [];
                let tableRows = "";

                Object.keys(tableData).forEach(dept => {
                    let d    = tableData[dept];
                    let comp = d.total ? Math.round((d.completed / d.total) * 100) : 0;
                    let pend = d.total ? Math.round((d.pending   / d.total) * 100) : 0;
                    deptNames.push(dept);
                    completedPerc.push(comp);
                    pendingPerc.push(pend);
                    tableRows += `<tr style="transition:background 0.3s;"
                        onmouseover="this.style.background='#f0f8ff'"
                        onmouseout="this.style.background='white'">
                        <td style="padding:10px;text-align:left;">${dept}</td>
                        <td>${d.total}</td>
                        <td>${comp}%</td>
                        <td>${pend}%</td>
                    </tr>`;
                });

                htmlBuffer += `
                <div style="display:flex; gap:20px; align-items:stretch; margin-bottom:20px;">
                  <div style="flex:1; overflow-x:auto; background:white; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.05); padding:20px;">
                    <h3 style="color:#2E86C1; text-align:center; margin-bottom:20px;">Staff Performance Appraisal Status</h3>
                    <table class="table" style="width:100%; border-collapse:separate; border-spacing:0; text-align:center;">
                      <thead style="background:#2E86C1; color:white; font-weight:600;">
                        <tr>
                          <th style="padding:12px; text-align:left;">Unit</th>
                          <th>Total Due</th><th>Completed %</th><th>Pending %</th>
                        </tr>
                      </thead>
                      <tbody>${tableRows}</tbody>
                    </table>
                  </div>
                  <div style="flex:1; display:flex; flex-direction:column; gap:20px;">
                    <div style="background:white; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.05); padding:20px;">
                      <h3 style="text-align:center; margin-bottom:15px;">📊 Unit Performance</h3>
                      <canvas id="deptBarChart" style="max-height:350px;"></canvas>
                    </div>
                    <div style="background:white; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.05); padding:20px;">
                      <h3 style="text-align:center; margin-bottom:10px;">📊 Appraisal Completion Status</h3>
                      <div style="position:relative; height:220px;">
                        <canvas id="completionDonutChart"></canvas>
                      </div>
                      <div class="ai-insight-card" style="margin-top:10px;">
                        <div class="ai-card-header">
                          <h4>✨ Completion Insights</h4>
                          <button class="btn btn-sm btn-primary" id="btn-ai-donut">Generate Insight</button>
                        </div>
                        <div id="ai-content-donut" class="ai-insight-content">Click Generate Insight for completion rate analysis.</div>
                      </div>
                    </div>
                  </div>
                </div>`;

                // ── 9-Box Matrix ───────────────────────────────────────
                htmlBuffer += `
                <button class="collapsible-btn active">🗂️ 9-Box Talent Matrix</button>
                <div class="collapsible-wrapper" style="display:block;">
                  <div style="display:flex; gap:10px; align-items:stretch; flex-wrap:wrap;">
                    <div style="display:flex; justify-content:center;">
                      <div class="matrix-wrapper" style="margin-top:0;">
                        <div class="y-axis">Leadership Potential</div>
                        <div>
                          <div class="nine-grid">
                            <div class="box box1">1C<br>Poor Performance<br>High Potential<div class="count">${boxData.box1.length}</div></div>
                            <div class="box box2">1B<br>Good Performance<br>High Potential<div class="count">${boxData.box2.length}</div></div>
                            <div class="box box3">1A<br>Outstanding Performance<br>High Potential<div class="count">${boxData.box3.length}</div></div>
                            <div class="box box4">2C<br>Poor Performance<br>Moderate Potential<div class="count">${boxData.box4.length}</div></div>
                            <div class="box box5">2B<br>Good Performance<br>Moderate Potential<div class="count">${boxData.box5.length}</div></div>
                            <div class="box box6">2A<br>Outstanding Performance<br>Moderate Potential<div class="count">${boxData.box6.length}</div></div>
                            <div class="box box7">3C<br>Poor Performance<br>Limited Potential<div class="count">${boxData.box7.length}</div></div>
                            <div class="box box8">3B<br>Good Performance<br>Limited Potential<div class="count">${boxData.box8.length}</div></div>
                            <div class="box box9">3A<br>Outstanding Performance<br>Limited Potential<div class="count">${boxData.box9.length}</div></div>
                          </div>
                          <div style="display:flex; justify-content:space-around; margin-top:10px; font-weight:bold;">
                            <div>Poor</div><div>Good</div><div>Outstanding</div>
                          </div>
                          <div style="text-align:center;font-weight:700;margin-top:5px">Past Performance</div>
                        </div>
                      </div>
                    </div>
                    <div class="ai-insight-card">
                      <div class="ai-card-header">
                        <h4>✨ Talent Matrix Insights</h4>
                        <button class="btn btn-sm btn-primary" id="btn-ai-ninebox">Generate Insight</button>
                      </div>
                      <div id="ai-content-ninebox" class="ai-insight-content">Click Generate Insight to analyze talent distribution and succession planning.</div>
                    </div>
                  </div>
                </div>`;

                // ── Unified Bell Curve Section ─────────────────────────
                htmlBuffer += buildBellSection();

                // ── Trend Chart ────────────────────────────────────────
                let dateWise = {};
                let fromDate = from_date_field.get_value();
                let toDate   = to_date_field.get_value();

                data.forEach(d => {
                    if (d.custom_self_approval_date && d.custom_self_approval_date >= fromDate && d.custom_self_approval_date <= toDate) {
                        if (!dateWise[d.custom_self_approval_date]) dateWise[d.custom_self_approval_date] = { completed: 0, pending: 0 };
                        dateWise[d.custom_self_approval_date].pending += 1;
                    }
                    if (d.custom_submitted_date && d.custom_submitted_date >= fromDate && d.custom_submitted_date <= toDate) {
                        if (!dateWise[d.custom_submitted_date]) dateWise[d.custom_submitted_date] = { completed: 0, pending: 0 };
                        dateWise[d.custom_submitted_date].completed += 1;
                    }
                });

                let trendDates      = Object.keys(dateWise).sort();
                let completedCounts = trendDates.map(d => dateWise[d].completed);
                let pendingCounts   = trendDates.map(d => dateWise[d].pending);

                htmlBuffer += `
                <button class="collapsible-btn active">📉 Daily Appraisal Completion Trend</button>
                <div class="collapsible-wrapper" style="display:block;">
                  <div class="chart-full-width"><canvas id="appraisalTrendChart" height="120"></canvas></div>
                  <div class="ai-insight-card">
                    <div class="ai-card-header">
                      <h4>✨ Velocity Insights</h4>
                      <button class="btn btn-sm btn-primary" id="btn-ai-trend">Generate Insight</button>
                    </div>
                    <div id="ai-content-trend" class="ai-insight-content">Click Generate Insight to analyze submission pacing.</div>
                  </div>
                </div>`;

                // ── Inject HTML ────────────────────────────────────────
                $page.find("#dashboard-content").html(htmlBuffer);

                // ── Dept Bar Chart ─────────────────────────────────────
                let deptBarChart;
                const ctxBar = $page.find('#deptBarChart')[0];
                if (deptBarChart) deptBarChart.destroy();
                deptBarChart = new Chart(ctxBar, {
                    type: 'bar',
                    data: {
                        labels: deptNames,
                        datasets: [
                            { label: 'Completed %', data: completedPerc, backgroundColor: '#28a745' },
                            { label: 'Pending %',   data: pendingPerc,   backgroundColor: '#ffc107' }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, max: 100, ticks: { callback: v => v + "%" } }
                        },
                        plugins: { legend: { position: 'bottom' } }
                    }
                });

                // ── Raw data store ─────────────────────────────────────
                dashboard_raw_data = {
                    total_employees: total,
                    average_score:   avg_score,
                    completion_rate: totalAll,
                    rating_distribution: {
                        combined: combActual,
                        worker:   workerActual,
                        staff:    staffActual
                    },
                    trend_velocity: completedCounts
                };

                // ── Collapsible toggle ─────────────────────────────────
                $page.find('.collapsible-btn').off('click').on('click', function() {
                    $(this).toggleClass('active');
                    $(this).next('.collapsible-wrapper').slideToggle(300);
                });

                // ── Bell toggle button bindings ────────────────────────
                // Closure over bellViewData and switchBellView
                function bindBellToggles() {
                    $page.find('#bell-btn-combined').off('click').on('click', function() {
                        switchBellView('combined');
                    });
                    $page.find('#bell-btn-worker').off('click').on('click', function() {
                        switchBellView('worker');
                    });
                    $page.find('#bell-btn-staff').off('click').on('click', function() {
                        switchBellView('staff');
                    });
                }

                bindBellToggles();

                // ── Render default bell view (Combined) ────────────────
                currentBellView = 'combined';
                switchBellView('combined');

                // ── Donut Chart ────────────────────────────────────────
                const ctxDonut = $page.find('#completionDonutChart')[0];
                if (completionDonutChart) completionDonutChart.destroy();
                const totals = totalAll.completed + totalAll.pending;

                completionDonutChart = new Chart(ctxDonut, {
                    type: 'doughnut',
                    data: {
                        labels: ['Completed', 'Pending'],
                        datasets: [{
                            data: [totalAll.completed, totalAll.pending],
                            backgroundColor: ['#28a745', '#ffc107'],
                            borderColor: ['#ffffff', '#ffffff'],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '60%',
                        plugins: {
                            legend: { position: 'bottom', labels: { font: { size: 14 }, padding: 20 } },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let value = context.raw;
                                        let pct   = totals ? ((value / totals) * 100).toFixed(0) : 0;
                                        return context.label + ': ' + value + ' (' + pct + '%)';
                                    }
                                }
                            }
                        }
                    },
                    plugins: [{
                        id: 'donutPercentage',
                        afterDraw(chart) {
                            const { ctx } = chart;
                            const dataset = chart.data.datasets[0];
                            const meta    = chart.getDatasetMeta(0);
                            const total   = dataset.data.reduce((a, b) => a + b, 0);
                            ctx.save();
                            ctx.font           = "bold 16px Arial";
                            ctx.fillStyle      = "#000";
                            ctx.textAlign      = "center";
                            ctx.textBaseline   = "middle";
                            meta.data.forEach((arc, index) => {
                                const value = dataset.data[index];
                                const pct   = total ? ((value / total) * 100).toFixed(0) + "%" : "0%";
                                const angle = (arc.startAngle + arc.endAngle) / 2;
                                const x     = arc.x + Math.cos(angle) * (arc.outerRadius * 0.65);
                                const y     = arc.y + Math.sin(angle) * (arc.outerRadius * 0.65);
                                ctx.fillText(pct, x, y);
                            });
                            ctx.restore();
                        }
                    }]
                });

                // ── Trend Chart ────────────────────────────────────────
                const ctxTrend = $page.find("#appraisalTrendChart")[0];
                if (trendChart) trendChart.destroy();
                trendChart = new Chart(ctxTrend, {
                    type: "line",
                    data: {
                        labels: trendDates,
                        datasets: [
                            { label: "Completed", data: completedCounts, borderColor: "#28a745", backgroundColor: "rgba(40,167,69,0.1)", tension: 0.4, fill: true },
                            { label: "Pending",   data: pendingCounts,   borderColor: "#ffc107", backgroundColor: "rgba(255,193,7,0.1)",  tension: 0.4, fill: true }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });

                // ── AI Button Events ───────────────────────────────────
                $page.find('#btn-ai-donut').on('click', function() {
                    fetch_ai_insights(this, 'ai-content-donut', 'completion_status', {
                        total: totalAll.total, completed: totalAll.completed, pending: totalAll.pending
                    });
                });

                $page.find('#btn-ai-bell').on('click', function() {
                    fetch_ai_insights(this, 'ai-content-bell', 'bell_curve', {
                        categories: ["A (Excellent)", "B (Very Good)", "C (Good)", "D (Acceptable)", "E (Poor)"],
                        worker:  { target: workerTarget, actual: workerActual, total: workerScored.length },
                        staff:   { target: staffTarget,  actual: staffActual,  total: staffScored.length  },
                        combined:{ target: combTarget,   actual: combActual,   total: allScored.length    },
                        target_percentages: ["10%", "20%", "50%", "15%", "5%"]
                    });
                });

                $page.find('#btn-ai-trend').on('click', function() {
                    fetch_ai_insights(this, 'ai-content-trend', 'daily_trend', {
                        dates: trendDates, completed: completedCounts, pending: pendingCounts
                    });
                });

                $page.find('#btn-ai-ninebox').on('click', function() {
                    let nineBoxCounts = {
                        "1A (Outstanding Perf, High Pot)":  boxData.box3.length,
                        "1B (Good Perf, High Pot)":         boxData.box2.length,
                        "1C (Poor Perf, High Pot)":         boxData.box1.length,
                        "2A (Outstanding Perf, Mod Pot)":   boxData.box6.length,
                        "2B (Good Perf, Mod Pot)":          boxData.box5.length,
                        "2C (Poor Perf, Mod Pot)":          boxData.box4.length,
                        "3A (Outstanding Perf, Low Pot)":   boxData.box9.length,
                        "3B (Good Perf, Low Pot)":          boxData.box8.length,
                        "3C (Poor Perf, Low Pot)":          boxData.box7.length,
                    };
                    fetch_ai_insights(this, 'ai-content-ninebox', 'nine_box', nineBoxCounts);
                });

            } // end callback
        }); // end frappe.call
    } // end load_dashboard

    setTimeout(() => { load_dashboard(); }, 500);

    } // end init_dashboard
};