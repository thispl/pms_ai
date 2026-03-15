frappe.pages['ai-analysis'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'AI Performance Analysis',
        single_column: true
    });

    $(frappe.render_template("ai_analysis", {})).appendTo(page.body);

    page.set_primary_action(__('Generate AI Insights ✨'), function() {
        // page.set_primary_action_disabled(true);
        frappe.show_alert({message: 'Gemini is crunching the numbers...', indicator: 'blue'});

        frappe.call({
            method: 'pms_ai.pms.page.ai_analysis.ai_analysis.generate_appraisal_analysis',
            callback: function(r) {
                // page.set_primary_action_disabled(false);
                
                if (r.message) {
                    let ai = r.message;
                    let $body = $(page.body);

                    // 1. Text Inference
                    $body.find('#ai-inference-output').html(ai.inference_text.replace(/\n/g, "<br>")).show();

                    // 2. Number Cards
                    $body.find('#card-total').text(ai.cards.total_reviews);
                    $body.find('#card-top').text(ai.cards.high_performers);
                    $body.find('#card-low').text(ai.cards.low_performers);
                    $body.find('#ai-number-cards').show();

                    // 3. Gauge Chart (Using Frappe 'percentage' type)
                    new frappe.Chart($body.find('#ai-gauge-output')[0], {
                        title: "Company Health Index",
                        data: {
                            labels: ["Avg Score"],
                            datasets: [{ name: "Score", values: [ai.gauge_score] }]
                        },
                        type: 'percentage', // This renders as a half-donut gauge in Frappe
                        height: 250,
                        colors: ['#28a745']
                    });

                    // 4. Bar Chart (Department Comparison)
                    new frappe.Chart($body.find('#ai-bar-output')[0], {
                        title: "Average Score by Department",
                        data: {
                            labels: ai.bar_chart.labels,
                            datasets: [{ name: "Score", values: ai.bar_chart.values }]
                        },
                        type: 'bar',
                        height: 250,
                        colors: ['#007bff']
                    });

                    // 5. Line Chart (Performance Trends)
                    new frappe.Chart($body.find('#ai-line-output')[0], {
                        title: "Company Performance Trend",
                        data: {
                            labels: ai.line_chart.labels,
                            datasets: [{ name: "Trend", values: ai.line_chart.values }]
                        },
                        type: 'line',
                        height: 250,
                        colors: ['#6f42c1'],
                        lineOptions: {
                            regionFill: 1 // Adds a nice shaded area under the line
                        }
                    });

                    frappe.show_alert({message: 'Dashboard Generated!', indicator: 'green'});
                }
            }
        });
    });
}