import frappe
import google.generativeai as genai
import json

@frappe.whitelist()
def generate_individual_insights(docname):
    # 1. Fetch the submitted Appraisal Document
    doc = frappe.get_doc("Appraisal", docname)

    # 2. Extract Competency Data
    # Adjust 'competencies' to your actual child table fieldname, 
    # and 'competency_name'/'score' to the fields inside that table.
    competency_data = []
    if hasattr(doc, 'goals'):
        for row in doc.goals:
            competency_data.append(f"- {row.kra}: {row.score_earned}/5")
    
    competency_text = "\n".join(competency_data)

    if not competency_text:
        return "No competencies found to analyze." # Exit if there are no competencies to analyze

    # 3. Connect to Gemini
    api_key = frappe.conf.get("gemini_api_key")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')

    # 4. The Prompt (Asking for HTML formatting for the Text Editor)
    prompt = f"""
    You are an Expert HR Coach and UI Designer. Analyze the following performance review competencies for {doc.employee_name} (Role: {doc.designation}).
    
    Scores (Out of 5):
    {competency_text}
    Overall Score: {doc.total_score}
    
    Write a constructive performance summary using strictly formatted HTML (do NOT use markdown backticks like ```html).
    
    You MUST structure the HTML exactly like this:
    
    1. Score Badge: At the very top, create a visually appealing badge using inline CSS showing their overall score. 
       - If the score is >= 4, use a green background (#d4edda) and dark green text (#155724).
       - If the score is between 2.5 and 3.9, use a yellow background (#fff3cd) and dark yellow text (#856404).
       - If the score is < 2.5, use a red background (#f8d7da) and dark red text (#721c24).
       Example: <div style="display: inline-block; padding: 8px 15px; border-radius: 20px; font-weight: bold; font-size: 16px; background-color: #d4edda; color: #155724;">Overall Rating: {doc.total_score} / 5 🏆</div>

    2. Executive Summary: A short, 2-sentence professional summary of their performance.

    3. Top Strengths (Good Areas): Create a list of their highest-scoring areas. Use the ⭐ or 🚀 emoji as the bullet point icon. Highlight the competency name in bold.

    4. Areas for Growth (Weaker Areas): Create a list of their lowest-scoring areas. Use the 🎯 or 🛠️ emoji as the bullet point icon. Highlight the competency name in bold.

    5. Recommended Next Steps: Provide 3 specific, actionable Learning & Development (L&D) recommendations based on the weaker areas. Use the 💡 emoji for these bullet points.
    
    Keep the CSS clean and simple so it renders well in a standard Rich Text Editor.
    """

    try:
        response = model.generate_content(prompt)
        ai_html = response.text.replace("```html", "").replace("```", "").strip()

        # 5. Save the response to the submitted document
        # We MUST use db_set here because doc.save() is not allowed on Submitted (docstatus=1) documents.
        frappe.db.set_value("Appraisal", docname, "ai_insights", ai_html)
        frappe.db.commit()

        return "Success"

    except Exception as e:
        frappe.log_error(title=f"AI Insight Error for {docname}", message=str(e))
        return f"Error: {str(e)}"
        
@frappe.whitelist()
def get_kras_from_gemini(department):
    # Fetch API key securely from site_config.json
    api_key = frappe.conf.get("gemini_api_key")
    if not api_key:
        frappe.throw("Please configure 'gemini_api_key' in site_config.json")

    # Initialize Gemini
    genai.configure(api_key=api_key)
    
    # Try using 'gemini-1.5-flash-latest'. If this still throws a 404, 
    # change this string to 'gemini-pro' as a fallback.
    model = genai.GenerativeModel('gemini-2.5-flash') 

    # Strict prompt to force a clean JSON array response
    prompt = f"""
    You are an expert HR Consultant. 
    Generate 5 standard Key Result Areas (KRAs) for the {department} department. 
    Return ONLY a valid JSON array of strings, with no markdown, no introduction, and no explanation.
    Example format: ["Ensure System Uptime", "Reduce Server Costs"]
    """

    try:
        response = model.generate_content(prompt)
        text = response.text.replace("```json", "").replace("```", "").strip()
        kras = json.loads(text)
        return kras
    except Exception as e:
        # FIX: We removed 'response.text' from the logger so it won't crash if the API fails
        error_message = f"Gemini API Error: {str(e)}"
        frappe.log_error(title="Gemini API Error", message=error_message)
        frappe.throw(f"Failed to generate KRAs from AI. Error: {str(e)}")

@frappe.whitelist()
def save_generated_kras(kras, department):
    kras_list = json.loads(kras)
    created_names = []
    
    for kra_title in kras_list:
        # Assuming your KRA DocType is named "KRA" and has 'title' and 'department' fields
        # Adjust fieldnames to match your exact DocType structure
        doc = frappe.get_doc({
            "doctype": "KRA", 
            "title": kra_title,
            "department": department
        })
        doc.insert(ignore_permissions=True)
        created_names.append(doc.name)
        
    return created_names

@frappe.whitelist()
def analyze_dashboard_chart(chart_context, chart_data):
    # Parse the data string back into a dictionary
    data = json.loads(chart_data)
    
    api_key = frappe.conf.get("gemini_api_key")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # Tell Gemini what context it is looking at based on the chart
    if chart_context == "completion_status":
        prompt_instruction = "Analyze the ratio of completed vs pending appraisals. Identify if the completion rate is healthy or if there are bottlenecks."
    elif chart_context == "bell_curve":
        prompt_instruction = "Analyze this 5-point performance distribution. Does it look like a healthy normal distribution? Identify if managers are being too lenient (skewed right) or too harsh (skewed left)."
    elif chart_context == "daily_trend":
        prompt_instruction = "Analyze the daily pacing of appraisal submissions. Note any sudden spikes or long lulls that indicate low engagement."
    elif chart_context == "nine_box":
        prompt_instruction = "Analyze this 9-box talent matrix distribution. Identify if we have a healthy pipeline of future leaders (High Potential/Outstanding Perf) and note the risk of underperformers. Provide succession planning recommendations."
    elif chart_context == "ageing_insights":
        prompt_instruction = """
            Analyze the appraisal ageing data and provide grouped HR action recommendations.

            Objective:
            - Do not generate employee-wise recommendations.
            - Do not mention every employee individually.
            - Identify common delay patterns and recommend bulk actions.
            - Act as an HR Operations Advisor.

            Focus on:
            - Group employees by common issues such as workflow status, ageing range, unit, grade, or responsible role.
            - Recommend actions for employee groups instead of individuals.
            - Identify process bottlenecks causing appraisal delays.
            - Suggest operational improvements to reduce ageing.
            - Highlight only exceptional cases requiring immediate escalation.

            Grouping rules:
            - If multiple employees have the same status, combine them into one recommendation.
            - If multiple units have similar issues, provide one common action.
            - Mention employee names only for critical ageing outliers or severe escalation cases.
            - Avoid repeating similar recommendations.

            Decision guidance:
            - Draft status:
            Recommend automated reminders, completion deadlines, and manager follow-up.

            - Pending for Assessor:
            Recommend assessor reminders, SLA enforcement, and escalation workflow.

            - Long ageing duration:
            Recommend HR intervention and leadership escalation.

            - Repeated delays:
            Recommend process review, training, or workflow improvements.

            Requirements:
            - Return HTML bullet points using only <ul> and <li> tags.
            - Generate maximum 4-5 bullet points.
            - Each bullet must represent a unique recommendation.
            - Highlight important statuses, units, risks, ageing groups, and actions using <strong>HTML tags</strong>.
            - Do not list employees one by one.
            - Do not duplicate similar suggestions.
            - Keep recommendations concise, strategic, and actionable.
            - Do not use markdown, headings, tables, or code blocks.
        """
    elif chart_context == "low_performance_insights":
        prompt_instruction = """
            Analyze the low performer data and provide grouped HR action recommendations.

            Objective:
            - Do not summarize employee counts or performance distribution.
            - Do not generate employee-wise recommendations.
            - Do not mention every employee individually.
            - Act as an HR Performance Advisor and recommend improvement actions.

            Focus on:
            - Group employees by common performance issues such as performance band, score severity, unit, grade, or improvement requirement.
            - Recommend actions for employee groups instead of individuals.
            - Identify performance trends, capability gaps, and areas needing HR intervention.
            - Suggest training, coaching, mentoring, role support, or performance improvement actions.
            - Identify groups requiring re-evaluation before strict decisions.
            - Highlight only critical performers requiring immediate attention.
            - Provide practical next steps for HR managers and leadership.

            Grouping rules:
            - If multiple employees fall under the same performance category, combine them into one recommendation.
            - If multiple departments have similar performance issues, provide one common improvement plan.
            - Mention employee names only for extreme performance risks requiring urgent intervention.
            - Avoid repeating the same recommendation for multiple employees.

            Decision guidance:

            - Immediate PIP:
            Recommend structured Performance Improvement Plans, manager discussions,
            root cause analysis, skill gap identification, coaching, and measurable improvement goals.
            Recommend separation review only if there is no improvement after the PIP period.

            - Review Required:
            Recommend targeted training, mentoring, workload assessment,
            manager feedback sessions, and performance re-evaluation.

            - Monitor:
            Recommend continuous observation, periodic check-ins,
            feedback sessions, and preventive support.

            - Department performance issues:
            Recommend skill development programs, manager review,
            resource evaluation, or process improvements.

            Requirements:
            - Return HTML bullet points using only <ul> and <li> tags.
            - Generate maximum 4-5 bullet points.
            - Each bullet must contain one unique HR recommendation.
            - Highlight important bands, departments, risks, and actions using <strong>HTML tags</strong>.
            - Do not list employees one by one.
            - Do not duplicate similar suggestions.
            - Focus on improvement actions, not reporting numbers.
            - Keep recommendations professional, concise, and HR-oriented.
            - Do not use markdown, headings, tables, or code blocks.
        """
        
    elif chart_context == "high_performance_insights":
        prompt_instruction = """
            Analyze the high performer data and provide grouped HR talent recommendations.

            Objective:
            - Do not summarize employee scores or ranking data.
            - Do not generate employee-wise appreciation messages.
            - Do not mention every employee individually.
            - Act as an HR Talent Management Advisor and recommend actions for retaining and developing top performers.

            Focus on:
            - Group employees by common strengths such as performance band, score range, unit, grade, or leadership potential.
            - Recommend actions for employee groups instead of individuals.
            - Identify high-potential talent groups requiring recognition, growth opportunities, or career development.
            - Suggest rewards, promotions, succession planning, mentoring roles, or leadership development programs.
            - Highlight retention strategies for critical performers.
            - Identify departments or grades showing strong performance capability.
            - Recommend ways to use top performers to improve overall organizational performance.

            Grouping rules:
            - If multiple employees belong to the same high-performance category, combine them into one recommendation.
            - If multiple units show strong performers, provide one common talent strategy.
            - Mention employee names only for exceptional cases requiring leadership attention or succession planning.
            - Avoid repeating similar recommendations.

            Decision guidance:

            - Exceptional performers:
            Recommend recognition programs, career growth discussions,
            leadership opportunities, succession planning, and retention actions.

            - Consistent high performers:
            Recommend advanced skill development, mentoring responsibilities,
            challenging assignments, and future leadership preparation.

            - High-performing units:
            Recommend studying successful practices and sharing them across departments.

            - Critical talent:
            Recommend engagement discussions, retention planning,
            and career progression opportunities.

            Requirements:
            - Return HTML bullet points using only <ul> and <li> tags.
            - Generate maximum 4-5 bullet points.
            - Each bullet must contain one unique HR recommendation.
            - Highlight important bands, units, talent groups, opportunities, and actions using <strong>HTML tags</strong>.
            - Do not list employees one by one.
            - Do not duplicate similar suggestions.
            - Focus on talent development actions, not reporting numbers.
            - Keep recommendations professional, concise, and HR-oriented.
            - Do not use markdown, headings, tables, or code blocks.
        """
    
    elif chart_context == "unit_completion_insights":
        prompt_instruction = """
            Analyze the appraisal completion status across business units and provide actionable HR and management recommendations.

            Objective:
            - Focus on appraisal completion performance at the unit level.
            - Identify units with strong completion performance and units requiring management attention.
            - Do not simply repeat the numbers provided.
            - Do not generate employee-level analysis.
            - Act as an HR Performance Governance Advisor.

            Focus on:
            - Units demonstrating strong appraisal execution and process discipline.
            - Units showing low completion rates, delayed appraisals, or execution bottlenecks.
            - Organizational risks caused by pending appraisals.
            - Areas where leadership intervention may be required.
            - Opportunities to improve appraisal completion across departments.
            - Accountability, communication, and performance management effectiveness.

            Decision Guidance:

            - High completion units:
            Recommend recognizing managers and teams that maintain appraisal discipline,
            documenting best practices, and sharing successful approaches across the organization.

            - Moderate completion units:
            Recommend targeted follow-up, progress monitoring,
            and support from HR business partners.

            - Low completion units:
            Recommend immediate management review,
            escalation plans, accountability measures,
            and dedicated completion campaigns.

            - Units with significant pending appraisals:
            Highlight risks related to performance reviews,
            employee development planning,
            compensation decisions,
            and succession planning.

            - Organization-wide:
            Recommend governance mechanisms,
            dashboard monitoring,
            leadership reviews,
            and periodic completion checkpoints.

            Requirements:
            - Return HTML bullet points using only <ul> and <li> tags.
            - Generate 4-5 concise recommendations.
            - Each bullet must contain one unique management or HR action.
            - Highlight important units, performance categories, risks, and actions using <strong>HTML tags</strong>.
            - Group similar units together where appropriate.
            - Avoid repeating completion percentages or raw counts excessively.
            - Focus on business impact and recommended actions rather than reporting statistics.
            - Keep recommendations professional, concise, and executive-oriented.
            - Do not use markdown, headings, tables, or code blocks.
            - Prioritize actionable insights over descriptive observations.
        """
    
    elif chart_context == "unit_competency_insight":
        prompt_instruction = """
            Analyze the competency assessment data and provide strategic HR and capability development recommendations.

            Objective:
            - Act as an HR Capability Development and Talent Management Advisor.
            - Focus on organizational competency maturity and assessment effectiveness.
            - Do not simply summarize competency scores.
            - Do not list every competency individually.
            - Do not generate employee-level recommendations.

            Focus on:
            - Competencies with strong demonstrated capability levels.
            - Competencies showing significant development gaps.
            - Areas where assessor participation or assessment completion appears weak.
            - Differences between self-assessment and assessor evaluation trends.
            - Critical technical, operational, leadership, or behavioral competencies requiring attention.
            - Organizational capability risks that may impact performance, project delivery, safety, quality, or business growth.

            Grouping Guidance:
            - Group similar competencies into common capability themes.
            - Combine operational competencies, technical competencies, leadership competencies, business competencies, and behavioral competencies where appropriate.
            - Avoid creating separate recommendations for every competency.
            - Focus on organizational capability patterns rather than individual competency names.

            Decision Guidance:

            - Low assessor coverage:
            Recommend manager accountability, assessment completion campaigns,
            calibration sessions, and stronger evaluation governance.

            - Critical operational competency gaps:
            Recommend targeted technical training, certification programs,
            coaching, and knowledge-transfer initiatives.

            - Behavioral competency gaps:
            Recommend leadership development, communication training,
            culture-building initiatives, and employee engagement programs.

            - Strong competency areas:
            Recommend leveraging internal subject matter experts,
            mentoring programs, and best-practice sharing across units.

            - Large self vs assessor differences:
            Recommend calibration discussions, assessment standardization,
            manager coaching, and evaluation consistency reviews.

            - Strategic capability risks:
            Highlight competencies that could impact operational excellence,
            project execution, quality, safety, compliance, or business sustainability.

            Requirements:
            - Return HTML bullet points using only <ul> and <li> tags.
            - Generate 4-5 concise recommendations.
            - Each bullet must contain one unique capability-development action.
            - Highlight important competency groups, capability risks, strengths, and actions using <strong>HTML tags</strong>.
            - Focus on organizational capability improvement rather than reporting statistics.
            - Avoid repeating similar recommendations.
            - Do not list all competencies individually.
            - Keep recommendations professional, concise, and executive-oriented.
            - Do not use markdown, headings, tables, or code blocks.
        """
    
    elif chart_context == "unit_competency_gap_insight":
        prompt_instruction = """
            Analyze the competency gap analysis data and provide strategic capability development recommendations.

            Objective:
            - Act as an HR Capability Development and Workforce Planning Advisor.
            - Focus on competency gaps between high-performing and low-performing employee groups.
            - Identify competencies that differentiate strong performers from weak performers.
            - Do not simply repeat competency scores or gap values.
            - Do not generate employee-level recommendations.
            - Do not list every competency individually.

            Focus on:
            - Competencies with the largest performance gaps.
            - Skills and behaviors strongly associated with top performers.
            - Competencies requiring urgent development among low performers.
            - Critical operational, technical, project management, leadership, and business competencies.
            - Organizational capability risks created by competency gaps.
            - Opportunities to improve overall workforce capability.

            Grouping Guidance:
            - Group similar competencies into capability themes.
            - Combine project management, governance, planning, design, estimation, and technical competencies where appropriate.
            - Combine behavioral competencies such as integrity, respect, communication, simplicity, and continuous improvement into common recommendations.
            - Avoid generating one recommendation per competency.

            Decision Guidance:

            - Large competency gaps:
            Recommend targeted development programs, coaching plans,
            structured learning paths, and competency certification initiatives.

            - Technical capability gaps:
            Recommend technical training, mentoring by top performers,
            knowledge-transfer sessions, and practical project assignments.

            - Project and operational capability gaps:
            Recommend project exposure, cross-functional assignments,
            governance training, and operational excellence initiatives.

            - Behavioral competency gaps:
            Recommend leadership coaching, communication development,
            employee engagement initiatives, and culture-building programs.

            - Strong performer competencies:
            Recommend using top performers as mentors, trainers,
            subject matter experts, and capability champions.

            - Strategic workforce capability:
            Highlight competencies that should be prioritized for future talent development and succession planning.

            Requirements:
            - Return HTML bullet points using only <ul> and <li> tags.
            - Generate 5-7 concise recommendations.
            - Each bullet must contain one unique development action.
            - Highlight important competency groups, risks, strengths, and actions using <strong>HTML tags</strong>.
            - Focus on capability-building actions rather than reporting statistics.
            - Avoid repeating similar recommendations.
            - Keep recommendations professional, concise, and executive-oriented.
            - Do not use markdown, headings, tables, or code blocks.
        """
        
    elif chart_context == "unit_low_high_performance_tracker_insights":
        prompt_instruction = """
            Analyze the Unit High / Low Performance Tracker and provide a concise executive summary in 2–4 paragraphs.

            Requirements:
            - Highlight the overall workforce distribution across performance bands (Top, Strong, Middle, Low, and Critical/PIP).
            - Identify units with the strongest performance profile based on average score, Top Talent concentration (A ≥ 4), and low percentage of poor performers (D+E).
            - Identify units that require immediate management attention due to low average scores, high concentration of D/E performers, or absence of top performers.
            - Call out units with significant performance polarization (simultaneously having notable top performers and large low-performing populations).
            - Compare high-performing units against struggling units and explain the potential organizational impact.
            - Highlight risks related to succession strength, productivity, capability gaps, retention of top talent, and workforce effectiveness.
            - Provide actionable recommendations such as targeted coaching, performance improvement plans (PIP), leadership interventions, capability-building programs, talent mobility, and succession planning.
            - Focus on trends, outliers, and management implications rather than repeating every data point.
            - Maintain an executive-level, insight-driven tone suitable for leadership review.

            Output Guidelines:
            - Write 2–4 well-structured paragraphs.
            - Use clear business language.
            - Emphasize both strengths and risks across units.
            - End with a brief leadership action summary.
        """
        
    elif chart_context == "unit_historical_performance":
        prompt_instruction = """
            Analyze the Historical Performance Tracking data and provide an executive summary using structured bullet points.

            Requirements:
            - Start with an Overall Performance Trend section summarizing year-over-year movement in average scores, top performer percentage (A+B), and low performer percentage (D+E).
            - Highlight the best-performing years and the weakest-performing years based on grade distribution and average score.
            - Identify significant shifts in workforce performance, including sudden improvements or declines between consecutive years.
            - Comment on changes in the proportion of A-grade employees versus middle-performing (C) and low-performing (D+E) employees.
            - Highlight any evidence of rating inflation, performance normalization, or tightening of appraisal standards.
            - Assess organizational risks related to declining top talent concentration, increasing low performers, or workforce capability gaps.
            - Identify positive recovery trends where performance metrics improve after a decline.
            - Focus on strategic implications for leadership, workforce planning, succession strength, and talent development.
            
            Guidelines:
            - Use 3 to 4 concise executive-level bullet points.
            - Highlight trends, anomalies, and business implications rather than repeating all data values.
            - Focus on insights that help leadership understand workforce performance evolution over time.
            - Keep the summary action-oriented and suitable for management review.
        """
        
    elif chart_context == "unit_assessor_effectiveness":
        prompt_instruction = """
        Act as a senior Performance Management and Talent Development consultant.

        Based on the Assessor Effectiveness Dashboard, provide strategic recommendations to improve assessment quality, calibration consistency, evaluator capability, and overall appraisal effectiveness.

        Requirements:
        - Do NOT summarize, repeat, or explain the data.
        - Do NOT mention specific metrics unless necessary to justify a recommendation.
        - Focus on what management should do next to improve the appraisal process.
        - Suggest practical actions that can be implemented in the next appraisal cycle.
        - Cover areas such as:
            • Assessor capability development
            • Calibration governance
            • Rating consistency
            • Feedback quality
            • Performance culture
            • Assessment fairness
            • Manager accountability
            • Talent identification accuracy
            • Continuous improvement mechanisms

        Return only valid HTML.

        Format:
        <ul>
            <li><b>Recommendation:</b> ...</li>
            <li><b>Recommendation:</b> ...</li>
            <li><b>Recommendation:</b> ...</li>
        </ul>

        Guidelines:
        - Maximum 6 recommendations.
        - Keep each recommendation concise and actionable.
        - Focus on improvement opportunities rather than findings.
        - Use <b> tags for key actions, processes, and governance measures.
        - No headings.
        - No markdown.
        - No emojis.
        """
    
    elif chart_context == "unit_learning_development":
        prompt_instruction = """
            You are analyzing Learning & Development data from an appraisal system.

The data contains three sections:
1. summary — overall KPI counts (critical gaps, moderate gaps, training needed, effectiveness rate)
2. competencyGaps — per-competency breakdown with avg self score, avg assessor score, gap to target (5.0), severity (critical/moderate/low), and whether employees self-inflated their scores
3. unitEffectiveness — per-unit completion and L&D effectiveness rates

Key context:
- Scores are out of 5.0. Gap = 5.0 minus avg assessor score.
- Severity: critical = avg assessor ≤ 2.0, moderate = 2.0–3.0, low = above 3.0
- Self-inflated = employee rated themselves higher than the assessor
- Very low assessor scores (< 0.5) across many employees may indicate assessors have not completed scoring yet, not that employees performed poorly

Requirements:
- Do NOT list all competencies or repeat raw numbers
- Split recommendations into three groups: Low Performers, High Performers, Assessor/System Issues
- Identify the top 2-3 competency themes needing urgent attention
- Suggest specific interventions: coaching, mentoring, on-the-job assignments, workshops, peer learning
- Flag if assessor completion appears incomplete
- Use <b> tags for key actions

Return only valid HTML:
<div>
    <p><b>For Low Performers:</b></p>
    <ul><li><b>Action:</b> ...</li></ul>
    <p><b>For High Performers:</b></p>
    <ul><li><b>Action:</b> ...</li></ul>
    <p><b>Assessor & System Issues:</b></p>
    <ul><li><b>Action:</b> ...</li></ul>
</div>

Max 3 recommendations per group. Be specific, not generic. No markdown, no emojis.
        """
        
    elif chart_context == "unit_promotion_eligibility":
        prompt_instruction = """
        Act as a Talent Management and Succession Planning consultant.

        Provide practical actions management can take to strengthen promotion readiness, succession planning, leadership development, and talent retention.

        Requirements:
        - Do NOT summarize the data.
        - Do NOT mention employee names.
        - Do NOT use labels such as "Recommendation", "Observation", "Insight", "Impact", or "Action".
        - Write each point as a direct business recommendation.
        - Focus on future improvements and organizational capability building.
        - Highlight important actions using <b> tags.

        Return only valid HTML.

        Format:
        <ul>
            <li>...</li>
            <li>...</li>
            <li>...</li>
        </ul>

        Guidelines:
        - Maximum 6 bullet points.
        - Keep points concise and executive-friendly.
        - Use action-oriented language starting with verbs such as Develop, Establish, Implement, Create, Strengthen, Expand, Introduce, or Conduct.
        - No headings.
        - No markdown.
        - No emojis.
        """    
        
    elif chart_context == "unit_individual_increment":
        prompt_instruction = """
            Act as a Compensation and Rewards consultant.

            Provide practical actions to improve the effectiveness, fairness, and strategic impact of the organization's increment and reward process.

            Requirements:
            - Do NOT summarize the data.
            - Do NOT mention employee names.
            - Do NOT repeat scores, ratings, or increment percentages.
            - Focus on how management can strengthen compensation decisions and employee motivation.
            - Highlight important actions using <b> tags>.

            Consider:
            - Pay-for-performance practices
            - Reward differentiation
            - High performer retention
            - Internal pay equity
            - Compensation governance
            - Recognition programs
            - Career growth linkage
            - Budget optimization

            Return only valid HTML.

            Format:
            <ul>
                <li>...</li>
            </ul>

            Guidelines:
            - Maximum 6 bullet points.
            - Start each point with an action verb such as Implement, Strengthen, Develop, Establish, Introduce, or Review.
            - No headings.
            - No emojis.
            - No markdown.
        """
        
    elif chart_context == "unit_pay_for_performance":
        prompt_instruction = """
        Act as a Compensation and Performance Management consultant.

        Provide practical actions to strengthen the organization's Pay-for-Performance framework.

        Requirements:
        - Do NOT summarize or repeat the dashboard data.
        - Focus on improving reward differentiation, performance culture, talent retention, and compensation governance.
        - Suggest actions that management can implement in future appraisal and increment cycles.
        - Consider:
            • Pay-for-performance alignment
            • High performer retention
            • Reward differentiation
            • Performance accountability
            • Calibration practices
            • Internal equity
            • Recognition programs
            • Leadership ownership of performance outcomes

        Return only valid HTML.

        Format:
        <ul>
            <li>...</li>
        </ul>

        Guidelines:
        - Maximum 6 bullet points.
        - Start each point with an action verb.
        - Use <b> tags for important actions.
        - No headings.
        - No emojis.
        - No markdown.
        """
        
    elif chart_context == "unit_policy_deviation":
        prompt_instruction = """
        Act as a Performance Management and HR Governance consultant.

        Provide practical actions to improve appraisal process compliance, assessment completion rates, employee accountability, and performance management governance.

        Requirements:
        - Do NOT summarize or repeat the dashboard data.
        - Do NOT mention employee names.
        - Do NOT mention specific violation counts.
        - Focus on preventing future policy deviations and improving appraisal discipline.
        - Consider:
            • Appraisal completion compliance
            • Self-assessment participation
            • Manager accountability
            • Assessment timelines
            • Escalation mechanisms
            • Process governance
            • Employee awareness
            • Performance review discipline
            • Audit and compliance controls

        Return only valid HTML.

        Format:
        <ul>
            <li>...</li>
        </ul>

        Guidelines:
        - Maximum 6 bullet points.
        - Start each point with an action verb such as Implement, Establish, Strengthen, Introduce, Conduct, or Enforce.
        - Use <b> tags for important actions.
        - Keep recommendations concise and actionable.
        - No headings.
        - No markdown.
        - No emojis.
        """
        
    elif chart_context == "unit_compliance_status":
        prompt_instruction = """
        Act as a Performance Management Governance consultant.

        Provide practical actions to improve appraisal compliance, assessment completion rates, employee participation, and process accountability across the organization.

        Requirements:
        - Do NOT summarize or repeat the dashboard data.
        - Do NOT mention specific units, percentages, or counts.
        - Focus on improving future compliance and reducing appraisal process risks.
        - Suggest actions related to:
            • Appraisal completion discipline
            • Self-assessment participation
            • Manager accountability
            • Compliance monitoring
            • Escalation mechanisms
            • Performance review governance
            • Employee awareness and engagement
            • Workflow automation
            • Audit and compliance controls

        Return only valid HTML.

        Format:
        <ul>
            <li>...</li>
        </ul>

        Guidelines:
        - Maximum 6 bullet points.
        - Start each point with an action verb such as Implement, Establish, Strengthen, Introduce, Automate, or Conduct.
        - Use <b> tags for important actions and governance measures.
        - Keep recommendations concise, actionable, and executive-friendly.
        - No headings.
        - No markdown.
        - No emojis.
        """
        
    elif chart_context == "unit_shift_calibration":
        prompt_instruction = """
            Act as a Performance Calibration and Talent Development consultant.

            Analyze the calibration shift data and identify areas where significant rating adjustments indicate potential performance assessment, capability, or development concerns.

            Requirements:

            * Focus on actionable improvement recommendations for units with critical calibration cases.
            * Identify potential causes such as overrating, underrating, inconsistent assessments, skill gaps, insufficient evidence, unclear expectations, or performance management weaknesses.
            * Provide recommendations to improve:
            • Employee performance effectiveness
            • Goal setting and performance planning
            • Manager coaching and feedback quality
            • Competency development
            • Assessment accuracy
            • Performance monitoring
            • Development planning
            • Calibration readiness

            Return only valid HTML.

            Format:

            <ul>
                <li>...</li>
            </ul>

            Guidelines:

            * Maximum 6 bullet points.
            * Start each point with an action verb such as Strengthen, Conduct, Implement, Improve, Establish, or Develop.
            * Use <b> tags for critical actions, performance improvement measures, and development initiatives.
            * Reference units only when meaningful patterns or recurring critical calibration shifts are observed.
            * Focus on future improvement actions rather than describing the data.
            * Keep recommendations concise, practical, and executive-friendly.
            * No headings.
            * No markdown.
            * No emojis.
        """
        
    elif chart_context == "unit_9_box":
        prompt_instruction = """
            Act as a Talent Management and Succession Planning consultant.

            Analyze the 9-Box Talent Matrix distribution and provide strategic talent recommendations based on employee placement across performance and potential segments.

            Requirements:

            * Do NOT summarize or repeat the dashboard data.
            * Do NOT mention specific employee names, employee IDs, scores, counts, grades, or units.
            * Focus on workforce planning, leadership pipeline development, succession readiness, retention, capability building, and performance improvement.
            * Identify talent management priorities based on the distribution of employees across the 9-Box segments.
            * Provide recommendations related to:
            • Leadership succession planning
            • High-potential talent development
            • Critical talent retention
            • Career path acceleration
            • Future leadership readiness
            • Coaching and mentoring programs
            • Performance improvement interventions
            • Talent mobility and cross-functional exposure
            • Capability development initiatives
            • Workforce risk mitigation

            Return only valid HTML.

            Format:

            <ul>
                <li>...</li>
            </ul>

            Guidelines:

            * Maximum 6 bullet points.
            * Start each point with an action verb such as Develop, Accelerate, Strengthen, Implement, Expand, Establish, or Prioritize.
            * Use <b> tags for critical talent actions and strategic workforce initiatives.
            * Focus on future talent decisions rather than explaining the matrix.
            * Keep recommendations concise, executive-friendly, and action-oriented.
            * Include actions for both high-potential talent and employees requiring development support.
            * No headings.
            * No markdown.
            * No emojis.

        """
        
    elif chart_context == "unit_self_assessor_bar":
        prompt_instruction = """
            Act as an Organizational Development and Performance Management consultant.

            Analyze the comparison between average Self Scores and Assessor Scores across KRAs and provide strategic performance management recommendations.

            Requirements:

            * Do NOT summarize or repeat the chart data.
            * Do NOT mention specific KRA scores, averages, employee names, employee IDs, counts, grades, or units.
            * Focus on performance calibration, assessment alignment, capability development, feedback effectiveness, and evaluation consistency.
            * Identify areas where perception gaps between employees and assessors may indicate opportunities for coaching, expectation clarification, or competency strengthening.
            * Highlight organizational actions that can improve rating accuracy, performance conversations, and development planning.

            Provide recommendations related to:
            • Self-awareness and employee development
            • Performance calibration practices
            • Manager assessment consistency
            • Feedback quality and coaching effectiveness
            • Competency development programs
            • Performance expectation alignment
            • Objective measurement frameworks
            • Assessor capability building
            • Continuous performance review processes
            • Talent development planning

            Return only valid HTML.

            Format:

            <ul>
                <li>...</li>
            </ul>

            Guidelines:

            * Maximum 6 bullet points.
            * Start each point with an action verb such as Strengthen, Improve, Establish, Enhance, Implement, Standardize, Align, Develop, or Reinforce.
            * Use <b> tags for critical performance management and development initiatives.
            * Focus on strategic actions rather than describing score differences.
            * Keep recommendations concise, executive-friendly, and action-oriented.
            * Include both employee development and assessor effectiveness perspectives.
            * No headings.
            * No markdown.
            * No emojis.
        """
        
    elif chart_context == "unit_competency_radar":
        prompt_instruction = """
            Act as an Organizational Development, Leadership Effectiveness, and Competency Management consultant.

            Analyze the competency and values assessment radar comparison between Self Scores and Assessor Scores and provide strategic organizational development recommendations.

            Requirements:

            * Do NOT summarize or repeat the chart data.
            * Do NOT mention specific competencies, values, scores, averages, employee names, employee IDs, counts, grades, or units.
            * Focus on competency maturity, behavioral alignment, leadership effectiveness, assessment calibration, and workforce capability development.
            * Identify potential opportunities where differences between self-perception and assessor evaluation may require development interventions, coaching, or expectation alignment.
            * Highlight organizational actions that strengthen both technical competencies and behavioral values across the workforce.

            Provide recommendations related to:
            • Leadership capability development
            • Competency framework adoption
            • Behavioral and values reinforcement
            • Assessment calibration and consistency
            • Coaching and mentoring initiatives
            • Individual development planning
            • Workforce capability building
            • Performance and competency integration
            • Succession readiness improvement
            • Continuous learning culture

            Return only valid HTML.

            Format:

            <ul>
                <li>...</li>
            </ul>

            Guidelines:

            * Maximum 6 bullet points.
            * Start each point with an action verb such as Strengthen, Develop, Align, Enhance, Establish, Reinforce, Implement, Standardize, or Accelerate.
            * Use <b> tags for critical organizational development, leadership, and capability-building initiatives.
            * Focus on future improvement actions rather than describing competency gaps.
            * Keep recommendations concise, executive-friendly, and action-oriented.
            * Include both behavioral values and professional competency development perspectives.
            * Prioritize long-term organizational capability and leadership pipeline strengthening.
            * No headings.
            * No markdown.
            * No emojis.
            * Avoid referencing any individual competency or value directly.
        """
        
    prompt = f"""
        You are a Senior HR Performance Consultant.

        Task:
        {prompt_instruction}

        Employee performance data:
        {json.dumps(data, indent=2)}

        Output only HTML <ul><li> bullet points.
        Provide actionable HR recommendations.
        Do not summarize the dashboard.
        Do not explain the data.
        Focus on what should be done next for the employees.
    """

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        frappe.log_error("Dashboard AI Error", str(e))
        return "An error occurred while generating insights. Check the Frappe Error Logs."

@frappe.whitelist()
def generate_master_summary(dashboard_data):
    data = json.loads(dashboard_data)
    
    api_key = frappe.conf.get("gemini_api_key")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')

    prompt = f"""
    You are a Chief HR Officer analyzing the company-wide Appraisal Dashboard.
    
    Here is the aggregated data for the current cycle:
    {json.dumps(data, indent=2)}
    
    Please provide a comprehensive Executive Summary. Structure it with clear HTML headings (<h4>), bold text, and bullet points. 
    Include:
    1. Overall Health & Completion status.
    2. Rating Distribution analysis (Is it too lenient? Too harsh? Bell curve normal?).
    3. Actionable recommendations for the HR team based on this data.
    
    Output strictly in clean HTML format. Do NOT use markdown backticks like ```html.
    """

    try:
        response = model.generate_content(prompt)
        # Clean potential markdown
        ai_html = response.text.replace("```html", "").replace("```", "").strip()
        return ai_html
    except Exception as e:
        frappe.log_error("Master AI Summary Error", str(e))
        return "An error occurred while generating the master summary."

@frappe.whitelist()
def generate_kra_description(docname):
    # Fetch the document
    doc = frappe.get_doc("KRA", docname) 
    
    # Adjust "kra_title" to your actual fieldname
    kra_name = doc.get("kra_title") or doc.name 

    if not kra_name:
        return "Error: Please enter a KRA title first."

    # Connect to Gemini
    api_key = frappe.conf.get("gemini_api_key")
    genai.configure(api_key=api_key)
    
    # Using flash-latest for fast text generation
    model = genai.GenerativeModel('gemini-2.5-flash')

    # The New Plain-Text Prompt
    prompt = f"""
    You are an HR Expert. Write a concise, 1 to 2 sentence description for the following Key Result Area (KRA): "{kra_name}".
    
    The description must be plain text only. 
    Do NOT use bullet points, bolding, HTML, or any markdown formatting.
    """

    try:
        response = model.generate_content(prompt)
        # Clean any accidental markdown backticks just in case
        ai_text = response.text.replace("```text", "").replace("```", "").strip()

        # Save directly to the database
        # Adjust "KRA" and "description" to your actual DocType and fieldname
        frappe.db.set_value("KRA", docname, "description", ai_text)
        frappe.db.commit()

        return ai_text

    except Exception as e:
        frappe.log_error(title=f"KRA AI Error for {docname}", message=str(e))
        return f"Error: {str(e)}"