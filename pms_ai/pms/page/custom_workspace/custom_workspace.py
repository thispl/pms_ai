import frappe
import google.generativeai as genai
import json

@frappe.whitelist()
def analyze_dashboard_chart(chart_context, chart_data):
    # Parse the data string back into a dictionary
    frappe.errprint(chart_context)
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
    # elif chart_context in ['aging_insights', 'ageing_insights']:
    else:
        prompt_instruction = """
        Analyze the 'Days Stuck' metrics for pending appraisals. 
        1. Identify if the Average Age indicates a systemic delay (e.g., >15 days).
        2. Comment on the 'Critical' (60d+) count. 
        3. Highlight specific bottlenecks from the provided list that require immediate HR intervention.
        """
    
    prompt = f"""
    You are an HR Executive Analyst. 
    
    Task: {prompt_instruction}
    
    Data provided:
    {json.dumps(data, indent=2)}
    
    Provide a concise, 2-paragraph analysis. Use a professional, consultative tone. 
    Use bullet points if highlighting specific data points. Do not include introductory text like 'Here is the analysis', just output the insights.
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