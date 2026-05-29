// Copyright (c) 2026, TEAMPRO and contributors
// Appraisal Settings — Client Script

frappe.ui.form.on("Appraisal Settings", {
	setup(frm) {
		frm.fields_dict["employees"].grid.get_field("assessor_id").get_query = function(doc, cdt, cdn) {

			let row = locals[cdt][cdn];

			return {
				query: "erpnext.controllers.queries.employee_query",
				filters: [
					["status", "=", "Active"],
					["name", "!=", row.employee || ""]
				]
			};
		};
	},
	refresh(frm) {
		// =========================================
		// ACTION BUTTONS
		// =========================================

		frm.add_custom_button(__("Publish Appraisals"), function () {
			frappe.call({
				method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.publish_appraisals",
				args: { rollout_date: frm.doc.rollout_date, cycle: frm.doc.appraisal_cycle },
				callback: function (r) { if (r.message) frappe.msgprint(r.message); }
			});
		}, __("Actions"));

		frm.add_custom_button(__("Lock Appraisals"), function () {

		frappe.confirm(
			__("Are you sure you want to lock appraisals?"),
			function () {

				frappe.call({
					method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.lock_appraisals",
					args: {
						cycle: frm.doc.appraisal_cycle,
						locking_date: frm.doc.locking_date,
						lock: 1
					},
					callback: function (r) {
						if (r.message) {
							frappe.msgprint(r.message);
							frm.reload_doc();
						}
					}
				});

			}
		);

	}, __("Actions"));


	frm.add_custom_button(__("Unlock Appraisals"), function () {

		frappe.confirm(
			__("Are you sure you want to unlock appraisals?"),
			function () {

				frappe.call({
					method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.lock_appraisals",
					args: {
						cycle: frm.doc.appraisal_cycle,
						locking_date: frm.doc.locking_date,
						lock: 0
					},
					callback: function (r) {
						if (r.message) {
							frappe.msgprint(r.message);
							frm.reload_doc();
						}
					}
				});

			}
		);

	}, __("Actions"));
		// frm.add_custom_button(__("Publish Appraisals"), function () {
		// 	frappe.call({
		// 		method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.publish_appraisals",
		// 		args: { rollout_date: frm.doc.rollout_date, cycle: frm.doc.appraisal_cycle },
		// 		callback: function (r) { if (r.message) frappe.msgprint(r.message); }
		// 	});
		// }, __("Actions"));

		
		
		// frm.add_custom_button(__("Assessor Change"), function () {
		// 	if (!frm.doc.assessor) {
		// 		frappe.msgprint(__("Please select Assessor"));
		// 		return;
		// 	}
		// 	frappe.call({
		// 		method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.update_assessor",
		// 		args: { assessor: frm.doc.assessor, unit: frm.doc.unit, employee: frm.doc.employee },
		// 		callback: function (r) { if (r.message) frappe.msgprint(r.message); }
		// 	});
		// }, __("Actions"));

		
		// =========================================
		// LABEL MAPPING
		// =========================================

		const field_labels = {
			performance_review_cycle: "Performance Review Cycle",
			appraisal_cycle: "Appraisal Cycle",
			unit: "Unit",
			rollout_date: "Rollout Date",
			locking_date: "Locking Date",
			employee: "Employee",
			assessor: "Assessor",
			restrict_access: "Restrict Access",
			weekly_reminder_frequency_in_days: "Weekly Reminder",
			recipients: "Recipients",
		};

		// =========================================
		// COLOR PALETTE
		// =========================================

		const color_palette = [
			{ bg: "linear-gradient(135deg, #fff8f0 0%, #fff3e0 50%, #fff8f8 100%)", border: "#c0392b", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", border: "#db2777", glow: "rgba(219,39,119,0.18)" },
			// { bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", border: "#db2777", glow: "rgba(219,39,119,0.18)" },
			// { bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", border: "#db2777", glow: "rgba(219,39,119,0.18)" },
			// { bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", border: "#db2777", glow: "rgba(219,39,119,0.18)" },
			// { bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", border: "#db2777", glow: "rgba(219,39,119,0.18)" },
			// { bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", border: "#db2777", glow: "rgba(219,39,119,0.18)" },
			// { bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", border: "#db2777", glow: "rgba(219,39,119,0.18)" },
			// { bg: "linear-gradient(135deg,#dbeafe,#bfdbfe)", border: "#2563eb", glow: "rgba(37,99,235,0.18)" },
			// { bg: "linear-gradient(135deg,#cffafe,#a5f3fc)", border: "#0891b2", glow: "rgba(8,145,178,0.18)" },
			// { bg: "linear-gradient(135deg,#ffedd5,#fed7aa)", border: "#ea580c", glow: "rgba(234,88,12,0.18)" },
			// { bg: "linear-gradient(135deg,#ede9fe,#ddd6fe)", border: "#9333ea", glow: "rgba(147,51,234,0.18)" },
			// { bg: "linear-gradient(135deg,#fce7f3,#fbcfe8)", border: "#db2777", glow: "rgba(219,39,119,0.18)" },
			// { bg: "linear-gradient(135deg,#f3e8ff,#e9d5ff)", border: "#c026d3", glow: "rgba(192,38,211,0.18)" },
			// { bg: "linear-gradient(135deg,#fef9c3,#fde68a)", border: "#ca8a04", glow: "rgba(202,138,4,0.18)" }
		];

		// =========================================
		// PAGE DESIGN
		// =========================================

		// frm.page.wrapper.find('.layout-main-section').css({
		// 	background: 'linear-gradient(135deg,#f8fafc,#eef2ff)',
		// 	padding: '25px',
		// 	borderRadius: '22px'
		// });

		// frm.page.wrapper.find('.form-section').css({
		// 	background: '#ffffff',
		// 	borderRadius: '24px',
		// 	padding: '28px',
		// 	boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
		// 	border: '1px solid #e2e8f0'
		// });

		// =========================================
		// INJECT GLOBAL STYLES
		// =========================================

		$('#pms-appraisal-custom-style').remove();

		const custom_style = document.createElement('style');

		custom_style.id = 'pms-appraisal-custom-style';

		custom_style.innerHTML = `

		/* =====================================================
		FIX LINK FIELD DROPDOWN
		===================================================== */

		.awesomplete {
			position: relative !important;
			width: 100% !important;
		}

		.awesomplete ul {
			position: absolute !important;
			top: calc(100% + 6px) !important;
			left: 0 !important;
			right: 0 !important;
			width: 100% !important;

			background: #ffffff !important;
			border: 1px solid #d1d5db !important;
			border-radius: 14px !important;

			box-shadow: 0 12px 32px rgba(0,0,0,0.14) !important;

			padding: 6px !important;
			margin: 0 !important;

			max-height: 240px !important;
			overflow-y: auto !important;

			z-index: 9999 !important;
		}

		/* DROPDOWN ITEMS */

		.awesomplete ul li {
			padding: 12px 14px !important;
			border-radius: 10px !important;
			font-size: 13px !important;
			font-weight: 600 !important;
			color: #1e293b !important;
			cursor: pointer !important;
			transition: all 0.2s ease !important;
		}

		/* HOVER */

		.awesomplete ul li:hover,
		.awesomplete ul li[aria-selected="true"] {
			background: #eff6ff !important;
			color: #2563eb !important;
		}

		/* PREVENT FORM CUTTING */

		.layout-main-section,
		.form-section,
		.section-body,
		.form-column,
		.form-layout {
			overflow: visible !important;
		}

		/* INPUT FIX */

		.control-input input,
		.control-input .input-with-feedback {
			position: relative !important;
			z-index: 1 !important;
		}

		/* ACTIVE FIELD ABOVE OTHERS */

		.frappe-control:focus-within {
			z-index: 20 !important;
			position: relative !important;
		}

		/* CARD FIX */

		.form-group {
			overflow: visible !important;
		}

		/* GRID HEADER */

		.grid-heading .grid-row-head th {
			background: linear-gradient(135deg,#0f172a,#1e293b) !important;
			color: #ffffff !important;
			font-weight: 700 !important;
		}

		/* BUTTON */

		.btn-primary {
			background: linear-gradient(135deg,#2563eb,#1d4ed8) !important;
			border: none !important;
			border-radius: 14px !important;
			font-weight: 700 !important;
			padding: 12px 22px !important;
		}

		`;

		// document.head.appendChild(custom_style);

		// =========================================
		// AWESOMPLETE DROPDOWN POSITION FIX
		// Uses MutationObserver to catch dropdown
		// the moment Frappe dynamically shows it
		// =========================================

		// Disconnect any previous observer to avoid duplicates
		if (frm._awesomplete_observer) {
			frm._awesomplete_observer.disconnect();
		}

		frm._awesomplete_observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				mutation.addedNodes.forEach(function (node) {
					if (node.nodeName === 'UL' && node.parentElement && node.parentElement.classList.contains('awesomplete')) {
						// Find the input inside this awesomplete
						const input = node.parentElement.querySelector('input');
						if (!input) return;

						const inputRect = input.getBoundingClientRect();
						const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
						const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

						// Position dropdown exactly below the input
						$(node).css({
							position:   'fixed',
							top:        inputRect.bottom + 4 + 'px',
							left:       inputRect.left + 'px',
							width:      inputRect.width + 'px',
							zIndex:     '999999',
							maxHeight:  '220px',
							overflowY:  'auto'
						});
					}
				});
			});
		});

		// Observe the entire form for dropdown appearances
		const form_wrapper = frm.wrapper || document.querySelector('.layout-main-section');
		if (form_wrapper) {
			frm._awesomplete_observer.observe(form_wrapper, {
				childList: true,
				subtree:   true
			});
		}

		// =========================================
		// APPLY CARD STYLES TO ALL FIELDS
		// =========================================

		let index = 0;

		Object.keys(frm.fields_dict).forEach(fieldname => {

			const field = frm.get_field(fieldname);
			if (!field || !field.$wrapper) return;

			if (["Section Break", "Column Break", "Tab Break", "HTML","Button","Table"].includes(field.df.fieldtype)) return;

			const palette = color_palette[index % color_palette.length];
			index++;

			// Card wrapper
			field.$wrapper.css({
				background:    palette.bg,
				borderLeft:    `7px solid ${palette.border}`,
				borderRadius:  '20px',
				padding:       '20px',
				marginBottom:  '24px',
				boxShadow:     `0 8px 24px ${palette.glow}`,
				transition:    'all 0.3s ease',
				position:      'relative',
				zIndex:        '1',
				overflow:      'visible'
			});

			// Inputs
			field.$wrapper.find('input, select, textarea').css({
				border:     `1px solid ${palette.border}`,
				borderRadius: '14px',
				background:  '#ffffff',
				minHeight:   '48px',
				fontWeight:  '600',
				padding:     '12px 14px',
				boxShadow:   'inset 0 1px 3px rgba(0,0,0,0.04)'
			});

			// Label
			const label = field.$wrapper.find('.control-label');
			label.text(field_labels[fieldname] || field.df.label || fieldname);
			label.css({
				fontSize:      '13px',
				fontWeight:    '800',
				color:         palette.border,
				textTransform: 'uppercase',
				letterSpacing: '2px',
				marginBottom:  '12px'
			});
			if (field.df.fieldtype === "Link") {

				field.$wrapper.css({
					zIndex: "20"
				});

				field.$wrapper.find('.awesomplete').css({
					position: "relative",
					zIndex: "30"
				});

				field.$wrapper.find('.awesomplete ul').css({
					zIndex: "9999"
				});

			}
			// Hover effect
			field.$wrapper.hover(
				function () {
					$(this).css({
						transform:  'translateY(-4px)',
						boxShadow:  `0 14px 32px ${palette.glow}`
					});
				},
				function () {
					$(this).css({
						transform:  'translateY(0px)',
						boxShadow:  `0 8px 24px ${palette.glow}`
					});
				}
				
			);
		});

		// =========================================
		// ASSESSOR QUERY
		// =========================================

		frm.set_query("assessor", function () {
			return {
				query: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.get_unit_heads"
			};
		});
		frm.set_query("appraisal_cycle", function () {
			
			return {
				filters :{
					"custom_performance_review_cycle":frm.doc.performance_review_cycle
				}
			};
		});
		

	},
	// unit(frm){
		
	// 	frappe.call({
	// 		method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.update_assessor",
	// 		args: { assessor: frm.doc.assessor, unit: frm.doc.unit, employee: frm.doc.employee },
	// 		callback: function (r) { if (r.message) frappe.msgprint(r.message); }
	// 	});
	// },
	unit(frm) {

		if (!frm.doc.unit) return;
			let filters = {
				status: "Active",
			};
			filters.custom_unit = frm.doc.unit;
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Employee",
					fields: ["name", "employee_name","custom_gec_no","reports_to","custom_unit"],
					filters: filters
				},
				callback: function(res) {
					if (res.message) {

						// Clear existing rows
						frm.clear_table("employees");

						// Add rows
						let total = res.message.length;
						let completed = 0;
						res.message.forEach(emp => {

							
							frappe.call({
								method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.get_data",
								args: {
									'reports_to':emp.reports_to,
									'employee': emp.name

								},
								callback: function(res) {
									console.log(res)
									let row = frm.add_child("employees");
									row.employee = emp.name;
									row.assessee_gec = emp.custom_gec_no;
									row.assessee_name = emp.employee_name;
									row.assessor_id = emp.reports_to;
									row.assessor_gec = res.message[0];
									row.assessor_name = res.message[1];
									row.trade_unit = emp.custom_unit;
									row.remarks = res.message[2];
									row.appraisal_status = res.message[3];
									completed++;

					
									if (completed === total) {
										frm.refresh_field("employees");
										frm.save();
													
									}		
								}
								
							})
							
							
						
							

						});
						
						
					}
					
				}
			});

	},
	employee(frm) {

		if (!frm.doc.employee) return;
			let filters = {
				status: "Active",
			};
			filters.name = frm.doc.employee;
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Employee",
					fields: ["name", "employee_name","custom_gec_no","reports_to","custom_unit"],
					filters: filters
				},
				callback: function(res) {
					if (res.message) {

						// Clear existing rows
						frm.clear_table("employees");

						// Add rows
						let total = res.message.length;
						let completed = 0;
						res.message.forEach(emp => {

							
							frappe.call({
								method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.get_data",
								args: {
									'reports_to':emp.reports_to,
									'employee': emp.name

								},
								callback: function(res) {
									console.log(res)
									let row = frm.add_child("employees");
									row.employee = emp.name;
									row.assessee_gec = emp.custom_gec_no;
									row.assessee_name = emp.employee_name;
									row.assessor_id = emp.reports_to;
									row.assessor_gec = res.message[0];
									row.assessor_name = res.message[1];
									row.trade_unit = emp.custom_unit;
									row.remarks = res.message[2];
									row.appraisal_status = res.message[3];
									completed++;

					
									if (completed === total) {
										frm.refresh_field("employees");
										frm.save();
													
									}		
								}
								
							})
							
							
						
							

						});
						
						
					}
					
				}
			});

	},
	assessor(frm) {

		if (!frm.doc.assessor) return;
			let filters = {
				status: "Active",
			};
			filters.reports_to = frm.doc.assessor;
			frappe.call({
				method: "frappe.client.get_list",
				args: {
					doctype: "Employee",
					fields: ["name", "employee_name","custom_gec_no","reports_to","custom_unit"],
					filters: filters
				},
				callback: function(res) {
					if (res.message) {

						// Clear existing rows
						frm.clear_table("employees");

						// Add rows
						let total = res.message.length;
						let completed = 0;
						res.message.forEach(emp => {

							
							frappe.call({
								method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.get_data",
								args: {
									'reports_to':emp.reports_to,
									'employee': emp.name

								},
								callback: function(res) {
									console.log(res)
									let row = frm.add_child("employees");
									row.employee = emp.name;
									row.assessee_gec = emp.custom_gec_no;
									row.assessee_name = emp.employee_name;
									row.assessor_id = emp.reports_to;
									row.assessor_gec = res.message[0];
									row.assessor_name = res.message[1];
									row.trade_unit = emp.custom_unit;
									row.remarks = res.message[2];
									row.appraisal_status = res.message[3];
									completed++;

					
									if (completed === total) {
										frm.refresh_field("employees");
										frm.save();
													
									}		
								}
								
							})
							
							
						
							

						});
						
						
					}
					
				}
			});

	},
	appraisal_template(frm) {

		if (!frm.doc.appraisal_template) return;

		frappe.call({
			method: "frappe.client.get",
			args: {
				doctype: "Appraisal Template",
				name: frm.doc.appraisal_template
			},
			callback: function(r) {

				if (r.message) {

					let template = r.message;

					let filters = {
						status: "Active",
						grade: template.custom_grade
					};

					if (["A1", "A2", "A3", "A4"].includes(template.custom_grade)) {
						filters.custom_unit = "Worker";
					} else {
						filters.custom_unit = template.custom_unit;
					}

					frappe.call({
						method: "frappe.client.get_list",
						args: {
							doctype: "Employee",
							fields: ["name", "employee_name","custom_gec_no","reports_to","custom_unit"],
							filters: filters
						},
						callback: function(res) {
							if (res.message) {

								// Clear existing rows
								frm.clear_table("employees");

								// Add rows
								let total = res.message.length;
								let completed = 0;
								res.message.forEach(emp => {

									
									frappe.call({
										method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.get_data",
										args: {
											'reports_to':emp.reports_to,
											'employee': emp.name

										},
										callback: function(res) {
											console.log(res)
											let row = frm.add_child("employees");
											row.employee = emp.name;
											row.assessee_gec = emp.custom_gec_no;
											row.assessee_name = emp.employee_name;
											row.assessor_id = emp.reports_to;
											row.assessor_gec = res.message[0];
											row.assessor_name = res.message[1];
											row.trade_unit = emp.custom_unit;
											row.remarks = res.message[2];
											row.appraisal_status = res.message[3];
											completed++;

							
											if (completed === total) {
												frm.refresh_field("employees");
												frm.save();
															
											}		
										}
										
									})
									
									
								
									

								});
								
								
							}
							
						}
					});

				}
			}
		});
	},
	assessor_change(frm) {


	let selected_rows = frm.doc.employees.filter(row => row.__checked);
	console.log(selected_rows)

	if (!selected_rows.length) {
		frappe.msgprint(__("Please select at least one row"));
		return;
	}

	let completed = 0;
let messages = [];

selected_rows.forEach((row, index) => {

	frappe.call({
		method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.update_assessor",
		freeze: true,
		freeze_message: __("Updating assessor, please wait..."),
		args: {
			assessor: row.assessor_id,
			unit: row.trade_unit,
			employee: row.employee,
			remarks:row.remarks,
		},
		callback: function(r) {

			completed++;

			if (r.message) {
				console.log(r.message)
				messages.push(
					`${r.message}`
				);
			}

			if (completed === selected_rows.length) {

				// frm.save();

				frappe.msgprint({
					title: __("Update Status"),
					indicator: "green",
					message: messages.join("<br><br>")
				});
			}
		}
	});

});

},
	// assessor_change(frm) {
	// 	if (!frm.doc.assessor) {
	// 		frappe.msgprint(__("Please select Assessor"));
	// 		return;
	// 	}
	// 	frappe.call({
	// 		method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.update_assessor",
	// 		args: { assessor: frm.doc.assessor, unit: frm.doc.unit, employee: frm.doc.employee },
	// 		callback: function (r) { if (r.message) frappe.msgprint(r.message); }
	// 	});
	// },

	restrict_access(frm) {
		if (frm.doc.restrict_access) {
			frappe.msgprint(__("Appraisal access will be locked after deadline."));
		}
	},

	appraisal_cycle(frm) {
		const year = frappe.datetime.get_today().substring(0, 4);
		if (frm.doc.appraisal_cycle === "Annual Review") {
			frm.set_value("rollout_date", year + "-11-15");
			frm.set_value("locking_date", year + "-12-31");
		} else if (frm.doc.appraisal_cycle === "Semi-Annual Review") {
			frm.set_value("rollout_date", year + "-06-16");
			frm.set_value("locking_date", year + "-07-15");
		}
	},

});
frappe.ui.form.on('Assessor Change', {
	employee(frm,cdt,cdn){
		var child = locals[cdt][cdn];				
		frappe.call({
			method: "pms_ai.pms.doctype.appraisal_settings.appraisal_settings.get_appraisal_data",
			args: {
				'employee': child.employee

			},
			callback: function(res) {
				
				child.assessor_gec = res.message[0];
				child.assessor_name = res.message[1];
				
				child.remarks = res.message[2];
				child.appraisal_status = res.message[3];
				frm.refresh_field("employees");
				frm.save();
								
						
			}
			
		})
	},

})