import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const API = `${BASE}/api`;

export type PaymentEntry = {
  id: string;
  amount: number;
  mode?: string | null;
  date: string;
  note?: string | null;
  created_at: string;
};

export type Expense = {
  id: string;
  date: string;
  month: string;
  vendor: string;
  main_category: string;
  sub_category?: string | null;
  detailed_head?: string | null;
  amount: number;
  payment_status: string;
  payment_mode?: string | null;
  paid_amount: number;
  outstanding: number;
  payments?: PaymentEntry[];
  voucher_no?: string | null;
  cost_centre?: string | null;
  product_line?: string | null;
  gst_available?: boolean;
  taxable_amount?: number | null;
  gst_percent?: number | null;
  gst_amount?: number | null;
  tds?: number | null;
  due_date?: string | null;
  payment_date?: string | null;
  bank_cash_account?: string | null;
  remarks?: string | null;
};

export type Vendor = { id: string; name: string; contact?: string | null };

export type SubCategory = { sub_category: string; detailed_heads: string[] };
export type MainCategory = { main_category: string; sub_categories: SubCategory[] };

export type Masters = {
  categories: MainCategory[];
  custom_categories: { id: string; main_category: string; sub_category: string; detailed_head: string }[];
  cost_centres: string[];
  payment_modes: string[];
  payment_statuses: string[];
  product_lines: string[];
};

export type Dashboard = {
  month: string | null;
  total: number;
  paid: number;
  outstanding: number;
  count: number;
  by_category: { category: string; amount: number }[];
  by_status: { status: string; count: number; amount: number }[];
  months: string[];
  budget: {
    has_budgets: boolean;
    total_budget: number;
    total_spent: number;
    by_category: { category: string; budget: number; spent: number; remaining: number; pct: number }[];
  };
};

export type Budget = { id: string; month: string; main_category: string; amount: number };

export type Recurring = {
  id: string;
  vendor: string;
  main_category: string;
  sub_category?: string | null;
  detailed_head?: string | null;
  amount: number;
  day_of_month: number;
  last_generated?: string | null;
  active: boolean;
};

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Request failed: ${res.status}`);
  }
  return res.json();
}

// ---- Masters ----
export function useMasters() {
  return useQuery({ queryKey: ["masters"], queryFn: () => req<Masters>("/masters") });
}

// ---- Dashboard ----
export function useDashboard(month: string | null) {
  const q = month ? `?month=${month}` : "";
  return useQuery({ queryKey: ["dashboard", month], queryFn: () => req<Dashboard>(`/dashboard${q}`) });
}

// ---- Expenses ----
export type ExpenseFilters = {
  month?: string | null;
  payment_status?: string | null;
  main_category?: string | null;
  vendor?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  q?: string | null;
};

export function useExpenses(filters: ExpenseFilters = {}) {
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  if (filters.payment_status) params.set("payment_status", filters.payment_status);
  if (filters.main_category) params.set("main_category", filters.main_category);
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.q) params.set("q", filters.q);
  const qs = params.toString();
  return useQuery({
    queryKey: ["expenses", filters],
    queryFn: () => req<Expense[]>(`/expenses${qs ? `?${qs}` : ""}`),
  });
}

export function useExpense(id?: string) {
  return useQuery({
    queryKey: ["expense", id],
    queryFn: () => req<Expense>(`/expenses/${id}`),
    enabled: !!id,
  });
}

function invalidateExpenses(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["expenses"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["vendor-dues"] });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Expense>) =>
      req<Expense>("/expenses", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => invalidateExpenses(qc),
  });
}

export function useUpdateExpense(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Expense>) =>
      req<Expense>(`/expenses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidateExpenses(qc);
      qc.invalidateQueries({ queryKey: ["expense", id] });
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => req(`/expenses/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidateExpenses(qc),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; paid_amount: number; payment_mode?: string; payment_date?: string; note?: string }) =>
      req<Expense>(`/expenses/${args.id}/payment`, {
        method: "POST",
        body: JSON.stringify({
          paid_amount: args.paid_amount,
          payment_mode: args.payment_mode,
          payment_date: args.payment_date,
          note: args.note,
        }),
      }),
    onSuccess: (_d, vars) => {
      invalidateExpenses(qc);
      qc.invalidateQueries({ queryKey: ["expense", vars.id] });
      qc.invalidateQueries({ queryKey: ["vendor-dues"] });
    },
  });
}

// ---- Vendor dues ----
export type VendorDue = {
  vendor: string;
  total: number;
  paid: number;
  outstanding: number;
  bills: number;
  open_bills: number;
};
export type VendorDues = { vendors: VendorDue[]; total_outstanding: number };

export function useVendorDues() {
  return useQuery({ queryKey: ["vendor-dues"], queryFn: () => req<VendorDues>("/vendors/dues") });
}

// ---- Export ----
export function exportUrl(month: string | null): string {
  return `${API}/export${month ? `?month=${month}` : ""}`;
}
export function exportVendorUrl(vendor: string): string {
  return `${API}/export?vendor=${encodeURIComponent(vendor)}`;
}

// ---- Recurring ----
export function useRecurring() {
  return useQuery({ queryKey: ["recurring"], queryFn: () => req<Recurring[]>("/recurring") });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => req(`/recurring/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["recurring"] }),
  });
}

// ---- AI ----
export type ParsedExpense = {
  date?: string | null;
  vendor?: string | null;
  main_category?: string | null;
  sub_category?: string | null;
  detailed_head?: string | null;
  amount?: number | null;
  payment_mode?: string | null;
  payment_status?: string | null;
  product_line?: string | null;
  remarks?: string | null;
};

export function useParseExpense() {
  return useMutation({
    mutationFn: (text: string) =>
      req<{ parsed: ParsedExpense }>("/ai/parse-expense", { method: "POST", body: JSON.stringify({ text }) }),
  });
}

export type AiChatMessage = { id?: string; role: "user" | "assistant"; content: string };

export function useAiChat() {
  return useMutation({
    mutationFn: (args: { session_id: string | null; message: string }) =>
      req<{ session_id: string; reply: string }>("/ai/chat", {
        method: "POST",
        body: JSON.stringify(args),
      }),
  });
}

// ---- Budgets ----
export function useBudgets(month: string) {
  return useQuery({
    queryKey: ["budgets", month],
    queryFn: () => req<Budget[]>(`/budgets?month=${month}`),
    enabled: !!month,
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { month: string; main_category: string; amount: number }) =>
      req<Budget>("/budgets", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["budgets", vars.month] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; month: string }) =>
      req(`/budgets/${args.id}`, { method: "DELETE" }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["budgets", vars.month] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ---- Vendors ----
export function useVendors() {
  return useQuery({ queryKey: ["vendors"], queryFn: () => req<Vendor[]>("/vendors") });
}

export function useCreateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; contact?: string }) =>
      req<Vendor>("/vendors", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export function useDeleteVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => req(`/vendors/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vendors"] }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { main_category: string; sub_category: string; detailed_head: string }) =>
      req("/categories", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["masters"] }),
  });
}
