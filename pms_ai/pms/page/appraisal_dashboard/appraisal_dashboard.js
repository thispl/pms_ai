
frappe.pages['appraisal-dashboard'].on_page_load = function(wrapper) {

	let page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Employee Appraisal Dashboard",
		single_column: true
	});

	let start = frappe.datetime.month_start();
	let end = frappe.datetime.month_end();
	let completionDonutChart;
let bellCurveChart;
	// ---------------- FILTERS ----------------

	

	// ---------------- STYLES ----------------

	$(`<style>
.chart-legend{
	display:flex;
	flex-direction:column;
	gap:10px;
	margin-top:20px;
	font-weight:600;
}

.legend-item{
	display:flex;
	align-items:center;
	gap:10px;
}

.legend-color{
	width:18px;
	height:18px;
	border-radius:4px;
	display:inline-block;
}

.poor{background:#ef5350;}
.acceptable{background:#f4b67a;}
.good{background:#f4ef88;}
.verygood{background:#9be084;}
.excellent{background:#5cc46b;}
.dashboard-bg{
	background:#f4f6fb;
	padding:25px;
	border-radius:12px;
	max-width:1400px;
	margin:auto;
}

.filter-box{
	background:white;
	padding:15px;
	border-radius:10px;
	box-shadow:0 2px 8px rgba(0,0,0,0.08);
	margin-bottom:20px;
	display:flex;
	gap:20px;
	align-items:center;
}

.kpi-container{
	display:grid;
	grid-template-columns:repeat(6,1fr);
	gap:18px;
	margin-bottom:30px;
}

.kpi-card{
	background:white;
	border-radius:10px;
	padding:18px;
	box-shadow:0 2px 10px rgba(0,0,0,0.08);
	position:relative;
	text-align:center;
}

.kpi-card::before{
	content:"";
	position:absolute;
	top:0;
	left:0;
	width:100%;
	height:4px;
	border-radius:10px 10px 0 0;
}

.kpi-card:nth-child(1)::before{background:#4CAF50;}
.kpi-card:nth-child(2)::before{background:#FF9800;}
.kpi-card:nth-child(3)::before{background:#2196F3;}
.kpi-card:nth-child(4)::before{background:#9C27B0;}
.kpi-card:nth-child(5)::before{background:#E53935;}
.kpi-card:nth-child(6)::before{background:#8E24AA;}

.kpi-value{
	font-size:26px;
	font-weight:700;
}

.kpi-title{
	font-size:13px;
	color:#777;
}

.analytics-row{
	display:flex;
	gap:30px;
	flex-wrap:wrap;
	margin-top:30px;
}

.analytics-card{
	background:white;
	border-radius:10px;
	padding:20px;
	box-shadow:0 2px 10px rgba(0,0,0,0.08);
}

.matrix-wrapper{
	display:flex;
	align-items:center;
	justify-content:center;
	margin-top:50px;
}

.y-axis{
	writing-mode:vertical-rl;
	transform:rotate(180deg);
	font-weight:700;
	margin-right:20px;
}

.nine-grid{
	display:grid;
	grid-template-columns:repeat(3,220px);
	grid-template-rows:repeat(3,160px);
	gap:10px;
}

.box{
	border-radius:12px;
	color:white;
	padding:12px;
	position:relative;
	cursor:pointer;
	font-weight:600;
}

.count{
	position:absolute;
	top:8px;
	right:10px;
	background:white;
	color:black;
	border-radius:50%;
	width:28px;
	height:28px;
	line-height:28px;
	text-align:center;
	font-weight:bold;
}

.box1{background:#1976d2;}
.box2{background:#ef5350;}
.box3{background:#2ecc71;}
.box4{background:#fb8c00;}
.box5{background:#42a5f5;}
.box6{background:#ff5252;}
.box7{background:#546e7a;}
.box8{background:#ffa726;}
.box9{background:#1e88e5;}

</style>`).appendTo("head");



	$(page.body).html(`

<div class="dashboard-bg">

<div class="filter-box" id="filter-area">
</div>

<div class="kpi-container">

<div class="kpi-card">
<div class="kpi-value" id="total_emp">0</div>
<div class="kpi-title">Employees Appraised</div>
</div>

<div class="kpi-card">
<div class="kpi-value" id="avg_score">0</div>
<div class="kpi-title">Average Score</div>
</div>

<div class="kpi-card">
<div class="kpi-value" id="top_perf">0</div>
<div class="kpi-title">Top Performers</div>
</div>

<div class="kpi-card">
<div class="kpi-value" id="low_perf">0</div>
<div class="kpi-title">Low Performers</div>
</div>

<div class="kpi-card">
<div class="kpi-value" id="total_completed">0%</div>
<div class="kpi-title">Completed</div>
</div>

<div class="kpi-card">
<div class="kpi-value" id="total_pending">0%</div>
<div class="kpi-title">Pending</div>
</div>

</div>

<div id="dashboard-content"></div>

</div>

`);
let initializing = true;
let reload_timeout = null;

function trigger_dashboard_reload(){
    if(initializing) return;

    clearTimeout(reload_timeout);
    reload_timeout = setTimeout(() => {
        load_dashboard();
    }, 300); // waits 300ms so multiple changes merge into one call
}
let department_field = frappe.ui.form.make_control({
    df: {
        label: "Department",
        fieldtype: 'Link',
        options: 'Department',
        fieldname: 'department',
        change: () => {
           trigger_dashboard_reload();
        }
    },
    parent: $('#filter-area'),
    render_input: true
});

let from_date_field = frappe.ui.form.make_control({
    df: {
        label: "From Date",
        fieldtype: 'Date',
        fieldname: 'from_date',
       change: () => {
    trigger_dashboard_reload();
}
    },
    parent: $('#filter-area'),
    render_input: true
});

let to_date_field = frappe.ui.form.make_control({
    df: {
        label: "To Date",
        fieldtype: 'Date',
        fieldname: 'to_date',
        change: () => {
    trigger_dashboard_reload();
}
    },
    parent: $('#filter-area'),
    render_input: true
});


// ✅ ADD THESE LINES HERE
from_date_field.set_value(start, true);
to_date_field.set_value(end, true);
initializing = false;
	// ---------------- LOAD DASHBOARD ----------------

	function load_dashboard(){
		$("#dashboard-content").html("");
		// let filters = [
		// 	["creation","between",[from_date.get_value(),to_date.get_value()]],
		// 	["docstatus","in",[0,1]]
		// ];

		// if(department.get_value()){
		// 	filters.push(["department","=",department.get_value()]);
		// }
		let filters = [
    ["creation","between",[from_date_field.get_value(),to_date_field.get_value()]],
    ["docstatus","in",[0,1]]
];
if(department_field.get_value()){
    filters.push(["department","=",department_field.get_value()]);
}

		frappe.call({
		method: "frappe.client.get_list",
		args: {
			doctype: "Appraisal",
			fields: ["name","employee","employee_name","total_score","department","docstatus","creation",'appraisal_cycle','custom_self_approval_date','custom_submitted_date'],
			filters: filters,
			limit_page_length: 1000
		},
		callback: function(r) {
			let data = r.message || [];
			let tableData = {};
			let scores = [];
			let cycleList = [...new Set(data.map(d => d.appraisal_cycle).filter(Boolean))];
			data.forEach(d => {
				// Table aggregation
				let dept = d.department || "Unknown";
				if(!tableData[dept]) tableData[dept] = {total:0, completed:0, pending:0};
				tableData[dept].total +=1;
				if(d.docstatus===1) tableData[dept].completed +=1;
				else tableData[dept].pending +=1;

				// For bell chart
				scores.push(parseFloat(d.total_score)||0);
			});

			let totalAll={total:0,completed:0,pending:0};
			Object.values(tableData).forEach(d=>{
				totalAll.total+=d.total;
				totalAll.completed+=d.completed;
				totalAll.pending+=d.pending;
			});
			let totalCompletedPct = totalAll.total ? ((totalAll.completed/totalAll.total)*100).toFixed(0) : 0;
			let totalPendingPct = totalAll.total ? ((totalAll.pending/totalAll.total)*100).toFixed(0) : 0;
			$("#total_completed").text(totalCompletedPct+"%");
			$("#total_pending").text(totalPendingPct+"%");

			// ---- Populate table + donut chart ----
			let currentYear = new Date().getFullYear();
			let html = `<div style="display:flex; gap:30px; justify-content:center; flex-wrap:wrap; margin:40px auto; max-width:1200px;">`;

			// Table
			let tableHTML = `<div style="flex:1 1 600px; overflow-x:auto; border-radius:10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding:20px;">
				<div style="text-align:center;margin-bottom:20px;">
					<h2 style="color:#2E86C1;">${currentYear} Staff Performance Appraisal Status %</h2>
				</div>
				<table class="table" style="width:100%; border-collapse:separate; border-spacing:0; text-align:center;">
					<thead style="background:#2E86C1; color:white; font-weight:600;">
						<tr>
							<th style="padding:12px;">Unit</th>
							<th>Total Appraisals Due</th>
							<th>Completed (Approved)</th>
							<th>Pending (Appraiser)</th>
							<th>Appraisals Completed %</th>
							<th>Appraisals Pending %</th>
						</tr>
					</thead>
					<tbody>`;

			Object.keys(tableData).forEach(dept=>{
				let d=tableData[dept];
				let completedPct = d.total ? ((d.completed/d.total)*100).toFixed(0):0;
				let pendingPct = d.total ? ((d.pending/d.total)*100).toFixed(0):0;
				tableHTML += `<tr style="transition: background 0.3s; cursor:pointer;" onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='white'">
					<td style="padding:10px;white-space:nowrap;text-align:left;">${dept}</td>
					<td>${d.total}</td>
					<td><span style="padding:4px 10px; border-radius:12px; background:#28a745; color:white;">${d.completed}</span></td>
					<td><span style="padding:4px 10px; border-radius:12px; background:#ffc107; color:#212529;">${d.pending}</span></td>
					<td>${completedPct}%</td>
					<td>${pendingPct}%</td>
				</tr>`;
			});
			tableHTML += `<tr style="font-weight:700; background:#eaf2f8;">
				<td style="padding:10px;">Total</td>
				<td>${totalAll.total}</td>
				<td><span style="padding:4px 10px; border-radius:12px; background:#28a745; color:white;">${totalAll.completed}</span></td>
				<td><span style="padding:4px 10px; border-radius:12px; background:#ffc107; color:#212529;">${totalAll.pending}</span></td>
				<td>${totalCompletedPct}%</td>
				<td>${totalPendingPct}%</td>
			</tr>`;
			tableHTML += `</tbody></table></div>`;

			// Donut chart
			let chartHTML = `<div style="flex:0 0 400px; text-align:center; padding:20px;">
				<h3 style="color:#2E86C1; margin-bottom:65px;">Appraisal Completion Status</h3>
				<canvas id="completionDonutChart" width="400" height="400"></canvas>
			</div>`;

			html += tableHTML + chartHTML + `</div>`;
			$("#dashboard-content").append(html);

			frappe.require(["https://cdn.jsdelivr.net/npm/chart.js"], function () {

    const ctxDonut = document.getElementById('completionDonutChart');

    const total = totalAll.completed + totalAll.pending;
    const dataValues = [totalAll.completed, totalAll.pending];
    const colors = ['#28a745', '#ffc107'];
				
    if (completionDonutChart) {
    completionDonutChart.destroy();
}

completionDonutChart = new Chart(ctxDonut, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Pending'],
            datasets: [{
                data: dataValues,
                backgroundColor: colors,
                borderColor: ['#ffffff', '#ffffff'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 14 }, padding: 20 } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let value = context.raw;
                            let pct = total ? ((value / total) * 100).toFixed(1) : 0;
                            return context.label + ': ' + value + ' (' + pct + '%)';
                        }
                    }
                }
            },
            cutout: '60%'
        },
        plugins: [{
            id: 'slicePercentage',
            afterDraw(chart) {
                const { ctx } = chart;
                const dataset = chart.data.datasets[0];
                const meta = chart.getDatasetMeta(0);
                const total = dataset.data.reduce((a, b) => a + b, 0);

                ctx.save();
                ctx.font = 'bold 16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                meta.data.forEach((arc, index) => {
                    const value = dataset.data[index];
                    const pct = total ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                    const angle = (arc.startAngle + arc.endAngle) / 2;
                    const x = arc.x + Math.cos(angle) * (arc.outerRadius * 0.6);
                    const y = arc.y + Math.sin(angle) * (arc.outerRadius * 0.6);
                    ctx.fillStyle = '#000';  // black text
                    ctx.fillText(pct, x, y);
                });

                ctx.restore();
            }
        }]
    });
});

			// ---- 9-Box Matrix & Bell Curve ----
			// Compute counts for 9-box
			let boxData={ box1:[], box2:[], box3:[], box4:[], box5:[], box6:[], box7:[], box8:[], box9:[] };
			data.forEach(emp=>{
				let score = parseFloat(emp.total_score)||0;
				let performance = score<2.5?"poor":score<3.5?"good":"outstanding";
				let potential = score<2.5?"low":score<3.5?"moderate":"high";
				let box = "";
				if(performance=="poor" && potential=="high") box="box1";
				else if(performance=="good" && potential=="high") box="box2";
				else if(performance=="outstanding" && potential=="high") box="box3";
				else if(performance=="poor" && potential=="moderate") box="box4";
				else if(performance=="good" && potential=="moderate") box="box5";
				else if(performance=="outstanding" && potential=="moderate") box="box6";
				else if(performance=="poor" && potential=="low") box="box7";
				else if(performance=="good" && potential=="low") box="box8";
				else if(performance=="outstanding" && potential=="low") box="box9";
				if(box) boxData[box].push(emp.employee);
			});

			let total = scores.length;
			let avg_score = total ? (scores.reduce((a,b)=>a+b,0)/total).toFixed(2) : 0;
			$("#total_emp").text(total);
			$("#avg_score").text(avg_score);
			$("#top_perf").text(boxData.box3.length + boxData.box6.length + boxData.box9.length);
			$("#low_perf").text(boxData.box1.length + boxData.box4.length + boxData.box7.length);

			let percentages = [0,0,0,0,0]; // Poor -> Excellent
			let ranges=[0,2,2.75,3.5,4.25,5];
			for(let i=0;i<5;i++){
				percentages[i] = scores.filter(s=>s>=ranges[i] && s<ranges[i+1]).length;
				percentages[i] = total?((percentages[i]/total)*100).toFixed(1):0;
			}

$("#dashboard-content").append(`<div style="display:flex; gap:50px; justify-content:center; flex-wrap:wrap; margin-top:50px;">
	<div class="matrix-wrapper" style="flex:0 0 500px;">
		<div class="y-axis">Leadership Potential</div>
		<div class="grid-container">
			<div class="nine-grid">
				<div class="box box1" id="box1">1C<br>Poor Performance<br>High Potential<div class="count">0</div></div>
				<div class="box box2" id="box2">1B<br>Good Performance<br>High Potential<div class="count">0</div></div>
				<div class="box box3" id="box3">1A<br>Outstanding Performance<br>High Potential<div class="count">0</div></div>
				<div class="box box4" id="box4">2C<br>Poor Performance<br>Moderate Potential<div class="count">0</div></div>
				<div class="box box5" id="box5">2B<br>Good Performance<br>Moderate Potential<div class="count">0</div></div>
				<div class="box box6" id="box6">2A<br>Outstanding Performance<br>Moderate Potential<div class="count">0</div></div>
				<div class="box box7" id="box7">3C<br>Poor Performance<br>Limited Potential<div class="count">0</div></div>
				<div class="box box8" id="box8">3B<br>Good Performance<br>Limited Potential<div class="count">0</div></div>
				<div class="box box9" id="box9">3A<br>Outstanding Performance<br>Limited Potential<div class="count">0</div></div>
			</div>
			<div class="x-axis">
				<div>Poor</div>
				<div>Good</div>
				<div>Outstanding</div>
			</div>
			<div style="text-align:center;font-weight:700;margin-top:5px">Performance</div>
		</div>
	</div>
	<div class="chart-section" style="flex:0 0 500px;">
		<h3 style="text-align:center">Performance Rating Bell Distribution</h3>
		<div class="chart-flex" style="flex-direction:column; align-items:center; justify-content:center;">
			<div class="chart-left" style="width:100%;"><canvas id="bellCurveChart"></canvas></div>
			<div class="chart-legend" style="margin-top:20px;">
				<div class="legend-item"><span class="legend-color poor"></span>Poor</div>
				<div class="legend-item"><span class="legend-color acceptable"></span>Acceptable</div>
				<div class="legend-item"><span class="legend-color good"></span>Good</div>
				<div class="legend-item"><span class="legend-color verygood"></span>Very Good</div>
				<div class="legend-item"><span class="legend-color excellent"></span>Excellent</div>
			</div>
		</div>
	</div>
</div>`);
$("#dashboard-content").append(`
<div style="margin-top:60px;background:white;padding:25px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.08);max-width:1200px;margin-left:auto;margin-right:auto;">
	<h3 style="text-align:center;margin-bottom:25px;">Daily Appraisal Completion Trend</h3>
	<canvas id="appraisalTrendChart" height="120"></canvas>
</div>
`);

			Object.keys(boxData).forEach(box=>{
				let employees = boxData[box];
				$(`#${box} .count`).text(employees.length);
				$(`#${box}`).off("click").on("click", function(){
					if(!employees.length){ frappe.msgprint("No Employees in this category"); return; }
					frappe.set_route("List","Appraisal",{ employee:["in",employees], creation:["between",[start,end]] });
				});
			});
// let dateWise = {};

// data.forEach(d => {

//     // -------- Pending Logic --------
//     if (d.custom_self_approval_date) {

//         let date = frappe.datetime.str_to_user(d.custom_self_approval_date).split(" ")[0];

//         if (!dateWise[date]) {
//             dateWise[date] = {completed:0, pending:0};
//         }

//         dateWise[date].pending += 1;
//     }

//     // -------- Completed Logic --------
//     if (d.custom_submitted_date) {

//         let date = frappe.datetime.str_to_user(d.custom_submitted_date).split(" ")[0];

//         if (!dateWise[date]) {
//             dateWise[date] = {completed:0, pending:0};
//         }

//         dateWise[date].completed += 1;

//         // Remove from pending if previously counted
//         if (d.custom_self_approval_date) {
//             let pendingDate = frappe.datetime.str_to_user(d.custom_self_approval_date).split(" ")[0];

//             if (dateWise[pendingDate] && dateWise[pendingDate].pending > 0) {
//                 dateWise[pendingDate].pending -= 1;
//             }
//         }
//     }

// });
let dateWise = {};

let fromDate = from_date_field.get_value();
let toDate = to_date_field.get_value();

data.forEach(d => {

    if (d.custom_self_approval_date) {

        let date = d.custom_self_approval_date;

        if (date >= fromDate && date <= toDate) {

            if (!dateWise[date]) {
                dateWise[date] = {completed:0, pending:0};
            }

            dateWise[date].pending += 1;
        }
    }

    // -------- Completed Logic --------
    if (d.custom_submitted_date) {

        let date = d.custom_submitted_date;

        if (date >= fromDate && date <= toDate) {

            if (!dateWise[date]) {
                dateWise[date] = {completed:0, pending:0};
            }

            dateWise[date].completed += 1;

            if (d.custom_self_approval_date) {

                let pendingDate = d.custom_self_approval_date;

                if (pendingDate >= fromDate && pendingDate <= toDate) {
                    if (dateWise[pendingDate] && dateWise[pendingDate].pending > 0) {
                        dateWise[pendingDate].pending -= 1;
                    }
                }
            }
        }
    }

});
let trendDates = Object.keys(dateWise).sort();
let completedCounts = [];
let pendingCounts = [];

trendDates.forEach(d=>{
	completedCounts.push(dateWise[d].completed);
	pendingCounts.push(dateWise[d].pending);
});
frappe.require("https://cdn.jsdelivr.net/npm/chart.js", function(){

	const ctxTrend = document.getElementById("appraisalTrendChart");

	new Chart(ctxTrend,{
		type:"line",
		data:{
			labels:trendDates,
			datasets:[
			{
				label:"Completed",
				data:completedCounts,
				borderColor:"#28a745",
				backgroundColor:"rgba(40,167,69,0.1)",
				tension:0.4,
				fill:true,
				pointRadius:4
			},
			{
				label:"Pending",
				data:pendingCounts,
				borderColor:"#ffc107",
				backgroundColor:"rgba(255,193,7,0.1)",
				tension:0.4,
				fill:true,
				pointRadius:4
			}
			]
		},
		options:{
			responsive:true,
			plugins:{
				legend:{
					position:"top"
				},
				tooltip:{
					mode:"index",
					intersect:false
				}
			},
			scales:{
				x:{
					title:{
						display:true,
						text:"Date"
					}
				},
				y:{
					beginAtZero:true,
					title:{
						display:true,
						text:"Number of Appraisals"
					}
				}
			}
		}
	});

});
			// Bell curve chart
			frappe.require("https://cdn.jsdelivr.net/npm/chart.js", function(){
				const ctx = document.getElementById("bellCurveChart");
				const colors=["#ef5350","#f4b67a","#f4ef88","#9be084","#5cc46b"];
				const labelsText=["Poor","Acceptable","Good","Very Good","Excellent"];
				const points=[], labels=[];
				for(let x=-3;x<=3;x+=0.1){ points.push(Math.exp(-0.5*Math.pow(x/1,2))); labels.push(x.toFixed(1)); }
				const bellPlugin={id:"bellPlugin", afterDatasetsDraw(chart){
					const {ctx, chartArea:{left,right,top,bottom,width,height}} = chart;
					const meta = chart.getDatasetMeta(0);
					ctx.save();
					ctx.beginPath();
					meta.data.forEach((p,i)=>{const {x,y}=p.getProps(['x','y'],true); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
					ctx.lineTo(right,bottom); ctx.lineTo(left,bottom); ctx.closePath();
					ctx.clip();
					let sectionWidth=width/5;
					for(let i=0;i<5;i++){ ctx.fillStyle=colors[i]; ctx.globalAlpha=0.85; ctx.fillRect(left+(sectionWidth*i),top,sectionWidth,height);}
					ctx.restore();
					ctx.save(); ctx.textAlign="center"; ctx.fillStyle="#000";
					for(let i=0;i<5;i++){ 
						let xPos=left+(sectionWidth*i)+(sectionWidth/2);
						ctx.font="bold 16px Arial"; ctx.fillText(percentages[i]+"%",xPos,top+30);
						ctx.font="14px Arial"; ctx.fillText(labelsText[i],xPos,bottom-35);
						ctx.fillText("(n="+scores.filter(s=>s>=ranges[i] && s<ranges[i+1]).length+")",xPos,bottom-18);
					}
					ctx.restore();
				}};
				new Chart(ctx,{
					type:"line",
					data:{labels:labels,datasets:[{data:points,borderColor:"#000",borderWidth:3,pointRadius:0,tension:0.45}]},
					options:{
						responsive:true,
						animation:{duration:1800,easing:"easeOutQuart"},
						interaction:{mode:"nearest",intersect:false},
						plugins:{
							legend:{display:false},
							tooltip:{callbacks:{label:function(context){let index=context.dataIndex; let section=Math.floor(index/(points.length/5)); return section<5? labelsText[section]+": "+scores.filter(s=>s>=ranges[section] && s<ranges[section+1]).length+" Employees ("+percentages[section]+"%)":"";}}}
						},
						scales:{y:{display:false}, x:{grid:{borderDash:[5,5]}, ticks:{display:false}}}
					},
					plugins:[bellPlugin]
				});
			});
		}
	});

	}

	load_dashboard();

	page.set_primary_action("Refresh", function(){
		load_dashboard();
	});

};