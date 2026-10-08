"""Iteration 3 tests - Smart Filters + Budget Tracking."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://expense-tracker-7630.preview.emergentagent.com"
API = f"{BASE_URL.rstrip('/')}/api"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def seed_expenses(api_client):
    """Create test expenses in isolated month 2026-07 for filter tests."""
    created_ids = []
    rows = [
        {"date": "2026-07-05", "vendor": "TEST_Alpha", "main_category": "Marketing",
         "sub_category": "Advertisement", "detailed_head": "Facebook Advertisement",
         "amount": 1000, "payment_status": "Paid", "paid_amount": 1000,
         "remarks": "TEST_findme_search"},
        {"date": "2026-07-15", "vendor": "TEST_Beta", "main_category": "Production Cost",
         "amount": 2000, "payment_status": "Unpaid", "remarks": "ignore"},
        {"date": "2026-07-25", "vendor": "TEST_Gamma", "main_category": "Marketing",
         "amount": 3000, "payment_status": "Unpaid",
         "product_line": "Paneer", "remarks": "nothing"},
    ]
    for r in rows:
        resp = api_client.post(f"{API}/expenses", json=r)
        assert resp.status_code == 200, resp.text
        created_ids.append(resp.json()["id"])
    yield created_ids
    for eid in created_ids:
        api_client.delete(f"{API}/expenses/{eid}")


@pytest.fixture(scope="module")
def seed_budgets(api_client):
    """Create isolated budgets for month 2026-07."""
    month = "2026-07"
    created = []
    for cat, amt in [("Marketing", 5000), ("Production Cost", 10000)]:
        r = api_client.post(f"{API}/budgets", json={"month": month, "main_category": cat, "amount": amt})
        assert r.status_code == 200, r.text
        created.append(r.json()["id"])
    yield month, created
    for bid in created:
        api_client.delete(f"{API}/budgets/{bid}")


# -------- Smart Filters --------
class TestExpenseFilters:
    def test_date_from_inclusive(self, api_client, seed_expenses):
        r = api_client.get(f"{API}/expenses", params={"date_from": "2026-07-15", "date_to": "2026-07-31"})
        assert r.status_code == 200
        data = r.json()
        dates = {e["date"] for e in data if e["vendor"].startswith("TEST_")}
        assert "2026-07-15" in dates
        assert "2026-07-25" in dates
        assert "2026-07-05" not in dates

    def test_date_to_inclusive(self, api_client, seed_expenses):
        r = api_client.get(f"{API}/expenses", params={"date_from": "2026-07-01", "date_to": "2026-07-15"})
        assert r.status_code == 200
        dates = {e["date"] for e in r.json() if e["vendor"].startswith("TEST_")}
        assert dates == {"2026-07-05", "2026-07-15"}

    def test_q_search_vendor_case_insensitive(self, api_client, seed_expenses):
        r = api_client.get(f"{API}/expenses", params={"q": "test_alpha"})
        assert r.status_code == 200
        vendors = {e["vendor"] for e in r.json()}
        assert "TEST_Alpha" in vendors
        assert "TEST_Beta" not in vendors

    def test_q_search_in_remarks(self, api_client, seed_expenses):
        r = api_client.get(f"{API}/expenses", params={"q": "findme_search"})
        assert r.status_code == 200
        vendors = {e["vendor"] for e in r.json()}
        assert vendors == {"TEST_Alpha"}

    def test_q_search_in_product_line(self, api_client, seed_expenses):
        r = api_client.get(f"{API}/expenses", params={"q": "paneer", "date_from": "2026-07-01", "date_to": "2026-07-31"})
        assert r.status_code == 200
        vendors = {e["vendor"] for e in r.json()}
        assert "TEST_Gamma" in vendors

    def test_filters_combinable(self, api_client, seed_expenses):
        r = api_client.get(f"{API}/expenses", params={
            "main_category": "Marketing",
            "payment_status": "Unpaid",
            "date_from": "2026-07-01", "date_to": "2026-07-31",
        })
        assert r.status_code == 200
        vendors = {e["vendor"] for e in r.json()}
        assert vendors == {"TEST_Gamma"}


# -------- Budgets --------
class TestBudgets:
    def test_list_budgets_by_month(self, api_client, seed_budgets):
        month, _ = seed_budgets
        r = api_client.get(f"{API}/budgets", params={"month": month})
        assert r.status_code == 200
        rows = r.json()
        cats = {b["main_category"]: b["amount"] for b in rows}
        assert cats.get("Marketing") == 5000
        assert cats.get("Production Cost") == 10000

    def test_upsert_updates_not_duplicates(self, api_client, seed_budgets):
        month, _ = seed_budgets
        # second POST with same month+category should update, not duplicate
        r = api_client.post(f"{API}/budgets", json={"month": month, "main_category": "Marketing", "amount": 7777})
        assert r.status_code == 200
        # Verify only one row with amount 7777
        r2 = api_client.get(f"{API}/budgets", params={"month": month})
        marketing = [b for b in r2.json() if b["main_category"] == "Marketing"]
        assert len(marketing) == 1
        assert marketing[0]["amount"] == 7777

    def test_delete_budget_soft(self, api_client):
        # Create a disposable budget
        r = api_client.post(f"{API}/budgets", json={"month": "2026-09", "main_category": "Marketing", "amount": 100})
        bid = r.json()["id"]
        d = api_client.delete(f"{API}/budgets/{bid}")
        assert d.status_code == 200
        # Should no longer appear in list
        lst = api_client.get(f"{API}/budgets", params={"month": "2026-09"}).json()
        assert all(b["id"] != bid for b in lst)


# -------- Dashboard budget block --------
class TestDashboardBudget:
    def test_dashboard_without_month_has_no_budgets(self, api_client, seed_budgets):
        r = api_client.get(f"{API}/dashboard")
        assert r.status_code == 200
        bud = r.json().get("budget")
        assert bud is not None
        assert bud["has_budgets"] is False

    def test_dashboard_with_month_without_budgets(self, api_client):
        r = api_client.get(f"{API}/dashboard", params={"month": "2027-11"})
        assert r.status_code == 200
        assert r.json()["budget"]["has_budgets"] is False

    def test_dashboard_with_budgets_shape(self, api_client, seed_expenses, seed_budgets):
        month, _ = seed_budgets
        r = api_client.get(f"{API}/dashboard", params={"month": month})
        assert r.status_code == 200
        bud = r.json()["budget"]
        assert bud["has_budgets"] is True
        assert "total_budget" in bud and "total_spent" in bud
        # test_upsert may have changed Marketing to 7777; check by_category shape
        by_cat = {b["category"]: b for b in bud["by_category"]}
        assert "Marketing" in by_cat
        for b in bud["by_category"]:
            for k in ("category", "budget", "spent", "remaining", "pct"):
                assert k in b
        # Marketing spent in our seed = 1000 + 3000 = 4000
        mk = by_cat["Marketing"]
        assert mk["spent"] == 4000
        assert mk["remaining"] == round(mk["budget"] - mk["spent"], 2)

    def test_dashboard_may_2026_existing_seed(self, api_client):
        """Existing seed: May 2026 has Milk Procurement Cost budget 50000, actual 55000 => over."""
        r = api_client.get(f"{API}/dashboard", params={"month": "2026-05"})
        assert r.status_code == 200
        bud = r.json()["budget"]
        if bud["has_budgets"]:
            mpc = next((b for b in bud["by_category"] if b["category"] == "Milk Procurement Cost"), None)
            if mpc:
                assert mpc["budget"] == 50000
                assert mpc["spent"] == 55000
                assert mpc["pct"] == 110.0
