// ═══════════════════════════════════════════════════════════════════════════
//  custom-workspace  —  Employee Appraisal Dashboard
//  Revised: consistent alignment, unified CSS class usage
// ═══════════════════════════════════════════════════════════════════════════

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

    // ══════════════════════════════════════════════════════════════════════
    //  INFO POPUP SYSTEM
    // ══════════════════════════════════════════════════════════════════════

    const INFO_REGISTRY = {
        total_emp: {
            title: "Total Employees",
            description: "Total number of employees included in the appraisal cycle for the selected period.",
            formula: "COUNT(Appraisal Records)",
            example: "120 employees have appraisal records for H1 2025."
        },

        total_completed: {
            title: "Completion Rate",
            description: "Percentage of appraisals that have been completed and approved.",
            formula: "(Completed Appraisals ÷ Total Appraisals) × 100",
            example: "80 completed out of 120 appraisals → 67%"
        },

        total_pending: {
            title: "Pending Rate",
            description: "Percentage of appraisals that are still in progress and awaiting completion.",
            formula: "(Pending Appraisals ÷ Total Appraisals) × 100",
            example: "40 pending out of 120 appraisals → 33%"
        },

        total_overdue: {
            title: "Overdue Rate",
            description: "Percentage of appraisals that have exceeded the expected completion timeline.",
            formula: "(Overdue Appraisals ÷ Total Appraisals) × 100",
            example: "15 overdue out of 120 appraisals → 13%"
        },

        top_perf: {
            title: "Top Performers",
            description: "Employees with outstanding appraisal scores above 3.5.",
            formula: "COUNT(Score > 3.5)",
            example: "18 employees scored above 3.5."
        },

        low_perf: {
            title: "Low Performers",
            description: "Employees with appraisal scores below 2.5 who may require additional support.",
            formula: "COUNT(Score < 2.5)",
            example: "5 employees scored below 2.5."
        },

        section_status_table: {
            title: "Staff Performance Appraisal Status",
            description: "Unit-wise summary of appraisal completion, pending, and overdue status.",
            formula: "Completed % + Pending % + Overdue %",
            example: "Operations: 50 total, 40 completed, 10 pending."
        },

        col_unit: {
            title: "Unit",
            description: "The business unit or department being evaluated.",
            formula: "Grouped by Unit",
            example: "Finance, Operations, HR, IT"
        },

        col_total_due: {
            title: "Total Due",
            description: "Total number of appraisals assigned to employees in the unit.",
            formula: "COUNT(Appraisal Records)",
            example: "Finance has 25 appraisals."
        },

        col_completed_pct: {
            title: "Completed",
            description: "Appraisals that have reached Approved or Accepted status.",
            formula: "COUNT(Approved + Accepted)",
            example: "20 out of 25 appraisals completed → 80%"
        },

        col_pending_pct: {
            title: "Pending",
            description: "Appraisals that are still awaiting completion or final approval.",
            formula: "COUNT(Appraisals not yet Approved or Accepted)",
            example: "5 out of 25 appraisals pending → 20%"
        },

        col_overdue_pct: {
            title: "Overdue",
            description: "Appraisals that require immediate attention due to delay.",
            formula: "COUNT(Overdue Appraisals)",
            example: "3 out of 25 appraisals overdue → 12%"
        },

        col_progress: {
            title: "Progress",
            description: "Visual representation of appraisal completion progress.",
            formula: "(Completed ÷ Total) × 100",
            example: "20 completed out of 25 → 80% progress"
        },

        section_donut: {
            title: "Appraisal Completion Status",
            description: "Visual breakdown of completed, pending, and overdue appraisals across the organization.",
            formula: "Status Count ÷ Total Appraisals × 100",
            example: "80 completed, 25 pending, 15 overdue."
        },

        section_bell: {
            title: "Bell Curve Distribution",
            description: "Comparison of actual employee ratings against the organization's target rating distribution.",
            formula: "Distribution by Performance Rating",
            example: "100 employees evaluated across A–E bands."
        },

        bell_target_count: {
            title: "Target Distribution",
            description: "Expected number of employees in each performance category.",
            formula: "Total Employees × Target %",
            example: "80 employees → A Band Target = 8"
        },

        bell_actual_count: {
            title: "Actual Distribution",
            description: "Actual number of employees in each performance category.",
            formula: "COUNT(Employees per Rating Band)",
            example: "80 employees → A Band Actual = 15"
        },

        section_trend: {
            title: "Daily Completion Trend",
            description: "Tracks appraisal activity over time, showing completion and pending trends.",
            formula: "Daily Count by Status",
            example: "15-Jan: 8 completed, 12 pending."
        },

        section_aging: {
            title: "Appraisal Aging Report",
            description: "Shows how long incomplete appraisals have remained open.",
            formula: "Current Date − Rollout Date",
            example: "73 days open → Critical"
        },

        aging_critical: {
            title: "Critical (>60 Days)",
            description: "Appraisals pending for more than 60 days that require immediate action.",
            formula: "COUNT(Aging > 60 Days)",
            example: "73 days pending → Critical"
        },

        aging_warning: {
            title: "Warning (31–60 Days)",
            description: "Appraisals that are approaching escalation thresholds.",
            formula: "COUNT(Aging Between 31 and 60 Days)",
            example: "42 days pending → Warning"
        },

        aging_active: {
            title: "Active (≤30 Days)",
            description: "Appraisals currently within the normal processing period.",
            formula: "COUNT(Aging ≤ 30 Days)",
            example: "14 days pending → Active"
        },

        section_high_perf: {
            title: "High Performer Tracker",
            description: "Employees with strong performance ratings ranked by score.",
            formula: "Score ≥ 3.5",
            example: "Employee scored 4.7 → Exceptional"
        },

        section_low_perf: {
            title: "Low Performer Tracker",
            description: "Employees requiring performance improvement support.",
            formula: "Score < 2.5",
            example: "Employee scored 1.2 → Immediate PIP"
        },
        section_status_table: {
        title: "Staff Performance Appraisal Status",
        description: "A summary of appraisal progress across business units, showing completed, pending, and overdue appraisals.",
        formula: "Completed % = Completed Appraisals ÷ Total Appraisals × 100 | Pending % = Pending Appraisals ÷ Total Appraisals × 100",
        example: "Operations: 50 appraisals, 40 completed, 10 pending → 80% Completed, 20% Pending."
        },

        col_unit: {
        title: "Unit",
        description: "The business unit or department being assessed.",
        formula: "Grouped by Unit",
        example: "Finance, Operations, HR, IT"
        },

        col_total_due: {
        title: "Total Due",
        description: "The total number of appraisals assigned to employees in the selected unit.",
        formula: "COUNT(Appraisal Records)",
        example: "Finance has 25 appraisals due."
        },

        col_completed_pct: {
        title: "Completed",
        description: "Appraisals that have been successfully completed and approved.",
        formula: "COUNT(Appraisals with status Approved or Accepted)",
        example: "20 out of 25 appraisals completed → 80%"
        },

        col_pending_pct: {
        title: "Pending",
        description: "Appraisals that are still in progress and awaiting completion or approval.",
        formula: "COUNT(Appraisals not yet Approved or Accepted)",
        example: "5 out of 25 appraisals pending → 20%"
        },

        col_overdue_pct: {
        title: "Overdue",
        description: "Appraisals that have exceeded the expected completion timeline.",
        formula: "COUNT(Appraisals marked as Overdue)",
        example: "3 out of 25 appraisals overdue → 12%"
        },

        col_progress: {
        title: "Progress Bar",
        description: "Visual representation of appraisal completion progress for the unit.",
        formula: "Completed Appraisals ÷ Total Appraisals × 100",
        example: "21 completed out of 39 appraisals → 54% progress"
        },

        section_donut: {
        title: "Appraisal Completion Status",
        description: "Visual breakdown of completed, pending, and overdue appraisals across the organization.",
        formula: "Status Count ÷ Total Appraisals × 100",
        example: "120 total appraisals: 80 completed, 25 pending, 15 overdue."
        },

        section_bell: {
        title: "Bell Curve Distribution",
        description: "Comparison of actual employee performance ratings against the organization's target distribution.",
        formula: "A=10%, B=20%, C=50%, D=15%, E=5%",
        example: "100 employees evaluated → A=10, B=20, C=50, D=15, E=5 target."
        },

        bell_target_count: {
        title: "Target Distribution",
        description: "Expected number of employees in each performance category based on company guidelines.",
        formula: "Total Employees × Target Percentage",
        example: "80 employees → A category target = 8."
        },

        bell_actual_count: {
        title: "Actual Distribution",
        description: "Actual number of employees falling into each performance category.",
        formula: "COUNT(Employees in each rating band)",
        example: "80 employees → 15 employees in A category."
        },

        section_trend: {
        title: "Daily Appraisal Completion Trend",
        description: "Tracks appraisal activity over time, showing completion and pending trends by date.",
        formula: "Daily Count of Completed, Pending, and Overdue Appraisals",
        example: "15-Jan: 8 completed, 12 pending."
        },

        section_aging: {
        title: "Appraisal Aging Report",
        description: "Shows how long incomplete appraisals have been open since rollout.",
        formula: "Current Date − Rollout Date",
        example: "73 days open → Critical."
        },

        aging_critical: {
        title: "Critical (>60 Days)",
        description: "Appraisals pending for more than 60 days that require immediate attention.",
        formula: "COUNT(Appraisals Aging > 60 Days)",
        example: "73 days pending → Critical 🔴"
        },

        aging_warning: {
        title: "Warning (31–60 Days)",
        description: "Appraisals pending between 31 and 60 days that require follow-up.",
        formula: "COUNT(Appraisals Aging 31–60 Days)",
        example: "42 days pending → Warning 🟡"
        },

        aging_active: {
        title: "Active (≤30 Days)",
        description: "Appraisals within the normal completion period.",
        formula: "COUNT(Appraisals Aging ≤ 30 Days)",
        example: "14 days pending → Active 🔵"
        },
        aging_col_employee: {
        title: "Employee",
        description: "Employee name and ID for the appraisal that is currently pending.",
        formula: "Employee Name + Employee ID",
        example: "Ravi Kumar (EMP-00123)"
        },

        aging_col_rollout: {
        title: "Rollout Date",
        description: "The date when the appraisal was initiated for the employee.",
        formula: "Appraisal Rollout Date",
        example: "01-Jan-2025"
        },

        aging_col_aging: {
        title: "Aging",
        description: "Number of days the appraisal has remained incomplete, displayed with a priority indicator.",
        formula: "Current Date − Rollout Date",
        example: "73 days → Critical 🔴"
        },

        aging_col_status: {
        title: "Status",
        description: "Current stage of the appraisal workflow.",
        formula: "Workflow Status",
        example: "Pending Manager Review"
        },

        section_high_perf: {
        title: "High Performer Tracker",
        description: "Employees with strong performance ratings, ranked from highest to lowest score.",
        formula: "Score ≥ 3.5",
        example: "Score 4.7 → Exceptional | Score 4.2 → Excellent"
        },

        hp_exceptional: {
        title: "Exceptional (≥4.5)",
        description: "Top-performing employees who consistently deliver outstanding results.",
        formula: "COUNT(Employees with Score ≥ 4.5)",
        example: "Score 4.8 → Exceptional ⭐"
        },

        hp_excellent: {
        title: "Excellent (4.0–4.5)",
        description: "Employees who consistently exceed expectations and demonstrate strong performance.",
        formula: "COUNT(Employees with Score between 4.0 and 4.5)",
        example: "Score 4.2 → Excellent 🌟"
        },

        hp_strong: {
        title: "Strong (3.5–4.0)",
        description: "Employees who consistently meet expectations and show solid performance.",
        formula: "COUNT(Employees with Score between 3.5 and 4.0)",
        example: "Score 3.7 → Strong ✅"
        },

        hp_col_score: {
        title: "Score",
        description: "Final appraisal score based on the employee's overall performance evaluation.",
        formula: "Final Appraisal Score",
        example: "4.25"
        },

        hp_col_band: {
        title: "Band",
        description: "Performance category assigned based on the employee's final score.",
        formula: "Exceptional | Excellent | Strong",
        example: "Score 4.6 → Exceptional ⭐"
        },

        section_low_perf: {
        title: "Low Performer Tracker",
        description: "Employees with low performance ratings who may require coaching, monitoring, or a performance improvement plan.",
        formula: "Score < 2.5",
        example: "Score 1.2 → Immediate PIP"
        },

        lp_pip: {
        title: "Immediate PIP (≤1.5)",
        description: "Employees who require an immediate Performance Improvement Plan.",
        formula: "COUNT(Employees with Score ≤ 1.5)",
        example: "Score 1.1 → Immediate PIP 🔴"
        },

        lp_review: {
        title: "Review Required (1.5–2.0)",
        description: "Employees who require a formal performance review and improvement plan.",
        formula: "COUNT(Employees with Score between 1.5 and 2.0)",
        example: "Score 1.8 → Review Required 🟡"
        },

        lp_monitor: {
        title: "Monitor (2.0–2.5)",
        description: "Employees whose performance should be monitored and supported through regular follow-ups.",
        formula: "COUNT(Employees with Score between 2.0 and 2.5)",
        example: "Score 2.3 → Monitor 🔵"
        },

        lp_col_pip: {
        title: "PIP Recommendation",
        description: "Recommended action based on the employee's performance score.",
        formula: "Immediate PIP | Review Required | Monitor",
        example: "Score 1.3 → Immediate PIP 🔴"
        }

        };

    // ── Info popup events ──────────────────────────────────────────────────
    $(document).on('click', '.ii[data-info-key]', function(e) {
        e.stopPropagation();
        let key  = $(this).data('info-key');
        let info = INFO_REGISTRY[key];
        if (!info) return;
        $('#info-popup-title').text(info.title);
        $('#info-popup-desc').text(info.description);
        $('#info-popup-formula').text(info.formula);
        $('#info-popup-example').text(info.example);
        $('#info-popup-overlay').fadeIn(150);
        $('#info-popup-modal').show();
    });

    function closeInfoPopup() {
        $('#info-popup-overlay').fadeOut(130);
        $('#info-popup-modal').hide();
    }
    $(document).on('click', '#info-popup-close, #info-popup-overlay', closeInfoPopup);
    $(document).on('keydown', function(e) { if (e.key === 'Escape') closeInfoPopup(); });

    // ── Helper: info icon ──────────────────────────────────────────────────
    function ii(key, variant) {
        variant = variant || 'muted';
        return `<span class="ii ${variant}" data-info-key="${key}">i</span>`;
    }

    // ── Helper: section wrapper ────────────────────────────────────────────
    function sectionWrap(id, icon, title, desc, infoKey, bodyHtml, aiHtml) {
        aiHtml = aiHtml || '';
        let descHtml = desc
            ? `<span class="section-desc">${desc}</span>`
            : '';
        return `
<div class="appr-section" data-section="${id}">
  <div class="appr-section-header open" data-section="${id}">
    <div class="section-header-left" style="width:25%;">
      <div class="section-icon">${icon}</div>
      <span class="section-title">${title}</span>
    </div>
    <div class="section-header-right">
      ${descHtml}
      
    </div>
    <span class="section-toggle-arrow">&#9660;</span>
  </div>
  <div class="appr-section-body open" data-section="${id}">
    ${bodyHtml}
    ${aiHtml}
  </div>
</div>`;
    }

    // ── Helper: AI card ────────────────────────────────────────────────────
    function aiCard(btnId, contentId, placeholder) {
        return `
<div class="ai-insight-card">
  <div class="ai-card-header">
    <h4>✨ AI Insights</h4>
    <button class="btn btn-sm btn-primary" id="${btnId}">Generate Insight</button>
  </div>
  <div id="${contentId}" class="ai-insight-content">${placeholder}</div>
</div>`;
    }

    // ══════════════════════════════════════════════════════════════════════
    //  MAIN INIT
    // ══════════════════════════════════════════════════════════════════════

    function getAgeingInsightsData(rawData) {
        let today = frappe.datetime.get_today();
        let totalDays = 0;
        let pendingItems = rawData.filter(d => !["Approved","Accepted","Rejected"].includes(d.workflow_state));
        let ageingData = {
            summary: { average_age_days:0, total_pending:pendingItems.length, critical_over_60d:0, warning_31_to_60d:0, active_under_30d:0 },
            bottlenecks: []
        };
        pendingItems.forEach(d => {
            let baseDate = d.custom_rollout_date || d.creation || d.modified;
            let daysStuck = baseDate ? frappe.datetime.get_diff(today, baseDate.split(" ")[0]) : 0;
            totalDays += daysStuck;
            if (daysStuck > 60)      ageingData.summary.critical_over_60d++;
            else if (daysStuck > 30) ageingData.summary.warning_31_to_60d++;
            else                      ageingData.summary.active_under_30d++;
            ageingData.bottlenecks.push({ name: d.employee_name || d.employee, days: daysStuck, status: d.workflow_state, unit: d.custom_unit || "General" });
        });
        if (pendingItems.length > 0)
            ageingData.summary.average_age_days = Math.round(totalDays / pendingItems.length);
        ageingData.bottlenecks.sort((a, b) => b.days - a.days);
        ageingData.bottlenecks = ageingData.bottlenecks.slice(0, 5);
        return ageingData;
    }

    function init_dashboard() {

        let start = frappe.datetime.month_start();
        let end   = frappe.datetime.month_end();

        let completionDonutChart, trendChart, deptBarChart;
        let activeBellChart = null;
        let dashboard_raw_data = {};
        let currentBellView = 'combined';

        const WORKER_GRADES = ['A1','A2','A3','A4','A5'];
        function isWorker(grade) { return WORKER_GRADES.includes((grade||'').trim().toUpperCase()); }

        const BELL_LABELS        = ['E  (Poor)','D  (Acceptable)','C  (Good)','B  (Very Good)','A  (Excellent)'];
        const BELL_TARGET_PCT    = [0.05, 0.15, 0.50, 0.20, 0.10];
        const BELL_RATING_LABELS = ['A (Excellent)','B (Very Good)','C (Good)','D (Acceptable)','E (Poor)'];
        const BELL_RATING_COLORS = ['#1565C0','#2d7a4f','#f57c00','#e53935','#6d4c41'];

        function buildBellCounts(scores) {
            let c = [0,0,0,0,0];
            scores.forEach(s => {
                let v = parseFloat(s)||0; if (v <= 0) return;
                if (v <= 1) c[0]++; else if (v <= 2) c[1]++; else if (v <= 3) c[2]++; else if (v <= 4) c[3]++; else c[4]++;
            });
            return c;
        }
        function buildTargetCounts(total) { return BELL_TARGET_PCT.map(p => Math.round(total * p)); }

        const dataLabelPlugin = {
            id: 'dataLabelPlugin',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                chart.data.datasets.forEach((dataset, di) => {
                    const meta = chart.getDatasetMeta(di);
                    meta.data.forEach((point, idx) => {
                        const value = dataset.data[idx];
                        const { x, y } = point.getProps(['x','y'], true);
                        ctx.save();
                        ctx.font = 'bold 12px DM Sans,Arial';
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
            let tgt     = [...targetCounts].reverse();
            let act     = [...evaluatedCounts].reverse();
            let tgtPcts = ['10%','20%','50%','15%','5%'];
            let headerCells = BELL_RATING_LABELS.map((lbl, i) =>
                `<th style="padding:6px 10px;text-align:center;font-size:11px;background:${BELL_RATING_COLORS[i]}20;color:${BELL_RATING_COLORS[i]};border-right:1px solid #e8eaf0;">${lbl}</th>`
            ).join('');
            let tgtCells = tgt.map(v =>
                `<td style="padding:6px 10px;text-align:center;font-size:12px;font-weight:600;border-right:1px solid #e8eaf0;color:#e53935;">${v}</td>`
            ).join('');
            let pctCells = tgtPcts.map(p =>
                `<td style="padding:3px 10px;text-align:center;font-size:10px;border-right:1px solid #e8eaf0;color:#999;">${p}</td>`
            ).join('');
            let actCells = act.map(v =>
                `<td style="padding:6px 10px;text-align:center;font-size:12px;font-weight:700;border-right:1px solid #e8eaf0;color:#1565C0;">${v}</td>`
            ).join('');
            let tgtTotal = tgt.reduce((a,b) => a+b, 0);
            let actTotal = act.reduce((a,b) => a+b, 0);
            return `
<div style="overflow-x:auto;margin-top:14px;">
  <table style="width:100%;border-collapse:collapse;border:1px solid #e8eaf0;border-radius:8px;overflow:hidden;font-family:inherit;">
    <thead>
      <tr style="background:#f5f7fa;">
        <th style="padding:6px 12px;text-align:left;font-size:10px;color:#666;border-right:1px solid #e8eaf0;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Rating</th>
        ${headerCells}
        <th style="padding:6px 10px;text-align:center;font-size:10px;color:#666;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#fff8f8;">
        <td style="padding:6px 12px;font-size:11px;font-weight:600;color:#e53935;border-right:1px solid #e8eaf0;">&#x1F534; Target ${ii('bell_target_count','dark')}</td>
        ${tgtCells}
        <td style="padding:6px 10px;text-align:center;font-size:12px;font-weight:700;color:#e53935;">${tgtTotal}</td>
      </tr>
      <tr style="background:#f9f9f9;">
        <td style="padding:3px 12px;color:#999;border-right:1px solid #e8eaf0;font-size:10px;"></td>
        ${pctCells}
        <td style="padding:3px 10px;text-align:center;color:#999;font-size:10px;">100%</td>
      </tr>
      <tr style="background:#f0f8ff;">
        <td style="padding:6px 12px;font-size:11px;font-weight:600;color:#1565C0;border-right:1px solid #e8eaf0;">&#x1F535; Evaluated ${ii('bell_actual_count','dark')}</td>
        ${actCells}
        <td style="padding:6px 10px;text-align:center;font-size:12px;font-weight:700;color:#1565C0;">${actTotal}</td>
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
                        { label:'Bell Curve (Target)', data:targetCounts,    borderColor:'#e53935', backgroundColor:'rgba(229,57,53,0.08)',  borderWidth:2.5, pointStyle:'rectRot',  pointRadius:8, pointHoverRadius:10, pointBackgroundColor:'#e53935', tension:0.45, fill:true },
                        { label:'Evaluated Curve',     data:evaluatedCounts, borderColor:'#1565C0', backgroundColor:'rgba(21,101,192,0.08)', borderWidth:2.5, pointStyle:'triangle', pointRadius:8, pointHoverRadius:10, pointBackgroundColor:'#1565C0', tension:0.45, fill:true }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    layout: { padding:{ top:28, bottom:4, left:4, right:4 } },
                    scales: {
                        y: { beginAtZero:true, grid:{ color:'rgba(0,0,0,0.07)' }, ticks:{ font:{ size:11 }, color:'#444' } },
                        x: { grid:{ display:false }, ticks:{ font:{ size:11, weight:'bold' }, color:'#222' } }
                    },
                    plugins: {
                        legend: { display:true, position:'top', align:'end', labels:{ usePointStyle:true, font:{ size:11, weight:'bold' }, padding:20, color:'#222' } },
                        tooltip: { callbacks:{ label: ctx => `${ctx.dataset.label}: ${ctx.raw} employees` } }
                    }
                },
                plugins: [dataLabelPlugin]
            });
            return activeBellChart;
        }

        // ── Export PDF ────────────────────────────────────────────────────────
        page.add_inner_button(__('Export to PDF'), function() {
            $page.find('.appr-section-body').addClass('open').show();
            $page.find('canvas').each(function() {
                try {
                    if (this.width > 0 && this.height > 0) {
                        let img = document.createElement('img');
                        img.src = this.toDataURL('image/png', 1.0);
                        img.style.cssText = 'width:100%;max-height:420px;object-fit:contain;display:block;';
                        img.setAttribute('data-canvas-replaced','true');
                        this.parentNode.insertBefore(img, this);
                        this.style.display = 'none';
                    }
                } catch(e) { console.warn('Canvas capture failed:', e); }
            });
            let existingStyles = '';
            document.querySelectorAll('style').forEach(s  => { existingStyles += s.outerHTML; });
            document.querySelectorAll('link[rel="stylesheet"]').forEach(l => { existingStyles += l.outerHTML; });
            let printWindow = window.open('','_blank','width=1000,height=800');
            printWindow.document.write(`<!DOCTYPE html><html><head>
                <meta charset="utf-8"><title>Appraisal Dashboard</title>
                ${existingStyles}
                <style>
                    * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
                    body { margin:0; padding:12px 16px; background:white; font-family:'DM Sans','Segoe UI',sans-serif; font-size:12px; }
                    #print-header { text-align:center; margin-bottom:14px; border-bottom:2px solid #1a2332; padding-bottom:10px; }
                    #print-header h2 { color:#1a2332; margin:0; font-size:18px; }
                    .appr-section-body { display:block!important; }
                    .ii, .bell-toggle-group, .ai-insight-card, #filter-area, .appr-unit-tabs { display:none!important; }
                    @page { size:A4 portrait; margin:10mm 8mm; }
                </style>
            </head><body>
                <div id="print-header"><h2>&#x1F4CA; Employee Appraisal Dashboard</h2><p>Generated on: ${frappe.datetime.nowdate()}</p></div>
                ${$page[0].outerHTML}
            </body></html>`);
            printWindow.document.close();
            printWindow.onload = function() {
                setTimeout(() => { printWindow.focus(); printWindow.print(); setTimeout(() => printWindow.close(), 1500); }, 800);
            };
            setTimeout(() => {
                $page.find('img[data-canvas-replaced]').remove();
                $page.find('canvas').show();
            }, 3000);
        });

        // ── Overall Summary ────────────────────────────────────────────────────
        page.set_primary_action(__('Generate Overall Summary ✨'), function() {
            let $summaryBox = $page.find('#overall-ai-summary');
            let $content    = $page.find('#overall-ai-content');
            if (!$summaryBox.length) return frappe.msgprint("Summary Box missing.");
            $summaryBox.slideDown();
            $content.html("<div style='text-align:center;padding:20px;'><span class='spinner-border spinner-border-sm text-primary'></span> Reading dashboard data...</div>");
            frappe.call({
                method: 'pms_ai.api.generate_master_summary',
                args: { dashboard_data: JSON.stringify(dashboard_raw_data) },
                callback: function(r) {
                    if (r.message) $content.html(r.message.replace(/\n/g,"<br>"));
                    else           $content.html("Error: Could not retrieve summary.");
                }
            });
        });

        // ── Filters ────────────────────────────────────────────────────────────
        let initializing = true;
        let reload_timeout = null;

        function trigger_dashboard_reload() {
            if (initializing) return;
            clearTimeout(reload_timeout);
            reload_timeout = setTimeout(() => load_dashboard(), 300);
        }

        let unit_field = frappe.ui.form.make_control({
            df: { label:"Unit", fieldtype:'Link', options:'Unit', fieldname:'custom_unit', change: () => trigger_dashboard_reload() },
            parent: $page.find('#filter-area'), render_input: true
        });
        let from_date_field = frappe.ui.form.make_control({
            df: { label:"From Date", fieldtype:'Date', fieldname:'from_date', change: () => trigger_dashboard_reload() },
            parent: $page.find('#filter-area'), render_input: true
        });
        let to_date_field = frappe.ui.form.make_control({
            df: { label:"To Date", fieldtype:'Date', fieldname:'to_date', change: () => trigger_dashboard_reload() },
            parent: $page.find('#filter-area'), render_input: true
        });
        from_date_field.set_value(start, true);
        to_date_field.set_value(end, true);

        let grade_filter_field = frappe.ui.form.make_control({
            df: { label:"Employee Type", fieldtype:"Select", fieldname:"grade_filter",
                  options:"\nAll\nWorker (A1–A5)\nStaff",
                  change: () => trigger_dashboard_reload() },
            parent: $page.find('#filter-area'), render_input: true
        });
        grade_filter_field.set_value("All", true);

        let report_type_field = frappe.ui.form.make_control({
            df: { label:"Chart Type", fieldtype:"Select", fieldname:"report_type",
                  options:"\nCompletion Status\nBell Curve Distribution\nDaily Appraisal Completion Trend\nAppraisal Aging\nHigh Performer Tracker\nLow Performer Tracker",
                  change: () => apply_report_type_filter() },
            parent: $page.find('#filter-area'), render_input: true
        });
        report_type_field.set_value("", true);
        initializing = false;

        function apply_report_type_filter() {
            let selected     = report_type_field.get_value() || '';
            let $allSections = $page.find('.appr-section[data-section]');
            if (!selected) {
                $allSections.show();
                $page.find('.appr-kpi-row').show();
                return;
            }
            const sectionMap = {
                "Completion Status":       "completion",
                "Bell Curve Distribution": "bell",
                "Daily Appraisal Completion Trend":"trend",
                "Appraisal Aging":         "aging",
                "High Performer Tracker":  "high_perf",
                "Low Performer Tracker":   "low_perf"
            };
            let target = sectionMap[selected] || '';
            $allSections.each(function() {
                let sid = $(this).data('section');
                if (!target || sid === target) $(this).show(); else $(this).hide();
            });
            if (selected !== "Completion Status") $page.find('.appr-kpi-row').hide();
            else                                   $page.find('.appr-kpi-row').show();
        }

        // ── AI Insight ──────────────────────────────────────────────────────────
        function fetch_ai_insights(btn_element, content_id, context_type, chart_data) {
            let $btn     = $(btn_element);
            let $content = $page.find(`#${content_id}`);
            $btn.prop("disabled", true).html("✨ Analyzing...");
            $content.html("<span class='spinner-border spinner-border-sm text-primary'></span> Analyzing...");
            frappe.call({
                method: 'pms_ai.api.analyze_dashboard_chart',
                args: { chart_context: context_type, chart_data: JSON.stringify(chart_data) },
                callback: function(r) {
                    $btn.prop("disabled", false).html("&#x1F504; Refresh");
                    if (r.message) $content.html(r.message.replace(/\n/g,"<br>"));
                }
            });
        }

        function getHalfYearPeriod() {
            let today = frappe.datetime.now_date();
            let year  = today.split("-")[0];
            let month = parseInt(today.split("-")[1]);
            let start_date, end_date;
            if (month <= 6) { start_date = year+"-01-01"; end_date = year+"-06-30"; }
            else            { start_date = year+"-07-01"; end_date = year+"-12-31"; }
            return { start_date, end_date };
        }

        // ── Paginated Table ──────────────────────────────────────────────────────
        function buildPaginatedTable(containerId, rows, columns, pageSize) {
            pageSize = pageSize || 10;
            let currentPage = 0;
            let totalPages  = Math.ceil(rows.length / pageSize);

            function renderPage(page) {
                let start = page * pageSize;
                let end   = Math.min(start + pageSize, rows.length);
                let slice = rows.slice(start, end);

                let bodyRows = slice.map(row =>
                    `<tr>
                        ${row.map((cell, i) =>
                            `<td style="text-align:${i === 0 ? 'left' : 'center'};">${cell}</td>`
                        ).join('')}
                    </tr>`
                ).join('') || `<tr><td colspan="${columns.length}" style="padding:20px;text-align:center;color:#aaa;font-size:12px;">No data found.</td></tr>`;

                let paginationHtml = '';
                if (totalPages > 1) {
                    paginationHtml = `
<div class="pag-bar">
    <span>Showing ${start+1}–${end} of ${rows.length}</span>
    <div style="display:flex;gap:6px;align-items:center;">
        <button data-page="prev" data-target="${containerId}"
            style="padding:4px 12px;border-radius:6px;border:1px solid #d5d9e0;background:${page===0?'#f0f0f0':'#fff'};color:${page===0?'#aaa':'#333'};cursor:${page===0?'default':'pointer'};"
            ${page===0?'disabled':''}>&#8592; Prev</button>
        <span style="font-weight:600;font-size:12px;">${page+1} / ${totalPages}</span>
        <button data-page="next" data-target="${containerId}"
            style="padding:4px 12px;border-radius:6px;border:1px solid #d5d9e0;background:${page===totalPages-1?'#f0f0f0':'#1a2332'};color:${page===totalPages-1?'#aaa':'#fff'};cursor:${page===totalPages-1?'default':'pointer'};"
            ${page===totalPages-1?'disabled':''}>Next &#8594;</button>
    </div>
</div>`;
                }

                $page.find(`#${containerId}`).html(`
<div style="border-radius:8px;border:1px solid #e8eaf0;overflow:hidden;">
  <table class="appr-table">
    <thead>
      <tr>${columns.map((col, i) => `<th style="text-align:${i===0?'left':'center'};">${col}</th>`).join('')}</tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
  ${paginationHtml}
</div>`);

                $page.find(`#${containerId} [data-page]`).off('click').on('click', function() {
                    if ($(this).prop('disabled')) return;
                    let dir = $(this).data('page');
                    if (dir === 'next' && currentPage < totalPages - 1) { currentPage++; renderPage(currentPage); }
                    if (dir === 'prev' && currentPage > 0)              { currentPage--; renderPage(currentPage); }
                });
            }
            renderPage(0);
        }

        // ── CORE LOAD ────────────────────────────────────────────────────────────
        function load_dashboard() {
            let period  = getHalfYearPeriod();
            let filters = [
                ["start_date","between",[period.start_date, period.end_date]],
                ["docstatus","in",[0,1]]
            ];
            if (unit_field.get_value()) filters.push(["custom_unit","=",unit_field.get_value()]);

            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Appraisal",
                    fields: ["name","employee","employee_name","total_score","custom_unit","custom_grade","docstatus","start_date",
                             "custom_self_approval_date","custom_submitted_date","workflow_state","custom_appraisal_status","custom_rollout_date"],
                    filters: filters,
                    limit_page_length: 1000
                },
                callback: function(r) {
                    let rawData     = r.message || [];
                    let gradeFilter = grade_filter_field.get_value() || 'All';
                    let data;
                    if      (gradeFilter === 'Worker (A1–A5)') data = rawData.filter(d =>  isWorker(d.custom_grade));
                    else if (gradeFilter === 'Staff')          data = rawData.filter(d => !isWorker(d.custom_grade));
                    else                                        data = rawData;

                    // ── Per-unit stats ───────────────────────────────────────
                    let tableData = {};
                    data.forEach(d => {
                        let dept = d.custom_unit || "Unknown";
                        if (!tableData[dept]) tableData[dept] = { total:0, completed:0, pending:0, overdue:0 };
                        tableData[dept].total += 1;
                        if (["Approved","Accepted"].includes(d.workflow_state)) tableData[dept].completed += 1;
                        else tableData[dept].pending += 1;
                        if (d.custom_appraisal_status === 'Overdue') tableData[dept].overdue += 1;
                    });

                    let totalAll = { total:0, completed:0, pending:0, overdue:0 };
                    Object.values(tableData).forEach(d => {
                        totalAll.total     += d.total;
                        totalAll.completed += d.completed;
                        totalAll.pending   += d.pending;
                        totalAll.overdue   += d.overdue;
                    });

                    // ── Unit tabs ────────────────────────────────────────────
                    let units    = Object.keys(tableData).sort();
                    let tabsHtml = `<button class="unit-tab active" data-unit=""><span class="tab-icon">&#x1F3E2;</span> All Units</button>`;
                    units.forEach(u => { tabsHtml += `<button class="unit-tab" data-unit="${u}">${u}</button>`; });
                    // $page.find('#unit-tabs-row').html(tabsHtml);
                    // $page.find('#unit-tabs-row').off('click').on('click', '.unit-tab', function() {
                    //     $page.find('.unit-tab').removeClass('active');
                    //     $(this).addClass('active');
                    //     unit_field.set_value($(this).data('unit'), true);
                    //     trigger_dashboard_reload();
                    // });

                    // ── Scores ───────────────────────────────────────────────
                    let allScores=[], workerScores=[], staffScores=[];
                    data.forEach(d => {
                        let s = parseFloat(d.total_score)||0;
                        allScores.push(s);
                        if (isWorker(d.custom_grade)) workerScores.push(s); else staffScores.push(s);
                    });
                    let total        = allScores.length;
                    let allScored    = allScores.filter(s=>s>0);
                    let workerScored = workerScores.filter(s=>s>0);
                    let staffScored  = staffScores.filter(s=>s>0);
                    let combActual   = buildBellCounts(allScores);
                    let workerActual = buildBellCounts(workerScores);
                    let staffActual  = buildBellCounts(staffScores);
                    let combTarget   = buildTargetCounts(allScored.length);
                    let workerTarget = buildTargetCounts(workerScored.length);
                    let staffTarget  = buildTargetCounts(staffScored.length);
                    let workerNA     = workerScores.length - workerScored.length;
                    let staffNA      = staffScores.length  - staffScored.length;
                    let combNA       = allScores.length    - allScored.length;

                    const bellViewData = {
                        combined: { title:'&#x1F465; Combined — Worker + Staff', color:'#1565C0', target:combTarget,   actual:combActual,   scored:allScored.length,    na:combNA   },
                        worker:   { title:'&#x1F527; Worker — Grades A1 to A4',  color:'#e53935', target:workerTarget, actual:workerActual, scored:workerScored.length, na:workerNA },
                        staff:    { title:'&#x1F4BC; Staff',                      color:'#2d7a4f', target:staffTarget,  actual:staffActual,  scored:staffScored.length,  na:staffNA  }
                    };

                    function switchBellView(view) {
                        currentBellView = view;
                        const d = bellViewData[view];
                        $page.find('#bell-section-title').html(d.title).css('color', d.color);
                        $page.find('#bell-stats-bar').html(`
                            <span>&#x1F534; Target: <strong style="color:#e53935;">${d.target.reduce((a,b)=>a+b,0)}</strong></span>
                            <span style="margin-left:14px;">&#x1F535; Scored: <strong style="color:#1565C0;">${d.scored}</strong></span>
                            <span style="margin-left:14px;color:#aaa;">N/A: <strong>${d.na}</strong></span>
                        `);
                        const btnStyles = {
                            combined: { active:{bg:'#1565C0',color:'#fff',border:'#1565C0'}, inactive:{bg:'#fff',color:'#1565C0',border:'#1565C0'} },
                            worker:   { active:{bg:'#e53935',color:'#fff',border:'#e53935'}, inactive:{bg:'#fff',color:'#e53935',border:'#e53935'} },
                            staff:    { active:{bg:'#2d7a4f',color:'#fff',border:'#2d7a4f'}, inactive:{bg:'#fff',color:'#2d7a4f',border:'#2d7a4f'} }
                        };
                        ['combined','worker','staff'].forEach(v => {
                            const s = v === view ? btnStyles[v].active : btnStyles[v].inactive;
                            $page.find(`#bell-btn-${v}`).css({ background:s.bg, color:s.color, 'border-color':s.border });
                        });
                        renderBellChart($page.find('#bellUnifiedChart')[0], d.target, d.actual);
                        $page.find('#bellUnifiedTable').html(buildBellTable(d.target, d.actual));
                    }

                    // ── 9-box ────────────────────────────────────────────────
                    let boxData = { box1:[],box2:[],box3:[],box4:[],box5:[],box6:[],box7:[],box8:[],box9:[] };
                    data.forEach(emp => {
                        let score = parseFloat(emp.total_score)||0, ws = emp.workflow_state;
                        let perf = score<2.5&&['Accepted','Approved'].includes(ws) ? "poor"
                                 : score<3.5&&['Accepted','Approved'].includes(ws) ? "good"
                                 : score>3.5&&['Accepted','Approved'].includes(ws) ? "outstanding" : "";
                        let pot  = score<2.5&&['Accepted','Approved'].includes(ws) ? "low"
                                 : score<3.5&&['Accepted','Approved'].includes(ws) ? "moderate"
                                 : score>3.5&&['Accepted','Approved'].includes(ws) ? "high" : "";
                        let box = "";
                        if      (perf=="poor"&&pot=="high")        box="box1";
                        else if (perf=="good"&&pot=="high")        box="box2";
                        else if (perf=="outstanding"&&pot=="high") box="box3";
                        else if (perf=="poor"&&pot=="moderate")    box="box4";
                        else if (perf=="good"&&pot=="moderate")    box="box5";
                        else if (perf=="outstanding"&&pot=="moderate") box="box6";
                        else if (perf=="poor"&&pot=="low")         box="box7";
                        else if (perf=="good"&&pot=="low")         box="box8";
                        else if (perf=="outstanding"&&pot=="low")  box="box9";
                        if (box) boxData[box].push(emp.employee);
                    });

                    // ── KPI values ────────────────────────────────────────────
                    let deptVal = unit_field.get_value();
                    $page.find("#total_emp").text(total);
                    $page.find("#total_completed").text(total ? ((totalAll.completed/totalAll.total)*100).toFixed(0)+"%" : "0%");
                    $page.find("#kpi-completed-sub").html(`Completed (${totalAll.completed}) ${ii('total_completed','muted')}`);
                    $page.find("#total_pending").text(total ? ((totalAll.pending/totalAll.total)*100).toFixed(0)+"%" : "0%");
                    $page.find("#kpi-pending-sub").html(`Pending (${totalAll.pending}) ${ii('total_pending','muted')}`);
                    $page.find("#total_overdue").text(total ? ((totalAll.overdue/totalAll.total)*100).toFixed(0)+"%" : "0%");
                    $page.find("#kpi-overdue-sub").html(`Overdue (${totalAll.overdue}) ${ii('total_overdue','muted')}`);
                    $page.find("#top_perf").text(boxData.box3.length + boxData.box6.length + boxData.box9.length);
                    $page.find("#low_perf").text(boxData.box1.length + boxData.box4.length + boxData.box7.length);

                    function openAppraisalList(extraFilters) {
                        let period  = getHalfYearPeriod();
                        let filters = { start_date:["between",[period.start_date, period.end_date]] };
                        if (deptVal) filters["custom_unit"] = deptVal;
                        (extraFilters||[]).forEach(f => { filters[f[0]] = [f[1], f[2]]; });
                        if (!filters["docstatus"]) filters["docstatus"] = ["in",[0,1]];
                        frappe.open_in_new_tab = true;
                        frappe.set_route("List","Appraisal", filters);
                    }
                    function bindCard(id, extraFilters) {
                        $page.find("#"+id).off("click").on("click", function(e) {
                            if ($(e.target).hasClass('ii')) return;
                            openAppraisalList(extraFilters);
                        }).css({ cursor:"pointer" });
                    }
                    bindCard("card_total_emp", [["docstatus","in",[0,1]]]);
                    bindCard("card_completed", [["workflow_state","in",["Approved","Accepted"]]]);
                    bindCard("card_pending",   [["workflow_state","=","Draft"]]);
                    bindCard("card_overdue",   [["custom_appraisal_status","=","Overdue"]]);
                    bindCard("card_top_perf",  [["total_score",">",3.5],["workflow_state","in",["Approved","Accepted"]]]);
                    bindCard("card_low_perf",  [["total_score","<",2.5],["workflow_state","in",["Approved","Accepted"]]]);

                    // ── Build table rows + chart data ──────────────────────────
                    let deptNames=[], completedNums=[], pendingNums=[], overdueNums=[];
                    let tableRows = "";
                    Object.keys(tableData).forEach(dept => {
                        let d    = tableData[dept];
                        let comp = d.total ? Math.round((d.completed/d.total)*100) : 0;
                        deptNames.push(dept);
                        completedNums.push(d.completed);
                        pendingNums.push(d.pending);
                        overdueNums.push(d.overdue);
                        let barColor = comp > 70 ? '#28a745' : comp > 40 ? '#ffc107' : '#dc3545';
                        tableRows += `<tr>
                            <td style="font-weight:600;color:#1a2332;">${dept}</td>
                            <td style="text-align:center;">${d.total}</td>
                            <td style="text-align:center;">${d.completed}</td>
                            <td style="text-align:center;">${d.pending}</td>
                            <td style="text-align:center;">${d.overdue}</td>
                            <td>
                                <div class="progress-bar-wrap">
                                    <div class="progress-bar-bg">
                                        <div class="progress-bar-fill" style="width:${comp}%;background:${barColor};"></div>
                                    </div>
                                    <span class="progress-pct" style="color:${barColor};">${comp}%</span>
                                </div>
                            </td>
                        </tr>`;
                    });

                    // ── Completion section HTML ────────────────────────────────
                    let completionBody = `
<div class="chart-grid-2col">
  
  <div>
  <div class="chart-label">Staff Performance Appraisal Status</div>
    <div style="border-radius:8px;border:1px solid #e8eaf0;overflow:hidden;">
  <table class="appr-table">
    <thead>
      <tr>
        <th>Unit ${ii('col_unit','light')}</th>
        <th>Total ${ii('col_total_due','light')}</th>
        <th>Completed ${ii('col_completed_pct','light')}</th>
        <th>Pending ${ii('col_pending_pct','light')}</th>
        <th>Overdue ${ii('col_overdue_pct','light')}</th>
        <th>Progress ${ii('col_progress','light')}</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>
</div>
  </div>
  <div>
    <div class="chart-label">📊 Appraisal Completion Status</div>
    <div style="position:relative;height:220px;">
      <canvas id="completionDonutChart"></canvas>
    </div>
    <div class="chart-legend" style="margin-top:10px;">
      <span><span class="chart-legend-dot" style="background:#28a745;"></span>Completed</span>
      <span><span class="chart-legend-dot" style="background:#ffc107;"></span>Pending</span>
      <span><span class="chart-legend-dot" style="background:#dc3545;"></span>Overdue</span>
    </div>
  </div>
</div>
`;

                    // ── Bell section HTML ──────────────────────────────────────
                    let bellBody = `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px;">
  <div style="font-size:13px;font-weight:700;" id="bell-section-title"></div>
  <div class="bell-toggle-group">
    <button id="bell-btn-combined" class="bell-toggle-btn">&#x1F465; Combined</button>
    <button id="bell-btn-worker"   class="bell-toggle-btn">&#x1F527; Worker</button>
    <button id="bell-btn-staff"    class="bell-toggle-btn">&#x1F4BC; Staff</button>
  </div>
</div>
<div id="bell-stats-bar" style="display:flex;gap:14px;font-size:12px;color:#777;margin-bottom:14px;flex-wrap:wrap;align-items:center;"></div>
<div style="position:relative;width:100%;height:min(40vw,420px);min-height:220px;">
  <canvas id="bellUnifiedChart"></canvas>
</div>
<div id="bellUnifiedTable"></div>`;

                    // ── Trend dates ────────────────────────────────────────────
                    let dateWise = {};
                        data.forEach(d => {
                            let dt = (d.custom_submitted_date || d.custom_rollout_date || d.start_date || '').split(' ')[0];
                            if (!dt) return;
                            if (!dateWise[dt]) dateWise[dt] = { completed:0, pending:0, overdue:0 };
                            if (['Approved','Accepted'].includes(d.workflow_state)) dateWise[dt].completed++;
                            else dateWise[dt].pending++;
                            if (d.custom_appraisal_status === 'Overdue') dateWise[dt].overdue++;
                        });
                        let trendDates      = Object.keys(dateWise).sort();
                        let completedCounts = trendDates.map(d => dateWise[d].completed);
                        let pendingCounts   = trendDates.map(d => dateWise[d].pending);
                        let overdueCounts   = trendDates.map(d => dateWise[d].overdue);

                    let trendBody = `
                        <div style="position:relative;width:100%;height:300px;">
                            <canvas id="appraisalTrendChart"></canvas>
                        </div>`;

                    // ── Aging ──────────────────────────────────────────────────
                    let today = frappe.datetime.now_date();
                    function daysDiff(dateStr) {
                        if (!dateStr) return 0;
                        return Math.max(0, Math.floor((new Date(today) - new Date(dateStr)) / 86400000));
                    }
                    function agingBadge(days) {
                        if (days > 60) return `<span class="badge badge-critical">Critical (${days}d)</span>`;
                        if (days > 30) return `<span class="badge badge-warning"> Warning (${days}d)</span>`;
                        return `<span class="badge badge-active"> Active (${days}d)</span>`;
                    }
                    let agingRows = data
                        .filter(d => !['Approved','Accepted'].includes(d.workflow_state))
                        .map(d => ({
                            name:  d.employee_name||d.employee, emp_id: d.employee,
                            unit:  d.custom_unit||'—', grade: d.custom_grade||'—',
                            start: d.custom_rollout_date ? frappe.datetime.str_to_user(d.custom_rollout_date) : '—',
                            days:  daysDiff(d.custom_rollout_date),
                            status: d.workflow_state||'Draft',
                            appr:   d.name
                        })).sort((a, b) => b.days - a.days);

                    let agingKpis = `
                        <div class="mini-stats-row">
                        <div class="mini-stat" style="background:#FDEBEC;border-top:3px solid #C8102E;">
                            <div class="mini-stat-val" style="color:#C8102E;">${agingRows.filter(r=>r.days>60).length}</div>
                            <div class="mini-stat-label">Critical (&gt;60 days) ${ii('aging_critical','dark')}</div>
                        </div>

                        <div class="mini-stat" style="background:#FFF8E1;border-top:3px solid #FFC107;">
                            <div class="mini-stat-val" style="color:#B28704;">${agingRows.filter(r=>r.days>30&&r.days<=60).length}</div>
                            <div class="mini-stat-label">Warning (31–60 days) ${ii('aging_warning','dark')}</div>
                        </div>

                        <div class="mini-stat" style="background:#FFFDE7;border-top:3px solid #FFEE58;">
                            <div class="mini-stat-val" style="color:#C0A800;">${agingRows.filter(r=>r.days<=30).length}</div>
                            <div class="mini-stat-label">Active (&#x2264;30 days) ${ii('aging_active','dark')}</div>
                        </div>
                        </div>`;

                    let agingTableRows = agingRows.map(r => [
                        `<span style="font-weight:600;">${r.name}</span><br><span style="font-size:11px;color:#888;">${r.emp_id}</span>`,
                        r.unit, r.grade, r.start,
                        agingBadge(r.days),
                        `<span class="badge badge-state">${r.status}</span>`,
                        `<a href="/app/appraisal/${r.appr}" target="_blank" style="color:#1a2332;font-size:11px;font-weight:600;text-decoration:none;">View &#8594;</a>`
                    ]);
                    let agingCols = [
                        `Employee ${ii('aging_col_employee','light')}`,
                        `Unit ${ii('col_unit','light')}`,
                        `Grade`,
                        `Rollout Date ${ii('aging_col_rollout','light')}`,
                        `Aging ${ii('aging_col_aging','light')}`,
                        `Status ${ii('aging_col_status','light')}`,
                        'Action'
                    ];
                    let agingBody = `${agingKpis}<div id="aging-table-container"></div>`;

                    // ── High Perf ──────────────────────────────────────────────
                    let highPerfData = data
                        .filter(d => parseFloat(d.total_score) >= 3.5)
                        .sort((a,b) => parseFloat(b.total_score) - parseFloat(a.total_score));

                    function scoreBadge(score) {
                        let v  = parseFloat(score)||0;
                        let color = v>=4.5 ? '#155724' : v>=4.0 ? '#1565C0' : '#2d7a4f';
                        let bg    = v>=4.5 ? '#d4edda' : v>=4.0 ? '#e3f2fd' : '#e8f5e9';
                        return `<span style="background:${bg};color:${color};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${v.toFixed(2)}</span>`;
                    }
                    function rankBadge(i) {
                        if (i===0) return `<span style="background:#f4a100;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">&#x1F947; 1</span>`;
                        if (i===1) return `<span style="background:#9e9e9e;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">&#x1F948; 2</span>`;
                        if (i===2) return `<span style="background:#a0522d;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">&#x1F949; 3</span>`;
                        return `<span style="color:#555;font-size:11px;font-weight:600;">${i+1}</span>`;
                    }
                    let highPerfRows = highPerfData.map((d, i) => [
                        rankBadge(i),
                        `<span style="font-size:11px;color:#888;">${d.employee}</span>`,
                        `<span style="font-weight:600;">${d.employee_name||d.employee}</span>`,
                        d.custom_unit||'—', d.custom_grade||'—',
                        scoreBadge(d.total_score),
                        `<span style="background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${parseFloat(d.total_score)>=4.5?'&#x2B50; Exceptional':parseFloat(d.total_score)>=4.0?'&#x1F31F; Excellent':'&#x2705; Strong'}</span>`,
                        `<a href="/app/appraisal/${d.name}" target="_blank" style="color:#1a2332;font-size:11px;font-weight:600;text-decoration:none;">View &#8594;</a>`
                    ]);
                    let highPerfCols = ['#', `Employee ${ii('aging_col_employee','light')}`, 'Name', `Unit ${ii('col_unit','light')}`, 'Grade', `Score ${ii('hp_col_score','light')}`, `Band ${ii('hp_col_band','light')}`, 'Action'];
                    let highPerfBody = `
<div class="mini-stats-row">
  <div class="mini-stat" style="background:#e3f2fd;border-top:3px solid #1565C0;">
    <div class="mini-stat-val" style="color:#1565C0;">${highPerfData.filter(d=>parseFloat(d.total_score)>=4.5).length}</div>
    <div class="mini-stat-label">Exceptional (&#x2265;4.5) ${ii('hp_exceptional','dark')}</div>
  </div>
  <div class="mini-stat" style="background:#e8f5e9;border-top:3px solid #28a745;">
    <div class="mini-stat-val" style="color:#28a745;">${highPerfData.filter(d=>parseFloat(d.total_score)>=4.0&&parseFloat(d.total_score)<4.5).length}</div>
    <div class="mini-stat-label">Excellent (4.0–4.5) ${ii('hp_excellent','dark')}</div>
  </div>
  <div class="mini-stat" style="background:#f3e5f5;border-top:3px solid #6a1b9a;">
    <div class="mini-stat-val" style="color:#6a1b9a;">${highPerfData.filter(d=>parseFloat(d.total_score)>=3.5&&parseFloat(d.total_score)<4.0).length}</div>
    <div class="mini-stat-label">Strong (3.5–4.0) ${ii('hp_strong','dark')}</div>
  </div>
</div>
<div id="high-perf-table"></div>`;

                    // ── Low Perf ───────────────────────────────────────────────
                    let lowPerfData = data
                        .filter(d => parseFloat(d.total_score)>0 && parseFloat(d.total_score)<2.5)
                        .sort((a,b) => parseFloat(a.total_score) - parseFloat(b.total_score));

                    function lowScoreBadge(score) {
                        let v     = parseFloat(score)||0;
                        let color = v<=1.5 ? '#7f0718' : '#856404';
                        let bg    = v<=1.5 ? '#fce8ec' : '#fff3cd';
                        return `<span style="background:${bg};color:${color};padding:2px 10px;border-radius:10px;font-size:11px;font-weight:700;">${v.toFixed(2)}</span>`;
                    }
                    function pipBadge(score) {
                        let v = parseFloat(score)||0;
                        if (v <= 1.5) return `<span class="badge badge-critical">&#x1F534; Immediate PIP</span>`;
                        if (v <= 2.0) return `<span class="badge badge-warning">&#x1F7E1; Review Required</span>`;
                        return `<span class="badge badge-state">&#x1F535; Monitor</span>`;
                    }
                    let lowPerfRows = lowPerfData.map((d, i) => [
                        `<span style="color:#555;font-size:11px;font-weight:600;">${i+1}</span>`,
                        `<span style="font-size:11px;color:#888;">${d.employee}</span>`,
                        `<span style="font-weight:600;">${d.employee_name||d.employee}</span>`,
                        d.custom_unit||'—', d.custom_grade||'—',
                        lowScoreBadge(d.total_score), pipBadge(d.total_score),
                        `<a href="/app/appraisal/${d.name}" target="_blank" style="color:#1a2332;font-size:11px;font-weight:600;text-decoration:none;">View &#8594;</a>`
                    ]);
                    let lowPerfCols = ['#', `Employee ${ii('aging_col_employee','light')}`, 'Name', `Unit ${ii('col_unit','light')}`, 'Grade', `Score ${ii('hp_col_score','light')}`, `PIP Flag ${ii('lp_col_pip','light')}`, 'Action'];
                    let lowPerfBody = `
<div class="mini-stats-row">
  <div class="mini-stat" style="background:#fce8ec;border-top:3px solid #dc3545;">
    <div class="mini-stat-val" style="color:#dc3545;">${lowPerfData.filter(d=>parseFloat(d.total_score)<=1.5).length}</div>
    <div class="mini-stat-label">Immediate PIP (&#x2264;1.5) ${ii('lp_pip','dark')}</div>
  </div>
  <div class="mini-stat" style="background:#fff3cd;border-top:3px solid #ffc107;">
    <div class="mini-stat-val" style="color:#856404;">${lowPerfData.filter(d=>parseFloat(d.total_score)>1.5&&parseFloat(d.total_score)<=2.0).length}</div>
    <div class="mini-stat-label">Review Required (1.5–2.0) ${ii('lp_review','dark')}</div>
  </div>
  <div class="mini-stat" style="background:#e8eaf6;border-top:3px solid #3949ab;">
    <div class="mini-stat-val" style="color:#3949ab;">${lowPerfData.filter(d=>parseFloat(d.total_score)>2.0&&parseFloat(d.total_score)<2.5).length}</div>
    <div class="mini-stat-label">Monitor (2.0–2.5) ${ii('lp_monitor','dark')}</div>
  </div>
</div>
<div id="low-perf-table"></div>`;

                    // ── Assemble sections ──────────────────────────────────────
                    let htmlBuffer = '';

                    htmlBuffer += sectionWrap(
                        'completion', '📋',
                        'Completion Status — ' + (unit_field.get_value() || 'All Units'),
                        `Overview of appraisal completion for <strong>${unit_field.get_value() || 'All Units'}</strong>. Tracks completed, pending, and overdue appraisals across all departments.`,
                        'section_status_table', completionBody,
                        aiCard('btn-ai-donut','ai-content-donut','Click Generate Insight for completion rate analysis.')
                    );
                    htmlBuffer += sectionWrap(
                        'bell', '📊', 'Bell Curve Distribution',
                        'Compares actual performance score distribution against the forced-ranking target curve.',
                        'section_bell', bellBody,
                        aiCard('btn-ai-bell','ai-content-bell','Click Generate Insight to check for manager bias.')
                    );
                    htmlBuffer += sectionWrap(
                        'trend', '📈', 'Daily Appraisal Completion Trend',
                        'Time-series of daily completions, pending submissions, and overdue flags.',
                        'section_trend', trendBody,
                        aiCard('btn-ai-trend','ai-content-trend','Click Generate Insight for trend analysis.')
                    );
                    htmlBuffer += sectionWrap(
                        'aging', '⏱',
                        `Appraisal Aging Report <span style="background:rgba(26,35,50,0.08);padding:1px 8px;border-radius:10px;font-size:11px;margin-left:4px;">${agingRows.length} pending</span>`,
                        'Pending appraisals ranked by days open since rollout. Identifies bottlenecks and escalation needs.',
                        'section_aging', agingBody,
                        aiCard('btn-ai-ageing','ai-content-ageing','Click Generate Insight for ageing bottleneck analysis.')
                    );
                    htmlBuffer += sectionWrap(
                        'high_perf', '🏆',
                        `High Performer Tracker <span style="background:rgba(26,35,50,0.08);padding:1px 8px;border-radius:10px;font-size:11px;margin-left:4px;">${highPerfData.length} employees</span>`,
                        'Employees scoring 3.5+ in finalized appraisals — ranked highest to lowest.',
                        'section_high_perf', highPerfBody,
                        aiCard('btn-ai-high-performance','ai-content-high-performance','Click Generate Insight for high performance analysis.')
                    );
                    htmlBuffer += sectionWrap(
                        'low_perf', '📉',
                        `Low Performer Tracker <span style="background:rgba(220,53,69,0.1);padding:1px 8px;border-radius:10px;font-size:11px;margin-left:4px;">${lowPerfData.length} employees</span>`,
                        'Employees scoring below 2.5 — PIP candidates ranked lowest to highest.',
                        'section_low_perf', lowPerfBody,
                        aiCard('btn-ai-low-performance','ai-content-low-performance','Click Generate Insight for low performance analysis.')
                    );

                    $page.find("#dashboard-content").html(htmlBuffer);

                    // ── Render paginated tables ────────────────────────────────
                    buildPaginatedTable('aging-table-container', agingTableRows, agingCols);
                    buildPaginatedTable('high-perf-table',       highPerfRows,   highPerfCols);
                    buildPaginatedTable('low-perf-table',        lowPerfRows,    lowPerfCols);

                    // ── Charts ─────────────────────────────────────────────────
                    // Donut
                    if (completionDonutChart) completionDonutChart.destroy();
                    const ctxDonut = $page.find('#completionDonutChart')[0];
                    const totals   = totalAll.completed + totalAll.pending + totalAll.overdue;
                    completionDonutChart = new Chart(ctxDonut, {
                        type: 'doughnut',
                        data: {
                            labels: ['Completed','Pending','Overdue'],
                            datasets: [{ data:[totalAll.completed, totalAll.pending, totalAll.overdue], backgroundColor:['#28a745','#ffc107','#dc3545'], borderColor:'#ffffff', borderWidth:3 }]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false, cutout: '62%',
                            plugins: {
                                legend: { display:false },
                                tooltip: { callbacks:{ label: function(ctx) {
                                    let v=ctx.raw, pct=totals?((v/totals)*100).toFixed(0):0;
                                    return `${ctx.label}: ${v} (${pct}%)`;
                                }}}
                            }
                        },
                        plugins: [{ id:'donutPct', afterDraw(chart) {
                            const { ctx } = chart;
                            const ds   = chart.data.datasets[0];
                            const meta = chart.getDatasetMeta(0);
                            const tot  = ds.data.reduce((a,b)=>a+b,0);
                            ctx.save(); ctx.font='bold 13px DM Sans,Arial'; ctx.fillStyle='#1a2332'; ctx.textAlign='center'; ctx.textBaseline='middle';
                            meta.data.forEach((arc, idx) => {
                                const v = ds.data[idx]; if (v === 0) return;
                                const pct   = tot ? ((v/tot)*100).toFixed(0)+'%' : '0%';
                                const angle = (arc.startAngle + arc.endAngle) / 2;
                                const x     = arc.x + Math.cos(angle) * (arc.outerRadius * 0.65);
                                const y     = arc.y + Math.sin(angle) * (arc.outerRadius * 0.65);
                                ctx.fillText(pct, x, y);
                            });
                            ctx.restore();
                        }}]
                    });

                    // Bar
                    if (deptBarChart) deptBarChart.destroy();
                    const ctxBar = $page.find('#deptBarChart')[0];
                    deptBarChart = new Chart(ctxBar, {
                        type: 'bar',
                        data: {
                            labels: deptNames,
                            datasets: [
                                { label:'Completed', data:completedNums, backgroundColor:'#28a745' },
                                { label:'Pending',   data:pendingNums,   backgroundColor:'#ffc107' },
                                { label:'Overdue',   data:overdueNums,   backgroundColor:'#dc3545' }
                            ]
                        },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            scales: {
                                y: { beginAtZero:true, grid:{ color:'rgba(0,0,0,0.05)' }, ticks:{ font:{ size:11 } } },
                                x: { grid:{ display:false }, ticks:{ font:{ size:11 } } }
                            },
                            plugins: { legend:{ position:'bottom', labels:{ font:{ size:11 }, padding:14 } } }
                        }
                    });

                    // Trend
                    if (trendChart) trendChart.destroy();

                    function initTrendChart() {
    const ctxTrend = $page.find("#appraisalTrendChart")[0];
    if (!ctxTrend) return;

    if (!trendDates.length) {
        $(ctxTrend).parent().html(`
            <div style="display:flex;align-items:center;justify-content:center;
                        height:300px;color:#aaa;font-size:13px;">
                No trend data available for the selected period.
            </div>`);
        return;
    }

    ctxTrend.width  = $page.find("#appraisalTrendChart").parent().width() || 600;
    ctxTrend.height = 300;

    if (trendChart) trendChart.destroy();

    // ── inline data label plugin (same as bell curve) ──────────────────
    const trendLabelPlugin = {
        id: 'trendLabelPlugin',
        afterDatasetsDraw(chart) {
            const { ctx } = chart;
            chart.data.datasets.forEach((dataset, di) => {
                const meta = chart.getDatasetMeta(di);
                if (meta.hidden) return;
                meta.data.forEach((point, idx) => {
                    const value = dataset.data[idx];
                    if (value === null || value === undefined || value === 0) return;
                    const { x, y } = point.getProps(['x', 'y'], true);
                    ctx.save();
                    ctx.font         = 'bold 11px DM Sans,Arial';
                    ctx.fillStyle    = dataset.borderColor;
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(value, x, y - 6);
                    ctx.restore();
                });
            });
        }
    };

    trendChart = new Chart(ctxTrend, {
        type: "line",
        data: {
            labels: trendDates,
            datasets: [
                {
                    label: "Completed",
                    data: completedCounts,
                    borderColor: "#28a745",
                    backgroundColor: "rgba(40,167,69,0.1)",
                    tension: 0.4, fill: true,
                    pointRadius: 5, pointHoverRadius: 7,
                    pointBackgroundColor: "#28a745"
                },
                {
                    label: "Pending",
                    data: pendingCounts,
                    borderColor: "#ffc107",
                    backgroundColor: "rgba(255,193,7,0.1)",
                    tension: 0.4, fill: true,
                    pointRadius: 5, pointHoverRadius: 7,
                    pointBackgroundColor: "#ffc107"
                },
                {
                    label: "Overdue",
                    data: overdueCounts,
                    borderColor: "#dc3545",
                    backgroundColor: "rgba(220,53,69,0.1)",
                    tension: 0.4, fill: true,
                    pointRadius: 5, pointHoverRadius: 7,
                    pointBackgroundColor: "#dc3545"
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { top: 24, bottom: 4, left: 4, right: 4 }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        font: { size: 11, weight: 'bold' },
                        padding: 20,
                        color: '#222'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.raw}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { font: { size: 11 }, precision: 0 }
                },
                x: {
    grid: { display: false },
    ticks: {
        font: { size: 11 },
        maxRotation: 45,
        minRotation: 30,
        callback: function(value, index) {
            let raw = trendDates[index];
            if (!raw) return value;
            let parts = raw.split('-');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
            return value;
        }
    }
}
            }
        },
        plugins: [trendLabelPlugin]   // ← same approach as bell curve
    });
}

                    // Wait for DOM paint + Frappe layout to fully settle before drawing
                    setTimeout(() => initTrendChart(), 300);
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                if (trendChart) {
                                    trendChart.resize();
                                    trendChart.update('none'); // 'none' skips animation, forces immediate redraw
                                }
                            }, 400);
                        });
                    });
                    // ── Section toggles ────────────────────────────────────────
                    $page.find('.appr-section-header').off('click').on('click', function(e) {
                        if ($(e.target).hasClass('ii')) return;
                        let $header = $(this);
                        let $body   = $header.next('.appr-section-body');
                        $header.toggleClass('open');
                        $body.toggleClass('open').slideToggle(250);
                    });

                    // ── Bell toggles ───────────────────────────────────────────
                    $page.find('#bell-btn-combined').off('click').on('click', () => switchBellView('combined'));
                    $page.find('#bell-btn-worker').off('click').on('click',   () => switchBellView('worker'));
                    $page.find('#bell-btn-staff').off('click').on('click',    () => switchBellView('staff'));
                    switchBellView('combined');

                    // ── AI buttons ─────────────────────────────────────────────
                    $page.find('#btn-ai-donut').on('click', function() {
                        fetch_ai_insights(this,'ai-content-donut','completion_status',{ total:totalAll.total, completed:totalAll.completed, pending:totalAll.pending, overdue:totalAll.overdue });
                    });
                    $page.find('#btn-ai-bell').on('click', function() {
                        fetch_ai_insights(this,'ai-content-bell','bell_curve',{
                            categories:["A (Excellent)","B (Very Good)","C (Good)","D (Acceptable)","E (Poor)"],
                            worker:  { target:workerTarget, actual:workerActual, total:workerScored.length },
                            staff:   { target:staffTarget,  actual:staffActual,  total:staffScored.length  },
                            combined:{ target:combTarget,   actual:combActual,   total:allScored.length    },
                            target_percentages:["10%","20%","50%","15%","5%"]
                        });
                    });
                    $page.find('#btn-ai-ageing').on('click', function() {
                        fetch_ai_insights(this,'ai-content-ageing','ageing_insights', getAgeingInsightsData(rawData));
                    });
                    $page.find('#btn-ai-trend').on('click', function() {
                        fetch_ai_insights(this,'ai-content-trend','daily_trend',{ dates:trendDates, completed:completedCounts, pending:pendingCounts, overdue:overdueCounts });
                    });
                    $page.find('#btn-ai-high-performance').on('click', function() {
                        fetch_ai_insights(this,'ai-content-high-performance','high_performance_insights', highPerfData);
                    });
                    $page.find('#btn-ai-low-performance').on('click', function() {
                        fetch_ai_insights(this,'ai-content-low-performance','low_performance_insights', lowPerfData);
                    });

                    // ── Raw data store ─────────────────────────────────────────
                    dashboard_raw_data = {
                        total_employees:      total,
                        completion_rate:      totalAll,
                        rating_distribution:  { combined:combActual, worker:workerActual, staff:staffActual },
                        trend_velocity:       completedCounts
                    };

                    apply_report_type_filter();

                } // end callback
            }); // end frappe.call
        } // end load_dashboard

        setTimeout(() => load_dashboard(), 500);

    } // end init_dashboard
};