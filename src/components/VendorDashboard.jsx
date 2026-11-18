import { useEffect, useState } from "react";

function GeminiSparkle({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className}>
      <defs>
        <linearGradient id="geminiVendorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="35%" stopColor="#9B72CB" />
          <stop offset="70%" stopColor="#D96570" />
          <stop offset="100%" stopColor="#34A853" />
        </linearGradient>
      </defs>
      <path
        d="M14 2C14.8 9.2 18.8 13.2 26 14C18.8 14.8 14.8 18.8 14 26C13.2 18.8 9.2 14.8 2 14C9.2 13.2 13.2 9.2 14 2Z"
        fill="url(#geminiVendorGrad)"
      />
    </svg>
  );
}

export default function VendorDashboard({
  workspace,
  vendorId,
  connected,
  logs,
  pin,
  pinVerified,
  onPinChange,
  onVendorAuth,
  onLogoutVendor,
  onPreviewClient,
  onCopyClientLink,
  onClearLogs,
  onSaveProfile,
  onAddService,
  onDeleteService,
  onUpdateStatus,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("bookings");
  const [companyLoginInput, setCompanyLoginInput] = useState(
    workspace.profile.company_name || vendorId || ""
  );

  const [profile, setProfile] = useState(workspace.profile);
  const [newPin, setNewPin] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceDuration, setServiceDuration] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");

  useEffect(() => {
    setProfile(workspace.profile);
    if (workspace.profile.company_name) {
      setCompanyLoginInput(workspace.profile.company_name);
    } else if (vendorId) {
      setCompanyLoginInput(vendorId);
    }
  }, [workspace.profile, vendorId]);

  const selectedModelMeta = workspace.availableModels.find(
    (m) => m.id === profile.ai_model
  );

  const shortModelName = selectedModelMeta
    ? selectedModelMeta.label.split(" (")[0]
    : "Llama 3.1 8B";

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (newPin.trim()) onPinChange(newPin.trim());
    onSaveProfile(profile, newPin.trim() || undefined);
    setNewPin("");
  };

  const handleServiceSubmit = (e) => {
    e.preventDefault();
    if (!serviceName.trim()) return;
    onAddService({
      name: serviceName,
      price: servicePrice || "Custom Quote",
      duration: serviceDuration || "1 Hour / Custom",
      description: serviceDesc,
    });
    setServiceName("");
    setServicePrice("");
    setServiceDuration("");
    setServiceDesc("");
  };

  const selectTab = (tab) => {
    setActiveTab(tab);
    setDrawerOpen(false);
  };

  if (!vendorId || !pinVerified) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center p-4 bg-gradient-to-b from-[#f8fafd] via-[#f3f7fe] to-[#e4effd] lg:bg-none lg:bg-[#131314] text-[#1f1f1f] lg:text-[#e3e3e3]">
        <div className="w-full max-w-md rounded-3xl p-6 sm:p-8 bg-white lg:bg-[#1e1f20] border border-[#dfe4ea] lg:border-[#282a2c] shadow-xl space-y-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <GeminiSparkle className="w-10 h-10" />
            <h2 className="text-xl sm:text-2xl font-normal tracking-tight">
              Vendor Workspace Access
            </h2>
            <p className="text-xs text-[#5f6368] lg:text-[#9aa0a6]">
              Enter your <strong>Company Name</strong> and <strong>Password</strong> to open or
              create your vendor dashboard.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onVendorAuth(companyLoginInput, pin);
            }}
            className="space-y-3.5"
          >
            <div>
              <label className="block text-xs text-[#5f6368] lg:text-[#9aa0a6] mb-1">
                Company Name / Vendor ID
              </label>
              <input
                type="text"
                required
                value={companyLoginInput}
                onChange={(e) => setCompanyLoginInput(e.target.value)}
                placeholder="e.g., ProNexa or bluxury"
                className="w-full rounded-2xl px-4 py-3 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none focus:border-[#0b57d0] lg:focus:border-[#a8c7fa]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#5f6368] lg:text-[#9aa0a6] mb-1">
                Vendor Password
              </label>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => onPinChange(e.target.value)}
                placeholder="Enter workspace password"
                className="w-full rounded-2xl px-4 py-3 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none focus:border-[#0b57d0] lg:focus:border-[#a8c7fa]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#0b57d0] text-white lg:bg-[#a8c7fa] lg:text-[#041e49] text-sm font-medium transition cursor-pointer"
            >
              Enter Vendor Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full bg-[#f0f4f9] lg:bg-[#1e1f20] text-[#1f1f1f] lg:text-[#e3e3e3] select-none">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <GeminiSparkle className="w-5 h-5 shrink-0" />
          <span className="text-[17px] font-medium tracking-tight truncate">
            {workspace.profile.company_name || vendorId}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-1.5 rounded-full hover:bg-black/5 text-[#444746] cursor-pointer"
          aria-label="Close Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        <button
          type="button"
          onClick={onCopyClientLink}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full bg-[#dfe4ea] hover:bg-[#d3d9e2] lg:bg-[#282a2c] lg:hover:bg-[#333537] text-sm font-medium transition cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy Client Link</span>
        </button>
      </div>

      <nav className="px-3 py-1 space-y-0.5 text-[13px]">
        <button
          type="button"
          onClick={() => selectTab("bookings")}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full transition cursor-pointer ${
            activeTab === "bookings"
              ? "bg-[#d3e3fd] text-[#041e49] lg:bg-[#004a77]/50 lg:text-[#c2e7ff] font-medium"
              : "hover:bg-black/5 lg:hover:bg-[#282a2c] text-[#444746] lg:text-[#c4c7c5]"
          }`}
        >
          <span className="flex items-center gap-3">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Booked Timings</span>
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/10 lg:bg-[#282a2c]">
            {workspace.bookings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => selectTab("profile")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full transition cursor-pointer ${
            activeTab === "profile"
              ? "bg-[#d3e3fd] text-[#041e49] lg:bg-[#004a77]/50 lg:text-[#c2e7ff] font-medium"
              : "hover:bg-black/5 lg:hover:bg-[#282a2c] text-[#444746] lg:text-[#c4c7c5]"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span>Company & AI Model</span>
        </button>

        <button
          type="button"
          onClick={() => selectTab("services")}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full transition cursor-pointer ${
            activeTab === "services"
              ? "bg-[#d3e3fd] text-[#041e49] lg:bg-[#004a77]/50 lg:text-[#c2e7ff] font-medium"
              : "hover:bg-black/5 lg:hover:bg-[#282a2c] text-[#444746] lg:text-[#c4c7c5]"
          }`}
        >
          <span className="flex items-center gap-3">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span>Services & Courses</span>
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/10 lg:bg-[#282a2c]">
            {workspace.services.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => selectTab("logs")}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full transition cursor-pointer ${
            activeTab === "logs"
              ? "bg-[#d3e3fd] text-[#041e49] lg:bg-[#004a77]/50 lg:text-[#c2e7ff] font-medium"
              : "hover:bg-black/5 lg:hover:bg-[#282a2c] text-[#444746] lg:text-[#c4c7c5]"
          }`}
        >
          <span className="flex items-center gap-3">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Latency Logs</span>
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/10 lg:bg-[#282a2c]">
            {logs.length}
          </span>
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto px-3 py-4 mt-2 border-t border-black/10 lg:border-[#2c2d2e] space-y-2.5">
        <button
          type="button"
          onClick={onPreviewClient}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-full bg-[#0b57d0] text-white lg:bg-[#a8c7fa] lg:text-[#041e49] text-xs font-medium transition cursor-pointer"
        >
          <span>Open Client Storefront</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>

        <button
          type="button"
          onClick={onLogoutVendor}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-full bg-black/5 hover:bg-black/10 lg:bg-[#282a2c] lg:hover:bg-[#333537] text-xs font-medium transition cursor-pointer"
        >
          <span>Switch Company / Lock</span>
        </button>
      </div>

      <div className="px-4 py-3 border-t border-black/10 lg:border-[#2c2d2e] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] to-[#D96570] text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {(workspace.profile.company_name || vendorId || "V")[0].toUpperCase()}
          </div>
          <div className="truncate">
            <p className="text-xs font-medium truncate">
              {workspace.profile.company_name || vendorId}
            </p>
            <p className="text-[10px] text-[#5f6368] lg:text-[#9aa0a6] truncate">
              {shortModelName}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full ${
            connected
              ? "bg-emerald-500/15 text-emerald-700 lg:text-emerald-400"
              : "bg-rose-500/15 text-rose-600"
          }`}
        >
          {connected ? "Live" : "Offline"}
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-[#f8fafd] via-[#f3f7fe] to-[#e4effd] lg:bg-none lg:bg-[#131314] text-[#1f1f1f] lg:text-[#e3e3e3]">
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 bottom-0 w-[82%] max-w-[300px] z-50 transform transition-transform duration-300 ease-out lg:hidden shadow-2xl ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderSidebarBody()}
      </aside>

      <aside className="hidden lg:block w-[268px] shrink-0 border-r border-[#282a2c]">
        {renderSidebarBody()}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Vendor Menu"
              className="lg:hidden p-2 rounded-full hover:bg-black/5 text-[#1f1f1f] transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M4 15h16" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[17px] font-medium truncate">
                {workspace.profile.company_name || vendorId}
              </span>
              <span className="text-[15px] text-[#5f6368] lg:text-[#9aa0a6] truncate">
                {shortModelName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPreviewClient}
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/90 hover:bg-white lg:bg-[#1e1f20] lg:hover:bg-[#282a2c] border border-[#dfe4ea] lg:border-[#3c4043] transition cursor-pointer"
            >
              Client View →
            </button>

            <button
              type="button"
              onClick={onLogoutVendor}
              title="Lock / Switch Company"
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/90 hover:bg-white lg:bg-[#1e1f20] lg:hover:bg-[#282a2c] border border-[#dfe4ea] lg:border-[#3c4043] transition cursor-pointer"
            >
              Lock
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
          <div className="max-w-4xl mx-auto space-y-6 pb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3">
                <GeminiSparkle className="w-7 h-7 shrink-0" />
                <div>
                  <h2 className="text-2xl sm:text-[28px] font-normal tracking-tight">
                    {activeTab === "bookings" && "Live Booked Timings"}
                    {activeTab === "profile" && "Company Profile & AI Model"}
                    {activeTab === "services" && "Services & Course Packages"}
                    {activeTab === "logs" && "Real-Time AI Latency Logs"}
                  </h2>
                  <p className="text-xs text-[#5f6368] lg:text-[#9aa0a6]">
                    Client URL: /client/{vendorId} • Password Protected
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: "bookings", label: `Bookings (${workspace.bookings.length})` },
                  { id: "profile", label: "Profile & AI" },
                  { id: "services", label: `Services (${workspace.services.length})` },
                  { id: "logs", label: `Logs (${logs.length})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                      activeTab === t.id
                        ? "bg-[#0b57d0] text-white lg:bg-[#a8c7fa] lg:text-[#041e49]"
                        : "bg-white/80 hover:bg-white lg:bg-[#1e1f20] lg:hover:bg-[#282a2c] border border-[#dfe4ea] lg:border-[#2c2d2e]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "bookings" && (
              <div className="space-y-3">
                {workspace.bookings.length === 0 ? (
                  <div className="rounded-3xl p-10 text-center bg-white/90 lg:bg-[#1e1f20] border border-[#dfe4ea] lg:border-[#282a2c] space-y-3">
                    <GeminiSparkle className="w-8 h-8 mx-auto" />
                    <p className="text-sm font-medium">No bookings scheduled yet</p>
                    <p className="text-xs text-[#5f6368] lg:text-[#9aa0a6] max-w-md mx-auto">
                      Add your company details and services, then open Client View to test booking
                      a slot with your AI concierge.
                    </p>
                    <button
                      type="button"
                      onClick={onPreviewClient}
                      className="px-5 py-2 rounded-full bg-[#0b57d0] text-white lg:bg-[#a8c7fa] lg:text-[#041e49] text-xs font-medium cursor-pointer"
                    >
                      Test Client Concierge →
                    </button>
                  </div>
                ) : (
                  workspace.bookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-3xl p-5 bg-white/95 lg:bg-[#1e1f20] border border-[#dfe4ea] lg:border-[#282a2c] space-y-3 shadow-xs lg:shadow-none"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-medium">{b.project_title}</h3>
                          <p className="text-xs font-medium text-[#0b57d0] lg:text-[#a8c7fa] mt-0.5">
                            {b.booking_date} at {b.booking_time} • {b.service_name}
                          </p>
                        </div>
                        <select
                          value={b.status}
                          onChange={(e) => onUpdateStatus(b.id, e.target.value)}
                          className="rounded-full px-3 py-1 text-xs font-medium bg-[#f0f4f9] lg:bg-[#282a2c] border border-[#dfe4ea] lg:border-[#3c4043] cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>

                      {b.project_notes && (
                        <p className="text-xs text-[#444746] lg:text-[#c4c7c5] rounded-2xl p-3 bg-[#f0f4f9] lg:bg-[#131314]">
                          <strong>Notes:</strong> {b.project_notes}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5f6368] lg:text-[#9aa0a6]">
                        <span>Client: {b.client_name}</span>
                        <span>Contact: {b.client_contact}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === "profile" && (
              <form
                onSubmit={handleProfileSubmit}
                className="rounded-3xl p-5 sm:p-6 bg-white/95 lg:bg-[#1e1f20] border border-[#dfe4ea] lg:border-[#282a2c] space-y-4"
              >
                <div className="rounded-2xl p-4 bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#2c2d2e] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-xs font-medium text-[#0b57d0] lg:text-[#a8c7fa]">
                      Active AI Model for Clients
                    </label>
                    {selectedModelMeta && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#d3e3fd] text-[#041e49] lg:bg-[#004a77]/60 lg:text-[#c2e7ff]">
                        {selectedModelMeta.tier} • {selectedModelMeta.dailyFreeEstimate}
                      </span>
                    )}
                  </div>
                  <select
                    value={profile.ai_model}
                    onChange={(e) => setProfile({ ...profile, ai_model: e.target.value })}
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white lg:bg-[#1e1f20] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                  >
                    {workspace.availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} ({m.tier} — {m.dailyFreeEstimate})
                      </option>
                    ))}
                  </select>
                  {selectedModelMeta && (
                    <p className="text-xs text-[#5f6368] lg:text-[#9aa0a6]">
                      {selectedModelMeta.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5f6368] lg:text-[#9aa0a6] mb-1">
                      Company / Brand Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.company_name}
                      onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                      placeholder="e.g., ProNexa"
                      className="w-full rounded-2xl px-3.5 py-2.5 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5f6368] lg:text-[#9aa0a6] mb-1">
                      Working / Counseling Hours
                    </label>
                    <input
                      type="text"
                      value={profile.working_hours}
                      onChange={(e) => setProfile({ ...profile, working_hours: e.target.value })}
                      placeholder="Mon-Sat, 10:00 AM - 7:00 PM"
                      className="w-full rounded-2xl px-3.5 py-2.5 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5f6368] lg:text-[#9aa0a6] mb-1">
                      Tagline / Specialty
                    </label>
                    <input
                      type="text"
                      value={profile.tagline}
                      onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                      placeholder="Learn AI. Build Skills. Get Placed."
                      className="w-full rounded-2xl px-3.5 py-2.5 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5f6368] lg:text-[#9aa0a6] mb-1">
                      Contact / WhatsApp Info
                    </label>
                    <input
                      type="text"
                      value={profile.contact_info}
                      onChange={(e) => setProfile({ ...profile, contact_info: e.target.value })}
                      placeholder="Hyderabad | +91-9876543210"
                      className="w-full rounded-2xl px-3.5 py-2.5 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[#5f6368] lg:text-[#9aa0a6] mb-1">
                    Company Details, Offers, Placement Stats & FAQs
                  </label>
                  <textarea
                    rows={4}
                    value={profile.about_details}
                    onChange={(e) => setProfile({ ...profile, about_details: e.target.value })}
                    placeholder="Enter policies, placement stats, or offers that the AI should share with clients..."
                    className="w-full rounded-2xl p-3.5 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#5f6368] lg:text-[#9aa0a6] mb-1">
                    Change Vendor Password (optional)
                  </label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full rounded-2xl px-3.5 py-2.5 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-full bg-[#0b57d0] text-white lg:bg-[#a8c7fa] lg:text-[#041e49] text-sm font-medium transition cursor-pointer"
                >
                  Save Profile & AI Model
                </button>
              </form>
            )}

            {activeTab === "services" && (
              <div className="space-y-4">
                <form
                  onSubmit={handleServiceSubmit}
                  className="rounded-3xl p-5 bg-white/95 lg:bg-[#1e1f20] border border-[#dfe4ea] lg:border-[#282a2c] space-y-3"
                >
                  <h3 className="text-sm font-medium">Add New Service or Course</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      required
                      value={serviceName}
                      onChange={(e) => setServiceName(e.target.value)}
                      placeholder="Name (e.g. Agentic AI)"
                      className="rounded-2xl px-3.5 py-2 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      placeholder="Price (e.g. Free Demo)"
                      className="rounded-2xl px-3.5 py-2 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={serviceDuration}
                      onChange={(e) => setServiceDuration(e.target.value)}
                      placeholder="Duration (e.g. 32 Lessons)"
                      className="rounded-2xl px-3.5 py-2 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={serviceDesc}
                      onChange={(e) => setServiceDesc(e.target.value)}
                      placeholder="Syllabus, deliverables, or key features..."
                      className="flex-1 rounded-2xl px-3.5 py-2 text-sm bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#3c4043] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full bg-[#0b57d0] text-white lg:bg-[#a8c7fa] lg:text-[#041e49] text-xs font-medium cursor-pointer shrink-0"
                    >
                      + Add Item
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {workspace.services.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-3xl p-4 bg-white/95 lg:bg-[#1e1f20] border border-[#dfe4ea] lg:border-[#282a2c] flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">{s.name}</span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#d3e3fd] text-[#041e49] lg:bg-[#004a77]/60 lg:text-[#c2e7ff]">
                            {s.price}
                          </span>
                          <span className="text-xs text-[#5f6368] lg:text-[#9aa0a6]">
                            • {s.duration}
                          </span>
                        </div>
                        {s.description && (
                          <p className="text-xs text-[#444746] lg:text-[#c4c7c5] leading-relaxed">
                            {s.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteService(s.id)}
                        className="text-xs text-rose-500 hover:text-rose-400 px-2.5 py-1 rounded-full hover:bg-rose-500/10 cursor-pointer shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "logs" && (
              <div className="rounded-3xl p-5 bg-white/95 lg:bg-[#1e1f20] border border-[#dfe4ea] lg:border-[#282a2c] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#5f6368] lg:text-[#9aa0a6]">
                    Edge SQLite & Workers AI Execution Stream
                  </span>
                  <button
                    type="button"
                    onClick={onClearLogs}
                    className="text-xs text-[#0b57d0] lg:text-[#a8c7fa] hover:underline cursor-pointer"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="rounded-2xl p-3.5 h-80 overflow-y-auto font-mono text-[11px] bg-[#f0f4f9] lg:bg-[#131314] border border-[#dfe4ea] lg:border-[#2c2d2e] space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-[#5f6368] lg:text-[#9aa0a6]">Waiting for events...</div>
                  ) : (
                    logs.map((l, idx) => (
                      <div
                        key={idx}
                        className={
                          l.includes("[ERROR]")
                            ? "text-rose-500"
                            : l.includes("[AI_FIRST_TOKEN]") || l.includes("[COMPLETE]")
                            ? "text-emerald-600 lg:text-emerald-400"
                            : "text-[#1f1f1f] lg:text-[#c4c7c5]"
                        }
                      >
                        {l}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}