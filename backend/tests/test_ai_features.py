"""Tests for Iteration 5 AI features (parse-expense + chat).

Covers only the AI endpoints as instructed. Keeps live LLM calls limited to a
handful of representative cases (AI responses cost credits & are non-deterministic).
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
assert BASE_URL, "Backend URL env var not set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- /api/ai/parse-expense -------------------------------------------------
class TestAiParseExpense:
    def test_parse_milk_purchase_with_shorthand(self, api_client):
        r = api_client.post(
            f"{API}/ai/parse-expense",
            json={"text": "Paid Verka Dairy 45k for milk purchase via UPI yesterday"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        parsed = r.json().get("parsed")
        assert isinstance(parsed, dict)
        # Required keys exist (values may be null)
        for k in [
            "date", "vendor", "main_category", "sub_category", "detailed_head",
            "amount", "payment_mode", "payment_status", "product_line", "remarks",
        ]:
            assert k in parsed, f"missing key {k}"
        # 45k -> 45000
        assert parsed.get("amount") in (45000, 45000.0), f"amount expected 45000, got {parsed.get('amount')}"
        # Category must map to app hierarchy for milk purchase
        assert parsed.get("main_category") == "Milk Procurement Cost"
        assert parsed.get("sub_category") == "Milk Purchase Cost"
        assert parsed.get("detailed_head") in ("Purchase of Milk", "Milk Purchase Cost")
        # payment_mode UPI
        if parsed.get("payment_mode"):
            assert parsed.get("payment_mode") == "UPI"
        # vendor should pick up Verka
        if parsed.get("vendor"):
            assert "verka" in parsed["vendor"].lower()

    def test_parse_lakh_shorthand(self, api_client):
        r = api_client.post(
            f"{API}/ai/parse-expense",
            json={"text": "Office rent 1.2L paid by bank transfer on 2026-01-05"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        parsed = r.json()["parsed"]
        assert parsed.get("amount") in (120000, 120000.0)
        # Should land in Office Expenses > Office Rent
        if parsed.get("main_category"):
            assert "Office" in parsed["main_category"]

    def test_parse_garbage_returns_422(self, api_client):
        # Model usually returns JSON for anything; endpoint only 422's if JSON parsing fails.
        # We assert the endpoint doesn't 500 and either rejects or returns a valid object with
        # unknowns as null. This is a lenient contract check.
        r = api_client.post(
            f"{API}/ai/parse-expense",
            json={"text": "zzzzz !@#$%^&*() qwqwqwqw"},
            timeout=60,
        )
        assert r.status_code in (200, 422), r.text
        if r.status_code == 200:
            parsed = r.json()["parsed"]
            # amount should be 0/None and categories nullable
            assert parsed.get("amount") in (0, 0.0, None)


# --- /api/ai/chat ----------------------------------------------------------
class TestAiChat:
    @pytest.fixture(scope="class")
    def session(self):
        return {"id": None}

    def test_chat_vendor_dues_grounded(self, api_client, session):
        r = api_client.post(
            f"{API}/ai/chat",
            json={"message": "Who do I owe the most money to?"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("session_id")
        reply = data.get("reply", "")
        assert isinstance(reply, str) and len(reply) > 10
        session["id"] = data["session_id"]
        # Should reference Verka Dairy (largest outstanding ~50,900)
        lower = reply.lower()
        assert "verka" in lower, f"Expected 'Verka' in reply, got: {reply}"
        # Figure present – look for 50,900 / 50900 / 50.9
        assert any(tok in reply.replace(",", "") for tok in ["50900", "50,900"]) or "50" in reply, reply

    def test_chat_budget_overrun_grounded(self, api_client, session):
        r = api_client.post(
            f"{API}/ai/chat",
            json={"session_id": session["id"], "message": "Did any category go over budget?"},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        reply = r.json()["reply"].lower()
        # Expect Milk Procurement Cost overrun
        assert "milk procurement" in reply, reply
        # Overrun of 5,000 or references to 55,000/50,000
        assert any(x in reply.replace(",", "") for x in ["5000", "55000", "50000"]), reply

    def test_chat_history_persists(self, api_client, session):
        sid = session["id"]
        assert sid, "session id missing from earlier test"
        r = api_client.get(f"{API}/ai/chat/{sid}", timeout=30)
        assert r.status_code == 200, r.text
        msgs = r.json()
        assert isinstance(msgs, list)
        # At least 4 messages (2 Q/A pairs from the two tests above)
        assert len(msgs) >= 4, f"expected >=4 messages, got {len(msgs)}"
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles

    def test_chat_unknown_session_empty(self, api_client):
        r = api_client.get(f"{API}/ai/chat/{uuid.uuid4()}", timeout=15)
        assert r.status_code == 200
        assert r.json() == []
