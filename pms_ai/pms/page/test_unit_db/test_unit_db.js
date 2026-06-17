frappe.pages['test-unit-db'].on_page_load = function(wrapper) {
    let WORKER_GRADES = ['A1', 'A2', 'A3', 'A4'];
    
    const dataLabelPlugin = {
    id: 'dataLabelPlugin',
    afterDatasetsDraw(chart) {
        const { ctx, chartArea } = chart;
        if (!chartArea) return;

        const isStackedY = chart.config.options?.scales?.y?.stacked === true;
        const isStackedX = chart.config.options?.scales?.x?.stacked === true;
        const isStacked  = isStackedY || isStackedX;
        const isHoriz    = chart.config.options?.indexAxis === 'y';
        const chartType  = chart.config.type;

        function resolveColor(ds, idx) {
            let c = Array.isArray(ds.backgroundColor)
                ? ds.backgroundColor[idx]
                : ds.backgroundColor;
            if (!c || c === 'transparent' || (typeof c === 'string' && c.startsWith('rgba'))) {
                c = Array.isArray(ds.borderColor) ? ds.borderColor[idx] : ds.borderColor;
            }
            return c || '#333';
        }

        function contrastText(bg) {
            if (!bg) return '#333';
            let r = 0, g = 0, b = 0;
            if (bg.startsWith('#')) {
                let hex = bg.replace('#', '');
                if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                b = parseInt(hex.substring(4, 6), 16);
            } else if (bg.startsWith('rgb')) {
                let m = bg.match(/[\d.]+/g) || [];
                r = +m[0] || 0; g = +m[1] || 0; b = +m[2] || 0;
            }
            return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#333333' : '#ffffff';
        }

        chart.data.datasets.forEach((ds, di) => {
            const meta = chart.getDatasetMeta(di);
            if (meta.hidden) return;

            const isReferenceLine = ds.pointRadius === 0 && ds.borderDash && ds.borderDash.length > 0;
            const dsType = ds.type || chartType; // ← per-dataset type

            meta.data.forEach((bar, idx) => {
                const raw = ds.data[idx];
                if (raw === null || raw === undefined || raw === '') return;
                if (typeof raw === 'object' && !Array.isArray(raw)) return;

                const numVal = parseFloat(raw);
                if (isNaN(numVal)) return;

                // ── Doughnut / pie ──────────────────────────────────────────
                if (chartType === 'doughnut' || chartType === 'pie') {
                    const total = ds.data.reduce((a, b) => (parseFloat(b) || 0) + (a || 0), 0);
                    const pct   = total ? Math.round((numVal / total) * 100) : 0;
                    if (pct < 5) return;
                    const angle = (bar.startAngle + bar.endAngle) / 2;
                    const r2    = (bar.innerRadius + bar.outerRadius) / 2;
                    const lx    = bar.x + Math.cos(angle) * r2;
                    const ly    = bar.y + Math.sin(angle) * r2;
                    const elColor = resolveColor(ds, idx);
                    ctx.save();
                    ctx.font         = 'bold 9px Inter, sans-serif';
                    ctx.fillStyle    = contrastText(elColor);
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${numVal} (${pct}%)`, lx, ly);
                    ctx.restore();
                    return;
                }

                // ── Line dataset (pure line chart OR mixed line-in-bar) ─────
                if (dsType === 'line') {
                    // if (isReferenceLine) return; // skip dashed reference lines
                    if (Math.abs(numVal) < 0.001) return;

                    const { x, y } = bar.getProps(['x', 'y'], true);
                    const lineColor = (typeof ds.borderColor === 'string' && ds.borderColor)
                        ? ds.borderColor
                        : '#333';

                    const displayVal = Number.isInteger(numVal)
                        ? String(numVal)
                        : numVal.toFixed(2);

                    ctx.save();
                    ctx.font         = 'bold 10px Inter, sans-serif';
                    ctx.fillStyle    = lineColor;
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText(displayVal, x, y - 6); // above the point
                    ctx.restore();
                    return;
                }

                // ── Stacked bar ─────────────────────────────────────────────
                if (isStacked && (chartType === 'bar' || chartType === 'horizontalBar')) {
                    if (!numVal || Math.abs(numVal) < 0.001) return;

                    const segMidY  = isHoriz ? bar.y : (bar.base + bar.y) / 2;
                    const segMidX  = isHoriz ? (bar.base + bar.x) / 2 : bar.x;
                    const elColor  = resolveColor(ds, idx);
                    const txtColor = contrastText(elColor);

                    ctx.save();
                    ctx.font         = 'bold 10px Inter, sans-serif';
                    ctx.fillStyle    = txtColor;
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(numVal, segMidX, segMidY);
                    ctx.restore();
                    return;
                }

                // ── Non-stacked bar ─────────────────────────────────────────
                // ── Non-stacked bar ─────────────────────────────────────────
if (!isStacked && (chartType === 'bar' || chartType === 'horizontalBar')) {
    if (!numVal || Math.abs(numVal) < 0.001) return;

    const elColor = Array.isArray(ds.backgroundColor)
        ? ds.backgroundColor[idx]
        : ds.backgroundColor;

    const labelColor = (typeof elColor === 'string' && elColor !== 'transparent' && !elColor.startsWith('rgba'))
        ? elColor
        : (typeof ds.borderColor === 'string' ? ds.borderColor : '#333');

    // ── build label: "5 (25%)" if countData exists, else just "25%" ──
    const count = ds.countData ? ds.countData[idx] : null;
    const displayLabel = count !== null
        ? `${count} (${numVal}%)`   // ← "5 (25%)"
        : numVal + '%';

    ctx.save();
    ctx.font = 'bold 10px Inter, sans-serif';

    if (isHoriz) {
        const barEnd = bar.x;
        const barW   = Math.abs(bar.x - bar.base);

        if (barW < 30) {
            ctx.textAlign    = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = labelColor;
            ctx.fillText(numVal, barEnd + 5, bar.y);
        } else {
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = contrastText(elColor);
            ctx.fillText(numVal, bar.base + barW / 2, bar.y);
        }
    } else {
if (['ud-ae2-overview-bar', 'ud-ae2-len-bar','ud-ar-unit-bar','ud-leniency-bar'].includes(chart.canvas.id)) {  
              const barTop    = bar.y;                    // top of the bar (smaller Y value)
    const barBottom = chartArea.bottom;         // ← use chartArea bottom instead of bar.base
    const barMidY   = barTop + (barBottom - barTop) / 2;

    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle    = contrastText(elColor);
    ctx.font         = 'bold 11px Inter, sans-serif';
    ctx.fillText(numVal, bar.x, barMidY);
        } else {
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle    = labelColor;
            ctx.fillText(numVal, bar.x, bar.y - 2);
        }
    }

    ctx.restore();
    return;
}
            });
        });
    }
};
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Unit Appraisal Dashboard',
        single_column: true,
        make_sidebar: null
    });

    page.add_inner_button('📄 Export PDF', function () {
        export_pdf();
    });
    $('head').append(`<style id="ud-promo-styles">
    .ai-insight-card {
        background-color: #f8f9fa;
        border: 1px solid #e2e5ec;
        border-left: 4px solid #2e86c1;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 18px rgba(0,0,0,0.04);
        margin: 15px;

    }

    .ai-header {
        padding: 18px 22px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #edf2f7;
    }

    .ai-header {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .ai-icon {
        width: 38px;
        height: 38px;
        background: #eff6ff;
        border-radius: 12px;
        display:flex;
        align-items:center;
        justify-content:center;
    }

    .ai-header h4 {
        margin: 0;
        color:#2e86c1;
        font-size:18px;
        font-weight:600;
    }

    .ai-header p {
        margin:4px 0 0;
        color:#64748b;
        font-size:13px;
    }

    #btn-ai-distribution {
        background:#111827;
        color:white;
        border:none;
        padding:5px 10px;
        border-radius:10px;
        cursor:pointer;
        font-weight:600;
    }

    .ai-body {
        padding-left:25px;
        padding-right: 25px;
        padding-top: 15px;
        padding-bottom: 15px;
    }

    .empty-state {
        text-align:center;
        color:#64748b;
    }

    .empty-icon {
        font-size:34px;
        margin-bottom:10px;
    }

    .empty-state h4 {
        color:#334155;
        margin-bottom:6px;
    }
    .ai-card-header { display: flex;}
    .ud-promo-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
    .ud-promo-kpi  { background:#fff; border-radius:8px; padding:12px 14px; text-align:center;
                     border-top:3px solid #dee2e6; box-shadow:0 1px 6px rgba(0,0,0,.05); }
    .ud-promo-kpi .pkv2 { font-size:22px; font-weight:700; line-height:1.1; }
    .ud-promo-kpi .pkl2 { font-size:10px; font-weight:600; color:#868e96;
                           text-transform:uppercase; letter-spacing:1px; margin-top:3px; }
    .ud-promo-kpi.pp-gold   { border-top-color:#28a745; } .ud-promo-kpi.pp-gold   .pkv2 { color:#28a745; }
    .ud-promo-kpi.pp-navy   { border-top-color:#ffc107; } .ud-promo-kpi.pp-navy   .pkv2 { color:#ffc107; }
    .ud-promo-kpi.pp-green  { border-top-color:#AED581; } .ud-promo-kpi.pp-green  .pkv2 { color:#AED581; }
    .ud-promo-kpi.pp-orange  { border-top-color:#ff922b; } .ud-promo-kpi.pp-orange  .pkv2 { color:#ff922b; }
    .ud-promo-kpi.pp-red    { border-top-color:#C8102E; } .ud-promo-kpi.pp-red    .pkv2 { color:#C8102E; }
    .ud-promo-kpi.pp-purple { border-top-color:#7b1fa2; } .ud-promo-kpi.pp-purple .pkv2 { color:#7b1fa2; }
    .ud-promo-kpi.pp-teal   { border-top-color:#00796b; } .ud-promo-kpi.pp-teal   .pkv2 { color:#00796b; }

    .ud-promo-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
    .ud-promo-tab  {
        padding:6px 16px; border-radius:20px; font-size:11px; font-weight:700;
        cursor:pointer; border:2px solid #dee2e6; background:#fff;
        color:#495057; transition:all .2s; white-space:nowrap;
    }
    .ud-promo-tab:hover          { border-color:#C8102E; color:#C8102E; }
    .ud-promo-tab.pt-elig        { background:#0f1f3d; border-color:#0f1f3d; color:#fff; }
    .ud-promo-tab.pt-leniency    { background:#7b1fa2; border-color:#7b1fa2; color:#fff; }
    .ud-promo-tab.pt-delayed     { background:#C8102E; border-color:#C8102E; color:#fff; }
    .ud-promo-tab.pt-calibvar    { background:#00796b; border-color:#00796b; color:#fff; }
    .ud-promo-panel { display:none; }
    .ud-promo-panel.active { display:block; }

    .ud-elig-chip { font-size:10px; font-weight:700; padding:2px 9px; border-radius:10px; white-space:nowrap; }
    .elig-strong  { background:rgba(244,161,0,.18);  color:#28a745; }
    .elig-ready   { background:rgba(40,167,69,.12);  color:#AED581; }
    .elig-watch   { background:rgba(21,101,192,.12); color:#ffc107; }
    .elig-not     { background:rgba(200,16,46,.10);  color:#C8102E; }

    .ud-leniency-chip { font-size:10px; font-weight:700; padding:2px 9px; border-radius:10px; white-space:nowrap; }
    .len-lenient   { background:rgba(244,161,0,.18);  color:#c68a00; }
    .len-stringent { background:rgba(200,16,46,.12);  color:#C8102E; }
    .len-balanced  { background:rgba(40,167,69,.12);  color:#28a745; }

    .ud-delay-chip { font-size:10px; font-weight:700; padding:2px 9px; border-radius:10px; white-space:nowrap; }
    .del-critical  { background:rgba(200,16,46,.12);  color:#C8102E; }
    .del-warning   { background:rgba(255,193,7,.15);  color:#e6a800; }
    .del-ok        { background:rgba(40,167,69,.12);  color:#28a745; }

    .ud-cvar-chip  { font-size:10px; font-weight:700; padding:2px 9px; border-radius:10px; white-space:nowrap; }
    .cvar-high     { background:rgba(200,16,46,.12);  color:#C8102E; }
    .cvar-med      { background:rgba(255,193,7,.15);  color:#e6a800; }
    .cvar-low      { background:rgba(40,167,69,.12);  color:#28a745; }

    .ud-score-sparkbar { display:flex; align-items:center; gap:5px; }
    .ud-score-sparkbar .sb-track { flex:1; height:6px; background:#e9ecef; border-radius:3px; overflow:hidden; }
    .ud-score-sparkbar .sb-fill  { height:100%; border-radius:3px; }

    @media print {
        .ud-promo-grid  { grid-template-columns:repeat(4,1fr) !important; }
        .ud-promo-panel { display:block !important; }
        .ud-promo-tabs  { display:none !important; }
        * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    }
</style>`);
    $('head').append(`<style id="unit-dash-styles">
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .ud-perf-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
    .ud-perf-tab {
        padding:6px 16px; border-radius:20px; font-size:11px; font-weight:700;
        cursor:pointer; border:2px solid #dee2e6; background:#fff;
        color:#495057; transition:all .2s; white-space:nowrap;
    }
    ud-perf-tab.pt-all  { background:#00796b; border-color:#00796b; color:#fff; }
    .ud-perf-tab.pt-top  { background:#FFFFFF; border-color:#28a745; color:#28a745; }
    .ud-perf-tab.pt-mid  { background:#FFFFFF; border-color:#ffc107; color:#ffc107; }
    .ud-perf-tab.pt-low  { background:#FFFFFF; border-color:#C8102E; color:#C8102E; }
 
    .ud-perf-panel { display:none; }
    .ud-perf-panel.active { display:block; }

   
    
    .ud-perf-kpi-row {
        display:grid; grid-template-columns:repeat(6,1fr);
        gap:10px; margin-bottom:16px;
    }
    .ud-perf-kpi {
        background:#fff; border-radius:8px; padding:12px 14px; text-align:center;
        border-top:3px solid #dee2e6; box-shadow:0 1px 6px rgba(0,0,0,.05);
    }
    .ud-perf-kpi.gold   { border-top-color:#28a745 ; } .ud-perf-kpi.gold   .pkv { color:#28a745 ; }
    .ud-perf-kpi.navy   { border-top-color:#AED581 ; } .ud-perf-kpi.navy   .pkv { color:#AED581 ; }
    .ud-perf-kpi.red    { border-top-color:#ffc107 ; } .ud-perf-kpi.red    .pkv { color:#ffc107 ; }
    .ud-perf-kpi.yellow    { border-top-color:#FFEE58 ; } .ud-perf-kpi.red    .pkv { color:#FFEE58 ; }
    .ud-perf-kpi.orange    { border-top-color:#FFEE58 ; } .ud-perf-kpi.orange    .pkv { color:#FFEE58 ; }
    .ud-perf-kpi.green  { border-top-color:#7b1fa2; } .ud-perf-kpi.green  .pkv { color:#7b1fa2; }
    .ud-perf-kpi.purple { border-top-color:#C8102E; } .ud-perf-kpi.purple .pkv { color:#C8102E; }
    .pkv { font-size:22px; font-weight:700; line-height:1.1; color:#0f1f3d; }
    .pkl { font-size:10px; font-weight:600; color:#868e96; text-transform:uppercase; letter-spacing:1px; margin-top:3px; }
 
    .ud-rank-badge {
        display:inline-flex; align-items:center; justify-content:center;
        width:22px; height:22px; border-radius:50%; font-size:10px; font-weight:700;
    }
    .ud-rank-1 { background:#f4a100; color:#fff; }
    .ud-rank-2 { background:#9e9e9e; color:#fff; }
    .ud-rank-3 { background:#a0522d; color:#fff; }
    .ud-rank-n { background:#e9ecef; color:#495057; }
 
    .ud-sbar-wrap { display:flex; align-items:center; gap:6px; min-width:110px; }
    .ud-sbar { background:#e9ecef; border-radius:4px; height:7px; flex:1; overflow:hidden; }
    .ud-sbar-fill { height:100%; border-radius:4px; }
 
    .ud-risk-chip { font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; }
    .ud-risk-h { background:rgba(200,16,46,.12);  color:#C8102E; }
    .ud-risk-m { background:rgba(255,193,7,.15);  color:#e6a800; }
    .ud-risk-l { background:rgba(40,167,69,.12);  color:#28a745; }
 
    .ud-pip-banner {
        background:#fff0f0; border-left:3px solid #C8102E;
        border-radius:0 8px 8px 0; padding:9px 14px;
        font-size:12px; margin-bottom:12px;
    }
    .ud-pip-banner .pbb-title {
        font-weight:700; color:#C8102E; font-size:11px;
        text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px;
    }
    .ud-ret-banner {
        background:#fffbe6; border-left:3px solid #ffc107;
        border-radius:0 8px 8px 0; padding:9px 14px;
        font-size:12px; margin-bottom:12px;
    }
    .ud-ret-banner .pbb-title {
        font-weight:700; color:#856404; font-size:11px;
        text-transform:uppercase; letter-spacing:.5px; margin-bottom:3px;
    }
 
    .ud-heat-tbl { width:100%; border-collapse:collapse; font-size:11px; }
    .ud-heat-tbl th {
        background:#0f1f3d; color:#fff; padding:8px 10px;
        text-align:center; font-size:10px; letter-spacing:.4px;
    }
    .ud-heat-tbl td { padding:8px 10px; text-align:center; border-bottom:1px solid #e9ecef; font-weight:600; }
    .ud-heat-tbl tr:hover td { background:#fce8ec; }
    .ud-heat-tbl td:first-child { text-align:left; font-weight:700; }
 
    .ud-perf-action {
        display:inline-flex; align-items:center; gap:3px;
        padding:3px 9px; border-radius:6px; font-size:10px; font-weight:700;
        cursor:pointer; border:none; transition:opacity .15s; margin-right:2px;
    }
    .ud-perf-action:hover { opacity:.75; }
    .ud-act-view { background:#e8eaf6; color:#3949ab; }
    .ud-act-pip  { background:#fce8ec; color:#C8102E; }
    .ud-act-flag { background:#fff3cd; color:#856404; }
 
    @media (max-width:768px) {
        .ud-perf-kpi-row { grid-template-columns:repeat(2,1fr); }
    }
    @media print {
        .ud-perf-panel { display:block !important; }
        .ud-perf-kpi-row {
            display:grid !important;
            grid-template-columns:repeat(5,1fr) !important;
            page-break-inside:avoid !important;
        }
        .ud-heat-tbl, .ud-heat-tbl th, .ud-heat-tbl td {
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
        }
        .ud-risk-chip, .ud-pip-banner, .ud-ret-banner {
            -webkit-print-color-adjust:exact !important;
            print-color-adjust:exact !important;
        }
    }
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
        .ud-kpi-card.blue   { border-top-color: #331bab ; } .ud-kpi-card.blue   .kpi-val { color: #331bab ; }
        .ud-kpi-card.green  { border-top-color: #28a745; } .ud-kpi-card.green  .kpi-val { color: #28a745; }
        .ud-kpi-card.orange { border-top-color: #ffc107; } .ud-kpi-card.orange .kpi-val { color: #e6a800; }
        .ud-kpi-card.red    { border-top-color: #C8102E; } .ud-kpi-card.red    .kpi-val { color: #C8102E; }
        .ud-kpi-card.purple { border-top-color: #128325; } .ud-kpi-card.purple .kpi-val { color: #128325; }
        .ud-kpi-card.teal   { border-top-color: #f2302c; } .ud-kpi-card.teal   .kpi-val { color: #f2302c; }

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
    /* ── Force ALL elements to print colors ── */
* {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
}

/* ── KPI card values ── */
.ud-kpi-card .kpi-val {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

/* ── Charts: ensure canvas/img are visible ── */
.ud-chart-wrap canvas,
.ud-chart-wrap img {
    opacity: 1 !important;
    visibility: visible !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

/* ── Section headers ── */
.ud-section-header {
    background: #f8f9fa !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
}

/* ── Borders ── */
.ud-kpi-card.blue   { border-top: 3px solid #C8102E !important; }
.ud-kpi-card.green  { border-top: 3px solid #28a745 !important; }
.ud-kpi-card.orange { border-top: 3px solid #ffc107 !important; }
.ud-kpi-card.red    { border-top: 3px solid #e53935 !important; }
.ud-kpi-card.purple { border-top: 3px solid #7b1fa2 !important; }
.ud-kpi-card.teal   { border-top: 3px solid #00796b !important; }
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
    $('head').append(`<style id="ud-new-sections-styles">
/* ── Shared KPI strip ── */
.ud-ns-kpi-row{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:16px;}
.ud-ns-kpi{background:#fff;border-radius:8px;padding:12px 14px;text-align:center;
    border-top:3px solid #dee2e6;box-shadow:0 1px 6px rgba(0,0,0,.05);}
.ud-ns-kpi .nkv{font-size:22px;font-weight:700;line-height:1.1;}
.ud-ns-kpi .nkl{font-size:10px;font-weight:600;color:#868e96;text-transform:uppercase;letter-spacing:1px;margin-top:3px;}
.nkc-gold  {border-top-color:#f4a100;} .nkc-gold  .nkv{color:#f4a100;}
.nkc-navy  {border-top-color:#0f1f3d;} .nkc-navy  .nkv{color:#0f1f3d;}
.nkc-red   {border-top-color:#C8102E;} .nkc-red   .nkv{color:#C8102E;}
.nkc-green {border-top-color:#28a745;} .nkc-green .nkv{color:#28a745;}
.nkc-teal  {border-top-color:#00796b;} .nkc-teal  .nkv{color:#00796b;}
.nkc-purple{border-top-color:#7b1fa2;} .nkc-purple .nkv{color:#7b1fa2;}
.nkc-blue{border-top-color:#008080;} .nkc-blue .nkv{color:#008080;}
.nkc-yellow{border-top-color:#FFEE58 ;} .nkc-yellow .nkv{color:#FFEE58 ;}

/* ── Shared tab bar ── */
.ud-ns-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
.ud-ns-tab{padding:6px 16px;border-radius:20px;font-size:11px;font-weight:700;
    cursor:pointer;border:2px solid #dee2e6;background:#fff;
    color:#495057;transition:all .2s;white-space:nowrap;}
.ud-ns-tab:hover{border-color:#C8102E;color:#C8102E;}
.ud-ns-panel{display:none;}
.ud-ns-panel.active{display:block;}

/* ── Tab active colours ── */
.nst-navy   {background:#0f1f3d;border-color:#0f1f3d;color:#fff;}
.nst-red    {background:#C8102E;border-color:#C8102E;color:#fff;}
.nst-gold   {background:#f4a100;border-color:#f4a100;color:#fff;}
.nst-teal   {background:#00796b;border-color:#00796b;color:#fff;}
.nst-purple {background:#7b1fa2;border-color:#7b1fa2;color:#fff;}

/* ── Rating avg section ── */
.ud-avg-heat-cell{padding:8px 10px;text-align:center;font-weight:700;
    border-bottom:1px solid #e9ecef;font-size:12px;}
.ud-avg-bar-wrap{display:flex;align-items:center;gap:6px;}
.ud-avg-bar-trk{flex:1;height:8px;background:#e9ecef;border-radius:4px;overflow:hidden;}
.ud-avg-bar-fil{height:100%;border-radius:4px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;}

/* ── Aging section ── */
.ud-aging-chip{font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;white-space:nowrap;}
.aging-crit{background:rgba(200,16,46,.12);color:#C8102E;}
.aging-warn{background:rgba(255,193,7,.15);color:#e6a800;}
.aging-ok  {background:rgba(40,167,69,.12);color:#28a745;}
.aging-watch{background:rgba(15,31,61,.10);color:#0f1f3d;}

/* ── Assessor effectiveness ── */
.ud-aeff-chip{font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;white-space:nowrap;}
.aeff-lenient  {background:rgba(244,161,0,.18);color:#c68a00;}
.aeff-stringent{background:rgba(200,16,46,.12);color:#C8102E;}
.aeff-balanced {background:rgba(40,167,69,.12);color:#28a745;}
.aeff-hi-var   {background:rgba(200,16,46,.12);color:#C8102E;}
.aeff-med-var  {background:rgba(255,193,7,.15);color:#e6a800;}
.aeff-lo-var   {background:rgba(40,167,69,.12);color:#28a745;}

/* ── Spark bar ── */
.ud-spk{display:flex;align-items:center;gap:5px;}
.ud-spk .st{flex:1;height:6px;background:#e9ecef;border-radius:3px;overflow:hidden;}
.ud-spk .sf{height:100%;border-radius:3px;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;}

/* ── Info banner ── */
.ud-ib{background:#e8f4fd;border-left:3px solid #1976d2;border-radius:0 8px 8px 0;
    padding:9px 14px;font-size:12px;margin-bottom:14px;}
.ud-ib .ibt{font-weight:700;color:#0d47a1;font-size:11px;text-transform:uppercase;
    letter-spacing:.5px;margin-bottom:3px;}
.ud-ib .ibb{color:#1565c0;}

@media(max-width:768px){
    .ud-ns-kpi-row{grid-template-columns:repeat(2,1fr);}
}
@media print{
    .ud-ns-kpi-row{grid-template-columns:repeat(5,1fr)!important;}
    .ud-ns-panel{display:block!important;}
    .ud-ns-tabs{display:none!important;}
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
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

        <!-- Row 1: Filters (sticky at top) -->
        <div class="ud-filter-bar ud-print-hide" id="ud-filters"
             style="position:sticky;top:0;z-index:101;background:#fff;padding:8px 16px;border-bottom:1px solid #dee2e6;display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;">
            <!-- your filter controls here -->
        </div>

        <!-- Row 2: Unit tabs (sticky below row 1) -->
        <div class="ud-unit-tabs ud-print-hide" id="ud-unit-tabs"
             style="position:sticky;top:77px;z-index:100;background:#fff;padding:8px 16px;border-bottom:1px solid #dee2e6;">
            <div class="ud-loading"><span class="spinner-border spinner-border-sm"></span> Loading units...</div>
        </div>

        <div id="ud-main"></div>
        <div class="ud-footer">Unit Appraisal Dashboard | Confidential</div>
    </div>
`);
$('head').append(`<style id="ud-report-filter-styles">
    /* Make report type filter stand out slightly */
    .ud-filter-bar .frappe-control[data-fieldname="report_type"] .form-control {
        border-color: #C8102E;
        font-weight: 600;
        color: #0f1f3d;
    }
    

    /* Smooth show/hide */
    .ud-section {
        transition: opacity 0.2s ease;
    }
</style>`);
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


    // STEP 1: Expand all collapsible sections
    $wrap.find('.ud-collapsible-body').show();
    $wrap.find('.ud-toggle-icon').text('▼');

    // STEP 2: Show all bell panels
    $wrap.find('.ud-bell-panel').show().removeClass('ud-bell-panel-hidden');

    // STEP 3: Convert ALL canvases → images (wait for charts to be ready)
    setTimeout(() => {


        // Snapshot all live canvases
        $wrap.find('canvas').each(function() {
            let canvas = this;
            try {
                if (canvas.width > 0 && canvas.height > 0) {
                    let img = document.createElement('img');
                    img.src = canvas.toDataURL('image/png', 1.0);
                    img.style.width = '100%';
                    img.style.maxHeight = '220px';
                    img.style.objectFit = 'contain';
                    img.style.display = 'block';
                    canvas.parentNode.replaceChild(img, canvas);
                }
            } catch(e) {
                console.warn('Canvas capture failed:', e);
            }
        });

        // STEP 4: Set header info
        let unit = $('.ud-unit-tab.active').text().trim();
        let date = frappe.datetime.nowdate();
        $('.ud-subtitle').text(`${unit} | Generated on ${date}`);

        let originalTitle = document.title;
        document.title = `Unit Dashboard - ${unit} - ${date}`;


        // STEP 5: Give browser time to reflow, then print
        setTimeout(() => {
            // Add this BEFORE window.print()
            window.print();

            // STEP 6: Restore after print dialog closes
            setTimeout(() => {
                document.title = originalTitle;
                if (typeof _load_unit_dashboard === 'function') {
                    _load_unit_dashboard(currentUnit);
                }
            }, 1500);

        }, 600);

    }, 800); // wait for any async chart renders
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
        $page.find('#ud-unit-tabs').css({
    margin: '0',
    paddingTop: '8px',
    borderTop: '1px solid #e9ecef',
    width: '100%'
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

        // ── helpers ──────────────────────────────────────────────
const FILTER_KEY = 'ud_dashboard_filters';

function save_filters() {
    localStorage.setItem(FILTER_KEY, JSON.stringify({
        from_date:   from_field.get_value(),
        to_date:     to_field.get_value(),
        grade_filter: grade_filter_field.get_value(),
        report_type: report_type_field.get_value()
    }));
}

function load_filters() {
    try { return JSON.parse(localStorage.getItem(FILTER_KEY)) || {}; }
    catch { return {}; }
}

// ── init ─────────────────────────────────────────────────
let initializing = true;
let reload_timer = null;

const saved = load_filters();

let from_field = frappe.ui.form.make_control({
    df: { label: 'From Date', fieldtype: 'Date', fieldname: 'from_date', change: () => { save_filters(); debounced_reload(); } },
    parent: $page.find('#ud-filters'), render_input: true
});
let to_field = frappe.ui.form.make_control({
    df: { label: 'To Date', fieldtype: 'Date', fieldname: 'to_date', change: () => { save_filters(); debounced_reload(); } },
    parent: $page.find('#ud-filters'), render_input: true
});
let grade_filter_field = frappe.ui.form.make_control({
    df: {
        label: 'Employee Type', fieldtype: 'Select', fieldname: 'grade_filter',
        options: '\nAll\nWorker (A1–A4)\nStaff (B1-B5)\nStaff (C1-C3)\nStaff (D1-E2)',
        change: () => { save_filters(); debounced_reload();apply_report_type_filter(); }
    },
    parent: $page.find('#ud-filters'), render_input: true
});
let report_type_field = frappe.ui.form.make_control({
    df: {
        label: 'Report Type', fieldtype: 'Select', fieldname: 'report_type',
        options: [
            '','Completion Status','Rating Trends','Galfar Values & Competency',
            '9-Box Talent Matrix',
            'Bell Curve Distribution','Performance Tracker',
            'Historical Performance',
            'Average Rating','Assessor Effectiveness','Appraisal Aging',
            'Calibration Summary','Compliance Dashboard',
            // 'Performance vs Compensation',
            // 'Promotion Eligibility',
            'Succession Readiness','Learning & Development'
        ].join('\n'),
        change: () => { save_filters();debounced_reload(); apply_report_type_filter(); }
    },
    parent: $page.find('#ud-filters'), render_input: true
});
$page.find('#ud-filters').css({
    position:     'sticky',
    top:          '0',
    zIndex:       '100',
    background:   '#fff',
    padding:      '8px 16px',
    borderBottom: '1px solid #dee2e6',
    display:      'flex',
    flexWrap:     'wrap',
    gap:          '12px',
    alignItems:   'flex-end'
});
// ── restore saved values or fall back to defaults ────────
from_field.set_value(saved.from_date   || frappe.datetime.month_start(), true);
to_field.set_value(saved.to_date       || frappe.datetime.month_end(),   true);
grade_filter_field.set_value(saved.grade_filter || 'All',                true);
report_type_field.set_value(saved.report_type   || '',                   true);

initializing = false;
       function debounced_reload() {
    if (initializing) return;

    clearTimeout(reload_timer);

    reload_timer = setTimeout(() => {
        load_unit_dashboard(currentUnit);
    }, 300);

    apply_report_type_filter();
}
        function apply_report_type_filter() {
    let selected = report_type_field.get_value() || '';

    let $main = $page.find('#ud-main');
    let $allSections = $main.children('.ud-section');
    let $kpiRow = $main.children('.ud-kpi-row');

    if (!selected) {
        $allSections.show();
        $kpiRow.show();
        return;
    }

    if (selected === 'Completion Status') {
        $allSections.hide();
        $kpiRow.show();
        // Show completion section (first section, data-target="ud-body-completion")
        $main.find('[data-target="ud-body-completion"]').closest('.ud-section').show();
        return;
    }

    // Hide KPI row for all non-overview
    $kpiRow.hide();
    $allSections.hide();

    // Map report type → the data-target value of the section header
    const targetMap = {
        'Bell Curve Distribution':       'ud-body-bell',
        'Performance Tracker':           'ud-body-performers',
        '9-Box Talent Matrix':           'ud-body-ninebox',
        'Galfar Values & Competency':     'ud-body-comp',
        'Historical Performance':        'ud-body-hist',
        'Average Rating':                'ud-body-avgrating',
        'Appraisal Aging':               'ud-body-aging',
        'Assessor Effectiveness':        'ud-body-aeff2',
        'Calibration Summary':           'ud-body-calibration',
        'Compliance Dashboard':          'ud-body-compliance',
        'Performance vs Compensation':   'ud-body-perfcomp',
        'Promotion Eligibility':         'ud-body-promo',
        'Succession Readiness':          'ud-body-succ',
        'Learning & Development':        'ud-body-ld',
    };

    let bodyId = targetMap[selected];
    if (bodyId) {
        // Find the section that contains a toggle pointing to this bodyId
        let $header = $main.find(`[data-target="${bodyId}"]`);
        if ($header.length) {
            let $section = $header.closest('.ud-section');
            $section.show();
            // Ensure body is expanded
            $section.find('.ud-collapsible-body').show();
            $section.find('.ud-toggle-icon').text('▼');
        }
    }
}

        // ── AI Insight Fetcher ─────────────────────────────
        function fetch_ai_insights(btn_element, content_id, context_type, chart_data) {
            let $btn = $(btn_element);
            let $content = $page.find(`#${content_id}`);

            $btn.prop("disabled", true).html("✨ Analyzing...");
            $content.html(`
                <span class="spinner-border spinner-border-sm text-primary"></span>
                Analyzing...
            `);

            frappe.call({
                method: "pms_ai.api.analyze_dashboard_chart",
                args: {
                    chart_context: context_type,
                    chart_data: JSON.stringify(chart_data)
                },
                callback: function(r) {
                    $btn.prop("disabled", false)
                        .html("🔄 Refresh Insight");

                    if (r.message) {
                        $content.html(
                            r.message.replace(/\n/g, "<br>")
                        );
                    }
                }
            });
        }

        $(document)
        .off('click', '#btn-ai-competency')
        .on('click', '#btn-ai-competency', function () {

            console.log("Button Clicked");

            fetch_ai_insights(
                this,
                'ai-content-competency',
                'unit_competency_insight',
                window.competencyInsightData || []
            );
        });

        $(document)
        .off('click', '#btn-ai-competency-gap')
        .on('click', '#btn-ai-competency-gap', function () {

            console.log(competencyGapInsightData);

            fetch_ai_insights(
                this,
                'ai-content-competency-gap',
                'unit_competency_gap_insight',
                competencyGapInsightData
            );
        });

        $(document)
        .off('click', '#btn-ai-historical-performance')
        .on('click', '#btn-ai-historical-performance', function () {

            fetch_ai_insights(
                this,
                'ai-content-historical-performance',
                'unit_historical_performance',
                historicalPerformanceData
            );
        });
        $(document)
        .off('click', '#btn-ai-assessor-effectiveness')
        .on('click', '#btn-ai-assessor-effectiveness', function () {

            fetch_ai_insights(
                this,
                'ai-content-assessor-effectiveness',
                'unit_assessor_effectiveness',
                window.assessorEffectivenessData
            );
        });
        // learning & development
        $(document)
        .off('click', '#btn-ai-learning-development')
        .on('click', '#btn-ai-learning-development', function () {

            fetch_ai_insights(
                this,
                'ai-content-learning-development',
                'unit_learning_development',
                window.learningDevelopmentData || {}
            );
        });
        // promotion eligibilty
        $(document)
        .off('click', '#btn-ai-promotion-eligibility')
        .on('click', '#btn-ai-promotion-eligibility', function () {

            fetch_ai_insights(
                this,
                'ai-content-promotion-eligibility',
                'unit_promotion_eligibility',
                window.promotionEligibilityData || {}
            );
        });
        // individual increment
        $(document)
        .off('click', '#btn-ai-individual-increment')
        .on('click', '#btn-ai-individual-increment', function () {

            fetch_ai_insights(
                this,
                'ai-content-individual-increment',
                'unit_individual_increment',
                window.individualIncrementData || {}
            );
        });
        // pay-for-performance
        $(document)
        .off('click', '#btn-ai-pay-for-performance')
        .on('click', '#btn-ai-pay-for-performance', function () {

            fetch_ai_insights(
                this,
                'ai-content-pay-for-performance',
                'unit_pay_for_performance',
                window.payForPerformanceData || []
            );
        });
        // policy deviation
        $(document)
        .off('click', '#btn-ai-policy-deviation')
        .on('click', '#btn-ai-policy-deviation', function () {

            fetch_ai_insights(
                this,
                'ai-content-policy-deviation',
                'unit_policy_deviation',
                window.policyDeviationData  || []
            );
        });
        // compliance data
        $(document)
        .off('click', '#btn-ai-compliance-status')
        .on('click', '#btn-ai-compliance-status', function () {

            fetch_ai_insights(
                this,
                'ai-content-compliance-status',
                'unit_compliance_status',
                window.policyComplianceData  || []
            );
        });
        // shift calibration
        $(document)
        .off('click', '#btn-ai-shift-calibration')
        .on('click', '#btn-ai-shift-calibration', function () {

            fetch_ai_insights(
                this,
                'ai-content-shift-calibration',
                'unit_shift_calibration',
                window.calibrationIndividualData  || []
            );
        });
        // calibration data
        $(document)
        .off('click', '#btn-ai-calibration')
        .on('click', '#btn-ai-calibration', function () {

            fetch_ai_insights(
                this,
                'ai-content-calibration',
                'unit_compliance_status',
                window.calibrationData  || []
            );
        });
        // 9-box data
        $(document)
        .off('click', '#btn-ai-9-box')
        .on('click', '#btn-ai-9-box', function () {
            fetch_ai_insights(
                this,
                'ai-content-9-box',
                'unit_9_box',
                window.ud_9BoxData  || []
            );
        });
        
        $(document)
        .off('click', '#btn-ai-self-assessor-bar')
        .on('click', '#btn-ai-self-assessor-bar', function () {
            fetch_ai_insights(
                this,
                'ai-content-self-assessor-bar',
                'unit_self_assessor_bar',
                window.competencyChartData || []
            );
        });

        $(document)
        .off('click', '#btn-ai-competency-radar')
        .on('click', '#btn-ai-competency-radar', function () {
            fetch_ai_insights(
                this,
                'ai-content-competency-radar',
                'unit_competency_radar',
                window.competencyChartData || []
            );
        });

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
            let gradeFilter = grade_filter_field.get_value() || 'All';
            let period = getHalfYearPeriod();
            let filters = [
                ['docstatus', 'in', [0, 1]],
                ['start_date', 'between', [period.start_date, period.end_date]]
            ];
            if (unit !== '__ALL__') filters.push(['custom_unit', '=', unit]);
            
            // if (gradeFilter === 'Worker (A1–A4)') {
            //     filters.push(['custom_grade', 'in', WORKER_GRADES]);
            // } else if (gradeFilter === 'Staff') {
            //     filters.push(['custom_grade', 'not in', WORKER_GRADES]);
            // }
            if (gradeFilter === 'Worker (A1–A4)') {
                filters.push(['custom_grade', 'in', ['A1', 'A2', 'A3', 'A4']]);

            } else if (gradeFilter === 'Staff (B1-B5)') {
                filters.push(['custom_grade', 'in', ['B1', 'B2', 'B3', 'B4', 'B5']]);

            } else if (gradeFilter === 'Staff (C1-C3)') {
                filters.push(['custom_grade', 'in', ['C1', 'C2', 'C3']]);

            } else if (gradeFilter === 'Staff (D1-E2)') {
                filters.push(['custom_grade', 'in', ['D1', 'D2', 'D3', 'E1', 'E2']]);
            }
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Appraisal',
                    fields: [
                        'name', 'employee', 'employee_name',
                        'custom_division', 'custom_unit', 'custom_grade',
                        'total_score', 'avg_feedback_score',
                        'custom_total_self_score', 'final_score',
                        'docstatus', 'start_date', 'modified',
                        'appraisal_cycle', 'appraisal_template',
                        'custom_submitted_date', 'custom_self_approval_date', 'workflow_state','custom_appraisal_status','custom_rollout_date'
                    ],
                    filters: filters,
                    limit_page_length: 2000
                },
                callback: function(r) { render_dashboard(r.message || [], unit); }
            });
        }
        $page.find('#ud-unit-tabs').css({
    margin: '0',
    paddingTop: '8px',
    borderTop: '1px solid #e9ecef',
    width: '100%'
});
       window.ud_thEye = function(label, desc, formula, example, theme) {
    let safe = (label||'').replace(/'/g, "\\'");
    let d    = (desc||'').replace(/'/g, "\\'");
    let f    = (formula||'').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    let ex   = example ? (example).replace(/'/g, "\\'") : '';

    // theme: 'light' = dark icon (for light backgrounds)
    //        'dark'  = white icon (for dark backgrounds like th headers)
    //        'auto'  = default — detects from parent (uses CSS currentColor)
    let strokeColor;
    if (theme === 'light') {
        strokeColor = '#0f1f3d';
    } else if (theme === 'dark') {
        strokeColor = '#ffffff';
    } else {
        strokeColor = 'currentColor';  // inherits from parent text color
    }

    return `<button
        onclick="event.stopPropagation(); ud_showColInfo('${safe}','${d}','${f}','${ex}')"
        title="View formula for ${safe}"
        aria-label="View formula for ${safe}"
        style="background:none;border:none;padding:0;margin-left:5px;cursor:pointer;
               opacity:0.70;vertical-align:middle;line-height:1;display:inline-flex;
               align-items:center;color:inherit;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
             stroke="${strokeColor}" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="8"/>
            <line x1="12" y1="12" x2="12" y2="16"/>
        </svg>
    </button>`;
};
        _load_unit_dashboard = load_unit_dashboard;

        // ── render_dashboard ───────────────────────────────────────────────────
        function render_dashboard(data, unit) {

            const isWorker        = g => WORKER_GRADES.includes((g||''));
            const BELL_LABELS     = ['E (Poor)','D (Acceptable)','C (Good)','B (Very Good)','A (Excellent)'];
            const BELL_TARGET_PCT = [0.05, 0.15, 0.50, 0.20, 0.10];
            const BELL_COLORS     = ['#ED2D1E','#D97706','#F1D548','#9AC654','#4C8C32'];

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
            let overdue    = data.filter(d => d.custom_appraisal_status == 'Overdue').length;
            let scored    = data.filter(d => parseFloat(d.total_score) > 0);
            let avgScore  = scored.length ? (scored.reduce((s,d) => s + parseFloat(d.total_score), 0) / scored.length).toFixed(2) : 'N/A';
            let topPerf   = data.filter(d => parseFloat(d.total_score) > 3.5 && ['Approved','Accepted'].includes(d.workflow_state)).length;
            let lowPerf   = data.filter(d => parseFloat(d.total_score) < 2.5 && ['Approved','Accepted'].includes(d.workflow_state)).length;

            let unitMap = {};
            data.forEach(d => {
                let u = d.custom_unit || 'Unknown';
                if (!unitMap[u]) unitMap[u] = { total:0, completed:0, scored:[], overdue:0 };
                unitMap[u].total++;
                if (['Approved','Accepted'].includes(d.workflow_state)) unitMap[u].completed++;
                if (parseFloat(d.total_score) > 0) unitMap[u].scored.push(parseFloat(d.total_score));
                if (d.custom_appraisal_status=='Overdue') unitMap[u].overdue++;
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
                let dt = d.custom_submitted_date || (d.rollout_date || '').split(' ')[0];
                if (!dt) return;
                if (!trendMap[dt]) trendMap[dt] = { completed:0, pending:0, scores:[], overdue:0 };
                if (['Approved','Accepted'].includes(d.workflow_state)) trendMap[dt].completed++;
                
                else trendMap[dt].pending++;
                if (parseFloat(d.total_score) > 0) trendMap[dt].scores.push(parseFloat(d.total_score));
                if (d.custom_appraisal_status=='Overdue') trendMap[dt].overdue++;
                
            });
            let trendDates     = Object.keys(trendMap).sort();
            let trendCompleted = trendDates.map(d => trendMap[d].completed);
            let trendPending   = trendDates.map(d => trendMap[d].pending);
            let trendOverdue   = trendDates.map(d => trendMap[d].overdue);
            let trendAvgScore  = trendDates.map(d => {
                let s = trendMap[d].scores;
                return s.length ? (s.reduce((a,b)=>a+b,0)/s.length).toFixed(2) : null;
            });
            console.log(trendOverdue)

            let deptMap = {};
            data.forEach(d => {
                let dep = d.custom_unit || 'Unknown';
                if (!deptMap[dep]) deptMap[dep] = { total:0, completed:0,overdue:0 };
                deptMap[dep].total++;
                if ( ['Approved','Accepted'].includes(d.workflow_state)) deptMap[dep].completed++;
                if (d.custom_appraisal_status == "Overdue") deptMap[dep].overdue++;
            });
            
let ud_thEye = window.ud_thEye; 
window.ud_showColInfo = function(label, desc, formula, example) {
    formula = formula ? formula.replace(/\\n/g, '\n') : '';

    if (!document.getElementById('ud-col-info-overlay')) {
        $('body').append(`
        <div id="ud-col-info-overlay"
             style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;
                    background:rgba(15,31,61,0.48);z-index:99999;
                    align-items:center;justify-content:center;">
            <div id="ud-col-info-modal"
                 style="background:#fff;border-radius:10px;max-width:460px;width:92%;
                        overflow:hidden;box-shadow:0 8px 32px rgba(15,31,61,0.2);"
                 onclick="event.stopPropagation()">
                <div style="background:#0f1f3d;color:#fff;padding:13px 16px;
                            display:flex;justify-content:space-between;align-items:center;">
                    <span id="ud-ci-title"
                          style="font-size:13px;font-weight:700;"></span>
                    <button onclick="document.getElementById('ud-col-info-overlay').style.display='none'"
                            style="background:none;border:none;color:#fff;cursor:pointer;
                                   font-size:20px;line-height:1;opacity:.7;padding:0;">
                        &times;
                    </button>
                </div>
                <div style="padding:18px 20px;">
                    <div style="font-size:10px;font-weight:700;color:#868e96;
                                text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                        Description
                    </div>
                    <div id="ud-ci-desc"
                         style="font-size:13px;color:#0f1f3d;line-height:1.65;margin-bottom:14px;">
                    </div>

                    <div id="ud-ci-formula-section" style="display:none;">
                        <div style="font-size:10px;font-weight:700;color:#868e96;
                                    text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">
                            Formula / Logic
                        </div>
                        <pre id="ud-ci-formula"
                             style="background:#f0f4ff;border-left:3px solid #0f1f3d;
                                    border-radius:0 6px 6px 0;padding:10px 14px;
                                    font-size:12px;color:#0f1f3d;font-family:monospace;
                                    line-height:1.7;margin:0;white-space:pre-wrap;"></pre>
                    </div>

                    <pre id="ud-ci-example"
                         style="background:#fff8e1;border-left:3px solid #f4a100;
                                border-radius:0 6px 6px 0;padding:9px 14px;
                                font-size:12px;color:#7a4f00;margin-top:10px;
                                line-height:1.6;white-space:pre-wrap;display:none;"></pre>
                </div>
            </div>
        </div>`);
    }

    $('#ud-ci-title').text(label);
    $('#ud-ci-desc').text(desc);

    if (formula && formula.trim()) {
        $('#ud-ci-formula').text(formula);
        $('#ud-ci-formula-section').show();
    } else {
        $('#ud-ci-formula-section').hide();
    }

    let $ex = $('#ud-ci-example');
    if (example) {
        $ex.text(example).show();
    } else {
        $ex.hide();
    }

    $('#ud-col-info-overlay').css('display', 'flex');
};
            let unitLabel = unit === '__ALL__' ? 'All Units' : `Unit: ${unit}`;
            
            // ── KPI Cards ──────────────────────────────────────────────────────
            let kpiHtml = `
                <div class="ud-kpi-row">
                    <div class="ud-kpi-card blue" id="ud-card-total">
                        <div class="kpi-val">${total}</div>
                        <div class="kpi-lbl">Total Employees ${ud_thEye('Total Employees','All appraisal records in the selected unit and period, regardless of status.','','e.g. 120 appraisals exist for H1 2026')}</div>
                    </div>
                    <div class="ud-kpi-card green" id="ud-card-completed">
                        <div class="kpi-val">${pct(completed,total)}%</div>
                        <div class="kpi-lbl">Completed (${completed}) ${ud_thEye('Completed','Appraisals where workflow_state is Approved or Accepted.','','e.g. 80 of 120 are Approved → 67%')}</div>
                    </div>
                    <div class="ud-kpi-card orange" id="ud-card-pending">
                        <div class="kpi-val">${pct(pending,total)}%</div>
                        <div class="kpi-lbl">Pending (${pending}) ${ud_thEye('Pending','Appraisals not yet approved or accepted.','','e.g. 120 − 80 = 40 pending')}</div>
                    </div>
                    <div class="ud-kpi-card teal" id="ud-card-avg">
                        <div class="kpi-val">${pct(overdue,total)}%</div>
                        <div class="kpi-lbl">Overdue (${overdue}) ${ud_thEye('Overdue','Appraisals flagged as Overdue — past their rollout deadline without completion.','','e.g. 10 of 120 past rollout date without completion')}</div>
                    </div>
                    <div class="ud-kpi-card purple" id="ud-card-top">
                        <div class="kpi-val">${topPerf}</div>
                        <div class="kpi-lbl">Top Performers ${ud_thEye('Top Performers','Completed appraisals with total_score above 3.5.','No of appraisals WHERE total_score > 3.5 AND workflow_state IN [Approved, Accepted])','e.g. 25 employees scored above 3.5')}</div>
                    </div>
                    <div class="ud-kpi-card red" id="ud-card-low">
                        <div class="kpi-val">${lowPerf}</div>
                        <div class="kpi-lbl">Low Performers ${ud_thEye('Low Performers','Completed appraisals with total_score below 2.5.','No of appraisals WHERE total_score < 2.5 AND workflow_state IN [Approved, Accepted])','e.g. 8 employees scored below 2.5')}</div>
                    </div>
                </div>`;
            // At the top of render_dashboard, after computing workerRows/staffRows:
            let gradeFilter   = grade_filter_field.get_value() || 'All';

            let segmentBadge = '';
            if (gradeFilter === 'Worker (A1–A4)') {
                segmentBadge = `<div style="background:#0f1f3d;color:#fff;border-radius:6px;padding:6px 14px;
                    font-size:11px;font-weight:700;display:inline-block;margin-bottom:12px;">
                </div>`;
            } else if (gradeFilter === 'Staff') {
                segmentBadge = `<div style="background:#2d7a4f;color:#fff;border-radius:6px;padding:6px 14px;
                    font-size:11px;font-weight:700;display:inline-block;margin-bottom:12px;">
                </div>`;
            } else {
                segmentBadge = `<div style="background:#e9ecef;color:#495057;border-radius:6px;padding:6px 14px;
                    font-size:11px;font-weight:700;display:inline-block;margin-bottom:12px;">
                </div>`;
            }
            // ── Completion Table ───────────────────────────────────────────────
            let compTableRows = Object.keys(unitMap).sort().map(u => {
                let um   = unitMap[u];
                let comp = pct(um.completed, um.total);
                let avg  = um.scored.length ? (um.scored.reduce((a,b)=>a+b,0)/um.scored.length).toFixed(2) : 'N/A';
                let cls  = comp >= 80 ? 'green' : comp >= 50 ? 'orange' : 'red';
                let barColor = comp >= 80 ? '#28a745 ' : comp >= 50 ? '#ffc107 ' : '#C8102E'; 
                return `<tr>
                    <td style="font-weight:600;">${u}</td>
                    <td style="text-align:center;">${um.total}</td>
                    <td style="text-align:center;">${um.completed}</td>
                    <td style="text-align:center;">${um.total - um.completed}</td>
                    <td style="text-align:center;">${um.overdue}</td>
                     <td>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div class="ud-prog" style="flex:1;"><div class="ud-prog-fill" style="width:${comp}%;background:${barColor};"></div></div>
                            <span class="ud-badge ud-badge-${cls}">${comp}%</span>
                        </div>
                    </td>
                    
                </tr>`;
            }).join('');

            let completionHtml = `
    <div class="ud-section">
        <div class="ud-section-header ud-toggle" data-target="ud-body-completion">
            <h4 style="white-space: nowrap;">📋 Completion Status — ${unitLabel}</h4>
            <span class="ud-toggle-icon">▼</span>
        </div>
        <div class="ud-section-body ud-collapsible-body" id="ud-body-completion">
            <div class="ud-2col" style="margin-bottom:16px;">
                <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-donut-chart"></canvas></div>
                <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-dept-bar-chart"></canvas></div>
            </div>
            <table class="ud-table">
                <thead><tr>
                    <th>Unit</th>
                    <th style="text-align:center;">
                        Total
                        ${ud_thEye('Total',
                            'Total number of appraisals created for this unit regardless of status.',
                            'e.g. 45 appraisals exist for Unit A')}
                    </th>
                    <th style="text-align:center;">
                        Completed
                        ${ud_thEye('Completed',
                            'Appraisals where the workflow state is Approved or Accepted.',
                            'e.g. 30 out of 45 are in Approved/Accepted state')}
                    </th>
                    <th style="text-align:center;">
                        Pending
                        ${ud_thEye('Pending',
                            'Appraisals not yet completed — includes Draft and Pending for Assessor workflow states.',
                            'e.g. 45 − 30 = 15 pending')}
                    </th>
                    <th style="text-align:center;">
                        Overdue
                        ${ud_thEye('Overdue',
                            'Appraisals flagged Overdue — they have passed their deadline without completion.',
                            'e.g. 5 appraisals are past their Rollout date')}
                    </th>
                    <th>
                        Progress
                        ${ud_thEye('Progress',
                            'Completion rate as a percentage of total appraisals for the unit.',
                            '(Completed ÷ Total) × 100 %\n≥ 80% → green \n≥ 50% → Yellow \n< 50%  → red',
                            'e.g. 30 ÷ 45 = 67% → amber progress bar')}
                    </th>
                </tr></thead>
                <tbody>${compTableRows}</tbody>
            </table>
            <div class="ai-insight-card" style="margin-top:20px;">
                <div class="ai-header">
                    <h4 style="white-space: nowrap;">✨ Completion Insights</h4>
                    <button class="btn btn-sm btn-primary" id="btn-ai-completion-status">Generate Insight</button>
                </div>
                <div id="ai-content-completion-status" class="ai-body ai-insight-content">
                    <p>Click Generate Insight for completion status analysis</p>
                </div>
            </div>
        </div>
    </div>`;

            // ── Trend Section ──────────────────────────────────────────────────
            let trendHtml = `
            <div class="ud-section">
                <div class="ud-section-header ud-toggle" data-target="ud-body-trend">
                    <h4 style="white-space: nowrap; display: flex; align-items: center; gap: 6px;">
                        📈 Rating Trends — ${unitLabel}
                    </h4><span class="ud-toggle-icon">▼</span>
                </div>
                <div class="ud-section-body ud-collapsible-body" id="ud-body-trend">
                    <div class="ud-2col">
                        <div>
                            <div style="font-size:12px;font-weight:600;color:#495057;margin-bottom:8px;">
                                Daily Completion Trend
                                        ${ud_thEye(
                                            'Daily Completion Trend',
                                            'Shows the number of appraisals completed, pending, and overdue per submission date over the selected period.',
                                            'Completed = workflow_state IN [Approved, Accepted] grouped by custom_submitted_date\nPending   = all other states grouped by custom_submitted_date\nOverdue   = custom_appraisal_status = Overdue grouped by custom_submitted_date\n\nX-axis = submission date · Y-axis = employee count',
                                            'e.g. On 15-Jan: 12 Completed, 5 Pending, 2 Overdue → three data points plotted for that date'
                                        )}                            
                            </div>
                            <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-trend-line-chart"></canvas></div>
                        </div>
                        <div>
                            <div style="font-size:12px;font-weight:600;color:#495057;margin-bottom:8px;">
                                Average Score Trend
                                ${ud_thEye(
                                    'Average Score Trend',
                                    'Shows how the average appraisal score changes day by day as assessments are submitted and scored over the period.',
                                    'Avg Score per date = SUM(total_score) ÷ COUNT(scored employees) grouped by custom_submitted_date\n\nOnly employees with total_score > 0 are included in the average.\nDates with no scored submissions show a gap (null) in the line.',
                                    'e.g. On 15-Jan: 8 employees scored with total 30.4 → Avg = 3.80 plotted for that date'
                                )}
                            </div>
                            <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-score-trend-chart"></canvas></div>
                        </div>
                    </div>
                </div>
            </div>`;

            // ── Competency Section ─────────────────────────────────────────────
            let compHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-comp">
        <h4 style="white-space: nowrap;">🎯 Galfar Values & Competency — ${unitLabel}</h4>
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-comp">
        <div id="ud-comp-loading" class="ud-loading">
            <span class="spinner-border spinner-border-sm"></span> Loading competency data...
        </div>
        <div id="ud-comp-content" style="display:none;">

            <div style="display:grid;gap:16px;margin-bottom:16px;">
                    

                    <div>
                        
                        <div style="text-align:center;font-size:12px;font-weight:600;margin-bottom:4px;">
                            Competency (out of 5)
                            ${ud_thEye('Competency','Radar chart showing average self and assessor scores across all non-Values competencies.','Avg Self Score = sum of self ratings ÷ number of self assessments\nAvg Assessor Score = sum of assessor ratings ÷ number of assessments\n\nBoth scores are out of 5.','e.g. All KRAs except the 6 core Galfar Values')}
                        </div>
                        <div style="height:420px;position:relative;">
                            <canvas id="ud-kra-radar-competency"></canvas>
                        </div>
                    
                    </div>
                    <div class="ai-insight-card" style="margin:0;">
                        <div class="ai-header">
                            <h4 style="white-space:nowrap;">✨ Self & Assessor Insights</h4>
                            <button class="btn btn-sm btn-primary" id="btn-ai-self-assessor-bar">Generate Insight</button>
                        </div>
                        <div id="ai-content-self-assessor-bar" class="ai-body ai-insight-content">
                            <p>Click Generate Insight for Competency Values analysis</p>
                        </div>
                    </div>

            </div>

            <!-- ROW 2: Bar chart (full width) -->
            <div style="margin-bottom:16px;">
                <div style="text-align:center;font-size:12px;font-weight:600;margin-bottom:4px;">
                    Galfar Values (out of 5)
                    ${ud_thEye('Galfar Values','Bar chart showing average self and assessor scores for the 6 core Galfar Values.','Avg Self Score = sum of self ratings ÷ number of self assessments\nAvg Assessor Score = sum of assessor ratings ÷ number of assessments\n\nBoth scores are out of 5.','e.g. Safety, Integrity, Quality, Simplicity, Respect, Continuous Improvement')}
                <div style="height:420px;position:relative;">
                    <canvas id="ud-kra-bar-chart"></canvas>
                </div>
            </div>
            <div class="ai-insight-card" style="margin:0;">
                <div class="ai-header">
                    <h4 style="white-space:nowrap;">✨ Galfar Values Insights</h4>
                    <button class="btn btn-sm btn-primary" id="btn-ai-competency-radar">Generate Insight</button>
                </div>
                <div id="ai-content-competency-radar" class="ai-body ai-insight-content">
                    <p>Click Generate Insight for Galfar Values analysis</p>
                </div>
            </div>
            <div id="ud-comp-perf-table" style="margin-top:4px;"></div>
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
            $('head').append(`<style id="ud-ninebox-styles">
            .ud-9box-section-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0;
                margin-bottom: 16px;
                border: 2px solid #dee2e6;
                border-radius: 10px;
                overflow: hidden;
            }
            .ud-9box-section-cell {
                padding: 14px 10px;
                text-align: center;
                cursor: pointer;
                border: 1px solid #dee2e6;
                transition: opacity .15s;
                min-height: 90px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .ud-9box-section-cell:hover { opacity: .85; }
            .ud-9box-section-cell .nbc-code  { font-size: 11px; font-weight: 700; opacity: .75; margin-bottom: 4px; }
            .ud-9box-section-cell .nbc-label { font-size: 10px; font-weight: 600; line-height: 1.4; }
            .ud-9box-section-cell .nbc-count { font-size: 22px; font-weight: 700; margin-top: 6px; }

            /* Row 1 — High Potential */
            
             .nb-1c  { background: #FFEB3B  !important; color: #000000  !important; border: 1px solid #FFEB3B  !important; }
            .nb-1b  { background: #AED581  !important; color: #000000  !important; border: 1px solid #AED581  !important; }
            .nb-1a  { background: #28a745  !important; color: #000000  !important; border: 1px solid #28a745  !important; }
            .nb-2c  { background: #ffc107  !important; color: #000000  !important; border: 1px solid #ffc107  !important; }
            .nb-2b  { background: #FFEB3B  !important; color: #000000  !important; border: 1px solid #FFEB3B  !important; }
            .nb-2a  { background: #AED581  !important; color: #000000  !important; border: 1px solid #AED581  !important; }
            .nb-3c  { background: #C8102E !important; color: #000000  !important; border: 1px solid #C8102E !important; }
            .nb-3b  { background: #ffc107  !important; color: #000000  !important; border: 1px solid #ffc107  !important; }
            .nb-3a  { background: #FFEB3B  !important; color: #000000  !important; border: 1px solid #FFEB3B  !important; }
            
            .ud-9box-axis-y {
                writing-mode: vertical-rl;
                transform: rotate(180deg);
                font-size: 11px; font-weight: 700;
                color: #0f1f3d; letter-spacing: 1px;
                text-transform: uppercase;
                display: flex; align-items: center; justify-content: center;
                padding: 0 6px;
            }
            .ud-9box-axis-x {
                display: flex; justify-content: space-around;
                font-size: 11px; font-weight: 700;
                color: #0f1f3d; text-transform: uppercase;
                letter-spacing: .5px; margin-top: 6px; padding: 0 4px;
            }

            .ud-9box-detail-panel {
                margin-top: 14px;
                background: #f8f9fa;
                border-radius: 8px;
                padding: 14px;
                display: none;
            }

            @media print {
                .ud-9box-section-grid { page-break-inside: avoid !important; }
            }
            </style>`);
            // ═══════════════════════════════════════════════════════════════
//  9-BOX TALENT MATRIX
// ═══════════════════════════════════════════════════════════════

// Performance band: based on total_score
function nb_perfBand(d) {
    let s = parseFloat(d.total_score) || 0;
    if (s >= 4.0) return 'outstanding';   // col 3 (A)
    if (s >= 2.5) return 'good';          // col 2 (B)
    return 'poor';                        // col 1 (C)
}
// paste in browser console to find the culprit
let el = document.getElementById('ud-filters');
while (el) {
    const { overflow, overflowY } = getComputedStyle(el);
    if (['auto','hidden','scroll'].includes(overflow) || ['auto','hidden','scroll'].includes(overflowY))
        console.log('overflow culprit:', el);
    el = el.parentElement;
}
// Potential band: based on self–assessor alignment + grade seniority
function nb_potBand(d) {
    let a    = parseFloat(d.total_score) || 0;
    let s    = parseFloat(d.custom_total_self_score) || 0;
    let delta = a - s;
    let g    = (d.custom_grade || '').toLowerCase();
    let senior = ['s','l','m'].some(p => g.startsWith(p)) ||
                 ['senior','lead','manager','head','supervisor','director'].some(k => g.includes(k));
    let pts = 0;
    if (a >= 4.0)      pts += 2;
    else if (a >= 3.0) pts += 1;
    if (delta >= 0.5)  pts += 2;
    else if (delta >= 0) pts += 1;
    if (senior)        pts += 1;
    if (pts >= 4) return 'high';
    if (pts >= 2) return 'medium';
    return 'low';
}

// Map to box key: box{pot}{perf}  e.g. box1a = high potential + outstanding performance
const NB_PERF_MAP = { outstanding: 'a', good: 'b', poor: 'c' };
const NB_POT_MAP  = { high: '1', medium: '2', low: '3' };

let nbBoxMap = {};
['1a','1b','1c','2a','2b','2c','3a','3b','3c'].forEach(k => { nbBoxMap[k] = []; });

let nbScored = data.filter(d => parseFloat(d.total_score) > 0);
nbScored.forEach(d => {
    let perf = nb_perfBand(d);
    let pot  = nb_potBand(d);
    let key  = NB_POT_MAP[pot] + NB_PERF_MAP[perf];
    nbBoxMap[key].push(d);
});

const NB_CELLS = [
    { key:'1c', cls:'nb-1c', code:'1C', label:'Poor Perf<br>High Potential'        },
    { key:'1b', cls:'nb-1b', code:'1B', label:'Good Perf<br>High Potential'        },
    { key:'1a', cls:'nb-1a', code:'1A', label:'Outstanding Perf<br>High Potential' },
    { key:'2c', cls:'nb-2c', code:'2C', label:'Poor Perf<br>Moderate Potential'    },
    { key:'2b', cls:'nb-2b', code:'2B', label:'Good Perf<br>Moderate Potential'    },
    { key:'2a', cls:'nb-2a', code:'2A', label:'Outstanding Perf<br>Moderate Potential' },
    { key:'3c', cls:'nb-3c', code:'3C', label:'Poor Perf<br>Limited Potential'     },
    { key:'3b', cls:'nb-3b', code:'3B', label:'Good Perf<br>Limited Potential'     },
    { key:'3a', cls:'nb-3a', code:'3A', label:'Outstanding Perf<br>Limited Potential' },
];

let nbGridHtml = NB_CELLS.map(cell => `
    <div class="ud-9box-section-cell ${cell.cls}"
         onclick="ud_show9BoxDetail('${cell.key}')">
        <div class="nbc-code">${cell.code}</div>
        <div class="nbc-label">${cell.label}</div>
        <div class="nbc-count">${nbBoxMap[cell.key].length}</div>
    </div>`).join('');

    // KPI summary row for 9-box
    let nbStars    = nbBoxMap['1a'].length;
    let nbHiPos    = nbBoxMap['1b'].length + nbBoxMap['2a'].length;
    let nbAtRisk   = nbBoxMap['3c'].length;
    let nbEnigmas  = nbBoxMap['1c'].length;

let nineBoxHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-ninebox">

        <h4 style="white-space: nowrap;">🗂 9-Box Talent Matrix — ${unitLabel}
            ${ud_thEye(
                '9-Box Talent Matrix',
                'Plots every scored employee on a 3×3 grid of Performance (X-axis) vs Leadership Potential (Y-axis). Use it to identify Stars, High Potentials, and At-Risk employees at a glance.',
                'e.g. Employee scores 4.2 (Outstanding) and assessor rated +0.8 above self (High Potential) → placed in box 1A — Star'
            )}
        </h4>
     <span class="ud-toggle-icon">▼</span>
     </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-ninebox">

        

       

        <!-- 2-column layout: left=matrix, right=detail -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start;">

            <!-- LEFT: 9-box matrix -->
            <div style="display:flex;gap:8px;align-items:stretch;">

                <!-- Y-axis label -->
                <div style="display:flex;align-items:center;justify-content:center;width:22px;">
                    <div style="writing-mode:vertical-rl;transform:rotate(180deg);
                                font-size:11px;font-weight:700;color:#0f1f3d;
                                text-transform:uppercase;letter-spacing:1.5px;
                                white-space:nowrap;">
                        Leadership Potential ↑
                    </div>
                </div>

                <!-- Grid + X-axis -->
                <div style="flex:1;">
                    <div style="
                        display:grid;
                        grid-template-columns:repeat(3,1fr);
                        grid-template-rows:repeat(3,150px);
                        gap:6px;
                        margin-bottom:8px;
                    ">
                        ${NB_CELLS.map(cell => `
                        <div class="ud-9box-section-cell ${cell.cls}"
                             style="height:150px;padding:12px 8px;
                                    display:flex;flex-direction:column;
                                    align-items:center;justify-content:center;
                                    border-radius:8px;cursor:pointer;
                                    border:2px solid rgba(255,255,255,0.3);
                                    box-shadow:0 2px 6px rgba(0,0,0,.10);
                                    transition:transform .15s, box-shadow .15s;
                                    -webkit-print-color-adjust:exact;print-color-adjust:exact;"
                             onmouseover="this.style.transform='scale(1.04)';this.style.boxShadow='0 6px 18px rgba(0,0,0,.18)';"
                             onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 2px 6px rgba(0,0,0,.10)';"
                             onclick="ud_show9BoxDetail('${cell.key}')">
                            <div style="font-size:11px;font-weight:700;opacity:.75;margin-bottom:3px;">
                                ${cell.code}
                            </div>
                            <div style="font-size:10px;font-weight:600;line-height:1.4;text-align:center;opacity:.85;">
                                ${cell.label}
                            </div>
                            <div style="font-size:28px;font-weight:700;margin-top:8px;line-height:1;">
                                ${nbBoxMap[cell.key].length}
                            </div>
                        </div>`).join('')}
                    </div>

                    <!-- X-axis labels -->
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:4px;">
                        <div style="text-align:center;font-size:10px;font-weight:700;color:#495057;
                                    background:#f8f9fa;border-radius:4px;padding:4px 0;">Poor</div>
                        <div style="text-align:center;font-size:10px;font-weight:700;color:#495057;
                                    background:#f8f9fa;border-radius:4px;padding:4px 0;">Good</div>
                        <div style="text-align:center;font-size:10px;font-weight:700;color:#495057;
                                    background:#f8f9fa;border-radius:4px;padding:4px 0;">Outstanding</div>
                    </div>
                    <div style="text-align:center;font-size:11px;font-weight:700;
                                color:#0f1f3d;text-transform:uppercase;letter-spacing:.5px;margin-top:4px;">
                        Performance →
                    </div>
                </div>
            </div>

            <!-- RIGHT: Detail panel -->
            <div id="ud-9box-detail-panel"
     style="background:#f8f9fa;border-radius:10px;padding:18px;
            border:1px solid #e9ecef;
            height:100%;min-height:498px;
            display:flex;flex-direction:column;justify-content:flex-start;">
                <div id="ud-9box-detail-content"
                     style="color:#adb5bd;font-size:13px;text-align:center;">
                    <div style="font-size:40px;margin-bottom:10px;">🗂</div>
                    <div style="font-weight:600;color:#868e96;margin-bottom:6px;">No Box Selected</div>
                    Click any cell on the left to view the employees in that segment.
                </div>
            </div>         
        </div>
        
        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ 9-Box Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-9-box">Generate Insight</button>
            </div>
            <div id="ai-content-9-box" class="ai-body ai-insight-content">
                <p>Click Generate Insight for 9-box analysis<p>
            </div>
        </div> 
    </div>
</div>`;
window.ud_show9BoxDetail = function(key) {
    
    let employees = nbBoxMap[key] || [];
    let panel     = document.getElementById('ud-9box-detail-panel');
    let content   = document.getElementById('ud-9box-detail-content');
    if (!panel || !content) return;

    let cellInfo  = NB_CELLS.find(c => c.key === key);
    let labelText = cellInfo
        ? cellInfo.code + ' — ' + cellInfo.label.replace('<br>', ' / ')
        : key;

    // ── Empty state ──────────────────────────────────────────────────────
    if (!employees.length) {
        content.innerHTML = `
            <div style="text-align:center;color:#adb5bd;font-size:13px;padding:40px 0;">
                <div style="font-size:28px;margin-bottom:8px;">📭</div>
                No employees in box <strong>${labelText}</strong>
            </div>`;
        return;
    }

    // ── Pagination config ────────────────────────────────────────────────
    const PAGE_SIZE = 10;
    let currentPage = 0;
    const totalPages = Math.ceil(employees.length / PAGE_SIZE);

    // ── Row builder ──────────────────────────────────────────────────────
    function buildRows(page) {
        let start = page * PAGE_SIZE;
        let end   = Math.min(start + PAGE_SIZE, employees.length);
        return employees.slice(start, end).map(d => {
            let s    = parseFloat(d.total_score);
            let self = parseFloat(d.custom_total_self_score) || 0;
            let barW = Math.min(100, Math.round((s / 5) * 100));
            let barColor = s >= 4 ? '#28a745' : s >= 3 ? '#f4a100' : '#C8102E';
            return `<tr>
                <td>
                    <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
                    <div style="font-size:10px;color:#868e96;">${d.employee}</div>
                </td>
                <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
                <td style="font-size:11px;">${d.custom_unit || '—'}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:5px;">
                        <div style="flex:1;height:6px;background:#e9ecef;border-radius:3px;overflow:hidden;">
                            <div style="width:${barW}%;height:100%;background:${barColor};border-radius:3px;
                                        -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                        </div>
                        <span style="font-size:10px;font-weight:700;min-width:28px;color:${barColor};">
                            ${s.toFixed(2)}
                        </span>
                    </div>
                </td>
                <td style="text-align:center;font-size:11px;color:#868e96;">
                    ${self ? self.toFixed(2) : '—'}
                </td>
                <td>
                    ${['Approved','Accepted'].includes(d.workflow_state)
                        ? '<span class="ud-badge ud-badge-green">✓ Done</span>'
                        : d.custom_appraisal_status === 'Overdue'
                            ? '<span class="ud-badge ud-badge-red">Overdue</span>'
                            : '<span class="ud-badge ud-badge-orange">Pending</span>'}
                </td>
                <td>
                    <button class="ud-perf-action ud-act-view"
                        onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
                </td>
            </tr>`;
        }).join('');
    }

    // ── Pagination controls renderer ─────────────────────────────────────
    function renderPagination(page) {
        let start = page * PAGE_SIZE + 1;
        let end   = Math.min((page + 1) * PAGE_SIZE, employees.length);
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:8px 10px;border-top:1px solid #e9ecef;
                    background:#f8f9fa;border-radius:0 0 6px 6px;">
            <button id="nb-pg-prev"
                ${page === 0 ? 'disabled' : ''}
                style="padding:4px 12px;font-size:11px;font-weight:700;
                       border:1px solid #dee2e6;border-radius:4px;
                       background:${page === 0 ? '#f8f9fa' : '#fff'};
                       color:${page === 0 ? '#adb5bd' : '#495057'};
                       cursor:${page === 0 ? 'not-allowed' : 'pointer'};">
                ◀ Prev
            </button>
            <span style="font-size:11px;color:#868e96;">
                Showing <strong>${start}–${end}</strong> of <strong>${employees.length}</strong>
                &nbsp;·&nbsp; Page <strong>${page + 1}</strong> of <strong>${totalPages}</strong>
            </span>
            <button id="nb-pg-next"
                ${page >= totalPages - 1 ? 'disabled' : ''}
                style="padding:4px 12px;font-size:11px;font-weight:700;
                       border:1px solid #dee2e6;border-radius:4px;
                       background:${page >= totalPages - 1 ? '#f8f9fa' : '#fff'};
                       color:${page >= totalPages - 1 ? '#adb5bd' : '#495057'};
                       cursor:${page >= totalPages - 1 ? 'not-allowed' : 'pointer'};">
                Next ▶
            </button>
        </div>`;
    }

    // ── Full panel render ────────────────────────────────────────────────
    function renderPanel(page) {
        content.innerHTML = `

            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;
                        margin-bottom:10px;flex-wrap:wrap;gap:6px;">
                <div>
                    <div style="font-size:13px;font-weight:700;color:#0f1f3d;">${labelText}</div>
                    <div style="font-size:11px;color:#868e96;margin-top:2px;">
                        ${employees.length} employee${employees.length !== 1 ? 's' : ''} in this segment
                    </div>
                </div>
                <button id="nb-clear-btn"
                    style="background:none;border:1px solid #dee2e6;border-radius:6px;
                           padding:4px 10px;font-size:11px;cursor:pointer;color:#868e96;">
                    ✕ Clear
                </button>
            </div>

            <!-- Table wrapper with sticky header -->
            <div style="border:1px solid #e9ecef;border-radius:6px;overflow:hidden;">
                <div style="overflow-y:auto;max-height:340px;">
                    <table class="ud-table" style="font-size:11px;width:100%;">
                        <thead>
                            <tr>
                                <th style="position:sticky;top:0;z-index:5;
                                           background:#0f1f3d;color:#fff;
                                           -webkit-print-color-adjust:exact;
                                           print-color-adjust:exact;
                                           box-shadow:0 2px 4px rgba(0,0,0,.15);">Employee</th>
                                <th style="position:sticky;top:0;z-index:5;
                                           background:#0f1f3d;color:#fff;
                                           -webkit-print-color-adjust:exact;
                                           print-color-adjust:exact;
                                           box-shadow:0 2px 4px rgba(0,0,0,.15);">Grade</th>
                                <th style="position:sticky;top:0;z-index:5;
                                           background:#0f1f3d;color:#fff;
                                           -webkit-print-color-adjust:exact;
                                           print-color-adjust:exact;
                                           box-shadow:0 2px 4px rgba(0,0,0,.15);">Unit</th>
                                <th style="position:sticky;top:0;z-index:5;
                                           background:#0f1f3d;color:#fff;min-width:120px;
                                           -webkit-print-color-adjust:exact;
                                           print-color-adjust:exact;
                                           box-shadow:0 2px 4px rgba(0,0,0,.15);">Score</th>
                                <th style="position:sticky;top:0;z-index:5;text-align:center;
                                           background:#0f1f3d;color:#fff;
                                           -webkit-print-color-adjust:exact;
                                           print-color-adjust:exact;
                                           box-shadow:0 2px 4px rgba(0,0,0,.15);">Self</th>
                                <th style="position:sticky;top:0;z-index:5;
                                           background:#0f1f3d;color:#fff;
                                           -webkit-print-color-adjust:exact;
                                           print-color-adjust:exact;
                                           box-shadow:0 2px 4px rgba(0,0,0,.15);">Status</th>
                                <th style="position:sticky;top:0;z-index:5;
                                           background:#0f1f3d;color:#fff;
                                           -webkit-print-color-adjust:exact;
                                           print-color-adjust:exact;
                                           box-shadow:0 2px 4px rgba(0,0,0,.15);">Action</th>
                            </tr>
                        </thead>
                        <tbody id="nb-table-body">
                            ${buildRows(page)}
                        </tbody>
                    </table>
                </div>

                <!-- Pagination bar (only shown if > PAGE_SIZE) -->
                ${employees.length > PAGE_SIZE ? renderPagination(page) : ''}
            </div>`;

        // ── Bind buttons after innerHTML is set ──────────────────────────
        let prevBtn = document.getElementById('nb-pg-prev');
        let nextBtn = document.getElementById('nb-pg-next');
        let clearBtn = document.getElementById('nb-clear-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentPage > 0) {
                    currentPage--;
                    document.getElementById('nb-table-body').innerHTML = buildRows(currentPage);
                    // Re-render pagination controls
                    let pg = content.querySelector('#nb-pg-prev').closest('div');
                    pg.outerHTML = renderPagination(currentPage);
                    bindPagination();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                    document.getElementById('nb-table-body').innerHTML = buildRows(currentPage);
                    let pg = content.querySelector('#nb-pg-prev').closest('div');
                    pg.outerHTML = renderPagination(currentPage);
                    bindPagination();
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                content.innerHTML = `
                    <div style="text-align:center;color:#adb5bd;font-size:13px;padding:40px 0;">
                        <div style="font-size:40px;margin-bottom:10px;">🗂</div>
                        <div style="font-weight:600;color:#868e96;margin-bottom:6px;">No Box Selected</div>
                        Click any cell on the left to view the employees in that segment.
                    </div>`;
            });
        }
    }

    // ── Pagination rebind helper ──────────────────────────────────────────
    function bindPagination() {
        let prevBtn  = document.getElementById('nb-pg-prev');
        let nextBtn  = document.getElementById('nb-pg-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                if (currentPage > 0) {
                    currentPage--;
                    document.getElementById('nb-table-body').innerHTML = buildRows(currentPage);
                    let pg = content.querySelector('#nb-pg-prev').closest('div');
                    pg.outerHTML = renderPagination(currentPage);
                    bindPagination();
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                if (currentPage < totalPages - 1) {
                    currentPage++;
                    document.getElementById('nb-table-body').innerHTML = buildRows(currentPage);
                    let pg = content.querySelector('#nb-pg-prev').closest('div');
                    pg.outerHTML = renderPagination(currentPage);
                    bindPagination();
                }
            });
        }
    }
    function renderReportSections() {
    let selected = report_type_field.get_value() || '';

    let html = '';

    if (!selected || selected === 'Completion Status') {
        html =
            kpiHtml +
            completionHtml;
    } else {
        const reportMap = {
            'Bell Curve Distribution': bellHtml,
            'Performance Tracker': performerHtml,
            '9-Box Talent Matrix': nineBoxHtml,
            'Galfar Values & Competency': compHtml,
            'Historical Performance': histHtml,
            'Average Rating': avgRatingHtml,
            'Appraisal Aging': agingHtml,
            'Assessor Effectiveness': assessorEffHtml,
            'Calibration Summary': calibrationHtml,
            'Compliance Dashboard': complianceHtml,
            'Performance vs Compensation': perfCompHtml,
            'Promotion Eligibility': promotionEligibilityHtml,
            'Succession Readiness': successionReadinessHtml,
            'Learning & Development': ldHtml
        };

        html = reportMap[selected] || '';
    }

    $page.find('#ud-main').html(html);
}
    // ── Initial render ───────────────────────────────────────────────────
    renderPanel(0);
};

window.ud_9BoxData = {
    summary: Object.fromEntries(
        NB_CELLS.map(cell => [
            cell.key,
            {
                code: cell.code,
                label: cell.label.replace('<br>', ' / '),
                count: nbBoxMap[cell.key].length,
                employees: nbBoxMap[cell.key].map(d => ({
                    employee: d.employee,
                    employee_name: d.employee_name,
                    grade: d.custom_grade,
                    unit: d.custom_unit,
                    score: parseFloat(d.total_score) || 0,
                    self_score: parseFloat(d.custom_total_self_score) || 0,
                    status: d.workflow_state
                }))
            }
        ])
    ),
    totals: {
        stars: nbBoxMap['1a'].length,
        high_potential: nbBoxMap['1b'].length + nbBoxMap['2a'].length,
        at_risk: nbBoxMap['3c'].length,
        enigmas: nbBoxMap['1c'].length,
        total_scored: nbScored.length
    }
};
    // ── Bell Curve Section ─────────────────────────────────────────────
            // NOTE: All 3 panels are visible in DOM (no display:none) — hidden via CSS class for screen only
            let bellHtml = `
            <div class="ud-section">
                <div class="ud-section-header ud-toggle" data-target="ud-body-bell">
                <h4 style="white-space: nowrap;">🔔 Bell Curve Distribution — ${unitLabel}
                    ${ud_thEye('Bell Curve Distribution',
                        'Compares actual rating distribution against the target bell curve. Significant deviation indicates lenient or stringent assessors.',
                        'Target distribution:\n  A (Excellent)  = 10% of scored employees\n  B (Very Good)   = 20%\n  C (Good)        = 50%\n  D (Acceptable)  = 15%\n  E (Poor)        = 5%\n\nTarget count = Total scored × target %\nActual count = COUNT per grade bucket',
                        'e.g. 100 scored employees → Target A = 10, Actual A = 25 → Lenient signal')}
                </h4>
                   
                    <div style="display:flex;align-items:left;gap:8px;" onclick="event.stopPropagation();">
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
            
// ── Segment the scored data ───────────────────────────────────────────────
let perfScored     = data.filter(d => parseFloat(d.total_score) >= 0);

let perfTopList    = [...perfScored]
    .filter(d => parseFloat(d.total_score) >= 4.0 && ['Approved','Accepted'].includes(d.workflow_state))
    .sort((a, b) => parseFloat(b.total_score) - parseFloat(a.total_score));

let perfStrongList = []; // removed — no longer used

let perfMiddleList = [...perfScored]
    .filter(d => parseFloat(d.total_score) >= 3.0
              && parseFloat(d.total_score) < 4.0
              && ['Approved','Accepted'].includes(d.workflow_state))
    .sort((a, b) => parseFloat(b.total_score) - parseFloat(a.total_score));

let perfLowList    = [...perfScored]
    .filter(d => parseFloat(d.total_score) >= 1.0
              && parseFloat(d.total_score) < 3.0
              && ['Approved','Accepted'].includes(d.workflow_state))
    .sort((a, b) => parseFloat(a.total_score) - parseFloat(b.total_score));

let perfCritical   = perfLowList.filter(d => parseFloat(d.total_score) <= 2.0);
let perfAvgScoreVal = perfScored.length
    ? (perfScored.reduce((s, d) => s + parseFloat(d.total_score), 0) / perfScored.length).toFixed(2)
    : 'N/A';

 
// ── Per-unit heatmap data ─────────────────────────────────────────────────
let perfUnitHeat = {};
perfScored.forEach(d => {
    let u = d.custom_unit || 'Unknown';
    if (!perfUnitHeat[u]) perfUnitHeat[u] = { e: 0, d: 0, c: 0, b: 0, a: 0, scores: [], total: 0 };
    let v = parseFloat(d.total_score);
    perfUnitHeat[u].total++;
    perfUnitHeat[u].scores.push(v);
    if (v <= 1.0)       perfUnitHeat[u].e++;
    else if (v <= 2.0)  perfUnitHeat[u].d++;
    else if (v <= 3.0)  perfUnitHeat[u].c++;
    else if (v <= 4.0)  perfUnitHeat[u].b++;
    else                perfUnitHeat[u].a++;
});
 
function heatCell(n, total, hex) {
    let p  = total ? Math.round(n / total * 100) : 0;
    let bg = p >= 25 ? hex : p >= 10 ? hex + '55' : 'transparent';
    let fc = p >= 25 ? '#fff' : '#333';
    return `<td style="background:${bg};color:${fc};-webkit-print-color-adjust:exact;print-color-adjust:exact;border-bottom:1px solid #e9ecef;">
        ${n} <span style="font-size:9px;opacity:.75;">(${p}%)</span>
    </td>`;
}
 
let heatRows = Object.keys(perfUnitHeat).sort().map(u => {
    let h   = perfUnitHeat[u];
    let avg = (h.scores.reduce((a, b) => a + b, 0) / h.scores.length).toFixed(2);
    let tp  = Math.round((h.a / h.total) * 100);
    let lp  = Math.round(((h.e + h.d) / h.total) * 100);
    return `<tr>
        <td style="font-weight:700;padding:8px 10px;border-bottom:1px solid #e9ecef;">${u}</td> 
        ${heatCell(h.a, h.total, '#28a745 ')}
        ${heatCell(h.b, h.total, '#AED581 ')}
        ${heatCell(h.c, h.total, '#FFEE58 ')}
        ${heatCell(h.d, h.total, '#ffc107 ')}
        ${heatCell(h.e, h.total, '#C8102E')}
        <td style="font-weight:700;padding:8px 10px;border-bottom:1px solid #e9ecef;color:#7b1fa2;">${avg}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e9ecef;">
            <span class="ud-badge" style="background:rgba(244,161,0,.15);color:#28a745;">${tp}%</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e9ecef;">
            <span class="ud-badge ud-badge-red">${lp}%</span>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="9" style="text-align:center;padding:20px;color:#adb5bd;">No scored appraisals</td></tr>`;
 
// ── Top performers ≥ 4.0 ─────────────────────────────────────────────────
let topTableRows = perfTopList.map((d, i) => {
    let band = perfBand(d.total_score);
    frappe.open_in_new_tab = true;
    return `<tr>
        <td>${perfRankBadge(i)}</td>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
        <td style="font-size:11px;">${d.custom_unit || '—'}</td>
        <td style="font-size:11px;">${d.custom_division || '—'}</td>
        <td style="text-align:center;font-size:11px;">
            ${d.custom_total_self_score ? parseFloat(d.custom_total_self_score).toFixed(2) : '—'}
        </td>
        <td style="text-align:center;font-weight:700;font-size:14px;color:#28a745;">
            ${parseFloat(d.total_score).toFixed(2)}
        </td>
        
        <td>${perfScoreBar(d.total_score, '#28a745')}</td>
        <td><span class="ud-badge ${band.cls}">${band.label}</span></td>
        <td>${perfStatusBadge(d)}</td>
        <td>
            
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="11" style="text-align:center;padding:20px;color:#adb5bd;">No top performers (≥ 4.0) found</td></tr>`;
 
// ── Strong performers 3.5–4.0 ─────────────────────────────────────────────
let strongTableRows = perfStrongList.map((d, i) => {
    let band = perfBand(d.total_score);
    frappe.open_in_new_tab = true;
    return `<tr>
        <td>${perfRankBadge(i)}</td>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
        <td style="font-size:11px;">${d.custom_unit || '—'}</td>
        <td style="font-size:11px;">${d.custom_division || '—'}</td>
        <td style="text-align:center;font-size:11px;">
            ${d.custom_total_self_score ? parseFloat(d.custom_total_self_score).toFixed(2) : '—'}
        </td>
        <td style="text-align:center;font-weight:700;font-size:14px;color:#0f1f3d;">
            ${parseFloat(d.total_score).toFixed(2)}
        </td>
        
        <td>${perfScoreBar(d.total_score, '#0f1f3d')}</td>
        <td><span class="ud-badge ${band.cls}">${band.label}</span></td>
        <td>${perfStatusBadge(d)}</td>
        <td>
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="11" style="text-align:center;padding:20px;color:#adb5bd;">No strong performers (3.5–4.0) found</td></tr>`;
 

// ── Middle performers 2.5–3.5 ─────────────────────────────────────────────
let MiddleTableRows = perfMiddleList.map((d, i) => {
    let band = perfBand(d.total_score);
    frappe.open_in_new_tab = true;
    return `<tr>
        <td>${perfRankBadge(i)}</td>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
        <td style="font-size:11px;">${d.custom_unit || '—'}</td>
        <td style="font-size:11px;">${d.custom_division || '—'}</td>
         <td style="text-align:center;font-size:11px;">
            ${d.custom_total_self_score ? parseFloat(d.custom_total_self_score).toFixed(2) : '—'}
        </td>
        <td style="text-align:center;font-weight:700;font-size:14px;color:#f4a100;">
            ${parseFloat(d.total_score).toFixed(2)}
        </td>
       
        <td>${perfScoreBar(d.total_score, '#f4a100')}</td>
        <td><span class="ud-badge ${band.cls}">${band.label}</span></td>
        <td>${perfStatusBadge(d)}</td>
        <td>
            
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="11" style="text-align:center;padding:20px;color:#adb5bd;">No top performers (≥ 4.0) found</td></tr>`;
 

// ── Succession / retention risk rows ─────────────────────────────────────
let retentionAtRisk = [...perfTopList, ...perfStrongList].filter(d => {
    return perfRetentionRisk(d) !== 'l';
});
let retBannerText = retentionAtRisk.length
    ? `${retentionAtRisk.length} high/strong performer(s) have incomplete or overdue appraisals — review urgently.`
    : 'All high and strong performers have completed appraisals. No immediate retention risk detected.';
 
let successionRows = [...perfTopList, ...perfStrongList].map(d => {
    let r = perfRetentionRisk(d);
    frappe.open_in_new_tab = true;
    return `<tr>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td style="font-size:11px;">${d.custom_unit || '—'}</td>
        <td style="font-size:11px;">${d.custom_division || '—'}</td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
        <td style="text-align:center;font-weight:700;color:#f4a100;">${parseFloat(d.total_score).toFixed(2)}</td>
        <td>${perfStatusBadge(d)}</td>
        <td style="text-align:center;">${riskChip(r)}</td>
        <td>
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="8" style="text-align:center;padding:20px;color:#adb5bd;">No data</td></tr>`;
 
// ── Low performer table rows ──────────────────────────────────────────────
let lowTableRows = perfLowList.map((d, i) => {
    let band = perfBand(d.total_score);
    let r    = perfPipRisk(d.total_score);
    let empNameSafe = (d.employee_name || d.employee).replace(/'/g, "\\'");
    frappe.open_in_new_tab = true;
    return `<tr>
        <td>${perfRankBadge(i)}</td>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
        <td style="font-size:11px;">${d.custom_unit || '—'}</td>
        <td style="font-size:11px;">${d.custom_division || '—'}</td>
        <td style="text-align:center;font-size:11px;">
            ${d.custom_total_self_score ? parseFloat(d.custom_total_self_score).toFixed(2) : '—'}
        </td>
        <td style="text-align:center;font-weight:700;font-size:14px;color:#C8102E;">
            ${parseFloat(d.total_score).toFixed(2)}
        </td>
        
        <td>${perfScoreBar(d.total_score, '#C8102E')}</td>
        <td><span class="ud-badge ${band.cls}">${band.label}</span></td>
        <td>${perfStatusBadge(d)}</td>
        <td style="text-align:center;">${riskChip(r, { h:'Critical', m:'Review', l:'Monitor' })}</td>
        <td>
           
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="12" style="text-align:center;padding:20px;color:#adb5bd;">No low performers (&lt; 2.5) found</td></tr>`;
 
// ── PIP tracker rows ──────────────────────────────────────────────────────
let pipRows = perfLowList.map(d => {
    let r = perfPipRisk(d.total_score);
    let empNameSafe = (d.employee_name || d.employee).replace(/'/g, "\\'");
    frappe.open_in_new_tab = true;
    return `<tr>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td style="font-size:11px;">${d.custom_unit || '—'}</td>
        <td style="font-size:11px;">${d.custom_division || '—'}</td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
        <td style="text-align:center;font-weight:700;color:#C8102E;">${parseFloat(d.total_score).toFixed(2)}</td>
        <td>${perfStatusBadge(d)}</td>
        <td style="text-align:center;">${riskChip(r, { h:'Critical ≤2.0', m:'Review ≤2.25', l:'Monitor ≤2.5' })}</td>
        <td><span class="ud-badge ud-badge-orange">To Initiate</span></td>
        <td>
            <button class="ud-perf-action ud-act-pip"
                onclick="frappe.msgprint('Initiating PIP for ${empNameSafe}')">Initiate PIP</button>
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="9" style="text-align:center;padding:20px;color:#adb5bd;">No employees require PIP at this time</td></tr>`;
 
let pipBannerText = perfCritical.length
    ? `🚨 ${perfCritical.length} employee(s) score ≤ 2.0 — immediate PIP review required.`
    : 'No critical performers (≤ 2.0) detected in this period.';
    
let performerHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-performers">
        <h4 style="white-space: nowrap;">🏆 High / Low Performer Tracker — ${unitLabel}
        ${ud_thEye('High / Low Performer Tracker',"Segments employees into performance bands based on final appraisal scores. Bands are derived from the assessor's final score.",
            "Formula: Band = score ≥ 4.0 → Top | 3.0–3.99 → Middle | &lt; 3.0 → Low | ≤ 2.0 → Critical (PIP)")}
        </h4>
        
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-performers">

        <!-- ── KPI Summary Row ── -->
        <div class="ud-perf-kpi-row">
            <div class="ud-perf-kpi gold" id="udp-kpi-top" style="cursor:pointer;" title="Open Top Performers list">
               
                <div class="pkv">${perfTopList.length}</div>
                <div class="pkl">
                    Top Performers
                    ${ud_thEye(
                        'Top Performers',
                        'Employees whose final appraisal score is 4.0 or above.',
                        'Score ≥ 4.0'
                    )}
                </div>
            </div>

            <div class="ud-perf-kpi red" id="udp-kpi-middle" style="cursor:pointer;" title="Open Middle Performers list">
                
                <div class="pkv">${perfMiddleList.length}</div>
                <div class="pkl">
                    Middle Performers
                    ${ud_thEye(
                        'Middle Performers',
                        'Employees performing at an acceptable level but below top performer range.',
                        '3.0 ≤ Score < 4.0'
                    )}
                </div>
            </div>

            <div class="ud-perf-kpi purple" id="udp-kpi-low" style="cursor:pointer;" title="Open Low Performers list">
                
                <div class="pkv">${perfLowList.length}</div>
                <div class="pkl">
                    Low Performers
                    ${ud_thEye(
                        'Low Performers',
                        'Employees requiring coaching or development attention.',
                        '2.0 < Score < 3.0'
                    )}
                </div>
            </div>

            <div class="ud-perf-kpi purple" id="udp-kpi-critical" style="cursor:pointer;" title="Open Critical performers list">
                
                <div class="pkv">${perfCritical.length}</div>
                <div class="pkl">
                    Critical (PIP)
                    ${ud_thEye(
                        'Critical / PIP',
                        'Employees with serious performance concerns who may require a Performance Improvement Plan.',
                        'Score ≤ 2.0'
                    )}
                </div>
            </div>

            <div class="ud-perf-kpi green">
                
                <div class="pkv">${perfAvgScoreVal}</div>
                <div class="pkl">
                    Avg Score (Scored)
                    ${ud_thEye(
                        'Average Score',
                        'Average appraisal score across all employees with completed assessments.',
                        'Average = Sum of Scores ÷ Number of Scored Employees'
                    )}
                </div>
            </div>
        </div>

        <!-- ── Sub-tab buttons ── -->
        <div class="ud-perf-tabs" id="ud-perf-tabs-inner">
            <div class="ud-perf-tab pt-all" style="background:#00796b; border-color:#00796b; color:#fff;"
                onclick="(function(el){
                    let root = el.closest('#ud-body-performers');
                    let tabs = root.querySelectorAll('.ud-perf-tab');
                    tabs[0].style='background:#00796b; border-color:#00796b; color:#fff;';
                    tabs[1].style='background:#fff; border-color:#28a745; color:#28a745;';
                    tabs[2].style='background:#fff; border-color:#ffc107; color:#ffc107;';
                    tabs[3].style='background:#fff; border-color:#C8102E; color:#C8102E;';
                    el.style='background:#00796b; border-color:#00796b; color:#fff; font-weight:900;';
                    root.querySelectorAll('.ud-perf-panel').forEach(p=>p.classList.remove('active'));
                    root.querySelector('#udp-all').classList.add('active');
                })(this)">📊 Score Heatmap</div>
            <div class="ud-perf-tab" style="background:#fff; border-color:#28a745; color:#28a745;"
                onclick="(function(el){
                    let root = el.closest('#ud-body-performers');
                    let tabs = root.querySelectorAll('.ud-perf-tab');
                    tabs[0].style='background:#fff; border-color:#00796b; color:#00796b;';
                    tabs[1].style='background:#fff; border-color:#28a745; color:#28a745;';
                    tabs[2].style='background:#fff; border-color:#ffc107; color:#ffc107;';
                    tabs[3].style='background:#fff; border-color:#C8102E; color:#C8102E;';
                    el.style='background:#28a745; border-color:#28a745; color:#fff;';
                    root.querySelectorAll('.ud-perf-panel').forEach(p=>p.classList.remove('active'));
                    root.querySelector('#udp-top').classList.add('active');
                })(this)">Top Talent (${perfTopList.length})</div>
            <div class="ud-perf-tab" style="background:#fff; border-color:#ffc107; color:#ffc107;"
                onclick="(function(el){
                    let root = el.closest('#ud-body-performers');
                    let tabs = root.querySelectorAll('.ud-perf-tab');
                    tabs[0].style='background:#fff; border-color:#00796b; color:#00796b;';
                    tabs[1].style='background:#fff; border-color:#28a745; color:#28a745;';
                    tabs[2].style='background:#fff; border-color:#ffc107; color:#ffc107;';
                    tabs[3].style='background:#fff; border-color:#C8102E; color:#C8102E;';
                    el.style='background:#ffc107; border-color:#ffc107; color:#fff;';
                    root.querySelectorAll('.ud-perf-panel').forEach(p=>p.classList.remove('active'));
                    root.querySelector('#udp-middle').classList.add('active');
                })(this)">Middle Performers (${perfMiddleList.length})</div>
            <div class="ud-perf-tab" style="background:#fff; border-color:#C8102E; color:#C8102E;"
                onclick="(function(el){
                    let root = el.closest('#ud-body-performers');
                    let tabs = root.querySelectorAll('.ud-perf-tab');
                    tabs[0].style='background:#fff; border-color:#00796b; color:#00796b;';
                    tabs[1].style='background:#fff; border-color:#28a745; color:#28a745;';
                    tabs[2].style='background:#fff; border-color:#ffc107; color:#ffc107;';
                    tabs[3].style='background:#fff; border-color:#C8102E; color:#C8102E;';
                    el.style='background:#C8102E; border-color:#C8102E; color:#fff;';
                    root.querySelectorAll('.ud-perf-panel').forEach(p=>p.classList.remove('active'));
                    root.querySelector('#udp-low').classList.add('active');
                })(this)">Low Performers (${perfLowList.length})</div>
        </div>

        <!-- ══════════════ PANEL 1: Score Heatmap ══════════════ -->
        <div class="ud-perf-panel active" id="udp-all">
            <div style="font-size:11px;color:#868e96;margin-bottom:10px;">
                Score band distribution per unit. Cell color intensifies with higher concentration.
                Bands: E ≤1.0 | D 1–2 | C 2–3 | B 3–4 | A ≥4
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-heat-tbl">
                    <thead>
                        <tr>
                            <th style="text-align:left;width:140px;">Unit</th>
                            <th style="background:#28a745;">A ≥4</th>
                            <th style="background:#AED581;">B 3–4</th>
                            <th style="background:#FFEE58;">C 2–3</th>
                            <th style="background:#ffc107;color:#333;">D 1–2</th>
                            <th style="background:#C8102E;">E ≤1.0</th>
                            <th>Avg Score</th>
                            <th>Top % (A)</th>
                            <th>Low % (D+E)</th>
                        </tr>
                    </thead>
                    <tbody>${heatRows}</tbody>
                </table>
            </div>
            <div class="ai-insight-card" style="margin-top:20px;">
                <div class="ai-header">
                    <h4 style="white-space: nowrap;">✨ Performer Tracker Insights</h4>
                    <button class="btn btn-sm btn-primary" id="btn-ai-low-high-performance">Generate Insight</button>
                </div>
                <div id="ai-content-low-high-performance" class="ai-body ai-insight-content">
                    <p>Click Generate Insight for performance analysis</p>
                </div>
            </div>
        </div>

        <!-- ══════════════ PANEL 2: Top Talent ══════════════ -->
        <div class="ud-perf-panel" id="udp-top">
            <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin:0 0 8px;">
                🥇 Top Performers — Score ≥ 4.0
                <span style="font-size:11px;font-weight:400;color:#868e96;margin-left:8px;">(${perfTopList.length} employees)</span>
            </div>
            <div style="overflow-x:auto;margin-bottom:22px;">
                <table class="ud-table">
                    <thead><tr>
                        <th style="width:36px;">#</th>
                        <th>Employee</th>
                        <th>Grade</th>
                        <th>Unit</th>
                        <th>Division</th>
                        <th style="text-align:center;">Self Score</th>
                        <th style="text-align:center;">Score</th>
                        <th style="min-width:120px;">Score Bar</th>
                        <th>Band</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr></thead>
                    <tbody>${topTableRows}</tbody>
                </table>
            </div>
            <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin:0 0 8px;">
                🔄 Succession &amp; Retention Risk — All Top &amp; Strong Performers
            </div>
            <div class="ud-ret-banner">
                <div class="pbb-title">⚠ Retention Watch</div>
                <div>${retBannerText}</div>
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Employee</th>
                        <th>Unit</th>
                        <th>Division</th>
                        <th>Grade</th>
                        <th style="text-align:center;">Score</th>
                        <th>Appraisal Status</th>
                        <th style="text-align:center;">Retention Risk</th>
                        <th>Action</th>
                    </tr></thead>
                    <tbody>${successionRows}</tbody>
                </table>
            </div>
        </div>

        <!-- ══════════════ PANEL 2b: Middle Performers ══════════════ -->
        <div class="ud-perf-panel" id="udp-middle">
            <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin:0 0 8px;">
                🟠 Middle Performers — Score 3.0–3.99
                <span style="font-size:11px;font-weight:400;color:#868e96;margin-left:8px;">(${perfMiddleList.length} employees)</span>
            </div>
            <div style="overflow-x:auto;margin-bottom:22px;">
                <table class="ud-table">
                    <thead><tr>
                        <th style="width:36px;">#</th>
                        <th>Employee</th>
                        <th>Grade</th>
                        <th>Unit</th>
                        <th>Division</th>
                        <th style="text-align:center;">Self Score</th>
                        <th style="text-align:center;">Score</th>
                        <th style="min-width:120px;">Score Bar</th>
                        <th>Band</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr></thead>
                    <tbody>${MiddleTableRows}</tbody>
                </table>
            </div>
        </div>

        <!-- ══════════════ PANEL 3: Low Performers ══════════════ -->
        <div class="ud-perf-panel" id="udp-low">
            <div class="ud-pip-banner">
                <div class="pbb-title">🚨 Critical Alert</div>
                <div>${pipBannerText}</div>
            </div>
            <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin:0 0 8px;">
                📉 Low Performer Registry — Score &lt; 3.0
                <span style="font-size:11px;font-weight:400;color:#868e96;margin-left:8px;">(${perfLowList.length} employees)</span>
            </div>
            <div style="overflow-x:auto;margin-bottom:22px;">
                <table class="ud-table">
                    <thead><tr>
                        <th style="width:36px;">#</th>
                        <th>Employee</th>
                        <th>Grade</th>
                        <th>Unit</th>
                        <th>Division</th>
                        <th style="text-align:center;">Self Score</th>
                        <th style="text-align:center;">Score</th>
                        <th style="min-width:120px;">Score Bar</th>
                        <th>Band</th>
                        <th>Status</th>
                        <th style="text-align:center;">Risk</th>
                        <th>Action</th>
                    </tr></thead>
                    <tbody>${lowTableRows}</tbody>
                </table>
            </div>
        </div>

    </div>
</div>`;



let histHtml = `
<div class="ud-section" id="ud-hist-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-hist">
            <h4 style="white-space: nowrap;">📅 Historical Performance Tracking — ${unitLabel}</h4>

        <div class="ud-section-desc">
            <strong>Historical Performance Tracking</strong> shows grade distribution trends over multiple appraisal years sourced from Employee Previous Ratings.
            Use <strong>Year-on-Year</strong> to spot overall trends, <strong>Unit Comparison</strong> for benchmarking, and the <strong>Heatmap</strong> to identify consistently underperforming units.
        </div>
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-hist">
        <div class="ud-loading" id="ud-hist-loading">
            <span class="spinner-border spinner-border-sm"></span>
            Loading historical data...
        </div>
        <div id="ud-hist-content" style="display:none;"></div>
        <div id="ud-hist-empty"   style="display:none;padding:20px;text-align:center;color:#adb5bd;font-size:13px;"></div>
        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ Historical Performance Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-historical-performance">Generate Insight</button>
            </div>
            <div id="ai-content-historical-performance" class="ai-body ai-insight-content">
                <p>Click Generate Insight for historical performance analysis<p>
            </div>
        </div>
    </div>
</div>`;
// =========================================================================
// 1. THE COMPLETE HTML CONTENT STRINGS
// =========================================================================

// Main UI Section String (Includes your layout, your new top button, and your exact inline div)
let ldHtml = `
<div class="ud-section" id="ud-ld-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-ld" style="display: flex; justify-content: space-between; align-items: center;">
        <div style="flex: 1; margin-right: 15px;">
            <h4 style="white-space: nowrap;">🎓 Learning &amp; Development — \${unitLabel}</h4>
            <div class="ud-section-desc">
                <strong>Learning &amp; Development</strong> identifies skill gaps from competency assessor scores and recommends training programs.
                <strong>Critical gap</strong>: avg assessor score ≤ 2.0. <strong>Moderate</strong>: 2.0–3.0. <strong>On Track</strong>: &gt; 3.0.
                The Completion Linkage tab connects appraisal outcomes to L&amp;D effectiveness. The Matrix shows gaps per unit per competency.
            </div>
        </div>
        <div class="ud-header-actions" style="display: flex; align-items: center; gap: 10px; white-space: nowrap;">
            <button class="btn btn-sm btn-outline-primary" id="btn-open-ld-insights-modal">
                ✨ Insights
            </button>
            <span class="ud-toggle-icon">▼</span>
        </div>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-ld">
        <div class="ud-loading" id="ud-ld-loading">
            <span class="spinner-border spinner-border-sm"></span> Loading L&amp;D data...
        </div>
        <div id="ud-ld-body"></div>
        
        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header" style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="white-space: nowrap; margin: 0;">✨ Learning & Development Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-learning-development">Generate Insight</button>
            </div>
            <div id="ai-content-learning-development" class="ai-body ai-insight-content" style="margin-top: 10px;">
                <p>Click Generate Insight for learning & development analysis</p>
            </div>
        </div>
    </div>
</div>`;

// The Dialog Modal markup string
let ldModalHtml = `
<div class="modal fade" id="ldInsightsModal" tabindex="-1" role="dialog" aria-labelledby="ldInsightsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title" id="ldInsightsModalLabel">✨ AI Learning & Development Insights</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div id="modal-ai-content-target" class="ai-body ai-insight-content"></div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>`;


// =========================================================================
// 2. RUNTIME EVENT ROUTING & LINKAGE LOGIC
// =========================================================================
$(document).ready(function() {
    
    // 1. Inject the dialog modal shell globally into the page body if missing
    if ($('#ldInsightsModal').length === 0) {
        $('body').append(ldModalHtml);
    }

    // 2. Handle Top "Insights" Button Click
    $(document).on('click', '#btn-open-ld-insights-modal', function(e) {
        e.stopPropagation(); // Stops the primary accordion header section from closing
        
        // Show a loading feedback spinner directly inside the modal window 
        $('#modal-ai-content-target').html(`
            <div class="text-center p-4">
                <div class="spinner-border text-primary text-sm mb-2" role="status"></div>
                <p class="text-muted mb-0">Running engine generation pipeline...</p>
            </div>
        `);
        
        // Reveal the modal dialog frame immediately
        $('#ldInsightsModal').modal('show');
        
        // --- THE TRICK ---
        // Trigger the click event on your existing working button to run your perfect generation engine!
        $('#btn-ai-learning-development').trigger('click');

        // Watch the actual working div container. As soon as your existing function changes 
        // the text from "Evaluating..." or "Click Generate..." to the real rich generation data,
        // we instantly copy it into the modal!
        let checkCount = 0;
        let dataBridgeInterval = setInterval(function() {
            let currentContent = $('#ai-content-learning-development').html();
            checkCount++;

            // If the content is no longer the placeholder text and no longer shows a loading spinner
            if (!currentContent.includes('Click Generate Insight') && !currentContent.includes('spinner-border') && currentContent.trim() !== "") {
                // Perfect data is ready! Copy it directly into the modal container layout
                $('#modal-ai-content-target').html(currentContent);
                clearInterval(dataBridgeInterval); // Stop watching
            }
            
            // Safety break after 15 seconds to prevent memory leaks if generation fails
            if (checkCount > 200) {
                clearInterval(dataBridgeInterval);
                if ($('#modal-ai-content-target').html().includes('Running engine generation')) {
                    $('#modal-ai-content-target').html('<p class="text-danger p-3 text-center">Insight collection timed out. Please try again.</p>');
                }
            }
        }, 250); // Checks every 250ms
    });
});
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
                    <h4 style="white-space: nowrap;">👤 Employee Detail — ${unitLabel} (${total} records)</h4><span class="ud-toggle-icon">▼</span>
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


// ============================================================
//  UNIT APPRAISAL DASHBOARD — THREE NEW SECTIONS
//  Paste these blocks inside render_dashboard(), after histHtml
//  and before the $page.find('#ud-main').html(...) call.
// ============================================================

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION A: COMPLIANCE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

// Add this CSS to the existing <style> block (or append to $('head'))
$('head').append(`<style id="ud-compliance-styles">
    .ud-comp-dash-grid {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 10px; margin-bottom: 16px;
    }
    .ud-comp-dash-kpi {
        background: #fff; border-radius: 8px; padding: 12px 14px;
        text-align: center; border-top: 3px solid #dee2e6;
        box-shadow: 0 1px 6px rgba(0,0,0,.05);
    }
    .ud-comp-dash-kpi .ckv { font-size: 22px; font-weight: 700; line-height: 1.1; }
    .ud-comp-dash-kpi .ckl { font-size: 10px; font-weight: 600; color: #868e96;
        text-transform: uppercase; letter-spacing: 1px; margin-top: 3px; }
     .ud-comp-dash-kpi.c-red    { border-top-color: #C8102E; } .ud-comp-dash-kpi.c-red    .ckv { color: #C8102E; }
    .ud-comp-dash-kpi.c-amber  { border-top-color: #7b1fa2; } .ud-comp-dash-kpi.c-amber  .ckv { color: #7b1fa2; }
    .ud-comp-dash-kpi.c-yellow   { border-top-color: #FFEE58 ; } .ud-comp-dash-kpi.c-yellow   .ckv { color: #FFEE58 ; }
    .ud-comp-dash-kpi.c-green  { border-top-color: #28a745; } .ud-comp-dash-kpi.c-green  .ckv { color: #28a745; }

    .ud-policy-chip {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;
    }
    .ud-policy-overdue     { background: rgba(200,16,46,.12);  color: #C8102E; }
    .ud-policy-incomplete  { background: rgba(255,193,7,.15);  color: #e6a800; }
    .ud-policy-no-self     { background: rgba(108,117,125,.1); color: #495057; }
    .ud-policy-draft       { background: rgba(0,121,107,.1);   color: #00796b; }

    .ud-compliance-bar-wrap {
        display: flex; align-items: center; gap: 8px; min-width: 120px;
    }
    .ud-compliance-meter {
        flex: 1; height: 6px; background: #e9ecef;
        border-radius: 4px; overflow: hidden;
    }
    .ud-compliance-meter-fill { height: 100%; border-radius: 4px; }

    .ud-deviation-badge {
        font-size: 10px; font-weight: 700; padding: 2px 7px;
        border-radius: 10px; white-space: nowrap;
    }
    .ud-dev-critical  { background: rgba(200,16,46,.12);  color: #C8102E; }
    .ud-dev-warning   { background: rgba(255,193,7,.15);  color: #e6a800; }
    .ud-dev-ok        { background: rgba(40,167,69,.12);  color: #28a745; }

    @media print {
        .ud-comp-dash-grid { grid-template-columns: repeat(4,1fr) !important; }
    }
</style>`);

// ── Compliance metrics ────────────────────────────────────────────────────────
let complianceUnitMap = {};
data.forEach(d => {
    let u = d.custom_unit || 'Unknown';
    if (!complianceUnitMap[u]) {
        complianceUnitMap[u] = {
            total: 0, completed: 0, overdue: 0,
            noSelfScore: 0, longDraft: 0,
            deviations: []
        };
    }
    let cu = complianceUnitMap[u];
    cu.total++;
    if (['Approved','Accepted'].includes(d.workflow_state)) cu.completed++;
    if (d.custom_appraisal_status === 'Overdue') cu.overdue++;
        if (((!d.custom_total_self_score && (d.workflow_state != 'Draft'))  || (parseFloat(d.custom_total_self_score) === 0 && (d.workflow_state != 'Draft'))) && !['A1','A2','A3','A4'].includes(d.custom_grade || '')) cu.noSelfScore++;

    // Policy deviation: draft for > 30 days (using modified date)
    let modDate = (d.rollout_date || '').split(' ')[0];
    if (modDate && !['Approved','Accepted'].includes(d.workflow_state)) {
        let daysDiff = Math.floor(
            (new Date() - new Date(modDate)) / (1000 * 60 * 60 * 24)
        );
        cu.longDraft++;
        cu.deviations.push(`${d.employee_name||d.employee} — stalled ${daysDiff}d`);
        
    }
});

let totalUnits         = Object.keys(complianceUnitMap).length;
let fullyCompliantUnits = Object.values(complianceUnitMap)
    .filter(u => u.completed === u.total && u.overdue === 0).length;
let unitsWithOverdue   = Object.values(complianceUnitMap)
    .filter(u => u.overdue > 0).length;
let unitsNotStarted    = Object.values(complianceUnitMap)
    .filter(u => u.completed === 0).length;
let totalDeviations    = Object.values(complianceUnitMap)
    .reduce((s, u) => s + u.deviations.length, 0);

// Policy deviation detection across all employees
let policyDeviations = [];
data.forEach(d => {
    let issues = [];
    if (d.custom_appraisal_status === 'Overdue')
        issues.push({ type: 'Overdue', cls: 'ud-policy-overdue' });
    if (!['Approved','Accepted'].includes(d.workflow_state))
        issues.push({ type: 'Not Completed', cls: 'ud-policy-incomplete' });
    if (((!d.custom_total_self_score && (d.workflow_state != 'Draft'))  || (parseFloat(d.custom_total_self_score) === 0 && (d.workflow_state != 'Draft'))) && !['A1','A2','A3','A4'].includes(d.custom_grade || ''))
        issues.push({ type: 'No Self Score', cls: 'ud-policy-no-self' });
    if ((d.workflow_state || '') === 'Draft') {
        let modDate = (d.rollout_date || '').split(' ')[0];
        if (modDate) {
            let daysDiff = Math.floor(
                (new Date() - new Date(modDate)) / (1000 * 60 * 60 * 24)
            );
            if (daysDiff > 30)
                issues.push({ type: `Draft ${daysDiff}d`, cls: 'ud-policy-draft' });
        }
    }
    if (issues.length) policyDeviations.push({ d, issues });
});

// Unit compliance table rows
let complianceUnitRows = Object.keys(complianceUnitMap).sort().map(u => {
    let cu    = complianceUnitMap[u];
    let rate  = cu.total ? Math.round((cu.completed / cu.total) * 100) : 0;
    let barColor = rate >= 80 ? '#28a745' : rate >= 50 ? '#ffc107' : '#C8102E';
    let riskLevel = cu.overdue > 0 ? 'ud-dev-critical' :
                    (cu.completed < cu.total ? 'ud-dev-warning' : 'ud-dev-ok');
    let riskText  = cu.overdue > 0 ? 'At Risk' :
                    (cu.completed < cu.total ? 'In Progress' : 'Compliant');
    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;">${cu.total}</td>
        <td style="text-align:center;color:#28a745;font-weight:700;">${cu.completed}</td>
        <td style="text-align:center;color:#e6a800;font-weight:700;">${cu.longDraft}</td>
        <td style="text-align:center;color:#C8102E;font-weight:700;">${cu.overdue}</td>
        <td style="text-align:center;color:#495057;">${cu.noSelfScore}</td>
        
        <td>
            <div class="ud-compliance-bar-wrap">
                <div class="ud-compliance-meter">
                    <div class="ud-compliance-meter-fill"
                         style="width:${rate}%;background:${barColor};
                                -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                </div>
                <span style="font-size:10px;font-weight:700;min-width:32px;">${rate}%</span>
            </div>
        </td>
        <td style="text-align:center;">
            <span class="ud-deviation-badge ${riskLevel}">${riskText}</span>
        </td>
    </tr>`;
}).join('');

window.policyComplianceData = Object.keys(complianceUnitMap)
.sort()
.map(unit => {

    const cu = complianceUnitMap[unit];

    const complianceRate = cu.total
        ? Math.round((cu.completed / cu.total) * 100)
        : 0;

    let riskStatus = "Compliant";

    if (cu.overdue > 0) {
        riskStatus = "At Risk";
    } else if (cu.completed < cu.total) {
        riskStatus = "In Progress";
    }

    return {
        unit: unit,
        total_appraisals: cu.total,
        completed: cu.completed,
        overdue: cu.overdue,
        no_self_score: cu.noSelfScore,
        long_draft: cu.longDraft,
        compliance_rate: complianceRate,
        risk_status: riskStatus
    };
});

// Policy deviation rows (top 50)
let policyDevRows = policyDeviations.slice(0, 50).map(({ d, issues }) => {
    let chips = issues.map(i =>
        `<span class="ud-policy-chip ${i.cls}">${i.type}</span>`
    ).join(' ');
    return `<tr>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name||d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td style="font-size:11px;">${d.custom_unit||'—'}</td>
        <td style="font-size:11px;">${d.custom_division||'—'}</td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade||'—'}</span></td>
        <td>${chips}</td>
        <td>
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="6"
    style="text-align:center;padding:20px;color:#adb5bd;">
    No policy deviations detected
</td></tr>`;

let complianceHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-compliance">
    <h4 style="white-space: nowrap;">🛡 Compliance Dashboard — ${unitLabel}</h4>
        <div class="ud-section-desc">
    <strong>Compliance Dashboard</strong> monitors appraisal policy adherence across units.
    Flags include: <strong>Overdue</strong> (past deadline), <strong>No Self Score</strong> (employee skipped self-assessment),
    and <strong>Stalled Draft &gt;30 days</strong> (inactive appraisal). Fully Compliant = all completed with no overdue.
</div>
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-compliance">
 
        <div class="ud-comp-dash-grid">
            <div class="ud-comp-dash-kpi c-amber">
                <div class="ckv">${unitsWithOverdue}</div>
                <div class="ckl">
                    Units with Overdue
                    ${ud_thEye(
                        'Units with Overdue',
                        'Number of units that have at least one appraisal flagged as Overdue — meaning the rollout deadline has passed without the appraisal being completed.',
                        'Units with Overdue = COUNT(DISTINCT custom_unit)\nWHERE custom_appraisal_status = "Overdue"\n\nAn overdue appraisal has passed its rollout date\nwithout reaching workflow_state IN [Approved, Accepted].',
                        'e.g. Units A, C, and F each have at least 1 overdue appraisal → Units with Overdue = 3'
                    )}
                </div>
            </div>
            <div class="ud-comp-dash-kpi c-amber">
    <div class="ckv">${totalDeviations}</div>
    <div class="ckl">
        Policy Deviations
       
    </div>
</div>
            <div class="ud-comp-dash-kpi c-amber">
                <div class="ckv">${unitsNotStarted}</div>
                <div class="ckl">
                    Units Not Started
                    ${ud_thEye(
                        'Units Not Started',
                        'Number of units where zero appraisals have been completed — no employee in the unit has reached Approved or Accepted state yet.',
                        'Units Not Started = COUNT(DISTINCT custom_unit)\nWHERE completed = 0\n\nWhere:\n  completed = COUNT(appraisals WHERE\n    workflow_state IN [Approved, Accepted])\n  per unit\n\nA unit with all appraisals still in Draft or\nPending for Assessor contributes 1 to this count.',
                        'e.g. Unit D has 10 appraisals all in Draft → completed = 0 → Not Started'
                    )}
                </div>
            </div>
            <div class="ud-comp-dash-kpi c-amber">
                <div class="ckv">${fullyCompliantUnits} / ${totalUnits}</div>
                <div class="ckl">
                    Fully Compliant Units
                    ${ud_thEye(
                        'Fully Compliant Units',
                        'Number of units where all appraisals are completed AND no appraisals are flagged as overdue. These units have fully met all policy requirements for the current cycle.',
                        'Fully Compliant = COUNT(DISTINCT custom_unit)\nWHERE completed = total AND overdue = 0\n\nWhere:\n  completed = COUNT(workflow_state IN [Approved, Accepted])\n  total     = COUNT(all appraisals in unit)\n  overdue   = COUNT(custom_appraisal_status = "Overdue")\n\nAll three conditions must be true simultaneously.',
                        'e.g. Unit B: 20 total, 20 completed, 0 overdue → Fully Compliant\n     Unit E: 15 total, 15 completed, 2 overdue → NOT compliant'
                    )}
                </div>
            </div>
        </div>
 
        <div class="ud-2col" style="margin-bottom:16px;">
            <div>
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Compliance Rate per Unit (%)
                    ${ud_thEye(
                        'Compliance Rate per Unit',
                        'Horizontal bar chart showing the percentage of appraisals completed in each unit. Color of each bar reflects the compliance health of that unit.',
                        'Compliance Rate = (Completed ÷ Total) × 100%\n\nWhere:\n  Completed = workflow_state IN [Approved, Accepted]\n  Total     = all appraisal records for the unit\n\nBAR COLOUR:\n  Green  ≥ 80% → On Track\n  Amber  ≥ 50% → In Progress\n  Red    < 50% → At Risk',
                        'e.g. Unit A: 36 completed out of 45 total → 80% → Green bar'
                    )}
                </div>
                <div style="position:relative;width:100%;height:${Math.max(200, Object.keys(complianceUnitMap).length * 32)}px;">
                    <canvas id="ud-compliance-bar"></canvas>
                </div>
            </div>
            <div>
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Policy Deviation Breakdown
                    ${ud_thEye(
                        'Policy Deviation Breakdown',
                        'Doughnut chart showing the distribution of policy violations across three deviation categories detected in the current appraisal cycle.',
                        'DEVIATION CATEGORIES:\nOverdue       = custom_appraisal_status = "Overdue"\n                  Appraisal has passed its rollout deadline without completion\n\n  No Self Score = workflow_state ≠ Draft\n                  AND (custom_total_self_score = 0 OR is null)\n                  AND grade NOT IN [A1, A2, A3, A4]\n                  Non-worker employees who submitted without a self score\n\n  Pending       = workflow_state NOT IN [Approved, Accepted]\n                  Appraisals still in progress across all states\n\nNOTE: One employee can appear in multiple categories.',
                        'e.g. 10 Overdue + 5 No Self Score + 25 Pending → donut shows 3 segments proportional to these counts'
                    )}
                </div>
                <div style="position:relative;width:100%;height:220px;">
                    <canvas id="ud-compliance-donut"></canvas>
                </div>
            </div>
        </div>
 
        <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
            📋 Unit-wise Compliance Status
        </div>
        <div style="overflow-x:auto;margin-bottom:18px;">
            <table class="ud-table">
                <thead><tr>
                    <th>Unit</th>
                    <th style="text-align:center;">Total ${ud_thEye('Total','All appraisals for this unit regardless of status.','No of appraisals in the unit','')}</th>
                    <th style="text-align:center;">Completed ${ud_thEye('Completed','Appraisals in Approved or Accepted state.','','')}</th>
                    <th style="text-align:center;">Pending ${ud_thEye('Pending','Appraisals not yet completed (Total − Completed).','Total − Completed','')}</th>
                    <th style="text-align:center;">Overdue ${ud_thEye('Overdue','Appraisals flagged Overdue — past rollout deadline.','','')}</th>
                    <th style="text-align:center;">No Self Score ${ud_thEye('No Self Score','Non-worker employees (grade not A1–A4) who have submitted their appraisal but have no self score filled in.',
                    '','e.g. 5 staff employees submitted appraisal without self-assessment')}</th>
                    <th>Completion Rate ${ud_thEye('Completion Rate','Percentage of appraisals completed in this unit.','(Completed ÷ Total) × 100%\n≥ 80% → green\n≥ 50% → Yellow\n< 50% → red','e.g. 32 ÷ 45 = 71% → Yellow')}</th>
                    <th style="text-align:center;">Status ${ud_thEye('Status','Overall compliance status for this unit.','At Risk: overdue > 0\nIn Progress: completed < total\nCompliant: all completed, no overdue','')}</th>
                </tr></thead>
                <tbody>${complianceUnitRows}</tbody>
            </table>
            
        </div>
        
    <div class="ai-insight-card" style="margin-top:20px;">
        <div class="ai-header">
            <h4 style="white-space: nowrap;">✨ Compliance Status Insights</h4>
            <button class="btn btn-sm btn-primary" id="btn-ai-compliance-status">Generate Insight</button>
        </div>
        <div id="ai-content-compliance-status" class="ai-body ai-insight-content">
            <p>Click Generate Insight for compliance status analysis<p>
        </div>
    </div>
 
        <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
            ⚠ Policy Deviations — Employee Level
            <span style="font-size:10px;font-weight:400;color:#868e96;margin-left:8px;">
                (${policyDeviations.length} violations detected)
            </span>
        </div>
        ${policyDeviations.length === 0 ? `
        <div style="text-align:center;padding:20px;color:#adb5bd;font-size:13px;">
            ✅ No policy deviations detected. All appraisals are on track.
        </div>` : `
        <div class="ud-pip-banner" style="background:#fff8e1;border-left-color:#ffc107;">
            <div class="pbb-title" style="color:#856404;">📌 Compliance Alert</div>
            <div>${policyDeviations.length} employee(s) have policy deviations.
                 ${data.filter(d => d.custom_appraisal_status==='Overdue').length} are overdue.
                 Review and remediate urgently.</div>
        </div>
<div class="ud-table-scroll-wrap" style="overflow-x:auto;">
    <table class="ud-table">
        <thead><tr>
            <th>Employee</th>
            <th>Unit</th>
            <th>Division</th>
            <th>Grade</th>
            <th>Violations</th>
            <th>Action</th>
        </tr></thead>
        <tbody id="ud-policy-dev-tbody"></tbody>
    </table>
</div>
<div id="ud-policy-dev-pagination" style="display:none;align-items:center;justify-content:space-between;padding:10px 4px;margin-top:4px;border-top:1px solid #e9ecef;">
    <button id="ud-pd-prev" style="padding:5px 14px;font-size:12px;border:1px solid #dee2e6;border-radius:4px;background:#fff;cursor:pointer;color:#495057;">◀ Prev</button>
    <span id="ud-pd-page-info" style="font-size:12px;color:#868e96;"></span>
    <button id="ud-pd-next" style="padding:5px 14px;font-size:12px;border:1px solid #dee2e6;border-radius:4px;background:#fff;cursor:pointer;color:#495057;">Next ▶</button>
</div>
${policyDeviations.length > 50 ? `<div style="text-align:center;padding:8px;font-size:11px;color:#868e96;">Showing max 200 of ${policyDeviations.length} violations</div>` : ''}`}
    <div class="ai-insight-card" style="margin-top:20px;">
        <div class="ai-header">
            <h4 style="white-space: nowrap;">✨ Policy Deviation Insights</h4>
            <button class="btn btn-sm btn-primary" id="btn-ai-policy-deviation">Generate Insight</button>
        </div>
        <div id="ai-content-policy-deviation" class="ai-body ai-insight-content">
            <p>Click Generate Insight for policy deviation analysis<p>
        </div>
    </div>
    </div>
</div>`;
 

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION B: CALIBRATION SUMMARY
// ─────────────────────────────────────────────────────────────────────────────

$('head').append(`<style id="ud-calibration-styles">
    .ud-calib-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
    .ud-calib-kpi  { background:#fff; border-radius:8px; padding:12px 14px; text-align:center;
                     border-top:3px solid #dee2e6; box-shadow:0 1px 6px rgba(0,0,0,.05); }
    .ud-calib-kpi .calv { font-size:22px; font-weight:700; line-height:1.1; }
    .ud-calib-kpi .call { font-size:10px; font-weight:600; color:#868e96;
                          text-transform:uppercase; letter-spacing:1px; margin-top:3px; }
    .ud-calib-kpi.cb-navy  { border-top-color:#0f1f3d; } .ud-calib-kpi.cb-navy  .calv { color:#0f1f3d; }
    .ud-calib-kpi.cb-teal  { border-top-color:#00796b; } .ud-calib-kpi.cb-teal  .calv { color:#00796b; }
    .ud-calib-kpi.cb-purple  { border-top-color:#7b1fa2 ; } .ud-calib-kpi.cb-purple  .calv { color:#7b1fa2 ; }
    .ud-calib-kpi.cb-red   { border-top-color:#C8102E; } .ud-calib-kpi.cb-red   .calv { color:#C8102E; }
    .ud-calib-kpi.cb-green { border-top-color:#28a745; } .ud-calib-kpi.cb-green .calv { color:#28a745; }

    .ud-delta-chip { font-size:10px; font-weight:700; padding:2px 7px;
                     border-radius:10px; white-space:nowrap; }
    .ud-delta-up   { background:rgba(40,167,69,.12);  color:#28a745; }
    .ud-delta-down { background:rgba(200,16,46,.12);  color:#C8102E; }
    .ud-delta-flat { background:rgba(108,117,125,.1); color:#495057; }

    .ud-calib-diff-bar { display:flex; align-items:center; gap:6px; }
    .ud-calib-diff-seg { height:7px; border-radius:4px; min-width:4px; }

    @media print {
        .ud-calib-grid { grid-template-columns: repeat(4,1fr) !important; }
    }
</style>`);

// ── Calibration: pre = self score, post = assessor/total score ────────────────
//   (In a real setup you'd have explicit pre/post fields; here we use
//    custom_total_self_score as "pre-calibration" and total_score as "post-calibration".)

let calibData = data.filter(d =>
    parseFloat(d.custom_total_self_score) > 0 && parseFloat(d.total_score) > 0
);

let calibUp   = calibData.filter(d => parseFloat(d.total_score) > parseFloat(d.custom_total_self_score)).length;
let calibDown = calibData.filter(d => parseFloat(d.total_score) < parseFloat(d.custom_total_self_score)).length;
let calibFlat = calibData.filter(d => parseFloat(d.total_score) === parseFloat(d.custom_total_self_score)).length;

let avgPre  = calibData.length
    ? (calibData.reduce((s,d) => s + parseFloat(d.custom_total_self_score), 0) / calibData.length).toFixed(2)
    : 'N/A';
let avgPost = calibData.length
    ? (calibData.reduce((s,d) => s + parseFloat(d.total_score), 0) / calibData.length).toFixed(2)
    : 'N/A';
let avgDelta = (avgPre !== 'N/A' && avgPost !== 'N/A')
    ? (parseFloat(avgPost) - parseFloat(avgPre)).toFixed(2)
    : 'N/A';

// Unit-level calibration aggregation
let calibUnitMap = {};
calibData.forEach(d => {
    let u = d.custom_unit || 'Unknown';
    if (!calibUnitMap[u]) calibUnitMap[u] = { pre: [], post: [], up: 0, down: 0, flat: 0 };
    let pre  = parseFloat(d.custom_total_self_score);
    let post = parseFloat(d.total_score);
    calibUnitMap[u].pre.push(pre);
    calibUnitMap[u].post.push(post);
    if (post > pre) calibUnitMap[u].up++;
    else if (post < pre) calibUnitMap[u].down++;
    else calibUnitMap[u].flat++;
});
let calibUnitRows = Object.keys(calibUnitMap).sort().map((u, idx) => {
    let cu     = calibUnitMap[u];
    let n      = cu.pre.length;
    let avgP   = (cu.pre.reduce((a,b) => a+b, 0) / n).toFixed(2);
    let avgQ   = (cu.post.reduce((a,b) => a+b, 0) / n).toFixed(2);
    let delta  = (parseFloat(avgQ) - parseFloat(avgP)).toFixed(2);
    let dCls   = delta > 0 ? 'ud-delta-up' : delta < 0 ? 'ud-delta-down' : 'ud-delta-flat';
    let dLabel = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : `= 0.00`;
    let upPct  = Math.round((cu.up   / n) * 100);
    let downPct= Math.round((cu.down / n) * 100);
    let flatPct= 100 - upPct - downPct;

    // Build employee rows for this unit
    let unitEmployees = calibData.filter(d => (d.custom_unit || 'Unknown') === u);
    let empRowsHtml = unitEmployees.map(d => {
        let pre       = parseFloat(d.custom_total_self_score);
        let post      = parseFloat(d.total_score);
        let emp_delta = (post - pre).toFixed(2);
        let empDCls   = emp_delta > 0 ? 'ud-delta-up' : emp_delta < 0 ? 'ud-delta-down' : 'ud-delta-flat';
        let empDLabel = emp_delta > 0 ? `▲ +${emp_delta}` : emp_delta < 0 ? `▼ ${emp_delta}` : `= 0.00`;
        let preW  = Math.round((pre  / 5) * 100);
        let postW = Math.round((post / 5) * 100);
        return `<tr id="ud-calib-emp-row-${idx}" style="display:none;background:#f8f9fa;">
            <td style="padding-left:32px;font-size:11px;">
                <div style="font-weight:700;">${d.employee_name || d.employee}</div>
                <div style="font-size:10px;color:#868e96;">${d.employee}</div>
            </td>
            <td style="text-align:center;">
                <span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span>
            </td>
            <td colspan="2">
                <div style="display:flex;align-items:center;gap:5px;">
                    <div class="ud-prog" style="flex:1;">
                        <div class="ud-prog-fill" style="width:${preW}%;background:#C8102E;
                            -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                    </div>
                    <span style="font-size:10px;font-weight:700;color:#C8102E;min-width:28px;">${pre.toFixed(2)}</span>
                    <span style="color:#adb5bd;font-size:10px;">→</span>
                    <div class="ud-prog" style="flex:1;">
                        <div class="ud-prog-fill" style="width:${postW}%;background:#0f1f3d;
                            -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                    </div>
                    <span style="font-size:10px;font-weight:700;color:#0f1f3d;min-width:28px;">${post.toFixed(2)}</span>
                </div>
            </td>
            <td style="text-align:center;">
                <span class="ud-delta-chip ${empDCls}">${empDLabel}</span>
            </td>
            <td colspan="2" style="text-align:center;">
                ${['Approved','Accepted'].includes(d.workflow_state)
                    ? '<span class="ud-badge ud-badge-green">Completed</span>'
                    : d.custom_appraisal_status === 'Overdue'
                        ? '<span class="ud-badge ud-badge-red">Overdue</span>'
                        : '<span class="ud-badge ud-badge-orange">Pending</span>'}
            </td>
            <td colspan="2">
                <button class="ud-perf-action ud-act-view"
                    onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
            </td>
        </tr>`;
    }).join('');

    return `
    <!-- Unit summary row -->
    <tr style="cursor:pointer;background:#fff;"
        onclick="(function(el){
            var rows = document.querySelectorAll('#ud-calib-emp-row-${idx}');
            var icon = document.getElementById('ud-calib-icon-${idx}');
            var isOpen = rows.length && rows[0].style.display !== 'none';
            rows.forEach(function(r){ r.style.display = isOpen ? 'none' : ''; });
            if(icon) icon.textContent = isOpen ? '▶' : '▼';
        })(this)"
        onmouseover="this.style.background='#fce8ec'"
        onmouseout="this.style.background='#fff'">
        <td style="font-weight:700;">
            <span id="ud-calib-icon-${idx}" style="font-size:10px;color:#868e96;margin-right:6px;">▶</span>
            ${u}
            <span style="font-size:10px;font-weight:400;color:#868e96;margin-left:6px;">${n} employee${n !== 1 ? 's' : ''}</span>
        </td>
        <td style="text-align:center;font-weight:700;">${n}</td>
        <td style="text-align:center;font-weight:700;color:#C8102E;">${avgP}</td>
        <td style="text-align:center;font-weight:700;color:#0f1f3d;">${avgQ}</td>
        <td style="text-align:center;">
            <span class="ud-delta-chip ${dCls}">${dLabel}</span>
        </td>
        <td style="text-align:center;color:#28a745;font-weight:700;">${cu.up}</td>
        <td style="text-align:center;color:#C8102E;font-weight:700;">${cu.down}</td>
        <td style="text-align:center;color:#868e96;font-weight:700;">${cu.flat}</td>
        <td>
            <div style="display:flex;gap:2px;height:10px;border-radius:4px;overflow:hidden;min-width:80px;">
                <div style="width:${upPct}%;background:#28a745;
                            -webkit-print-color-adjust:exact;print-color-adjust:exact;"
                     title="Rated Up ${upPct}%"></div>
                <div style="width:${flatPct}%;background:#868e96;
                            -webkit-print-color-adjust:exact;print-color-adjust:exact;"
                     title="No Change ${flatPct}%"></div>
                <div style="width:${downPct}%;background:#C8102E;
                            -webkit-print-color-adjust:exact;print-color-adjust:exact;"
                     title="Rated Down ${downPct}%"></div>
            </div>
        </td>
    </tr>
    <tr id="ud-calib-emp-row-${idx}" style="display:none;background:#e9ecef;">
        <td style="padding-left:32px;font-size:10px;font-weight:700;color:#495057;letter-spacing:.4px;">EMPLOYEE</td>
        <td style="font-size:10px;font-weight:700;color:#495057;text-align:center;">GRADE</td>
        <td colspan="2" style="font-size:10px;font-weight:700;color:#495057;">🔴 SELF → 🔵 ASSESSOR</td>
        <td style="font-size:10px;font-weight:700;color:#495057;text-align:center;">Δ CHANGE</td>
        <td colspan="2" style="font-size:10px;font-weight:700;color:#495057;text-align:center;">STATUS</td>
        <td colspan="2" style="font-size:10px;font-weight:700;color:#495057;">ACTION</td>
    </tr>
    ${empRowsHtml}
    `;
}).join('') || `<tr><td colspan="9" style="text-align:center;padding:20px;color:#adb5bd;">No calibration data</td></tr>`;


window.calibrationData = Object.keys(calibUnitMap)
    .sort()
    .map(unit => {
        const cu = calibUnitMap[unit];
        const count = cu.pre.length;

        const avgPreScore = Number(
            (cu.pre.reduce((a, b) => a + b, 0) / count).toFixed(2)
        );

        const avgPostScore = Number(
            (cu.post.reduce((a, b) => a + b, 0) / count).toFixed(2)
        );

        const avgShift = Number(
            (avgPostScore - avgPreScore).toFixed(2)
        );

        const upPct = Number(
            ((cu.up / count) * 100).toFixed(1)
        );

        const downPct = Number(
            ((cu.down / count) * 100).toFixed(1)
        );

        const noChangePct = Number(
            ((cu.flat / count) * 100).toFixed(1)
        );

        return {
            unit: unit,
            employees_calibrated: count,
            average_self_score: avgPreScore,
            average_assessor_score: avgPostScore,
            average_score_shift: avgShift,
            ratings_increased: cu.up,
            ratings_decreased: cu.down,
            ratings_unchanged: cu.flat,
            increase_percentage: upPct,
            decrease_percentage: downPct,
            unchanged_percentage: noChangePct,
            calibration_trend:
                avgShift > 0
                    ? "Overall Increased"
                    : avgShift < 0
                    ? "Overall Decreased"
                    : "Stable"
        };
    });

// Individual calibration rows — biggest gaps
let calibIndivRows = [...calibData]
    .map(d => ({
        d,
        pre:   parseFloat(d.custom_total_self_score),
        post:  parseFloat(d.total_score),
        delta: parseFloat(d.total_score) - parseFloat(d.custom_total_self_score)
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 30)
    .map(({ d, pre, post, delta }) => {
        let dCls   = delta > 0 ? 'ud-delta-up' : delta < 0 ? 'ud-delta-down' : 'ud-delta-flat';
        let dLabel = delta > 0 ? `▲ +${delta.toFixed(2)}` : delta < 0 ? `▼ ${delta.toFixed(2)}` : `= 0.00`;
        let preW   = Math.round((pre  / 5) * 100);
        let postW  = Math.round((post / 5) * 100);
        return `<tr>
            <td>
                <div style="font-weight:700;font-size:12px;">${d.employee_name||d.employee}</div>
                <div style="font-size:10px;color:#868e96;">${d.employee}</div>
            </td>
            <td style="font-size:11px;">${d.custom_unit||'—'}</td>
            <td><span class="ud-badge ud-badge-blue">${d.custom_grade||'—'}</span></td>
            <td>
                <div style="display:flex;align-items:center;gap:5px;">
                    <div class="ud-prog" style="flex:1;"><div class="ud-prog-fill"
                        style="width:${preW}%;background:#C8102E;"></div></div>
                    <span style="font-size:10px;font-weight:700;color:#C8102E;min-width:28px;">${pre.toFixed(2)}</span>
                </div>
            </td>
            <td>
                <div style="display:flex;align-items:center;gap:5px;">
                    <div class="ud-prog" style="flex:1;"><div class="ud-prog-fill"
                        style="width:${postW}%;background:#0f1f3d;"></div></div>
                    <span style="font-size:10px;font-weight:700;color:#0f1f3d;min-width:28px;">${post.toFixed(2)}</span>
                </div>
            </td>
            <td style="text-align:center;">
                <span class="ud-delta-chip ${dCls}">${dLabel}</span>
            </td>
            <td>
                <button class="ud-perf-action ud-act-view"
                    onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="7"
        style="text-align:center;padding:20px;color:#adb5bd;">
        No individual calibration data
    </td></tr>`;

window.calibrationIndividualData = [...calibData]
    .map(d => {
        const selfScore = parseFloat(d.custom_total_self_score || 0);
        const calibratedScore = parseFloat(d.total_score || 0);
        const delta = calibratedScore - selfScore;

        return {
            employee_id: d.employee,
            employee_name: d.employee_name,
            unit: d.custom_unit || "N/A",
            grade: d.custom_grade || "N/A",
            self_score: Number(selfScore.toFixed(2)),
            calibrated_score: Number(calibratedScore.toFixed(2)),
            score_change: Number(delta.toFixed(2)),
            calibration_direction:
                delta > 0
                    ? "Increased"
                    : delta < 0
                    ? "Decreased"
                    : "No Change"
        };
    })
    .sort((a, b) => Math.abs(b.score_change) - Math.abs(a.score_change))
    .slice(0, 30);
 
let calibrationHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-calibration">
    <h4 style="white-space: nowrap;">🎯 Calibration Summary — ${unitLabel}</h4>
    <div class="ud-section-desc">
    <strong>Calibration Summary</strong> compares pre-calibration (employee self-score) vs post-calibration (assessor score) across all appraisals.
    <strong>Rated Up</strong> = assessor scored higher than self. <strong>Rated Down</strong> = assessor scored lower.
    The scatter chart shows the distribution of self vs assessor scores. Click unit rows to expand individual employee details.
</div>
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-calibration">
 
        <div class="ud-calib-grid">
            <div class="ud-calib-kpi cb-navy" >
                <div class="calv">${calibData.length}</div>
                <div class="call">Calibrated Appraisals</div>
            </div>
            <div class="ud-calib-kpi cb-purple">
                <div class="calv">${avgDelta !== 'N/A' && parseFloat(avgDelta) > 0 ? '+'+avgDelta : avgDelta}</div>
                <div class="call">Avg Score Δ (Post − Pre)</div>
            </div>
            <div class="ud-calib-kpi cb-green" >
                <div class="calv">${calibUp}</div>
                <div class="call">Rated Up by Assessor</div>
            </div>
            <div class="ud-calib-kpi cb-red">
                
                <div class="calv">${calibDown}</div>
                <div class="call">Rated Down by Assessor</div>
            </div>
        </div>
 
        <div style="background:#e8f4fd;border-left:3px solid #1976d2;border-radius:0 8px 8px 0;
                    padding:9px 14px;font-size:12px;margin-bottom:14px;">
            <div style="font-weight:700;color:#0d47a1;font-size:11px;text-transform:uppercase;
                        letter-spacing:.5px;margin-bottom:3px;">ℹ Pre vs Post Calibration</div>
            <div style="color:#1565c0;">
                <strong>Pre-calibration</strong> = Employee Self Score.
                <strong>Post-calibration</strong> = Assessor/Manager Score (Total Score).
                Avg Pre: <strong>${avgPre}/5</strong> →
                Avg Post: <strong>${avgPost}/5</strong>.
                ${calibFlat} employee(s) received the same rating as their self-assessment.
            </div>
        </div>
 
        ${calibData.length === 0 ? `
        <div style="text-align:center;padding:30px;color:#adb5bd;font-size:13px;">
            No calibration data available — requires appraisals with both self score and assessor score filled.
        </div>` : `
        <div class="ud-2col" style="margin-bottom:16px;">
            <div>
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Pre vs Post Score Distribution(Employee Wise)
                </div>
                <div style="position:relative;width:100%;height:240px;">
                    <canvas id="ud-calib-scatter"></canvas>
                </div>
            </div>
            <div>
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Pre vs Post Score Distribution (Unit Wise)
                </div>
                <div style="position:relative;width:100%;height:240px;">
                    <canvas id="ud-calib-unit-bar"></canvas>
                </div>
            </div>
        </div>`}
 
       
        <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
            🏢 Unit-wise Calibration Summary
            <span style="font-size:10px;font-weight:400;color:#868e96;margin-left:8px;">
                Click any unit row to expand employee details
            </span>
        </div>
        <div style="overflow-x:auto;margin-bottom:18px;">
            <table class="ud-table">
                <thead><tr>
                    <th>Unit</th>
                    <th style="text-align:center;">Count ${ud_thEye('Count','Employees with both self score and assessor score filled.','Total Number of appraisals','')}</th>
                    <th style="text-align:center;">🔴 Avg Pre ${ud_thEye('Avg Pre (Self Score)','Average employee self-assessment score — the pre-calibration baseline.','Sum of Total Self Score / COUNT','')}</th>
                    <th style="text-align:center;">🔵 Avg Post ${ud_thEye('Avg Post (Assessor Score)','Average assessor score — the post-calibration result.','Sum of Total Score / COUNT','')}</th>
                    <th style="text-align:center;">Δ Delta ${ud_thEye('Δ Delta','Post minus Pre. Positive = assessor rated higher than self (upward calibration). Negative = assessor rated lower.','Avg Post − Avg Pre\n▲ positive = assessor inflated\n▼ negative = assessor deflated','e.g. Post 3.8 − Pre 4.2 = −0.4 → assessor rated down')}</th>
                    <th style="text-align:center;">Rated Up ${ud_thEye('Rated Up','Employees whose assessor score is strictly higher than their self score.','No of total_score > Total Self Score','')}</th>
                    <th style="text-align:center;">Rated Down ${ud_thEye('Rated Down','Employees whose assessor score is strictly lower than their self score.','No of total_score < Total Self Score','')}</th>
                    <th style="text-align:center;">No Change ${ud_thEye('No Change','Employees whose assessor score equals their self score exactly.','No of total_score = Total Self Score','')}</th>
                    <th style="min-width:100px;">Calibration Mix ${ud_thEye('Calibration Mix','Visual bar showing proportion of Up / No Change / Down within the unit. Gold = Up, Grey = No Change, Red = Down.','Stacked bar: (Up% | NoChange% | Down%) = 100%','')}</th>
                </tr></thead>
                <tbody>${calibUnitRows}</tbody>
            </table>
            <div class="ai-insight-card" style="margin-top:20px;">
                <div class="ai-header">
                    <h4 style="white-space: nowrap;">✨ Calibration Insights</h4>
                    <button class="btn btn-sm btn-primary" id="btn-ai-calibration">Generate Insight</button>
                </div>
                <div id="ai-content-calibration" class="ai-body ai-insight-content">
                    <p>Click Generate Insight for calibration analysis<p>
                </div>
            </div>
        </div>
 
        <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
            📊 Biggest Calibration Shifts — Top 30 by Absolute Δ
            ${ud_thEye(
                'Biggest Calibration Shifts',
                'Lists the top 30 employees with the largest absolute difference between their self score and the assessor score. Sorted by magnitude of change — biggest shifts appear first regardless of direction.',
                'SORT ORDER:\n  ABS(total_score − custom_total_self_score) DESC\n  Limited to top 30 records\n\nDELTA CALCULATION:\n  Δ Change = Assessor Score (Post) − Self Score (Pre)\n  ▲ Positive = assessor rated HIGHER than employee self-assessment\n  ▼ Negative = assessor rated LOWER than employee self-assessment\n  = Zero     = no change between self and assessor score\n\nCOLOUR CODING:\n  Green (▲) = assessor inflated relative to self\n  Red   (▼) = assessor deflated relative to self\n  Grey  (=) = no change',
                'e.g. Employee self score = 4.5, Assessor score = 2.5 → Δ = −2.0 (▼) → large downward shift → appears near top of list'
            )}
        </div>
        <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
            <table class="ud-table">
                <thead><tr>
                    <th>Employee</th>
                    <th>Unit</th>
                    <th>Grade</th>
                    <th>
                        🔴 Self Score (Pre)
                    </th>
                    <th>
                        🔵 Assessor Score (Post)
                    </th>
                    <th style="text-align:center;">
                        Δ Change
                        ${ud_thEye('Δ Change', 'The difference between the assessor score and the self score. Shows the direction and magnitude of calibration adjustment made by the assessor.', 'Δ = Assessor Score (Post) − Self Score (Pre)\n\n▲ Positive = assessor rated higher than self (upward calibration)\n▼ Negative = assessor rated lower than self (downward calibration)\n= Zero     = assessor agreed with self-assessment exactly\n\nSorted by ABS(Δ) descending — largest shifts first.', 'e.g. Post 2.5 − Pre 4.5 = −2.0 → ▼ −2.00 (large downward shift)', 'dark')}
                    </th>
                    <th>Action</th>
                </tr></thead>
                <tbody>${calibIndivRows}</tbody>
            </table>
        </div>
        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ Shift Calibration Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-shift-calibration">Generate Insight</button>
            </div>
            <div id="ai-content-shift-calibration" class="ai-body ai-insight-content">
                <p>Click Generate Insight for shift calibration analysis<p>
            </div>
        </div>
    </div>
</div>`;

// ─────────────────────────────────────────────────────────────────────────────
//  SECTION C: PERFORMANCE vs COMPENSATION
// ─────────────────────────────────────────────────────────────────────────────
$('head').append(`<style id="ud-sticky-header-styles">
/* ── Sticky table headers for scrollable sections ── */

/* Wrapper that creates the scrollable viewport */
.ud-table-scroll-wrap {
    overflow-y: auto;
    max-height: 520px;
    border: 1px solid #e9ecef;
    border-radius: 6px;
}

/* Make thead sticky inside any scrollable wrapper */
.ud-table-scroll-wrap .ud-table thead th,
.ud-table-scroll-wrap .ud-table thead tr th {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #0f1f3d !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    /* Prevent header gap/bleed on scroll */
    box-shadow: 0 2px 4px rgba(0,0,0,.15);
}

/* For kra-group-header rows that also appear in thead-like rows */
.ud-table-scroll-wrap .ud-table tr.kra-group-header td {
    position: sticky;
    top: 41px; /* offset by thead height */
    z-index: 9;
}

/* Scrollbar styling */
.ud-table-scroll-wrap::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
.ud-table-scroll-wrap::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}
.ud-table-scroll-wrap::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}
.ud-table-scroll-wrap::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
}

@media print {
    .ud-table-scroll-wrap {
        overflow: visible !important;
        max-height: none !important;
    }
    .ud-table-scroll-wrap .ud-table thead th {
        position: static !important;
    }
}
</style>`);
$('head').append(`<style id="ud-pvc-styles">
    .ud-pvc-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
    .ud-pvc-kpi  { background:#fff; border-radius:8px; padding:12px 14px; text-align:center;
                   border-top:3px solid #dee2e6; box-shadow:0 1px 6px rgba(0,0,0,.05); }
    .ud-pvc-kpi .pvkv { font-size:22px; font-weight:700; line-height:1.1; }
    .ud-pvc-kpi .pvkl { font-size:10px; font-weight:600; color:#868e96;
                        text-transform:uppercase; letter-spacing:1px; margin-top:3px; }
    .ud-pvc-kpi.pv-gold   { border-top-color:#f4a100; } .ud-pvc-kpi.pv-gold   .pvkv { color:#f4a100; }
    .ud-pvc-kpi.pv-navy   { border-top-color:#0f1f3d; } .ud-pvc-kpi.pv-navy   .pvkv { color:#0f1f3d; }
    .ud-pvc-kpi.pv-green  { border-top-color:#28a745; } .ud-pvc-kpi.pv-green  .pvkv { color:#28a745; }
    .ud-pvc-kpi.pv-lgreen  { border-top-color:#AED581 ; } .ud-pvc-kpi.pv-lgreen  .pvkv { color:#AED581 ; }
    .ud-pvc-kpi.pv-red    { border-top-color:#C8102E; } .ud-pvc-kpi.pv-red    .pvkv { color:#C8102E; }

    .ud-incr-chip { font-size:10px; font-weight:700; padding:2px 8px;
                    border-radius:10px; white-space:nowrap; }
    .ud-incr-high  { background:rgba(244,161,0,.15);  color:#c68a00; }
    .ud-incr-std   { background:rgba(40,167,69,.12);  color:#28a745; }
    .ud-incr-low   { background:rgba(200,16,46,.12);  color:#C8102E; }
    .ud-incr-none  { background:rgba(108,117,125,.1); color:#495057; }
    .ud-incr-pip   { background:rgba(229,57,53,.15);  color:#b71c1c; }

    .ud-pfp-matrix {
        display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:16px;
    }
    .ud-pfp-cell {
        background:#fff; border-radius:8px; padding:12px;
        border:1px solid #dee2e6; text-align:center;
    }
    .ud-pfp-cell .pfp-count { font-size:24px; font-weight:700; color:#0f1f3d; }
    .ud-pfp-cell .pfp-label { font-size:10px; color:#868e96; text-transform:uppercase;
                               letter-spacing:.8px; margin-top:4px; }
    .ud-pfp-cell.pfp-exceptional { border-color:#28a745; background:#f0fff4; }
    .ud-pfp-cell.pfp-exceptional .pfp-count { color:#28a745; }
    .ud-pfp-cell.pfp-high        { border-color:#AED581; background:#F1F8E9; }
    .ud-pfp-cell.pfp-high        .pfp-count { color:#AED581; }
    .ud-pfp-cell.pfp-standard    { border-color:#FFEE58; background:#fffde7; }
    .ud-pfp-cell.pfp-standard    .pfp-count { color:#f9a825; }
    .ud-pfp-cell.pfp-low         { border-color:#ffc107; background:#fff8e1; }
    .ud-pfp-cell.pfp-low         .pfp-count { color:#ffc107; }
    .ud-pfp-cell.pfp-hold        { border-color:#9e9e9e; background:#f5f5f5; }
    .ud-pfp-cell.pfp-hold        .pfp-count { color:#9e9e9e; }
    .ud-pfp-cell.pfp-risk        { border-color:#C8102E; background:#fff0f0; }
    .ud-pfp-cell.pfp-risk        .pfp-count { color:#C8102E; }

    @media print {
        .ud-pvc-grid  { grid-template-columns: repeat(4,1fr) !important; }
        .ud-pfp-matrix{ grid-template-columns: 1fr 1fr 1fr    !important; }
    }
</style>`);

// ── Pay-for-performance matrix ────────────────────────────────────────────────
// Increment recommendation logic (score-based, no salary data needed)
function incrRecommendation(score) {
    let v = parseFloat(score) || 0;
    if (v >= 4.5) return { label: 'Exceptional (15%+)', pct: '15%+', cls: 'ud-incr-high',  band: 'exceptional' };
    if (v >= 4.0) return { label: 'High (10–15%)',      pct: '10–15%', cls: 'ud-incr-high',  band: 'high'      };
    if (v >= 3.5) return { label: 'Standard (5–10%)',   pct: '5–10%',  cls: 'ud-incr-std',   band: 'standard'  };
    if (v >= 2.5) return { label: 'Minimal (0–5%)',     pct: '0–5%',   cls: 'ud-incr-low',   band: 'low'       };
    if (v >= 2.0) return { label: 'Hold (0%)',          pct: '0%',     cls: 'ud-incr-none',  band: 'hold'      };
    return               { label: 'PIP Required',       pct: '—',      cls: 'ud-incr-pip',   band: 'pip'       };
}

let pvcScored = data.filter(d => parseFloat(d.total_score) > 0);

// Pay-for-performance band counts
let pfpBands = { exceptional:0, high:0, standard:0, low:0, hold:0, pip:0 };
pvcScored.forEach(d => { pfpBands[incrRecommendation(d.total_score).band]++; });

let pfpHighCount    = pfpBands.exceptional + pfpBands.high;
let pfpStdCount     = pfpBands.standard;
let pfpLowCount     = pfpBands.low + pfpBands.hold ;
let pfpPipCount     = pfpBands.pip;

// Unit-level pay-for-performance summary
let pvcUnitMap = {};
pvcScored.forEach(d => {
    let u  = d.custom_unit || 'Unknown';
    let ir = incrRecommendation(d.total_score);
    if (!pvcUnitMap[u]) pvcUnitMap[u] = {
        scores: [], exceptional:0, high:0, standard:0, low:0, hold:0, pip:0
    };
    pvcUnitMap[u].scores.push(parseFloat(d.total_score));
    pvcUnitMap[u][ir.band]++;
});

let pvcUnitRows = Object.keys(pvcUnitMap).sort().map(u => {
    let pu  = pvcUnitMap[u];
    let n   = pu.scores.length;
    let avg = (pu.scores.reduce((a,b) => a+b, 0) / n).toFixed(2);
    let excH = pfpBands.exceptional + pfpBands.high;
    let recIncr = incrRecommendation(avg);
    let highPct  = Math.round(((pu.exceptional + pu.high) / n) * 100);
    let stdPct   = Math.round((pu.standard / n) * 100);
    let lowPct   = 100 - highPct - stdPct;
    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;">${n}</td>
        <td style="text-align:center;font-weight:700;color:#0f1f3d;">${avg}</td>
        <td style="text-align:center;color:#28a745;font-weight:700;">${pu.exceptional + pu.high}</td>
        <td style="text-align:center;color:#AED581;font-weight:700;">${pu.standard}</td>
        <td style="text-align:center;color:#ffc107;font-weight:700;">${pu.low + pu.hold + pu.pip}</td>
        <td style="text-align:center;color:#C8102E;font-weight:700;">${pu.pip}</td>
        <td>
            <span class="ud-incr-chip ${recIncr.cls}">${recIncr.label}</span>
        </td>
        <td>
            <div style="display:flex;gap:2px;height:10px;border-radius:4px;overflow:hidden;min-width:80px;">
                <div style="width:${highPct}%;background:#28a745;
                            -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                <div style="width:${stdPct}%;background:#ffc107;
                            -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                <div style="width:${lowPct}%;background:#C8102E;
                            -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
            </div>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="9"
    style="text-align:center;padding:20px;color:#adb5bd;">
    No scored appraisals
</td></tr>`;

window.payForPerformanceData = Object.keys(pvcUnitMap)
    .sort()
    .map(unit => {
        const pu = pvcUnitMap[unit];
        const count = pu.scores.length;

        const avgScore = Number(
            (pu.scores.reduce((a, b) => a + b, 0) / count).toFixed(2)
        );

        const recommendation = incrRecommendation(avgScore);

        return {
            unit: unit,
            employees_scored: count,
            average_score: avgScore,
            exceptional_performers: pu.exceptional,
            high_performers: pu.high,
            standard_performers: pu.standard,
            low_performers: pu.low,
            hold_performers: pu.hold,
            pip_performers: pu.pip,
            recommended_increment_band: recommendation.label
        };
    });

// Individual increment recommendation rows (top performers + PIP employees)
let incrRows = [...pvcScored]
    .sort((a, b) => parseFloat(b.total_score) - parseFloat(a.total_score))
    .slice(0, 50)
    .map(d => {
        let ir   = incrRecommendation(d.total_score);
        let barW = Math.round((parseFloat(d.total_score) / 5) * 100);
         let barColor = parseFloat(d.total_score) >= 4 ? '#28a745' :
                       parseFloat(d.total_score) >= 3 ? '#ffc107' :'#C8102E';
        return `<tr>
            <td>
                <div style="font-weight:700;font-size:12px;">${d.employee_name||d.employee}</div>
                <div style="font-size:10px;color:#868e96;">${d.employee}</div>
            </td>
            <td><span class="ud-badge ud-badge-blue">${d.custom_grade||'—'}</span></td>
            <td style="font-size:11px;">${d.custom_unit||'—'}</td>
            <td style="font-size:11px;">${d.custom_division||'—'}</td>
            <td>
                <div style="display:flex;align-items:center;gap:6px;">
                    <div class="ud-prog" style="flex:1;">
                        <div class="ud-prog-fill"
                             style="width:${barW}%;background:${barColor};
                                    -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                    </div>
                    <span style="font-size:11px;font-weight:700;min-width:28px;">
                        ${parseFloat(d.total_score).toFixed(2)}
                    </span>
                </div>
            </td>
            <td style="text-align:center;">
                <span class="ud-incr-chip ${ir.cls}">${ir.label}</span>
            </td>
            <td style="text-align:center;font-weight:700;color:#0f1f3d;">${ir.pct}</td>
            <td>
                <button class="ud-perf-action ud-act-view"
                    onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="8"
        style="text-align:center;padding:20px;color:#adb5bd;">
        No scored appraisals
    </td></tr>`;

window.individualIncrementData = pvcScored.map(d => {
    const score = parseFloat(d.total_score) || 0;
    const increment = incrRecommendation(score);

    return {
        employee: d.employee,
        employee_name: d.employee_name,
        grade: d.custom_grade,
        unit: d.custom_unit,
        division: d.custom_division,
        score: score,
        increment_band: increment.label,
        recommended_increment: increment.pct,
        appraisal_status: d.workflow_state
    };
});
    
let perfCompHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-perfcomp">
        <h4 style="white-space: nowrap;">💰 Performance vs Compensation — ${unitLabel}
            ${ud_thEye('Performance vs Compensation',
                'Recommends salary increment bands for each employee based on their final appraisal score. These are guidelines only — final decisions rest with HR and management.',
                'Score ≥ 4.5 → Exceptional (15%+)\nScore ≥ 4.0 → High (10–15%)\nScore ≥ 3.5 → Standard (5–10%)\nScore ≥ 2.5 → Minimal (0–5%)\nScore ≥ 2.0 → Hold (0%)\nScore < 2.0 → PIP Required',
                'e.g. 25 employees scored ≥ 4.0 → recommended High Increment band (10–15%)')}
        </h4>
        
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-perfcomp">

        <!-- ── KPI Cards ── -->
        <div class="ud-pvc-grid">
            <div class="ud-pvc-kpi pv-green">
                <div class="pvkv">${pfpHighCount}</div>
                <div class="pvkl">
                    High Increment (≥10%)
                    ${ud_thEye('High Increment',
                        'Employees whose final score qualifies them for a high salary increment (10% or above).',
                        'High Increment = COUNT WHERE total_score ≥ 4.0\n(Includes both Exceptional ≥4.5 and High ≥4.0 bands)',
                        'e.g. 8 employees scored ≥ 4.0 → recommended 10–15% increment')}
                </div>
            </div>
            <div class="ud-pvc-kpi pv-lgreen">
                <div class="pvkv">${pfpStdCount}</div>
                <div class="pvkl">
                    Standard Increment (5–10%)
                    ${ud_thEye('Standard Increment',
                        'Employees whose score places them in the standard increment band.',
                        'Standard = COUNT WHERE 3.5 ≤ total_score < 4.0',
                        'e.g. 15 employees scored between 3.5 and 3.99 → recommended 5–10% increment')}
                </div>
            </div>
            <div class="ud-pvc-kpi pv-gold">
                <div class="pvkv">${pfpLowCount}</div>
                <div class="pvkl">
                    Low / Hold (0–5%)
                    ${ud_thEye('Low / Hold',
                        'Employees in the Minimal or Hold bands — receiving little or no increment.',
                        'Low/Hold = COUNT WHERE 2.0 ≤ total_score < 3.5\n  Minimal (0–5%): 2.5 ≤ score < 3.5\n  Hold    (0%)  : 2.0 ≤ score < 2.5',
                        'e.g. 10 employees scored between 2.0 and 3.49 → Minimal or Hold band')}
                </div>
            </div>
            <div class="ud-pvc-kpi pv-red">
                <div class="pvkv">${pfpPipCount}</div>
                <div class="pvkl">
                    PIP Required
                    ${ud_thEye('PIP Required',
                        'Employees with serious performance concerns who require a Performance Improvement Plan. No increment is recommended.',
                        'PIP = COUNT WHERE total_score < 2.0',
                        'e.g. 3 employees scored below 2.0 → flagged for PIP — no increment')}
                </div>
            </div>
        </div>

        <div style="background:#e8f4fd;border-left:3px solid #1976d2;border-radius:0 8px 8px 0;
                    padding:9px 14px;font-size:12px;margin-bottom:14px;">
            <div style="font-weight:700;color:#0d47a1;font-size:11px;text-transform:uppercase;
                        letter-spacing:.5px;margin-bottom:3px;">ℹ Increment Recommendation Logic</div>
            <div style="color:#1565c0;">
                Score ≥ 4.5 → <strong>Exceptional (15%+)</strong> &nbsp;|&nbsp;
                ≥ 4.0 → <strong>High (10–15%)</strong> &nbsp;|&nbsp;
                ≥ 3.5 → <strong>Standard (5–10%)</strong> &nbsp;|&nbsp;
                ≥ 2.5 → <strong>Minimal (0–5%)</strong> &nbsp;|&nbsp;
                ≥ 2.0 → <strong>Hold (0%)</strong> &nbsp;|&nbsp;
                &lt; 2.0 → <strong>PIP Required</strong>.
                Recommendations are guidelines; final decisions rest with HR and management.
            </div>
        </div>

        <!-- ── Pay-for-Performance Matrix ── -->
        <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:10px;">
            📐 Pay-for-Performance Matrix
            ${ud_thEye('Pay-for-Performance Matrix',
                'A visual grid showing how many employees fall into each increment band. Each cell represents one band threshold.',
                'Exceptional : total_score ≥ 4.5\nHigh        : 4.0 ≤ score < 4.5\nStandard    : 3.5 ≤ score < 4.0\nMinimal     : 2.5 ≤ score < 3.5\nHold        : 2.0 ≤ score < 2.5\nPIP         : score < 2.0',
                'e.g. 5 Exceptional + 10 High + 20 Standard + 8 Minimal + 3 Hold + 2 PIP = 48 total scored')}
        </div>
        <div class="ud-pfp-matrix" style="margin-bottom:16px;">
            <div class="ud-pfp-cell pfp-exceptional">
                <div class="pfp-count">${pfpBands.exceptional}</div>
                <div class="pfp-label">
                    Exceptional ≥ 4.5
                    ${ud_thEye('Exceptional',
                        'Top-tier performers eligible for the highest increment band.',
                        'COUNT WHERE total_score ≥ 4.5',
                        'e.g. Score 4.8 → Exceptional → 15%+ increment')}
                </div>
            </div>
            <div class="ud-pfp-cell pfp-high">
                <div class="pfp-count">${pfpBands.high}</div>
                <div class="pfp-label">
                    High ≥ 4.0
                    ${ud_thEye('High',
                        'High performers eligible for a significant increment.',
                        'COUNT WHERE 4.0 ≤ total_score < 4.5',
                        'e.g. Score 4.2 → High → 10–15% increment')}
                </div>
            </div>
            <div class="ud-pfp-cell pfp-standard">
                <div class="pfp-count">${pfpBands.standard}</div>
                <div class="pfp-label">
                    Standard ≥ 3.5
                    ${ud_thEye('Standard',
                        'Solid performers receiving a standard increment.',
                        'COUNT WHERE 3.5 ≤ total_score < 4.0',
                        'e.g. Score 3.7 → Standard → 5–10% increment')}
                </div>
            </div>
            <div class="ud-pfp-cell pfp-low">
                <div class="pfp-count">${pfpBands.low}</div>
                <div class="pfp-label">
                    Minimal ≥ 2.5
                    ${ud_thEye('Minimal',
                        'Below-average performers receiving a minimal increment.',
                        'COUNT WHERE 2.5 ≤ total_score < 3.5',
                        'e.g. Score 2.8 → Minimal → 0–5% increment')}
                </div>
            </div>
            <div class="ud-pfp-cell pfp-hold">
                <div class="pfp-count">${pfpBands.hold}</div>
                <div class="pfp-label">
                    Hold ≥ 2.0
                    ${ud_thEye('Hold',
                        'Underperforming employees placed on increment hold — no salary increase recommended.',
                        'COUNT WHERE 2.0 ≤ total_score < 2.5',
                        'e.g. Score 2.1 → Hold → 0% increment')}
                </div>
            </div>
            <div class="ud-pfp-cell pfp-risk">
                <div class="pfp-count">${pfpBands.pip}</div>
                <div class="pfp-label">
                    PIP &lt; 2.0
                    ${ud_thEye('PIP Required',
                        'Critical underperformers who require a formal Performance Improvement Plan before any increment can be considered.',
                        'COUNT WHERE total_score < 2.0',
                        'e.g. Score 1.5 → PIP Required → no increment until improvement')}
                </div>
            </div>
        </div>

        ${pvcScored.length === 0 ? `
        <div style="text-align:center;padding:30px;color:#adb5bd;font-size:13px;">
            No scored appraisals found for chart rendering.
        </div>` : `
        <div class="ud-2col" style="margin-bottom:16px;">
            <div>
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Increment Band Distribution
                    ${ud_thEye('Increment Band Distribution',
                        'Bar chart showing how many employees fall into each increment band across the selected unit and period.',
                        'X-axis = Increment bands (Exceptional → PIP)\nY-axis = Number of employees\nBar color = band severity (green → red)',
                        'e.g. Tallest bar at Standard means most employees are in the 5–10% increment range')}
                </div>
                <div style="position:relative;width:100%;height:220px;">
                    <canvas id="ud-pvc-dist-bar"></canvas>
                </div>
            </div>
            <div>
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Unit-wise Avg Score vs Increment Band
                    ${ud_thEye('Unit-wise Avg Score vs Increment Band',
                        'Stacked bar showing distribution of increment bands per unit. Helps identify which units have more high or low performers.',
                        'Each stacked segment = COUNT of employees in that band for the unit\nBands: High Incr. | Standard | Low/Hold/PIP',
                        'e.g. Unit A has 8 High + 12 Standard + 3 Low → good performance spread')}
                </div>
                <div style="position:relative;width:100%;height:220px;">
                    <canvas id="ud-pvc-unit-bar"></canvas>
                </div>
            </div>
        </div>`}

        <!-- ── Unit-wise Table ── -->
        <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
            🏢 Unit-wise Pay-for-Performance Summary
            ${ud_thEye('Unit-wise Summary',
                'Aggregated pay-for-performance metrics per unit showing scored employee counts, average score, band distribution, and recommended increment band.',
                'Avg Score       = SUM(total_score) / COUNT(scored employees) per unit\nRecommended Band = incrRecommendation(Avg Score)\nMix bar         = proportion of High / Standard / Low per unit',
                'e.g. Unit B: Avg 3.9 → Standard band recommended for majority of employees')}
        </div>
        <div style="overflow-x:auto;margin-bottom:18px;">
            <table class="ud-table">
                <thead><tr>
                    <th>Unit</th>
                    <th style="text-align:center;">
                        Scored
                        ${ud_thEye('Scored', 'Employees in this unit with a final assessor score greater than zero.', 'COUNT WHERE total_score > 0 AND unit = U', '', 'dark')}
                    </th>
                    <th style="text-align:center;">
                        Avg Score
                        ${ud_thEye('Avg Score', 'Average final assessor score across all scored employees in this unit.', 'SUM(total_score) / COUNT(scored employees) per unit', 'e.g. 3.80 / 5', 'dark')}
                    </th>
                    <th style="text-align:center;">
                        High Incr.
                        ${ud_thEye('High Increment', 'Employees in this unit scoring ≥ 4.0 (Exceptional + High bands combined).', 'COUNT WHERE total_score ≥ 4.0 AND unit = U', '', 'dark')}
                    </th>
                    <th style="text-align:center;">
                        Standard
                        ${ud_thEye('Standard', 'Employees in this unit scoring between 3.5 and 3.99.', 'COUNT WHERE 3.5 ≤ total_score < 4.0 AND unit = U', '', 'dark')}
                    </th>
                    <th style="text-align:center;">
                        Low/Hold
                        ${ud_thEye('Low / Hold', 'Employees in this unit scoring below 3.5 but above 2.0 (Minimal + Hold bands).', 'COUNT WHERE 2.0 ≤ total_score < 3.5 AND unit = U', '', 'dark')}
                    </th>
                    <th style="text-align:center;">
                        PIP
                        ${ud_thEye('PIP', 'Employees in this unit scoring below 2.0 — flagged for Performance Improvement Plan.', 'COUNT WHERE total_score < 2.0 AND unit = U', '', 'dark')}
                    </th>
                    <th>
                        Recommended Band
                        ${ud_thEye('Recommended Band', 'The increment band recommended for this unit based on the average assessor score.', 'incrRecommendation(Avg Score)\n≥4.5 → Exceptional · ≥4.0 → High · ≥3.5 → Standard\n≥2.5 → Minimal · ≥2.0 → Hold · <2.0 → PIP', 'e.g. Unit avg 3.9 → Standard (5–10%)', 'dark')}
                    </th>
                    <th style="min-width:90px;">
                        Mix
                        ${ud_thEye('Mix', 'Proportional stacked bar showing the split between High Increment (green), Standard (amber), and Low/Hold/PIP (red) employees within the unit.', 'Green  = High Incr. %\nAmber  = Standard %\nRed    = Low/Hold/PIP %\n\nAll segments sum to 100%', 'e.g. 60% green + 30% amber + 10% red = healthy unit', 'dark')}
                    </th>
                </tr></thead>
                <tbody>${pvcUnitRows}</tbody>
            </table>
        </div>

        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ Pay-for-Performance Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-pay-for-performance">Generate Insight</button>
            </div>
            <div id="ai-content-pay-for-performance" class="ai-body ai-insight-content">
                <p>Click Generate Insight for pay-for-performance analysis</p>
            </div>
        </div>

        <!-- ── Individual Increment Table ── -->
        <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
            👤 Individual Increment Recommendations
            <span style="font-size:10px;font-weight:400;color:#868e96;margin-left:8px;">(Top 50 by score)</span>
            ${ud_thEye('Individual Increment Recommendations',
                'Lists the top 50 scored employees sorted by highest score, with their recommended increment band and suggested percentage range.',
                'Sorted by: total_score DESC\nLimited to: top 50 employees\n\nIncrement band derived from score thresholds:\n≥4.5 → Exceptional · ≥4.0 → High · ≥3.5 → Standard\n≥2.5 → Minimal · ≥2.0 → Hold · <2.0 → PIP',
                'e.g. Employee A: Score 4.3 → High band → 10–15% suggested increment')}
        </div>
        <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
            <table class="ud-table">
                <thead><tr>
                    <th>Employee</th>
                    <th>Grade</th>
                    <th>Unit</th>
                    <th>Division</th>
                    <th>
                        Score Bar
                        ${ud_thEye('Score Bar', 'Visual bar representing the employee\'s final assessor score out of 5.', 'Bar width = (total_score / 5) × 100%', 'e.g. Score 4.0 → bar fills 80% of width', 'dark')}
                    </th>
                    <th>
                        Increment Band
                        ${ud_thEye('Increment Band', 'Recommended salary increment band derived from the appraisal score.', '≥ 4.5 → Exceptional (15%+)\n≥ 4.0 → High (10–15%)\n≥ 3.5 → Standard (5–10%)\n≥ 2.5 → Minimal (0–5%)\n≥ 2.0 → Hold (0%)\n< 2.0 → PIP Required\n\nNote: Guidelines only — final decisions rest with HR.', 'e.g. Score 4.2 → High Increment band', 'dark')}
                    </th>
                    <th style="text-align:center;">
                        Suggested %
                        ${ud_thEye('Suggested %', 'Indicative increment percentage range for this band. Not a binding commitment.', 'Derived from band thresholds:\nExceptional → 15%+\nHigh        → 10–15%\nStandard    → 5–10%\nMinimal     → 0–5%\nHold        → 0%\nPIP         → —', 'e.g. High band → 10–15%', 'dark')}
                    </th>
                    <th>Action</th>
                </tr></thead>
                <tbody>${incrRows}</tbody>
            </table>
        </div>

        ${pvcScored.length > 50 ? `
        <div style="text-align:center;padding:8px;font-size:11px;color:#868e96;">
            Showing top 50 of ${pvcScored.length} scored appraisals
        </div>` : ''}

        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ Individual Increment Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-individual-increment">Generate Insight</button>
            </div>
            <div id="ai-content-individual-increment" class="ai-body ai-insight-content">
                <p>Click Generate Insight for individual increment status analysis</p>
            </div>
        </div>

    </div>
</div>`;

// ─────────────────────────────────────────────────────────────────────────────
//  PROMOTION ELIGIBILITY REPORT
// ─────────────────────────────────────────────────────────────────────────────

// ── Scoring thresholds ────────────────────────────────────────────────────────
// Score ≥ 4.0 = Strong candidate | ≥ 3.5 = Ready | ≥ 3.0 = Watch | < 3.0 = Not eligible
// Tenure proxy: use galfar_exp field if available, else flag as unknown
// Competency proxy: self vs assessor alignment (delta ≤ 0.5 = aligned)

function promoEligibility(d) {
    let s    = parseFloat(d.total_score) || 0;
    let self = parseFloat(d.custom_total_self_score) || 0;
    let delta = Math.abs(s - self);
    let aligned = delta <= 0.5;
    let completed = ['Approved','Accepted'].includes(d.workflow_state);

    if (s >= 4.0 && aligned && completed) return { label:'Strong Candidate', cls:'elig-strong', rank:1 };
    if (s >= 3.5 && completed)            return { label:'Ready',             cls:'elig-ready',  rank:2 };
    if (s >= 3.0)                         return { label:'Watch List',         cls:'elig-watch',  rank:3 };
    return                                       { label:'Not Eligible',       cls:'elig-not',    rank:4 };
}

let promoScored = data.filter(d => parseFloat(d.total_score) > 0);

let promoStrong  = promoScored.filter(d => promoEligibility(d).rank === 1);
let promoReady   = promoScored.filter(d => promoEligibility(d).rank === 2);
let promoWatch   = promoScored.filter(d => promoEligibility(d).rank === 3);
let promoNotElig = promoScored.filter(d => promoEligibility(d).rank === 4);

// ── PANEL 1: Eligibility Table ─────────────────────────────────────────────
let promoRows = [...promoStrong, ...promoReady, ...promoWatch]
    .sort((a, b) => parseFloat(b.total_score) - parseFloat(a.total_score))
    .map((d, i) => {
        let e     = promoEligibility(d);
        let s     = parseFloat(d.total_score);
        let self  = parseFloat(d.custom_total_self_score) || 0;
        let delta = (s - self).toFixed(2);
        let deltaSign = delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : `= 0.00`;
        let deltaCls  = delta > 0 ? 'color:#28a745' : delta < 0 ? 'color:#C8102E' : 'color:#868e96';
        let barW      = Math.min(100, Math.round((s / 5) * 100));
        let barColor  = s >= 4.0 ? '#28a745' : s >= 3 ? '#f4a100' : '#C8102E';
        let rankNum   = i + 1;
        let rankHtml  = rankNum <= 3
            ? `<span class="ud-rank-badge ud-rank-${rankNum}">${rankNum}</span>`
            : `<span class="ud-rank-badge ud-rank-n">${rankNum}</span>`;
        return `<tr>
            <td>${rankHtml}</td>
            <td>
                <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
                <div style="font-size:10px;color:#868e96;">${d.employee}</div>
            </td>
            <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
            <td style="font-size:11px;">${d.custom_unit || '—'}</td>
            <td style="font-size:11px;">${d.custom_division || '—'}</td>
            <td>
                <div class="ud-score-sparkbar">
                    <div class="sb-track"><div class="sb-fill"
                        style="width:${barW}%;background:${barColor};
                               -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div></div>
                    <span style="font-weight:700;font-size:11px;min-width:30px;">${s.toFixed(2)}</span>
                </div>
            </td>
            <td style="text-align:center;font-size:11px;">
                ${self ? self.toFixed(2) : '—'}
            </td>
            <td style="text-align:center;">
                <span style="font-size:11px;font-weight:700;${deltaCls};">${deltaSign}</span>
            </td>
            <td style="text-align:center;">
                <span class="ud-elig-chip ${e.cls}">${e.label}</span>
            </td>
            <td style="text-align:center;">
                ${['Approved','Accepted'].includes(d.workflow_state)
                    ? '<span class="ud-badge ud-badge-green">Completed</span>'
                    : d.custom_appraisal_status === 'Overdue'
                        ? '<span class="ud-badge ud-badge-red">Overdue</span>'
                        : '<span class="ud-badge ud-badge-orange">Pending</span>'}
            </td>
            <td>
                <button class="ud-perf-action ud-act-view"
                    onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="11"
        style="text-align:center;padding:20px;color:#adb5bd;">
        No eligible employees found
    </td></tr>`;

window.promotionEligibilityData = [
    ...promoStrong,
    ...promoReady,
    ...promoWatch
].map(d => {
    const score = parseFloat(d.total_score) || 0;
    const selfScore = parseFloat(d.custom_total_self_score) || 0;
    const eligibility = promoEligibility(d);

    return {
        employee: d.employee,
        employee_name: d.employee_name,
        grade: d.custom_grade,
        unit: d.custom_unit,
        division: d.custom_division,
        score: score,
        self_score: selfScore,
        score_gap: Number((score - selfScore).toFixed(2)),
        eligibility_status: eligibility.label,
        workflow_state: d.workflow_state,
        appraisal_status: d.custom_appraisal_status
    };
});

let eligPanelHtml = `
    <div style="font-size:11px;color:#868e96;margin-bottom:12px;">
        <strong>Strong Candidate</strong>: Score ≥ 4.0 + Assessor/Self delta ≤ 0.5 + Appraisal completed.
        <strong>Ready</strong>: Score ≥ 3.5 + completed.
        <strong>Watch</strong>: Score ≥ 3.0.
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
        <div class="ud-promo-kpi pp-gold">
            <div class="pkv2">${promoStrong.length}</div>
            <div class="pkl2">Strong Candidates</div>
        </div>
        <div class="ud-promo-kpi pp-green">
            <div class="pkv2">${promoReady.length}</div>
            <div class="pkl2">Ready</div>
        </div>
        <div class="ud-promo-kpi pp-navy">
            <div class="pkv2">${promoWatch.length}</div>
            <div class="pkl2">Watch List</div>
        </div>
        <div class="ud-promo-kpi pp-red">
            <div class="pkv2">${promoNotElig.length}</div>
            <div class="pkl2">Not Eligible</div>
        </div>
    </div>
    <div class="ud-2col" style="margin-bottom:16px;">
        <div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                Eligibility Distribution
            </div>
            <div style="position:relative;width:100%;height:220px;">
                <canvas id="ud-promo-donut"></canvas>
            </div>
        </div>
        <div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                Eligible Employees by Unit
            </div>
            <div style="position:relative;width:100%;height:220px;">
                <canvas id="ud-promo-unit-bar"></canvas>
            </div>
        </div>
    </div>
    <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
        📋 Promotion Eligibility Register
        <span style="font-size:10px;font-weight:400;color:#868e96;margin-left:8px;">
            (${promoStrong.length + promoReady.length + promoWatch.length} employees shown)
        </span>
    </div>
    <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
        <table class="ud-table">
            <thead><tr>
                <th style="width:36px;">#</th>
                <th>Employee</th>
                <th>Grade</th>
                <th>Unit</th>
                <th>Division</th>
                <th>Assessor Score</th>
                <th style="text-align:center;">Self Score</th>
                <th style="text-align:center;">Δ Calibration ${ud_thEye('Δ Calibration','Difference between assessor score and self score. Large positive delta = assessor rated much higher than self.','Assessor Score − Self Score\n≥ 0.5 → assessor rated significantly higher\n≤ −0.5 → employee overrated self','e.g. Assessor 4.2 − Self 3.5 = +0.7')}</th>
                <th style="text-align:center;">Eligibility ${ud_thEye('Eligibility','Promotion eligibility status derived from score, calibration alignment, and appraisal completion.','Strong Candidate: score ≥ 4.0 AND |delta| ≤ 0.5 AND completed\nReady: score ≥ 3.5 AND completed\nWatch List: score ≥ 3.0\nNot Eligible: score < 3.0','')}</th>
                <th>Appraisal Status</th>
                <th>Action</th>
            </tr></thead>
            <tbody>${promoRows}</tbody>
        </table>
    </div>`;

// ── PANEL 2: Leniency / Stringency Trends ─────────────────────────────────
// Leniency = assessor avg score significantly above population avg (>0.5)
// Stringency = assessor avg score significantly below population avg (>0.5 below)
// Measured per unit

let popAvg = promoScored.length
    ? promoScored.reduce((s, d) => s + parseFloat(d.total_score), 0) / promoScored.length
    : 0;

let leniencyUnitMap = {};
promoScored.forEach(d => {
    let u = d.custom_unit || 'Unknown';
    if (!leniencyUnitMap[u]) leniencyUnitMap[u] = { scores: [], selfScores: [] };
    leniencyUnitMap[u].scores.push(parseFloat(d.total_score));
    if (parseFloat(d.custom_total_self_score) > 0)
        leniencyUnitMap[u].selfScores.push(parseFloat(d.custom_total_self_score));
});

function leniencyLabel(unitAvg, pop) {
    let diff = unitAvg - pop;
    if (diff >  0.4) return { label:'Lenient',   cls:'len-lenient',   diff };
    if (diff < -0.4) return { label:'Stringent',  cls:'len-stringent', diff };
    return              { label:'Balanced',   cls:'len-balanced',  diff };
}

let leniencyRows = Object.keys(leniencyUnitMap).sort().map(u => {
    let lu      = leniencyUnitMap[u];
    let n       = lu.scores.length;
    let unitAvg = lu.scores.reduce((a, b) => a + b, 0) / n;
    let selfAvg = lu.selfScores.length
        ? lu.selfScores.reduce((a, b) => a + b, 0) / lu.selfScores.length : null;
    let trend   = leniencyLabel(unitAvg, popAvg);
    let diffSign = trend.diff >= 0 ? `+${trend.diff.toFixed(2)}` : trend.diff.toFixed(2);
    let barW     = Math.min(100, Math.round((unitAvg / 5) * 100));
    let barColor = trend.cls === 'len-lenient' ? '#f4a100'
                 : trend.cls === 'len-stringent' ? '#C8102E' : '#28a745';

    // Variance (spread of scores) — high variance = inconsistent assessor
    let mean = unitAvg;
    let variance = n > 1
        ? lu.scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (n - 1)
        : 0;
    let stdDev = Math.sqrt(variance);
    let spreadCls = stdDev > 1.2 ? 'cvar-high' : stdDev > 0.6 ? 'cvar-med' : 'cvar-low';

    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;">${n}</td>
        <td>
            <div class="ud-score-sparkbar">
                <div class="sb-track"><div class="sb-fill"
                    style="width:${barW}%;background:${barColor};
                           -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div></div>
                <span style="font-weight:700;font-size:11px;min-width:30px;">${unitAvg.toFixed(2)}</span>
            </div>
        </td>
        <td style="text-align:center;font-weight:700;color:#0f1f3d;">${popAvg.toFixed(2)}</td>
        <td style="text-align:center;">
            <span style="font-weight:700;font-size:11px;
                color:${trend.diff >= 0 ? '#28a745' : '#C8102E'};">${diffSign}</span>
        </td>
        <td style="text-align:center;">
            <span class="ud-leniency-chip ${trend.cls}">${trend.label}</span>
        </td>
        <td style="text-align:center;">
            <span class="ud-cvar-chip ${spreadCls}">${stdDev.toFixed(2)}</span>
        </td>
        <td style="text-align:center;color:#C8102E;font-weight:700;">
            ${selfAvg != null ? selfAvg.toFixed(2) : '—'}
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="8"
    style="text-align:center;padding:20px;color:#adb5bd;">
    No data
</td></tr>`;

let leniencyPanelHtml = `
    <div style="background:#e8f4fd;border-left:3px solid #1976d2;border-radius:0 8px 8px 0;
                padding:9px 14px;font-size:12px;margin-bottom:14px;">
        <div style="font-weight:700;color:#0d47a1;font-size:11px;text-transform:uppercase;
                    letter-spacing:.5px;margin-bottom:3px;">ℹ How Leniency is Measured</div>
        <div style="color:#1565c0;">
            Population average assessor score = <strong>${popAvg.toFixed(2)} / 5</strong>.
            Units scoring <strong>&gt; +0.4</strong> above average = Lenient (inflated ratings).
            Units scoring <strong>&gt; 0.4</strong> below average = Stringent (deflated ratings).
            Score spread (Std Dev) indicates assessor consistency within a unit.
        </div>
    </div>
    <div class="ud-2col" style="margin-bottom:16px;">
        <div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                Unit Avg vs Population Avg
            </div>
            <div style="position:relative;width:100%;height:240px;">
                <canvas id="ud-leniency-bar"></canvas>
            </div>
        </div>
        <div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                Score Spread (Std Dev) per Unit
            </div>
            <div style="position:relative;width:100%;height:240px;">
                <canvas id="ud-spread-bar"></canvas>
            </div>
        </div>
    </div>
    <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
        📋 Unit-wise Leniency / Stringency Detail
    </div>
    <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
        <table class="ud-table">
            <thead><tr>
                <th>Unit</th>
                <th style="text-align:center;">Count</th>
                <th>Unit Avg Score</th>
                <th style="text-align:center;">Population Avg</th>
                <th style="text-align:center;">Δ Deviation</th>
                <th style="text-align:center;">Trend</th>
                <th style="text-align:center;">Std Dev (Spread)</th>
                <th style="text-align:center;">Avg Self Score</th>
            </tr></thead>
            <tbody>${leniencyRows}</tbody>
        </table>
    </div>`;

// ── PANEL 3: Delayed Assessments ──────────────────────────────────────────
// Delayed = modified date > 30 days ago AND not completed
// Critical = > 60 days, Warning = 30–60 days

function daysSince(dateStr) {
    if (!dateStr) return null;
    let d = new Date((dateStr || '').split(' ')[0]);
    return Math.floor((new Date() - d) / (1000 * 60 * 60 * 24));
}

let delayedEmployees = data
    .filter(d => !['Approved','Accepted'].includes(d.workflow_state))
    .map(d => ({ d, days: daysSince(d.custom_rollout_date) }))
    .filter(x => x.days !== null && x.days >= 15)
    .sort((a, b) => b.days - a.days);

let delCritical = delayedEmployees.filter(x => x.days > 60).length;
let delWarning  = delayedEmployees.filter(x => x.days >= 30 && x.days <= 60).length;
let delWatch    = delayedEmployees.filter(x => x.days >= 15 && x.days < 30).length;

// Unit-level delay aggregation
let delUnitMap = {};
delayedEmployees.forEach(({ d, days }) => {
    let u = d.custom_unit || 'Unknown';
    if (!delUnitMap[u]) delUnitMap[u] = { critical:0, warning:0, watch:0, total:0, maxDays:0 };
    delUnitMap[u].total++;
    delUnitMap[u].maxDays = Math.max(delUnitMap[u].maxDays, days);
    if (days > 60)       delUnitMap[u].critical++;
    else if (days >= 30) delUnitMap[u].warning++;
    else                 delUnitMap[u].watch++;
});

let delayedRows = delayedEmployees.slice(0, 60).map(({ d, days }) => {
    let cls   = days > 60 ? 'del-critical' : days >= 30 ? 'del-warning' : 'del-ok';
    let label = days > 60 ? `Critical — ${days}d` : days >= 30 ? `Warning — ${days}d` : `Watch — ${days}d`;
    let score = parseFloat(d.total_score);
    let barW  = score > 0 ? Math.min(100, Math.round((score / 5) * 100)) : 0;
    return `<tr>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name || d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade || '—'}</span></td>
        <td style="font-size:11px;">${d.custom_unit || '—'}</td>
        <td style="font-size:11px;">${d.custom_division || '—'}</td>
        <td style="text-align:center;font-weight:700;color:#C8102E;">${days}</td>
        <td style="text-align:center;">
            <span class="ud-delay-chip ${cls}">${label}</span>
        </td>
        <td style="text-align:center;">
            <span class="ud-badge ud-badge-orange">${d.workflow_state || 'Draft'}</span>
        </td>
        <td>
            ${score > 0
                ? `<div class="ud-score-sparkbar">
                       <div class="sb-track"><div class="sb-fill"
                           style="width:${barW}%;background:#0f1f3d;"></div></div>
                       <span style="font-size:10px;font-weight:700;min-width:28px;">${score.toFixed(2)}</span>
                   </div>`
                : '<span style="color:#adb5bd;font-size:11px;">Not scored</span>'}
        </td>
        <td>
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="9"
    style="text-align:center;padding:20px;color:#adb5bd;">
    No delayed assessments detected
</td></tr>`;

let delUnitRows = Object.keys(delUnitMap).sort((a,b) =>
    delUnitMap[b].maxDays - delUnitMap[a].maxDays
).map(u => {
    let du = delUnitMap[u];
    let riskCls = du.critical > 0 ? 'del-critical' : du.warning > 0 ? 'del-warning' : 'del-ok';
    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;color:#C8102E;font-weight:700;">${du.critical}</td>
        <td style="text-align:center;color:#e6a800;font-weight:700;">${du.warning}</td>
        <td style="text-align:center;color:#0f1f3d;font-weight:700;">${du.watch}</td>
        <td style="text-align:center;font-weight:700;">${du.total}</td>
        <td style="text-align:center;font-weight:700;color:#C8102E;">${du.maxDays}d</td>
        <td style="text-align:center;">
            <span class="ud-delay-chip ${riskCls}">
                ${du.critical > 0 ? 'Critical' : du.warning > 0 ? 'Warning' : 'Watch'}
            </span>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="7"
    style="text-align:center;padding:20px;color:#adb5bd;">No delays</td></tr>`;

let delayedPanelHtml = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
        <div class="ud-promo-kpi pp-red">
            <div class="pkv2">${delCritical}</div>
            <div class="pkl2">Critical (&gt;60 days)</div>
        </div>
        <div class="ud-promo-kpi pp-gold">
            <div class="pkv2">${delWarning}</div>
            <div class="pkl2">Warning (30–60 days)</div>
        </div>
        <div class="ud-promo-kpi pp-navy">
            <div class="pkv2">${delWatch}</div>
            <div class="pkl2">Watch (15–30 days)</div>
        </div>
    </div>
    <div class="ud-2col" style="margin-bottom:16px;">
        <div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                Delayed Assessments by Unit
            </div>
            <div style="position:relative;width:100%;height:220px;">
                <canvas id="ud-delay-unit-bar"></canvas>
            </div>
        </div>
        <div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                Delay Severity Breakdown
            </div>
            <div style="position:relative;width:100%;height:220px;">
                <canvas id="ud-delay-donut"></canvas>
            </div>
        </div>
    </div>
    <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
        🏢 Unit-wise Delay Summary
    </div>
    <div style="overflow-x:auto;margin-bottom:18px;">
        <table class="ud-table">
            <thead><tr>
                <th>Unit</th>
                <th style="text-align:center;color:#C8102E;">Critical (&gt;60d)</th>
                <th style="text-align:center;color:#e6a800;">Warning (30–60d)</th>
                <th style="text-align:center;color:#0f1f3d;">Watch (15–30d)</th>
                <th style="text-align:center;">Total Delayed</th>
                <th style="text-align:center;">Max Days</th>
                <th style="text-align:center;">Risk</th>
            </tr></thead>
            <tbody>${delUnitRows}</tbody>
        </table>
    </div>
    <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
        👤 Individual Delayed Assessments
        <span style="font-size:10px;font-weight:400;color:#868e96;margin-left:8px;">
            (${delayedEmployees.length} total, showing up to 60)
        </span>
    </div>
    <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
        <table class="ud-table">
            <thead><tr>
                <th>Employee</th>
                <th>Grade</th>
                <th>Unit</th>
                <th>Division</th>
                <th style="text-align:center;">Days Stalled</th>
                <th style="text-align:center;">Severity</th>
                <th>Workflow State</th>
                <th>Current Score</th>
                <th>Action</th>
            </tr></thead>
            <tbody>${delayedRows}</tbody>
        </table>
    </div>`;

// ── PANEL 4: Calibration Variance ────────────────────────────────────────
// Variance = std dev of assessor scores within a unit
// High variance = inconsistent assessor behaviour
// Also measures: self vs assessor agreement rate per unit

let calibVarUnitMap = {};
promoScored.forEach(d => {
    let u = d.custom_unit || 'Unknown';
    if (!calibVarUnitMap[u]) calibVarUnitMap[u] = {
        assessorScores: [], selfScores: [], alignedCount: 0, total: 0
    };
    let s    = parseFloat(d.total_score);
    let self = parseFloat(d.custom_total_self_score) || 0;
    calibVarUnitMap[u].assessorScores.push(s);
    calibVarUnitMap[u].total++;
    if (self > 0) {
        calibVarUnitMap[u].selfScores.push(self);
        if (Math.abs(s - self) <= 0.5) calibVarUnitMap[u].alignedCount++;
    }
});

function calcStdDev(arr) {
    if (!arr.length) return 0;
    let mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length);
}

let calibVarRows = Object.keys(calibVarUnitMap).sort().map(u => {
    let cv        = calibVarUnitMap[u];
    let n         = cv.assessorScores.length;
    let avgA      = cv.assessorScores.reduce((a,b)=>a+b,0) / n;
    let stdA      = calcStdDev(cv.assessorScores);
    let avgS      = cv.selfScores.length
        ? cv.selfScores.reduce((a,b)=>a+b,0) / cv.selfScores.length : null;
    let alignPct  = cv.selfScores.length
        ? Math.round((cv.alignedCount / cv.selfScores.length) * 100) : null;
    let varCls    = stdA > 1.2 ? 'cvar-high' : stdA > 0.6 ? 'cvar-med' : 'cvar-low';
    let alignCls  = alignPct == null ? '' : alignPct >= 70 ? 'ud-badge-green'
                  : alignPct >= 40 ? 'ud-badge-orange' : 'ud-badge-red';
    let barW      = Math.min(100, Math.round((avgA / 5) * 100));

    // Score range: max - min
    let minScore = Math.min(...cv.assessorScores);
    let maxScore = Math.max(...cv.assessorScores);
    let scoreRange = (maxScore - minScore).toFixed(2);

    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;">${n}</td>
        <td>
            <div class="ud-score-sparkbar">
                <div class="sb-track"><div class="sb-fill"
                    style="width:${barW}%;background:#0f1f3d;
                           -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div></div>
                <span style="font-size:11px;font-weight:700;min-width:30px;">${avgA.toFixed(2)}</span>
            </div>
        </td>
        <td style="text-align:center;">
            <span class="ud-cvar-chip ${varCls}">${stdA.toFixed(2)}</span>
        </td>
        <td style="text-align:center;font-size:11px;font-weight:700;">${scoreRange}</td>
        <td style="text-align:center;font-size:11px;color:#adb5bd;">
            ${minScore.toFixed(2)} – ${maxScore.toFixed(2)}
        </td>
        <td style="text-align:center;">
            ${avgS != null
                ? `<span style="font-weight:700;color:#C8102E;">${avgS.toFixed(2)}</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;">
            ${alignPct != null
                ? `<span class="ud-badge ${alignCls}">${alignPct}% aligned</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;">
            <span class="ud-cvar-chip ${varCls}">
                ${stdA > 1.2 ? 'High Variance' : stdA > 0.6 ? 'Moderate' : 'Low Variance'}
            </span>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="9"
    style="text-align:center;padding:20px;color:#adb5bd;">
    No calibration variance data
</td></tr>`;

let calibVarPanelHtml = `
    <div style="background:#e8f4fd;border-left:3px solid #1976d2;border-radius:0 8px 8px 0;
                padding:9px 14px;font-size:12px;margin-bottom:14px;">
        <div style="font-weight:700;color:#0d47a1;font-size:11px;text-transform:uppercase;
                    letter-spacing:.5px;margin-bottom:3px;">ℹ Calibration Variance Guide</div>
        <div style="color:#1565c0;">
            <strong>Std Dev &gt; 1.2</strong> = High variance (assessor is inconsistent — some employees rated very high, others very low).
            <strong>0.6–1.2</strong> = Moderate spread.
            <strong>&lt; 0.6</strong> = Low variance (consistent scoring).
            <strong>Alignment</strong> = % of employees where assessor score is within ±0.5 of self score.
        </div>
    </div>
    <div class="ud-2col" style="margin-bottom:16px;">
        <div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                Score Std Dev by Unit (Assessor Consistency)
            </div>
            <div style="position:relative;width:100%;height:240px;">
                <canvas id="ud-calibvar-bar"></canvas>
            </div>
        </div>
        <div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                Self–Assessor Alignment Rate by Unit (%)
            </div>
            <div style="position:relative;width:100%;height:240px;">
                <canvas id="ud-align-bar"></canvas>
            </div>
        </div>
    </div>
    <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
        📋 Unit-wise Calibration Variance Detail
    </div>
    <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
        <table class="ud-table">
            <thead><tr>
                <th>Unit</th>
                <th style="text-align:center;">Count</th>
                <th>Avg Assessor Score</th>
                <th style="text-align:center;">Std Dev</th>
                <th style="text-align:center;">Score Range</th>
                <th style="text-align:center;">Min – Max</th>
                <th style="text-align:center;">Avg Self Score</th>
                <th style="text-align:center;">Alignment</th>
                <th style="text-align:center;">Variance Level</th>
            </tr></thead>
            <tbody>${calibVarRows}</tbody>
        </table>
    </div>`;

// ── Assemble full section HTML ─────────────────────────────────────────────
let promotionEligibilityHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-promo">
            <h4 style="white-space: nowrap;">🎖 Promotion Eligibility Report — ${unitLabel}</h4>

        <div class="ud-section-desc">
     <strong>Promotion Eligibility</strong> identifies employees ready for promotion based on score thresholds and assessor alignment.
    <strong>Strong Candidate</strong>: Score ≥ 4.0 + delta ≤ 0.5 + completed.
    <strong>Ready</strong>: ≥ 3.5 + completed. <strong>Watch</strong>: ≥ 3.0.
    The Leniency tab shows rating bias per unit. The Delayed tab tracks stalled assessments affecting eligibility decisions.
</div>
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-promo">

        <div class="ud-promo-tabs">
            <div class="ud-promo-tab pt-elig active"     data-promo="elig">🎖 Eligibility</div>
            <div class="ud-promo-tab"                    data-promo="leniency">⚖ Leniency / Stringency</div>
            <div class="ud-promo-tab"                    data-promo="delayed">⏱ Delayed Assessments</div>
            <div class="ud-promo-tab"                    data-promo="calibvar">📐 Calibration Variance</div>
        </div>

        <div class="ud-promo-panel active" id="udpp-elig">${eligPanelHtml}</div>
        <div class="ud-promo-panel"        id="udpp-leniency">${leniencyPanelHtml}</div>
        <div class="ud-promo-panel"        id="udpp-delayed">${delayedPanelHtml}</div>
        <div class="ud-promo-panel"        id="udpp-calibvar">${calibVarPanelHtml}</div>
        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ Promotion Eligibility Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-promotion-eligibility">Generate Insight</button>
            </div>
            <div id="ai-content-promotion-eligibility" class="ai-body ai-insight-content">
                <p>Click Generate Insight for promotion eligibility analysis<p>
            </div>
        </div>
    </div>
</div>`;
// ═══════════════════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════
function _stdDev(arr) {
    if (arr.length < 2) return 0;
    let m = arr.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - m, 2), 0) / arr.length);
}
function _daysSince(ds) {
    if (!ds) return null;
    return Math.floor((Date.now() - new Date((ds || '').split(' ')[0])) / 86400000);
}
function _spkBar(score, hex) {
    let w = Math.min(100, Math.round((parseFloat(score) || 0) / 5 * 100));
    return `<div class="ud-spk">
        <div class="st"><div class="sf" style="width:${w}%;background:${hex};"></div></div>
        <span style="font-size:11px;font-weight:700;min-width:28px;">${parseFloat(score).toFixed(2)}</span>
    </div>`;
}
function _statBadge(d) {
    if (['Approved','Accepted'].includes(d.workflow_state))
        return `<span class="ud-badge ud-badge-green">Completed</span>`;
    if (d.custom_appraisal_status === 'Overdue')
        return `<span class="ud-badge ud-badge-red">Overdue</span>`;
    return `<span class="ud-badge ud-badge-orange">${d.workflow_state || 'Draft'}</span>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 1 — AVERAGE RATING BY UNIT
// ═══════════════════════════════════════════════════════════════════════════

let arScored = data.filter(d => parseFloat(d.total_score) > 0);
let arPopAvg = arScored.length
    ? arScored.reduce((s, d) => s + parseFloat(d.total_score), 0) / arScored.length : 0;

// Aggregate by unit
let arUnitMap = {};
arScored.forEach(d => {
    let u = d.custom_unit || 'Unknown';
    let g = d.custom_grade || 'Unknown';
    if (!arUnitMap[u]) arUnitMap[u] = {
        scores:[], selfScores:[], grades:{}, workerScores:[], staffScores:[]
    };
    let s = parseFloat(d.total_score);
    arUnitMap[u].scores.push(s);
    if (parseFloat(d.custom_total_self_score) > 0)
        arUnitMap[u].selfScores.push(parseFloat(d.custom_total_self_score));
    if (!arUnitMap[u].grades[g]) arUnitMap[u].grades[g] = [];
    arUnitMap[u].grades[g].push(s);
    if (['A1','A2','A3','A4'].includes(g)) arUnitMap[u].workerScores.push(s);
    else arUnitMap[u].staffScores.push(s);
});

// Aggregate by grade across all data
let arGradeMap = {};
arScored.forEach(d => {
    let g = d.custom_grade || 'Unknown';
    if (!arGradeMap[g]) arGradeMap[g] = { scores:[], unit:d.custom_unit || '' };
    arGradeMap[g].scores.push(parseFloat(d.total_score));
});

let arUnitRows = Object.keys(arUnitMap).sort().map(u => {
    let au      = arUnitMap[u];
    let n       = au.scores.length;                          // scored employees
    let total   = data.filter(d => (d.custom_unit||'Unknown') === u).length; // total employees
    let totalScore    = au.scores.reduce((a,b) => a+b, 0);
    let totalSelfScore = au.selfScores.reduce((a,b) => a+b, 0);
    let avg     = n ? parseFloat((totalScore / n).toFixed(2)) : 0;
    let selfAvg = au.selfScores.length ? parseFloat((totalSelfScore / au.selfScores.length).toFixed(2)) : null;
    let wAvg    = au.workerScores.length ? parseFloat((au.workerScores.reduce((a,b)=>a+b,0)/au.workerScores.length).toFixed(2)) : null;
    let sAvg    = au.staffScores.length  ? parseFloat((au.staffScores.reduce((a,b)=>a+b,0)/au.staffScores.length).toFixed(2))  : null;
    let diff    = parseFloat((avg - arPopAvg).toFixed(2));
    let diffStyle = diff > 0.2  ? 'color:#28a745;font-weight:700'
                  : diff < -0.2 ? 'color:#C8102E;font-weight:700'
                  : 'color:#e6a800;font-weight:700';
    let barHex  = avg >= 4 ? '#28a745' : avg >= 3 ? '#ffc107' : '#C8102E';

    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;font-weight:600;">${total}</td>
        <td style="text-align:center;font-weight:600;color:#0f1f3d;">${n}</td>
        
        <td style="text-align:center;font-weight:700;">
            ${au.selfScores.length ? totalSelfScore.toFixed(2) : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;">
            ${selfAvg != null
                ? `<span style="font-weight:700;">${selfAvg.toFixed(2)}</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;font-weight:700;color:#0f1f3d;">${totalScore.toFixed(2)}</td>
        <td>${_spkBar(avg, barHex)}</td>
        
        <td style="text-align:center;font-weight:700;color:#0f1f3d;">${arPopAvg.toFixed(2)}</td>
        <td style="text-align:center;">
            <span style="${diffStyle}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}</span>
        </td>
        <td style="text-align:center;">
            ${wAvg != null
                ? `<span style="font-weight:700;">${wAvg.toFixed(2)}</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;">
            ${sAvg != null
                ? `<span style="font-weight:700;">${sAvg.toFixed(2)}</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="11" style="text-align:center;padding:20px;color:#adb5bd;">No scored appraisals</td></tr>`;

// Grade table rows
let arGradeRows = Object.keys(arGradeMap).sort().map(g => {
    let ag            = arGradeMap[g];
    let n             = ag.scores.length;                        // scored
    let totalEmp      = data.filter(d => (d.custom_grade||'Unknown') === g).length;
    let totalScore    = ag.scores.reduce((a,b) => a+b, 0);
    let selfScores    = data
        .filter(d => (d.custom_grade||'Unknown') === g && parseFloat(d.custom_total_self_score) > 0)
        .map(d => parseFloat(d.custom_total_self_score));
    let totalSelfScore = selfScores.reduce((a,b) => a+b, 0);
    let avg           = n ? parseFloat((totalScore / n).toFixed(2)) : 0;
    let isWorkerGrade = ['A1','A2','A3','A4'].includes(g);
    let barHex        = avg >= 4 ? '#28a745' : avg >= 3 ? '#ffc107' : '#C8102E';

    return `<tr>
        <td><span class="ud-badge ud-badge-blue">${g}</span></td>
        <td style="font-size:11px;color:#868e96;">${isWorkerGrade ? '🔧 Worker' : '💼 Staff'}</td>
        <td style="text-align:center;font-weight:600;">${totalEmp}</td>
        <td style="text-align:center;font-weight:600;color:#0f1f3d;">${n}</td>
        
        <td style="text-align:center;font-weight:700;color:#7b1fa2;">
            ${selfScores.length ? totalSelfScore.toFixed(2) : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;font-weight:700;color:#0f1f3d;">${totalScore.toFixed(2)}</td>
        <td>${_spkBar(avg, barHex)}</td>
    </tr>`;
}).join('') || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#adb5bd;">No data</td></tr>`;

// Top/bottom units
let arUnitsSorted = Object.keys(arUnitMap).sort((a,b)=>{
    let aA = arUnitMap[a].scores.reduce((x,y)=>x+y,0)/arUnitMap[a].scores.length;
    let bA = arUnitMap[b].scores.reduce((x,y)=>x+y,0)/arUnitMap[b].scores.length;
    return bA - aA;
});
let arTopUnit    = arUnitsSorted[0] || '—';
let arBottomUnit = arUnitsSorted[arUnitsSorted.length-1] || '—';
let arTopAvg     = arTopUnit !== '—'
    ? (arUnitMap[arTopUnit].scores.reduce((a,b)=>a+b,0)/arUnitMap[arTopUnit].scores.length).toFixed(2) : '—';
let arBottomAvg  = arBottomUnit !== '—'
    ? (arUnitMap[arBottomUnit].scores.reduce((a,b)=>a+b,0)/arUnitMap[arBottomUnit].scores.length).toFixed(2) : '—';

let avgRatingHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-avgrating">
        <h4 style="white-space: nowrap;">📊 Average Rating by Unit — ${unitLabel}</h4>
        <div class="ud-section-desc">
            <strong>Average Rating by Unit</strong> benchmarks each unit's average assessor score against the overall population average (${arPopAvg.toFixed(2)}/5).
            <strong>Green</strong> = above average · <strong>Red</strong> = below average · <strong>Yellow</strong> = within ±0.2.
            Use the Grade tab to compare scores across employee grades and the Chart tab for visual comparisons.
        </div>
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-avgrating">

        <div class="ud-ns-kpi-row">
            <div class="ud-ns-kpi nkc-navy">
                <div class="nkv">${arScored.length}</div>
                <div class="nkl">Total Scored</div>
            </div>
            <div class="ud-ns-kpi nkc-purple">
                <div class="nkv">${arPopAvg.toFixed(2)}</div>
                <div class="nkl">Overall Avg Score</div>
            </div>
            <div class="ud-ns-kpi nkc-green">
                <div class="nkv">${arTopUnit}</div>
                <div class="nkl">Highest Unit (${arTopAvg})</div>
            </div>
            <div class="ud-ns-kpi nkc-red">
                <div class="nkv">${arBottomUnit}</div>
                <div class="nkl">Lowest Unit (${arBottomAvg})</div>
            </div>
            <div class="ud-ns-kpi nkc-blue">
                <div class="nkv">${Object.keys(arUnitMap).length}</div>
                <div class="nkl">Units with Data</div>
            </div>
        </div>

        <div class="ud-ns-tabs" id="ud-ar-tabs">
            <div class="ud-ns-tab nst-navy active" data-ar="unit">🏢 By Unit</div>
            <div class="ud-ns-tab" data-ar="grade">📋 By Grade</div>
            <div class="ud-ns-tab" data-ar="chart">📈 Chart View</div>
        </div>

        <div class="ud-ns-panel active" id="udar-unit">
            <div class="ud-ib">
                <div class="ibt">ℹ Reading this table</div>
                <div class="ibb">
                    <strong>Δ vs Pop.</strong> shows how far the unit avg deviates from the overall average
                    (${arPopAvg.toFixed(2)}/5). Green = above average · Red = below average.
                    Worker = Grades A1–A4 · Staff = all other grades.
                    <strong>Avg Score</strong> = Total Score ÷ Scored Employees.
                    <strong>Avg Self Score</strong> = Total Self Score ÷ Employees with Self Score.
                </div>
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Unit</th>
                        <th style="text-align:center;">
                            Total Employees
                            ${ud_thEye(
                                'Total Employees',
                                'Total number of appraisal records for this unit in the selected period, regardless of completion status.',
                                '',
                                'e.g. Unit A has 50 appraisals created → Total Employees = 50'
                            )}
                        </th>
                        <th style="text-align:center;">
                            Scored Employees
                            ${ud_thEye(
                                'Scored Employees',
                                'Employees who have received a final assessor score greater than zero. Only these employees contribute to average score calculations.',
                                'Scored Employees = Number of appraisals with a total score greater than 0',
                                'e.g. 40 of 50 employees have been scored → Scored = 40'
                            )}
                        </th>
                        
                        <th style="text-align:center;">
                            Total Self Score
                            ${ud_thEye(
                                'Total Self Score',
                                'Sum of all self-assessment scores submitted by employees in this unit. Only employees who filled in their self score are counted.',
                                'Total Self Score = Sum of Total Self Score \n\nAvg Self Score = Total Self Score ÷ Employees with Self Score',
                                'e.g. 35 employees submitted self scores summing to 126 → Total Self Score = 126 → Avg = 126 ÷ 35 = 3.60'
                            )}
                        </th>
                        <th style="text-align:center;">
                            Avg Self Score
                            ${ud_thEye(
                                'Avg Self Score',
                                'Average self-assessment score submitted by employees in this unit. Compare against Avg Assessor Score to detect over/under-confidence.',
                                'Avg Self Score = Total Self Score ÷ Employees with Self Score\n\nIf Avg Self > Avg Assessor → employees over-rated themselves\nIf Avg Self < Avg Assessor → assessor rated higher than self',
                                'e.g. Total Self Score 126 ÷ 35 employees = 3.60 / 5'
                            )}
                        </th>
                        <th style="text-align:center;">
                            Asessor Score
                            ${ud_thEye(
                                'Asessor Score',
                                'Sum of all final assessor scores across scored employees in this unit. Dividing this by Scored Employees gives the Average Assessor Score.',
                                'Total Score = Sum of Total Score for all scored employees in unit\n\nAvg Assessor Score = Total Asessor Score ÷ Employees with Assessor Score',
                                'e.g. 40 scored employees with scores summing to 152 → Total Score = 152 → Avg = 152 ÷ 40 = 3.80'
                            )}
                        </th>
                        <th>
                            Avg Assessor Score
                            ${ud_thEye(
                                'Avg Assessor Score',
                                'Average final score awarded by the assessor/manager across all scored employees in this unit. This is the primary performance indicator.',
                                'Avg Assessor Score = Total Asessor Score ÷ Employees with Self Score\n\nColor coding:\n  Green  = above population average\n  Red    = below population average\n  Yellow = within ±0.2 of population average',
                                'e.g. Total Asessor Score 152 ÷ 40 scored employees = 3.80 / 5'
                            )}
                        </th>
                        
                        <th style="text-align:center;">
                            Pop. Avg
                            ${ud_thEye(
                                'Population Average',
                                'Overall average assessor score across ALL units and ALL grades in the current filter selection. Used as the benchmark to identify lenient or stringent units.',
                                'Population Avg = SUM(all total_scores across all units) ÷ No of all scored employees)',
                                'e.g. 800 total score ÷ 200 scored employees = 4.00 population avg'
                            )}
                        </th>
                        <th style="text-align:center;">
                            Δ vs Pop.
                            ${ud_thEye(
                                'Δ vs Population Average',
                                'How far this unit\'s average assessor score deviates from the overall population average. Positive = this unit scores higher than average (potentially lenient). Negative = scores lower (potentially stringent).',
                                'Δ = Avg Assessor Score − Population Avg\n\n> +0.2 → Green  (above average)\n< −0.2 → Red    (below average)\nWithin ±0.2 → Yellow (on par)',
                                'e.g. Unit Avg 4.20 − Pop Avg 3.80 = +0.40 → Green'
                            )}
                        </th>
                        <th style="text-align:center;">
                            Worker Avg
                            ${ud_thEye(
                                'Worker Average Score',
                                'Average assessor score for Worker-grade employees only (Grades A1, A2, A3, A4) within this unit.',
                                'Worker Avg = Sum of Total Score (Grade IN [A1,A2,A3,A4]) ÷ No of scored workers in unit',
                                'e.g. 10 workers with total score 36 → Worker Avg = 36 ÷ 10 = 3.60'
                            )}
                        </th>
                        <th style="text-align:center;">
                            Staff Avg
                            ${ud_thEye(
                                'Staff Average Score',
                                'Average assessor score for Staff-grade employees (all grades except A1–A4) within this unit.',
                                'Staff Avg = Sum of Total Score(Grade NOT IN [A1,A2,A3,A4]) ÷ No of scored staff in unit',
                                'e.g. 30 staff with total score 116 → Staff Avg = 116 ÷ 30 = 3.87'
                            )}
                        </th>
                    </tr></thead>
                    <tbody>${arUnitRows}</tbody>
                </table>
            </div>
        </div>

        <div class="ud-ns-panel" id="udar-grade">
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Grade</th>
                        <th>Category</th>
                        <th style="text-align:center;">
                            Total Employees
                            ${ud_thEye(
                                'Total Employees',
                                'Total appraisal records for this grade regardless of completion status.',
                                '',
                                'e.g. Grade B3 has 15 appraisals → Total = 15'
                            )}
                        </th>
                        <th style="text-align:center;">
                            Scored Employees
                            ${ud_thEye(
                                'Scored Employees',
                                'Employees in this grade who have received a final assessor score greater than zero.',
                                'Scored Employees = Number of appraisals with a total score greater than 0',
                                'e.g. 12 of 15 employees in grade B3 have been scored'
                            )}
                        </th>
                        
                        <th style="text-align:center;">
                            Total Self Score
                            ${ud_thEye(
                                'Total Self Score',
                                'Sum of self-assessment scores for employees in this grade who submitted a self-score.',
                                'Total Self Score = Sum of Total Self Score for all scored employees in this Grade',
                                'e.g. 10 employees submitted self scores summing to 38.0 → Total Self Score = 38.0'
                            )}
                        </th>
                        <th style="text-align:center;">
                            Total Assessor Score
                            ${ud_thEye(
                                'Total Asessor Score',
                                'Sum of all assessor scores for this grade. Used to calculate the average.',
                                'Total Score = Sum of Total Score for all scored employees in this Grade',
                                'e.g. 12 scored employees with scores summing to 45.6 → Total Score = 45.6'
                            )}
                        </th>
                        <th>
                            Avg Score
                            ${ud_thEye(
                                'Average Assessor Score',
                                'Mean final assessor score for all scored employees in this grade.',
                                'Avg Score = Total Score ÷ Scored Employees',
                                'e.g. 45.6 ÷ 12 = 3.80 / 5'
                            )}
                        </th>
                    </tr></thead>
                    <tbody>${arGradeRows}</tbody>
                </table>
            </div>
        </div>

        <div class="ud-ns-panel" id="udar-chart">
            <div class="ud-2col">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Avg Assessor Score by Unit vs Population Average
                    </div>
                    <div style="position:relative;height:260px;">
                        <canvas id="ud-ar-unit-bar"></canvas>
                    </div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Avg Score by Grade
                    </div>
                    <div style="position:relative;height:260px;">
                        <canvas id="ud-ar-grade-bar"></canvas>
                    </div>
                </div>
            </div>
            <div style="margin-top:16px;">
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Total Score vs Total Self Score by Unit
                </div>
                <div style="position:relative;height:220px;">
                    <canvas id="ud-ar-toplw-bar"></canvas>
                </div>
            </div>
        </div>

    </div>
</div>`;

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 2 — APPRAISAL AGING REPORT
// ═══════════════════════════════════════════════════════════════════════════

// Only pending/incomplete appraisals
let agingList = data
    .filter(d => !['Approved', 'Accepted', 'Cancelled'].includes(d.workflow_state))
    .map(d => {
        let days = _daysSince(d.custom_rollout_date);           // ← was: now_date() (always 0)
        let startDays = _daysSince(d.custom_rollout_date);
        return { d, days: days || 0, startDays: startDays || 0 };
    })
    .sort((a, b) => b.days - a.days);

// Severity buckets
let agCrit  = agingList.filter(x => x.days > 60);
let agWarn  = agingList.filter(x => x.days >= 30 && x.days <= 60);
let agWatch = agingList.filter(x => x.days >= 15 && x.days < 30);
let agFresh = agingList.filter(x => x.days < 15);

function agingChip(days) {
    if (days > 60)  return `<span class="ud-aging-chip aging-crit">Critical — ${days}d</span>`;
    if (days >= 30) return `<span class="ud-aging-chip aging-warn">Warning — ${days}d</span>`;
    if (days >= 15) return `<span class="ud-aging-chip aging-watch">Watch — ${days}d</span>`;
    return              `<span class="ud-aging-chip aging-ok">Active — ${days}d</span>`;
}

// Unit summary for aging
let agUnitMap = {};
agingList.forEach(({ d, days }) => {
    let u = d.custom_unit || 'Unknown';
    if (!agUnitMap[u]) agUnitMap[u] = { crit:0, warn:0, watch:0, fresh:0, total:0, maxDays:0, employees:[] };
    agUnitMap[u].total++;
    agUnitMap[u].maxDays = Math.max(agUnitMap[u].maxDays, days);
    agUnitMap[u].employees.push({ d, days });
    if (days > 60)       agUnitMap[u].crit++;
    else if (days >= 30) agUnitMap[u].warn++;
    else if (days >= 15) agUnitMap[u].watch++;
    else                 agUnitMap[u].fresh++;
});

let agUnitRows = Object.keys(agUnitMap)
    .sort((a,b) => agUnitMap[b].maxDays - agUnitMap[a].maxDays)
    .map(u => {
        let au = agUnitMap[u];
        let rCls = au.crit > 0 ? 'aging-crit' : au.warn > 0 ? 'aging-warn' : 'aging-watch';
        let rLbl = au.crit > 0 ? 'Critical' : au.warn > 0 ? 'Warning' : 'Watch';
        return `<tr>
            <td style="font-weight:700;">${u}</td>
            <td style="text-align:center;color:#C8102E;font-weight:700;">${au.crit}</td>
            <td style="text-align:center;color:#e6a800;font-weight:700;">${au.warn}</td>
            <td style="text-align:center;color:#FFEE58;font-weight:700;">${au.watch}</td>
            <td style="text-align:center;color:#28a745;font-weight:700;">${au.fresh}</td>
            <td style="text-align:center;font-weight:700;">${au.total}</td>
            <td style="text-align:center;color:#C8102E;font-weight:700;">${au.maxDays}d</td>
            <td style="text-align:center;">
                <span class="ud-aging-chip ${rCls}">${rLbl}</span>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="8"
        style="text-align:center;padding:16px;color:#adb5bd;">No pending appraisals</td></tr>`;

// Employee-level rows (top 80 by age)
let agEmpRows = agingList.slice(0, 80).map(({ d, days, startDays }) => {
    let s = parseFloat(d.total_score);
    return `<tr>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name||d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade||'—'}</span></td>
        <td style="font-size:11px;">${d.custom_unit||'—'}</td>
        <td style="font-size:11px;">${d.custom_division||'—'}</td>
        <td style="text-align:center;font-weight:700;color:#C8102E;">${days}d</td>
        <td style="text-align:center;">${agingChip(days)}</td>
        <td>${_statBadge(d)}</td>
        <td style="font-size:11px;">${d.appraisal_cycle||'—'}</td>
        <td>
            ${s > 0
                ? _spkBar(s, '#0f1f3d')
                : '<span style="color:#adb5bd;font-size:11px;">Not scored</span>'}
        </td>
        <td>
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="10"
    style="text-align:center;padding:20px;color:#adb5bd;">All appraisals are completed</td></tr>`;

// Assessor-based aging (group by appraisal_cycle as proxy for assessor batch)
let agCycleMap = {};
agingList.forEach(({ d, days }) => {
    let c = d.appraisal_cycle || 'No Cycle';
    if (!agCycleMap[c]) agCycleMap[c] = { total:0, crit:0, warn:0, maxDays:0, avgDays:0, daysArr:[] };
    agCycleMap[c].total++;
    agCycleMap[c].maxDays = Math.max(agCycleMap[c].maxDays, days);
    agCycleMap[c].daysArr.push(days);
    if (days > 60) agCycleMap[c].crit++;
    else if (days >= 30) agCycleMap[c].warn++;
});
Object.keys(agCycleMap).forEach(c => {
    let arr = agCycleMap[c].daysArr;
    agCycleMap[c].avgDays = Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
});

let agCycleRows = Object.keys(agCycleMap)
    .sort((a,b) => agCycleMap[b].maxDays - agCycleMap[a].maxDays)
    .map(c => {
        let ac = agCycleMap[c];
        let rCls = ac.crit > 0 ? 'aging-crit' : ac.warn > 0 ? 'aging-warn' : 'aging-watch';
        return `<tr>
            <td style="font-weight:700;">${c}</td>
            <td style="text-align:center;">${ac.total}</td>
            <td style="text-align:center;color:#C8102E;font-weight:700;">${ac.crit}</td>
            <td style="text-align:center;color:#e6a800;font-weight:700;">${ac.warn}</td>
            <td style="text-align:center;font-weight:700;color:#C8102E;">${ac.maxDays}d</td>
            <td style="text-align:center;font-weight:700;">${ac.avgDays}d</td>
            <td style="text-align:center;">
                <span class="ud-aging-chip ${rCls}">
                    ${ac.crit > 0 ? 'Critical' : ac.warn > 0 ? 'Warning' : 'Watch'}
                </span>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="7"
        style="text-align:center;padding:16px;color:#adb5bd;">No data</td></tr>`;

let agingHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-aging">
            <h4 style="white-space: nowrap;">⏱ Appraisal Aging Report — ${unitLabel}</h4>

        <div class="ud-section-desc">
    <strong>Appraisal Aging Report</strong> tracks how long pending appraisals have been stalled since the rollout date.
    <strong>Critical &gt; 60 days · Warning 30–60 days · Watch 15–30 days · Active &lt; 15 days</strong>.
    Escalate Critical and Warning cases immediately to prevent cycle delays.
</div>
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-aging">

        <div class="ud-ns-kpi-row">
            <div class="ud-ns-kpi nkc-red">
                <div class="nkv">${agCrit.length}</div>
                <div class="nkl">Critical (&gt;60 days)</div>
            </div>
            <div class="ud-ns-kpi nkc-gold">
                <div class="nkv">${agWarn.length}</div>
                <div class="nkl">Warning (30–60 days)</div>
            </div>
            <div class="ud-ns-kpi nkc-yellow">
                <div class="nkv">${agWatch.length}</div>
                <div class="nkl">Watch (15–30 days)</div>
            </div>
            <div class="ud-ns-kpi nkc-green">
                <div class="nkv">${agFresh.length}</div>
                <div class="nkl">Active (&lt;15 days)</div>
            </div>
            <div class="ud-ns-kpi nkc-purple">
                <div class="nkv">${agingList.length > 0
                    ? Math.round(agingList.reduce((s,x)=>s+x.days,0)/agingList.length)+'d'
                    : '0d'}</div>
                <div class="nkl">Avg Pending Age</div>
            </div>
        </div>

        <div class="ud-2col" style="margin-bottom:16px;">
            <div>
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Aging Severity by Unit
                </div>
                <div style="position:relative;height:220px;">
                    <canvas id="ud-aging-unit-bar"></canvas>
                </div>
            </div>
            <div>
                <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                    Severity Distribution
                </div>
                <div style="position:relative;height:220px;">
                    <canvas id="ud-aging-donut"></canvas>
                </div>
            </div>
        </div>

        <div class="ud-ns-tabs" id="ud-ag-tabs">
            <div class="ud-ns-tab nst-red active" data-ag="emp">
                👤 By Employee (${agingList.length})
            </div>
            <div class="ud-ns-tab" data-ag="unit">🏢 By Unit</div>
            <div class="ud-ns-tab" data-ag="cycle">📅 By Cycle</div>
        </div>

<div class="ud-ns-panel active" id="udag-emp">
    <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
        <table class="ud-table" style="width:100%;">
            <thead><tr>
                <th>Employee</th>
                <th>Grade</th>
                <th>Unit</th>
                <th>Division</th>
                <th style="text-align:center;">Pending Days ${ud_thEye('Pending Days','Number of days since the appraisal rollout date. Measures how long the appraisal has been stalled.','> 60d → Critical\n30–60d → Warning\n15–30d → Watch\n< 15d → Active','e.g. Rollout 01-Jan, today 15-Mar = 74 days → Critical')}</th>
                <th style="text-align:center;">Severity ${ud_thEye('Severity','Risk classification based on number of days stalled since rollout date.','> 60 days → Critical (escalate immediately)\n30–60 days → Warning (follow up)\n15–30 days → Watch (monitor)\n< 15 days → Active (on track)','')}</th>
                <th>State</th>
                <th>Cycle</th>
                <th>Current Score</th>
                <th>Action</th>
            </tr></thead>
            <tbody id="ud-ag-emp-tbody"></tbody>
        </table>
    </div>
    <div id="ud-ag-emp-pagination" style="display:none;flex;align-items:center;justify-content:space-between;padding:10px 4px;margin-top:4px;border-top:1px solid #e9ecef;">
        <button id="ud-ag-prev" style="padding:5px 14px;font-size:12px;border:1px solid #dee2e6;border-radius:4px;background:#fff;cursor:pointer;color:#495057;">◀ Prev</button>
        <span id="ud-ag-page-info" style="font-size:12px;color:#868e96;"></span>
        <button id="ud-ag-next" style="padding:5px 14px;font-size:12px;border:1px solid #dee2e6;border-radius:4px;background:#fff;cursor:pointer;color:#495057;">Next ▶</button>
    </div>
</div>

        <div class="ud-ns-panel" id="udag-unit">
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Unit</th>
                        <th style="text-align:center;color:#ffffff;">Critical &gt;60d</th>
                        <th style="text-align:center;color:#ffffff;">Warning 30–60d</th>
                        <th style="text-align:center;color:#ffffff;">Watch 15–30d</th>
                        <th style="text-align:center;color:#ffffff;">Active &lt;15d</th>
                        <th style="text-align:center;color:#ffffff;">Total</th>
                        <th style="text-align:center;color:#ffffff;">Max Age</th>
                        <th style="text-align:center;color:#ffffff;">Risk</th>
                    </tr></thead>
                    <tbody>${agUnitRows}</tbody>
                </table>
            </div>
        </div>

        <div class="ud-ns-panel" id="udag-cycle">
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Appraisal Cycle</th>
                        <th style="text-align:center;color:#ffffff;">Pending</th>
                        <th style="text-align:center;color:#ffffff;">Critical</th>
                        <th style="text-align:center;color:#ffffff;">Warning</th>
                        <th style="text-align:center;color:#ffffff;">Max Age</th>
                        <th style="text-align:center;color:#ffffff;">Avg Age</th>
                        <th style="text-align:center;color:#ffffff;">Risk</th>
                    </tr></thead>
                    <tbody>${agCycleRows}</tbody>
                </table>
            </div>
        </div>
        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ Appraisal Ageing Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-appraisal-ageing">Generate Insight</button>
            </div>
            <div id="ai-content-appraisal-ageing" class="ai-body ai-insight-content">
                <p>Click Generate Insight for appraisal ageing analysis<p>
            </div>
        </div>
    </div>
</div>`;

// ═══════════════════════════════════════════════════════════════════════════
//  SECTION 3 — ASSESSOR EFFECTIVENESS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

let aeScored2  = data.filter(d => parseFloat(d.total_score) > 0);
let aePop2     = aeScored2.length
    ? aeScored2.reduce((s,d)=>s+parseFloat(d.total_score),0)/aeScored2.length : 0;

// Build per-unit map
let aeUnitMap2 = {};
aeScored2.forEach(d => {
    let u = d.custom_unit || 'Unknown';
    if (!aeUnitMap2[u]) aeUnitMap2[u] = {
        aScores:[], sScores:[], aligned:0, withSelf:0, total:0
    };
    let a = parseFloat(d.total_score);
    let s = parseFloat(d.custom_total_self_score) || 0;
    aeUnitMap2[u].aScores.push(a);
    aeUnitMap2[u].total++;
    if (s > 0) {
        aeUnitMap2[u].sScores.push(s);
        aeUnitMap2[u].withSelf++;
        if (Math.abs(a - s) <= 0.5) aeUnitMap2[u].aligned++;
    }
});

function lenTag(unitAvg, pop) {
    let d = unitAvg - pop;
    if (d >  0.4) return { lbl:'Lenient',   cls:'aeff-lenient',  hex:'#f4a100', d };
    if (d < -0.4) return { lbl:'Stringent',  cls:'aeff-stringent',hex:'#C8102E', d };
    return              { lbl:'Balanced',   cls:'aeff-balanced', hex:'#28a745', d };
}
function varTag(sd) {
    if (sd > 1.2) return { lbl:'High',    cls:'aeff-hi-var'  };
    if (sd > 0.6) return { lbl:'Moderate',cls:'aeff-med-var' };
    return              { lbl:'Low',     cls:'aeff-lo-var'  };
}

let aeLenient2   = Object.keys(aeUnitMap2).filter(u=>{
    let a=aeUnitMap2[u].aScores.reduce((x,y)=>x+y,0)/aeUnitMap2[u].aScores.length;
    return lenTag(a,aePop2).lbl==='Lenient';}).length;
let aeStringent2 = Object.keys(aeUnitMap2).filter(u=>{
    let a=aeUnitMap2[u].aScores.reduce((x,y)=>x+y,0)/aeUnitMap2[u].aScores.length;
    return lenTag(a,aePop2).lbl==='Stringent';}).length;
let aeHiVar2     = Object.keys(aeUnitMap2).filter(u=>_stdDev(aeUnitMap2[u].aScores)>1.0).length;
let aeAlignPct2  = aeScored2.length ? Math.round(
    aeScored2.filter(d=>{
        let a=parseFloat(d.total_score), s=parseFloat(d.custom_total_self_score)||0;
        return s>0 && Math.abs(a-s)<=0.5;
    }).length / aeScored2.filter(d=>parseFloat(d.custom_total_self_score)>0).length * 100
) : 0;

// Delayed list (stalled pending ≥15 days)
let aeDelayed2 = data
    .filter(d => !['Approved','Accepted'].includes(d.workflow_state))
    .map(d => ({ d, days: _daysSince(d.custom_rollout_date)||0 }))
    .filter(x => x.days >= 15)
    .sort((a,b)=>b.days-a.days);

let aeDelUnitMap2 = {};
aeDelayed2.forEach(({ d, days }) => {
    let u = d.custom_unit || 'Unknown';
    if (!aeDelUnitMap2[u]) aeDelUnitMap2[u] = { crit:0, warn:0, watch:0, total:0, maxDays:0 };
    aeDelUnitMap2[u].total++;
    aeDelUnitMap2[u].maxDays = Math.max(aeDelUnitMap2[u].maxDays, days);
    if (days > 60) aeDelUnitMap2[u].crit++;
    else if (days >= 30) aeDelUnitMap2[u].warn++;
    else aeDelUnitMap2[u].watch++;
});

// ── Panel 1: Overview ──────────────────────────────────────────────────────
let aeOverviewRows2 = Object.keys(aeUnitMap2).sort().map(u => {
    let au = aeUnitMap2[u];
    let n  = au.total;
    let avgA = au.aScores.reduce((a,b)=>a+b,0)/n;
    let sd   = _stdDev(au.aScores);
    let lt   = lenTag(avgA, aePop2);
    let vt   = varTag(sd);
    let ap   = au.withSelf ? Math.round(au.aligned/au.withSelf*100) : null;
    let apCls = ap==null?'':ap>=70?'ud-badge-green':ap>=40?'ud-badge-orange':'ud-badge-red';
    let dSign = lt.d>=0?`+${lt.d.toFixed(2)}`:lt.d.toFixed(2);
    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;">${n}</td>
        <td>${_spkBar(avgA, lt.hex)}</td>
        <td style="text-align:center;font-weight:700;color:#0f1f3d;">${aePop2.toFixed(2)}</td>
        <td style="text-align:center;">
            <span style="font-weight:700;font-size:11px;
                color:${lt.d>=0?'#28a745':'#C8102E'};">${dSign}</span>
        </td>
        <td style="text-align:center;">
            <span class="ud-aeff-chip ${lt.cls}">${lt.lbl}</span>
        </td>
        <td style="text-align:center;">
            <span class="ud-aeff-chip ${vt.cls}">${sd.toFixed(2)} — ${vt.lbl}</span>
        </td>
        <td style="text-align:center;">
            ${ap!=null
                ? `<span class="ud-badge ${apCls}">${ap}% aligned</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="8"
    style="text-align:center;padding:20px;color:#adb5bd;">No scored data</td></tr>`;
let assessorEffectivenessData = Object.keys(aeUnitMap2).sort().map(u => {
    let au = aeUnitMap2[u];
    let n  = au.total;

    let avgA = au.aScores.reduce((a,b)=>a+b,0) / n;
    let sd   = _stdDev(au.aScores);

    let lt   = lenTag(avgA, aePop2);
    let vt   = varTag(sd);

    let ap = au.withSelf
        ? Math.round((au.aligned / au.withSelf) * 100)
        : null;

    return {
        unit: u,
        total_assessments: n,
        avg_assessor_score: Number(avgA.toFixed(2)),
        organization_avg_score: Number(aePop2.toFixed(2)),
        deviation_from_org_avg: Number(lt.d.toFixed(2)),
        leniency_label: lt.lbl,
        score_variance: Number(sd.toFixed(2)),
        variance_label: vt.lbl,
        alignment_percent: ap,
        aligned_count: au.aligned || 0,
        self_assessed_count: au.withSelf || 0
    };
});

window.assessorEffectivenessData = assessorEffectivenessData;

// ── Panel 2: Leniency / Stringency ────────────────────────────────────────
let aeLenRows2 = Object.keys(aeUnitMap2).sort().map(u => {
    let au  = aeUnitMap2[u];
    let n   = au.total;
    let avgA = au.aScores.reduce((a,b)=>a+b,0)/n;
    let avgS = au.sScores.length ? au.sScores.reduce((a,b)=>a+b,0)/au.sScores.length : null;
    let sd   = _stdDev(au.aScores);
    let lt   = lenTag(avgA, aePop2);
    let vt   = varTag(sd);
    let infP = aePop2>0 ? ((avgA-aePop2)/aePop2*100).toFixed(1) : '0.0';
    let infSign = infP>=0?`+${infP}%`:`${infP}%`;
    let infStyle = infP>0?'color:#f4a100;font-weight:700':infP<0?'color:#C8102E;font-weight:700':'color:#28a745;font-weight:700';
    let dSign = lt.d>=0?`+${lt.d.toFixed(2)}`:lt.d.toFixed(2);
    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;">${n}</td>
        <td>${_spkBar(avgA, lt.hex)}</td>
        <td style="text-align:center;">
            ${avgS!=null
                ? `<span style="font-weight:700;color:#C8102E;">${avgS.toFixed(2)}</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;font-weight:700;color:#0f1f3d;">${aePop2.toFixed(2)}</td>
        <td style="text-align:center;">
            <span style="font-size:11px;font-weight:700;
                color:${lt.d>=0?'#28a745':'#C8102E'};">${dSign}</span>
        </td>
        <td style="text-align:center;">
            <span style="${infStyle}">${infSign}</span>
        </td>
        <td style="text-align:center;">
            <span class="ud-aeff-chip ${lt.cls}">${lt.lbl}</span>
        </td>
        <td style="text-align:center;">
            <span class="ud-aeff-chip ${vt.cls}">${sd.toFixed(2)} — ${vt.lbl}</span>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="9"
    style="text-align:center;padding:20px;color:#adb5bd;">No data</td></tr>`;

// ── Panel 3: Delayed ──────────────────────────────────────────────────────
let aeDelUnitRows2 = Object.keys(aeDelUnitMap2)
    .sort((a,b)=>aeDelUnitMap2[b].maxDays-aeDelUnitMap2[a].maxDays)
    .map(u => {
        let du = aeDelUnitMap2[u];
        let rCls = du.crit>0?'aging-crit':du.warn>0?'aging-warn':'aging-watch';
        return `<tr>
            <td style="font-weight:700;">${u}</td>
            <td style="text-align:center;color:#C8102E;font-weight:700;">${du.crit}</td>
            <td style="text-align:center;color:#e6a800;font-weight:700;">${du.warn}</td>
            <td style="text-align:center;color:#0f1f3d;font-weight:700;">${du.watch}</td>
            <td style="text-align:center;font-weight:700;">${du.total}</td>
            <td style="text-align:center;color:#C8102E;font-weight:700;">${du.maxDays}d</td>
            <td style="text-align:center;">
                <span class="ud-aging-chip ${rCls}">
                    ${du.crit>0?'Critical':du.warn>0?'Warning':'Watch'}
                </span>
            </td>
        </tr>`;
    }).join('') || `<tr><td colspan="7"
        style="text-align:center;padding:16px;color:#adb5bd;">No delays</td></tr>`;

let aeDelEmpRows2 = aeDelayed2.slice(0,60).map(({d,days})=>{
    let cls = days>60?'aging-crit':days>=30?'aging-warn':'aging-watch';
    let lbl = days>60?`Critical—${days}d`:days>=30?`Warning—${days}d`:`Watch—${days}d`;
    let s   = parseFloat(d.total_score);
    return `<tr>
        <td>
            <div style="font-weight:700;font-size:12px;">${d.employee_name||d.employee}</div>
            <div style="font-size:10px;color:#868e96;">${d.employee}</div>
        </td>
        <td><span class="ud-badge ud-badge-blue">${d.custom_grade||'—'}</span></td>
        <td style="font-size:11px;">${d.custom_unit||'—'}</td>
        <td style="text-align:center;font-weight:700;color:#C8102E;">${days}d</td>
        <td style="text-align:center;"><span class="ud-aging-chip ${cls}">${lbl}</span></td>
        <td>${_statBadge(d)}</td>
        <td>${s>0?_spkBar(s,'#0f1f3d'):'<span style="color:#adb5bd;font-size:11px;">Not scored</span>'}</td>
        <td>
            <button class="ud-perf-action ud-act-view"
                onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="8"
    style="text-align:center;padding:20px;color:#adb5bd;">No delayed assessments</td></tr>`;

// ── Panel 4: Calibration Variance ─────────────────────────────────────────
let aeCalibRows2 = Object.keys(aeUnitMap2).sort().map(u => {
    let au   = aeUnitMap2[u];
    let n    = au.total;
    let avgA = au.aScores.reduce((a,b)=>a+b,0)/n;
    let sd   = _stdDev(au.aScores);
    let minS = Math.min(...au.aScores);
    let maxS = Math.max(...au.aScores);
    let rng  = (maxS-minS).toFixed(2);
    let avgS = au.sScores.length ? au.sScores.reduce((a,b)=>a+b,0)/au.sScores.length : null;
    let ap   = au.withSelf ? Math.round(au.aligned/au.withSelf*100) : null;
    let apCls = ap==null?'':ap>=70?'ud-badge-green':ap>=40?'ud-badge-orange':'ud-badge-red';
    let vt   = varTag(sd);
    return `<tr>
        <td style="font-weight:700;">${u}</td>
        <td style="text-align:center;">${n}</td>
        <td>${_spkBar(avgA,'#0f1f3d')}</td>
        <td style="text-align:center;">
            <span class="ud-aeff-chip ${vt.cls}">${sd.toFixed(2)}</span>
        </td>
        <td style="text-align:center;font-weight:700;">${rng}</td>
        <td style="text-align:center;color:#868e96;font-size:11px;">${minS.toFixed(2)} – ${maxS.toFixed(2)}</td>
        <td style="text-align:center;">
            ${avgS!=null
                ? `<span style="font-weight:700;color:#C8102E;">${avgS.toFixed(2)}</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;">
            ${ap!=null
                ? `<span class="ud-badge ${apCls}">${ap}% aligned</span>`
                : '<span style="color:#adb5bd;">—</span>'}
        </td>
        <td style="text-align:center;">
            <span class="ud-aeff-chip ${vt.cls}">${vt.lbl} Variance</span>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="9"
    style="text-align:center;padding:20px;color:#adb5bd;">No calibration data</td></tr>`;

let assessorEffHtml = `
<div class="ud-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-aeff2">
        <h4 style="white-space: nowrap;">🔍 Assessor Effectiveness Dashboard — ${unitLabel}
            ${ud_thEye('Assessor Effectiveness Dashboard',
                'Detects rating bias per unit by comparing each unit\'s average assessor score against the overall population average. Identifies lenient, stringent, and inconsistent assessors.',
                'Population Avg = SUM(all total_scores) / COUNT(all scored employees)\nLenient    : Unit Avg − Pop Avg > +0.4\nStringent  : Unit Avg − Pop Avg < −0.4\nBalanced   : Within ±0.4\nHigh Variance: Std Dev > 1.2',
                'e.g. Pop Avg = 3.50. Unit A avg = 4.10 → deviation +0.60 → Lenient')}
        </h4>
        <div class="ud-section-desc">
            <strong>Assessor Effectiveness</strong> detects rating bias per unit by comparing unit averages against the population average (${aePop2.toFixed(2)}/5).
            <strong>Lenient</strong> units rate &gt;+0.4 above average (inflated). <strong>Stringent</strong> units rate &gt;0.4 below (deflated).
            High Std Dev within a unit indicates inconsistent scoring behavior by the assessor.
        </div>
        <span class="ud-toggle-icon">▼</span>
    </div>
    <div class="ud-section-body ud-collapsible-body" id="ud-body-aeff2">

        <!-- ── KPI Row ── -->
        <div class="ud-ns-kpi-row">
            <div class="ud-ns-kpi nkc-navy">
                <div class="nkv">${aeScored2.length}</div>
                <div class="nkl">
                    Total Scored
                    ${ud_thEye('Total Scored',
                        'Total number of employees across all units who have received a final assessor score greater than zero.',
                        'COUNT WHERE total_score > 0',
                        'e.g. 120 of 150 employees have been scored → Total Scored = 120')}
                </div>
            </div>
            <div class="ud-ns-kpi nkc-gold">
                <div class="nkv">${aeLenient2}</div>
                <div class="nkl">
                    Lenient Units
                    ${ud_thEye('Lenient Units',
                        'Units whose average assessor score is more than +0.4 above the overall population average. Indicates inflated ratings.',
                        'Lenient = COUNT of units WHERE (Unit Avg − Pop Avg) > +0.4\nPop Avg = ' + aePop2.toFixed(2),
                        'e.g. Unit avg 4.20 vs pop avg 3.50 → deviation +0.70 → Lenient')}
                </div>
            </div>
            <div class="ud-ns-kpi nkc-red">
                <div class="nkv">${aeStringent2}</div>
                <div class="nkl">
                    Stringent Units
                    ${ud_thEye('Stringent Units',
                        'Units whose average assessor score is more than 0.4 below the overall population average. Indicates deflated or harsh ratings.',
                        'Stringent = COUNT of units WHERE (Unit Avg − Pop Avg) < −0.4\nPop Avg = ' + aePop2.toFixed(2),
                        'e.g. Unit avg 2.90 vs pop avg 3.50 → deviation −0.60 → Stringent')}
                </div>
            </div>
            <div class="ud-ns-kpi nkc-purple">
                <div class="nkv">${aeHiVar2}</div>
                <div class="nkl">
                    High Variance Units
                    ${ud_thEye('High Variance Units',
                        'Units where the standard deviation of assessor scores exceeds 1.0 — indicating inconsistent scoring within the unit.',
                        'High Variance = COUNT of units WHERE Std Dev > 1.0\nStd Dev = √(Σ(score − mean)² / n)',
                        'e.g. Scores ranging from 1.5 to 5.0 in one unit → Std Dev likely > 1.2 → High Variance')}
                </div>
            </div>
            <div class="ud-ns-kpi nkc-green">
                <div class="nkv">${aeAlignPct2}%</div>
                <div class="nkl">
                    Overall Alignment
                    ${ud_thEye('Overall Alignment',
                        'Percentage of employees (across all units) where the assessor score is within ±0.5 of the employee\'s self score. High alignment means assessors and employees agree.',
                        'Alignment % = COUNT(|assessor − self| ≤ 0.5) / COUNT(employees with self score) × 100%',
                        'e.g. 80 of 100 employees within ±0.5 → 80% overall alignment')}
                </div>
            </div>
        </div>

        <!-- ── Tab Bar ── -->
        <div class="ud-ns-tabs" id="ud-ae2-tabs">
            <div class="ud-ns-tab nst-navy active" data-ae2="overview">
                📊 Overview
                ${ud_thEye('Overview Tab',
                    'Shows each unit\'s average assessor score vs the population average, leniency classification, score spread, and alignment rate.',
                    'Metrics per unit:\n  Avg Assessor Score\n  Population Avg (benchmark)\n  Δ Deviation\n  Leniency Trend\n  Std Dev\n  Alignment %',
                    '')}
            </div>
            <div class="ud-ns-tab" data-ae2="leniency">
                ⚖ Leniency / Stringency
                ${ud_thEye('Leniency / Stringency Tab',
                    'Compares each unit\'s average against the population average and calculates an Inflation Index showing how far ratings deviate.',
                    'Inflation Index = ((Unit Avg − Pop Avg) / Pop Avg) × 100%\n\nLenient    : deviation > +0.4\nStringent  : deviation < −0.4\nBalanced   : within ±0.4',
                    'e.g. Unit avg 4.0, Pop avg 3.5 → Inflation = +14.3% → Lenient')}
            </div>
            <div class="ud-ns-tab" data-ae2="delayed">
                ⏱ Delayed Assessments
                ${ud_thEye('Delayed Assessments Tab',
                    'Tracks incomplete appraisals that have been stalled based on the rollout date.',
                    'Delayed = appraisals NOT IN [Approved, Accepted] WHERE days since rollout date ≥ 15\n\nCritical : > 60 days\nWarning  : 30–60 days\nWatch    : 15–30 days',
                    'e.g. Appraisal last modified 45 days ago, still Pending → Warning')}
            </div>
            <div class="ud-ns-tab" data-ae2="calibvar">
                📐 Calibration Variance
                ${ud_thEye('Calibration Variance Tab',
                    'Measures how consistently an assessor scores employees within their unit using standard deviation and self-assessor alignment.',
                    'Std Dev = √(Σ(score − mean)² / n)\n\n> 1.2 → High Variance (inconsistent)\n0.6–1.2 → Moderate\n< 0.6 → Low (consistent)\n\nAlignment = % within ±0.5 of self score',
                    'e.g. Std Dev 0.4 → consistent assessor · Std Dev 1.8 → widely inconsistent')}
            </div>
        </div>

        <!-- ══════════════ Overview Panel ══════════════ -->
        <div class="ud-ns-panel active" id="udae2-overview">
            <div class="ud-ib">
                <div class="ibt">ℹ Effectiveness Metrics</div>
                <div class="ibb">
                    Population avg = <strong>${aePop2.toFixed(2)}/5</strong>.
                    <strong>Lenient</strong>: unit avg &gt;+0.4 above pop.
                    <strong>Stringent</strong>: unit avg &gt;0.4 below pop.
                    <strong>Std Dev</strong>: score spread within unit.
                    <strong>Alignment</strong>: % within ±0.5 of self score.
                </div>
            </div>
            <div class="ud-2col" style="margin-bottom:16px;">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Unit Avg vs Population Avg
                        ${ud_thEye('Unit Avg vs Population Avg',
                            'Bar chart comparing each unit\'s average assessor score against the population average (dashed line). Bars above the line = lenient; below = stringent.',
                            'Bar color:\n  Gold   = Lenient (> +0.4)\n  Red    = Stringent (< −0.4)\n  Green  = Balanced (within ±0.4)\n\nDashed line = Population Avg ' + aePop2.toFixed(2),
                            'e.g. Unit bar reaches 4.2 while dashed line is at 3.5 → Lenient unit')}
                    </div>
                    <div style="position:relative;height:240px;">
                        <canvas id="ud-ae2-overview-bar"></canvas>
                    </div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Leniency / Stringency Breakdown
                        ${ud_thEye('Leniency / Stringency Breakdown',
                            'Doughnut chart showing how many units are classified as Lenient, Stringent, or Balanced.',
                            'Lenient    = Unit Avg − Pop Avg > +0.4\nStringent  = Unit Avg − Pop Avg < −0.4\nBalanced   = Within ±0.4',
                            'e.g. 3 Lenient + 1 Stringent + 4 Balanced = 8 units total')}
                    </div>
                    <div style="position:relative;height:240px;">
                        <canvas id="ud-ae2-len-donut"></canvas>
                    </div>
                </div>
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Unit</th>
                        <th style="text-align:center;">
                            Count
                            ${ud_thEye('Count', 'Total employees with a scored appraisal in this unit.', 'COUNT WHERE total_score > 0 AND unit = U', '', 'dark')}
                        </th>
                        <th>
                            Avg Assessor Score
                            ${ud_thEye('Avg Assessor Score', 'Mean final assessor score across all scored employees in this unit.', 'SUM(total_score) / COUNT(scored employees) per unit', 'e.g. 40 scored employees, sum = 152 → avg = 3.80', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Pop. Avg
                            ${ud_thEye('Population Average', 'Overall average assessor score across ALL units and grades in the current selection. Used as the fairness benchmark.', 'SUM(all total_scores) / COUNT(all scored employees)', 'e.g. 200 employees, total score 700 → Pop Avg = 3.50', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Δ
                            ${ud_thEye('Δ Deviation', 'Unit average minus population average. Positive = unit scores higher than average (lenient). Negative = unit scores lower (stringent).', 'Δ = Unit Avg − Pop Avg\n> +0.4 → Lenient\n< −0.4 → Stringent\nWithin ±0.4 → Balanced', 'e.g. Unit Avg 4.10 − Pop Avg 3.50 = +0.60 → Lenient', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Trend
                            ${ud_thEye('Trend', 'Leniency classification label based on the deviation from the population average.', 'Lenient    : Δ > +0.4\nStringent  : Δ < −0.4\nBalanced   : −0.4 ≤ Δ ≤ +0.4', 'e.g. Δ = +0.60 → Lenient', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Std Dev
                            ${ud_thEye('Standard Deviation', 'Measures how spread out the assessor scores are within this unit. High Std Dev = inconsistent scoring behaviour.', 'Std Dev = √(Σ(score − mean)² / n)\n\n> 1.2 → High Variance (inconsistent)\n0.6–1.2 → Moderate\n< 0.6 → Consistent', 'e.g. Scores: 2.0, 3.0, 4.5, 5.0 → Std Dev ≈ 1.3 → High Variance', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Alignment
                            ${ud_thEye('Alignment', 'Percentage of employees in this unit where the assessor score is within ±0.5 of the employee self score. High = well-calibrated assessor.', 'Alignment % = COUNT(|assessor − self| ≤ 0.5) / COUNT(employees with self score) × 100%', 'e.g. 30 of 40 employees within ±0.5 → 75% aligned', 'dark')}
                        </th>
                    </tr></thead>
                    <tbody>${aeOverviewRows2}</tbody>
                </table>
            </div>
        </div>

        <!-- ══════════════ Leniency Panel ══════════════ -->
        <div class="ud-ns-panel" id="udae2-leniency">
            <div class="ud-ib">
                <div class="ibt">ℹ Leniency / Stringency</div>
                <div class="ibb">
                    Pop avg = <strong>${aePop2.toFixed(2)}/5</strong>.
                    Units &gt;+0.4 are lenient (inflated ratings).
                    Units &gt;0.4 below are stringent (deflated ratings).
                    <strong>Inflation Index</strong> = % deviation from population average.
                </div>
            </div>
            <div class="ud-2col" style="margin-bottom:16px;">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Unit Avg vs Pop. Avg Line
                        ${ud_thEye('Unit Avg vs Pop. Avg Line',
                            'Bar chart showing each unit\'s average score with a reference line at the population average. Bar color reflects leniency classification.',
                            'Gold bar  = Lenient (Δ > +0.4)\nRed bar   = Stringent (Δ < −0.4)\nGreen bar = Balanced\nDashed line = Pop Avg ' + aePop2.toFixed(2),
                            '')}
                    </div>
                    <div style="position:relative;height:240px;">
                        <canvas id="ud-ae2-len-bar"></canvas>
                    </div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Score Spread (Std Dev) per Unit
                        ${ud_thEye('Score Spread (Std Dev) per Unit',
                            'Bar chart showing the standard deviation of assessor scores per unit. High bars = inconsistent scoring.',
                            'Std Dev = √(Σ(score − mean)² / n)\n\nBar color:\n  Red   = High Variance (> 1.2)\n  Amber = Moderate (0.6–1.2)\n  Green = Low / Consistent (< 0.6)',
                            'e.g. Unit with Std Dev 1.5 has scores ranging widely → inconsistent assessor')}
                    </div>
                    <div style="position:relative;height:240px;">
                        <canvas id="ud-ae2-spread-bar"></canvas>
                    </div>
                </div>
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Unit</th>
                        <th style="text-align:center;">
                            Count
                            ${ud_thEye('Count', 'Total scored employees in this unit.', 'COUNT WHERE total_score > 0 AND unit = U', '', 'dark')}
                        </th>
                        <th>
                            Avg Assessor
                            ${ud_thEye('Avg Assessor', 'Mean final assessor score for this unit.', 'SUM(total_score) / COUNT(scored) per unit', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Avg Self
                            ${ud_thEye('Avg Self Score', 'Mean self-assessment score submitted by employees in this unit.', 'SUM(custom_total_self_score) / COUNT(employees with self score) per unit', 'e.g. If Avg Self > Avg Assessor → employees over-rated themselves', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Pop. Avg
                            ${ud_thEye('Population Average', 'Overall average assessor score across all units. Benchmark for leniency detection.', 'SUM(all scores) / COUNT(all scored)', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Δ Dev.
                            ${ud_thEye('Δ Deviation', 'Unit Avg minus Population Avg.', 'Δ = Unit Avg − Pop Avg\n> +0.4 → Lenient\n< −0.4 → Stringent', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Inflation %
                            ${ud_thEye('Inflation Index (%)', 'Percentage by which the unit\'s average deviates from the population average. Positive = inflated ratings.', 'Inflation % = ((Unit Avg − Pop Avg) / Pop Avg) × 100%', 'e.g. Unit 4.0 vs Pop 3.5 → +14.3% inflation', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Trend
                            ${ud_thEye('Trend', 'Leniency label based on deviation threshold.', 'Lenient / Stringent / Balanced', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Std Dev
                            ${ud_thEye('Std Dev', 'Score spread within the unit. High = inconsistent assessor.', '> 1.2 → High · 0.6–1.2 → Moderate · < 0.6 → Consistent', '', 'dark')}
                        </th>
                    </tr></thead>
                    <tbody>${aeLenRows2}</tbody>
                </table>
            </div>
        </div>

        <!-- ══════════════ Delayed Panel ══════════════ -->
        <div class="ud-ns-panel" id="udae2-delayed">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
                <div class="ud-ns-kpi nkc-red">
                    <div class="nkv">${aeDelayed2.filter(x=>x.days>60).length}</div>
                    <div class="nkl">
                        Critical (&gt;60d)
                        ${ud_thEye('Critical Delayed',
                            'Incomplete appraisals that have been stalled for more than 60 days since the last modification.',
                            'COUNT WHERE workflow_state NOT IN [Approved, Accepted]\nAND rollout date > 60',
                            'e.g. Last modified Jan 1, today March 10 = 68 days → Critical')}
                    </div>
                </div>
                <div class="ud-ns-kpi nkc-gold">
                    <div class="nkv">${aeDelayed2.filter(x=>x.days>=30&&x.days<=60).length}</div>
                    <div class="nkl">
                        Warning (30–60d)
                        ${ud_thEye('Warning Delayed',
                            'Incomplete appraisals stalled between 30 and 60 days.',
                            'COUNT WHERE workflow_state NOT IN [Approved, Accepted]\nAND 30 ≤ rollout date ≤ 60',
                            'e.g. Last modified 45 days ago → Warning')}
                    </div>
                </div>
                <div class="ud-ns-kpi nkc-navy">
                    <div class="nkv">${aeDelayed2.filter(x=>x.days>=15&&x.days<30).length}</div>
                    <div class="nkl">
                        Watch (15–30d)
                        ${ud_thEye('Watch Delayed',
                            'Incomplete appraisals stalled between 15 and 30 days — monitor closely.',
                            'COUNT WHERE workflow_state NOT IN [Approved, Accepted]\nAND 15 ≤ rollout date < 30',
                            'e.g. Last modified 20 days ago → Watch')}
                    </div>
                </div>
            </div>
            <div class="ud-2col" style="margin-bottom:16px;">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Delayed Assessments by Unit
                        ${ud_thEye('Delayed Assessments by Unit',
                            'Stacked bar showing Critical, Warning, and Watch delayed appraisals per unit.',
                            'Stacked segments:\n  Red   = Critical > 60d\n  Amber = Warning 30–60d\n  Navy  = Watch 15–30d',
                            'e.g. Unit A has 2 Critical + 3 Warning = 5 delayed appraisals')}
                    </div>
                    <div style="position:relative;height:220px;">
                        <canvas id="ud-ae2-delay-unit"></canvas>
                    </div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Delay Severity Split
                        ${ud_thEye('Delay Severity Split',
                            'Doughnut chart showing the proportion of Critical, Warning, and Watch delayed appraisals across all units.',
                            'Critical > 60d · Warning 30–60d · Watch 15–30d',
                            'e.g. 5 Critical + 8 Warning + 10 Watch = 23 total delayed')}
                    </div>
                    <div style="position:relative;height:220px;">
                        <canvas id="ud-ae2-delay-donut"></canvas>
                    </div>
                </div>
            </div>
            <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
                🏢 Unit-wise Delay Summary
                ${ud_thEye('Unit-wise Delay Summary',
                    'Table showing count of Critical, Warning, and Watch delayed appraisals per unit, along with the maximum stall age in days.',
                    'Max Days = MAX(rollout date) per unit for incomplete appraisals\nRisk = Critical if any Critical > 0, else Warning if any Warning > 0, else Watch',
                    '')}
            </div>
            <div style="overflow-x:auto;margin-bottom:18px;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Unit</th>
                        <th style="text-align:center;">
                            Critical &gt;60d
                            ${ud_thEye('Critical', 'Appraisals stalled > 60 days.', 'rollout date > 60', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Warning 30–60d
                            ${ud_thEye('Warning', 'Appraisals stalled 30–60 days.', '30 ≤ rollout date ≤ 60', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Watch 15–30d
                            ${ud_thEye('Watch', 'Appraisals stalled 15–30 days.', '15 ≤ rollout date < 30', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Total
                            ${ud_thEye('Total Delayed', 'Total delayed appraisals in this unit (Critical + Warning + Watch).', 'Critical + Warning + Watch', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Max Days
                            ${ud_thEye('Max Days', 'The longest stall duration among all delayed appraisals in this unit.', 'MAX(rollout date) per unit', 'e.g. 92d means one appraisal has been stalled for 92 days', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Risk
                            ${ud_thEye('Risk', 'Overall risk level for this unit based on the most severe delay category present.', 'Critical if any > 60d\nWarning if any 30–60d\nWatch otherwise', '', 'dark')}
                        </th>
                    </tr></thead>
                    <tbody>${aeDelUnitRows2}</tbody>
                </table>
            </div>
            <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
                👤 Individual Delayed Records
                <span style="font-size:10px;font-weight:400;color:#868e96;margin-left:8px;">
                    (${aeDelayed2.length} total · showing 60)
                </span>
                ${ud_thEye('Individual Delayed Records',
                    'Lists individual employees with stalled incomplete appraisals, sorted by most days stalled first.',
                    'Filtered: workflow_state NOT IN [Approved, Accepted] AND rollout date ≥ 15\nSorted: rollout date DESC\nLimited: top 60 records',
                    'e.g. Employee X last modified 75 days ago, still Pending → Critical row')}
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Employee</th>
                        <th>Grade</th>
                        <th>Unit</th>
                        <th style="text-align:center;">
                            Days
                            ${ud_thEye('Days Stalled', 'Number of days since the appraisal was last modified, for incomplete appraisals only.', 'TODAY − modified date (for incomplete appraisals)', 'e.g. Modified Jan 1, today March 10 = 68 days', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Severity
                            ${ud_thEye('Severity', 'Risk classification based on days stalled.', '> 60d → Critical\n30–60d → Warning\n15–30d → Watch', '', 'dark')}
                        </th>
                        <th>State</th>
                        <th>Score</th>
                        <th>Action</th>
                    </tr></thead>
                    <tbody>${aeDelEmpRows2}</tbody>
                </table>
            </div>
        </div>

        <!-- ══════════════ Calibration Variance Panel ══════════════ -->
        <div class="ud-ns-panel" id="udae2-calibvar">
            <div class="ud-ib">
                <div class="ibt">ℹ Calibration Variance Guide</div>
                <div class="ibb">
                    <strong>Std Dev &gt;1.2</strong> = High variance (inconsistent scoring).
                    <strong>0.6–1.2</strong> = Moderate.
                    <strong>&lt;0.6</strong> = Consistent.
                    <strong>Alignment</strong> = % within ±0.5 of self score.
                </div>
            </div>
            <div class="ud-2col" style="margin-bottom:16px;">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Score Std Dev by Unit
                        ${ud_thEye('Score Std Dev by Unit',
                            'Bar chart showing standard deviation of assessor scores per unit. Higher bar = more inconsistent scoring.',
                            'Std Dev = √(Σ(score − mean)² / n)\n\nBar color:\n  Red   = High (> 1.2)\n  Amber = Moderate (0.6–1.2)\n  Green = Low / Consistent (< 0.6)',
                            'e.g. Unit A Std Dev = 0.3 → consistent · Unit B Std Dev = 1.6 → inconsistent')}
                    </div>
                    <div style="position:relative;height:240px;">
                        <canvas id="ud-ae2-calibvar-bar"></canvas>
                    </div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        Self–Assessor Alignment Rate (%)
                        ${ud_thEye('Self–Assessor Alignment Rate',
                            'Bar chart showing the percentage of employees per unit where the assessor score is within ±0.5 of the self score.',
                            'Alignment % = COUNT(|assessor − self| ≤ 0.5) / COUNT(with self score) × 100%\n\nBar color:\n  Green = ≥ 70% aligned\n  Amber = 40–70%\n  Red   = < 40%',
                            'e.g. Unit with 75% alignment → assessor and employee perceptions are well-matched')}
                    </div>
                    <div style="position:relative;height:240px;">
                        <canvas id="ud-ae2-align-bar"></canvas>
                    </div>
                </div>
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Unit</th>
                        <th style="text-align:center;">
                            Count
                            ${ud_thEye('Count', 'Total scored employees in this unit.', 'COUNT WHERE total_score > 0', '', 'dark')}
                        </th>
                        <th>
                            Avg Assessor
                            ${ud_thEye('Avg Assessor Score', 'Mean final assessor score for this unit.', 'SUM(total_score) / COUNT(scored)', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Std Dev
                            ${ud_thEye('Standard Deviation', 'Score spread within the unit. Measures assessor consistency.', 'Std Dev = √(Σ(score − mean)² / n)\n> 1.2 → High · 0.6–1.2 → Moderate · < 0.6 → Consistent', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Range
                            ${ud_thEye('Score Range', 'Difference between the highest and lowest assessor score in this unit.', 'Range = MAX(total_score) − MIN(total_score)', 'e.g. Max 5.0 − Min 2.0 = Range 3.0', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Min–Max
                            ${ud_thEye('Min – Max', 'The lowest and highest assessor scores recorded in this unit.', 'MIN(total_score) and MAX(total_score) per unit', 'e.g. 1.5 – 4.8', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Avg Self
                            ${ud_thEye('Avg Self Score', 'Mean self-assessment score for employees in this unit who submitted a self score.', 'SUM(custom_total_self_score) / COUNT(employees with self score)', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Alignment
                            ${ud_thEye('Alignment', 'Percentage of employees where assessor score is within ±0.5 of self score.', 'COUNT(|assessor − self| ≤ 0.5) / COUNT(with self score) × 100%\n≥ 70% → Green · 40–70% → Amber · < 40% → Red', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Variance Level
                            ${ud_thEye('Variance Level', 'Categorical label for assessor consistency based on Std Dev threshold.', '> 1.2 → High Variance\n0.6–1.2 → Moderate\n< 0.6 → Low Variance (Consistent)', '', 'dark')}
                        </th>
                    </tr></thead>
                    <tbody>${aeCalibRows2}</tbody>
                </table>
            </div>
        </div>

        <!-- ── AI Insight Card ── -->
        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ Assessor Effectiveness Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-assessor-effectiveness">Generate Insight</button>
            </div>
            <div id="ai-content-assessor-effectiveness" class="ai-body ai-insight-content">
                <p>Click Generate Insight for assessor effectiveness analysis</p>
            </div>
        </div>

    </div>
</div>`;

let successionReadinessHtml = `
<div class="ud-section ud-succ-wrap" id="ud-succ-section">
    <div class="ud-section-header ud-toggle" data-target="ud-body-succ">
        <h4 style="white-space: nowrap;">🔄 Succession Readiness — ${unitLabel}</h4>
        
        <span class="ud-toggle-icon">▼</span>
    </div>

    <div class="ud-section-body ud-collapsible-body" id="ud-body-succ">

        <!-- ── Summary KPI row ── -->
        <div class="ud-readiness-row" id="ud-succ-kpi-row"></div>

        <!-- ── Sub-tab navigation ── -->
        <div class="ud-succ-tabs" id="ud-succ-tabs">
            <div class="ud-succ-tab st-pipeline active" data-succ="pipeline">
                🚀 HiPo Pipeline
                ${ud_thEye('HiPo Pipeline',
                    'Swimlane view of all scored employees grouped into four performance tiers.',
                    'HiPo   : total_score ≥ 4.0\nStrong : 3.5 ≤ score < 4.0\nSolid  : 2.5 ≤ score < 3.5\nAt Risk: score < 2.5',
                    'e.g. 10 employees scored ≥ 4.0 → appear in HiPo lane')}
            </div>
            <div class="ud-succ-tab st-roles" data-succ="roles">
                🎯 Critical Role Readiness
                ${ud_thEye('Critical Role Readiness',
                    'Groups employees by appraisal template (used as a proxy for job category) and shows succession depth per role.',
                    'Ready Now  : HiPo + Completed appraisal\nReady 1yr  : Strong + Completed, OR HiPo + Incomplete\nReady 2yr  : Solid + Completed\nNo Successor: At Risk, OR Incomplete (not HiPo/Strong)',
                    'e.g. Template "Site Engineer" has 2 Ready Now, 3 Ready 1yr → good succession depth')}
            </div>
            <div class="ud-succ-tab st-gaps" data-succ="gaps">
                ⚠ Gap Analysis
                ${ud_thEye('Gap Analysis',
                    'Flags critical succession risks: overdue appraisals, HiPo retention alerts, roles with no ready successor, and single-point-of-failure categories.',
                    'Succession Gap    = Overdue OR unscored appraisals\nHiPo Alert        = HiPo employee with overdue appraisal\nNo Successor      = Role with 0 Ready Now + 0 Ready 1yr\nSingle Point Risk = Role with only 1 HiPo or Strong employee',
                    'e.g. If "Project Manager" template has only 1 HiPo employee → single-point-of-failure risk')}
            </div>
        </div>

        <!-- Panel: HiPo Pipeline -->
        <div class="ud-succ-panel active" id="udsp-pipeline">
            <div style="font-size:11px;color:#868e96;margin-bottom:12px;">
                Employees are placed in tiers by appraisal score.
                <strong>HiPo ≥ 4.0 · Strong 3.5–3.99 · Solid 2.5–3.49 · At Risk &lt; 2.5</strong>
                ${ud_thEye('Tier Classification',
                    'Each employee is placed into a tier based on their final assessor score from the current appraisal cycle.',
                    'HiPo   : total_score ≥ 4.0\nStrong : 3.5 ≤ total_score < 4.0\nSolid  : 2.5 ≤ total_score < 3.5\nAt Risk: total_score < 2.5\n\nOnly employees with total_score > 0 are placed in tiers.',
                    'e.g. Score 4.2 → HiPo lane · Score 3.6 → Strong lane · Score 2.1 → At Risk lane')}
            </div>
            <div class="ud-pipeline" id="ud-succ-pipeline"></div>
            <!-- 
            <div style="margin-top:16px;">
                <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
                    📊 Bench Strength by Unit
                    ${ud_thEye('Bench Strength',
                        'Shows the proportion of HiPo, Strong, Solid, and At Risk employees within each unit as a stacked progress bar.',
                        'Bench Depth % = (HiPo + Strong) ÷ Total Scored × 100\n\nColor guide:\n  Green  = HiPo\n  Blue   = Strong\n  Amber  = Solid\n  Red    = At Risk',
                        'e.g. Unit A: 5 HiPo + 8 Strong out of 30 scored = 43% bench depth')}
                </div>
                <div id="ud-bench-overview"></div>
            </div>
             -->
        </div>

        <!-- Panel: Critical Role Readiness -->
        <div class="ud-succ-panel" id="udsp-roles">
            <div style="font-size:11px;color:#868e96;margin-bottom:12px;">
                Roles are inferred from appraisal templates and grade bands.
                Readiness is derived from score tier and appraisal completion.
                ${ud_thEye('How Roles are Inferred',
                    'Critical roles are proxied from the Appraisal Template field. Each unique template + unit combination is treated as a distinct role category.',
                    'Role Key = appraisal_template + custom_unit\n\nIf appraisal_template is blank → shown as "Unknown Template"',
                    'e.g. Template "Site Supervisor" in Unit "Civil" = one critical role row')}
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-role-tbl" id="ud-role-table">
                    <thead><tr>
                        <th>
                            Critical Category
                            ${ud_thEye('Critical Category',
                                'The appraisal template used as a proxy for job role/category.',
                                '',
                                'e.g. "Site Engineer", "HSE Officer", "Project Manager"', 'dark')}
                        </th>
                        <th>
                            Unit
                            ${ud_thEye('Unit',
                                'The organisational unit this role category belongs to.',
                                '', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Total Incumbents
                            ${ud_thEye('Total Incumbents',
                                'Total number of employees (appraisals) linked to this template + unit combination, regardless of completion.',
                                'No of appraisals WHERE template = T AND unit = U', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            HiPo Count
                            ${ud_thEye('HiPo Count',
                                'Number of employees in this role category who scored 4.0 or above.',
                                'Total Score ≥ 4.0', '', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Ready Now
                            ${ud_thEye('Ready Now',
                                'Employees who are immediately promotable: HiPo score AND appraisal fully completed.',
                                'Total Score ≥ 4.0\nAND workflow_state IN [Approved, Accepted]',
                                'e.g. Score 4.3, Approved → Ready Now', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Ready 1 yr
                            ${ud_thEye('Ready 1 Year',
                                'Employees who could be ready within 1 year with development: Strong performers with completed appraisal, or HiPo with incomplete appraisal.',
                                'CASE 1: 3.5 ≤ Total Score < 4.0 AND workflow_state IN [Approved, Accepted]\nCASE 2: total_score ≥ 4.0 AND workflow_state NOT IN [Approved, Accepted]',
                                'e.g. Score 3.7, Approved → Ready 1yr', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            Ready 2 yr
                            ${ud_thEye('Ready 2 Years',
                                'Solid performers with completed appraisals who need more development before advancement.',
                                '2.5 ≤ Total Score < 3.5\nAND workflow_state IN [Approved, Accepted]',
                                'e.g. Score 2.9, Approved → Ready 2yr', 'dark')}
                        </th>
                        <th style="text-align:center;">
                            No Successor
                            ${ud_thEye('No Successor',
                                'Employees with no succession signal: At Risk score, or incomplete appraisal without HiPo/Strong classification.',
                                'total_score < 2.5\nOR (workflow_state NOT IN [Approved, Accepted] AND total_score < 3.5)',
                                'e.g. Score 1.8, Pending → No Successor', 'dark')}
                        </th>
                    </tr></thead>
                    <tbody id="ud-role-tbody"></tbody>
                </table>
            </div>
        </div>

        <!-- Panel: Gap Analysis -->
        <div class="ud-succ-panel" id="udsp-gaps">
            <div style="font-size:11px;color:#868e96;margin-bottom:12px;">
                Succession gaps, retention risks, and readiness coverage signals derived from current appraisal data.
                ${ud_thEye('Gap Analysis Logic',
                    'Four gap signals are computed automatically from appraisal data.',
                    '1. Appraisal Gap      = COUNT WHERE custom_appraisal_status = Overdue OR total_score = 0\n2. HiPo Alert         = HiPo employees (score ≥ 4.0) with overdue appraisal\n3. No Successor Roles = Templates where Ready Now + Ready 1yr = 0\n4. Single Point Risk  = Templates where HiPo + Strong employee count = 1',
                    'e.g. If 3 roles have 0 Ready Now/1yr → 3 gaps flagged as Critical')}
            </div>
            <div class="ud-gap-grid" id="ud-gap-grid"></div>
            <div class="ud-2col" style="margin-top:12px;">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:8px;">
                        Score Distribution by Unit
                        ${ud_thEye('Score Distribution by Unit',
                            'Stacked bar showing count of employees per performance tier per unit.',
                            'Each bar segment = COUNT of employees in that tier for the unit\nTiers: HiPo ≥4.0 | Strong 3.5–4.0 | Solid 2.5–3.5 | At Risk <2.5',
                            'e.g. Unit A: 5 HiPo + 10 Strong + 15 Solid + 3 At Risk = 33 total')}
                    </div>
                    <div class="ud-succ-chart" style="height:240px;">
                        <canvas id="ud-succ-dist-chart"></canvas>
                    </div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:8px;">
                        HiPo : At-Risk Ratio by Unit
                        ${ud_thEye('HiPo : At-Risk Ratio',
                            'Diverging bar showing HiPo+Strong count (positive) vs At Risk count (negative) per unit. A healthy unit has a tall green bar and a short red bar.',
                            'Positive bar = HiPo + Strong employees (green)\nNegative bar = At Risk employees (red, shown below zero)\n\nHealthy ratio = Positive >> Negative',
                            'e.g. Unit B: +12 HiPo/Strong vs −4 At Risk → good ratio')}
                    </div>
                    <div class="ud-succ-chart" style="height:240px;">
                        <canvas id="ud-succ-ratio-chart"></canvas>
                    </div>
                </div>
            </div>
        </div>

    </div><!-- /ud-body-succ -->
</div>`;

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2: ADD ALL THREE SECTIONS TO #ud-main
//  Replace the existing $page.find('#ud-main').html(...) line with this:
// ─────────────────────────────────────────────────────────────────────────────
$('head').append(`<style id="ud-section-desc-styles">
.ud-section-desc {
    background: #f0f4ff;
    border-left: 3px solid #3b82f6;
    border-radius: 0 6px 6px 0;
    padding: 8px 14px;
    font-size: 11px;
    color: #1e40af;
    margin-bottom: 14px;
    line-height: 1.6;
}
.ud-section-desc strong { color: #1e3a8a; }
</style>`);

// $page.find('#ud-main').html(
//     kpiHtml +
//     completionHtml +
//     trendHtml +
//     // (frappe.user.has_role("Projects Manager") ? "" : compHtml) +
//     compHtml +
//     nineBoxHtml+
//     bellHtml +
//     performerHtml +
//     // (frappe.user.has_role("Projects Manager") ? "" : histHtml) +
//     histHtml+
//     avgRatingHtml +
//     assessorEffHtml +
//     agingHtml +

//     // (frappe.user.has_role("Projects Manager") ? "" : calibrationHtml) +
//     calibrationHtml +
//     complianceHtml +
//     perfCompHtml +
//     // (frappe.user.has_role("Projects Manager") ? "" : perfCompHtml) +
//     promotionEligibilityHtml +
//     successionReadinessHtml +
//     ldHtml
// );
renderSectionsByFilter()
if ($page.find('#ud-calib-unit-accordion').length) {
    $page.find('#ud-calib-unit-accordion').html(calibUnitAccordionHtml);
}
// ── Apply sticky headers to all overflow tables globally ─────────────────
$page.find('#ud-main').find('[style*="overflow-x:auto"]').each(function() {
    let $wrap = $(this);
    // Only wrap if it contains a ud-table with more than 10 rows
    let rowCount = $wrap.find('.ud-table tbody tr').length;
    if (rowCount > 10 && !$wrap.hasClass('ud-table-scroll-wrap')) {
        $wrap.addClass('ud-table-scroll-wrap');
    }
});
// ── Aging report employee table pagination ────────────────────────────────
(function() {
    const AG_PAGE_SIZE = 10;
    let agCurrentPage = 0;

    function buildAgEmpRow(item) {
        let d = item.d, days = item.days;
        let s = parseFloat(d.total_score);
        return `<tr>
            <td>
                <div style="font-weight:700;font-size:12px;">${d.employee_name||d.employee}</div>
                <div style="font-size:10px;color:#868e96;">${d.employee}</div>
            </td>
            <td><span class="ud-badge ud-badge-blue">${d.custom_grade||'—'}</span></td>
            <td style="font-size:11px;">${d.custom_unit||'—'}</td>
            <td style="font-size:11px;">${d.custom_division||'—'}</td>
            <td style="text-align:center;font-weight:700;color:#C8102E;">${days}d</td>
            <td style="text-align:center;">${agingChip(days)}</td>
            <td>${_statBadge(d)}</td>
            <td style="font-size:11px;">${d.appraisal_cycle||'—'}</td>
            <td>${s > 0 ? _spkBar(s,'#0f1f3d') : '<span style="color:#adb5bd;font-size:11px;">Not scored</span>'}</td>
            <td>
                <button class="ud-perf-action ud-act-view"
                    onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
            </td>
        </tr>`;
    }

    const agTbody   = document.getElementById('ud-ag-emp-tbody');
    const agPagDiv  = document.getElementById('ud-ag-emp-pagination');
    const agPrev    = document.getElementById('ud-ag-prev');
    const agNext    = document.getElementById('ud-ag-next');
    const agInfo    = document.getElementById('ud-ag-page-info');

    if (!agTbody) return;

    function renderAgPage(page) {
        const total      = agingList.length;
        const totalPages = Math.ceil(total / AG_PAGE_SIZE) || 1;
        const start      = page * AG_PAGE_SIZE;
        const end        = Math.min(start + AG_PAGE_SIZE, total);

        agTbody.innerHTML = agingList.length
            ? agingList.slice(start, end).map(item => buildAgEmpRow(item)).join('')
            : `<tr><td colspan="10" style="text-align:center;padding:20px;color:#adb5bd;">All appraisals are completed</td></tr>`;

        if (agInfo) agInfo.textContent = total > AG_PAGE_SIZE
            ? `Page ${page + 1} of ${totalPages}  (${start + 1}–${end} of ${total})`
            : `${total} record${total !== 1 ? 's' : ''}`;

        if (agPagDiv) agPagDiv.style.display = total > AG_PAGE_SIZE ? 'flex' : 'none';
        if (agPrev)  { agPrev.disabled = page === 0; agPrev.onclick = () => renderAgPage(agCurrentPage - 1); }
        if (agNext)  { agNext.disabled = page >= totalPages - 1; agNext.onclick = () => renderAgPage(agCurrentPage + 1); }
        agCurrentPage = page;
    }

    renderAgPage(0);
})();

// ── Policy deviations table pagination ───────────────────────────────────
(function() {
    const PD_PAGE_SIZE = 10;
    let pdCurrentPage = 0;

    function buildPdRow({ d, issues }) {
        let chips = issues.map(i =>
            `<span class="ud-policy-chip ${i.cls}">${i.type}</span>`
        ).join(' ');
        return `<tr>
            <td>
                <div style="font-weight:700;font-size:12px;">${d.employee_name||d.employee}</div>
                <div style="font-size:10px;color:#868e96;">${d.employee}</div>
            </td>
            <td style="font-size:11px;">${d.custom_unit||'—'}</td>
            <td style="font-size:11px;">${d.custom_division||'—'}</td>
            <td><span class="ud-badge ud-badge-blue">${d.custom_grade||'—'}</span></td>
            <td>${chips}</td>
            <td>
                <button class="ud-perf-action ud-act-view"
                    onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
            </td>
        </tr>`;
    }

    const pdTbody  = document.getElementById('ud-policy-dev-tbody');
    const pdPagDiv = document.getElementById('ud-policy-dev-pagination');
    const pdPrev   = document.getElementById('ud-pd-prev');
    const pdNext   = document.getElementById('ud-pd-next');
    const pdInfo   = document.getElementById('ud-pd-page-info');

    if (!pdTbody) return;

    // Use full policyDeviations array (not sliced to 50)
    const allDeviations = policyDeviations; // already built above
    window.policyDeviationData = policyDeviations;
    function renderPdPage(page) {
        const total      = allDeviations.length;
        const totalPages = Math.ceil(total / PD_PAGE_SIZE) || 1;
        const start      = page * PD_PAGE_SIZE;
        const end        = Math.min(start + PD_PAGE_SIZE, total);

        pdTbody.innerHTML = total
            ? allDeviations.slice(start, end).map(item => buildPdRow(item)).join('')
            : `<tr><td colspan="6" style="text-align:center;padding:20px;color:#adb5bd;">No policy deviations detected</td></tr>`;

        if (pdInfo) pdInfo.textContent = total > PD_PAGE_SIZE
            ? `Page ${page + 1} of ${totalPages}  (${start + 1}–${end} of ${total})`
            : `${total} violation${total !== 1 ? 's' : ''}`;

        if (pdPagDiv) pdPagDiv.style.display = total > PD_PAGE_SIZE ? 'flex' : 'none';
        if (pdPrev)  { pdPrev.disabled = page === 0; pdPrev.onclick = () => renderPdPage(pdCurrentPage - 1); }
        if (pdNext)  { pdNext.disabled = page >= totalPages - 1; pdNext.onclick = () => renderPdPage(pdCurrentPage + 1); }
        pdCurrentPage = page;
    }

    renderPdPage(0);
})();
// ─────────────────────────────────────────────────────────────────────────────
//  STEP 3: ADD CHART RENDERS (paste after existing chart renders)
//  These go inside render_dashboard(), after the bell curve charts.
// ─────────────────────────────────────────────────────────────────────────────

// ── Compliance charts ─────────────────────────────────────────────────────────
let complianceUnitKeys   = Object.keys(complianceUnitMap).sort();
let complianceRates      = complianceUnitKeys.map(u => {
    let cu = complianceUnitMap[u];
    return cu.total ? Math.round((cu.completed / cu.total) * 100) : 0;
});
let complianceBarColors  = complianceRates.map(r =>
    r >= 80 ? '#28a745' : r >= 50 ? '#ffc107' : '#C8102E'
);

// mkChart('ud-compliance-bar', {
//     type: 'bar',
//     data: {
//         labels: complianceUnitKeys,
//         datasets: [{
//             label: 'Completion Rate (%)',
//             data: complianceRates,
//             backgroundColor: complianceBarColors,
//             borderRadius: 5,
//             borderWidth: 0,
//         }]
//     },
//     options: {
//         responsive: true, maintainAspectRatio: false, indexAxis: 'y',
//         scales: {
//             x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
//             y: { ticks: { font: { size: 10 } } }
//         },
//         plugins: {
//             legend: { display: false },
//             tooltip: { callbacks: { label: c => `${c.raw}% completed` } }
//         }
//     }
// });

if ($page.find('#ud-compliance-bar').length) {
    let complianceUnitKeys  = Object.keys(complianceUnitMap).sort();
    let complianceRates     = complianceUnitKeys.map(u => {
        let cu = complianceUnitMap[u];
        return cu.total ? Math.round((cu.completed / cu.total) * 100) : 0;
    });
    let complianceBarColors = complianceRates.map(r =>
        r >= 80 ? '#28a745' : r >= 50 ? '#ffc107' : '#C8102E'
    );
 
    destroyChart('ud-compliance-bar');
    let el = $page.find('#ud-compliance-bar')[0];
    chartInstances['ud-compliance-bar'] = new Chart(el, {
        type: 'bar',
        data: {
            labels: complianceUnitKeys,
            datasets: [{
                label: 'Completion Rate (%)',
                data: complianceRates,
                backgroundColor: complianceBarColors,
                borderRadius: 5,
                borderWidth: 0
            }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive: true,
            layout: { padding: { top: 20 } },
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } },
                y: { ticks: { font: { size: 10 } } }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => `${c.raw}% completed` } }
            }
        }
    });
}
 
// ── Average Rating charts ─────────────────────────────────────────────────
let arUk = Object.keys(arUnitMap).sort();
let arAvgs = arUk.map(u => parseFloat(
    (arUnitMap[u].scores.reduce((a,b)=>a+b,0)/arUnitMap[u].scores.length).toFixed(2)
));
let arColors = arAvgs.map(a =>
    a - arPopAvg > 0.2 ? '#28a745' : a - arPopAvg < -0.2 ? '#C8102E' : '#ffc107'
);

if ($page.find('#ud-ar-unit-bar').length) {
    destroyChart('ud-ar-unit-bar');
    chartInstances['ud-ar-unit-bar'] = new Chart($page.find('#ud-ar-unit-bar')[0], {
        type: 'bar',
        data: {
            labels: arUk,
            datasets: [
                { label:'Unit Avg', data: arAvgs, backgroundColor: arColors, borderRadius:5, borderWidth:0 },
                { label:'Pop. Avg', data: arUk.map(()=>parseFloat(arPopAvg.toFixed(2))),
                  type:'line', borderColor:'#0f1f3d', borderDash:[5,3],
                  borderWidth:2, pointRadius:0, backgroundColor:'transparent' }
            ]
        },
        plugins: [dataLabelPlugin],
        options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 20 } },
    scales: {
        y: {
            min: Math.max(0, parseFloat((arPopAvg - 1.5).toFixed(1))),
            max: Math.min(5, parseFloat((arPopAvg + 1.5).toFixed(1)))
        }
    },
    plugins: {
        legend: {
            position: 'bottom',
            labels: { font: { size: 10 } }
        },
        datalabels: {
            color: '#fff',          // text color inside bar
            anchor: 'center',
            align: 'center',
            font: {
                weight: 'bold',
                size: 11
            },
            formatter: value => value.toFixed(2)
        }
    }
}
    });
}

let arGk = Object.keys(arGradeMap).sort();
let arGAvgs = arGk.map(g => parseFloat(
    (arGradeMap[g].scores.reduce((a,b)=>a+b,0)/arGradeMap[g].scores.length).toFixed(2)
));
let arGColors = arGAvgs.map(a => a>=4?'#28a745':a>=3?'#f4a100':'#C8102E');

if ($page.find('#ud-ar-grade-bar').length) {
    destroyChart('ud-ar-grade-bar');
    chartInstances['ud-ar-grade-bar'] = new Chart($page.find('#ud-ar-grade-bar')[0], {
        type: 'bar',
        data: {
            labels: arGk,
            datasets: [{ label:'Avg Score', data: arGAvgs, backgroundColor: arGColors, borderRadius:5, borderWidth:0 }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false,
            layout: { padding: { top: 20 } },
            scales:{ y:{ beginAtZero:false, min:0, max:5 } },
            plugins:{ legend:{ display:false },
                tooltip:{ callbacks:{ label: c=>`${c.raw}/5` } } }
        }
    });
}

if ($page.find('#ud-ar-toplw-bar').length) {
    destroyChart('ud-ar-toplw-bar');
    chartInstances['ud-ar-toplw-bar'] = new Chart($page.find('#ud-ar-toplw-bar')[0], {
        type: 'bar',
        data: {
            labels: arUk,
            datasets: [
                {
                    label: 'Total Assessor Score',
                    data: arUk.map(u => parseFloat(
                        arUnitMap[u].scores.reduce((a,b)=>a+b,0).toFixed(2)
                    )),
                    backgroundColor: '#0f1f3d',
                    borderRadius: 4,
                    borderWidth: 0
                },
                {
                    label: 'Total Self Score',
                    data: arUk.map(u => parseFloat(
                        arUnitMap[u].selfScores.reduce((a,b)=>a+b,0).toFixed(2)
                    )),
                    backgroundColor: '#C8102E',
                    borderRadius: 4,
                    borderWidth: 0
                }
            ]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20 } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true }
            },
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10 } } },
                tooltip: {
                    callbacks: {
                        label: c => `${c.dataset.label}: ${c.raw}`
                    }
                }
            }
        }
    });
}
// ── Aging charts ──────────────────────────────────────────────────────────
let agUk = Object.keys(agUnitMap).sort((a,b)=>agUnitMap[b].total-agUnitMap[a].total);

if ($page.find('#ud-aging-unit-bar').length) {
    destroyChart('ud-aging-unit-bar');
    chartInstances['ud-aging-unit-bar'] = new Chart($page.find('#ud-aging-unit-bar')[0], {
        type: 'bar',
        data: {
            labels: agUk,
            datasets: [
                { label:'Critical>60d', data:agUk.map(u=>agUnitMap[u].crit), backgroundColor:'#C8102E', borderRadius:4, borderWidth:0 },
                { label:'Warning30–60d', data:agUk.map(u=>agUnitMap[u].warn), backgroundColor:'#ffc107', borderRadius:4, borderWidth:0 },
                { label:'Watch15–30d', data:agUk.map(u=>agUnitMap[u].watch), backgroundColor:'#FFEE58 ', borderRadius:4, borderWidth:0 },
            ]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } }, 
            scales:{ x:{stacked:true,grid:{display:false}}, y:{stacked:true,beginAtZero:true} },
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:10} } } }
        }
    });
}

if ($page.find('#ud-aging-donut').length) {
    destroyChart('ud-aging-donut');
    chartInstances['ud-aging-donut'] = new Chart($page.find('#ud-aging-donut')[0], {
        type: 'doughnut',
        data: {
            labels: ['Critical>60d','Warning30–60d','Watch15–30d'],
            datasets: [{
                data: [agCrit.length, agWarn.length, agWatch.length],
                backgroundColor: ['#C8102E','#ffc107','#FFEE58 '],
                borderColor:'#fff', borderWidth:3
            }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false, cutout:'55%',layout: { padding: { top: 20 } },
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:10} } } }
        }
    });
}

// ── Assessor Effectiveness charts ─────────────────────────────────────────
let ae2Uk = Object.keys(aeUnitMap2).sort();
let ae2Avgs = ae2Uk.map(u => parseFloat(
    (aeUnitMap2[u].aScores.reduce((a,b)=>a+b,0)/aeUnitMap2[u].aScores.length).toFixed(2)
));
let ae2LenColors = ae2Avgs.map(a =>
    a-aePop2>0.4?'#f4a100':a-aePop2<-0.4?'#C8102E':'#28a745'
);

if ($page.find('#ud-ae2-overview-bar').length) {
    destroyChart('ud-ae2-overview-bar');
    chartInstances['ud-ae2-overview-bar'] = new Chart($page.find('#ud-ae2-overview-bar')[0], {
        type:'bar',
        data:{
            labels: ae2Uk,
            datasets:[
                { label:'Unit Avg', data:ae2Avgs, backgroundColor:ae2LenColors, borderRadius:5, borderWidth:0 },
                { label:'Pop. Avg', data:ae2Uk.map(()=>parseFloat(aePop2.toFixed(2))),
                  type:'line', borderColor:'#0f1f3d', borderDash:[5,3], borderWidth:2, pointRadius:0, backgroundColor:'transparent' }
            ]
        },
        plugins: [dataLabelPlugin],
        options:{
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales:{ y:{ min:Math.max(0,parseFloat((aePop2-1.5).toFixed(1))),
                         max:Math.min(5,parseFloat((aePop2+1.5).toFixed(1))) } },
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:10} } } }
        }
    });
}

if ($page.find('#ud-ae2-len-donut').length) {
    let bal2 = ae2Uk.length - aeLenient2 - aeStringent2;
    destroyChart('ud-ae2-len-donut');
    chartInstances['ud-ae2-len-donut'] = new Chart($page.find('#ud-ae2-len-donut')[0], {
        type:'doughnut',
        data:{
            labels:['Lenient','Stringent','Balanced'],
            datasets:[{ data:[aeLenient2,aeStringent2,bal2],
                backgroundColor:['#f4a100','#C8102E','#28a745'], borderColor:'#fff', borderWidth:3 }]
        },
        plugins: [dataLabelPlugin],
        options:{ responsive:true, maintainAspectRatio:false, cutout:'55%',layout: { padding: { top: 20 } },
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:10} } } } }
    });
}

if ($page.find('#ud-ae2-len-bar').length) {
    destroyChart('ud-ae2-len-bar');
    chartInstances['ud-ae2-len-bar'] = new Chart($page.find('#ud-ae2-len-bar')[0], {
        type:'bar',
        data:{
            labels: ae2Uk,
            datasets:[
                { label:'Unit Avg', data:ae2Avgs, backgroundColor:ae2LenColors, borderRadius:5, borderWidth:0 },
                { label:'Pop. Avg', data:ae2Uk.map(()=>parseFloat(aePop2.toFixed(2))),
                  type:'line', borderColor:'#0f1f3d', borderDash:[4,3], borderWidth:2, pointRadius:0, backgroundColor:'transparent' }
            ]
        },
        plugins: [dataLabelPlugin],
        options:{
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales:{ y:{ min:Math.max(0,parseFloat((aePop2-1.5).toFixed(1))),
                         max:Math.min(5,parseFloat((aePop2+1.5).toFixed(1))) } },
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:10} } } }
        }
    });
}

if ($page.find('#ud-ae2-spread-bar').length) {
    let sdevs2 = ae2Uk.map(u => parseFloat(_stdDev(aeUnitMap2[u].aScores).toFixed(2)));
    let sdColors2 = sdevs2.map(s => s>1.2?'#C8102E':s>0.6?'#ffc107':'#28a745');
    destroyChart('ud-ae2-spread-bar');
    chartInstances['ud-ae2-spread-bar'] = new Chart($page.find('#ud-ae2-spread-bar')[0], {
        type:'bar',
        data:{ labels:ae2Uk, datasets:[{ label:'Std Dev', data:sdevs2, backgroundColor:sdColors2, borderRadius:5, borderWidth:0 }] },
        plugins: [dataLabelPlugin],
        options:{
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales:{ y:{ beginAtZero:true } },
            plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label: c=>`${c.raw} — ${c.raw>1.2?'High':c.raw>0.6?'Moderate':'Low'} variance` } } }
        }
    });
}

let ae2DelUk = Object.keys(aeDelUnitMap2).sort((a,b)=>aeDelUnitMap2[b].total-aeDelUnitMap2[a].total);
if ($page.find('#ud-ae2-delay-unit').length) {
    destroyChart('ud-ae2-delay-unit');
    chartInstances['ud-ae2-delay-unit'] = new Chart($page.find('#ud-ae2-delay-unit')[0], {
        type:'bar',
        data:{
            labels: ae2DelUk,
            datasets:[
                { label:'Critical>60d', data:ae2DelUk.map(u=>aeDelUnitMap2[u].crit), backgroundColor:'#C8102E', borderRadius:4, borderWidth:0 },
                { label:'Warning30–60d', data:ae2DelUk.map(u=>aeDelUnitMap2[u].warn), backgroundColor:'#ffc107', borderRadius:4, borderWidth:0 },
                { label:'Watch15–30d', data:ae2DelUk.map(u=>aeDelUnitMap2[u].watch), backgroundColor:'#0f1f3d', borderRadius:4, borderWidth:0 },
            ]
        },
        plugins: [dataLabelPlugin],
        options:{
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales:{ x:{stacked:true,grid:{display:false}}, y:{stacked:true,beginAtZero:true} },
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:10} } } }
        }
    });
}

if ($page.find('#ud-ae2-delay-donut').length) {
    let dc2=aeDelayed2.filter(x=>x.days>60).length, dw2=aeDelayed2.filter(x=>x.days>=30&&x.days<=60).length, dwc2=aeDelayed2.filter(x=>x.days>=15&&x.days<30).length;
    destroyChart('ud-ae2-delay-donut');
    chartInstances['ud-ae2-delay-donut'] = new Chart($page.find('#ud-ae2-delay-donut')[0], {
        type:'doughnut',
        data:{
            labels:['Critical>60d','Warning30–60d','Watch15–30d'],
            datasets:[{ data:[dc2,dw2,dwc2], backgroundColor:['#C8102E','#ffc107','#0f1f3d'], borderColor:'#fff', borderWidth:3 }]
        },
        plugins: [dataLabelPlugin],
        options:{ responsive:true, maintainAspectRatio:false, cutout:'55%',layout: { padding: { top: 20 } },
            plugins:{ legend:{ position:'bottom', labels:{ font:{size:10} } } } }
    });
}

if ($page.find('#ud-ae2-calibvar-bar').length) {
    let cvDevs2 = ae2Uk.map(u => parseFloat(_stdDev(aeUnitMap2[u].aScores).toFixed(2)));
    let cvColors2 = cvDevs2.map(s => s>1.2?'#C8102E':s>0.6?'#ffc107':'#28a745');
    destroyChart('ud-ae2-calibvar-bar');
    chartInstances['ud-ae2-calibvar-bar'] = new Chart($page.find('#ud-ae2-calibvar-bar')[0], {
        type:'bar',
        data:{ labels:ae2Uk, datasets:[{ label:'Std Dev', data:cvDevs2, backgroundColor:cvColors2, borderRadius:5, borderWidth:0 }] },
        plugins: [dataLabelPlugin],
        options:{
            responsive:true, maintainAspectRatio:false, layout: { padding: { top: 20 } },scales:{ y:{beginAtZero:true} },
            plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`Std Dev: ${c.raw}` } } }
        }
    });
}

if ($page.find('#ud-ae2-align-bar').length) {
    let alRates2 = ae2Uk.map(u => {
        let au = aeUnitMap2[u];
        return au.withSelf ? Math.round(au.aligned/au.withSelf*100) : 0;
    });
    let alColors2 = alRates2.map(r => r>=70?'#28a745':r>=40?'#ffc107':'#C8102E');
    destroyChart('ud-ae2-align-bar');
    chartInstances['ud-ae2-align-bar'] = new Chart($page.find('#ud-ae2-align-bar')[0], {
        type:'bar',
        data:{ labels:ae2Uk, datasets:[{ label:'Alignment %', data:alRates2, backgroundColor:alColors2, borderRadius:5, borderWidth:0 }] },
        plugins: [dataLabelPlugin],
        options:{
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales:{ y:{beginAtZero:true, max:100, ticks:{callback:v=>v+'%'}} },
            plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:c=>`${c.raw}% within ±0.5 of self` } } }
        }
    });
}
// ── Avg Rating tabs ───────────────────────────────────────────────────────
const arTabMap = { unit:'nst-navy', grade:'nst-teal', chart:'nst-gold' };
$page.find('#ud-ar-tabs')
    .off('click','.ud-ns-tab')
    .on('click','.ud-ns-tab', function() {
        let c = $(this).data('ar');
        $page.find('#ud-ar-tabs .ud-ns-tab').removeClass(Object.values(arTabMap).join(' ') + ' active');
        $(this).addClass((arTabMap[c]||'') + ' active');
        $page.find('#ud-body-avgrating .ud-ns-panel').removeClass('active');
        $page.find('#udar-' + c).addClass('active');
    });

// ── Aging tabs ────────────────────────────────────────────────────────────
const agTabMap = { emp:'nst-red', unit:'nst-navy', cycle:'nst-gold' };
$page.find('#ud-ag-tabs')
    .off('click','.ud-ns-tab')
    .on('click','.ud-ns-tab', function() {
        let c = $(this).data('ag');
        $page.find('#ud-ag-tabs .ud-ns-tab').removeClass(Object.values(agTabMap).join(' ') + ' active');
        $(this).addClass((agTabMap[c]||'') + ' active');
        $page.find('#ud-body-aging .ud-ns-panel').removeClass('active');
        $page.find('#udag-' + c).addClass('active');
    });

// ── Assessor Effectiveness tabs ───────────────────────────────────────────
const ae2TabMap = {
    overview: 'nst-navy',
    leniency: 'nst-purple',
    delayed:  'nst-red',
    calibvar: 'nst-teal'
};
$page.find('#ud-ae2-tabs')
    .off('click','.ud-ns-tab')
    .on('click','.ud-ns-tab', function() {
        let c = $(this).data('ae2');
        $page.find('#ud-ae2-tabs .ud-ns-tab').removeClass(Object.values(ae2TabMap).join(' ') + ' active');
        $(this).addClass((ae2TabMap[c]||'') + ' active');
        $page.find('#ud-body-aeff2 .ud-ns-panel').removeClass('active');
        $page.find('#udae2-' + c).addClass('active');
    });

let totalOverdueAll  = data.filter(d => d.custom_appraisal_status === 'Overdue').length;
let totalNoSelf      = data.filter(d => !d.custom_total_self_score || parseFloat(d.custom_total_self_score) === 0).length;
let totalLongDraft   = Object.values(complianceUnitMap).reduce((s, u) => s + u.longDraft, 0);
let totalPending2    = data.filter(d => !['Approved','Accepted'].includes(d.workflow_state)).length;

// mkChart('ud-compliance-donut', {
//     type: 'doughnut',
//     data: {
//         labels: ['Overdue', 'No Self Score', 'Stalled Draft (>30d)', 'Pending'],
//         datasets: [{
//             data: [totalOverdueAll, totalNoSelf, totalLongDraft, totalPending2],
//             backgroundColor: ['#C8102E', '#6c757d', '#ffc107', '#ff8c00'],
//             borderColor: '#fff', borderWidth: 3
//         }]
//     },
//     options: {
//         responsive: true, maintainAspectRatio: false, cutout: '58%',
//         plugins: {
//             legend: { position: 'bottom', labels: { font: { size: 10 } } },
//             tooltip: { callbacks: {
//                 label: c => `${c.label}: ${c.raw} (${total ? Math.round(c.raw/total*100) : 0}%)`
//             }}
//         }
//     }
// });

if ($page.find('#ud-compliance-donut').length) {
    let totalOverdueAll = data.filter(d => d.custom_appraisal_status === 'Overdue').length;
    let totalNoSelf     = data.filter(d => (((!d.custom_total_self_score && (d.workflow_state != 'Draft'))  || (parseFloat(d.custom_total_self_score) === 0 && (d.workflow_state != 'Draft'))) && !['A1','A2','A3','A4'].includes(d.custom_grade || ''))).length;
    let totalLongDraft  = Object.values(complianceUnitMap).reduce((s, u) => s + u.longDraft, 0);
    let totalPending2   = data.filter(d => !['Approved','Accepted'].includes(d.workflow_state)).length;
 
    let hasDevData = totalOverdueAll + totalNoSelf + totalLongDraft + totalPending2 > 0;
 
    destroyChart('ud-compliance-donut');
    let el = $page.find('#ud-compliance-donut')[0];
    chartInstances['ud-compliance-donut'] = new Chart(el, {
        type: 'doughnut',
        data: {
            labels: ['Overdue', 'No Self Score', 'Pending'],
            datasets: [{
                data: hasDevData
                    ? [totalOverdueAll, totalNoSelf, totalPending2]
                    : [1],   // dummy slice so chart renders when all zero
                backgroundColor: hasDevData
                    ? ['#C8102E', '#6c757d', '#ffc107', '#ff8c00']
                    : ['#e9ecef'],
                borderColor: '#fff',
                borderWidth: 3
            }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20 } }, 
            cutout: '58%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 10 }, generateLabels: hasDevData ? undefined : () => [{
                        text: 'No deviations', fillStyle: '#e9ecef', strokeStyle: '#fff'
                    }]}
                },
                tooltip: {
                    callbacks: {
                        label: c => hasDevData
                            ? `${c.label}: ${c.raw} (${total ? Math.round(c.raw/total*100) : 0}%)`
                            : 'No deviations'
                    }
                }
            }
        }
    });
}

// ── Calibration charts ────────────────────────────────────────────────────────
// Scatter: x = self score, y = assessor score
let scatterPoints = calibData.map(d => ({
    x: parseFloat(d.custom_total_self_score),
    y: parseFloat(d.total_score),
    label: d.employee_name || d.employee
}));

// mkChart('ud-calib-scatter', {
//     type: 'scatter',
//     data: {
//         datasets: [
//             {
//                 label: 'Employees',
//                 data: scatterPoints,
//                 backgroundColor: 'rgba(200,16,46,0.55)',
//                 pointRadius: 5,
//                 pointHoverRadius: 7
//             },
//             {
//                 // Perfect calibration diagonal
//                 label: 'Perfect Match (y=x)',
//                 data: [{ x:0, y:0 }, { x:5, y:5 }],
//                 type: 'line',
//                 borderColor: '#0f1f3d',
//                 borderDash: [5, 3],
//                 borderWidth: 1.5,
//                 pointRadius: 0,
//                 backgroundColor: 'transparent'
//             }
//         ]
//     },
//     options: {
//         responsive: true, maintainAspectRatio: false,
//         scales: {
//             x: { min: 0, max: 5.5, title: { display: true, text: 'Self Score (Pre)', font: { size: 11 } } },
//             y: { min: 0, max: 5.5, title: { display: true, text: 'Assessor Score (Post)', font: { size: 11 } } }
//         },
//         plugins: {
//             legend: { position: 'bottom', labels: { font: { size: 10 } } },
//             tooltip: {
//                 callbacks: {
//                     label: c => {
//                         if (c.datasetIndex === 0) {
//                             let pt = scatterPoints[c.dataIndex];
//                             return `${pt ? pt.label : 'Employee'} — Self:${c.parsed.x} Post:${c.parsed.y}`;
//                         }
//                         return 'Perfect match line';
//                     }
//                 }
//             }
//         }
//     }
// });

if ($page.find('#ud-calib-scatter').length && calibData.length > 0) {

    // Build score distribution buckets (1.0 to 5.0 in 0.5 steps)
    const SCORE_BUCKETS  = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];
    const SCORE_LABELS   = ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'];

    // Count employees per bucket for Self Score
    let selfCounts = new Array(SCORE_BUCKETS.length).fill(0);
    // Count employees per bucket for Assessor Score
    let assrCounts = new Array(SCORE_BUCKETS.length).fill(0);

    calibData.forEach(d => {
        let selfVal = parseFloat(d.custom_total_self_score);
        let assrVal = parseFloat(d.total_score);

        // Place into nearest bucket
        for (let i = 0; i < SCORE_BUCKETS.length; i++) {
            let bucketMin = SCORE_BUCKETS[i];
            let bucketMax = i < SCORE_BUCKETS.length - 1 ? SCORE_BUCKETS[i + 1] : 5.01;

            if (selfVal >= bucketMin && selfVal < bucketMax) selfCounts[i]++;
            if (assrVal >= bucketMin && assrVal < bucketMax) assrCounts[i]++;
        }
    });

    // Smooth both arrays for bell curve effect
    function smoothArr(arr) {
        return arr.map((v, i, a) => {
            let prev = a[i - 1] || v;
            let next = a[i + 1] || v;
            return parseFloat(((prev + v * 2 + next) / 4).toFixed(2));
        });
    }

    let selfSmoothed = selfCounts;
    let assrSmoothed = assrCounts;

    destroyChart('ud-calib-scatter');
    chartInstances['ud-calib-scatter'] = new Chart($page.find('#ud-calib-scatter')[0], {
        type: 'bar',
        data: {
            labels: SCORE_LABELS,
            datasets: [
                
                {
                    label: 'Self Score',
                    data:  selfSmoothed,
                    type:  'line',
                    borderColor:     '#C8102E',
                    backgroundColor: 'rgba(200,16,46,0.06)',
                    borderWidth:     2.5,
                    pointRadius:     4,
                    pointBackgroundColor: '#C8102E',
                    tension:         0.45,
                    fill:            true,
                    order:           1,
                    
                },
                {
                    label: 'Assessor Score',
                    data:  assrSmoothed,
                    type:  'line',
                    borderColor:     '#0f1f3d',
                    backgroundColor: 'rgba(15,31,61,0.06)',
                    borderWidth:     2.5,
                    pointRadius:     4,
                    pointBackgroundColor: '#0f1f3d',
                    tension:         0.45,
                    fill:            true,
                    order:           2
                }
            ]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20 } }, 
            scales: {
                x: {
                    grid: { display: false },
                    title: {
                        display: true,
                        text: 'Score Range (1.0 – 5.0)',
                        font: { size: 11, weight: 'bold' }
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, callback: v => Number.isInteger(v) ? v : null },
                    title: {
                        display: true,
                        text: 'Number of Employees',
                        font: { size: 11 }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 10 },
                        usePointStyle: true,
                        padding: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        title: ctx => `Score: ${ctx[0].label}`,
                        label: ctx => `${ctx.dataset.label}: ${Math.round(ctx.raw)} employee(s)`
                    }
                }
            }
        }
    });
}
let calibUnitKeys = Object.keys(calibUnitMap).sort();
// mkChart('ud-calib-unit-bar', {
//     type: 'bar',
//     data: {
//         labels: calibUnitKeys,
//         datasets: [
//             {
//                 label: '▲ Rated Up',
//                 data: calibUnitKeys.map(u => calibUnitMap[u].up),
//                 backgroundColor: '#28a745', borderRadius: 4, borderWidth: 0
//             },
//             {
//                 label: '= No Change',
//                 data: calibUnitKeys.map(u => calibUnitMap[u].flat),
//                 backgroundColor: '#9e9e9e', borderRadius: 4, borderWidth: 0
//             },
//             {
//                 label: '▼ Rated Down',
//                 data: calibUnitKeys.map(u => calibUnitMap[u].down),
//                 backgroundColor: '#C8102E', borderRadius: 4, borderWidth: 0
//             }
//         ]
//     },
//     options: {
//         responsive: true, maintainAspectRatio: false,
//         scales: {
//             x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
//             y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
//         },
//         plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
//     }
// });



if ($page.find('#ud-calib-unit-bar').length && Object.keys(calibUnitMap).length > 0) {
    let calibUnitKeys = Object.keys(calibUnitMap).sort();

    // Unit colours palette
    const UNIT_PALETTE = [
        '#C8102E','#0f1f3d','#00796b','#7b1fa2','#1565c0',
        '#e65100','#2e7d32','#ad1457','#f57f17','#37474f'
    ];

    // Build one dataset per unit, each point = one employee
    let unitDatasets = calibUnitKeys.map((u, idx) => {
        let points = calibData
            .filter(d => (d.custom_unit || 'Unknown') === u)
            .map(d => ({
                x: parseFloat(d.custom_total_self_score),
                y: parseFloat(d.total_score),
                name: d.employee_name || d.employee
            }));
        return {
            label:           u,
            data:            points,
            backgroundColor: UNIT_PALETTE[idx % UNIT_PALETTE.length] + 'cc',
            borderColor:     UNIT_PALETTE[idx % UNIT_PALETTE.length],
            pointRadius:     6,
            pointHoverRadius:9
        };
    });

    // Perfect-match diagonal y = x
    unitDatasets.push({
        label:           'Perfect Match (y = x)',
        data:            [{ x: 1, y: 1 }, { x: 5, y: 5 }],
        type:            'line',
        borderColor:     '#868e96',
        borderDash:      [5, 4],
        borderWidth:     1.5,
        pointRadius:     0,
        backgroundColor: 'transparent',
        showLine:        true
    });

    destroyChart('ud-calib-unit-bar');



// Build per-unit averages
let calibUnitSelf  = calibUnitKeys.map(u => {
    let cu = calibUnitMap[u];
    return cu.pre.length ? parseFloat((cu.pre.reduce((a,b) => a+b,0) / cu.pre.length).toFixed(2)) : 0;
});
let calibUnitAssr  = calibUnitKeys.map(u => {
    let cu = calibUnitMap[u];
    return cu.post.length ? parseFloat((cu.post.reduce((a,b) => a+b,0) / cu.post.length).toFixed(2)) : 0;
});
let calibUnitDelta = calibUnitKeys.map((u, i) => parseFloat((calibUnitAssr[i] - calibUnitSelf[i]).toFixed(2)));
let deltaBarColors = calibUnitDelta.map(v => v > 0 ? 'rgba(40,167,69,0.75)' : 'rgba(200,16,46,0.75)');

// Up / Down / Flat counts per unit
let calibUnitUp   = calibUnitKeys.map(u => calibUnitMap[u].up);
let calibUnitDown = calibUnitKeys.map(u => calibUnitMap[u].down);
let calibUnitFlat = calibUnitKeys.map(u => calibUnitMap[u].flat);

chartInstances['ud-calib-unit-bar'] = new Chart($page.find('#ud-calib-unit-bar')[0], {
    type: 'bar',
    data: {
        labels: calibUnitKeys,
        datasets: [
            {
                label: 'Avg Self Score',
                data: calibUnitSelf,
                backgroundColor: 'rgba(200,16,46,0.65)',
                borderColor: '#C8102E',
                borderWidth: 1,
                borderRadius: 4,
                order: 2
            },
            {
                label: 'Avg Assessor Score',
                data: calibUnitAssr,
                backgroundColor: 'rgba(15,31,61,0.70)',
                borderColor: '#0f1f3d',
                borderWidth: 1,
                borderRadius: 4,
                order: 2
            },
            {
                label: 'Δ Avg Delta',
                data: calibUnitDelta,
                type: 'line',
                borderColor: '#7b1fa2',
                backgroundColor: 'rgba(123,31,162,0.08)',
                pointBackgroundColor: deltaBarColors,
                pointRadius: 6,
                pointHoverRadius: 8,
                borderWidth: 2.5,
                borderDash: [5, 3],
                fill: false,
                yAxisID: 'y2',
                order: 1
            }
        ]
    },
    plugins: [dataLabelPlugin],
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 28 } },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
            },
            y: {
                beginAtZero: false,
                min: 0,
                max: 5,
                title: {
                    display: true,
                    text: 'Avg Score (0–5)',
                    font: { size: 10, weight: 'bold' }
                },
                ticks: { stepSize: 0.5 },
                grid: { color: 'rgba(0,0,0,.06)' }
            },
            y2: {
                position: 'right',
                title: {
                    display: true,
                    text: 'Δ Delta (Post − Pre)',
                    font: { size: 10 }
                },
                grid: { drawOnChartArea: false },
                ticks: {
                    stepSize: 0.25,
                    callback: v => (v >= 0 ? '+' : '') + v
                }
            }
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: { font: { size: 10 }, usePointStyle: true, padding: 14 }
            },
            tooltip: {
                callbacks: {
                    title: ctx => `Unit: ${calibUnitKeys[ctx[0].dataIndex]}`,
                    label: ctx => {
                        let i   = ctx.dataIndex;
                        let lbl = ctx.dataset.label;
                        if (lbl === 'Δ Avg Delta') {
                            let v = ctx.raw;
                            return [
                                `Δ Delta: ${v >= 0 ? '+' : ''}${v}`,
                                `  ▲ Rated Up:   ${calibUnitUp[i]}`,
                                `  ▼ Rated Down: ${calibUnitDown[i]}`,
                                `  = No Change:  ${calibUnitFlat[i]}`
                            ];
                        }
                        return `${lbl}: ${ctx.raw} / 5`;
                    }
                }
            }
        }
    }
});
}

// ── Performance vs Compensation charts ───────────────────────────────────────
// mkChart('ud-pvc-dist-bar', {
//     type: 'bar',
//     data: {
//         labels: ['Exceptional\n≥4.5', 'High\n≥4.0', 'Standard\n≥3.5', 'Minimal\n≥2.5', 'Hold\n≥2.0', 'PIP\n<2.0'],
//         datasets: [{
//             label: 'Employees',
//             data: [
//                 pfpBands.exceptional, pfpBands.high, pfpBands.standard,
//                 pfpBands.low, pfpBands.hold, pfpBands.pip
//             ],
//             backgroundColor: ['#f4a100','#f4a100','#28a745','#ffc107','#9e9e9e','#C8102E'],
//             borderRadius: 5, borderWidth: 0
//         }]
//     },
//     options: {
//         responsive: true, maintainAspectRatio: false,
//         scales: {
//             y: { beginAtZero: true, ticks: { stepSize: 1 } },
//             x: { grid: { display: false } }
//         },
//         plugins: {
//             legend: { display: false },
//             tooltip: { callbacks: { label: c => `${c.raw} employee(s)` } }
//         }
//     }
// });


if ($page.find('#ud-pvc-dist-bar').length && pvcScored.length > 0) {
    destroyChart('ud-pvc-dist-bar');
    let el = $page.find('#ud-pvc-dist-bar')[0];
    chartInstances['ud-pvc-dist-bar'] = new Chart(el, {
        type: 'bar',
        data: {
            labels: ['Exceptional\n≥4.5','High\n≥4.0','Standard\n≥3.5','Minimal\n≥2.5','Hold\n≥2.0','PIP\n<2.0'],
            datasets: [{
                label: 'Employees',
                data: [pfpBands.exceptional, pfpBands.high, pfpBands.standard, pfpBands.low, pfpBands.hold, pfpBands.pip],
                backgroundColor: ['#28a745','#AED581','#FFEE58','#ffc107','#9e9e9e','#C8102E'],
                borderRadius: 5,
                borderWidth: 0
            }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20 } },
            scales: {
                y: { beginAtZero:true, ticks:{ stepSize:1 } },
                x: { grid:{ display:false } }
            },
            plugins: {
                legend: { display:false },
                tooltip: { callbacks: { label: c => `${c.raw} employee(s)` } }
            }
        }
    });
}
 

let pvcUnitKeys = Object.keys(pvcUnitMap).sort();
// mkChart('ud-pvc-unit-bar', {
//     type: 'bar',
//     data: {
//         labels: pvcUnitKeys,
//         datasets: [
//             {
//                 label: 'High Increment',
//                 data: pvcUnitKeys.map(u => pvcUnitMap[u].exceptional + pvcUnitMap[u].high),
//                 backgroundColor: '#f4a100', borderRadius: 4, borderWidth: 0
//             },
//             {
//                 label: 'Standard',
//                 data: pvcUnitKeys.map(u => pvcUnitMap[u].standard),
//                 backgroundColor: '#28a745', borderRadius: 4, borderWidth: 0
//             },
//             {
//                 label: 'Low/Hold/PIP',
//                 data: pvcUnitKeys.map(u => pvcUnitMap[u].low + pvcUnitMap[u].hold + pvcUnitMap[u].pip),
//                 backgroundColor: '#C8102E', borderRadius: 4, borderWidth: 0
//             }
//         ]
//     },
//     options: {
//         responsive: true, maintainAspectRatio: false,
//         scales: {
//             x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
//             y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }
//         },
//         plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
//     }
// });


if ($page.find('#ud-pvc-unit-bar').length && Object.keys(pvcUnitMap).length > 0) {
    let pvcUnitKeys = Object.keys(pvcUnitMap).sort();
    destroyChart('ud-pvc-unit-bar');
    let el = $page.find('#ud-pvc-unit-bar')[0];
    chartInstances['ud-pvc-unit-bar'] = new Chart(el, {
        type: 'bar',
        data: {
            labels: pvcUnitKeys,
            datasets: [
                { label:'High Increment', data: pvcUnitKeys.map(u => pvcUnitMap[u].exceptional + pvcUnitMap[u].high), backgroundColor:'#28a745', borderRadius:4, borderWidth:0 },
                { label:'Standard',       data: pvcUnitKeys.map(u => pvcUnitMap[u].standard),                         backgroundColor:'#AED581', borderRadius:4, borderWidth:0 },
                { label:'Low/Hold/PIP',   data: pvcUnitKeys.map(u => pvcUnitMap[u].low + pvcUnitMap[u].hold + pvcUnitMap[u].pip), backgroundColor:'#ffc107', borderRadius:4, borderWidth:0 }
            ]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20 } },
            scales: {
                x: { stacked:true, grid:{ display:false }, ticks:{ font:{ size:10 } } },
                y: { stacked:true, beginAtZero:true, ticks:{ stepSize:1 } }
            },
            plugins: { legend:{ position:'bottom', labels:{ font:{ size:10 } } } }
        }
    });
}
            // CHANGE: Remove the <div class="pdf-page"> wrappers
    // $page.find('#ud-main').html(
    //     kpiHtml + completionHtml + trendHtml + compHtml + bellHtml + performerHtml  + histHtml +
    //     calibrationHtml + complianceHtml + perfCompHtml
    // );
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
                config.options = config.options || {};
                config.options.animation = config.options.animation !== undefined ? config.options.animation : { duration: 800 };

                // ── Default data label plugin (shows values on all chart types) ──
               
                // Bell curve charts use dlPlugin only — skip dataLabelPlugin for them
                const isBellChart = id.startsWith('ud-bell-')  || id.startsWith('ud-kra-bar-chart')


                if (isBellChart && usePlugin) {
                    config.plugins = [dlPlugin];
                } else if (!isBellChart) {
                    config.plugins = [dataLabelPlugin];   // ← this runs for ud-hist-unit-comp
                } else {
                    config.plugins = [];
                }

                chartInstances[id] = new Chart(el, config);
            }
            
            // ── Standard charts ────────────────────────────────────────────────
            mkChart('ud-donut-chart', {
                type: 'doughnut',
                data: {
                    labels: ['Completed','Pending','Overdue'],
                    datasets: [{
                        data: [completed, pending, overdue],
                        backgroundColor: ['#28a745','#ffc107','#C8102E'],
                        borderColor: ['#fff','#fff'],
                        borderWidth: 0.5
                    }]
                },
                options: {
                    responsive:true, maintainAspectRatio:false, cutout:'48%',
                    plugins: {
                        legend:{ position:'bottom' },
                        tooltip:{ callbacks:{ label: ctx => `${ctx.label}: ${ctx.raw}(${pct(ctx.raw, total)}%)` } },
                        datalabels: {
                color: '#000000', // Forces the text font color to black
                font: {
                    weight: 'bold' // Keeps it highly readable against the colors
                }
            }
                        
                    }
                }
            });

            let deptKeys = Object.keys(deptMap).sort();
           

            // mkChart('ud-dept-bar-chart', {
            //     type: 'bar',
            //     data: {
            //         labels: deptKeys,
            //         datasets: [
            //             { label:'Completed %', data: deptKeys.map(k => pct(deptMap[k].completed, deptMap[k].total)), backgroundColor:'#28a745' },
            //             { label:'Pending %',   data: deptKeys.map(k => pct(deptMap[k].total - deptMap[k].completed, deptMap[k].total)), backgroundColor:'#ffc107' },
            //             { label:'Overdue %', data: deptKeys.map(k => pct(deptMap[k].overdue, deptMap[k].total)), backgroundColor:'#C8102E' },
            //         ]
            //     },
            //     options: {
            //         responsive:true, maintainAspectRatio:false,
            //         scales:{ y:{ beginAtZero:true, max:100, ticks:{ callback: v => v+'%' } } },
            //         plugins:{ legend:{ position:'bottom' } }
            //     }
            // });

                let current_user = frappe.session.user;

                frappe.call({
                    method: "frappe.client.get_list",
                    args: {
                        doctype: "User Permission",
                        filters: {
                            user: current_user,
                            allow: "Unit"
                        },
                        fields: ["name"]
                    },
                    callback: function(r) {

                        if (r.message && r.message.length > 0) {

                            $('#ud-dept-bar-chart').closest('.ud-chart-wrap').hide();

                        } else {

                            // Show chart
                            $('#ud-dept-bar-chart').closest('.ud-chart-wrap').show();

                            // Bar Chart
                          mkChart('ud-dept-bar-chart', {
    type: 'bar',
    data: {
        labels: deptKeys,
        datasets: [
            {
                label: 'Completed %',
                data: deptKeys.map(k => pct(deptMap[k].completed, deptMap[k].total)),
                countData: deptKeys.map(k => deptMap[k].completed),  // ← add count
                backgroundColor: '#28a745'
            },
            {
                label: 'Pending %',
                data: deptKeys.map(k => pct(deptMap[k].total - deptMap[k].completed, deptMap[k].total)),
                countData: deptKeys.map(k => deptMap[k].total - deptMap[k].completed),  // ← add count
                backgroundColor: '#ffc107'
            },
            {
                label: 'Overdue %',
                data: deptKeys.map(k => pct(deptMap[k].overdue, deptMap[k].total)),
                countData: deptKeys.map(k => deptMap[k].overdue),  // ← add count
                backgroundColor: '#C8102E'
            },
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        barPercentage: 0.6,
        categoryPercentage: 0.7,
        scales: {
            y: {
                beginAtZero: true,
                max: 110,
                ticks: {
                    callback: function(v) {
                        if (v <= 100) return v + '%';
                    }
                }
            }
        },
        plugins: {
            legend: { position: 'bottom' }
        }
    }
});
                        }
                    }
                });

            mkChart('ud-trend-line-chart', {
                type: 'line',
                data: {
                    labels: trendDates,
                    datasets: [
                        { label:'Completed', data: trendCompleted, borderColor:'#28a745', backgroundColor:'rgba(40,167,69,.1)', tension:.4, fill:true },
                        { label:'Pending',   data: trendPending,   borderColor:'#ffc107', backgroundColor:'rgba(255,193,7,.1)',  tension:.4, fill:true },
                        { label:'Overdue',   data: trendOverdue,   borderColor:'#C8102E', backgroundColor:'rgba(255,0,0,.1)',  tension:.4, fill:true }
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
                        borderColor:'#7b1fa2', backgroundColor:'rgba(200,16,46,.08)',
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
                    args: { appraisal_names: JSON.stringify(appraisalNames),
                        // units: JSON.stringify(selectedUnits) 
                    },
                    callback: function(r) {let compHtml 
                        let goalData = r.message || [];

                        if (!goalData.length) {
                            $page.find('#ud-comp-loading').hide();
                            $page.find('#ud-comp-empty').text('No competency / KRA data found for this selection.').show();
                            return;
                        }

                        // ── Competency breakdown: top vs low performers ───────────────────────
let topNames    = new Set(perfTopList.map(d => d.name).concat(perfStrongList.map(d => d.name)));
let lowNames    = new Set(perfLowList.map(d => d.name));
let middleNames    = new Set(perfMiddleList.map(d => d.name));

let kraTopAgg = {}, kraLowAgg = {};
let kraMiddleAgg = {};
goalData.forEach(function(row) {
    let n = (row.kra || 'Unknown').trim();
    if (topNames.has(row.parent)) {
        if (!kraTopAgg[n]) kraTopAgg[n] = { total:0, selfSum:0, assrSum:0 };
        kraTopAgg[n].total++;
        kraTopAgg[n].selfSum += parseFloat(row.custom_self_score_with_weighted*10) || 0;
        kraTopAgg[n].assrSum += parseFloat(row.score) || 0;
    }
    else if (lowNames.has(row.parent)) {
        if (!kraLowAgg[n]) kraLowAgg[n] = { total:0, selfSum:0, assrSum:0 };
        kraLowAgg[n].total++;
        kraLowAgg[n].selfSum += parseFloat(row.custom_self_score_with_weighted*10) || 0;
        kraLowAgg[n].assrSum += parseFloat(row.score) || 0;
    }
    else if (middleNames.has(row.parent)) {
        if (!kraMiddleAgg[n]) kraMiddleAgg[n] = { total:0, selfSum:0, assrSum:0 };
        kraMiddleAgg[n].total++;
        kraMiddleAgg[n].selfSum += parseFloat(row.custom_self_score_with_weighted*10) || 0;
        kraMiddleAgg[n].assrSum += parseFloat(row.score) || 0;
    }
});

// Build comparison summary cards (top 5 KRAs by assessor score gap)
let allKras = [...new Set([...Object.keys(kraTopAgg), ...Object.keys(kraLowAgg), ...Object.keys(kraMiddleAgg),])];
let kraGapRows = allKras.map(n => {
    let tAvg = kraTopAgg[n] && kraTopAgg[n].total
        ? (kraTopAgg[n].assrSum / kraTopAgg[n].total) : 0;
    let mAvg = kraMiddleAgg[n] && kraMiddleAgg[n].total
        ? (kraMiddleAgg[n].assrSum / kraMiddleAgg[n].total)
        : 0;
    let lAvg = kraLowAgg[n] && kraLowAgg[n].total
        ? (kraLowAgg[n].assrSum / kraLowAgg[n].total) : 0;
    let gap  = tAvg - lAvg;
    return { name: n, tAvg, mAvg, lAvg, gap };
})

let competencyGapInsightData = [];
let compSummaryRows = kraGapRows.map(r => {
    competencyGapInsightData.push({
        competency: r.name,
        top_performer_avg: Number(r.tAvg.toFixed(2)),
        median_performer_avg: Number((r.mAvg || 0).toFixed(2)),
        low_performer_avg: Number(r.lAvg.toFixed(2)),
        gap: Number(r.gap.toFixed(2))
    })

    let tW   = Math.min(100, Math.round((r.tAvg / 5) * 100));
    let mW   = Math.min(100, Math.round((r.mAvg / 5) * 100));
    let lW   = Math.min(100, Math.round((r.lAvg / 5) * 100));
    let gapCls = r.gap >= 1.5 ? 'ud-badge-red' : r.gap >= 0.5 ? 'ud-badge-orange' : 'ud-badge-green';
    return `<tr>
        <td style="font-weight:600;font-size:11px;">${(r.name).toUpperCase()}</td>
        <td>
            <div style="display:flex;align-items:center;gap:6px;">
                <div class="ud-prog" style="flex:1;"><div class="ud-prog-fill" style="width:${tW}%;background:#28a745;"></div></div>
                <span style="font-size:10px;font-weight:700;color:#28a745;min-width:28px;">${r.tAvg.toFixed(2)}</span>
            </div>
        </td>
        <td>
            <div style="display:flex;align-items:center;gap:6px;">
                <div class="ud-prog" style="flex:1;">
                    <div class="ud-prog-fill" style="width:${mW}%;background:#f4a100;"></div>
                </div>
                <span style="font-size:10px;font-weight:700;color:#f4a100;min-width:28px;">
                    ${r.mAvg ? r.mAvg.toFixed(2) : '0.00'}
                </span>
            </div>
        </td>
        <td>
            <div style="display:flex;align-items:center;gap:6px;">
                <div class="ud-prog" style="flex:1;"><div class="ud-prog-fill" style="width:${lW}%;background:#C8102E;"></div></div>
                <span style="font-size:10px;font-weight:700;color:#C8102E;min-width:28px;">${r.lAvg.toFixed(2)}</span>
            </div>
        </td>
        <td style="text-align:center;">
            <span class="ud-badge ${gapCls}">${r.gap >= 0 ? '+' : ''}${r.gap.toFixed(2)}</span>
        </td>
    </tr>`;
}).join('') || `<tr><td colspan="5" style="text-align:center;padding:16px;color:#adb5bd;">No competency data for this segment</td></tr>`;
window.competencyGapInsightData = competencyGapInsightData;

$page.find('#ud-comp-perf-table').html(`
    <div style="margin-top:18px;">
        <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:10px;">
            📊 Competency Gap — Top &amp; Strong Performers vs Low Performers
            <span style="font-size:10px;font-weight:400;color:#868e96;margin-left:8px;">
                Assessor score avg · sorted by gap (highest first)
            </span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;">

            <!-- TOP PERFORMERS CARD -->
            <div style="background:#fff8e1;border-radius:8px;padding:12px 14px;border-top:3px solid #28a745;text-align:center;">
            <div style="font-size:18px;font-weight:700;color:#28a745;">${perfTopList.length}</div>
            <div style="font-size:10px;font-weight:600;color:#868e96;...">
                Top Performers
                ${ud_thEye('Top Performers',
                            'Employees who scored 4.0 or above in their final appraisal AND whose appraisal has been fully approved.',
                            'Top Performers: total_score >= 4.0\n\nRequires: workflow_state IN [Approved, Accepted]\n\nCount = employees scoring 4.0 and above only',
                            'e.g. 6 employees scored ≥ 4.0 → shown here as Top Performers')}
                
                </div>
                <div style="font-size:10px;color:#adb5bd;margin-top:2px;">
                    Avg: ${kraGapRows.length ? (kraGapRows.reduce((s,r)=>s+r.tAvg,0)/kraGapRows.length).toFixed(2) : 'N/A'} / 5
                </div>
            </div>

            <!-- MIDDLE PERFORMERS CARD -->
            <div style="background:#fff4e6;border-radius:8px;padding:12px 14px;border-top:3px solid #ffc107;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#ffc107;">${perfMiddleList.length}</div>
                <div style="font-size:10px;font-weight:600;color:#868e96;text-transform:uppercase;letter-spacing:1px;margin-top:3px;">
                    Middle Performers
                    ${ud_thEye('Middle Performers','Employees who scored between 3.0 and 3.99 in their final appraisal with a completed appraisal.',
                        'BAND:    total_score >= 3.0 AND total_score < 4.0\nSTATUS:  workflow_state IN [Approved, Accepted]',
                        'e.g. 15 employees scored between 3.0 and 3.99 → shown as Middle Performers')}
                    
                </div>
                <div style="font-size:10px;color:#adb5bd;margin-top:2px;">
                    Avg: ${kraGapRows.length ? (kraGapRows.reduce((s,r)=>s+r.mAvg,0)/kraGapRows.length).toFixed(2) : 'N/A'} / 5
                </div>
            </div>

            <div style="background:#fff0f0;border-radius:8px;padding:12px 14px;border-top:3px solid #C8102E;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#C8102E;">${perfLowList.length}</div>
                <div style="font-size:10px;font-weight:600;color:#868e96;text-transform:uppercase;letter-spacing:1px;margin-top:3px;">
                    Low Performers
                    ${ud_thEye('Low Performers',
                        'Employees who scored between 1.0 and 2.99 in their final appraisal with a completed appraisal.',
                        'BAND:    total_score >= 1.0 AND total_score < 3.0\nSTATUS:  workflow_state IN [Approved, Accepted]\n\nSub-bands within Low:\n  Critical (PIP): total_score <= 2.0\n  Review:         total_score > 2.0 AND <= 2.5\n  Monitor:        total_score > 2.5 AND < 3.0',
                        'e.g. 5 employees scored between 1.0 and 2.99 → flagged for development review or PIP')}
                    
                </div>
                <div style="font-size:10px;color:#adb5bd;margin-top:2px;">
                    Avg: ${kraGapRows.length ? (kraGapRows.reduce((s,r)=>s+r.lAvg,0)/kraGapRows.length).toFixed(2) : 'N/A'} / 5
                </div>
            </div>

            <!-- BIGGEST GAP KRA CARD -->
            <div style="background:#f3e5f5;border-radius:8px;padding:12px 14px;border-top:3px solid #7b1fa2;text-align:center;">
                <div style="font-size:18px;font-weight:700;color:#7b1fa2;"></div>
                <div style="font-size:10px;font-weight:600;color:#868e96;text-transform:uppercase;letter-spacing:1px;margin-top:3px;padding-top:10px;">
                    Biggest Gap KRA
                    ${ud_thEye(
                        'Biggest Gap KRA',
                        'The single competency where the difference in assessor scores between Top/Strong performers and Low performers is the largest. This KRA is the most critical skill differentiator — it separates high achievers from low achievers the most and should be prioritised in L&D planning.',
                        'STEP 1: For each KRA compute —\n  tAvg = avg assessor score across Top+Strong employees\n  lAvg = avg assessor score across Low employees\n  gap  = tAvg − lAvg\n\nSTEP 2: SORT all KRAs BY gap DESC\nSTEP 3: TAKE the first row → Biggest Gap KRA',
                        'e.g. LEADERSHIP: Top avg 4.20 − Low avg 1.60 = gap +2.60 → biggest differentiator across all KRAs')}
                        
                </div>
                <div style="font-size:10px;color:#adb5bd;margin-top:2px;">
                    Gap: ${kraGapRows.length ? (kraGapRows[0].gap >= 0 ? '+' : '') + kraGapRows[0].gap.toFixed(2) : '—'}
                </div>
            </div>

        </div>

        <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
            <table class="ud-table">
                <thead><tr>
                    <th>Competency / KRA
                        ${ud_thEye('Competency / KRA',
                            'The name of the KRA or Galfar Value competency being evaluated. Each row is one unique competency assessed across all appraisals in the selected unit and period.',
                            'SOURCE: Appraisal Goal rows → kra field\nGrouped by unique KRA name across all appraisals in selection',
                            'e.g. SAFETY, INTEGRITY, QUALITY, LEADERSHIP, CONTINUOUS IMPROVEMENT')}
                    </th>
                    <th>Top Performers (Avg / 5)
                        ${ud_thEye('Top Performers (Avg / 5)',
                            'Average assessor score for this competency across employees who scored 4.0 or above overall.',
                            'Score Range: 4–5',
                            'e.g. 8 top employees have a SAFETY KRA row → avg of their assessor scores = 4.20 / 5')}
                    </th>

                    <th>Middle Performers (Avg / 5)
                        ${ud_thEye('Middle Performers (Avg / 5)',
                            'Average assessor score for employees who scored between 3.0 and 3.99 overall.',
                            'Score Range: 3–4',
                            'e.g. 12 middle performers (3-4) have a SAFETY KRA row → avg = 3.10 / 5')}
                    </th>

                    <th>Low Performers (Avg / 5)
                        ${ud_thEye('Low Performers (Avg / 5)',
                            'Average assessor score for employees who scored between 1.0 and 2.99 overall.',
                            'Score Range: 1–3',
                            'e.g. 5 low performers (1–3) have a SAFETY KRA row → avg = 1.80 / 5')}
                    </th>
                    <th style="text-align:center;">Gap
                        ${ud_thEye('Gap',
                            'The competency gap = Top Performer avg - Low Performer avg for this KRA. A large positive gap means this competency strongly separates high and low performers — it is a key skill differentiator. A small or zero gap means all bands score similarly on this KRA.',
                            'Gap = Top Performer Avg − Low Performer Avg\n\nBadge colour:\n  ≥ 1.5 → red    (critical differentiator — prioritise in L&D)\n  ≥ 0.5 → yellow  (moderate gap — monitor and develop)\n  < 0.5 → green  (minimal gap — competency is evenly spread)',
                            'e.g. Top avg 4.20 − Low avg 1.80 = +2.40 → red badge → critical gap to close')}
                    </th>
                </tr></thead>
                <tbody>${compSummaryRows}</tbody>
            </table>
        </div>

        <div class="ai-insight-card" style="margin-top:20px;">
            <div class="ai-header">
                <h4 style="white-space: nowrap;">✨ Competency Gap Insights</h4>
                <button class="btn btn-sm btn-primary" id="btn-ai-competency-gap">Generate Insight</button>
            </div>
            <div id="ai-content-competency-gap" class="ai-body ai-insight-content">
                <p>Click Generate Insight for competency gap analysis</p>
            </div>
        </div>
    </div>
`);                       
                        let kraAgg = {};
                        goalData.forEach(function(row) {
                            let name    = (row.kra         || 'Unknown').trim();
                            let kraUnit = (row.custom_unit || 'Unknown').trim();
                            if (!kraAgg[name]) kraAgg[name] = {
                                totalSelf: 0,
                                totalAssr: 0,
                                count: 0,
                                selfCount: 0,        // ← distinct employees with self score
                                unit: kraUnit,
                                selfEmployees: new Set(),   // ← track unique employees
                                employees: []
                            };
                            kraAgg[name].totalSelf += (parseFloat((row.custom_self_score_with_weighted)*10))
                                || 0;
                            kraAgg[name].totalAssr += parseFloat(row.score) || 0;
                            kraAgg[name].count++;
                            let selfScore = parseFloat(row.custom_self_score) || 0;
                            if (row.employment_type =="Staff") {
                                kraAgg[name].selfEmployees.add(row.parent); // parent = appraisal name = unique employee
                            }
                            
                        });
                        Object.keys(kraAgg).forEach(n => {
                            kraAgg[n].selfCount = kraAgg[n].selfEmployees.size;
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
                        const priorityKRAs = [
                                "SAFETY",
                                "INTEGRITY",
                                "QUALITY",
                                "SIMPLICITY",
                                "RESPECT",
                                "CONTINUOUS IMPROVEMENT"
                            ];

                            let kraNames = Object.keys(kraAgg).sort((a, b) => {
                                const aKey = a.trim().toUpperCase();
                                const bKey = b.trim().toUpperCase();

                                const aIndex = priorityKRAs.indexOf(aKey);
                                const bIndex = priorityKRAs.indexOf(bKey);

                                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                if (aIndex !== -1) return -1;
                                if (bIndex !== -1) return 1;

                                return kraUnitSort(a, b);
                            });
                                                    
                        // let kraNames   = Object.keys(kraAgg).sort(kraUnitSort);
                        let kraAvgSelf = kraNames.map(n =>
                            kraAgg[n].selfCount > 0
                                ? parseFloat((kraAgg[n].totalSelf / kraAgg[n].selfCount).toFixed(2))
                                : 0
                        );

                        // kraAvgAssr unchanged — still divides by total assessment rows
                        let kraAvgAssr = kraNames.map(n =>
                            kraAgg[n].count > 0
                                ? parseFloat((kraAgg[n].totalAssr / kraAgg[n].count).toFixed(2))
                                : 0
                        );

                        // kraCounts — assessor count (total rows) vs self count (distinct employees)
                        let kraCounts     = kraNames.map(n => kraAgg[n].count);
                        let kraSelfCounts = kraNames.map(n => kraAgg[n].selfCount); // ← new, use in table if needed
                        
                        window.selfAssessorBarData = kraNames.map((name, i) => ({
                            competency: name,
                            avg_self_score: kraAvgSelf[i],
                            avg_assessor_score: kraAvgAssr[i],
                            employee_count: kraCounts[i]
                        }));

                        window.competencyRadarData = window.selfAssessorBarData;

                        $page.find('#ud-comp-loading').hide();
                        $page.find('#ud-comp-content').show();

                        // mkChart('ud-kra-bar-chart', {
                        //     type: 'bar',
                        //     data: {
                        //         labels: kraNames,
                        //         datasets: [
                        //             { label:'Avg Self Score',     data: kraAvgSelf, backgroundColor:'rgba(200,16,46,0.65)', borderColor:'#C8102E', borderWidth:1, borderRadius:5 },
                        //             { label:'Avg Assessor Score', data: kraAvgAssr, backgroundColor:'rgba(15,31,61,0.70)',  borderColor:'#0f1f3d', borderWidth:1, borderRadius:5 }
                        //         ]
                        //     },
                        //     options: {
                        //         responsive:true, maintainAspectRatio:false, indexAxis:'y',
                        //         scales: {
                        //             x: { beginAtZero:true, max:5, grid:{ color:'rgba(0,0,0,.05)' } },
                        //             y: { ticks:{ font:{ size:11 } } }
                        //         },
                        //         plugins: {
                        //             legend:{ position:'bottom' },
                        //             title:{ display:true, text:'Avg Self & Assessor Score per KRA (out of 5)', font:{ size:12 } }
                        //         }
                        //     }
                        // });
                        

                        let kraChartData = {
                            labels: [...kraNames],
                            self:   [...kraAvgSelf],
                            assr:   [...kraAvgAssr]
                        };

                        $('#ud-kra-bar-chart')
                            .css('cursor','pointer')
                            .off('click')
                            .on('click', function() {

                                // ── Always destroy old chart + remove old canvas before creating dialog ──
                                let existingChart = Chart.getChart('ud-kra-bar-chart-modal');
                                if (existingChart) existingChart.destroy();
                                $('#ud-kra-bar-chart-modal').closest('.modal').remove();  // nuke old dialog DOM too

                                // ── Fresh dialog every click ──────────────────────────────────────────────
                                let d = new frappe.ui.Dialog({
                                    title: 'KRA Score Distribution',
                                    size: 'extra-large'
                                });

                                $(d.body).html(`
                                    <div style="padding:16px; box-sizing:border-box;">
                                        <canvas id="ud-kra-bar-chart-modal"></canvas>
                                    </div>
                                `);

                                d.show();

                                setTimeout(() => {
                                    let canvas = document.getElementById('ud-kra-bar-chart-modal');
                                    if (!canvas) return;

                                    let modalWidth = $(d.body).width() || 800;
                                    canvas.width        = modalWidth - 32;
                                    canvas.height       = 480;
                                    canvas.style.width  = (modalWidth - 32) + 'px';
                                    canvas.style.height = '480px';

                                    new Chart(canvas, {
                                        type: 'bar',
                                        data: {
                                            labels: kraChartData.labels.map(l => l.toUpperCase()),

                                            datasets: [
                                                {
                                                    label: 'Avg Self Score',
                                                    data:  kraChartData.self,
                                                    backgroundColor: 'rgba(200,16,46,0.65)',
                                                    borderColor: '#C8102E',
                                                    borderWidth: 1,
                                                    borderRadius: 5
                                                },
                                                {
                                                    label: 'Avg Assessor Score',
                                                    data:  kraChartData.assr,
                                                    backgroundColor: 'rgba(15,31,61,0.70)',
                                                    borderColor: '#0f1f3d',
                                                    borderWidth: 1,
                                                    borderRadius: 5
                                                }
                                            ]
                                        },
                                        options: {
                                            responsive: false,
                                            maintainAspectRatio: false,
                                            indexAxis: 'y',
                                            scales: {
                                                x: { beginAtZero:true, max:5, grid:{ color:'rgba(0,0,0,.05)' } },
                                                y: { ticks:{ font:{ size:13 } } }
                                            },
                                            plugins: {
                                                legend: { position:'bottom' },
                                                title: {
                                                    display: true,
                                                    text: 'Avg Self & Assessor Score per KRA (out of 5)',
                                                    font: { size:14 }
                                                }
                                            }
                                        }
                                    });
                                }, 300);
                            });
                        // ── Split KRAs into Galfar Values vs other Competencies ─────────────────
const GALFAR_VALUES = ['SAFETY','INTEGRITY','QUALITY','SIMPLICITY','RESPECT','CONTINUOUS IMPROVEMENT'];

let valuesIndices     = kraNames.map((n,i) => GALFAR_VALUES.includes(n.trim().toUpperCase()) ? i : -1).filter(i => i >= 0);
let compIndices       = kraNames.map((n,i) => !GALFAR_VALUES.includes(n.trim().toUpperCase()) ? i : -1).filter(i => i >= 0);

let valuesNames   = valuesIndices.map(i => kraNames[i]);
let valuesSelf    = valuesIndices.map(i => kraAvgSelf[i]);
let valuesAssr    = valuesIndices.map(i => kraAvgAssr[i]);

let compNames     = compIndices.map(i => kraNames[i]);
let compSelf      = compIndices.map(i => kraAvgSelf[i]);
let compAssr      = compIndices.map(i => kraAvgAssr[i]);


mkChart('ud-kra-bar-chart', {
        type: 'bar',
        data: {
            labels: valuesNames,
            datasets: [
                { label:'Avg Self Score',     data: valuesSelf, backgroundColor:'rgba(200,16,46,0.65)', borderColor:'#C8102E', borderWidth:1, borderRadius:5 },
                { label:'Avg Assessor Score', data: valuesAssr, backgroundColor:'rgba(15,31,61,0.70)',  borderColor:'#0f1f3d', borderWidth:1, borderRadius:5 }
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
                title:{ display:false, text:'Avg Self & Assessor Score per KRA (out of 5)', font:{ size:12 } }
            }
        }
    });
// ── Galfar Values Radar ───────────────────────────────────────────────────
if (valuesNames.length) {
    mkChart('ud-kra-radar-values', {
        type: 'radar',
        data: {
            labels: valuesNames,
            datasets: [
                {
                    label: 'Avg Self Score',
                    data: valuesSelf,
                    borderColor: '#C8102E',
                    backgroundColor: 'rgba(200,16,46,.15)',
                    pointBackgroundColor: '#C8102E',
                    pointRadius: 4
                },
                {
                    label: 'Avg Assessor Score',
                    data: valuesAssr,
                    borderColor: '#0f1f3d',
                    backgroundColor: 'rgba(15,31,61,.15)',
                    pointBackgroundColor: '#0f1f3d',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { r: { beginAtZero: true, max: 5, ticks: { font: { size: 9 } } } },
            plugins: {
                legend: { position: 'bottom' },
                title: { display: false }
            }
        }
    });
}

// ── Other Competencies Radar ──────────────────────────────────────────────
if (compNames.length) {
    destroyChart('ud-kra-radar-competency');
    chartInstances['ud-kra-radar-competency'] = new Chart($page.find('#ud-kra-radar-competency')[0], {
        type: 'radar',
        data: {
            labels: compNames,
            datasets: [
                {
                    label: 'Avg Self Score',
                    data: compSelf,
                    borderColor: '#C8102E',
                    backgroundColor: 'rgba(200,16,46,.15)',
                    pointBackgroundColor: '#C8102E',
                    pointRadius: 3
                },
                {
                    label: 'Avg Assessor Score',
                    data: compAssr,
                    borderColor: '#0f1f3d',
                    backgroundColor: 'rgba(15,31,61,.15)',
                    pointBackgroundColor: '#0f1f3d',
                    pointRadius: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 30,
                    bottom: 30,
                    left: 80,
                    right: 80
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        font: { size: 8 },
                        stepSize: 1,
                        backdropColor: 'transparent'
                    },
                    pointLabels: {
                        font: { size: 9 },
                        color: '#333',
                        callback: function(label) {
                            // Wrap long labels into multiple lines
                            const maxLen = 18;
                            if (label.length <= maxLen) return label;
                            const words = label.split(' ');
                            let lines = [];
                            let current = '';
                            words.forEach(word => {
                                if ((current + ' ' + word).trim().length <= maxLen) {
                                    current = (current + ' ' + word).trim();
                                } else {
                                    if (current) lines.push(current);
                                    current = word;
                                }
                            });
                            if (current) lines.push(current);
                            return lines;
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 10 }, padding: 16 }
                }
            }
        }
    });
}

// Keep the combined radar data on window for AI insights (unchanged)
window.competencyChartData = kraNames.map((name, i) => ({
    competency: name,
    avg_self_score: kraAvgSelf[i],
    avg_assessor_score: kraAvgAssr[i],
    employee_count: kraCounts[i]
}));

                        let kraRadarData = {
                            labels: [...kraNames],
                            self:   [...kraAvgSelf],
                            assr:   [...kraAvgAssr]
                        };

                        $('#ud-kra-radar-chart')
                            .css('cursor', 'pointer')
                            .off('click')
                            .on('click', function() {

                                // Destroy + purge old dialog
                                let existingChart = Chart.getChart('ud-kra-radar-chart-modal');
                                if (existingChart) existingChart.destroy();
                                $('#ud-kra-radar-chart-modal').closest('.modal').remove();

                                // Fresh dialog every click
                                let d = new frappe.ui.Dialog({
                                    title: 'Galfar Values & Competency',
                                    size: 'large'
                                });

                                // Force wider than Frappe's default extra-large cap
                                $(d.$wrapper).find('.modal-dialog').css({
                                    'max-width': '50vw',
                                    'width':     '50vw'
                                });

                                $(d.body).html(`
                                    <div style="padding:12px; box-sizing:border-box; overflow-y:auto; max-height:75vh;">
                                        <canvas id="ud-kra-radar-chart-modal"></canvas>
                                    </div>
                                `);

                                d.show();

                                setTimeout(() => {
                                    let canvas = document.getElementById('ud-kra-radar-chart-modal');
                                    if (!canvas) return;

                                    let modalWidth = $(d.body).width() || 650;
                                    let size = modalWidth - 24;

                                    canvas.width        = size;
                                    canvas.height       = size;       // square = perfect radar shape
                                    canvas.style.width  = size + 'px';
                                    canvas.style.height = size + 'px';

                                    new Chart(canvas, {
                                        type: 'radar',
                                        data: {
                                            labels: kraRadarData.labels.map(l => l.toUpperCase()),
                                            datasets: [
                                                {
                                                    label: 'Avg Self Score',
                                                    data:  kraRadarData.self,
                                                    borderColor: '#C8102E',
                                                    backgroundColor: 'rgba(200,16,46,.15)',
                                                    pointBackgroundColor: '#C8102E',
                                                    pointRadius: 5
                                                },
                                                {
                                                    label: 'Avg Assessor Score',
                                                    data:  kraRadarData.assr,
                                                    borderColor: '#0f1f3d',
                                                    backgroundColor: 'rgba(15,31,61,.15)',
                                                    pointBackgroundColor: '#0f1f3d',
                                                    pointRadius: 5
                                                }
                                            ]
                                        },
                                        options: {
                                            responsive: false,
                                            maintainAspectRatio: false,
                                            layout: {
                                                padding: 60    // keeps edge labels from clipping
                                            },
                                            scales: {
                                                r: {
                                                    beginAtZero: true,
                                                    max: 5,
                                                    ticks: {
                                                        font: { size: 10 },
                                                        backdropColor: 'transparent'
                                                    },
                                                    pointLabels: {
                                                        font: { size: 10 },
                                                        color: '#333'
                                                    }
                                                }
                                            },
                                            plugins: {
                                                legend: { position: 'bottom' },
                                                title: {
                                                    display: true,
                                                    text: 'Galfar Values & Competency Radar (out of 5)',
                                                    font: { size: 13 }
                                                }
                                            }
                                        }
                                    });
                                }, 300);
                            });
                            
                        let competencyInsightData = [];

                        let kraTableRows = kraNames.map((n, i) => {

                            let selfAvg = parseFloat(kraAvgSelf[i]) || 0;
                            let asrAvg  = parseFloat(kraAvgAssr[i]) || 0;
                            let cnt     = parseInt(kraCounts[i]) || 0;

                            competencyInsightData.push({
                                competency: n,
                                employees: cnt,
                                avg_self: Number(selfAvg.toFixed(2)),
                                avg_assessor: Number(asrAvg.toFixed(2)),
                                assessor_progress: Number(((asrAvg / 5) * 100).toFixed(0))
                            });

                            let cls  = asrAvg >= 4 ? 'green' : asrAvg >= 2.5 ? 'orange' : 'red';
                            let barW = Math.min((asrAvg / 5) * 100, 100);

                            return `
                                <tr>
                                    <td style="font-weight:600;">${n.toUpperCase()}</td>
                                    <td style="text-align:center;">${cnt}</td>
                                    <td style="text-align:center;color:#C8102E;font-weight:700;">${selfAvg.toFixed(2)}</td>
                                    <td style="text-align:center;color:#0f1f3d;font-weight:700;">${((asrAvg/5)*100).toFixed(0)}%</td>

                                    <td>
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <div class="ud-prog" style="flex:1;">
                                                <div class="ud-prog-fill"
                                                    style="width:${barW}%;background:#0f1f3d;">
                                                </div>
                                            </div>

                                            <span class="ud-badge ud-badge-${cls}">
                                                ${asrAvg.toFixed(2)} / 5
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('');
                        window.competencyInsightData = competencyInsightData;
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
                            <div class="ai-insight-card" style="margin-top:20px;">
                                <div class="ai-header">
                                    <h4 style="white-space: nowrap;">✨ Competency Insights</h4>
                                    <button class="btn btn-sm btn-primary" id="btn-ai-competency">Generate Insight</button>
                                </div>
                                <div id="ai-content-competency" class="ai-body ai-insight-content">
                                    <p>Click Generate Insight for competency status analysis<p>
                                </div>
                            </div>
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
                let filters = { start_date: ['between', [fromVal, toVal]],docstatus:['!=',2] };
                if (unit !== '__ALL__') filters.custom_unit = unit;
                Object.keys(extra).forEach(key => { filters[key] = extra[key]; });
                frappe.open_in_new_tab = true;
                frappe.set_route('List', 'Appraisal', filters);
            }

            $page.find('#ud-card-total').off('click').on('click',     () => openList());
            $page.find('#ud-card-completed').off('click').on('click', () => openList({ workflow_state: ['in', ['Approved','Accepted']] }));
            $page.find('#ud-card-pending').off('click').on('click',   () => openList({ workflow_state: ['not in', ['Approved','Accepted','Cancelled']] }));
            $page.find('#ud-card-avg').off('click').on('click',       () => openList({ custom_appraisal_status: ['==', 'Overdue'] }));
            $page.find('#ud-card-top').off('click').on('click',       () => openList({ workflow_state: ['in', ['Approved','Accepted']],total_score: ['>', 3.5] }));
            $page.find('#ud-card-low').off('click').on('click',       () => openList({ workflow_state: ['in', ['Approved','Accepted']],total_score: ['<', 2.5]}));
            // ── Performer mini-KPI card clicks ────────────────────────────────────────
            
            function perfBand(s) {
                
    let v = parseFloat(s) || 0;
    if (v >= 4.0) return { label: 'A — Excellent',  cls: 'ud-badge-green',  hex: '#4C8C32' };
    if (v >= 3.0) return { label: 'B — Very Good',  cls: 'ud-badge-blue',   hex: '#9AC654' };
    if (v >= 2.0) return { label: 'C — Good',       cls: 'ud-badge-orange', hex: '#F1D548' };
    if (v >= 1.0) return { label: 'D — Acceptable', cls: 'ud-badge-red',    hex: '#D97706' };
    return         { label: 'E — Poor',             cls: 'ud-badge-red',    hex: '#ED2D1E' };
}
 
// ── Helper: horizontal score bar ─────────────────────────────────────────
function perfScoreBar(s, hexColor) {
    let p = Math.min(100, Math.round((parseFloat(s) || 0) / 5 * 100));
    return `<div class="ud-sbar-wrap">
        <div class="ud-sbar">
            <div class="ud-sbar-fill" style="width:${p}%;background:${hexColor};"></div>
        </div>
        <span style="font-size:10px;font-weight:700;min-width:30px;">${parseFloat(s).toFixed(2)}</span>
    </div>`;
}
 
// ── Helper: rank medal badge ──────────────────────────────────────────────
function perfRankBadge(i) {
    if (i === 0) return `<span class="ud-rank-badge ud-rank-1">1</span>`;
    if (i === 1) return `<span class="ud-rank-badge ud-rank-2">2</span>`;
    if (i === 2) return `<span class="ud-rank-badge ud-rank-3">3</span>`;
    return `<span class="ud-rank-badge ud-rank-n">${i + 1}</span>`;
}
 
// ── Helper: appraisal status badge ───────────────────────────────────────
function perfStatusBadge(d) {
    if (['Approved', 'Accepted'].includes(d.workflow_state))
        return `<span class="ud-badge ud-badge-green">Completed</span>`;
    if (d.custom_appraisal_status === 'Overdue')
        return `<span class="ud-badge ud-badge-red">Overdue</span>`;
    return `<span class="ud-badge ud-badge-orange">Pending</span>`;
}
 
// ── Helper: retention risk level for top/strong performers ───────────────
function perfRetentionRisk(d) {
    if (d.custom_appraisal_status === 'Overdue') return 'h';
    if (!['Approved', 'Accepted'].includes(d.workflow_state)) return 'm';
    return 'l';
}
 
// ── Helper: PIP risk level for low performers ─────────────────────────────
function perfPipRisk(score) {
    let v = parseFloat(score) || 0;
    if (v <= 2.0)  return 'h';
    if (v <= 2.25) return 'm';
    return 'l';
}
// ── Promotion Eligibility charts ──────────────────────────────────────────────
if ($page.find('#ud-promo-donut').length) {
    destroyChart('ud-promo-donut');
    chartInstances['ud-promo-donut'] = new Chart($page.find('#ud-promo-donut')[0], {
        type: 'doughnut',
        data: {
            labels: ['Strong Candidate', 'Ready', 'Watch List', 'Not Eligible'],
            datasets: [{
                data: [promoStrong.length, promoReady.length, promoWatch.length, promoNotElig.length],
                backgroundColor: ['#28a745', '#AED581', 'ffc107', '#C8102E'],
                borderColor: '#fff', borderWidth: 3
            }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '58%',layout: { padding: { top: 20 } },
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10 } } },
                tooltip: { callbacks: { label: c => `${c.label}: ${c.raw}` } }
            }
        }
    });
}

if ($page.find('#ud-promo-unit-bar').length) {
    let promoUnitMap = {};
    [...promoStrong, ...promoReady, ...promoWatch].forEach(d => {
        let u = d.custom_unit || 'Unknown';
        let e = promoEligibility(d);
        if (!promoUnitMap[u]) promoUnitMap[u] = { strong:0, ready:0, watch:0 };
        if (e.rank === 1) promoUnitMap[u].strong++;
        else if (e.rank === 2) promoUnitMap[u].ready++;
        else promoUnitMap[u].watch++;
    });
    let puk = Object.keys(promoUnitMap).sort();
    destroyChart('ud-promo-unit-bar');
    chartInstances['ud-promo-unit-bar'] = new Chart($page.find('#ud-promo-unit-bar')[0], {
        type: 'bar',
        data: {
            labels: puk,
            datasets: [
                { label:'Strong', data: puk.map(u => promoUnitMap[u].strong), backgroundColor:'#28a745', borderRadius:4, borderWidth:0 },
                { label:'Ready',  data: puk.map(u => promoUnitMap[u].ready),  backgroundColor:'#AED581', borderRadius:4, borderWidth:0 },
                { label:'Watch',  data: puk.map(u => promoUnitMap[u].watch),  backgroundColor:'#ffc107', borderRadius:4, borderWidth:0 },
            ]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales: { x:{ stacked:true, grid:{display:false} }, y:{ stacked:true, beginAtZero:true } },
            plugins: { legend:{ position:'bottom', labels:{ font:{size:10} } } }
        }
    });
}

// ── Leniency charts ───────────────────────────────────────────────────────────
if ($page.find('#ud-leniency-bar').length) {
    let luk = Object.keys(leniencyUnitMap).sort();
    let unitAvgs = luk.map(u => {
        let sc = leniencyUnitMap[u].scores;
        return parseFloat((sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(2));
    });
    let barColors = unitAvgs.map(a =>
        a - popAvg > 0.4 ? '#f4a100' : a - popAvg < -0.4 ? '#C8102E' : '#28a745'
    );
    destroyChart('ud-leniency-bar');
    chartInstances['ud-leniency-bar'] = new Chart($page.find('#ud-leniency-bar')[0], {
    type: 'bar',
    data: {
        labels: luk,
        datasets: [
            { label:'Unit Avg', data: unitAvgs, backgroundColor: barColors, borderRadius:5, borderWidth:0 },
            { label:'Population Avg', data: luk.map(() => parseFloat(popAvg.toFixed(2))),
              type:'line', borderColor:'#0f1f3d', borderDash:[5,3], borderWidth:2,
              pointRadius:0, backgroundColor:'transparent' }
        ]
    },
    plugins: [dataLabelPlugin],
    options: {
        responsive:true, maintainAspectRatio:false, layout: { padding: { top: 20 } },
        centerLabels: true,   // ← add this
        scales: { y:{ beginAtZero:false, min: Math.max(0, popAvg - 1.5), max: Math.min(5, popAvg + 1.5) } },
        plugins: { legend:{ position:'bottom', labels:{ font:{size:10} } } }
    }
});
}

if ($page.find('#ud-spread-bar').length) {
    let luk = Object.keys(leniencyUnitMap).sort();
    let stdDevs = luk.map(u => parseFloat(calcStdDev(leniencyUnitMap[u].scores).toFixed(2)));
    let sdColors = stdDevs.map(s => s > 1.2 ? '#C8102E' : s > 0.6 ? '#ffc107' : '#28a745');
    destroyChart('ud-spread-bar');
    chartInstances['ud-spread-bar'] = new Chart($page.find('#ud-spread-bar')[0], {
        type: 'bar',
        data: {
            labels: luk,
            datasets: [{ label:'Std Dev', data: stdDevs, backgroundColor: sdColors, borderRadius:5, borderWidth:0 }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales: { y:{ beginAtZero:true, max: Math.min(5, Math.max(...stdDevs) + 0.5) } },
            plugins: {
                legend:{ display:false },
                tooltip:{ callbacks:{ label: c => `Std Dev: ${c.raw} — ${c.raw > 1.2 ? 'High' : c.raw > 0.6 ? 'Moderate' : 'Low'} variance` } }
            }
        }
    });
}

// ── Delayed Assessment charts ─────────────────────────────────────────────────
if ($page.find('#ud-delay-unit-bar').length) {
    let duk = Object.keys(delUnitMap).sort((a,b) => delUnitMap[b].total - delUnitMap[a].total);
    destroyChart('ud-delay-unit-bar');
    chartInstances['ud-delay-unit-bar'] = new Chart($page.find('#ud-delay-unit-bar')[0], {
        type: 'bar',
        data: {
            labels: duk,
            datasets: [
                { label:'Critical >60d',  data: duk.map(u => delUnitMap[u].critical), backgroundColor:'#C8102E', borderRadius:4, borderWidth:0 },
                { label:'Warning 30–60d', data: duk.map(u => delUnitMap[u].warning),  backgroundColor:'#ffc107', borderRadius:4, borderWidth:0 },
                { label:'Watch 15–30d',   data: duk.map(u => delUnitMap[u].watch),    backgroundColor:'#0f1f3d', borderRadius:4, borderWidth:0 },
            ]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales: { x:{ stacked:true, grid:{display:false} }, y:{ stacked:true, beginAtZero:true } },
            plugins: { legend:{ position:'bottom', labels:{ font:{size:10} } } }
        }
    });
}

if ($page.find('#ud-delay-donut').length) {
    destroyChart('ud-delay-donut');
    chartInstances['ud-delay-donut'] = new Chart($page.find('#ud-delay-donut')[0], {
        type: 'doughnut',
        data: {
            labels: ['Critical (>60d)', 'Warning (30–60d)', 'Watch (15–30d)'],
            datasets: [{
                data: [delCritical, delWarning, delWatch],
                backgroundColor: ['#C8102E', '#ffc107', '#0f1f3d'],
                borderColor: '#fff', borderWidth: 3
            }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false, cutout:'55%',layout: { padding: { top: 20 } },
            plugins: { legend:{ position:'bottom', labels:{ font:{size:10} } } }
        }
    });
}

// ── Calibration Variance charts ───────────────────────────────────────────────
if ($page.find('#ud-calibvar-bar').length) {
    let cvk = Object.keys(calibVarUnitMap).sort();
    let stdDevs2 = cvk.map(u => parseFloat(calcStdDev(calibVarUnitMap[u].assessorScores).toFixed(2)));
    let cvColors = stdDevs2.map(s => s > 1.2 ? '#C8102E' : s > 0.6 ? '#ffc107' : '#28a745');
    destroyChart('ud-calibvar-bar');
    chartInstances['ud-calibvar-bar'] = new Chart($page.find('#ud-calibvar-bar')[0], {
        type: 'bar',
        data: {
            labels: cvk,
            datasets: [{ label:'Score Std Dev', data: stdDevs2, backgroundColor: cvColors, borderRadius:5, borderWidth:0 }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales: { y:{ beginAtZero:true } },
            plugins: {
                legend:{ display:false },
                tooltip:{ callbacks:{ label: c => `Std Dev: ${c.raw} — ${c.raw > 1.2 ? 'High' : c.raw > 0.6 ? 'Moderate' : 'Low'} variance` } }
            }
        }
    });
}

if ($page.find('#ud-align-bar').length) {
    let cvk = Object.keys(calibVarUnitMap).sort();
    let alignRates = cvk.map(u => {
        let cv = calibVarUnitMap[u];
        return cv.selfScores.length
            ? Math.round((cv.alignedCount / cv.selfScores.length) * 100) : 0;
    });
    let alColors = alignRates.map(r => r >= 70 ? '#28a745' : r >= 40 ? '#ffc107' : '#C8102E');
    destroyChart('ud-align-bar');
    chartInstances['ud-align-bar'] = new Chart($page.find('#ud-align-bar')[0], {
        type: 'bar',
        data: {
            labels: cvk,
            datasets: [{ label:'Alignment %', data: alignRates, backgroundColor: alColors, borderRadius:5, borderWidth:0 }]
        },
        plugins: [dataLabelPlugin],
        options: {
            responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
            scales: { y:{ beginAtZero:true, max:100, ticks:{ callback: v => v + '%' } } },
            plugins: {
                legend:{ display:false },
                tooltip:{ callbacks:{ label: c => `${c.raw}% of employees within ±0.5 of self score` } }
            }
        }
    });
}
 
// ── Promotion Eligibility tab switcher ────────────────────────────────────────
const promoTabActive = {
    elig:     'pt-elig',
    leniency: 'pt-leniency',
    delayed:  'pt-delayed',
    calibvar: 'pt-calibvar',
};
$page.find('.ud-promo-tabs')
    .off('click', '.ud-promo-tab')
    .on('click', '.ud-promo-tab', function() {
        let chosen = $(this).data('promo');
        $page.find('.ud-promo-tab').removeClass(Object.values(promoTabActive).join(' ') + ' active');
        $(this).addClass((promoTabActive[chosen] || '') + ' active');
        $page.find('.ud-promo-panel').removeClass('active');
        $page.find('#udpp-' + chosen).addClass('active');
    });


// ── Helper: risk chip HTML ────────────────────────────────────────────────
function riskChip(level, labels) {
    labels = labels || { h: 'High', m: 'Medium', l: 'Low' };
    if (level === 'h') return `<span class="ud-risk-chip ud-risk-h">${labels.h}</span>`;
    if (level === 'm') return `<span class="ud-risk-chip ud-risk-m">${labels.m}</span>`;
    return `<span class="ud-risk-chip ud-risk-l">${labels.l}</span>`;
}
  

$('head').append(`<style id="ud-hist-styles">
    /* ── Historical section tab bar ── */
    .ud-hist-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
    .ud-hist-tab {
        padding:5px 16px; border-radius:20px; font-size:11px; font-weight:700;
        cursor:pointer; border:2px solid #dee2e6; background:#fff;
        color:#495057; transition:all .18s; white-space:nowrap;
    }
    .ud-hist-tab:hover              { border-color:#C8102E; color:#C8102E; }
    .ud-hist-tab.ht-active-yoy     { background:#0f1f3d; border-color:#0f1f3d; color:#fff; }
    .ud-hist-tab.ht-active-unit    { background:#C8102E; border-color:#C8102E; color:#fff; }
    .ud-hist-tab.ht-active-trend   { background:#00796b; border-color:#00796b; color:#fff; }
    .ud-hist-tab.ht-active-heatmap { background:#7b1fa2; border-color:#7b1fa2; color:#fff; }

    .ud-hist-panel { display:none; }
    .ud-hist-panel.active { display:block; }

    /* ── Year-pill selector ── */
    .ud-yr-pills { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px; }
    .ud-yr-pill {
        padding:3px 12px; border-radius:12px; font-size:11px; font-weight:700;
        cursor:pointer; border:2px solid #dee2e6; background:#fff; color:#495057;
        transition:all .15s;
    }
    .ud-yr-pill.active { background:#0f1f3d; border-color:#0f1f3d; color:#fff; }

    /* ── Heatmap table ── */
    .ud-hist-heat { width:100%; border-collapse:collapse; font-size:11px; }
    .ud-hist-heat th {
        background:#0f1f3d; color:#fff; padding:7px 10px;
        font-size:10px; letter-spacing:.4px; text-align:center;
    }
    .ud-hist-heat td { padding:7px 10px; text-align:center; border-bottom:1px solid #e9ecef; font-weight:600; }
    .ud-hist-heat td:first-child { text-align:left; font-weight:700; white-space:nowrap; }
    .ud-hist-heat tr:hover td { background:#fce8ec; }

    /* ── Grade legend pills ── */
    .ud-grade-legend { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:12px; font-size:11px; }
    .ud-gl-item { display:flex; align-items:center; gap:4px; }
    .ud-gl-dot  { width:10px; height:10px; border-radius:50%; }

    @media print {
        .ud-hist-panel { display:block !important; }
        .ud-hist-tabs  { display:none !important; }
    }
</style>`);


/* ── 2. PLACEHOLDER HTML  (assign to histHtml, include in #ud-main) ──────── */



/* ── 3. FETCH + RENDER  (paste inside render_dashboard, after chart init) ── */

frappe.call({
    method: 'pms_ai.pms.page.unit_dashboard.unit_dashboard.get_historical_performance',
    args: { unit: unit },
    callback: function(r) {
        let hd = r.message || {};
        $page.find('#ud-hist-loading').hide();

        if (!hd.years || !hd.years.length) {
            $page.find('#ud-hist-empty')
                .text('No historical rating data found in Employee Previous Ratings for this selection.')
                .show();
            return;
        }

        $page.find('#ud-hist-content').show();
        render_historical_section(hd);
        render_succession_readiness(data);
        render_ld_section(data, unit);
    }
});


/* ── 4. RENDER FUNCTION ───────────────────────────────────────────────────── */
function render_historical_section(hd) {
    window.historicalPerformanceData = {
        years: hd.years,
        units: hd.units,
        combined: hd.combined,
        trend: hd.trend,
        by_unit: hd.by_unit
    };

    const GRADES       = ['A', 'B', 'C', 'D', 'E'];
    const GRADE_LABELS = { A:'A (Excellent)', B:'B (Very Good)', C:'C (Good)', D:'D (Acceptable)', E:'E (Poor)' };
    const GRADE_COLORS = { A:'#28a745 ', B:'#AED581 ', C:'#FFEE58 ', D:'#ffc107 ', E:'#C8102E' };
    const GRADE_SCORE  = { A:5, B:4, C:3, D:2, E:1 };

    let years = hd.years;   // sorted strings
    let units = hd.units;

    /* ── grade legend HTML ── */
    let legendHtml = `<div class="ud-grade-legend">` +
        GRADES.map(g => `
            <div class="ud-gl-item">
                <div class="ud-gl-dot" style="background:${GRADE_COLORS[g]};"></div>
                <span>${GRADE_LABELS[g]}</span>
            </div>`).join('') +
        `</div>`;

    /* ─────────────────────────────────────────────────────────────────────────
       PANEL 1 — Year-on-Year Grade Distribution (stacked bar, combined)
    ───────────────────────────────────────────────────────────────────────── */
    let yoyPanelHtml = `
        <div style="margin-bottom:12px;">
            <div style="font-size:12px;color:#868e96;margin-bottom:8px;">
                Shows grade distribution (A–E) across all years for the selected unit scope.
                Grades sourced from <strong>Employee → Previous Ratings</strong>.
            </div>
            ${legendHtml}
            <div class="ud-2col" style="margin-bottom:18px;">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        📊 Grade Distribution per Year (Count)
                    </div>
                    <div class="ud-chart-wrap" style="height:280px;">
                        <canvas id="ud-hist-yoy-stacked"></canvas>
                    </div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        📊 Grade Distribution per Year (%)
                    </div>
                    <div class="ud-chart-wrap" style="height:280px;">
                        <canvas id="ud-hist-yoy-pct"></canvas>
                    </div>
                </div>
            </div>

            <!-- Summary table -->
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-hist-heat">
                    <thead>
                        <tr>
                            <th style="text-align:left;min-width:80px;">Year</th>
                            ${GRADES.map(g => `<th style="background:${GRADE_COLORS[g]};">${g}</th>`).join('')}
                            <th>Total</th>
                            <th>Avg Score</th>
                            <th>Top % (A+B)</th>
                            <th>Low % (D+E)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${years.map(yr => {
                            let bkt  = hd.combined[yr] || {};
                            let tot  = bkt.total || 0;
                            let avg  = hd.trend.combined[yr] || '—';
                            let topP = tot ? Math.round(((bkt.A||0)+(bkt.B||0))/tot*100) : 0;
                            let lowP = tot ? Math.round(((bkt.D||0)+(bkt.E||0))/tot*100) : 0;
                            let gradeCells = GRADES.map(g => {
                                let n = bkt[g] || 0;
                                let p = tot ? Math.round(n/tot*100) : 0;
                                let bg = p >= 30 ? GRADE_COLORS[g] : p >= 10 ? GRADE_COLORS[g]+'55' : 'transparent';
                                let fc = p >= 30 ? '#fff' : '#333';
                                return `<td style="background:${bg};color:${fc};
                                    -webkit-print-color-adjust:exact;print-color-adjust:exact;">
                                    ${n}<span style="font-size:9px;opacity:.7;"> (${p}%)</span>
                                </td>`;
                            }).join('');
                            return `<tr>
                                <td style="text-align:left;font-size:12px;">${yr}</td>
                                ${gradeCells}
                                <td>${tot}</td>
                                <td style="font-weight:700;color:#0f1f3d;">${typeof avg==='number' ? avg.toFixed(2) : avg}</td>
                                <td><span class="ud-badge ud-badge-blue">${topP}%</span></td>
                                <td><span class="ud-badge ud-badge-red">${lowP}%</span></td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

    /* ─────────────────────────────────────────────────────────────────────────
       PANEL 2 — Unit / Department Comparison (grouped bar per grade per year)
    ───────────────────────────────────────────────────────────────────────── */

    // Year-pill selector for panel 2
    let latestYear = years[years.length - 1];
    let yrPills = years.map(yr =>
        `<div class="ud-yr-pill${yr === latestYear ? ' active' : ''}"
              data-yr="${yr}" id="ud-yr-pill-${yr}">${yr}</div>`
    ).join('');

    let unitCompPanelHtml = `
        <div>
            <div style="font-size:12px;color:#868e96;margin-bottom:8px;">
                Compare grade distribution across units for a selected year.
            </div>
            <div class="ud-yr-pills" id="ud-yr-pills-comp">${yrPills}</div>
            ${legendHtml}
            <div class="ud-chart-wrap" style="height:320px;margin-bottom:18px;">
                <canvas id="ud-hist-unit-comp"></canvas>
            </div>
            <div id="ud-unit-comp-table" style="overflow-x:auto;"></div>
        </div>`;

    /* ─────────────────────────────────────────────────────────────────────────
       PANEL 3 — Trend Lines (avg grade score per unit, year-on-year)
    ───────────────────────────────────────────────────────────────────────── */
    let trendPanelHtml = `
        <div>
            <div style="font-size:12px;color:#868e96;margin-bottom:8px;">
                Weighted average score per year per unit.
                <strong>Mapping: A=5, B=4, C=3, D=2, E=1.</strong>
                Higher = better overall performance trend.
            </div>
            <div class="ud-2col">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        📈 Combined Avg Score Trend (All Units)
                    </div>
                    <div class="ud-chart-wrap" style="height:260px;">
                        <canvas id="ud-hist-trend-comb"></canvas>
                    </div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">
                        📈 Per-Unit Avg Score Trend
                    </div>
                    <div class="ud-chart-wrap" style="height:260px;">
                        <canvas id="ud-hist-trend-unit"></canvas>
                    </div>
                </div>
            </div>
        </div>`;

    /* ─────────────────────────────────────────────────────────────────────────
       PANEL 4 — Full Heatmap (unit × year, cell = avg score)
    ───────────────────────────────────────────────────────────────────────── */
    let heatCols = years.map(yr => `<th>${yr}</th>`).join('');
    let heatBodyRows = units.map(u => {
        let cells = years.map(yr => {
            let bkt = (hd.by_unit[u] || {})[yr];
            if (!bkt || !bkt.total) return `<td style="color:#ccc;">—</td>`;
            let avg = hd.trend.by_unit[u] && hd.trend.by_unit[u][yr] != null
                ? hd.trend.by_unit[u][yr] : null;
            if (avg === null) return `<td>—</td>`;
            // color: green≥4, blue≥3, orange≥2, red<2
            let bg = avg >= 4 ? 'rgba(40,167,69,.18)' :
                     avg >= 3 ? 'rgb(174, 213, 129,.18)' :
                     avg >= 2 ? 'rgba(255, 238, 88,.18)' : 
                     avg > 1 ? 'rgba(255, 193, 7,.18)' : 'rgba(229,57,53,.15)';
            let fc = avg >= 4 ? '#28a745' : avg >= 3 ? '#AED581' :
                     avg >= 2 ? '#FFEE58' : avg > 1 ? '#ffc107' :'#C8102E';
            return `<td style="background:${bg};color:${fc};font-weight:700;
                -webkit-print-color-adjust:exact;print-color-adjust:exact;">${avg.toFixed(2)}</td>`;
        }).join('');
        return `<tr><td>${u}</td>${cells}</tr>`;
    }).join('');

    let heatmapPanelHtml = `
        <div>
            <div style="font-size:12px;color:#868e96;margin-bottom:10px;">
                Cell = weighted avg score (A=5…E=1) per unit per year.
                <span style="color:#28a745;font-weight:600;">Green ≥ 4</span> ·
                <span style="color:#AED581;font-weight:600;">Light Green 3–4</span> ·
                <span style="color:#FFEE58;font-weight:600;">Yellow 2–3</span> ·
                <span style="color:#ffc107;font-weight:600;">Orange 1–2</span> ·
                <span style="color:#C8102E;font-weight:600;">Red ≤ 1</span>
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-hist-heat">
                    <thead>
                        <tr>
                            <th style="text-align:left;min-width:130px;">Unit</th>
                            ${heatCols}
                        </tr>
                    </thead>
                    <tbody>${heatBodyRows}</tbody>
                </table>
            </div>
        </div>`;

    /* ── Assemble all panels ── */
    let contentHtml = `
        <div class="ud-hist-tabs">
            <div class="ud-hist-tab ht-active-yoy"     data-hist="yoy">📊 Year-on-Year</div>
            <div class="ud-hist-tab"                    data-hist="unit">🏢 Unit Comparison</div>
            <div class="ud-hist-tab"                    data-hist="trend">📈 Trend Lines</div>
            <div class="ud-hist-tab"                    data-hist="heatmap">🔥 Heatmap</div>
        </div>
        <div class="ud-hist-panel active" id="ud-hist-yoy">${yoyPanelHtml}</div>
        <div class="ud-hist-panel"        id="ud-hist-unit">${unitCompPanelHtml}</div>
        <div class="ud-hist-panel"        id="ud-hist-trend">${trendPanelHtml}</div>
        <div class="ud-hist-panel"        id="ud-hist-heatmap">${heatmapPanelHtml}</div>`;

    $page.find('#ud-hist-content').html(contentHtml);

    /* ── Draw charts ── */

    // ── Panel 1: Stacked count ────────────────────────────────────────────────
    mkChart('ud-hist-yoy-stacked', {
        type: 'bar',
        data: {
            labels: years,
            datasets: GRADES.map(g => ({
                label: GRADE_LABELS[g],
                data:  years.map(yr => (hd.combined[yr] || {})[g] || 0),
                backgroundColor: GRADE_COLORS[g],
                borderColor:     '#fff',
                borderWidth:     1,
                borderRadius:    3,
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true,
                     ticks: { stepSize: 1 },
                     title: { display: true, text: 'Employee Count' } }
            },
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // ── Panel 1: % stacked ────────────────────────────────────────────────────
    mkChart('ud-hist-yoy-pct', {
        type: 'bar',
        data: {
            labels: years,
            datasets: GRADES.map(g => ({
                label: GRADE_LABELS[g],
                data: years.map(yr => {
                    let bkt = hd.combined[yr] || {};
                    return bkt.total ? Math.round(((bkt[g]||0)/bkt.total)*100) : 0;
                }),
                backgroundColor: GRADE_COLORS[g],
                borderColor:     '#fff',
                borderWidth:     1,
                borderRadius:    3,
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true, max: 100,
                     ticks: { callback: v => v + '%' },
                     title: { display: true, text: 'Percentage (%)' } }
            },
            plugins: {
            legend: { position: 'bottom' },
            datalabels: {
                display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
                color: '#fff',
                font: { weight: 'bold', size: 11 },
                formatter: value => value + '%'
            }
        }
        }
    });

    // ── Panel 3: Combined trend ───────────────────────────────────────────────
    mkChart('ud-hist-trend-comb', {
        type: 'line',
        data: {
            labels: years,
            datasets: [{
                label: 'Combined Avg Score',
                data:  years.map(yr => hd.trend.combined[yr] || null),
                borderColor:     '#C8102E',
                backgroundColor: 'rgba(200,16,46,.08)',
                pointRadius: 6, pointBackgroundColor: '#C8102E',
                tension: .35, fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { min: 1, max: 5,
                     ticks: { callback: v => (['','E','D','C','B','A'][v] || v) + ' (' + v + ')' } }
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: c => `Avg: ${c.raw} (${(['','E','D','C','B','A'][Math.round(c.raw)] || '')} band)` } }
            }
        }
    });

    // ── Panel 3: Per-unit trend ───────────────────────────────────────────────
    let unitColors = ['#C8102E','#0f1f3d','#00796b','#7b1fa2','#e65100','#1565c0',
                      '#2e7d32','#ad1457','#f57f17','#37474f'];
    mkChart('ud-hist-trend-unit', {
        type: 'line',
        data: {
            labels: years,
            datasets: units.map((u, idx) => ({
                label: u,
                data:  years.map(yr => (hd.trend.by_unit[u] || {})[yr] || null),
                borderColor:     unitColors[idx % unitColors.length],
                backgroundColor: 'transparent',
                pointRadius: 5,
                pointBackgroundColor: unitColors[idx % unitColors.length],
                tension: .35,
                borderWidth: 2
            }))
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { min: 1, max: 5,
                     ticks: { callback: v => ['','E','D','C','B','A'][v] || v } }
            },
            plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 10 } } }
        }
    });

    /* ── Panel 2: Unit comparison for selected year ── */
    function renderUnitComp(yr) {
        // Grouped bar: each unit = group, each grade = bar
        let unitDatasets = GRADES.map(g => ({
            label: GRADE_LABELS[g],
            data:  units.map(u => ((hd.by_unit[u] || {})[yr] || {})[g] || 0),
            backgroundColor: GRADE_COLORS[g],
            borderColor:     '#fff',
            borderWidth: 1,
            borderRadius: 3,
        }));

        mkChart('ud-hist-unit-comp', {
    type: 'bar',
    data: { labels: units, datasets: unitDatasets },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { top: 24 }   // ← moved out of options.plugins (wrong location)
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 } }
            },
            y: {
                beginAtZero: true,
                ticks: { stepSize: 1 },
                title: { display: true, text: 'Employee Count' },
                grace: '15%'   // ← adds headroom above tallest bar for label
            }
        },
        plugins: {
            legend: { position: 'bottom' }
        }
    }
});   // ← removed the `true` argument, not needed here;

        // Build comparison table for selected year
        let tblRows = units.map(u => {
            let bkt = (hd.by_unit[u] || {})[yr] || {};
            let tot = bkt.total || 0;
            let avg = (hd.trend.by_unit[u] || {})[yr];
            let topP = tot ? Math.round(((bkt.A||0)+(bkt.B||0))/tot*100) : 0;
            let lowP = tot ? Math.round(((bkt.D||0)+(bkt.E||0))/tot*100) : 0;
            let gradeCells = GRADES.map(g => {
                let n = bkt[g] || 0;
                let p = tot ? Math.round(n/tot*100) : 0;
                let bg = p >= 30 ? GRADE_COLORS[g] : p >= 10 ? GRADE_COLORS[g]+'55' : 'transparent';
                let fc = p >= 30 ? '#fff' : '#333';
                return `<td style="background:${bg};color:${fc};text-align:center;
                    -webkit-print-color-adjust:exact;print-color-adjust:exact;
                    padding:7px 10px;border-bottom:1px solid #e9ecef;">
                    ${n}<span style="font-size:9px;opacity:.7;"> (${p}%)</span></td>`;
            }).join('');
            return `<tr>
                <td style="font-weight:700;padding:7px 10px;border-bottom:1px solid #e9ecef;">${u}</td>
                ${gradeCells}
                <td style="text-align:center;padding:7px 10px;border-bottom:1px solid #e9ecef;">${tot}</td>
                <td style="text-align:center;font-weight:700;color:#0f1f3d;padding:7px 10px;border-bottom:1px solid #e9ecef;">
                    ${avg != null ? avg.toFixed(2) : '—'}
                </td>
                <td style="text-align:center;padding:7px 10px;border-bottom:1px solid #e9ecef;">
                    <span class="ud-badge ud-badge-blue">${topP}%</span>
                </td>
                <td style="text-align:center;padding:7px 10px;border-bottom:1px solid #e9ecef;">
                    <span class="ud-badge ud-badge-red">${lowP}%</span>
                </td>
            </tr>`;
        }).join('');

        $page.find('#ud-unit-comp-table').html(`
            <table class="ud-hist-heat" style="margin-top:12px;">
                <thead><tr>
                    <th style="text-align:left;">Unit</th>
                    ${GRADES.map(g=>`<th style="background:${GRADE_COLORS[g]};">${g}</th>`).join('')}
                    <th>Total</th><th>Avg Score</th><th>Top % (A+B)</th><th>Low % (D+E)</th>
                </tr></thead>
                <tbody>${tblRows}</tbody>
            </table>`);
    }

    // Initial render for latest year
    renderUnitComp(latestYear);

    // Year pill click handler (Panel 2)
    $page.find('#ud-yr-pills-comp').on('click', '.ud-yr-pill', function() {
        $page.find('#ud-yr-pills-comp .ud-yr-pill').removeClass('active');
        $(this).addClass('active');
        renderUnitComp($(this).data('yr'));
    });

    /* ── Historical tab switcher ─────────────────────────────────────────────*/
    let histTabActiveClass = {
        yoy:     'ht-active-yoy',
        unit:    'ht-active-unit',
        trend:   'ht-active-trend',
        heatmap: 'ht-active-heatmap',
    };

    $page.find('.ud-hist-tabs').on('click', '.ud-hist-tab', function() {
        let chosen = $(this).data('hist');

        // Reset all tab styles
        $page.find('.ud-hist-tab').each(function() {
            $(this).removeClass(Object.values(histTabActiveClass).join(' '));
        });
        $(this).addClass(histTabActiveClass[chosen] || '');

        // Show/hide panels
        $page.find('.ud-hist-panel').removeClass('active');
        $page.find('#ud-hist-' + chosen).addClass('active');

        // Re-render trend charts when switching to trend panel
        // (canvas may have been hidden on first render)
        if (chosen === 'trend') {
            setTimeout(() => {
                mkChart('ud-hist-trend-comb', {
                    type: 'line',
                    data: {
                        labels: years,
                        datasets: [{
                            label: 'Combined Avg Score',
                            data:  years.map(yr => hd.trend.combined[yr] || null),
                             borderColor:'#7b1fa2 ', backgroundColor:'rgba(200,16,46,.08)',
                            pointRadius:6, pointBackgroundColor:'#7b1fa2 ', tension:.35, fill:true
                        }]
                    },
                    options: {
                        responsive:true, maintainAspectRatio:false,
                        scales: { y:{ min:1, max:5, ticks:{ callback: v => (['','E','D','C','B','A'][v]||v) } } },
                        plugins: { legend:{ position:'bottom' } }
                    }
                });
                mkChart('ud-hist-trend-unit', {
                    type: 'line',
                    data: {
                        labels: years,
                        datasets: units.map((u, idx) => ({
                            label: u,
                            data: years.map(yr => (hd.trend.by_unit[u]||{})[yr]||null),
                            borderColor: unitColors[idx % unitColors.length],
                            backgroundColor:'transparent',
                            pointRadius:5, pointBackgroundColor: unitColors[idx % unitColors.length],
                            tension:.35, borderWidth:2
                        }))
                    },
                    options: {
                        responsive:true, maintainAspectRatio:false,
                        scales:{ y:{ min:1, max:5, ticks:{ callback: v => ['','E','D','C','B','A'][v]||v } } },
                        plugins:{ legend:{ position:'bottom', labels:{ font:{ size:10 }, padding:10 } } }
                    }
                });
            }, 100);
        }
    });

}




$('head').append(`<style id="ud-succ-styles">
 
/* ── Succession section wrapper ── */
.ud-succ-wrap * { box-sizing:border-box; font-family:'Inter',sans-serif; }
 
/* ── Pipeline swimlanes ── */
.ud-pipeline {
    display:grid; grid-template-columns:repeat(4,1fr);
    gap:10px; margin-bottom:18px;
}
.ud-lane {
    border-radius:10px; border:1.5px solid #dee2e6;
    background:#fff; overflow:hidden;
}
.ud-lane-header {
    padding:10px 12px; font-size:11px; font-weight:700;
    letter-spacing:.5px; text-transform:uppercase;
    display:flex; align-items:center; justify-content:space-between;
}
.ud-lane-body { padding:8px 10px; display:flex; flex-direction:column; gap:6px; min-height:60px; }
 
/* lane colour variants */
.ud-lane-hipo   .ud-lane-header { background:#28a745; color:#fff; }
.ud-lane-strong .ud-lane-header { background:#AED581; color:#fff; }
.ud-lane-solid  .ud-lane-header { background:#ffc107; color:#fff; }
.ud-lane-risk   .ud-lane-header { background:#C8102E; color:#fff; }
 
/* ── Employee cards inside lanes ── */
.ud-emp-card {
    background:#f8f9fa; border-radius:7px; padding:7px 10px;
    border-left:3px solid #dee2e6; cursor:pointer; transition:background .15s;
    font-size:11px;
}
.ud-emp-card:hover { background:#fce8ec; }
.ud-emp-card.hipo   { border-left-color:#28a745; }
.ud-emp-card.strong { border-left-color:#AED581; }
.ud-emp-card.solid  { border-left-color:#ffc107; }
.ud-emp-card.risk   { border-left-color:#C8102E; }
.ud-emp-card .ec-name { font-weight:700; color:#0f1f3d; font-size:12px; }
.ud-emp-card .ec-meta { color:#868e96; font-size:10px; margin-top:1px; }
.ud-emp-card .ec-score {
    font-size:13px; font-weight:700; float:right; margin-top:-18px;
}
.hipo   .ec-score { color:#28a745; }
.strong .ec-score { color:#AED581; }
.solid  .ec-score { color:#ffc107; }
.risk   .ec-score { color:#C8102E; }
 
/* ── Readiness gauge row ── */
.ud-readiness-row {
    display:grid; grid-template-columns:repeat(3,1fr);
    gap:10px; margin-bottom:18px;
}
.ud-readiness-card {
    background:#fff; border-radius:10px; padding:14px 16px;
    box-shadow:0 2px 8px rgba(0,0,0,.06);
    border-top:3px solid #dee2e6;
}
.ud-readiness-card.rc-blue   { border-top-color:#0f1f3d; }
.ud-readiness-card.rc-gold   { border-top-color:#28a745; }
.ud-readiness-card.rc-red    { border-top-color:#C8102E; }
.ud-gauge-val { font-size:28px; font-weight:700; color:#0f1f3d; }
.ud-gauge-lbl { font-size:10px; font-weight:600; color:#868e96; text-transform:uppercase; letter-spacing:1px; margin-top:3px; }
.ud-gauge-sub { font-size:11px; color:#495057; margin-top:6px; }
 
/* ── Critical role table ── */
.ud-role-tbl { width:100%; border-collapse:collapse; font-size:12px; }
.ud-role-tbl th {
    background:#0f1f3d; color:#fff; padding:9px 12px;
    text-align:left; font-size:11px; letter-spacing:.4px;
}
.ud-role-tbl td { padding:9px 12px; border-bottom:1px solid #e9ecef; }
.ud-role-tbl tr:nth-child(odd)  td { background:#f8f9fa; }
.ud-role-tbl tr:nth-child(even) td { background:#fff; }
.ud-role-tbl tr:hover td { background:#fce8ec; }
 
/* ── Readiness pill ── */
.ud-ready-pill {
    display:inline-flex; align-items:center; gap:4px;
    padding:2px 10px; border-radius:20px; font-size:10px; font-weight:700;
}
.urp-now    { background:rgba(40,167,69,.12); color:#AED581; }
.urp-1yr    {  background: rgba(40, 40, 40, 0.85);  color:#FFEE58; }
.urp-2yr    { background:rgba(255,193,7,.15); color:#ffc107; }
.urp-none   { background:rgba(200,16,46,.10); color:#C8102E; }
 
/* ── 9-Box grid ── */
.ud-9box {
    display:grid; grid-template-columns:repeat(3,1fr);
    grid-template-rows:repeat(3,1fr);
    gap:6px; margin-bottom:4px;
}
.ud-9box-cell {
    border-radius:8px; padding:10px 8px; min-height:90px;
    position:relative; overflow:hidden;
}
.ud-9box-cell .cell-label {
    font-size:9px; font-weight:700; text-transform:uppercase;
    letter-spacing:.4px; margin-bottom:6px; opacity:.8;
}
.ud-9box-cell .cell-names {
    font-size:10px; font-weight:600; line-height:1.6;
}
.ud-9box-cell .cell-count {
    position:absolute; top:8px; right:8px;
    font-size:16px; font-weight:700; opacity:.35;
}
 
/* 9-box colour matrix (row = performance, col = potential) */
.box-11 { background:#fce8ec; color:#7f0718; }  /* low perf, low pot  – "Mis-fit"     */
.box-12 { background:#fff3cd; color:#7a4f00; }  /* low perf, med pot  – "Under-perf"  */
.box-13 { background:#e8f5e9; color:#1b5e20; }  /* low perf, hi pot   – "Enigma"      */
.box-21 { background:#fce8ec; color:#7f0718; }  /* med perf, low pot  – "Effective"   */
.box-22 { background:#fff3cd; color:#7a4f00; }  /* med perf, med pot  – "Core"        */
.box-23 { background:#e3f2fd; color:#0d3c6e; }  /* med perf, hi pot   – "High Pot"    */
.box-31 { background:#fff3cd; color:#7a4f00; }  /* hi perf, low pot   – "Specialist"  */
.box-32 { background:#e8f5e9; color:#1b5e20; }  /* hi perf, med pot   – "High Perf"   */
.box-33 { background:#0f1f3d; color:#fff; }     /* hi perf, hi pot    – "Star"        */
 
/* ── Succession tab bar ── */
.ud-succ-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.ud-succ-tab {
    padding:6px 16px; border-radius:20px; font-size:11px; font-weight:700;
    cursor:pointer; border:2px solid #dee2e6; background:#fff;
    color:#495057; transition:all .2s; white-space:nowrap;
}
.ud-succ-tab:hover { border-color:#C8102E; color:#C8102E; }
.ud-succ-tab.st-pipeline { background:#0f1f3d; border-color:#0f1f3d; color:#fff; }
.ud-succ-tab.st-roles    { background:#C8102E; border-color:#C8102E; color:#fff; }
.ud-succ-tab.st-9box     { background:#00796b; border-color:#00796b; color:#fff; }
.ud-succ-tab.st-gaps     { background:#7b1fa2; border-color:#7b1fa2; color:#fff; }
 
.ud-succ-panel { display:none; }
.ud-succ-panel.active { display:block; }
 
/* ── Depth-of-bench bar ── */
.ud-bench-bar { display:flex; border-radius:6px; overflow:hidden; height:12px; margin:6px 0 3px; }
.ud-bench-seg { height:100%; transition:width .4s; }
 
/* ── Risk matrix (gap analysis) ── */
.ud-gap-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:12px; }
.ud-gap-card {
    border-radius:8px; padding:12px 14px; border-left:3px solid #dee2e6;
    background:#fff; box-shadow:0 1px 4px rgba(0,0,0,.05);
}
.ud-gap-card.gc-critical { border-left-color:#C8102E; background:#fff8f8; }
.ud-gap-card.gc-watch    { border-left-color:#ffc107; background:#fffdf0; }
.ud-gap-card.gc-ok       { border-left-color:#28a745; background:#f5fbf6; }
.ud-gap-title { font-size:11px; font-weight:700; color:#0f1f3d; margin-bottom:4px; }
.ud-gap-body  { font-size:11px; color:#495057; line-height:1.6; }
 
/* ── Chart wrap inside succession ── */
.ud-succ-chart { position:relative; width:100%; }
 
@media (max-width:768px) {
    .ud-pipeline      { grid-template-columns:1fr 1fr; }
    .ud-readiness-row { grid-template-columns:1fr; }
    .ud-gap-grid      { grid-template-columns:1fr; }
}
 
@media print {
    .ud-succ-panel { display:block !important; }
    .ud-succ-tabs  { display:none !important; }
    .ud-pipeline   { grid-template-columns:repeat(4,1fr) !important; page-break-inside:avoid !important; }
    .ud-9box       { page-break-inside:avoid !important; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
}
</style>`);


function render_succession_readiness(data) {
 
    /* ── helpers ── */
    const fScore = d => parseFloat(d.total_score) || 0;
    const fSelf  = d => parseFloat(d.custom_total_self_score) || 0;
    const isCompleted = d => ['Approved','Accepted'].includes(d.workflow_state);
    const isOverdue   = d => d.custom_appraisal_status === 'Overdue';
 
    /* ── score tier ── */
    function scoreTier(s) {
        if (s >= 4.0) return 'hipo';
        if (s >= 3.5) return 'strong';
        if (s >= 2.5) return 'solid';
        return 'risk';
    }
    const TIER_LABELS = { hipo:'HiPo ≥ 4.0', strong:'Strong 3.5–4.0', solid:'Solid 2.5–3.5', risk:'At Risk < 2.5' };
    const TIER_COLORS = { hipo:'#f4a100', strong:'#1565c0', solid:'#00796b', risk:'#C8102E' };
 
    /* ── potential proxy: self-assessor delta + grade band ──
       Higher potential = assessor score closer to / above self score + senior grade */
    const SENIOR_KEYWORDS = ['senior','lead','head','manager','director','vp','chief','supervisor','sr'];
    function isSeniorGrade(g) {
        if (!g) return false;
        let gl = g.toLowerCase();
        return SENIOR_KEYWORDS.some(k => gl.includes(k)) || gl.startsWith('s') || gl.startsWith('l');
    }
    function potentialBand(d) {
        let s = fScore(d), sl = fSelf(d);
        let delta = s - sl;  // positive = assessor rated higher than self → higher potential signal
        let senior = isSeniorGrade(d.custom_grade);
        let pts = 0;
        if (s >= 4.0)        pts += 2;
        else if (s >= 3.0)   pts += 1;
        if (delta >= 0.5)    pts += 2;
        else if (delta >= 0) pts += 1;
        if (senior)          pts += 1;
        if (pts >= 4) return 'high';
        if (pts >= 2) return 'medium';
        return 'low';
    }
    function performanceBand(d) {
        let s = fScore(d);
        if (s >= 3.5) return 'high';
        if (s >= 2.5) return 'medium';
        return 'low';
    }
 
    /* ── readiness derivation for a single employee ──
       Ready Now   = HiPo + completed
       Ready 1yr   = Strong + completed, OR HiPo + incomplete
       Ready 2yr   = Solid  + completed
       No successor= At Risk, OR incomplete + not strong/hipo */
    function readiness(d) {
        let t = scoreTier(fScore(d));
        let done = isCompleted(d);
        if (t === 'hipo'   &&  done) return 'now';
        if (t === 'strong' &&  done) return '1yr';
        if (t === 'hipo'   && !done) return '1yr';
        if (t === 'solid'  &&  done) return '2yr';
        return 'none';
    }
 
    /* ── scored employees only ── */
    let scored = data.filter(d => fScore(d) > 0);
 
    /* ── tier buckets ── */
    let tiered = { hipo:[], strong:[], solid:[], risk:[] };
    scored.forEach(d => tiered[scoreTier(fScore(d))].push(d));
 
    /* ── summary KPIs ── */
    let hipoCount    = tiered.hipo.length;
    let succReady    = tiered.hipo.filter(d => isCompleted(d)).length;
    let critGap      = data.filter(d => isOverdue(d) || (!isCompleted(d) && fScore(d) === 0)).length;
    let benchDepth   = scored.length ? Math.round((hipoCount + tiered.strong.length) / scored.length * 100) : 0;
    let retentionIdx = Math.max(0, 100 - Math.round(critGap / Math.max(data.length, 1) * 100));
 
    $page.find('#ud-succ-kpi-row').html(`
        <div class="ud-readiness-card rc-gold">
            <div class="ud-gauge-val" style="color:#28a745;">${hipoCount}</div>
            <div class="ud-gauge-lbl">HiPo Employees (≥ 4.0)</div>
            <div class="ud-gauge-sub">${succReady} ready now · ${hipoCount - succReady} pending</div>
        </div>
        
        <div class="ud-readiness-card rc-red">
            <div class="ud-gauge-val" style="color:#C8102E;">${critGap}</div>
            <div class="ud-gauge-lbl">Succession Gaps</div>
            <div class="ud-gauge-sub">Overdue or unscored appraisals</div>
        </div>
    `);
 
    /* ═════════════════════════════════════════════════════════════════════
       PANEL 1 — HiPo Pipeline (swimlanes)
    ═════════════════════════════════════════════════════════════════════ */
    const LANE_CFG = [
        { key:'hipo',   cls:'ud-lane-hipo',   icon:'🌟', label:'HiPo', sub:'≥ 4.0' },
        { key:'strong', cls:'ud-lane-strong',  icon:'💪', label:'Strong', sub:'3.5 – 3.99' },
        { key:'solid',  cls:'ud-lane-solid',   icon:'✅', label:'Solid', sub:'2.5 – 3.49' },
        { key:'risk',   cls:'ud-lane-risk',    icon:'🔴', label:'At Risk', sub:'< 2.5' },
    ];
 
    let laneHtml = LANE_CFG.map(cfg => {
        let employees = tiered[cfg.key];
        let cards = employees.map(d => `
            <div class="ud-emp-card ${cfg.key}"
                 onclick="frappe.set_route('Form','Appraisal','${d.name}')">
                <span class="ec-score">${fScore(d).toFixed(2)}</span>
                <div class="ec-name">${d.employee_name || d.employee}</div>
                <div class="ec-meta">${d.custom_grade || '—'} · ${d.custom_unit || '—'}</div>
            </div>`).join('') || `<div style="font-size:11px;color:#adb5bd;padding:4px 0;">No employees</div>`;
 
        return `
            <div class="ud-lane ${cfg.cls}">
                <div class="ud-lane-header">
                    <span>${cfg.icon} ${cfg.label}</span>
                    <span style="font-size:14px;">${employees.length}</span>
                </div>
                <div style="font-size:9px;padding:3px 12px 0;opacity:.7;">${cfg.sub}</div>
                <div class="ud-lane-body">${cards}</div>
            </div>`;
    }).join('');
    $page.find('#ud-succ-pipeline').html(laneHtml);
 
    /* depth-of-bench bars by unit */
    let unitBenchMap = {};
    scored.forEach(d => {
        let u = d.custom_unit || 'Unknown';
        if (!unitBenchMap[u]) unitBenchMap[u] = { hipo:0, strong:0, solid:0, risk:0, total:0 };
        unitBenchMap[u][scoreTier(fScore(d))]++;
        unitBenchMap[u].total++;
    });
 
    let benchHtml = Object.keys(unitBenchMap).sort().map(u => {
        let b = unitBenchMap[u];
        let pct = n => b.total ? Math.round(n/b.total*100) : 0;
        let ph = pct(b.hipo), ps = pct(b.strong), pso = pct(b.solid), pr = pct(b.risk);
        return `
        <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:3px;">
                <span style="font-weight:700;">${u}</span>
                <span style="color:#868e96;font-size:10px;">
                    ${b.total} scored · HiPo: ${b.hipo} · At Risk: ${b.risk}
                </span>
            </div>
            <div class="ud-bench-bar">
                <div class="ud-bench-seg" style="width:${ph}%;background:#28a745;" title="HiPo ${ph}%"></div>
                <div class="ud-bench-seg" style="width:${ps}%;background:#AED581;" title="Strong ${ps}%"></div>
                <div class="ud-bench-seg" style="width:${pso}%;background:#ffc107;" title="Solid ${pso}%"></div>
                <div class="ud-bench-seg" style="width:${pr}%;background:#C8102E;" title="At Risk ${pr}%"></div>
            </div>
            <div style="font-size:9px;color:#868e96;display:flex;gap:10px;margin-top:2px;">
                <span><span style="color:#28a745;">●</span> HiPo ${ph}%</span>
                <span><span style="color:#AED581;">●</span> Strong ${ps}%</span>
                <span><span style="color:#ffc107;">●</span> Solid ${pso}%</span>
                <span><span style="color:#C8102E;">●</span> At Risk ${pr}%</span>
            </div>
        </div>`;
    }).join('');
    $page.find('#ud-bench-overview').html(benchHtml || '<div style="color:#adb5bd;font-size:12px;">No scored data.</div>');
 
    /* ═════════════════════════════════════════════════════════════════════
       PANEL 2 — Critical Role Readiness (by appraisal_template)
    ═════════════════════════════════════════════════════════════════════ */
    let roleMap = {};
    data.forEach(d => {
        let role = d.appraisal_template || 'Unknown Template';
        let u    = d.custom_unit || 'Unknown';
        let key  = role + '::' + u;
        if (!roleMap[key]) roleMap[key] = { role, unit:u, employees:[] };
        roleMap[key].employees.push(d);
    });
 
    let roleRows = Object.values(roleMap).sort((a,b) => a.role.localeCompare(b.role)).map(rm => {
        let emps = rm.employees;
        let total = emps.length;
        let hipoC = emps.filter(d => scoreTier(fScore(d)) === 'hipo').length;
        let rNow  = emps.filter(d => readiness(d) === 'now').length;
        let r1yr  = emps.filter(d => readiness(d) === '1yr').length;
        let r2yr  = emps.filter(d => readiness(d) === '2yr').length;
        let rNone = emps.filter(d => readiness(d) === 'none').length;
        let totalSucc = rNow + r1yr + r2yr;
        let depthPct  = total ? Math.round(totalSucc/total*100) : 0;
        let risk = depthPct < 20 ? 'critical' : depthPct < 50 ? 'watch' : 'ok';
        let riskChipHtml = risk === 'critical'
            ? `<span class="ud-risk-chip ud-risk-h">Critical</span>`
            : risk === 'watch'
                ? `<span class="ud-risk-chip ud-risk-m">Watch</span>`
                : `<span class="ud-risk-chip ud-risk-l">Covered</span>`;
 
        let depthBarW = Math.min(depthPct, 100);
        let depthColor = depthPct >= 50 ? '#28a745' : depthPct >= 20 ? '#ffc107' : '#C8102E';
 
        return `<tr>
            <td style="font-weight:700;">${rm.role}</td>
            <td>${rm.unit}</td>
            <td style="text-align:center;">${total}</td>
            <td style="text-align:center;font-weight:700;color:#28a745;">${hipoC}</td>
            <td style="text-align:center;">
                <span class="ud-ready-pill urp-now">${rNow}</span>
            </td>
            <td style="text-align:center;">
                <span class="ud-ready-pill urp-1yr">${r1yr}</span>
            </td>
            <td style="text-align:center;">
                <span class="ud-ready-pill urp-2yr">${r2yr}</span>
            </td>
            <td style="text-align:center;">
                <span class="ud-ready-pill urp-none">${rNone}</span>
            </td>
            
        </tr>`;
    }).join('') || `<tr><td colspan="10" style="text-align:center;padding:20px;color:#adb5bd;">No role data available</td></tr>`;
 
    $page.find('#ud-role-tbody').html(roleRows);
 
    /* ═════════════════════════════════════════════════════════════════════
       PANEL 3 — 9-Box Grid
    ═════════════════════════════════════════════════════════════════════ */
    /*
     Grid layout (col=potential low→high, row=performance high→low for visual):
       [row3,col1] [row3,col2] [row3,col3]  ← high performance
       [row2,col1] [row2,col2] [row2,col3]
       [row1,col1] [row1,col2] [row1,col3]  ← low performance
 
     CSS classes: box-{perf_row}{pot_col}  e.g. box-33 = hi perf + hi pot = Star
    */
    const PERF_BANDS  = ['high','medium','low'];
    const POT_BANDS   = ['low','medium','high'];
    const CELL_LABELS = {
        '31':'Specialist','32':'High Performer','33':'Star',
        '21':'Effective','22':'Core Performer','23':'High Potential',
        '11':'Mis-fit','12':'Under-performer','13':'Enigma',
    };
 
    let boxMap = {};
    scored.forEach(d => {
        let pf = performanceBand(d);
        let pt = potentialBand(d);
        let pfNum = pf === 'high' ? 3 : pf === 'medium' ? 2 : 1;
        let ptNum = pt === 'low'  ? 1 : pt === 'medium'  ? 2 : 3;
        let key = `${pfNum}${ptNum}`;
        if (!boxMap[key]) boxMap[key] = [];
        boxMap[key].push(d);
    });
 
    let gridCells = '';
    PERF_BANDS.forEach((pf, pfi) => {  // pfi 0=high,1=med,2=low displayed top→bottom
        let pfNum = 3 - pfi;           // convert to 3/2/1
        POT_BANDS.forEach((pt, pti) => {
            let ptNum = pti + 1;       // 1/2/3
            let key = `${pfNum}${ptNum}`;
            let employees = boxMap[key] || [];
            let names = employees.slice(0, 5).map(d => d.employee_name || d.employee).join('<br>');
            if (employees.length > 5) names += `<br>+${employees.length - 5} more`;
            gridCells += `
                <div class="ud-9box-cell box-${key}" data-box="${key}"
                     onclick="show9BoxDetail('${key}', ${JSON.stringify(employees.map(d=>d.name)).replace(/"/g,"'")})"
                     style="cursor:${employees.length ? 'pointer' : 'default'};">
                    <div class="cell-count">${employees.length}</div>
                    <div class="cell-label">${CELL_LABELS[key] || key}</div>
                    <div class="cell-names">${names || '<span style="opacity:.4;font-size:9px;">—</span>'}</div>
                </div>`;
        });
    });
    $page.find('#ud-9box-grid').html(gridCells);
 
    window.show9BoxDetail = function(key, names) {
        let employees = boxMap[key] || [];
        if (!employees.length) {
            $page.find('#ud-9box-detail').hide();
            return;
        }
        let rows = employees.map(d => `<tr>
            <td>${d.employee_name || d.employee}</td>
            <td>${d.employee || ''}</td>
            <td>${d.custom_grade || '—'}</td>
            <td>${d.custom_unit || '—'}</td>
            <td style="text-align:center;font-weight:700;color:#f4a100;">${fScore(d).toFixed(2)}</td>
            <td style="text-align:center;">${fSelf(d) ? fSelf(d).toFixed(2) : '—'}</td>
            <td style="text-align:center;">
                ${isCompleted(d)
                    ? '<span class="ud-badge ud-badge-green">Completed</span>'
                    : isOverdue(d)
                        ? '<span class="ud-badge ud-badge-red">Overdue</span>'
                        : '<span class="ud-badge ud-badge-orange">Pending</span>'}
            </td>
            <td>
                <button class="ud-perf-action ud-act-view"
                    onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
            </td>
        </tr>`).join('');
 
        $page.find('#ud-9box-detail').html(`
            <div style="font-size:12px;font-weight:700;color:#0f1f3d;margin-bottom:8px;">
                📋 ${CELL_LABELS[key] || key} — ${employees.length} employees
            </div>
            <table class="ud-table" style="font-size:11px;">
                <thead><tr>
                    <th>Name</th><th>Employee ID</th><th>Grade</th><th>Unit</th>
                    <th style="text-align:center;">Score</th>
                    <th style="text-align:center;">Self Score</th>
                    <th>Status</th><th>Action</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>`).show();
    };
 
    /* ═════════════════════════════════════════════════════════════════════
       PANEL 4 — Gap Analysis
    ═════════════════════════════════════════════════════════════════════ */
 
    /* derive gaps */
    let unscored      = data.filter(d => !fScore(d));
    let overdueHiPo   = tiered.hipo.filter(d => isOverdue(d));
    let noSuccessor   = Object.values(roleMap).filter(rm => {
        return rm.employees.filter(d => readiness(d) === 'now' || readiness(d) === '1yr').length === 0;
    });
    let singlePoint   = Object.values(roleMap).filter(rm => {
        let highs = rm.employees.filter(d => scoreTier(fScore(d)) === 'hipo' || scoreTier(fScore(d)) === 'strong');
        return highs.length === 1;
    });
 
    let gaps = [
        {
            cls: critGap > 0 ? 'gc-critical' : 'gc-ok',
            icon: critGap > 0 ? '🚨' : '✅',
            title: 'Appraisal Gaps (Overdue / Unscored)',
            body: critGap > 0
                ? `${critGap} employee(s) have overdue or incomplete appraisals — succession signals are incomplete for these records.`
                : 'All employees have current appraisal data. No appraisal gaps detected.'
        },
        {
            cls: overdueHiPo.length > 0 ? 'gc-critical' : 'gc-ok',
            icon: overdueHiPo.length > 0 ? '⚠' : '✅',
            title: 'HiPo Retention Alerts',
            body: overdueHiPo.length > 0
                ? `${overdueHiPo.length} HiPo employee(s) have overdue appraisals: ${overdueHiPo.slice(0,3).map(d=>d.employee_name||d.employee).join(', ')}${overdueHiPo.length>3?` and ${overdueHiPo.length-3} more`:''}.`
                : 'All HiPo employees have completed appraisals. Retention risk is low.'
        },
        {
            cls: noSuccessor.length > 0 ? 'gc-critical' : 'gc-ok',
            icon: noSuccessor.length > 0 ? '🔴' : '✅',
            title: 'Categories with No Ready Successor',
            body: noSuccessor.length > 0
                ? `${noSuccessor.length} category(s) have no employee ready within 1 year: ${noSuccessor.slice(0,3).map(r=>r.role).join(', ')}${noSuccessor.length>3?` and ${noSuccessor.length-3} more`:''}.`
                : 'All roles have at least one employee ready within 1 year.'
        },
        {
            cls: singlePoint.length > 0 ? 'gc-watch' : 'gc-ok',
            icon: singlePoint.length > 0 ? '⚠' : '✅',
            title: 'Single-Point-of-Failure Categories',
            body: singlePoint.length > 0
                ? `${singlePoint.length} category(s) depend on only one HiPo/Strong employee. Failure of that employee leaves the role uncovered: ${singlePoint.slice(0,3).map(r=>r.role).join(', ')}${singlePoint.length>3?` and ${singlePoint.length-3} more`:''}.`
                : 'No single-point-of-failure roles detected. Good succession depth across all templates.'
        },
    ];
 
    $page.find('#ud-gap-grid').html(gaps.map(g => `
        <div class="ud-gap-card ${g.cls}">
            <div class="ud-gap-title">${g.icon} ${g.title}</div>
            <div class="ud-gap-body">${g.body}</div>
        </div>`).join(''));
 
    /* distribution chart */
    let unitKeys = Object.keys(unitBenchMap).sort();
    destroyChart('ud-succ-dist-chart');
    let distEl = $page.find('#ud-succ-dist-chart')[0];
    if (distEl) {
        chartInstances['ud-succ-dist-chart'] = new Chart(distEl, {
            type: 'bar',
            data: {
                labels: unitKeys,
                datasets: [
                    { label:'HiPo',    data: unitKeys.map(u => unitBenchMap[u].hipo),   backgroundColor:'#28a745' },
                    { label:'Strong',  data: unitKeys.map(u => unitBenchMap[u].strong), backgroundColor:'#AED581' },
                    { label:'Solid',   data: unitKeys.map(u => unitBenchMap[u].solid),  backgroundColor:'#ffc107' },
                    { label:'At Risk', data: unitKeys.map(u => unitBenchMap[u].risk),   backgroundColor:'#C8102E' },
                ]
            },
            plugins: [dataLabelPlugin],
            options: {
                responsive:true, maintainAspectRatio:false,layout: { padding: { top: 20 } },
                scales: { x:{ stacked:true, grid:{display:false} }, y:{ stacked:true, beginAtZero:true } },
                plugins: { legend:{ position:'bottom', labels:{ font:{size:10} } } }
            }
        });
    }
 
    /* HiPo:Risk ratio chart */
    destroyChart('ud-succ-ratio-chart');
    let ratioEl = $page.find('#ud-succ-ratio-chart')[0];
    if (ratioEl) {
        chartInstances['ud-succ-ratio-chart'] = new Chart(ratioEl, {
            type: 'bar',
            data: {
                labels: unitKeys,
                datasets: [
                    { label:'HiPo + Strong', data: unitKeys.map(u => unitBenchMap[u].hipo + unitBenchMap[u].strong), backgroundColor:'#28a745' },
                    { label:'At Risk',       data: unitKeys.map(u => -unitBenchMap[u].risk), backgroundColor:'#C8102E' },
                ]
            },plugins: [dataLabelPlugin],
            options: {
                responsive: true, maintainAspectRatio: false,layout: { padding: { top: 20 } },
                scales: {
                    x: { grid:{display:false} },
                    y: {
                        beginAtZero: true,
                        ticks: { callback: v => Math.abs(v) }
                    }
                },
                plugins: {
                    legend:{ position:'bottom', labels:{ font:{size:10} } },
                    tooltip:{ callbacks:{ label: c => `${c.dataset.label}: ${Math.abs(c.raw)}` } }
                }
            }
        });
    }
 
    /* ── sub-tab switcher ── */
    const succTabActive = { pipeline:'st-pipeline', roles:'st-roles', gaps:'st-gaps' };
 
    $page.find('#ud-succ-tabs')
    .off('click', '.ud-succ-tab')
    .on('click', '.ud-succ-tab', function () {

        const chosen = $(this).data('succ');

        // Reset all tabs
        $page.find('.ud-succ-tab')
            .removeClass('active st-pipeline st-roles st-gaps');

        // Activate clicked tab
        $(this).addClass(`active ${succTabActive[chosen] || ''}`);

        // Hide all panels
        $page.find('.ud-succ-panel').removeClass('active');

        // Show selected panel
        $page.find(`#udsp-${chosen}`).addClass('active');
    });
 
}

$('head').append(`<style id="ud-ld-styles">
 
/* ── L&D wrapper ── */
.ud-ld-wrap * { box-sizing:border-box; font-family:'Inter',sans-serif; }
 
/* ── Tab bar ── */
.ud-ld-tabs { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; }
.ud-ld-tab {
    padding:6px 16px; border-radius:20px; font-size:11px; font-weight:700;
    cursor:pointer; border:2px solid #dee2e6; background:#fff;
    color:#495057; transition:all .2s; white-space:nowrap;
}
.ud-ld-tab:hover              { border-color:#C8102E; color:#C8102E; }
.ud-ld-tab.lt-gaps            { background:#C8102E;  border-color:#C8102E;  color:#fff; }
.ud-ld-tab.lt-recommendations { background:#0f1f3d;  border-color:#0f1f3d;  color:#fff; }
.ud-ld-tab.lt-completion      { background:#00796b;  border-color:#00796b;  color:#fff; }
.ud-ld-tab.lt-matrix          { background:#7b1fa2;  border-color:#7b1fa2;  color:#fff; }
 
.ud-ld-panel { display:none; }
.ud-ld-panel.active { display:block; }
 
/* ── KPI summary row (reuses ud-perf-kpi pattern) ── */
.ud-ld-kpi-row {
    display:grid; grid-template-columns:repeat(5,1fr);
    gap:10px; margin-bottom:16px;
}
.ud-ld-kpi {
    background:#fff; border-radius:8px; padding:12px 14px; text-align:center;
    border-top:3px solid #dee2e6; box-shadow:0 1px 6px rgba(0,0,0,.05);
}
.ud-ld-kpi.lk-red    { border-top-color:#C8102E; }  .ud-ld-kpi.lk-red    .lkv { color:#C8102E; }
.ud-ld-kpi.lk-navy   { border-top-color:#0f1f3d; }  .ud-ld-kpi.lk-navy   .lkv { color:#0f1f3d; }
.ud-ld-kpi.lk-green  { border-top-color:#28a745; }  .ud-ld-kpi.lk-green  .lkv { color:#28a745; }
.ud-ld-kpi.lk-gold   { border-top-color:#f4a100; }  .ud-ld-kpi.lk-gold   .lkv { color:#f4a100; }
.ud-ld-kpi.lk-purple { border-top-color:#7b1fa2; }  .ud-ld-kpi.lk-purple .lkv { color:#7b1fa2; }
.lkv { font-size:22px; font-weight:700; line-height:1.1; }
.lkl { font-size:10px; font-weight:600; color:#868e96; text-transform:uppercase; letter-spacing:1px; margin-top:3px; }
 
/* ── Skill-gap heat grid ── */
.ud-skill-grid {
    display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
    gap:10px; margin-bottom:16px;
}
.ud-skill-card {
    background:#fff; border-radius:8px; padding:12px 14px;
    box-shadow:0 1px 5px rgba(0,0,0,.07); border-left:3px solid #dee2e6;
    transition:transform .15s;
}
.ud-skill-card:hover { transform:translateY(-2px); }
.ud-skill-card.sc-critical { border-left-color:#C8102E; background:#fff8f8; }
.ud-skill-card.sc-moderate  { border-left-color:#ffc107; background:#fffdf0; }
.ud-skill-card.sc-low       { border-left-color:#28a745; background:#f5fbf6; }
.ud-skill-card .sc-kra  { font-size:12px; font-weight:700; color:#0f1f3d; margin-bottom:6px; }
.ud-skill-card .sc-bar  { display:flex; align-items:center; gap:6px; }
.ud-skill-card .sc-fill { height:6px; border-radius:3px; flex:1; background:#e9ecef; overflow:hidden; }
.ud-skill-card .sc-pct  { font-size:10px; font-weight:700; min-width:28px; }
.ud-skill-card .sc-gap  { font-size:10px; color:#868e96; margin-top:4px; }
 
/* ── Recommendation cards ── */
.ud-rec-grid {
    display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
    gap:12px; margin-bottom:14px;
}
.ud-rec-card {
    background:#fff; border-radius:10px; padding:14px 16px;
    box-shadow:0 2px 8px rgba(0,0,0,.07);
    border-top:3px solid #dee2e6; position:relative; overflow:hidden;
}
.ud-rec-card::before {
    content:''; position:absolute; top:0; right:0;
    width:60px; height:60px; border-radius:0 10px 0 60px;
    opacity:.06;
}
.ud-rec-card.rc-critical { border-top-color:#C8102E; } .ud-rec-card.rc-critical::before { background:#C8102E; }
.ud-rec-card.rc-dev      { border-top-color:#0f1f3d; } .ud-rec-card.rc-dev::before      { background:#0f1f3d; }
.ud-rec-card.rc-excel    { border-top-color:#f4a100; } .ud-rec-card.rc-excel::before    { background:#f4a100; }
.ud-rec-card.rc-soft     { border-top-color:#7b1fa2; } .ud-rec-card.rc-soft::before     { background:#7b1fa2; }
.ud-rec-card.rc-lead     { border-top-color:#1565c0; } .ud-rec-card.rc-lead::before     { background:#1565c0; }
 
.ud-rec-card .rc-icon    { font-size:22px; margin-bottom:6px; }
.ud-rec-card .rc-title   { font-size:13px; font-weight:700; color:#0f1f3d; margin-bottom:3px; }
.ud-rec-card .rc-kra     { font-size:11px; color:#C8102E; font-weight:600; margin-bottom:6px; }
.ud-rec-card .rc-desc    { font-size:11px; color:#495057; line-height:1.6; margin-bottom:8px; }
.ud-rec-card .rc-meta    { display:flex; gap:6px; flex-wrap:wrap; }
.ud-rec-card .rc-tag {
    font-size:9px; font-weight:700; padding:2px 8px; border-radius:10px;
    background:#e9ecef; color:#495057; letter-spacing:.3px;
}
.ud-rec-card .rc-count   { font-size:10px; color:#868e96; margin-top:6px; }
 
/* ── Completion linkage table ── */
.ud-comp-legend { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px; font-size:11px; }
.ud-cl-dot      { width:10px; height:10px; border-radius:50%; display:inline-block; margin-right:4px; }
 
/* ── Learning matrix (heatmap) ── */
.ud-matrix-tbl { width:100%; border-collapse:collapse; font-size:11px; }
.ud-matrix-tbl th {
    background:#0f1f3d; color:#fff; padding:8px 10px;
    font-size:10px; letter-spacing:.4px; text-align:center;
}
.ud-matrix-tbl td {
    padding:8px 10px; text-align:center;
    border-bottom:1px solid #e9ecef; font-weight:600;
}
.ud-matrix-tbl td:first-child { text-align:left; font-weight:700; }
.ud-matrix-tbl tr:hover td { background:#fce8ec; }
 
/* ── Priority badge ── */
.ud-pri-high   { font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; background:rgba(200,16,46,.12); color:#C8102E; }
.ud-pri-med    { font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; background:rgba(255,193,7,.15); color:#e6a800; }
.ud-pri-low    { font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px; background:rgba(40,167,69,.12); color:#28a745; }
 
@media (max-width:768px) {
    .ud-ld-kpi-row { grid-template-columns:repeat(2,1fr); }
    .ud-skill-grid { grid-template-columns:1fr 1fr; }
    .ud-rec-grid   { grid-template-columns:1fr; }
}
 
@media print {
    .ud-ld-panel    { display:block !important; }
    .ud-ld-tabs     { display:none !important; }
    .ud-skill-grid  { grid-template-columns:repeat(3,1fr) !important; }
    .ud-rec-grid    { grid-template-columns:repeat(2,1fr) !important; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
}
</style>`);


function render_ld_section(data, unit) {
 
    const fScore  = d => parseFloat(d.total_score) || 0;
    const isWorker = g => ['A1','A2','A3','A4'].includes(g || '');
    const scored  = data.filter(d => fScore(d) > 0);
    const total   = data.length;
 
    // ── Fetch competency/KRA detail scores ──────────────────────────────────
    let appraisalNames = data.map(d => d.name);
    if (!appraisalNames.length) {
        $page.find('#ud-ld-section .ud-section-body').html(
            '<div style="padding:20px;text-align:center;color:#adb5bd;">No appraisal data.</div>'
        );
        return;
    }
    

    // let selectedUnits = page.fields_dict.unit.get_value() || [];
    frappe.call({
        method: 'pms_ai.pms.page.unit_dashboard.unit_dashboard.get_goals_competency',
        args:   { appraisal_names: JSON.stringify(appraisalNames),
            // units: JSON.stringify(selectedUnits)  
        },
        callback: function(r) {
            let goalData = r.message || [];
            $page.find('#ud-ld-loading').hide();
 
            if (!goalData.length) {
                $page.find('#ud-ld-body').html(
                    '<div style="padding:20px;text-align:center;color:#adb5bd;">No KRA/competency data found for this selection.</div>'
                );
                return;
            }
 
            // ── Aggregate per KRA: avg self, avg assessor, count, unit ──────
            let kraAgg = {};
            goalData.forEach(row => {
                let name    = (row.kra         || 'Unknown').trim();
                let kraUnit = (row.custom_unit || 'Unknown').trim();
                let selfS   = parseFloat((row.custom_self_score_with_weighted)*10)     || 0;
                let asrS    = parseFloat(row.score) || 0;
                if (!kraAgg[name]) kraAgg[name] = { totalSelf:0, totalAssr:0, count:0, unit:kraUnit, employees:[] };
                kraAgg[name].totalSelf += selfS;
                kraAgg[name].totalAssr += asrS;
                kraAgg[name].count++;
                if (row.parent) kraAgg[name].employees.push(row.parent);
            });
 
            let kraNames   = Object.keys(kraAgg);
            let GAP_THRESH = 3.0;   // assessor avg below this = skill gap
            let TARGET     = 5.0;
 
            // ── Build gap list sorted by severity (lowest score first) ───────
            // let gapList = kraNames.map(n => {
            //     let a    = kraAgg[n];
            //     let avg  = a.count ? a.totalAssr / a.count : 0;
            //     let sAvg = a.count ? a.totalSelf / a.count : 0;
            //     let gap  = TARGET - avg;
            //     let pct  = Math.round((avg / TARGET) * 100);
            //     let sev  = avg <= 2.0 ? 'critical' : avg <= GAP_THRESH ? 'moderate' : 'low';
            //     return { name:n, avg, sAvg, gap:gap.toFixed(2), pct, sev, count:a.count, unit:a.unit,
            //              employees:[...new Set(a.employees)] };
            // }).sort((a,b) => a.avg - b.avg);
            const priorityKRAs = [
                "Safety",
                "Integrity",
                "Quality",
                "Simplicity",
                "Respect",
                "CONTINUOUS IMPROVEMENT"
            ];

            let gapList = kraNames.map(n => {
    let a    = kraAgg[n];
    let avg  = a.count ? a.totalAssr / a.count : 0;
    let sAvg = a.count ? a.totalSelf / a.count : 0;
    let gap  = TARGET - avg;
    let pct  = Math.round((avg / TARGET) * 100);
    let sev  = avg <= 2.0 ? 'critical' : avg <= GAP_THRESH ? 'moderate' : 'low';  // ← add back

    return {
        name: n,
        avg,
        sAvg,
        gap: gap.toFixed(2),
        pct,
        sev,                                          // ← add back
        count: a.count,
        employees: [...new Set(a.employees)],         // ← add back
    };
})
 
            let criticalGaps = gapList.filter(g => g.sev === 'critical').length;
            let moderateGaps = gapList.filter(g => g.sev === 'moderate').length;
            let lowGaps      = gapList.filter(g => g.sev === 'low').length;
 
            // Employees with any KRA below threshold
            let atRiskEmpSet = new Set();
            gapList.filter(g => g.sev !== 'low').forEach(g => g.employees.forEach(e => atRiskEmpSet.add(e)));
            let trainingNeeded = atRiskEmpSet.size;
 
            // ── Training completion proxy:
            //    "Completed" appraisals where total_score >= 3.0 = L&D effective
            //    "Completed" but score < 3.0  = completed but still below par
            //    Pending / overdue             = no L&D signal yet
            let completedAbove = data.filter(d => ['Approved','Accepted'].includes(d.workflow_state) && fScore(d) >= 3.0).length;
            let completedBelow = data.filter(d => ['Approved','Accepted'].includes(d.workflow_state) && fScore(d) > 0 && fScore(d) < 3.0).length;
            let pendingLD      = data.filter(d => !['Approved','Accepted'].includes(d.workflow_state)).length;
            let ldCompRate     = total ? Math.round((completedAbove / total) * 100) : 0;
 
            // ── Per-unit gap summary ─────────────────────────────────────────
            let unitGapMap = {};
            gapList.forEach(g => {
                // Each KRA row has a unit; but an employee can span many units
                // We derive unit gap from the data array
            });
            // Better: aggregate per unit from data
            let unitKraMap = {};
            goalData.forEach(row => {
                let u    = row.custom_unit || 'Unknown';
                let name = (row.kra || 'Unknown').trim();
                let asr  = parseFloat(row.custom_assessor_score) || 0;
                if (!unitKraMap[u]) unitKraMap[u] = {};
                if (!unitKraMap[u][name]) unitKraMap[u][name] = { total:0, sum:0 };
                unitKraMap[u][name].total++;
                unitKraMap[u][name].sum += asr;
            });
 
            // ── KPI HTML ─────────────────────────────────────────────────────
            let ldKpiHtml = `
            <div class="ud-ld-kpi-row">
                <div class="ud-ld-kpi lk-red">
                    <div class="lkv">${criticalGaps}</div>
                    <div class="lkl">Critical Skill Gaps</div>
                </div>
                <div class="ud-ld-kpi lk-gold">
                    <div class="lkv">${moderateGaps}</div>
                    <div class="lkl">Moderate Gaps</div>
                </div>
                <div class="ud-ld-kpi lk-green">
                    <div class="lkv">${lowGaps}</div>
                    <div class="lkl">On Track</div>
                </div>
                <div class="ud-ld-kpi lk-navy">
                    <div class="lkv">${trainingNeeded}</div>
                    <div class="lkl">Employees Need L&D</div>
                </div>
                <div class="ud-ld-kpi lk-purple">
                    <div class="lkv">${ldCompRate}%</div>
                    <div class="lkl">L&D Effectiveness Rate</div>
                </div>
            </div>`;
 
            // ── Tab nav ──────────────────────────────────────────────────────
            let ldTabsHtml = `
            <div class="ud-ld-tabs" id="ud-ld-tabs-inner">
                <div class="ud-ld-tab lt-gaps" data-ld="gaps">🔴 Skill Gaps (${criticalGaps + moderateGaps})</div>
                <div class="ud-ld-tab"         data-ld="completion">✅ Learning Completion Linkage</div>
                <div class="ud-ld-tab"         data-ld="matrix">🔥 Unit × Competency Matrix</div>
            </div>`;
 
            // ══════════════════════════════════════════════════════════════
            // PANEL 1 — SKILL GAPS
            // ══════════════════════════════════════════════════════════════
            let skillCards = gapList.map(g => {
                let fillColor = g.sev === 'critical' ? '#C8102E' : g.sev === 'moderate' ? '#ffc107' : '#28a745';
                let gapLabel  = g.sev === 'critical' ? '🔴 Critical' : g.sev === 'moderate' ? '🟡 Moderate' : '🟢 On Track';
                return `
                <div class="ud-skill-card sc-${g.sev}">
                    <div class="sc-kra">${g.name}</div>
                    <div class="sc-bar">
                        <div class="sc-fill">
                            <div style="height:100%;width:${g.pct}%;background:${fillColor};border-radius:3px;
                                -webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
                        </div>
                        <span class="sc-pct" style="color:${fillColor};">${g.pct}%</span>
                    </div>
                    <div class="sc-gap">
                        Avg Assessor: <strong>${g.avg.toFixed(2)}/5</strong> · Gap: <strong>${g.gap}</strong> · ${gapLabel}
                    </div>
                    <div style="font-size:9px;color:#adb5bd;margin-top:3px;">${g.count} employees evaluated</div>
                </div>`;
            }).join('');
 
            // ── Bar chart: top 10 gaps ────────────────────────────────────
            let top10 = [...gapList].sort((a,b) => a.avg - b.avg).slice(0, 10);
 
            // ── Gap table ────────────────────────────────────────────────
            let gapTableRows = gapList.map(g => {
                let delta = (g.sAvg - g.avg).toFixed(2);
                let deltaColor = parseFloat(delta) > 0 ? '#C8102E' : '#28a745';
                let deltaLabel = parseFloat(delta) > 0 ? `▲ ${delta} (self-inflated)` : `▼ ${Math.abs(delta)} (assessor higher)`;
                let priHtml = g.sev === 'critical'
                    ? `<span class="ud-pri-high">High Priority</span>`
                    : g.sev === 'moderate'
                        ? `<span class="ud-pri-med">Medium</span>`
                        : `<span class="ud-pri-low">Low</span>`;
                return `<tr>
                    <td style="font-weight:700;">${g.name}</td>
                    <td style="text-align:center;font-weight:700;color:#0f1f3d;">${g.sAvg.toFixed(2)}</td>
                    <td style="text-align:center;font-weight:700;color:#C8102E;">${g.avg.toFixed(2)}</td>
                    <td style="text-align:center;font-weight:700;color:${deltaColor};">${deltaLabel}</td>
                    <td style="text-align:center;font-weight:700;color:#C8102E;">${g.gap}</td>
                    <td style="text-align:center;">${g.count}</td>
                    <td style="text-align:center;">${priHtml}</td>
                </tr>`;
            }).join('');
 
            let gapsPanelHtml = `
            <div style="font-size:11px;color:#868e96;margin-bottom:12px;">
                Skill gap = Target (5.0) minus average assessor score per competency.
                Self-vs-assessor delta reveals blind spots.
                <strong style="color:#C8102E;">Critical: avg ≤ 2.0 · Moderate: 2.0–3.0 · On Track: > 3.0</strong>
            </div>

            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:10px;">📋 Competency Gap Register</div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Competency / KRA</th>
                        <th style="text-align:center;">Avg Self Score ${ud_thEye('Avg Self Score',
                            'Average score given by the employee themselves.',
                            'Avg Self Score = sum of all self ratings ÷ number of self assessments\n\nReflects how the employee perceives their own competency level.',
                            'e.g. Ratings: 3, 4, 4 → Avg = 3.67')}</th>
                        <th style="text-align:center;">Avg Assessor Score${ud_thEye('Avg Assessor Score',
                            'Average score given by managers or assessors.',
                            'Avg Assessor Score = sum of all assessor ratings ÷ number of assessments\n\nUsed as the primary benchmark for gap calculation.',
                            'e.g. Ratings: 2, 3, 3 → Avg = 2.67')}</th>
                        <th style="text-align:center;">Self-Assessor Delta${ud_thEye('Self-Assessor Delta',
                            'Difference between self score and assessor score.',
                            'Delta = Avg Self Score − Avg Assessor Score\n\nPositive (+) = overconfidence — employee rates themselves higher than assessors\nNegative (−) = underestimation — employee rates themselves lower than assessors\nNear zero = good calibration',
                            'e.g. Self 4.0 − Assessor 2.67 = +1.33 → overconfidence flag')}</th>
                        <th style="text-align:center;">Gap (to 5.0)${ud_thEye('Gap (to 5.0)',
                            'How far the avg assessor score is from the target of 5.0.',
                            'Gap = 5.0 − Avg Assessor Score\n\nBadge colour:\n  ≥ 3.0 → red    (Critical — urgent development needed)\n  ≥ 2.0 → yellow  (Moderate — development recommended)\n  < 2.0 → green  (On Track — performing near target)',
                            'e.g. 5.0 − 2.67 = 2.33 → yellow badge → moderate gap')}</th>
                        <th style="text-align:center;">Employees${ud_thEye('Employees',
                            'Number of employees assessed for this competency.',
                            'Count of distinct employees who have at least one assessor rating recorded for this KRA.',
                            'e.g. 12 employees → scores averaged across all 12')}</th>
                        <th style="text-align:center;">Priority${ud_thEye('Priority',
                            'Priority level based on gap size.',
                            'Priority rules:\n  Critical  → avg assessor score ≤ 2.0\n  Moderate  → avg assessor score 2.0–3.0\n  On Track  → avg assessor score > 3.0\n\nUse this to rank L&D interventions.',
                            'e.g. Avg assessor 2.67 → Moderate priority')}</th>
                    </tr></thead>
                    <tbody>${gapTableRows}</tbody>
                </table>
            </div>`;
 
            // ══════════════════════════════════════════════════════════════
            // PANEL 2 — TRAINING RECOMMENDATIONS
            // Auto-generated recommendations based on gap severity + grade mix
            // ══════════════════════════════════════════════════════════════
 
            // Map competency → training type
            const trainingMap = {
                'safety'         : { icon:'🦺', type:'rc-critical', mode:'On-site Workshop', duration:'2 days', cert:'Mandatory' },
                'quality'        : { icon:'🏅', type:'rc-dev',      mode:'Blended Learning', duration:'3 days', cert:'Recommended' },
                'leadership'     : { icon:'👔', type:'rc-lead',     mode:'Leadership Program', duration:'5 days', cert:'Certification' },
                'communication'  : { icon:'🗣',  type:'rc-soft',    mode:'E-learning + Workshop', duration:'1 day', cert:'Optional' },
                'technical'      : { icon:'⚙',  type:'rc-dev',     mode:'Technical Training', duration:'3–5 days', cert:'Required' },
                'compliance'     : { icon:'📜', type:'rc-critical', mode:'Compliance Training', duration:'1 day', cert:'Mandatory' },
                'productivity'   : { icon:'📈', type:'rc-dev',      mode:'Coaching Session', duration:'1 day', cert:'Optional' },
                'teamwork'       : { icon:'🤝', type:'rc-soft',     mode:'Team Workshop', duration:'1 day', cert:'Recommended' },
                'excel'          : { icon:'📊', type:'rc-excel',    mode:'E-Learning', duration:'Self-paced', cert:'Optional' },
                'default'        : { icon:'📚', type:'rc-dev',      mode:'Structured Training', duration:'2 days', cert:'Recommended' },
            };
 
            function getTrainingProfile(kraName) {
                let kl = kraName.toLowerCase();
                for (let key of Object.keys(trainingMap)) {
                    if (kl.includes(key)) return trainingMap[key];
                }
                return trainingMap['default'];
            }
 
            // Only recommend for critical + moderate
            let recGaps = gapList.filter(g => g.sev !== 'low');
 
            let recCardsHtml = recGaps.map(g => {
                let tp = getTrainingProfile(g.name);
                let priorityLabel = g.sev === 'critical'
                    ? `<span class="ud-pri-high">🔴 Immediate</span>`
                    : `<span class="ud-pri-med">🟡 Short-term</span>`;
                let affectedCount = g.employees.length;
                return `
                <div class="ud-rec-card ${tp.type}">
                    <div class="rc-icon">${tp.icon}</div>
                    <div class="rc-title">${g.name} Development Program</div>
                    <div class="rc-kra">Linked KRA: ${g.name} · Avg Score: ${g.avg.toFixed(2)}/5 · Gap: ${g.gap}</div>
                    <div class="rc-desc">
                        Assessor evaluation indicates below-target proficiency.
                        A structured <strong>${tp.mode}</strong> is recommended to close the ${g.gap}-point gap.
                    </div>
                    <div class="rc-meta">
                        <span class="rc-tag">⏱ ${tp.duration}</span>
                        <span class="rc-tag">📋 ${tp.cert}</span>
                        <span class="rc-tag">🎓 ${tp.mode}</span>
                        ${priorityLabel}
                    </div>
                    <div class="rc-count">👥 ${affectedCount} employee(s) affected</div>
                </div>`;
            }).join('') || `<div style="padding:20px;text-align:center;color:#adb5bd;">No training recommendations — all competencies are on track.</div>`;
 
            // Summary chart: recommendation by training mode
            let modeCount = {};
            recGaps.forEach(g => {
                let tp = getTrainingProfile(g.name);
                modeCount[tp.mode] = (modeCount[tp.mode] || 0) + 1;
            });
 
            
 
            // ══════════════════════════════════════════════════════════════
            // PANEL 3 — LEARNING COMPLETION LINKAGE
            // Links appraisal completion status to score outcomes
            // ══════════════════════════════════════════════════════════════
 
            // Score bands for completed employees
            const BANDS = [
                { label:'A — Excellent (≥4.0)', min:4.0, max:9, color:'#28a745' },
                { label:'B — Very Good (3–4)',   min:3.0, max:4.0, color:'#AED581' },
                { label:'C — Good (2–3)',         min:2.0, max:3.0, color:'#FFEE58' },
                { label:'D — Acceptable (1–2)',   min:1.0, max:2.0, color:'#ffc107' },
                { label:'E — Poor (≤1)',          min:0,   max:1.0, color:'#C8102E' },
            ];
 
            let completedData = data.filter(d => ['Approved','Accepted'].includes(d.workflow_state));
            let bandCounts = BANDS.map(b =>
                completedData.filter(d => fScore(d) >= b.min && fScore(d) < b.max).length
            );
            let pendingCount = data.filter(d => !['Approved','Accepted'].includes(d.workflow_state)).length;
 
            // Per-unit linkage table
            let unitLinkMap = {};
            data.forEach(d => {
                let u = d.custom_unit || 'Unknown';
                if (!unitLinkMap[u]) unitLinkMap[u] = { completed:0, pending:0, overdue:0, aboveTarget:0, belowTarget:0, scores:[] };
                let done = ['Approved','Accepted'].includes(d.workflow_state);
                if (done) unitLinkMap[u].completed++;
                else      unitLinkMap[u].pending++;
                if (d.custom_appraisal_status === 'Overdue') unitLinkMap[u].overdue++;
                if (fScore(d) > 0) {
                    unitLinkMap[u].scores.push(fScore(d));
                    if (fScore(d) >= 3.0) unitLinkMap[u].aboveTarget++;
                    else                  unitLinkMap[u].belowTarget++;
                }
            });

            window.learningDevelopmentData = {
    summary: {
        criticalSkillGaps: criticalGaps,
        moderateGaps: moderateGaps,
        onTrack: lowGaps,
        trainingNeeded: trainingNeeded,
        ldEffectivenessRate: ldCompRate
    },
    competencyGaps: gapList.map(g => ({
        competency: g.name,
        avg_self_score: Number(g.sAvg.toFixed(2)),
        avg_assessor_score: Number(g.avg.toFixed(2)),
        gap_to_target: Number(parseFloat(g.gap).toFixed(2)),
        severity: g.sev,
        employee_count: g.count,
        self_inflated: g.sAvg > g.avg
    })),
    unitEffectiveness: Object.keys(unitLinkMap).sort().map(u => {
        let ul = unitLinkMap[u];
        let tot = ul.completed + ul.pending;
        let effPct = ul.completed ? Math.round(ul.aboveTarget / ul.completed * 100) : 0;
        return {
            unit: u,
            total: tot,
            completed: ul.completed,
            pending: ul.pending,
            overdue: ul.overdue,
            above_target: ul.aboveTarget,
            below_target: ul.belowTarget,
            effectiveness_pct: effPct,
            ld_risk: effPct < 40 ? 'High' : effPct < 70 ? 'Moderate' : 'Effective'
        };
    })
};
 
            let linkTableRows = Object.keys(unitLinkMap).sort().map(u => {
                let ul  = unitLinkMap[u];
                let tot = ul.completed + ul.pending;
                let avg = ul.scores.length ? (ul.scores.reduce((a,b)=>a+b,0)/ul.scores.length).toFixed(2) : '—';
                let compPct = tot ? Math.round(ul.completed/tot*100) : 0;
                let effPct  = ul.completed ? Math.round(ul.aboveTarget/ul.completed*100) : 0;
                let ldRisk  = effPct < 40 ? 'high' : effPct < 70 ? 'med' : 'low';
                let ldRiskHtml = ldRisk === 'high'
                    ? `<span class="ud-pri-high">L&D Gap Risk</span>`
                    : ldRisk === 'med'
                        ? `<span class="ud-pri-med">Moderate</span>`
                        : `<span class="ud-pri-low">Effective</span>`;
                return `<tr>
                    <td style="font-weight:700;">${u}</td>
                    <td style="text-align:center;">${tot}</td>
                    <td style="text-align:center;font-weight:700;color:#28a745;">${ul.completed}</td>
                    <td style="text-align:center;font-weight:700;color:#ffc107;">${ul.pending}</td>
                    <td style="text-align:center;font-weight:700;color:#C8102E;">${ul.overdue}</td>
                    <td style="text-align:center;font-weight:700;">${avg}</td>
                    <td style="text-align:center;color:#28a745;font-weight:700;">${ul.aboveTarget}</td>
                    <td style="text-align:center;color:#C8102E;font-weight:700;">${ul.belowTarget}</td>
                    <td style="text-align:center;">
                        <div style="display:flex;align-items:center;gap:6px;">
                            <div class="ud-prog" style="flex:1;">
                                <div class="ud-prog-fill" style="width:${effPct}%;background:${effPct>=70?'#28a745':effPct>=40?'#ffc107':'#C8102E'};"></div>
                            </div>
                            <span style="font-size:10px;font-weight:700;">${effPct}%</span>
                        </div>
                    </td>
                    <td style="text-align:center;">${ldRiskHtml}</td>
                </tr>`;
            }).join('');
 
            // ── Employee-level completion linkage (all employees) ──────────
            let empLinkRows = data.map((d, i) => {
                let s = fScore(d);
                let done = ['Approved','Accepted'].includes(d.workflow_state);
                let ldStatus, ldStatusCls;
                if (!done) {
                    ldStatus = 'Pending Assessment'; ldStatusCls = 'ud-badge-orange';
                } else if (s >= 3.0) {
                    ldStatus = '✅ L&D Effective';   ldStatusCls = 'ud-badge-green';
                } else if (s > 0) {
                    ldStatus = '⚠ Needs L&D';        ldStatusCls = 'ud-badge-red';
                } else {
                    ldStatus = 'Not Scored';           ldStatusCls = 'ud-badge-orange';
                }
                let rec = s > 0 && s < 3.0
                    ? 'Enroll in development program'
                    : s >= 3.0
                        ? 'Sustain & advance skills'
                        : '—';
                return `<tr>
                    <td>${i+1}</td>
                    <td>
                        <div style="font-weight:700;">${d.employee_name || d.employee}</div>
                        <div style="font-size:10px;color:#868e96;">${d.employee}</div>
                    </td>
                    <td>${d.custom_unit || '—'}</td>

                    <td style="text-align:center;font-weight:700;color:${s>=3?'#28a745':s>0?'#C8102E':'#adb5bd'};">${s ? s.toFixed(2) : '—'}</td>
                    <td><span class="ud-badge ${ldStatusCls}">${ldStatus}</span></td>
                    <td style="font-size:11px;color:#495057;">${rec}</td>
                    <td>
                        <button class="ud-perf-action ud-act-view"
                            onclick="frappe.set_route('Form','Appraisal','${d.name}')">View</button>
                    </td>
                </tr>`;
            }).join('');
 
            let completionPanelHtml = `
            <div class="ud-2col" style="margin-bottom:16px;">
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">📊 Score Band Distribution (Completed)</div>
                    <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-ld-comp-donut"></canvas></div>
                </div>
                <div>
                    <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:6px;">📈 L&D Effectiveness by Unit</div>
                    <div class="ud-chart-wrap" style="height:220px;"><canvas id="ud-ld-eff-bar"></canvas></div>
                </div>
            </div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:8px;">🏢 Unit-Level Learning Linkage</div>
            <div style="overflow-x:auto;margin-bottom:20px;">
                <table class="ud-table">
                    <thead><tr>
                        <th>Unit</th>
                        <th style="text-align:center;">Total</th>
                        <th style="text-align:center;">Completed</th>
                        <th style="text-align:center;">Pending</th>
                        <th style="text-align:center;">Overdue</th>
                        <th style="text-align:center;">Avg Score</th>
                        <th style="text-align:center;">≥3.0 (Effective)</th>
                        <th style="text-align:center;">&lt;3.0 (Needs L&D)</th>
                        <th style="min-width:120px;">Effectiveness %</th>
                        <th style="text-align:center;">L&D Risk</th>
                    </tr></thead>
                    <tbody>${linkTableRows}</tbody>
                </table>
            </div>
            <div style="font-size:12px;font-weight:600;color:#0f1f3d;margin-bottom:8px;">👤 Employee-Level Learning Linkage</div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-table">
                    <thead><tr>
                        <th style="width:36px;">#</th>
                        <th>Employee</th>
                        <th>Unit</th>

                        <th style="text-align:center;">Score</th>
                        <th>L&D Status</th>
                        <th>Recommendation</th>
                        <th>Action</th>
                    </tr></thead>
                    <tbody>${empLinkRows}</tbody>
                </table>
            </div>`;
 
            // ══════════════════════════════════════════════════════════════
            // PANEL 4 — UNIT × COMPETENCY MATRIX (heatmap)
            // ══════════════════════════════════════════════════════════════
            let allUnits = [...new Set(goalData.map(r => r.custom_unit || 'Unknown'))].sort();
            let allKras  = kraNames.slice(); // already computed
 
            function matrixCell(avg) {
                if (avg === null || avg === undefined) return `<td style="color:#ccc;border-bottom:1px solid #e9ecef;">—</td>`;
                let bg = avg >= 4.0 ? 'rgba(40,167,69,.20)' :
                         avg >= 3.0 ? 'rgba(66,165,245,.20)' :
                         avg >= 2.0 ? 'rgba(255,167,38,.22)' : 'rgba(229,57,53,.18)';
                let fc = avg >= 4.0 ? '#1b6e30' : avg >= 3.0 ? '#1565c0' :
                         avg >= 2.0 ? '#c17000' : '#b71c1c';
                return `<td style="background:${bg};color:${fc};font-weight:700;border-bottom:1px solid #e9ecef;
                    -webkit-print-color-adjust:exact;print-color-adjust:exact;">
                    ${avg.toFixed(1)}
                </td>`;
            }
 
            let matrixRows = allUnits.map(u => {
                let cells = allKras.map(k => {
                    let rec = (unitKraMap[u] || {})[k];
                    let avg = rec && rec.total ? rec.sum / rec.total : null;
                    return matrixCell(avg);
                }).join('');
                // Row average
                let recs  = allKras.map(k => (unitKraMap[u] || {})[k]).filter(Boolean);
                let rAvg  = recs.length ? recs.reduce((s, r) => s + r.sum / r.total, 0) / recs.length : null;
                return `<tr>
                    <td style="font-weight:700;white-space:nowrap;padding:8px 10px;border-bottom:1px solid #e9ecef;">${u}</td>
                    ${cells}
                    ${matrixCell(rAvg)}
                </tr>`;
            }).join('');
 
            // Column averages row
            let colAvgCells = allKras.map(k => {
                let allRecs = allUnits.map(u => (unitKraMap[u] || {})[k]).filter(Boolean);
                let avg = allRecs.length ? allRecs.reduce((s,r) => s + r.sum/r.total, 0) / allRecs.length : null;
                return matrixCell(avg);
            }).join('');
 
            let matrixHtml = `
            <div style="font-size:11px;color:#868e96;margin-bottom:10px;">
                Cell = average assessor score for that competency within the unit.
                <span style="color:#28a745;font-weight:600;">Green ≥4</span> ·
                <span style="color:#AED581;font-weight:600;">Blue 3–4</span> ·
                <span style="color:#ffc107;font-weight:600;">Orange 2–3</span> ·
                <span style="color:#C8102E;font-weight:600;">Red &lt;2</span>
            </div>
            <div class="ud-table-scroll-wrap" style="overflow-x:auto;">
                <table class="ud-matrix-tbl">
                    <thead>
                        <tr>
                            <th style="text-align:left;min-width:130px;">Unit ╲ Competency</th>
                            ${allKras.map(k => `<th>${k}</th>`).join('')}
                            <th style="background:#7b1fa2;">Row Avg</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matrixRows}
                        <tr style="background:#f8f9fa;">
                            <td style="font-weight:700;color:#7b1fa2;padding:8px 10px;border-bottom:1px solid #e9ecef;">Column Avg</td>
                            ${colAvgCells}
                            <td style="border-bottom:1px solid #e9ecef;"></td>
                        </tr>
                    </tbody>
                </table>
            </div>`;
 
            // ── Assemble all panels ──────────────────────────────────────
            $page.find('#ud-ld-body').html(`
                ${ldKpiHtml}
                ${ldTabsHtml}
                <div class="ud-ld-panel active" id="ud-ldp-gaps">${gapsPanelHtml}</div>
                <div class="ud-ld-panel"        id="ud-ldp-completion">${completionPanelHtml}</div>
                <div class="ud-ld-panel"        id="ud-ldp-matrix">${matrixHtml}</div>
            `);
 
            // ── Charts ───────────────────────────────────────────────────
            // Panel 1: Gap bar
            mkChart('ud-ld-gap-bar', {
                type: 'bar',
                data: {
                    labels: top10.map(g => g.name),
                    datasets: [
                        {
                            label: 'Avg Assessor Score',
                            data:  top10.map(g => parseFloat(g.avg.toFixed(2))),
                            backgroundColor: top10.map(g =>
                                g.sev === 'critical' ? '#C8102E' : g.sev === 'moderate' ? '#ffc107' : '#28a745'),
                            borderRadius: 5,
                        },
                        {
                            label: 'Target (5.0)',
                            data:  top10.map(() => 5),
                            backgroundColor: 'rgba(15,31,61,.10)',
                            borderColor: '#0f1f3d',
                            borderWidth: 1,
                            borderRadius: 5,
                            type: 'bar',
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                        x: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } },
                        y: { ticks: { font: { size: 10 } } }
                    },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
 
            // Panel 1: Gap radar
            mkChart('ud-ld-gap-radar', {
                type: 'radar',
                data: {
                    labels: kraNames,
                    datasets: [
                        {
                            label: 'Avg Self Score',
                            data:  kraNames.map(n => kraAgg[n].count ? parseFloat((kraAgg[n].totalSelf/kraAgg[n].count).toFixed(2)) : 0),
                            borderColor: '#0f1f3d', backgroundColor: 'rgba(15,31,61,.10)',
                            pointBackgroundColor: '#0f1f3d', pointRadius: 4,
                        },
                        {
                            label: 'Avg Assessor Score',
                            data:  kraNames.map(n => kraAgg[n].count ? parseFloat((kraAgg[n].totalAssr/kraAgg[n].count).toFixed(2)) : 0),
                            borderColor: '#C8102E', backgroundColor: 'rgba(200,16,46,.10)',
                            pointBackgroundColor: '#C8102E', pointRadius: 4,
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { r: { beginAtZero: true, max: 5, ticks: { font: { size: 9 } } } },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
 
            // Panel 2: Recommendation donut
            let modeKeys   = Object.keys(modeCount);
            let modeColors = ['#C8102E','#0f1f3d','#00796b','#7b1fa2','#1565c0','#e65100'];
            mkChart('ud-ld-rec-donut', {
                type: 'doughnut',
                data: {
                    labels: modeKeys,
                    datasets: [{
                        data:  modeKeys.map(k => modeCount[k]),
                        backgroundColor: modeColors.slice(0, modeKeys.length),
                        borderColor: '#fff', borderWidth: 3,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '60%',
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
                }
            });
 
            // Panel 2: Priority bar
            mkChart('ud-ld-rec-bar', {
                type: 'bar',
                data: {
                    labels: ['🔴 Immediate (Critical)', '🟡 Short-term (Moderate)'],
                    datasets: [{
                        data: [
                            gapList.filter(g => g.sev === 'critical').length,
                            gapList.filter(g => g.sev === 'moderate').length,
                        ],
                        backgroundColor: ['#C8102E', '#ffc107'],
                        borderRadius: 5,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                }
            });
 
            // Panel 3: Score band donut
            mkChart('ud-ld-comp-donut', {
                type: 'doughnut',
                data: {
                    labels: [...BANDS.map(b => b.label), 'Pending'],
                    datasets: [{
                        data:  [...bandCounts, pendingCount],
                        backgroundColor: [...BANDS.map(b => b.color), '#a0a2a3'],
                        borderColor: '#fff', borderWidth: 3,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false, cutout: '60%',
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }
                }
            });
 
            // Panel 3: L&D effectiveness bar
            let unitKeys = Object.keys(unitLinkMap).sort();
            mkChart('ud-ld-eff-bar', {
                type: 'bar',
                data: {
                    labels: unitKeys,
                    datasets: [
                        {
                            label: '≥ 3.0 (L&D Effective)',
                            data:  unitKeys.map(u => unitLinkMap[u].aboveTarget),
                            backgroundColor: '#28a745',
                            borderRadius: 4,
                        },
                        {
                            label: '< 3.0 (Needs L&D)',
                            data:  unitKeys.map(u => unitLinkMap[u].belowTarget),
                            backgroundColor: '#C8102E',
                            borderRadius: 4,
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true } },
                    plugins: { legend: { position: 'bottom' } }
                }
            });
 
            // ── L&D sub-tab switcher ─────────────────────────────────────
            const ldTabActive = {
                gaps:            'lt-gaps',
                recommendations: 'lt-recommendations',
                completion:      'lt-completion',
                matrix:          'lt-matrix',
            };
 
            $page.find('#ud-ld-tabs-inner').off('click').on('click', '.ud-ld-tab', function() {
                let chosen = $(this).data('ld');
                $page.find('.ud-ld-tab').removeClass(Object.values(ldTabActive).join(' '));
                $(this).addClass(ldTabActive[chosen] || '');
                $page.find('.ud-ld-panel').removeClass('active');
                $page.find('#ud-ldp-' + chosen).addClass('active');
            });
        }
    });
}
        // completion status
        $page.find('#btn-ai-completion-status')
        .off('click')
        .on('click', function () {

            fetch_ai_insights(
                this,
                'ai-content-completion-status',
                'unit_completion_insights',
                {
                    total,
                    completed,
                    pending,
                    overdue
                }
            );
        });
        // high / low performer tracker
        $page.find('#btn-ai-low-high-performance')
        .off('click')
        .on('click', function () {

            fetch_ai_insights(
                this,
                'ai-content-low-high-performance',
                'unit_low_high_performance_tracker_insights',
                {
                    "unitLabel": unitLabel,
                    "perfTop": perfTopList.length,
                    "perfStrong": perfStrongList.length,
                    "perfMiddle": perfMiddleList.length,
                    "perfCritical": perfCritical.length,
                    "perfAvgScoreVal": perfAvgScoreVal,
                }
            );
        });
        function renderSectionsByFilter() {
    let selected = report_type_field.get_value() || '';
    let html = '';

    if (!selected) {
        html =
            kpiHtml +
            completionHtml +
            trendHtml +
            compHtml +
            nineBoxHtml +
            bellHtml +
            performerHtml +
            histHtml +
            avgRatingHtml +
            assessorEffHtml +
            agingHtml +
            calibrationHtml +
            complianceHtml +
            // perfCompHtml +
            // promotionEligibilityHtml +
            successionReadinessHtml +
            ldHtml;
    } else if (selected === 'Completion Status') {
        html = kpiHtml + completionHtml;
    } else {
        const sectionMap = {
            'Rating Trends':trendHtml,
            'Bell Curve Distribution': bellHtml,
            'Performance Tracker': performerHtml,
            '9-Box Talent Matrix': nineBoxHtml,
            'Competency Analysis': compHtml,
            'Historical Performance': histHtml,
            'Average Rating': avgRatingHtml,
            'Appraisal Aging': agingHtml,
            'Assessor Effectiveness': assessorEffHtml,
            'Calibration Summary': calibrationHtml,
            'Compliance Dashboard': complianceHtml,
            'Performance vs Compensation': perfCompHtml,
            'Promotion Eligibility': promotionEligibilityHtml,
            'Succession Readiness': successionReadinessHtml,
            'Learning & Development': ldHtml
        };

        html = sectionMap[selected] || '';
    }

    $page.find('#ud-main').html(html);
}

    } // end render_dashboard
    setTimeout(() => {
        apply_report_type_filter();
    }, 300);  
    } // end init
    
}; // end on_page_load

