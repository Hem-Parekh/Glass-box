"""The documents people sign, and the signed copy with its signature certificate.

The text is fixed when the signing request is created; its SHA-256 is stored and printed on the signed copy, so anyone
can check later that the signed text is exactly what was shown. Wording is a working draft for legal review."""
import hashlib
import io

from fpdf import FPDF

FIRM = "Aegis Ascend Financial Advisors"


def doc_hash(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def nda(company, investor, date_text):
    who = investor.get("firm") or investor["name"]
    return ("Non-disclosure agreement",
            "This agreement is made on %s between %s (the Investor), represented by %s, and %s (the Company), "
            "with %s acting as the Company's adviser.\n\n"
            "1. Purpose. The Company will share confidential information through the %s deal room so the Investor can evaluate a "
            "possible investment (the Purpose).\n\n"
            "2. Confidentiality. The Investor will keep all such information confidential, use it only for the Purpose, and share it "
            "only with its own advisers who are bound by the same duty.\n\n"
            "3. No contact. The Investor will not contact the Company's customers, suppliers, lenders or staff about the Company "
            "without the Company's written permission.\n\n"
            "4. Exceptions. Information that is public, already known to the Investor, or required to be disclosed by law or a "
            "regulator is not confidential.\n\n"
            "5. Return. On request the Investor will delete or return the information.\n\n"
            "6. Term. These duties last two years from today.\n\n"
            "7. Law. Indian law applies and the courts of Mumbai have jurisdiction."
            % (date_text, who, investor["name"], company["name"], FIRM, FIRM))


def engagement(company, founder, fee_paise, date_text):
    fee = fee_paise / 100
    return ("Engagement letter",
            "This letter is made on %s between %s (the Company), represented by %s, and %s (Aegis Ascend).\n\n"
            "1. Services. Aegis Ascend will prepare an independent debt vs equity report for the Company, reviewed and signed off "
            "by a named advisor, and, if the Company chooses, help arrange the recommended equity raise or loan.\n\n"
            "2. Advisory fee. Rs %s plus GST at 18%%, payable within 15 days of this letter.\n\n"
            "3. Success fees. If an equity raise closes through Aegis Ascend: 2.5%% of the amount raised at closing, and 0.4%% of the "
            "Company's net revenue for 5 years, paid quarterly. If a loan arranged through Aegis Ascend is disbursed: 2.5%% of the "
            "loan amount at disbursal. All plus GST.\n\n"
            "4. Independence. Aegis Ascend sells no loan and runs no fund. Investors hold shares in their own name; money never "
            "passes through Aegis Ascend.\n\n"
            "5. Information. The Company confirms that the figures it provides are accurate, and will share nothing with an "
            "investor or lender without its own approval in the workspace.\n\n"
            "6. Term. This letter runs until the Company ends it in writing; fees already earned remain payable.\n\n"
            "7. Law. Indian law applies and the courts of Mumbai have jurisdiction."
            % (date_text, company["name"], founder["name"], FIRM, "{:,.0f}".format(fee)))


def _latin(s):
    return (str(s).replace("–", "-").replace("—", "-").replace("’", "'").replace("‘", "'")
            .replace("“", '"').replace("”", '"').replace("₹", "Rs ").encode("latin-1", "replace").decode("latin-1"))


def signed_pdf(req, signer, method):
    """The signed copy: the document as shown, then a signature certificate."""
    pdf = FPDF(format="A4")
    pdf.set_margins(20, 18, 20)
    pdf.set_auto_page_break(True, 18)
    pdf.add_page()
    pdf.set_fill_color(13, 14, 16)
    pdf.rect(0, 0, 210, 26, "F")
    pdf.set_xy(20, 9)
    pdf.set_font("Times", "", 15)
    pdf.set_text_color(244, 239, 230)
    pdf.cell(0, 8, "AEGIS ASCEND", new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(36)
    pdf.set_text_color(22, 23, 26)
    pdf.set_font("Times", "", 20)
    pdf.multi_cell(0, 9, _latin(req["title"]), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_font("Helvetica", "", 10.5)
    for para in req["body"].split("\n\n"):
        pdf.multi_cell(0, 5.6, _latin(para), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2.5)
    pdf.ln(4)
    pdf.set_draw_color(201, 160, 79)
    pdf.set_line_width(0.6)
    pdf.line(20, pdf.get_y(), 190, pdf.get_y())
    pdf.ln(5)
    pdf.set_font("Times", "", 14)
    pdf.cell(0, 8, "Signature certificate", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 9.5)
    rows = [("Signed by", "%s (%s)" % (signer["name"], signer["email"])),
            ("Signed at", req["signed_at"].strftime("%d %b %Y, %H:%M:%S UTC")),
            ("IP address", req.get("signer_ip") or "-"),
            ("Method", method),
            ("Request", req["id"]),
            ("Document SHA-256", req["doc_hash"])]
    for k, v in rows:
        pdf.set_text_color(71, 68, 62)
        pdf.cell(42, 6, k)
        pdf.set_text_color(22, 23, 26)
        pdf.multi_cell(0, 6, _latin(v), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)
    pdf.set_text_color(71, 68, 62)
    pdf.set_font("Helvetica", "I", 8.5)
    pdf.multi_cell(0, 4.6, "The SHA-256 above is the fingerprint of the document text exactly as it was shown to the signer. "
                           "Any change to the text gives a different fingerprint.")
    out = io.BytesIO()
    pdf.output(out)
    return out.getvalue()
