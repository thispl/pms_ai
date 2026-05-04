frappe.pages['ai-analysis'].on_page_load = function(wrapper) {

    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: "Employee Appraisal Dashboard",
        single_column: true
    });

    frappe.require("https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js");
    frappe.require("https://cdn.jsdelivr.net/npm/chart.js");

    $(page.body).html(frappe.render_template("ai_analysis", {}));
    let $page = $(page.body);

    let start = frappe.datetime.month_start();
    let end = frappe.datetime.month_end();
    let completionDonutChart, bellCurveChart, trendChart;
    let dashboard_raw_data = {}; 

    // --- 1. Export PDF ---
    page.add_inner_button(__('Export to PDF'), function() {
        let element = $page.find('#dashboard-export-wrapper')[0];
        if(!element) {
            frappe.msgprint("Cannot export: Wrapper ID missing.");
            return;
        }

        let $btn = $(this);
        $btn.prop('disabled', true).text('Generating...');
        frappe.show_alert({message: 'Preparing PDF... This may take a few seconds.', indicator: 'blue'});
        
        // Open all collapsibles so they are included in the PDF
        $page.find('.collapsible-wrapper').show(); 

        // CRITICAL FIX: Give the browser 500ms to render the open collapsibles 
        // and show the alert BEFORE we lock the main thread with html2pdf
        setTimeout(() => {
            let opt = {
                margin:       0.3,
                filename:     'Appraisal_Dashboard.pdf',
                image:        { type: 'jpeg', quality: 0.95 },
                // Lowering scale from 2 to 1.5 significantly speeds up rendering and stops freezing
                html2canvas:  { scale: 1.5, useCORS: true, logging: false }, 
                jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save().then(() => {
                // Restoration: Hide the collapsibles that weren't originally active
                $page.find('.collapsible-btn:not(.active)').next('.collapsible-wrapper').hide();
                $btn.prop('disabled', false).text('Export to PDF');
                frappe.show_alert({message: 'PDF Downloaded Successfully!', indicator: 'green'});
            }).catch(err => {
                console.error("PDF Generation Error: ", err);
                $btn.prop('disabled', false).text('Export to PDF');
                frappe.msgprint("An error occurred while generating the PDF. Check console.");
            });
        }, 500); 
    });
    // --- 2. Overall Summary ---
    page.set_primary_action(__('Generate Overall Summary ✨'), function() {
        let $summary_box = $page.find('#overall-ai-summary');
        let $content = $page.find('#overall-ai-content');
        if($summary_box.length === 0) return frappe.msgprint("Summary Box missing.");

        $summary_box.slideDown();
        $content.html("<div style='text-align:center; padding: 20px;'><span class='spinner-border spinner-border-sm text-primary'></span> Reading dashboard data...</div>");

        frappe.call({
            method: 'pms_ai.api.generate_master_summary',
            args: { dashboard_data: JSON.stringify(dashboard_raw_data) },
            callback: function(r) {
                if(r.message) $content.html(r.message.replace(/\n/g, "<br>"));
                else $content.html("Error: Could not retrieve summary.");
            }
        });
    });

    // --- 3. Filters ---
    let initializing = true;
    let reload_timeout = null;
    function trigger_dashboard_reload(){
        if(initializing) return;
        clearTimeout(reload_timeout);
        reload_timeout = setTimeout(() => { load_dashboard(); }, 300); 
    }

    let department_field = frappe.ui.form.make_control({ df: { label: "Department", fieldtype: 'Link', options: 'Department', fieldname: 'department', change: () => trigger_dashboard_reload() }, parent: $page.find('#filter-area'), render_input: true });
    let from_date_field = frappe.ui.form.make_control({ df: { label: "From Date", fieldtype: 'Date', fieldname: 'from_date', change: () => trigger_dashboard_reload() }, parent: $page.find('#filter-area'), render_input: true });
    let to_date_field = frappe.ui.form.make_control({ df: { label: "To Date", fieldtype: 'Date', fieldname: 'to_date', change: () => trigger_dashboard_reload() }, parent: $page.find('#filter-area'), render_input: true });

    from_date_field.set_value(start, true);
    to_date_field.set_value(end, true);
    initializing = false;

    // --- 4. AI Insight Fetcher ---
    function fetch_ai_insights(btn_element, content_id, context_type, chart_data) {
        let $btn = $(btn_element);
        let $content = $page.find(`#${content_id}`);
        $btn.prop("disabled", true).html("✨ Analyzing...");
        $content.html("<span class='spinner-border spinner-border-sm text-primary'></span> Analyzing...");

        frappe.call({
            method: 'pms_ai.api.analyze_dashboard_chart',
            args: { chart_context: context_type, chart_data: JSON.stringify(chart_data) },
            callback: function(r) {
                $btn.prop("disabled", false).html("🔄 Refresh Insights");
                if(r.message) $content.html(r.message.replace(/\n/g, "<br>"));
            }
        });
    }

    // --- 5. Core Dashboard Rendering ---
    function load_dashboard(){
        let filters = [ ["creation","between",[from_date_field.get_value(),to_date_field.get_value()]], ["docstatus","in",[0,1]] ];
        if(department_field.get_value()){ filters.push(["department","=",department_field.get_value()]); }

        frappe.call({
            method: "frappe.client.get_list",
            args: { doctype: "Appraisal", fields: ["name","employee","employee_name","total_score","department","docstatus","creation",'custom_self_approval_date','custom_submitted_date'], filters: filters, limit_page_length: 1000 },
            callback: function(r) {
                let data = r.message || [];
                let tableData = {}; let scores = [];
                
                data.forEach(d => {
                    let dept = d.department || "Unknown";
                    if(!tableData[dept]) tableData[dept] = {total:0, completed:0, pending:0};
                    tableData[dept].total +=1;
                    if(d.docstatus===1) tableData[dept].completed +=1; else tableData[dept].pending +=1;
                    scores.push(parseFloat(d.total_score)||0);
                });

                let totalAll={total:0,completed:0,pending:0};
                Object.values(tableData).forEach(d=>{ totalAll.total+=d.total; totalAll.completed+=d.completed; totalAll.pending+=d.pending; });
                
                let total = scores.length;
                // let avg_score = total ? (scores.reduce((a,b)=>a+b,0)/total).toFixed(2) : 0;
                let avg_score = total ? Math.round(scores.reduce((a,b)=>a+b,0)/total) : 0;
                let boxData={ box1:[], box2:[], box3:[], box4:[], box5:[], box6:[], box7:[], box8:[], box9:[] };
                data.forEach(emp=>{
                    let score = parseFloat(emp.total_score)||0;
                    let performance = score<2.5?"poor":score<3.5?"good":"outstanding";
                    let potential = score<2.5?"low":score<3.5?"moderate":"high";
                    let box = "";
                    if(performance=="poor" && potential=="high") box="box1"; else if(performance=="good" && potential=="high") box="box2"; else if(performance=="outstanding" && potential=="high") box="box3"; else if(performance=="poor" && potential=="moderate") box="box4"; else if(performance=="good" && potential=="moderate") box="box5"; else if(performance=="outstanding" && potential=="moderate") box="box6"; else if(performance=="poor" && potential=="low") box="box7"; else if(performance=="good" && potential=="low") box="box8"; else if(performance=="outstanding" && potential=="low") box="box9";
                    if(box) boxData[box].push(emp.employee);
                });

                $page.find("#total_emp").text(total); 
                $page.find("#total_completed").text(total ? ((totalAll.completed/totalAll.total)*100).toFixed(0)+"%" : "0%");
                $page.find("#total_pending").text(total ? ((totalAll.pending/totalAll.total)*100).toFixed(0)+"%" : "0%");
                $page.find("#avg_score").text(avg_score);
                $page.find("#top_perf").text(boxData.box3.length + boxData.box6.length + boxData.box9.length);
                $page.find("#low_perf").text(boxData.box1.length + boxData.box4.length + boxData.box7.length);
                
                

                let htmlBuffer = "";
                htmlBuffer += '<div style="display:flex; gap:20px; align-items:stretch; margin-bottom:20px;">' +

                // Table Section
                '<div style="flex:1; overflow-x:auto; background:white; border-radius:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); padding:20px;">' +
                    '<h3 style="color:#2E86C1; text-align:center; margin-bottom:20px;">Staff Performance Appraisal Completion Status</h3>' +
                    '<table class="table" style="width:100%; border-collapse:separate; border-spacing:0; text-align:center;">' +
                    '<thead style="background:#2E86C1; color:white; font-weight:600;">' +
                    '<tr>' +
                    '<th style="padding:12px; text-align:left;">Unit</th>' +
                    '<th>Total Due</th>' +
                    '<th>Completed %</th>' +
                    '<th>Pending %</th>' +
                    '</tr>' +
                    '</thead><tbody>';
                let deptNames = [];
                let completedPerc = [];
                let pendingPerc = [];
                Object.keys(tableData).forEach(dept=>{
                    let d = tableData[dept];
                    let comp = d.total ? Math.round((d.completed / d.total) * 100) : 0;
                    let pend = d.total ? Math.round((d.pending / d.total) * 100) : 0;

                    // ✅ PUSH DATA FOR CHART
                    deptNames.push(dept);
                    completedPerc.push(comp);
                    pendingPerc.push(pend);
                    htmlBuffer += '<tr style="transition: background 0.3s;" ' +
                        'onmouseover="this.style.background=\'#f0f8ff\'" ' +
                        'onmouseout="this.style.background=\'white\'">' +
                        '<td style="padding:10px;text-align:left;">' + dept + '</td>' +
                        '<td>' + d.total + '</td>' +
                        '<td>' + (d.total ? ((d.completed/d.total)*100).toFixed(0) : 0) + '%</td>' +
                        '<td>' + (d.total ? ((d.pending/d.total)*100).toFixed(0) : 0) + '%</td>' +
                        '</tr>';
                });

                htmlBuffer += '</tbody></table></div>' +
                    '<div style="flex:1; background:white; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.05); padding:20px;">' +
                        '<h3 style="text-align:center; margin-bottom:15px;">📊 Department Performance</h3>' +
                        '<canvas id="deptBarChart" style="max-height:350px;"></canvas>' +
                    '</div>' +
                    // Donut Chart Section
                    // '<div style="flex:1; background:white; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.05); padding:20px;">' +
                    //     '<button class="collapsible-btn active">📊 Appraisal Completion Status</button>' +
                    //     '<div class="collapsible-wrapper" style="display:block;">' +
                    //         '<div class="chart-full-width">' +
                    //             '<canvas id="completionDonutChart" style="max-height:350px;"></canvas>' +
                    //         '</div>' +
                    //         '<div class="ai-insight-card">' +
                    //             '<div class="ai-card-header">' +
                    //                 '<h4>✨ Completion Insights</h4>' +
                    //                 '<button class="btn btn-sm btn-primary" id="btn-ai-donut">Generate Insight</button>' +
                    //             '</div>' +
                    //             '<div id="ai-content-donut" class="ai-insight-content">' +
                    //                 'Click Generate Insight for completion rate analysis.' +
                    //             '</div>' +
                    //         '</div>' +
                    //     '</div>' +
                    // '</div>' +

                '</div>';
                

                // 3. 9-Box Matrix (NOW COLLAPSIBLE)
                htmlBuffer += '<button class="collapsible-btn active">🗂️ 9-Box Talent Matrix</button>' +
                '<div class="collapsible-wrapper" style="display:block;">' +
                '<div style="display:flex; gap:10px; align-items:stretch; flex-wrap:wrap;">' +
                    '<div  style="display: flex; justify-content: center;">' +
                        '<div class="matrix-wrapper" style="margin-top:0;">' +
                            '<div class="y-axis">Leadership Potential</div>' +
                            '<div>' +
                                '<div class="nine-grid">' +
                                    '<div class="box box1">1C<br>Poor Performance<br>High Potential<div class="count">' + boxData.box1.length + '</div></div>' +
                                    '<div class="box box2">1B<br>Good Performance<br>High Potential<div class="count">' + boxData.box2.length + '</div></div>' +
                                    '<div class="box box3">1A<br>Outstanding Performance<br>High Potential<div class="count">' + boxData.box3.length + '</div></div>' +
                                    '<div class="box box4">2C<br>Poor Performance<br>Moderate Potential<div class="count">' + boxData.box4.length + '</div></div>' +
                                    '<div class="box box5">2B<br>Good Performance<br>Moderate Potential<div class="count">' + boxData.box5.length + '</div></div>' +
                                    '<div class="box box6">2A<br>Outstanding Performance<br>Moderate Potential<div class="count">' + boxData.box6.length + '</div></div>' +
                                    '<div class="box box7">3C<br>Poor Performance<br>Limited Potential<div class="count">' + boxData.box7.length + '</div></div>' +
                                    '<div class="box box8">3B<br>Good Performance<br>Limited Potential<div class="count">' + boxData.box8.length + '</div></div>' +
                                    '<div class="box box9">3A<br>Outstanding Performance<br>Limited Potential<div class="count">' + boxData.box9.length + '</div></div>' +
                                '</div>' +
                                '<div style="display:flex; justify-content:space-around; margin-top:10px; font-weight:bold;"><div>Poor</div><div>Good</div><div>Outstanding</div></div>' +
                                '<div style="text-align:center;font-weight:700;margin-top:5px">Past Performance</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="ai-insight-card">' +
                        '<div class="ai-card-header">' +
                            '<h4>✨ Talent Matrix Insights</h4>' +
                            '<button class="btn btn-sm btn-primary" id="btn-ai-ninebox">Generate Insight</button>' +
                        '</div>' +
                        '<div id="ai-content-ninebox" class="ai-insight-content">Click Generate Insight to analyze talent distribution and succession planning.</div>' +
                    '</div>' +
                    
                    '<div style="flex:1; background:white; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.05); padding:20px;">' +
                        '<button class="collapsible-btn active">📊 Appraisal Completion Status</button>' +
                        '<div class="collapsible-wrapper" style="display:block;">' +
                            '<div class="chart-full-width">' +
                                '<canvas id="completionDonutChart" style="max-height:350px;"></canvas>' +
                            '</div>' +
                            '<div class="ai-insight-card">' +
                                '<div class="ai-card-header">' +
                                    '<h4>✨ Completion Insights</h4>' +
                                    '<button class="btn btn-sm btn-primary" id="btn-ai-donut">Generate Insight</button>' +
                                '</div>' +
                                '<div id="ai-content-donut" class="ai-insight-content">' +
                                    'Click Generate Insight for completion rate analysis.' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +

                   
                '</div>';

                // 4. Bell Curve
                let percentages = [0,0,0,0,0]; let ranges=[0,2,2.75,3.5,4.25,5];
                for(let i=0;i<5;i++){ percentages[i] = total?((scores.filter(s=>s>=ranges[i] && s<ranges[i+1]).length/total)*100).toFixed(0):0; }
                
                htmlBuffer += '<button class="collapsible-btn active">📈 Performance Rating Bell Distribution</button>' +
                '<div class="collapsible-wrapper" style="display:block;">' +
                    '<div class="chart-full-width"><canvas id="bellCurveChart" height="150"></canvas></div>' +
                    '<div class="ai-insight-card">' +
                        '<div class="ai-card-header">' +
                            '<h4>✨ Distribution Insights</h4>' +
                            '<button class="btn btn-sm btn-primary" id="btn-ai-bell">Generate Insight</button>' +
                        '</div>' +
                        '<div id="ai-content-bell" class="ai-insight-content">Click Generate Insight to check for manager bias.</div>' +
                    '</div>' +
                '</div>';

                // 5. Trend Chart
                let dateWise = {}; let fromDate = from_date_field.get_value(); let toDate = to_date_field.get_value();
                data.forEach(d => {
                    if (d.custom_self_approval_date && d.custom_self_approval_date >= fromDate && d.custom_self_approval_date <= toDate) {
                        if (!dateWise[d.custom_self_approval_date]) dateWise[d.custom_self_approval_date] = {completed:0, pending:0};
                        dateWise[d.custom_self_approval_date].pending += 1;
                    }
                    if (d.custom_submitted_date && d.custom_submitted_date >= fromDate && d.custom_submitted_date <= toDate) {
                        if (!dateWise[d.custom_submitted_date]) dateWise[d.custom_submitted_date] = {completed:0, pending:0};
                        dateWise[d.custom_submitted_date].completed += 1;
                    }
                });
                let trendDates = Object.keys(dateWise).sort();
                let completedCounts = []; let pendingCounts = [];
                trendDates.forEach(d=>{ completedCounts.push(dateWise[d].completed); pendingCounts.push(dateWise[d].pending); });

                htmlBuffer += '<button class="collapsible-btn active">📉 Daily Appraisal Completion Trend</button>' +
                '<div class="collapsible-wrapper" style="display:block;">' +
                    '<div class="chart-full-width"><canvas id="appraisalTrendChart" height="120"></canvas></div>' +
                    '<div class="ai-insight-card">' +
                        '<div class="ai-card-header">' +
                            '<h4>✨ Velocity Insights</h4>' +
                            '<button class="btn btn-sm btn-primary" id="btn-ai-trend">Generate Insight</button>' +
                        '</div>' +
                        '<div id="ai-content-trend" class="ai-insight-content">Click Generate Insight to analyze submission pacing.</div>' +
                    '</div>' +
                '</div>';

                $page.find("#dashboard-content").html(htmlBuffer);
                let deptBarChart;
                const ctxBar = $page.find('#deptBarChart')[0];

                if (deptBarChart) {
                    deptBarChart.destroy();
                }
                deptBarChart = new Chart(ctxBar, {
                    type: 'bar',
                    data: {
                        labels: deptNames,
                        datasets: [
                            {
                                label: 'Completed %',
                                data: completedPerc,
                                backgroundColor: '#28a745'
                            },
                            {
                                label: 'Pending %',
                                data: pendingPerc,
                                backgroundColor: '#ffc107'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    callback: function(value) {
                                        return value + "%";
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'bottom'
                            }
                        }
                    }
                });
                dashboard_raw_data = {
                    total_employees: total,
                    average_score: avg_score,
                    completion_rate: totalAll,
                    rating_distribution: percentages,
                    trend_velocity: completedCounts
                };

                // --- BIND EVENTS ---
                $page.find('.collapsible-btn').off('click').on('click', function() {
                    $(this).toggleClass('active');
                    $(this).next('.collapsible-wrapper').slideToggle(300);
                });

                $page.find('#btn-ai-donut').on('click', function() { fetch_ai_insights(this, 'ai-content-donut', 'completion_status', { total: totalAll.total, completed: totalAll.completed, pending: totalAll.pending }); });
                $page.find('#btn-ai-bell').on('click', function() { fetch_ai_insights(this, 'ai-content-bell', 'bell_curve', { percentages: percentages, categories: ["Poor", "Acceptable", "Good", "Very Good", "Excellent"] }); });
                $page.find('#btn-ai-trend').on('click', function() { fetch_ai_insights(this, 'ai-content-trend', 'daily_trend', { dates: trendDates, completed: completedCounts, pending: pendingCounts }); });
                
                // NEW: 9-Box Button Event
                $page.find('#btn-ai-ninebox').on('click', function() { 
                    let nineBoxCounts = {
                        "1A (Outstanding Perf, High Pot)": boxData.box3.length,
                        "1B (Good Perf, High Pot)": boxData.box2.length,
                        "1C (Poor Perf, High Pot)": boxData.box1.length,
                        "2A (Outstanding Perf, Mod Pot)": boxData.box6.length,
                        "2B (Good Perf, Mod Pot)": boxData.box5.length,
                        "2C (Poor Perf, Mod Pot)": boxData.box4.length,
                        "3A (Outstanding Perf, Low Pot)": boxData.box9.length,
                        "3B (Good Perf, Low Pot)": boxData.box8.length,
                        "3C (Poor Perf, Low Pot)": boxData.box7.length,
                    };
                    fetch_ai_insights(this, 'ai-content-ninebox', 'nine_box', nineBoxCounts); 
                });
                
                // --- DRAW CHARTS ---
                const ctxDonut = $page.find('#completionDonutChart')[0];
                if (completionDonutChart) completionDonutChart.destroy();
                
                // completionDonutChart = new Chart(ctxDonut, { type: 'doughnut', data: { labels: ['Completed', 'Pending'], datasets: [{ data: [totalAll.completed, totalAll.pending], backgroundColor: ['#28a745', '#ffc107'], borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '60%' } });
                const totals = totalAll.completed + totalAll.pending;

                if (completionDonutChart) {
                    completionDonutChart.destroy();
                }
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
                            legend: {
                                position: 'bottom',
                                labels: {
                                    font: { size: 14 },
                                    padding: 20
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let value = context.raw;
                                        let pct = totals ? ((value / totals) * 100).toFixed(0) : 0;
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
                            const meta = chart.getDatasetMeta(0);

                            const totalValue = dataset.data.reduce((a, b) => a + b, 0);

                            ctx.save();
                            ctx.font = "bold 16px Arial";
                            ctx.fillStyle = "#000";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";

                            meta.data.forEach((arc, index) => {

                                const value = dataset.data[index];
                                const pct = totalValue ? ((value / totalValue) * 100).toFixed(0) + "%" : "0%";

                                const angle = (arc.startAngle + arc.endAngle) / 2;

                                const x = arc.x + Math.cos(angle) * (arc.outerRadius * 0.65);
                                const y = arc.y + Math.sin(angle) * (arc.outerRadius * 0.65);

                                ctx.fillText(pct, x, y);

                            });

                            ctx.restore();
                        }
                    }]
                });
                const ctxTrend = $page.find("#appraisalTrendChart")[0];
                if(trendChart) trendChart.destroy();
                trendChart = new Chart(ctxTrend,{ type:"line", data:{ labels:trendDates, datasets:[ { label:"Completed", data:completedCounts, borderColor:"#28a745", backgroundColor:"rgba(40,167,69,0.1)", tension:0.4, fill:true }, { label:"Pending", data:pendingCounts, borderColor:"#ffc107", backgroundColor:"rgba(255,193,7,0.1)", tension:0.4, fill:true } ] }, options:{ responsive:true, maintainAspectRatio: false } });

                const ctxBell = $page.find("#bellCurveChart")[0];
                const colors=["#ef5350","#f4b67a","#f4ef88","#9be084","#5cc46b"];
                const points=[], labels=[];
                for(let x=-3;x<=3;x+=0.1){ points.push(Math.exp(-0.5*Math.pow(x/1,2))); labels.push(x.toFixed(0)); }
                
                const bellPlugin={id:"bellPlugin", afterDatasetsDraw(chart){
                    const {ctx, chartArea:{left,right,top,bottom,width,height}} = chart;
                    const meta = chart.getDatasetMeta(0);
                    ctx.save(); ctx.beginPath();
                    meta.data.forEach((p,i)=>{const {x,y}=p.getProps(['x','y'],true); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
                    ctx.lineTo(right,bottom); ctx.lineTo(left,bottom); ctx.closePath(); ctx.clip();
                    let sectionWidth=width/5;
                    for(let i=0;i<5;i++){ ctx.fillStyle=colors[i]; ctx.globalAlpha=0.85; ctx.fillRect(left+(sectionWidth*i),top,sectionWidth,height);}
                    ctx.restore();
                    
                    ctx.save(); ctx.textAlign="center"; ctx.fillStyle="#000";
                    const labelsText=["Poor","Acceptable","Good","Very Good","Excellent"];
                    for(let i=0;i<5;i++){ 
                        let xPos = left + (sectionWidth * i) + (sectionWidth / 2);
                        ctx.font = "bold 16px Arial"; ctx.fillText(percentages[i] + "%", xPos, top + 30);
                        ctx.font = "14px Arial"; ctx.fillText(labelsText[i], xPos, bottom - 15);
                    }
                    ctx.restore();
                }};
                
                if(bellCurveChart) bellCurveChart.destroy();
                bellCurveChart = new Chart(ctxBell,{ type:"line", data:{labels:labels,datasets:[{data:points,borderColor:"#000",borderWidth:3,pointRadius:0,tension:0.45}]}, options:{ responsive:true, maintainAspectRatio: false, plugins:{ legend:{display:false} }, scales:{y:{display:false}, x:{grid:{display:false}, ticks:{display:false}}} }, plugins:[bellPlugin] });
            }
        });
    }

    setTimeout(() => { load_dashboard(); }, 500); 
};