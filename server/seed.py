"""Fictional demo data, defined once.

seed_data(rel) builds every collection. `rel(months, days, ts=False)` turns an offset from today into a date,
so the demo never goes stale. The server passes a resolver; site/build.py passes a marker writer
("@m,d" / "@T m,d") and site/store.js resolves the markers in the browser, so both modes start identical.
"""
from server.domain import SETTINGS_DEFAULT

INVESTORS = [  # id suffix, name, firm, sectors, ticket lakh (min, max), kyc, accredited
    ("", "Meera Iyer", "Konkan Growth Partners", ["Auto components", "Plastics & packaging"], (500, 2000), "verified", True),
    ("2", "Vikram Bhatt", "Sahyadri Angels Network", ["Chemicals", "Food processing"], (200, 1000), "verified", True),
    ("3", "Arvind Rao", "Rao Family Office", ["Plastics & packaging", "Auto components"], (1000, 3000), "verified", True),
    ("04", "Ananya Kulkarni", "Kulkarni Family Office", ["Auto components", "Engineering"], (50, 300), "verified", True),
    ("05", "Rohan Mehta", "Mehta Holdings", ["Plastics & packaging"], (50, 200), "verified", False),
    ("06", "Sneha Patil", "Patil Angels", ["Food processing", "Chemicals"], (25, 150), "verified", False),
    ("07", "Karan Shah", "Shah Capital", ["Auto components"], (100, 500), "verified", True),
    ("08", "Divya Menon", "Menon Investments", ["Plastics & packaging", "Pharma"], (50, 250), "verified", True),
    ("09", "Aditya Joshi", "Joshi Family Trust", ["Engineering"], (25, 100), "verified", False),
    ("10", "Pooja Agarwal", "Agarwal Ventures", ["Textiles", "Auto components"], (50, 300), "verified", True),
    ("11", "Nikhil Rane", "Rane Partners", ["Chemicals"], (100, 400), "verified", True),
    ("12", "Kavya Reddy", "Reddy Growth Fund", ["Pharma", "Chemicals"], (200, 800), "verified", True),
    ("13", "Siddharth Gupta", "Gupta Family Office", ["Auto components", "Electronics"], (100, 600), "verified", True),
    ("14", "Meenal Desai", "Desai Angels", ["Food processing"], (25, 100), "verified", False),
    ("15", "Harsh Vora", "Vora Capital", ["Plastics & packaging", "Engineering"], (50, 250), "verified", True),
    ("16", "Ishita Banerjee", "Banerjee Holdings", ["Textiles"], (25, 150), "verified", False),
    ("17", "Varun Nair", "Nair Ventures", ["Auto components", "Plastics & packaging"], (100, 500), "verified", True),
    ("18", "Tanvi Kapoor", "Kapoor Family Trust", ["Electronics"], (50, 200), "verified", True),
    ("19", "Omkar Sawant", "Sawant Investments", ["Engineering", "Auto components"], (25, 120), "verified", False),
    ("20", "Ritu Malhotra", "Malhotra Partners", ["Pharma"], (100, 400), "verified", True),
    ("21", "Farhan Qureshi", "Qureshi Capital", ["Chemicals", "Plastics & packaging"], (50, 300), "verified", True),
    ("22", "Gauri Bhosale", "Bhosale Family Office", ["Chemicals"], (25, 150), "verified", True),
    ("23", "Manish Jain", "Jain Ventures", ["Plastics & packaging", "Textiles"], (50, 250), "pending", False),
    ("24", "Leela Krishnan", "Krishnan Angels", ["Food processing", "Pharma"], (25, 100), "verified", True),
    ("25", "Deepak Chawla", "Chawla Holdings", ["Auto components"], (100, 500), "pending", True),
]
LAKH = 100_000 * 100  # one lakh rupees in paise
CRORE = 100 * LAKH


def inv_id(sfx):
    return "u_investor" + sfx


def seed_data(rel):
    T = lambda m=0, dd=0: rel(m, dd, True)  # noqa: E731
    D = lambda m=0, dd=0: rel(m, dd, False)  # noqa: E731
    users = [
        dict(id="u_founder", email="founder@demo.in", name="Priya Nair", role="founder", company_id="c_kalyan", title="Managing Director"),
        dict(id="u_founder2", email="rahul@demo.in", name="Rahul Deshmukh", role="founder", company_id="c_vasai", title="Founder"),
        dict(id="u_founder3", email="farah@demo.in", name="Farah Shaikh", role="founder", company_id="c_taloja", title="Director"),
        dict(id="u_advisor", email="advisor@demo.in", name="CA Neha Joshi", role="advisor", firm="Aegis Ascend Financial Advisors", title="Reviewing advisor"),
        dict(id="u_lender", email="lender@demo.in", name="Suresh Pillai", role="lender", firm="Harbour Bank (sample)", title="Credit manager",
             profile=dict(regulated=True, lender_type="Bank", reg_no="Sample bank licence")),
        dict(id="u_lender2", email="nbfc@demo.in", name="Kavita Rane", role="lender", firm="Sahyadri Finance NBFC (sample)", title="Head of SME lending",
             profile=dict(regulated=True, lender_type="NBFC", reg_no="Sample RBI CoR")),
        dict(id="u_lender3", email="konkanbank@demo.in", name="Mahesh Gawde", role="lender", firm="Konkan Co-operative Bank (sample)", title="Branch credit head",
             profile=dict(regulated=True, lender_type="Bank", reg_no="Sample bank licence")),
        dict(id="u_lender4", email="deccan@demo.in", name="Neelam Sethi", role="lender", firm="Deccan Capital NBFC (sample)", title="Credit lead",
             profile=dict(regulated=True, lender_type="NBFC", reg_no="Sample RBI CoR")),
    ]
    emails = {"": "investor@demo.in", "2": "angels@demo.in", "3": "familyoffice@demo.in"}
    for k, (sfx, name, firm, sectors, (tmin, tmax), kyc, acc) in enumerate(INVESTORS):
        users.append(dict(id=inv_id(sfx), email=emails.get(sfx, "inv%s@demo.in" % sfx), name=name, role="investor",
                          firm=firm + ("" if sfx in emails else " (sample)"),
                          mandate=dict(sectors=sectors, past_sectors=[], stages=["Growth", "Expansion"], ticket_min=tmin / 100, ticket_max=tmax / 100, instruments=["equity"]),
                          profile=dict(kyc=kyc, accredited=acc, nda_signed_at=T(-10 - k % 7, -k) if kyc == "verified" else None,
                                       ticket_min_paise=tmin * LAKH, ticket_max_paise=tmax * LAKH, last_active=T(0, -(k * 3) % 40))))

    cov = dict(dscr_min=1.25, debt_ebitda_max=3.5)
    full = {k: D(-8, -5 + i) for i, k in enumerate(["valuation_report", "mgt14", "pas4", "bank_account", "allotment", "pas3", "demat_credit"])}
    companies = [
        dict(id="c_kalyan", name="Kalyan Polymers Pvt Ltd", sector="Plastics & packaging", stage="Growth", city="Bhiwandi", revenue=68, instrument="equity",
             **{"raise": 12}, raise_paise=12 * CRORE, pipeline_stage="offering", stage_since=D(0, -20), security_type="equity", offer_price_paise=24000,
             fd_extra_shares=150_000, external_offers={"@fy": {"equity": 175}},
             checklist=dict(valuation_report=D(0, -25), mgt14=D(0, -18)), updates=[],
             twin={}, readiness={}, covenants=cov, quarters=[
                 dict(q="Q1 FY26", ebitda=1.6, interest=0.18, principal=0.55, debt=5.2), dict(q="Q2 FY26", ebitda=1.5, interest=0.17, principal=0.55, debt=4.7),
                 dict(q="Q3 FY26", ebitda=1.2, interest=0.15, principal=0.55, debt=4.1), dict(q="Q4 FY26", ebitda=0.95, interest=0.14, principal=0.55, debt=3.6)],
             docs=["Audited accounts FY24-FY26", "GST returns (12 months)", "CMA data FY25-FY28", "Cap table", "Debt vs equity report"]),
        dict(id="c_vasai", name="Vasai Precision Castings Pvt Ltd", sector="Auto components", stage="Growth", city="Vasai", revenue=112, instrument="equity",
             **{"raise": 25}, raise_paise=25 * CRORE, pipeline_stage="monitoring", stage_since=D(-7), security_type="equity", offer_price_paise=16000,
             allotment_date=D(-8), fd_extra_shares=200_000, external_offers={}, checklist=full,
             updates=[dict(date=D(-1, -4), text="Q1 FY27 revenue up 14% on last year; second casting line commissioned on schedule."),
                      dict(date=D(-4), text="Signed a three-year supply contract with a two-wheeler OEM.")],
             twin={"raise": 25, "pre_money": 140, "ebitda0": 13, "existing_ds": 3}, readiness=dict(dscr=1.62, collateral_cover=1.6, gst_on_time=12, data_room_ready=True), covenants=cov, quarters=[
                 dict(q="Q1 FY26", ebitda=3.4, interest=0.46, principal=0.9, debt=17.1), dict(q="Q2 FY26", ebitda=3.6, interest=0.44, principal=0.9, debt=16.2),
                 dict(q="Q3 FY26", ebitda=3.5, interest=0.42, principal=0.9, debt=15.3), dict(q="Q4 FY26", ebitda=3.9, interest=0.4, principal=0.9, debt=14.4)],
             docs=["Audited accounts FY24-FY26", "GST returns (12 months)", "Customer contracts", "Cap table", "Debt vs equity report"]),
        dict(id="c_taloja", name="Taloja Specialty Chemicals Pvt Ltd", sector="Chemicals", stage="Expansion", city="Taloja", revenue=45, instrument="equity",
             **{"raise": 8}, raise_paise=8 * CRORE, pipeline_stage="funded", stage_since=D(-5, -20), security_type="equity", offer_price_paise=9500,
             allotment_date=D(-6, 5), fd_extra_shares=80_000, external_offers={},
             checklist={k: v for k, v in dict(valuation_report=D(-6, -2), mgt14=D(-6, 0), pas4=D(-6, 1), bank_account=D(-6, 1), allotment=D(-6, 5), pas3=D(-6, 14)).items()},
             updates=[dict(date=D(-1, -12), text="Solvent recovery unit approved by the pollution control board.")],
             twin={"raise": 8, "pre_money": 36, "ebitda0": 4.2, "existing_ds": 0.8}, readiness=dict(dscr=1.3, audited_years=2), covenants=cov, quarters=[],
             docs=["Audited accounts FY25-FY26", "Cap table"]),
        dict(id="c_nashik", name="Nashik Agro Foods Pvt Ltd", sector="Food processing", stage="Expansion", city="Nashik", revenue=38, instrument="equity",
             **{"raise": 6}, raise_paise=6 * CRORE, pipeline_stage="under_review", stage_since=D(0, -3), security_type="equity", offer_price_paise=0,
             fd_extra_shares=0, external_offers={}, checklist={}, updates=[],
             twin={"raise": 6, "pre_money": 30, "ebitda0": 3.1, "existing_ds": 0.5}, readiness=dict(dscr=1.4, audited_years=3), covenants=cov, quarters=[],
             docs=["Audited accounts FY24-FY26"]),
    ]
    checks = dict(validation=True, founder_confirmed=True, verifier=True)
    reports = [
        dict(id="r_vasai", company_id="c_vasai", title="Debt vs equity: Rs 25 cr expansion", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(-9, -12), submitted_by="u_founder2", reviewed_by="u_advisor", reviewed_at=T(-9, -2),
             review_note="Assumptions within sector benchmarks. Stress case holds.", summary=dict(best_share=0.55, net=6.1, break_even=210, min_dscr=1.48, min_dscr_stress=1.07), checks=checks),
        dict(id="r_kalyan", company_id="c_kalyan", title="Debt vs equity: Rs 12 cr growth raise", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(0, -32), submitted_by="u_founder", reviewed_by="u_advisor", reviewed_at=T(0, -25),
             review_note="Debt capacity limited by the falling DSCR; equity-heavy mix is right.", summary=dict(best_share=0.25, net=1.4, break_even=96, min_dscr=1.31, min_dscr_stress=1.04), checks=checks),
        dict(id="r_taloja", company_id="c_taloja", title="Debt vs equity: Rs 8 cr capacity add", status="approved", engine_version="gb-engine 1.0.0",
             created_at=T(-7, -10), submitted_by="u_founder3", reviewed_by="u_advisor", reviewed_at=T(-7), review_note="Approved with a 40% debt cap.",
             summary=dict(best_share=0.4, net=1.2, break_even=58, min_dscr=1.31, min_dscr_stress=1.02), checks=checks),
        dict(id="r_nashik", company_id="c_nashik", title="Debt vs equity: Rs 6 cr cold-chain expansion", status="in_review", engine_version="gb-engine 1.0.0",
             created_at=T(0, -3), submitted_by="u_advisor", summary=dict(best_share=0.5, net=0.9, break_even=44, min_dscr=1.38, min_dscr_stress=1.06), checks=checks),
    ]
    cap = [
        dict(id="ct_k1", company_id="c_kalyan", holder_name="Priya Nair", holder_type="founder", shares=3_000_000, holders=1),
        dict(id="ct_k2", company_id="c_kalyan", holder_name="Suresh Nair", holder_type="founder", shares=1_200_000, holders=1),
        dict(id="ct_k3", company_id="c_kalyan", holder_name="Friends and family", holder_type="existing", shares=400_000, holders=12),
        dict(id="ct_v1", company_id="c_vasai", holder_name="Rahul Deshmukh", holder_type="founder", shares=4_200_000, holders=1),
        dict(id="ct_v2", company_id="c_vasai", holder_name="Anita Deshmukh", holder_type="founder", shares=1_800_000, holders=1),
        dict(id="ct_v3", company_id="c_vasai", holder_name="Employees and early shareholders", holder_type="existing", shares=900_000, holders=158),
        dict(id="ct_v4", company_id="c_vasai", holder_name="Konkan Angels LLP", holder_type="existing", shares=300_000, holders=1),
        dict(id="ct_t1", company_id="c_taloja", holder_name="Farah Shaikh", holder_type="founder", shares=2_000_000, holders=1),
        dict(id="ct_t2", company_id="c_taloja", holder_name="Imran Shaikh", holder_type="founder", shares=800_000, holders=1),
        dict(id="ct_t3", company_id="c_taloja", holder_name="Early backers", holder_type="existing", shares=250_000, holders=6),
        dict(id="ct_n1", company_id="c_nashik", holder_name="Sunil Pawar", holder_type="founder", shares=1_500_000, holders=1),
        dict(id="ct_n2", company_id="c_nashik", holder_name="Rekha Pawar", holder_type="founder", shares=1_000_000, holders=1),
    ]

    # Vasai: 19 platform investors (the limit test sits at 19 / 20); Taloja: 4, still inside the 6-month lock.
    vasai = [("", 400), ("3", 300)] + list(zip(["%02d" % i for i in range(4, 21)], [80, 64, 48, 120, 96, 40, 56, 72, 88, 104, 48, 64, 32, 40, 56, 80, 72]))
    taloja = [("", 120), ("2", 80), ("21", 60), ("22", 50)]
    holdings, offers = [], []
    for sfx, lakh in vasai:
        shares = lakh * LAKH // 16000
        holdings.append(dict(id="h_v" + (sfx or "1"), investor_id=inv_id(sfx), company_id="c_vasai", shares=shares, allotment_date=D(-8),
                             invested_at=D(-8, -12), cost_paise=shares * 16000, origin="allotment", early_consent=None))
        offers.append(dict(id="o_v" + (sfx or "1"), company_id="c_vasai", investor_id=inv_id(sfx), fy="@fy" + rel(-9, 0, False), security_type="equity",
                           sent_at=T(-9), sent_by="u_advisor", response="invested", responded_at=T(-9, 6), share_identity=True, views=[]))
    for sfx, lakh in taloja:
        shares = lakh * LAKH // 9500
        holdings.append(dict(id="h_t" + (sfx or "1"), investor_id=inv_id(sfx), company_id="c_taloja", shares=shares, allotment_date=D(-6, 5),
                             invested_at=D(-6, -8), cost_paise=shares * 9500, origin="allotment", early_consent=None))
        offers.append(dict(id="o_t" + (sfx or "1"), company_id="c_taloja", investor_id=inv_id(sfx), fy="@fy" + rel(-6, -20, False), security_type="equity",
                           sent_at=T(-6, -20), sent_by="u_advisor", response="invested", responded_at=T(-6, -14), share_identity=True, views=[]))
    for sfx in ("23", "24"):
        offers.append(dict(id="o_t" + sfx, company_id="c_taloja", investor_id=inv_id(sfx), fy="@fy" + rel(-6, -20, False), security_type="equity",
                           sent_at=T(-6, -20), sent_by="u_advisor", response="declined", responded_at=T(-6, -15), share_identity=False, views=[]))
    # Kalyan: 20 platform offers this year + 175 made off-platform = 195 / 200.
    responses = {"2": ("interested", True), "3": ("declined", False), "05": ("interested", False), "08": ("interested", True), "10": ("declined", False)}
    for k, sfx in enumerate(["", "2", "3"] + ["%02d" % i for i in range(4, 21)]):
        resp, share = responses.get(sfx, ("pending", False))
        offers.append(dict(id="o_k" + (sfx or "1"), company_id="c_kalyan", investor_id=inv_id(sfx), fy="@fy", security_type="equity",
                           sent_at=T(0, -6 - k % 5), sent_by="u_advisor", response=resp, responded_at=T(0, -2) if resp != "pending" else None,
                           share_identity=share, views=[]))

    valuations = [
        dict(id="v_v1", company_id="c_vasai", date=D(-8), price_per_share_paise=16000, method="Market multiples", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-8), published_by="u_advisor"),
        dict(id="v_v2", company_id="c_vasai", date=D(-5), price_per_share_paise=17200, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-5, 2), published_by="u_advisor"),
        dict(id="v_v3", company_id="c_vasai", date=D(-2), price_per_share_paise=18400, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(-2, 2), published_by="u_advisor"),
        dict(id="v_t1", company_id="c_taloja", date=D(-6, 5), price_per_share_paise=9500, method="DCF", valuer="Mehta & Associates, Registered Valuers (sample)", report_file=None, published_at=T(-6, 5), published_by="u_advisor"),
        dict(id="v_t2", company_id="c_taloja", date=D(-3, -10), price_per_share_paise=9100, method="Market multiples", valuer="Mehta & Associates, Registered Valuers (sample)", report_file=None, published_at=T(-3, -8), published_by="u_advisor"),
        dict(id="v_k1", company_id="c_kalyan", date=D(0, -25), price_per_share_paise=24000, method="DCF", valuer="R. K. Valuers (sample)", report_file=None, published_at=T(0, -24), published_by="u_advisor"),
    ]
    sell_requests = [dict(id="s_1", holding_id="h_v3", investor_id=inv_id("3"), company_id="c_vasai", shares=300 * LAKH // 16000, full=True,
                          indicative_price_paise=19000, note="Rebalancing the family office book.", status="submitted", rofr_days=None, rofr_until=None,
                          buyer_investor_id=None, spa_date=None, price_paise=None, reason=None, created_at=T(0, -2),
                          history=[dict(status="submitted", at=T(0, -2), by=inv_id("3"))])]
    # loans: payments recorded for every instalment already due, except the latest one on l_2 (overdue)
    loans = [
        dict(id="l_1", lender_id="u_lender", company_id="c_vasai", amount_paise=18 * CRORE, rate_bps=1025, tenor_months=84, moratorium_months=6, sanction_date=D(-18, -20), disbursal_date=D(-18), skip_last=0),
        dict(id="l_2", lender_id="u_lender", company_id="c_kalyan", amount_paise=6 * CRORE, rate_bps=1150, tenor_months=60, moratorium_months=0, sanction_date=D(-20, -15), disbursal_date=D(-20, -10), skip_last=1),
        dict(id="l_3", lender_id="u_lender", company_id="c_taloja", amount_paise=35 * CRORE // 10, rate_bps=1100, tenor_months=48, moratorium_months=3, sanction_date=D(-7, -12), disbursal_date=D(-7), skip_last=0),
        dict(id="l_4", lender_id="u_lender2", company_id="c_kalyan", amount_paise=25 * CRORE // 10, rate_bps=1250, tenor_months=36, moratorium_months=0, sanction_date=D(-14, -9), disbursal_date=D(-14), skip_last=0),
        dict(id="l_5", lender_id="u_lender3", company_id="c_vasai", amount_paise=5 * CRORE, rate_bps=975, tenor_months=60, moratorium_months=0, sanction_date=D(-30, -14), disbursal_date=D(-30), skip_last=0),
        dict(id="l_6", lender_id="u_lender4", company_id="c_nashik", amount_paise=15 * CRORE // 10, rate_bps=1300, tenor_months=24, moratorium_months=0, sanction_date=D(-5, -10), disbursal_date=D(-5), skip_last=0),
    ]
    for l in loans:
        l.update(status="disbursed", created_at=l["sanction_date"], payments="@paid:%d" % l.pop("skip_last"))
    loan_transfers = [dict(id="lt_1", loan_id="l_4", from_lender_id="u_lender2", amount_paise=None, note="Portfolio rebalancing: reducing plastics exposure.",
                           status="submitted", buyer_lender_id=None, fee_rate=None, fee_paise=None, created_at=T(0, -3),
                           history=[dict(status="submitted", at=T(0, -3), by="u_lender2")])]

    def inv(id_, kind, cid, payer, payer_id, period, amount, issued, due, paid):
        return dict(id=id_, kind=kind, company_id=cid, payer=payer, payer_id=payer_id, period=period, amount_paise=amount,
                    gst_paise=amount * 18 // 100, issued=issued, due=due, paid_on=paid)
    vasai_raised = sum(h["cost_paise"] for h in holdings if h["company_id"] == "c_vasai")
    taloja_raised = sum(h["cost_paise"] for h in holdings if h["company_id"] == "c_taloja")
    q_rev_vasai = 112 * CRORE // 4 * 4 // 1000  # 0.4% of a quarter's revenue
    invoices = [
        inv("f_1", "advisory", "c_vasai", "company", "c_vasai", "Engagement", LAKH, D(-10), D(-9, -15), D(-9, -18)),
        inv("f_2", "advisory", "c_kalyan", "company", "c_kalyan", "Engagement", LAKH, D(-2), D(-1, -15), D(-1, -20)),
        inv("f_3", "advisory", "c_taloja", "company", "c_taloja", "Engagement", LAKH, D(-8), D(-7, -15), D(-7, -10)),
        inv("f_4", "advisory", "c_nashik", "company", "c_nashik", "Engagement", LAKH, D(0, -12), D(0, 3), None),
        inv("f_5", "success", "c_vasai", "company", "c_vasai", "Equity raise", vasai_raised * 25 // 1000, D(-8), D(-7, -15), D(-7, -12)),
        inv("f_6", "success", "c_taloja", "company", "c_taloja", "Equity raise", taloja_raised * 25 // 1000, D(-6, 5), D(-5, -10), D(-5, -12)),
        inv("f_7", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 1", q_rev_vasai, D(-5), D(-4, -15), D(-4, -16)),
        inv("f_8", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 2", q_rev_vasai, D(-2), D(-1, -15), D(-1, -14)),
        inv("f_9", "revenue_share", "c_taloja", "company", "c_taloja", "Quarter 1", 45 * CRORE // 4 * 4 // 1000, D(-3, 5), D(0, -5), None),
        inv("f_10", "revenue_share", "c_vasai", "company", "c_vasai", "Quarter 3", q_rev_vasai, D(0, -5), D(0, 10), None),
        inv("f_11", "monitoring", "c_vasai", "lender", "u_lender", "Loan l_1, last quarter", 18 * CRORE * 35 // 10000 // 4, D(-1), D(0, -15), D(0, -14)),
        inv("f_12", "monitoring", "c_kalyan", "lender", "u_lender2", "Loan l_4, last quarter", 25 * CRORE // 10 * 35 // 10000 // 4, D(-1), D(0, -15), None),
    ]
    notes = [
        dict(id="n_1", subject_type="company", subject_id="c_taloja", text="Chase the depository for the demat credit confirmation.", due=D(0, 2), done=False, by="u_advisor", at=T(0, -4)),
        dict(id="n_2", subject_type="investor", subject_id=inv_id("05"), text="Call Rohan about his Kalyan interest and ticket size.", due=D(0, -1), done=False, by="u_advisor", at=T(0, -3)),
        dict(id="n_3", subject_type="lender", subject_id="u_lender2", text="Share the l_4 monitoring pack with interested buyers.", due=D(0, 5), done=False, by="u_advisor", at=T(0, -2)),
    ]
    notifications = [
        dict(id="nt_1", user_id=inv_id(""), kind="offer", text="New private offer: Kalyan Polymers Pvt Ltd", link="app-opportunities", at=T(0, -6), read=False),
        dict(id="nt_2", user_id=inv_id(""), kind="valuation", text="Revaluation published: Vasai Precision Castings at Rs 184.00 a share", link="app-portfolio", at=T(-2, 2), read=True),
        dict(id="nt_3", user_id=inv_id("3"), kind="sell", text="Your sell request for Vasai Precision Castings was submitted", link="app-portfolio", at=T(0, -2), read=False),
        dict(id="nt_4", user_id="u_lender2", kind="transfer", text="Loan transfer request for Kalyan Polymers received by Aegis Ascend", link="app-loanbook", at=T(0, -3), read=False),
    ]
    return dict(users=users, companies=companies, reports=reports, cap_table=cap, holdings=holdings, offers=offers, valuations=valuations,
                sell_requests=sell_requests, transfers=[], loans=loans, loan_transfers=loan_transfers, invoices=invoices, notes=notes,
                notifications=notifications, files=[], enquiries=[], settings=[dict(SETTINGS_DEFAULT)])


def finalize(data, today):
    """Resolve the two markers that need today or another field: "@fy[date]" and a loan's "@paid:N"."""
    from server.domain import add_months, fy

    def walk(x):
        if isinstance(x, dict):
            return {(fy(today) if k == "@fy" else k): walk(v) for k, v in x.items()}
        if isinstance(x, list):
            return [walk(v) for v in x]
        if isinstance(x, str) and x.startswith("@fy"):
            return fy(x[3:] or today)
        return x
    data = walk(data)
    for l in data["loans"]:
        skip = int(str(l["payments"]).split(":")[1])
        due = [add_months(l["disbursal_date"], k) for k in range(1, l["tenor_months"] + 1)]
        due = [x for x in due if x < today]
        l["payments"] = {x: x for x in due[:len(due) - skip]}
    return data


def resolved(today):
    from server.domain import add_days, add_months
    return finalize(seed_data(lambda m, dd, ts: (lambda s: s + "T10:00:00+00:00" if ts else s)(add_days(add_months(today, m), dd))), today)


def markers():
    """The same data with relative-date markers, for the browser demo to resolve on first load."""
    return seed_data(lambda m, dd, ts: ("@T" if ts else "@") + "%d,%d" % (m, dd))
