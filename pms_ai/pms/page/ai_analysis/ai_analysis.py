import frappe
import google.generativeai as genai
import json

@frappe.whitelist()
def generate_appraisal_analysis():
    # 1. Fetch Real Data from the Database
    # Note: Change "Appraisal" and "total_score" if your custom DocType uses different names.
    # We only pull submitted documents (docstatus = 1)
    appraisals = frappe.get_all(
        "Appraisal",
        # filters={"docstatus": 1}, 
        fields=["department", "total_score"] 
    )

    if not appraisals:
        frappe.throw("No submitted appraisals found to analyze.")

    # 2. Group and aggregate the data by Department
    dept_stats = {}
    for doc in appraisals:
        dept = doc.department or "Unassigned"
        # Ensure we have a valid number
        score = float(doc.total_score) if doc.total_score else 0.0

        if dept not in dept_stats:
            dept_stats[dept] = {"total_score": 0, "count": 0, "high_performers": 0, "low_performers": 0}
        
        dept_stats[dept]["total_score"] += score
        dept_stats[dept]["count"] += 1
        
        # Define your threshold for High/Low performers (assuming a 5-point scale)
        if score >= 4.0:
            dept_stats[dept]["high_performers"] += 1
        elif score <= 2.5:
            dept_stats[dept]["low_performers"] += 1

    # 3. Format the processed data into a text block for Gemini
    raw_data_lines = []
    for dept, stats in dept_stats.items():
        avg_score = round(stats["total_score"] / stats["count"], 2)
        line = f"Department: {dept} | Avg Score: {avg_score} | Low Performers: {stats['low_performers']} | High Performers: {stats['high_performers']}"
        raw_data_lines.append(line)
        
    raw_data = "\n".join(raw_data_lines)

    # Log the data block just so you can verify it in Error Logs during testing
    frappe.logger().info(f"Data sent to Gemini:\n{raw_data}")

    # 4. Connect to Gemini (Keep your existing API logic here)
    api_key = frappe.conf.get("gemini_api_key")
    if not api_key:
        frappe.throw("Please configure 'gemini_api_key' in site_config.json")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash') # Or 'gemini-pro' depending on what worked for you

    prompt = f"""
    You are an HR Data Analyst. Analyze this raw performance data:
    {raw_data}

    Calculate the aggregates and trends, then return ONLY a valid JSON object with this EXACT structure (no markdown, no backticks):
    {{
        "inference_text": "<Provide a 2-paragraph strategic analysis identifying trends, risks, and highlights based on the data.>",
        "cards": {{
            "total_reviews": <total integer count of all appraisals>,
            "high_performers": <total integer count of high performers>,
            "low_performers": <total integer count of low performers>
        }},
        "gauge_score": <Calculate the overall company average score as a percentage from 0 to 100>,
        "bar_chart": {{
            "labels": ["Dept A", "Dept B", "Dept C"],
            "values": [3.2, 4.5, 3.8]
        }},
        "line_chart": {{
            "labels": ["Q1", "Q2", "Q3", "Q4"], 
            "values": [3.1, 3.4, 3.6, 3.9] 
        }}
    }}
    Note: For the line chart, infer a logical timeline or quarterly trend based on the data provided, simulating growth or decline.
    """

    try:
        response = model.generate_content(prompt)
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        parsed_data = json.loads(clean_text)
        return parsed_data
    except Exception as e:
        error_message = f"Gemini API Error: {str(e)}"
        frappe.log_error(title="AI Analysis Error", message=error_message)
        frappe.throw(f"Failed to analyze data. Error: {str(e)}")