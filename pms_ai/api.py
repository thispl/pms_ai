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
            - Generate maximum 5-7 bullet points.
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
            - Generate maximum 5-7 bullet points.
            - Each bullet must contain one unique HR recommendation.
            - Highlight important bands, departments, risks, and actions using <strong>HTML tags</strong>.
            - Do not list employees one by one.
            - Do not duplicate similar suggestions.
            - Focus on improvement actions, not reporting numbers.
            - Keep recommendations professional, concise, and HR-oriented.
            - Do not use markdown, headings, tables, or code blocks.
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