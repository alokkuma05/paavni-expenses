"""Backend API tests for Paavni expense/payment bookkeeping app."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://expense-tracker-7630.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def created_ids():
    return {"expenses": [], "vendors": [], "categories": []}


# ---- Masters ----
class TestMasters:
    def test_masters_shape(self, api_client):
        r = api_client.get(f"{API}/masters")
        assert r.status_code == 200
        d = r.json()
        for k in ["categories", "custom_categories", "cost_centres", "payment_modes", "payment_statuses", "product_lines"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["categories"], list) and len(d["categories"]) > 0
        first = d["categories"][0]
        assert "main_category" in first and "sub_categories" in first
        assert isinstance(first["sub_categories"], list) and len(first["sub_categories"]) > 0
        assert "sub_category" in first["sub_categories"][0]
        assert "detailed_heads" in first["sub_categories"][0]
        assert "Paid" in d["payment_statuses"]
        assert "UPI" in d["payment_modes"]


# ---- Vendors CRUD ----
class TestVendors:
    def test_vendor_crud(self, api_client, created_ids):
        # create
        r = api_client.post(f"{API}/vendors", json={"name": "TEST_Vendor_A", "contact": "9999"})
        assert r.status_code == 200
        v = r.json()
        assert v["name"] == "TEST_Vendor_A" and v["id"]
        created_ids["vendors"].append(v["id"])

        # list
        r = api_client.get(f"{API}/vendors")
        assert r.status_code == 200
        names = [x["name"] for x in r.json()]
        assert "TEST_Vendor_A" in names

        # update
        r = api_client.put(f"{API}/vendors/{v['id']}", json={"name": "TEST_Vendor_A2", "contact": "8888"})
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Vendor_A2"

        # delete
        r = api_client.delete(f"{API}/vendors/{v['id']}")
        assert r.status_code == 200
        r = api_client.get(f"{API}/vendors")
        assert v["id"] not in [x["id"] for x in r.json()]


# ---- Categories ----
class TestCategories:
    def test_create_custom_category_and_masters(self, api_client, created_ids):
        payload = {"main_category": "TEST_Main", "sub_category": "TEST_Sub", "detailed_head": "TEST_Head"}
        r = api_client.post(f"{API}/categories", json=payload)
        assert r.status_code == 200
        c = r.json()
        assert c["custom"] is True
        created_ids["categories"].append(c["id"])

        # masters should include it under custom_categories
        r = api_client.get(f"{API}/masters")
        customs = r.json().get("custom_categories", [])
        assert any(x["id"] == c["id"] for x in customs)

        # soft-delete
        r = api_client.delete(f"{API}/categories/{c['id']}")
        assert r.status_code == 200
        r = api_client.get(f"{API}/categories")
        assert c["id"] not in [x["id"] for x in r.json()]


# ---- Expenses CRUD + derived fields ----
class TestExpenses:
    def test_create_unpaid_and_derived(self, api_client, created_ids):
        payload = {
            "date": "2026-01-15",
            "vendor": "TEST_Vendor_Expense",
            "main_category": "Production Cost",
            "sub_category": "Cattle Feed",
            "detailed_head": "Dry Fodder",
            "amount": 10000,
            "payment_status": "Unpaid",
            "paid_amount": 0,
        }
        r = api_client.post(f"{API}/expenses", json=payload)
        assert r.status_code == 200, r.text
        e = r.json()
        assert e["month"] == "2026-01"
        assert e["outstanding"] == 10000
        assert e["payment_status"] == "Unpaid"
        created_ids["expenses"].append(e["id"])

        # get
        r = api_client.get(f"{API}/expenses/{e['id']}")
        assert r.status_code == 200

    def test_create_partly_paid_reconcile(self, api_client, created_ids):
        payload = {
            "date": "2026-01-16", "vendor": "TEST_V2", "main_category": "Office Expenses",
            "amount": 5000, "paid_amount": 2000, "payment_status": "Unpaid",
        }
        r = api_client.post(f"{API}/expenses", json=payload)
        assert r.status_code == 200
        e = r.json()
        assert e["payment_status"] == "Partly Paid"
        assert e["outstanding"] == 3000
        created_ids["expenses"].append(e["id"])

    def test_create_paid_reconcile(self, api_client, created_ids):
        payload = {
            "date": "2026-01-17", "vendor": "TEST_V3", "main_category": "Marketing",
            "amount": 1000, "paid_amount": 1000, "payment_status": "Unpaid",
        }
        r = api_client.post(f"{API}/expenses", json=payload)
        e = r.json()
        assert e["payment_status"] == "Paid"
        assert e["outstanding"] == 0
        created_ids["expenses"].append(e["id"])

    def test_filters(self, api_client):
        r = api_client.get(f"{API}/expenses", params={"month": "2026-01"})
        assert r.status_code == 200
        data = r.json()
        assert all(x["month"] == "2026-01" for x in data)
        assert len(data) >= 3

        r = api_client.get(f"{API}/expenses", params={"payment_status": "Paid"})
        assert all(x["payment_status"] == "Paid" for x in r.json())

        r = api_client.get(f"{API}/expenses", params={"main_category": "Production Cost"})
        assert all(x["main_category"] == "Production Cost" for x in r.json())

    def test_update_recomputes(self, api_client, created_ids):
        eid = created_ids["expenses"][0]
        update = {
            "date": "2026-02-05", "vendor": "TEST_Vendor_Expense",
            "main_category": "Production Cost", "amount": 20000,
            "paid_amount": 5000, "payment_status": "Unpaid",
        }
        r = api_client.put(f"{API}/expenses/{eid}", json=update)
        assert r.status_code == 200, r.text
        e = r.json()
        assert e["month"] == "2026-02"
        assert e["outstanding"] == 15000
        assert e["payment_status"] == "Partly Paid"

    def test_record_payment(self, api_client, created_ids):
        eid = created_ids["expenses"][0]  # currently 20000/5000
        r = api_client.post(f"{API}/expenses/{eid}/payment", json={
            "paid_amount": 15000, "payment_mode": "UPI", "payment_date": "2026-02-10"
        })
        assert r.status_code == 200, r.text
        e = r.json()
        assert e["paid_amount"] == 20000
        assert e["outstanding"] == 0
        assert e["payment_status"] == "Paid"
        assert e["payment_mode"] == "UPI"
        assert e["payment_date"] == "2026-02-10"

    def test_soft_delete(self, api_client, created_ids):
        eid = created_ids["expenses"][-1]
        r = api_client.delete(f"{API}/expenses/{eid}")
        assert r.status_code == 200
        r = api_client.get(f"{API}/expenses/{eid}")
        assert r.status_code == 404
        created_ids["expenses"].pop()


# ---- Dashboard ----
class TestDashboard:
    def test_dashboard_month(self, api_client):
        r = api_client.get(f"{API}/dashboard", params={"month": "2026-01"})
        assert r.status_code == 200
        d = r.json()
        for k in ["total", "paid", "outstanding", "count", "by_category", "by_status", "months"]:
            assert k in d
        assert d["count"] >= 2
        # by_category sorted desc
        amts = [c["amount"] for c in d["by_category"]]
        assert amts == sorted(amts, reverse=True)
        # months list is sorted desc
        assert d["months"] == sorted(d["months"], reverse=True)

    def test_dashboard_all(self, api_client):
        r = api_client.get(f"{API}/dashboard")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= d["paid"]

    def test_dashboard_empty_month(self, api_client):
        r = api_client.get(f"{API}/dashboard", params={"month": "1999-01"})
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 0
        assert d["total"] == 0


# ---- Cleanup ----
def test_zz_cleanup(api_client, created_ids):
    for eid in created_ids["expenses"]:
        api_client.delete(f"{API}/expenses/{eid}")
    for vid in created_ids["vendors"]:
        api_client.delete(f"{API}/vendors/{vid}")
    for cid in created_ids["categories"]:
        api_client.delete(f"{API}/categories/{cid}")
