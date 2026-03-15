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