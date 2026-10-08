from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Master data (seeded from the Paavni Monthly Expenses sheet)
# ---------------------------------------------------------------------------
CATEGORY_HIERARCHY = {
    "Production Cost": {
        "Cattle Feed": ["Dry Fodder", "Silage", "Green Fodder", "Cattle Feed Supplement", "Other Supplements", "Fodder"],
        "Salary": ["Farm Manager Payroll", "Farm Supervisor Payroll", "Permanent Labor Payroll", "Casual Labour Payroll"],
        "Veterinary": ["Doctors Fees", "Medicines", "Insurance Fees", "Veterinary Exp"],
        "Machinery Repair": ["Milking Machine Repair & Maintenance", "Gen Set Repair", "Electricity Repair", "Other Farm Repair"],
        "Energy Cost": ["Electricity Bill", "Gen Set Diesel", "Gen Set Rent", "Bike Petrol", "Fuel"],
    },
    "Milk Procurement Cost": {
        "Milk Purchase Cost": ["Purchase of Milk", "Milk Purchase Cost"],
        "Energy Cost": ["CNG Fuel & Transportation", "Diesel Fuel & Transportation", "Fuel - Milk Procurement"],
        "Salary": ["Procurement Supervisor Payroll", "Procurement Labour Payroll"],
    },
    "Milk Processing and Packaging": {
        "Energy Cost": ["Electricity Bill - Processing", "Diesel - Processing", "LPG"],
        "Packaging": ["Pouch Purchase", "Bottle Purchase", "Bottle Sealing", "Bottle Cleaning", "Packaging Materials"],
        "Salary": ["Processing Manager Payroll", "Processing Supervisor Payroll", "Processing Labour Payroll", "Processing Casual Labour Payroll"],
        "Machinery Repair & Maintenance": ["BMC Repair", "BMC Cleaning", "Processing Unit Repair", "Technician Fees", "Depreciation"],
        "Rent of Premises": ["Processing Unit Rent", "Rent Farm"],
    },
    "Milk Transportation Cost": {
        "Vehicle Fuel": ["Fuel - Milk Transportation", "Fast Tag/Toll Charges", "Vehicle Repair", "Vehicle Rent", "Vehicle Rent/EMI"],
        "Salary": ["Driver Payroll", "Helper Payroll", "Sanjeev Driver Hisab"],
    },
    "Milk Distribution Cost": {
        "Salary Cost": ["Delivery Person Payroll", "Distribution Supervisor Payroll", "Customer Support Caller Payroll", "Anshu Hostel Feed Payroll"],
        "Rent of Hub": ["Rent Hub"],
        "Distribution Cost - Vehicle": ["Fuel - Delivery", "Petrol", "Diesel - Delivery", "Battery Swapping Charges", "Rent for Vehicle", "Bike Repair", "Delivery Bag Provision"],
        "Customer Adjustments": ["Recharge Bonus to Customer", "Adjustment for Customer", "Discount", "Offers & Discount"],
    },
    "Marketing": {
        "Advertisement": ["Advertisement", "Facebook Advertisement", "Promotional Discounts/Cashback/Referral Bonus", "LinkedIn"],
        "Marketing Materials": ["Designing Cost", "Printing Cost", "Marketing Materials - Others"],
        "Salary": ["Marketing Manager Payroll", "Marketing Executive Payroll"],
    },
    "Software Expenses/IT": {
        "SAAS / Software": ["ERP Charges", "SAAS - Milk Master/Milk Man", "MS Office", "Microsoft 365", "Google Drive", "Web Hosting/ Website", "Website Development and Maintenance", "Accounting Software", "HR Payroll Software", "Software/Software Related"],
    },
    "Office Expenses": {
        "Salary": ["Director Salary", "Top Management Salary", "Support Staff Salary", "Salary"],
        "Office Rent": ["Office Rent & Premises"],
        "Office Running": ["Stationery", "Stationery and Printing", "Travelling", "Mobile Bill", "SMS/WhatsApp Recharge", "PG Charges", "Courier Charges", "CCTV Repair", "Computer Repair"],
        "Professional Fees": ["Professional Fees", "Legal Charges/Services", "Affidavit Exp/Legal Charges"],
    },
    "Finance & Bank Charges": {
        "Banking / Statutory": ["Banking Charges", "Challan"],
    },
    "Other / General": {
        "Other": ["Donation", "Mango Purchase", "Battery", "General"],
    },
}

COST_CENTRES = [
    "Farm / Production", "Milk Procurement", "Processing Unit",
    "Milk Processing and Packaging", "Milk Transportation", "Milk Distribution",
    "Marketing", "IT / Software", "Office / Admin", "Finance / Legal",
    "Rajendra Nagar Hub", "Danapur Hub", "Patna General", "Common / Shared",
    "Other / Admin",
]
PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Auto-debit", "Cheque", "Card"]
PAYMENT_STATUSES = ["Paid", "Partly Paid", "Unpaid", "Accrued / Provision", "Reimbursed", "Not Applicable"]
PRODUCT_LINES = ["Cow Milk - Pouch", "Cow Milk - Bottle", "Buffalo Milk", "Paneer", "Curd", "Buttermilk", "Ghee", "Common / Shared"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class VendorCreate(BaseModel):
    name: str
    contact: Optional[str] = None

class Vendor(VendorCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=now_iso)

class CategoryCreate(BaseModel):
    main_category: str
    sub_category: str
    detailed_head: str

class Category(CategoryCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    custom: bool = True
    created_at: str = Field(default_factory=now_iso)

class ExpenseBase(BaseModel):
    date: str  # YYYY-MM-DD
    vendor: str
    main_category: str
    sub_category: Optional[str] = None
    detailed_head: Optional[str] = None
    amount: float = 0.0
    payment_status: str = "Unpaid"
    payment_mode: Optional[str] = None
    paid_amount: float = 0.0
    # optional business detail
    voucher_no: Optional[str] = None
    cost_centre: Optional[str] = None
    product_line: Optional[str] = None
    gst_available: bool = False
    taxable_amount: Optional[float] = None
    gst_percent: Optional[float] = None
    gst_amount: Optional[float] = None
    tds: Optional[float] = None
    due_date: Optional[str] = None
    payment_date: Optional[str] = None
    bank_cash_account: Optional[str] = None
    remarks: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class Expense(ExpenseBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    month: str = ""
    outstanding: float = 0.0
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)
    deleted_at: Optional[str] = None

class PaymentRecord(BaseModel):
    paid_amount: float
    payment_mode: Optional[str] = None
    payment_date: Optional[str] = None


def _derive(expense: dict) -> dict:
    """Compute month, outstanding and reconcile payment_status."""
    amount = float(expense.get("amount") or 0)
    paid = float(expense.get("paid_amount") or 0)
    outstanding = round(amount - paid, 2)
    if outstanding < 0:
        outstanding = 0.0
    expense["outstanding"] = outstanding
    date = expense.get("date") or ""
    expense["month"] = date[:7] if len(date) >= 7 else ""
    status = expense.get("payment_status")
    if status not in ("Not Applicable", "Accrued / Provision", "Reimbursed"):
        if paid <= 0:
            expense["payment_status"] = "Unpaid"
        elif paid >= amount and amount > 0:
            expense["payment_status"] = "Paid"
        else:
            expense["payment_status"] = "Partly Paid"
    return expense


# ---------------------------------------------------------------------------
# Masters
# ---------------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "Paavni Bookkeeping API"}

@api_router.get("/masters")
async def get_masters():
    categories = []
    for main, subs in CATEGORY_HIERARCHY.items():
        sub_list = []
        for sub, heads in subs.items():
            sub_list.append({"sub_category": sub, "detailed_heads": heads})
        categories.append({"main_category": main, "sub_categories": sub_list})
    custom = await db.categories.find({"deleted_at": None}).to_list(1000)
    return {
        "categories": categories,
        "custom_categories": [Category(**c).dict() for c in custom],
        "cost_centres": COST_CENTRES,
        "payment_modes": PAYMENT_MODES,
        "payment_statuses": PAYMENT_STATUSES,
        "product_lines": PRODUCT_LINES,
    }


# ---------------------------------------------------------------------------
# Vendors
# ---------------------------------------------------------------------------
@api_router.get("/vendors", response_model=List[Vendor])
async def list_vendors():
    docs = await db.vendors.find({"deleted_at": None}).sort("name", 1).to_list(1000)
    return [Vendor(**d) for d in docs]

@api_router.post("/vendors", response_model=Vendor)
async def create_vendor(payload: VendorCreate):
    vendor = Vendor(**payload.dict())
    doc = vendor.dict()
    doc["deleted_at"] = None
    await db.vendors.insert_one(doc)
    return vendor

@api_router.put("/vendors/{vendor_id}", response_model=Vendor)
async def update_vendor(vendor_id: str, payload: VendorCreate):
    existing = await db.vendors.find_one({"id": vendor_id, "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.vendors.update_one({"id": vendor_id}, {"$set": payload.dict()})
    updated = await db.vendors.find_one({"id": vendor_id})
    return Vendor(**updated)

@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str):
    await db.vendors.update_one({"id": vendor_id}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Categories (custom additions)
# ---------------------------------------------------------------------------
@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    docs = await db.categories.find({"deleted_at": None}).to_list(1000)
    return [Category(**d) for d in docs]

@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate):
    cat = Category(**payload.dict())
    doc = cat.dict()
    doc["deleted_at"] = None
    await db.categories.insert_one(doc)
    return cat

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str):
    await db.categories.update_one({"id": category_id}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------
@api_router.post("/expenses", response_model=Expense)
async def create_expense(payload: ExpenseCreate):
    expense = Expense(**payload.dict())
    doc = expense.dict()
    doc = _derive(doc)
    doc["deleted_at"] = None
    await db.expenses.insert_one(doc)
    saved = await db.expenses.find_one({"id": expense.id})
    saved.pop("_id", None)
    return Expense(**saved)

@api_router.get("/expenses", response_model=List[Expense])
async def list_expenses(
    month: Optional[str] = None,
    payment_status: Optional[str] = None,
    main_category: Optional[str] = None,
    vendor: Optional[str] = None,
):
    query = {"deleted_at": None}
    if month:
        query["month"] = month
    if payment_status:
        query["payment_status"] = payment_status
    if main_category:
        query["main_category"] = main_category
    if vendor:
        query["vendor"] = vendor
    docs = await db.expenses.find(query).sort("date", -1).to_list(2000)
    out = []
    for d in docs:
        d.pop("_id", None)
        out.append(Expense(**d))
    return out

@api_router.get("/expenses/{expense_id}", response_model=Expense)
async def get_expense(expense_id: str):
    doc = await db.expenses.find_one({"id": expense_id, "deleted_at": None})
    if not doc:
        raise HTTPException(status_code=404, detail="Expense not found")
    doc.pop("_id", None)
    return Expense(**doc)

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, payload: ExpenseCreate):
    existing = await db.expenses.find_one({"id": expense_id, "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    update = payload.dict()
    update["updated_at"] = now_iso()
    merged = {**existing, **update}
    merged = _derive(merged)
    await db.expenses.update_one({"id": expense_id}, {"$set": {
        **update,
        "month": merged["month"],
        "outstanding": merged["outstanding"],
        "payment_status": merged["payment_status"],
    }})
    updated = await db.expenses.find_one({"id": expense_id})
    updated.pop("_id", None)
    return Expense(**updated)

@api_router.post("/expenses/{expense_id}/payment", response_model=Expense)
async def record_payment(expense_id: str, payload: PaymentRecord):
    existing = await db.expenses.find_one({"id": expense_id, "deleted_at": None})
    if not existing:
        raise HTTPException(status_code=404, detail="Expense not found")
    new_paid = round(float(existing.get("paid_amount") or 0) + float(payload.paid_amount), 2)
    update = {
        "paid_amount": new_paid,
        "updated_at": now_iso(),
    }
    if payload.payment_mode:
        update["payment_mode"] = payload.payment_mode
    update["payment_date"] = payload.payment_date or now_iso()[:10]
    merged = {**existing, **update}
    merged = _derive(merged)
    update["month"] = merged["month"]
    update["outstanding"] = merged["outstanding"]
    update["payment_status"] = merged["payment_status"]
    await db.expenses.update_one({"id": expense_id}, {"$set": update})
    updated = await db.expenses.find_one({"id": expense_id})
    updated.pop("_id", None)
    return Expense(**updated)

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str):
    await db.expenses.update_one({"id": expense_id}, {"$set": {"deleted_at": now_iso()}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@api_router.get("/dashboard")
async def dashboard(month: Optional[str] = None):
    query = {"deleted_at": None}
    if month:
        query["month"] = month
    docs = await db.expenses.find(query).to_list(5000)
    total = 0.0
    paid = 0.0
    outstanding = 0.0
    by_category = {}
    by_status = {}
    for d in docs:
        amt = float(d.get("amount") or 0)
        p = float(d.get("paid_amount") or 0)
        o = float(d.get("outstanding") or 0)
        total += amt
        paid += p
        outstanding += o
        cat = d.get("main_category") or "Other / General"
        by_category[cat] = by_category.get(cat, 0.0) + amt
        st = d.get("payment_status") or "Unpaid"
        entry = by_status.setdefault(st, {"count": 0, "amount": 0.0})
        entry["count"] += 1
        entry["amount"] += amt

    cat_list = sorted(
        [{"category": k, "amount": round(v, 2)} for k, v in by_category.items()],
        key=lambda x: x["amount"], reverse=True,
    )
    status_list = [{"status": k, "count": v["count"], "amount": round(v["amount"], 2)} for k, v in by_status.items()]

    months = await db.expenses.distinct("month", {"deleted_at": None})
    months = sorted([m for m in months if m], reverse=True)

    return {
        "month": month,
        "total": round(total, 2),
        "paid": round(paid, 2),
        "outstanding": round(outstanding, 2),
        "count": len(docs),
        "by_category": cat_list,
        "by_status": status_list,
        "months": months,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
