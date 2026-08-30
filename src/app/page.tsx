"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Warehouse as WarehouseIcon, Search, Phone, Mail, Globe, MapPin,
  Download, Plus, Filter, Close, ChevronLeft, ChevronRight,
  Send, Building, Users, MessageSquare, Clock,
  ExternalLink, Note, WhatsApp,
} from "@/components/icons";

// ── Types ──
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

interface WarehouseDetail extends Warehouse {
  messages: { id: number; content: string; sentAt: string; direction: string }[];
  contacts: { id: number; name: string; title: string | null; phone: string | null; email: string | null }[];
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

// ── Status Config ──
const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  new:            { label: "New",            dot: "bg-slate-400",   bg: "bg-slate-50",   text: "text-slate-700" },
  contacted:      { label: "Contacted",      dot: "bg-amber-400",   bg: "bg-amber-50",   text: "text-amber-700" },
  replied:        { label: "Replied",        dot: "bg-violet-400",  bg: "bg-violet-50",  text: "text-violet-700" },
  interested:     { label: "Interested",     dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700" },
  meeting_set:    { label: "Meeting Set",    dot: "bg-cyan-400",    bg: "bg-cyan-50",    text: "text-cyan-700" },
  ready:          { label: "Ready",          dot: "bg-green-400",   bg: "bg-green-50",   text: "text-green-700" },
  closed:         { label: "Closed",         dot: "bg-slate-600",   bg: "bg-slate-100",  text: "text-slate-600" },
  not_interested: { label: "Not Interested", dot: "bg-rose-400",    bg: "bg-rose-50",    text: "text-rose-700" },
  no_response:    { label: "No Response",    dot: "bg-orange-400",  bg: "bg-orange-50",  text: "text-orange-700" },
  follow_up:      { label: "Follow Up",      dot: "bg-blue-400",    bg: "bg-blue-50",    text: "text-blue-700" },
};

const STATUS_OPTIONS = [
  "new", "contacted", "replied", "interested", "meeting_set",
  "ready", "closed", "not_interested", "no_response", "follow_up",
];

// ── Status Badge ──
function StatusBadge({ status, onChange }: { status: string; onChange?: (s: string) => void }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  if (onChange) {
    return (
      <select
        value={status}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className={`${config.bg} ${config.text} text-xs font-medium px-2.5 py-1 rounded-full border-0 cursor-pointer hover:opacity-80 transition-opacity`}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
        ))}
      </select>
    );
  }
  return (
    <span className={`${config.bg} ${config.text} text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// ── Stat Card ──
function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: number; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow">
      <div className={`${accent} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-semibold text-slate-900 leading-none">{value.toLocaleString()}</div>
        <div className="text-xs text-slate-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ── Empty State ──
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
        <WarehouseIcon size={28} className="text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">No warehouses yet</h3>
      <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
        Add warehouses across UAE and Qatar to start building your pipeline.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          Add Warehouse
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ──
export default function Dashboard() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);


  // Filters
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail panel
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<WarehouseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Composer
  const [showComposer, setShowComposer] = useState(false);
  const [composerTemplate, setComposerTemplate] = useState("");
  const [composerMessage, setComposerMessage] = useState("");

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", city: "", country: "UAE", freeZone: "", phone: "", email: "", website: "" });

  // ── Data fetching ──
  const fetchData = useCallback(async () => {
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
    } catch {
      // silent
    }
    setLoading(false);
  }, [search, filterCountry, filterStatus, filterCity, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchDetail = async (id: number) => {
    setDetailId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/warehouses/${id}`);
      setDetail(await res.json());
    } catch { /* silent */ }
    setDetailLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/warehouses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchData();
    if (detailId === id) fetchDetail(id);
  };

  const updateNotes = async (id: number, notes: string) => {
    await fetch(`/api/warehouses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
  };

  const openWhatsApp = async (warehouse: Warehouse, message: string) => {
    if (!warehouse.phone) return;
    await fetch(`/api/warehouses/${warehouse.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message, direction: "outgoing" }),
    });
    const phone = warehouse.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    fetchData();
    setShowComposer(false);
  };

  const fillTemplate = (template: Template, w: Warehouse) => {
    setComposerMessage(
      template.body
        .replace(/\{\{name\}\}/g, w.name)
        .replace(/\{\{city\}\}/g, w.city || "your area")
        .replace(/\{\{country\}\}/g, w.country)
        .replace(/\{\{freeZone\}\}/g, w.freeZone || "")
    );
    setComposerTemplate(template.name);
  };

  const addWarehouse = async () => {
    await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, country: form.country || "UAE" }),
    });
    setShowAdd(false);
    setForm({ name: "", address: "", city: "", country: "UAE", freeZone: "", phone: "", email: "", website: "" });
    fetchData();
  };

  const exportCSV = () => {
    const headers = ["Name", "City", "Country", "Free Zone", "Phone", "Email", "Website", "Status", "Source"];
    const rows = warehouses.map((w) => [w.name, w.city || "", w.country, w.freeZone || "", w.phone || "", w.email || "", w.website || "", w.status, w.source]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const activeDetail = detailId !== null ? (detail && detail.id === detailId ? detail : null) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center">
              <WarehouseIcon size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 leading-tight">Warehouse Finder</h1>
              <p className="text-xs text-slate-500">UAE & Qatar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Download size={15} />
              Export
            </button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Plus size={15} />
              Add
            </button>

          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto flex">
        {/* ── Sidebar ── */}
        <aside className="sidebar-enter w-56 border-r border-slate-200 bg-white p-4 flex-shrink-0 min-h-[calc(100vh-64px)]">
          <div className="space-y-1">
            <SidebarSection icon={<Building size={14} />} title="Overview" />
            <SidebarStat label="Total" value={analytics?.total} />
            <SidebarStat label="With phone" value={analytics?.withPhone} />
            <SidebarStat label="With email" value={analytics?.withEmail} />
            <SidebarStat label="Contacted (7d)" value={analytics?.recentlyContacted} />
            <SidebarStat label="Follow-up due" value={analytics?.dueFollowUp} accent={analytics?.dueFollowUp ? "text-rose-600" : undefined} />
          </div>

          <div className="my-4 border-t border-slate-100" />

          <div className="space-y-1">
            <SidebarSection icon={<MapPin size={14} />} title="Countries" />
            <SidebarStat label="UAE" value={analytics?.byCountry?.UAE} />
            <SidebarStat label="Qatar" value={analytics?.byCountry?.Qatar} />
          </div>

          {analytics?.byCity && analytics.byCity.length > 0 && (
            <>
              <div className="my-4 border-t border-slate-100" />
              <div className="space-y-1">
                <SidebarSection icon={<WarehouseIcon size={14} />} title="Cities" />
                {analytics.byCity.slice(0, 8).map((c) => (
                  <SidebarStat key={c.city} label={c.city} value={c.count} />
                ))}
              </div>
            </>
          )}

          {analytics?.bySource && Object.keys(analytics.bySource).length > 0 && (
            <>
              <div className="my-4 border-t border-slate-100" />
              <div className="space-y-1">
                <SidebarSection icon={<Globe size={14} />} title="Sources" />
                {Object.entries(analytics.bySource).map(([source, count]) => (
                  <SidebarStat key={source} label={source.replace(/_/g, " ")} value={count as number} />
                ))}
              </div>
            </>
          )}
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 p-6">
          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search warehouses..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>

            <select
              value={filterCountry}
              onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">All countries</option>
              <option value="UAE">UAE</option>
              <option value="Qatar">Qatar</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="">All status</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>

            <input
              type="text"
              placeholder="City"
              value={filterCity}
              onChange={(e) => { setFilterCity(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />

            <span className="text-xs text-slate-400 ml-1 tabular-nums">{total.toLocaleString()} results</span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-6 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="skeleton h-4 w-48" />
                    <div className="skeleton h-4 w-20" />
                    <div className="skeleton h-4 w-16" />
                    <div className="skeleton h-4 w-28" />
                    <div className="skeleton h-6 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ) : warehouses.length === 0 ? (
            <EmptyState onAdd={() => setShowAdd(true)} />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider">Location</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {warehouses.map((w) => (
                    <tr
                      key={w.id}
                      className="table-row cursor-pointer"
                      onClick={() => fetchDetail(w.id)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-sm text-slate-900 truncate max-w-[280px]">{w.name}</div>
                        {w.freeZone && <div className="text-xs text-slate-400 mt-0.5">{w.freeZone}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                          <span>{w.city || "—"}</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{w.country}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {w.phone ? (
                          <div className="flex items-center gap-1.5 text-sm text-slate-700 font-mono">
                            <Phone size={13} className="text-slate-400 flex-shrink-0" />
                            {w.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={w.status} onChange={(s) => { updateStatus(w.id, s); }} />
                      </td>
                      <td className="px-5 py-3.5">
                        {w.phone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailId(w.id);
                              fetchDetail(w.id);
                              setShowComposer(true);
                              if (templates.length > 0) fillTemplate(templates[0], w);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                          >
                            <WhatsApp size={13} />
                            Send
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-25">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <span className="text-xs text-slate-400 tabular-nums">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Detail Panel ── */}
      {detailId !== null && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => { setDetailId(null); setDetail(null); }}>
          <div className="overlay-enter absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" />
          <div
            className="panel-enter relative w-full max-w-[480px] bg-white h-full overflow-y-auto shadow-2xl border-l border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-start justify-between z-10">
              <div className="min-w-0 flex-1">
                {detailLoading && !activeDetail ? (
                  <div className="space-y-2">
                    <div className="skeleton h-5 w-48" />
                    <div className="skeleton h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <h2 className="text-base font-semibold text-slate-900 truncate">{activeDetail?.name || "Loading..."}</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                      <MapPin size={13} />
                      {activeDetail?.city}, {activeDetail?.country}
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => { setDetailId(null); setDetail(null); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors ml-3"
              >
                <Close size={18} />
              </button>
            </div>

            {activeDetail && (
              <div className="px-6 py-5 space-y-6">
                {/* Status */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Status</label>
                  <div className="mt-2">
                    <StatusBadge
                      status={activeDetail.status}
                      onChange={(s) => updateStatus(activeDetail.id, s)}
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Contact</label>
                  <div className="mt-2 space-y-2">
                    {activeDetail.phone && (
                      <a href={`tel:${activeDetail.phone}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600 transition-colors group">
                        <span className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                          <Phone size={14} className="text-slate-500 group-hover:text-blue-500" />
                        </span>
                        <span className="font-mono">{activeDetail.phone}</span>
                      </a>
                    )}
                    {activeDetail.email && (
                      <a href={`mailto:${activeDetail.email}`} className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600 transition-colors group">
                        <span className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                          <Mail size={14} className="text-slate-500 group-hover:text-blue-500" />
                        </span>
                        <span className="truncate">{activeDetail.email}</span>
                      </a>
                    )}
                    {activeDetail.website && (
                      <a href={activeDetail.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600 transition-colors group">
                        <span className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-blue-50 flex items-center justify-center transition-colors">
                          <Globe size={14} className="text-slate-500 group-hover:text-blue-500" />
                        </span>
                        <span className="truncate">{activeDetail.website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink size={12} className="text-slate-300 flex-shrink-0" />
                      </a>
                    )}
                    {activeDetail.address && (
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                          <MapPin size={14} className="text-slate-500" />
                        </span>
                        <span>{activeDetail.address}</span>
                      </div>
                    )}
                    {activeDetail.freeZone && (
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                          <Building size={14} className="text-slate-500" />
                        </span>
                        <span>Free Zone: {activeDetail.freeZone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contacts */}
                {activeDetail.contacts.length > 0 && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">People</label>
                    <div className="mt-2 space-y-2">
                      {activeDetail.contacts.map((c) => (
                        <div key={c.id} className="p-3 bg-slate-50 rounded-lg">
                          <div className="text-sm font-medium text-slate-900">{c.name}</div>
                          {c.title && <div className="text-xs text-slate-500">{c.title}</div>}
                          {c.phone && <div className="text-xs text-slate-500 font-mono mt-1">{c.phone}</div>}
                          {c.email && <div className="text-xs text-slate-500 mt-0.5">{c.email}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Notes</label>
                  <textarea
                    defaultValue={activeDetail.notes || ""}
                    onBlur={(e) => updateNotes(activeDetail.id, e.target.value)}
                    placeholder="Add notes about this warehouse..."
                    className="w-full mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all"
                    rows={3}
                  />
                </div>

                {/* Messages */}
                {activeDetail.messages.length > 0 && (
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Messages</label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {activeDetail.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-lg text-sm border-l-2 ${
                            m.direction === "outgoing"
                              ? "bg-blue-50/50 border-blue-400"
                              : "bg-emerald-50/50 border-emerald-400"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
                            {m.direction === "outgoing" ? <Send size={10} /> : <MessageSquare size={10} />}
                            {m.direction === "outgoing" ? "Sent" : "Received"} — {new Date(m.sentAt).toLocaleDateString()}
                          </div>
                          <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">{m.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={() => {
                    setShowComposer(true);
                    if (templates.length > 0) fillTemplate(templates[0], activeDetail);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <WhatsApp size={16} />
                  Send WhatsApp Message
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Message Composer ── */}
      {showComposer && (activeDetail || detailId) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowComposer(false)}>
          <div className="overlay-enter absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
          <div className="modal-enter relative bg-white rounded-2xl shadow-2xl w-full max-w-[560px] mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Compose Message</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  To: {activeDetail?.name || "Warehouse"}
                  {activeDetail?.phone && <span className="font-mono ml-1">· {activeDetail.phone}</span>}
                </p>
              </div>
              <button onClick={() => setShowComposer(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Close size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Templates */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Template</label>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => activeDetail && fillTemplate(t, activeDetail)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        composerTemplate === t.name
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Message</label>
                <textarea
                  value={composerMessage}
                  onChange={(e) => setComposerMessage(e.target.value)}
                  className="w-full mt-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all"
                  rows={8}
                  placeholder="Type your message..."
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {"{{name}}"} · {"{{city}}"} · {"{{country}}"} · {"{{freeZone}}"}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button onClick={() => setShowComposer(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => activeDetail && openWhatsApp(activeDetail, composerMessage)}
                  disabled={!activeDetail?.phone || !composerMessage}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <WhatsApp size={15} />
                  Send on WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="overlay-enter absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" />
          <div className="modal-enter relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Add Warehouse</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <Close size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {(["name", "address", "city", "phone", "email", "website", "freeZone"] as const).map((field) => (
                <div key={field}>
                  <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{field}</label>
                  <input
                    type={field === "email" ? "email" : "text"}
                    value={form[field]}
                    onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    placeholder={field}
                  />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Country</label>
                <select
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                >
                  <option value="UAE">UAE</option>
                  <option value="Qatar">Qatar</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-3">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Cancel
                </button>
                <button onClick={addWarehouse} className="px-5 py-2 text-sm bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors">
                  Add Warehouse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sidebar Helpers ──
function SidebarSection({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
      {icon}
      {title}
    </div>
  );
}

function SidebarStat({ label, value, accent }: { label: string; value?: number; accent?: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 rounded-md hover:bg-slate-50 transition-colors">
      <span className="text-[13px] text-slate-600 capitalize">{label}</span>
      <span className={`text-[13px] font-semibold tabular-nums ${accent || "text-slate-900"}`}>
        {value !== undefined ? value.toLocaleString() : "—"}
      </span>
    </div>
  );
}
