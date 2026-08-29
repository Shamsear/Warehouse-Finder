"use client";

import { useEffect, useState } from "react";

interface Warehouse {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  country: string;
  freeZone: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  status: string;
  priority: string;
  source: string;
  notes: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  tags: string[];
  _count: { messages: number };
}

interface Analytics {
  total: number;
  withPhone: number;
  withEmail: number;
  recentlyContacted: number;
  dueFollowUp: number;
  byCountry: Record<string, number>;
  byStatus: Record<string, number>;
  byCity: { city: string; count: number }[];
  bySource: Record<string, number>;
}

interface Template {
  id: number;
  name: string;
  body: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  replied: "bg-purple-100 text-purple-800",
  interested: "bg-green-100 text-green-800",
  meeting_set: "bg-emerald-100 text-emerald-800",
  ready: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  not_interested: "bg-red-100 text-red-800",
  no_response: "bg-orange-100 text-orange-800",
  follow_up: "bg-indigo-100 text-indigo-800",
};

const STATUS_OPTIONS = [
  "new", "contacted", "replied", "interested", "meeting_set",
  "ready", "closed", "not_interested", "no_response", "follow_up",
];

export default function Dashboard() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeResults, setScrapeResults] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail view
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [detailData, setDetailData] = useState<(Warehouse & { messages: { id: number; content: string; sentAt: string; direction: string }[]; contacts: { id: number; name: string; title: string | null; phone: string | null; email: string | null }[] }) | null>(null);

  // Message composer
  const [showComposer, setShowComposer] = useState(false);
  const [composerTemplate, setComposerTemplate] = useState("");
  const [composerMessage, setComposerMessage] = useState("");

  // Add warehouse modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWarehouse, setNewWarehouse] = useState({
    name: "", address: "", city: "", country: "UAE", freeZone: "",
    phone: "", email: "", website: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterCountry) params.set("country", filterCountry);
    if (filterStatus) params.set("status", filterStatus);
    if (filterCity) params.set("city", filterCity);
    params.set("page", page.toString());
    params.set("limit", "50");

    try {
      const [whRes, analyticsRes, templatesRes] = await Promise.all([
        fetch(`/api/warehouses?${params}`),
        fetch("/api/analytics"),
        fetch("/api/templates"),
      ]);
      const whData = await whRes.json();
      const analyticsData = await analyticsRes.json();
      const templatesData = await templatesRes.json();

      setWarehouses(whData.warehouses || []);
      setTotalPages(whData.totalPages || 1);
      setTotal(whData.total || 0);
      setAnalytics(analyticsData);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [page, search, filterCountry, filterStatus, filterCity]);

  const fetchDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/warehouses/${id}`);
      const data = await res.json();
      setDetailData(data);
      setSelectedWarehouse(data);
    } catch (error) {
      console.error("Failed to fetch detail:", error);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/warehouses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
    if (selectedWarehouse?.id === id) {
      fetchDetail(id);
    }
  };

  const updateNotes = async (id: number, notes: string) => {
    await fetch(`/api/warehouses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  };

  const triggerScrape = async (source: string = "all") => {
    setScraping(true);
    setScrapeResults("Running scrape...");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await res.json();
      if (data.success) {
        setScrapeResults(`✅ Scrape complete! ${data.totalNew} new warehouses found.`);
        fetchData();
      } else {
        setScrapeResults(`❌ Scrape failed: ${data.error}`);
      }
    } catch (error) {
      setScrapeResults("❌ Scrape request failed");
    }
    setScraping(false);
  };

  const openWhatsApp = async (warehouse: Warehouse, message: string) => {
    if (!warehouse.phone) {
      alert("No phone number available for this warehouse");
      return;
    }

    // Log the message
    await fetch(`/api/warehouses/${warehouse.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message, direction: "outgoing" }),
    });

    // Format phone for WhatsApp
    const phone = warehouse.phone.replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");

    fetchData();
    setShowComposer(false);
  };

  const fillTemplate = (template: Template, warehouse: Warehouse) => {
    const filled = template.body
      .replace(/\{\{name\}\}/g, warehouse.name)
      .replace(/\{\{city\}\}/g, warehouse.city || "your area")
      .replace(/\{\{country\}\}/g, warehouse.country)
      .replace(/\{\{freeZone\}\}/g, warehouse.freeZone || "");
    setComposerMessage(filled);
    setComposerTemplate(template.name);
  };

  const addWarehouse = async () => {
    await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newWarehouse, country: newWarehouse.country || "UAE" }),
    });
    setShowAddModal(false);
    setNewWarehouse({ name: "", address: "", city: "", country: "UAE", freeZone: "", phone: "", email: "", website: "" });
    fetchData();
  };

  const exportCSV = () => {
    const headers = ["Name", "City", "Country", "Free Zone", "Phone", "Email", "Website", "Status", "Source"];
    const rows = warehouses.map(w => [
      w.name, w.city || "", w.country, w.freeZone || "", w.phone || "", w.email || "", w.website || "", w.status, w.source,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Analytics summary cards
  const statCards = analytics ? [
    { label: "Total Warehouses", value: analytics.total, color: "text-blue-600" },
    { label: "With Phone", value: analytics.withPhone, color: "text-green-600" },
    { label: "With Email", value: analytics.withEmail, color: "text-purple-600" },
    { label: "Contacted (7d)", value: analytics.recentlyContacted, color: "text-yellow-600" },
    { label: "Due Follow-up", value: analytics.dueFollowUp, color: "text-red-600" },
    { label: "UAE", value: analytics.byCountry?.["UAE"] || 0, color: "text-emerald-600" },
    { label: "Qatar", value: analytics.byCountry?.["Qatar"] || 0, color: "text-teal-600" },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏭</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Warehouse Directory</h1>
              <p className="text-sm text-gray-500">UAE & Qatar — ERP Pitch Pipeline</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportCSV} className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
              📊 Export CSV
            </button>
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
              + Add Manual
            </button>
            <button
              onClick={() => triggerScrape("all")}
              disabled={scraping}
              className="px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
            >
              {scraping ? "⏳ Scraping..." : "🔍 Scrape Now"}
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — Analytics */}
        <aside className="w-64 bg-white border-r border-gray-200 p-4 min-h-[calc(100vh-73px)]">
          <h2 className="font-semibold text-gray-900 mb-3">📊 Overview</h2>
          <div className="space-y-2">
            {statCards.map((card) => (
              <div key={card.label} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{card.label}</span>
                <span className={`text-sm font-bold ${card.color}`}>{card.value}</span>
              </div>
            ))}
          </div>

          <hr className="my-4" />

          <h2 className="font-semibold text-gray-900 mb-3">📍 Top Cities</h2>
          <div className="space-y-1">
            {analytics?.byCity?.slice(0, 8).map((c) => (
              <div key={c.city} className="flex justify-between text-sm">
                <span className="text-gray-600">{c.city}</span>
                <span className="text-gray-400">{c.count}</span>
              </div>
            ))}
          </div>

          <hr className="my-4" />

          <h2 className="font-semibold text-gray-900 mb-3">📦 Sources</h2>
          <div className="space-y-1">
            {Object.entries(analytics?.bySource || {}).map(([source, count]) => (
              <div key={source} className="flex justify-between text-sm">
                <span className="text-gray-600">{source}</span>
                <span className="text-gray-400">{count as number}</span>
              </div>
            ))}
          </div>

          {scrapeResults && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              {scrapeResults}
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex gap-3 flex-wrap items-center">
              <input
                type="text"
                placeholder="Search name, address, phone, email..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 min-w-[300px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <select value={filterCountry} onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All Countries</option>
                <option value="UAE">UAE</option>
                <option value="Qatar">Qatar</option>
              </select>
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">All Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
              <input
                type="text"
                placeholder="Filter by city..."
                value={filterCity}
                onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40"
              />
              <span className="text-sm text-gray-500">{total} results</span>
            </div>
          </div>

          {/* Warehouse Table */}
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : warehouses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No warehouses found</p>
              <p className="text-gray-400 text-sm mt-2">Click &quot;Scrape Now&quot; to discover warehouses, or add one manually</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Zone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {warehouses.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => fetchDetail(w.id)}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{w.name}</div>
                        {w.email && <div className="text-xs text-gray-400">{w.email}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{w.city || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{w.freeZone || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{w.phone || "—"}</td>
                      <td className="px-4 py-3">
                        <select
                          value={w.status}
                          onChange={(e) => { e.stopPropagation(); updateStatus(w.id, e.target.value); }}
                          className={`text-xs px-2 py-1 rounded-full border-0 ${STATUS_COLORS[w.status] || "bg-gray-100"}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{w.source}</td>
                      <td className="px-4 py-3">
                        {w.phone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWarehouse(w);
                              setShowComposer(true);
                              if (templates.length > 0) fillTemplate(templates[0], w);
                            }}
                            className="text-xs px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded"
                          >
                            📱 WhatsApp
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex justify-between items-center px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="text-sm px-3 py-1 rounded border border-gray-300 disabled:opacity-50">
                  ← Previous
                </button>
                <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="text-sm px-3 py-1 rounded border border-gray-300 disabled:opacity-50">
                  Next →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Detail Slide-over */}
      {selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => { setSelectedWarehouse(null); setDetailData(null); }}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-[500px] bg-white h-full overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{detailData?.name || selectedWarehouse.name}</h2>
                <p className="text-sm text-gray-500">{detailData?.city || selectedWarehouse.city}, {selectedWarehouse.country}</p>
              </div>
              <button onClick={() => { setSelectedWarehouse(null); setDetailData(null); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                <select
                  value={detailData?.status || selectedWarehouse.status}
                  onChange={(e) => detailData && updateStatus(detailData.id, e.target.value)}
                  className={`mt-1 w-full px-3 py-2 rounded-lg text-sm border ${STATUS_COLORS[detailData?.status || selectedWarehouse.status] || ""}`}
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">Contact Information</h3>
                {detailData?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>📞</span>
                    <a href={`tel:${detailData.phone}`} className="text-blue-600 hover:underline">{detailData.phone}</a>
                  </div>
                )}
                {detailData?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>✉️</span>
                    <a href={`mailto:${detailData.email}`} className="text-blue-600 hover:underline">{detailData.email}</a>
                  </div>
                )}
                {detailData?.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>🌐</span>
                    <a href={detailData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">{detailData.website}</a>
                  </div>
                )}
                {detailData?.address && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>📍</span>
                    <span className="text-gray-600">{detailData.address}</span>
                  </div>
                )}
                {detailData?.freeZone && (
                  <div className="flex items-center gap-2 text-sm">
                    <span>🏗️</span>
                    <span className="text-gray-600">Free Zone: {detailData.freeZone}</span>
                  </div>
                )}
              </div>

              {/* Contacts */}
              {detailData?.contacts && detailData.contacts.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">People</h3>
                  {detailData.contacts.map(c => (
                    <div key={c.id} className="p-2 bg-gray-50 rounded-lg text-sm mb-1">
                      <div className="font-medium">{c.name} {c.title && <span className="text-gray-400">— {c.title}</span>}</div>
                      {c.phone && <div className="text-gray-500">{c.phone}</div>}
                      {c.email && <div className="text-gray-500">{c.email}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                <textarea
                  defaultValue={detailData?.notes || ""}
                  onBlur={(e) => detailData && updateNotes(detailData.id, e.target.value)}
                  placeholder="Add notes about this warehouse..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={4}
                />
              </div>

              {/* Message History */}
              {detailData?.messages && detailData.messages.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Message History</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {detailData.messages.map(m => (
                      <div key={m.id} className={`p-3 rounded-lg text-sm ${m.direction === "outgoing" ? "bg-blue-50 border-l-4 border-blue-400" : "bg-green-50 border-l-4 border-green-400"}`}>
                        <div className="text-xs text-gray-400 mb-1">
                          {m.direction === "outgoing" ? "→ Sent" : "← Received"} — {new Date(m.sentAt).toLocaleDateString()}
                        </div>
                        <div className="text-gray-700 whitespace-pre-wrap">{m.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WhatsApp Send */}
              <div>
                <button
                  onClick={() => {
                    setShowComposer(true);
                    if (templates.length > 0) fillTemplate(templates[0], detailData || selectedWarehouse);
                  }}
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                >
                  📱 Send WhatsApp Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Composer Modal */}
      {showComposer && selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowComposer(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-xl shadow-xl w-[600px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold">Compose WhatsApp Message</h2>
              <button onClick={() => setShowComposer(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="text-sm text-gray-500">
                Sending to: <strong>{selectedWarehouse.name}</strong> — {selectedWarehouse.phone || "No phone"}
              </div>

              {/* Template selector */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Template</label>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => fillTemplate(t, selectedWarehouse)}
                      className={`px-3 py-1 text-xs rounded-full border ${composerTemplate === t.name ? "bg-blue-100 border-blue-400 text-blue-700" : "border-gray-300 hover:bg-gray-50"}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message textarea */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Message</label>
                <textarea
                  value={composerMessage}
                  onChange={(e) => setComposerMessage(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={10}
                  placeholder="Type your message here..."
                />
                <p className="text-xs text-gray-400 mt-1">Variables: {"{{name}}"} = {selectedWarehouse.name}, {"{{city}}"} = {selectedWarehouse.city || "city"}</p>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowComposer(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={() => openWhatsApp(selectedWarehouse, composerMessage)}
                  disabled={!selectedWarehouse.phone || !composerMessage}
                  className="px-6 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  📱 Send on WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowAddModal(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-white rounded-xl shadow-xl w-[500px]" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Warehouse</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {(["name", "address", "city", "phone", "email", "website", "freeZone"] as const).map(field => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-500 uppercase">{field}</label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={newWarehouse[field]}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, [field]: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder={`Enter ${field}`}
                  />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Country</label>
                <select value={newWarehouse.country}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, country: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="UAE">UAE</option>
                  <option value="Qatar">Qatar</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cancel</button>
                <button onClick={addWarehouse} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Add Warehouse</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
