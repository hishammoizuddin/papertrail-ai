import fitz
import os

def create_agreement():
    doc = fitz.open()
    page = doc.new_page()
    
    # Header
    page.insert_text((50, 50), "STRATEGIC PARTNERSHIP AGREEMENT", fontsize=18, fontname="helvetica", color=(0, 0, 0))
    page.insert_text((50, 80), "Date: October 15, 2025", fontsize=12)
    
    # Body
    text = """
    This Strategic Partnership Agreement ("Agreement") is entered into by and between:
    
    TechCorp Inc., a technology company headquartered in San Francisco, CA ("Client"), and
    GlobalSolutions Ltd., a consulting firm headquartered in London, UK ("Provider").
    
    WHEREAS, the Client wishes to engage the Provider for the development of the "Project Skylark" initiative;
    
    NOW, THEREFORE, the parties agree as follows:
    
    1. SCOPE OF SERVICES
    Provider agrees to deliver the software architecture and cloud infrastructure planning defined in Exhibit A.
    
    2. TIMELINE AND MILESTONES
    The project shall commence on November 1, 2025. The parties agree to the following key milestones:
    - Phase 1 (Architecture Design): Completion deadline is January 30, 2026.
    - Phase 2 (Implementation): Completion deadline is May 15, 2026.
    
    3. PAYMENT TERMS
    Client shall pay Provider a total fee of $150,000, payable in installments upon milestone completion.
    
    IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.
    
    _________________________                  _________________________
    Signed, John Smith                         Signed, Emily Davis
    CEO, TechCorp Inc.                         Director, GlobalSolutions Ltd.
    """
    
    rect = fitz.Rect(50, 100, 550, 700)
    page.insert_textbox(rect, text, fontsize=11, fontname="times-roman", align=0)
    
    if not os.path.exists("demo_documents"):
        os.makedirs("demo_documents")
        
    doc.save("demo_documents/Strategic_Partnership_Agreement.pdf")
    doc.close()
    print("Created Strategic_Partnership_Agreement.pdf")

def create_minutes():
    doc = fitz.open()
    page = doc.new_page()
    
    # Header
    page.insert_text((50, 50), "PROJECT SKYLARK - STEERING COMMITTEE MINUTES", fontsize=16, fontname="helvetica", color=(0, 0, 1))
    page.insert_text((50, 80), "Date: November 20, 2025", fontsize=12)
    page.insert_text((50, 100), "Location: Conference Room B / Zoom", fontsize=12)
    
    # Body
    text = """
    Attendees:
    - Sarah Chen (CTO, TechCorp)
    - Michael Ross (Project Manager, GlobalSolutions)
    - David Kim (Lead Architect)
    
    Agenda:
    1. Review of Phase 1 progress.
    2. Discussion of timeline adjustments.
    3. Security compliance updates.
    
    Meeting Notes:
    - Michael reported that initial database schema design took longer than anticipated due to legacy data complexity.
    - The team requested a timeline extension for Phase 1 to ensure proper integration testing.
    
    Decisions:
    - The Committee approves the extension of the Phase 1 completion deadline to February 28, 2026. Note: This supersedes the original agreement date.
    
    Action Items:
    - Sarah Chen to finalize the new security protocol specifications by December 10, 2025.
    - David Kim to schedule a deeper technical review session with the DevOps team by Nov 25, 2025.
    
    Next Meeting:
    - December 18, 2025.
    """
    
    rect = fitz.Rect(50, 130, 550, 700)
    page.insert_textbox(rect, text, fontsize=11, fontname="helvetica", align=0)
    
    if not os.path.exists("demo_documents"):
        os.makedirs("demo_documents")
        
    doc.save("demo_documents/Steering_Committee_Minutes.pdf")
    doc.close()
    print("Created Steering_Committee_Minutes.pdf")

def create_invoice():
    doc = fitz.open()
    page = doc.new_page()
    
    # Header
    page.insert_text((50, 50), "INVOICE", fontsize=24, fontname="helvetica", color=(0, 0, 0))
    page.insert_text((400, 50), "CloudInfrastructure Services", fontsize=12)
    page.insert_text((400, 65), "123 Server Lane", fontsize=10)
    page.insert_text((400, 80), "Austin, TX 78701", fontsize=10)
    
    # Details
    page.insert_text((50, 120), "Bill To:", fontsize=12, fontname="helvetica")
    page.insert_text((50, 140), "TechCorp Inc.", fontsize=11)
    page.insert_text((50, 155), "Attn: Accounts Payable", fontsize=11)
    
    page.insert_text((350, 120), "Invoice #: INV2025-001", fontsize=12)
    page.insert_text((350, 140), "Date: December 19, 2025", fontsize=11)
    page.insert_text((350, 160), "Due Date: January 18, 2026", fontsize=11)
    
    # Line Items
    y = 220
    page.draw_line((50, y), (550, y))
    page.insert_text((50, y-10), "Description", fontsize=11, fontname="helvetica")
    page.insert_text((450, y-10), "Amount", fontsize=11, fontname="helvetica")
    
    items = [
        ("Project Skylark - Initial Cloud Setup (Nov 2025)", "$5,000.00"),
        ("Consulting Hours - Security Configuration", "$4,500.00"),
        ("Reserved Instance Pre-payment", "$3,000.00")
    ]
    
    y += 20
    for desc, amt in items:
        page.insert_text((50, y), desc, fontsize=11)
        page.insert_text((450, y), amt, fontsize=11)
        y += 20
        
    y += 20
    page.draw_line((50, y), (550, y))
    page.insert_text((350, y+20), "Total:", fontsize=14, fontname="helvetica")
    page.insert_text((450, y+20), "$12,500.00", fontsize=14, fontname="helvetica")
    
    # Notes
    page.insert_text((50, 400), "Notes:", fontsize=11, fontname="helvetica")
    page.insert_text((50, 420), "Please include Invoice # on your check.", fontsize=10)
    
    if not os.path.exists("demo_documents"):
        os.makedirs("demo_documents")
        
    doc.save("demo_documents/Vendor_Invoice_INV2025-001.pdf")
    doc.close()
    print("Created Vendor_Invoice_INV2025-001.pdf")

if __name__ == "__main__":
    try:
        create_agreement()
        create_minutes()
        create_invoice()
        print("All demo documents created successfully in 'demo_documents/' folder.")
    except Exception as e:
        print(f"Error creating PDF: {e}")
