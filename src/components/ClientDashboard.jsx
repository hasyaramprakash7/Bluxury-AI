import { useEffect, useRef, useState } from "react";

const DAILY_SLOTS = ["10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM", "05:30 PM"];

function GeminiSparkle({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" className={className}>
      <defs>
        <linearGradient id="geminiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="35%" stopColor="#9B72CB" />
          <stop offset="70%" stopColor="#D96570" />
          <stop offset="100%" stopColor="#34A853" />
        </linearGradient>
      </defs>
      <path
        d="M14 2C14.8 9.2 18.8 13.2 26 14C18.8 14.8 14.8 18.8 14 26C13.2 18.8 9.2 14.8 2 14C9.2 13.2 13.2 9.2 14 2Z"
        fill="url(#geminiGrad)"
      />
    </svg>
  );
}

function EditableConfirmBookingCard({ draft, workspace, onConfirm, onCancel }) {
  const [name, setName] = useState(draft?.client_name || "");
  const [contact, setContact] = useState(draft?.client_contact || "");
  const [service, setService] = useState(
    draft?.service_name || workspace.services[0]?.name || ""
  );
  const [date, setDate] = useState(draft?.booking_date || "");
  const [time, setTime] = useState(draft?.booking_time || "");
  const [notes, setNotes] = useState(draft?.project_notes || "");
  const [submitted, setSubmitted] = useState(false);

  const takenTimes = new Set(
    workspace.bookings
      .filter((b) => b.booking_date === date && b.status !== "completed")
      .map((b) => b.booking_time)
  );

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !date || !time || submitted) return;
    setSubmitted(true);
    onConfirm({
      client_name: name.trim(),
      client_contact: contact.trim(),
      service_name: service || workspace.services[0]?.name || "Consultation",
      project_title: `${service || "Consultation"} Booking`,
      project_notes: notes.trim() || "Confirmed by user",
      booking_date: date,
      booking_time: time,
    });
  };

  return (
    <form
      onSubmit={handleConfirm}
      className="mt-3 rounded-3xl p-4 bg-white dark:bg-[#1e1f20] border border-[#dfe4ea] dark:border-[#3c4043] shadow-sm space-y-3 max-w-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0b57d0] dark:text-[#a8c7fa]">
          Review & Confirm Your Schedule (Tap any field to edit)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-[#5f6368] dark:text-[#9aa0a6] mb-0.5 px-1">
            Full Name
          </label>
          <input
            type="text"
            required
            disabled={submitted}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl px-3 py-1.5 text-xs bg-[#f0f4f9] dark:bg-[#131314] border border-[#dfe4ea] dark:border-[#3c4043]"
          />
        </div>
        <div>
          <label className="block text-[10px] text-[#5f6368] dark:text-[#9aa0a6] mb-0.5 px-1">
            Phone / WhatsApp
          </label>
          <input
            type="text"
            required
            disabled={submitted}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full rounded-2xl px-3 py-1.5 text-xs bg-[#f0f4f9] dark:bg-[#131314] border border-[#dfe4ea] dark:border-[#3c4043]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-[#5f6368] dark:text-[#9aa0a6] mb-0.5 px-1">
            Course / Package
          </label>
          <select
            disabled={submitted}
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full rounded-2xl px-3 py-1.5 text-xs bg-[#f0f4f9] dark:bg-[#131314] border border-[#dfe4ea] dark:border-[#3c4043]"
          >
            {workspace.services.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name} ({s.price})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-[#5f6368] dark:text-[#9aa0a6] mb-0.5 px-1">
            Date
          </label>
          <input
            type="date"
            required
            disabled={submitted}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-2xl px-3 py-1.5 text-xs bg-[#f0f4f9] dark:bg-[#131314] border border-[#dfe4ea] dark:border-[#3c4043]"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-[#5f6368] dark:text-[#9aa0a6] mb-1 px-1">
          Time Slot
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DAILY_SLOTS.map((slot) => {
            const isBooked = takenTimes.has(slot);
            const isSelected = time === slot;
            return (
              <button
                key={slot}
                type="button"
                disabled={isBooked || submitted}
                onClick={() => setTime(slot)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  isBooked
                    ? "opacity-40 line-through cursor-not-allowed bg-black/5 dark:bg-[#131314]"
                    : isSelected
                    ? "bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#041e49] cursor-pointer"
                    : "bg-[#f0f4f9] hover:bg-[#e8f0fe] dark:bg-[#131314] dark:hover:bg-[#282a2c] border border-[#dfe4ea] dark:border-[#3c4043] cursor-pointer"
                }`}
              >
                {slot}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-[10px] text-[#5f6368] dark:text-[#9aa0a6] mb-0.5 px-1">
          Notes / Experience Level (Optional)
        </label>
        <input
          type="text"
          disabled={submitted}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Beginner..."
          className="w-full rounded-2xl px-3 py-1.5 text-xs bg-[#f0f4f9] dark:bg-[#131314] border border-[#dfe4ea] dark:border-[#3c4043]"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitted || !name.trim() || !contact.trim() || !date || !time}
          className="flex-1 py-2.5 rounded-full bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#041e49] disabled:opacity-40 text-xs font-medium transition cursor-pointer"
        >
          {submitted ? "✓ Confirmed" : "✓ Confirm Booking"}
        </button>
        {!submitted && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-full bg-[#f0f4f9] hover:bg-[#e2e7ee] dark:bg-[#131314] dark:hover:bg-[#282a2c] text-xs font-medium transition cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default function ClientDashboard({
  workspace,
  clientMemory,
  messages,
  isThinking,
  darkMode,
  onToggleTheme,
  showModeToggle,
  onSwitchToVendor,
  onSendMessage,
  onDirectBook,
  onCancelDraft,
  onClearChat,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("services");
  const [modePill, setModePill] = useState("chat");
  const [input, setInput] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split("T")[0];
  });
  const [selectedTime, setSelectedTime] = useState("");
  const [quickName, setQuickName] = useState("");
  const [quickContact, setQuickContact] = useState("");
  const [quickService, setQuickService] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [chatPickedDate, setChatPickedDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split("T")[0];
  });

  const bottomRef = useRef(null);

  useEffect(() => {
    if (clientMemory?.name) setQuickName(clientMemory.name);
    if (clientMemory?.contact) setQuickContact(clientMemory.contact);
    if (clientMemory?.preferred_service) setQuickService(clientMemory.preferred_service);
  }, [clientMemory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const takenTimes = new Set(
    workspace.bookings
      .filter((b) => b.booking_date === selectedDate && b.status !== "completed")
      .map((b) => b.booking_time)
  );

  const activeModelMeta = workspace.availableModels.find(
    (m) => m.id === workspace.profile.ai_model
  );

  const shortModelName = activeModelMeta
    ? activeModelMeta.label.split(" (")[0]
    : "Fast AI";

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    onSendMessage(input);
    setInput("");
  };

  const handleAskAboutService = (serviceName) => {
    setDrawerOpen(false);
    onSendMessage(`Tell me about ${serviceName}`);
  };

  const handleQuickBookSubmit = (e) => {
    e.preventDefault();
    if (!selectedTime || !quickName.trim() || !quickContact.trim()) return;
    onDirectBook({
      client_name: quickName.trim(),
      client_contact: quickContact.trim(),
      service_name: quickService || workspace.services[0]?.name || "Consultation",
      project_title: `${quickService || "Project"} Inquiry`,
      project_notes: quickNotes,
      booking_date: selectedDate,
      booking_time: selectedTime,
    });
    setSelectedTime("");
    setQuickNotes("");
    setDrawerOpen(false);
  };

  const suggestionItems = [
    {
      text: "What services & packages do you offer?",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
    {
      text: "Help me pick the right course or package",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
        </svg>
      ),
    },
    {
      text: "I want to book a slot",
      icon: (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const renderSidebarBody = () => (
    <div className="flex flex-col h-full bg-[#f0f4f9] dark:bg-[#1e1f20] text-[#1f1f1f] dark:text-[#e3e3e3] select-none">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <GeminiSparkle className="w-5 h-5 shrink-0" />
          <span className="text-[17px] font-medium tracking-tight truncate">
            {workspace.profile.company_name || "bluxury"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          aria-label="Close Menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3 py-2">
        <button
          type="button"
          onClick={() => {
            onClearChat();
            setDrawerOpen(false);
          }}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full bg-[#dfe4ea] hover:bg-[#d3d9e2] dark:bg-[#282a2c] dark:hover:bg-[#333537] text-sm font-medium transition cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>New chat</span>
        </button>
      </div>

      <nav className="px-3 py-1 space-y-0.5 text-[13px]">
        <button
          type="button"
          onClick={() => setSidebarTab("services")}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-full transition cursor-pointer ${
            sidebarTab === "services"
              ? "bg-[#d3e3fd] text-[#041e49] dark:bg-[#004a77]/50 dark:text-[#c2e7ff] font-medium"
              : "hover:bg-black/5 dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5]"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>Services & Courses ({workspace.services.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarTab("slots")}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-full transition cursor-pointer ${
            sidebarTab === "slots"
              ? "bg-[#d3e3fd] text-[#041e49] dark:bg-[#004a77]/50 dark:text-[#c2e7ff] font-medium"
              : "hover:bg-black/5 dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5]"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Quick Slot Picker</span>
        </button>

        <button
          type="button"
          onClick={() => setSidebarTab("about")}
          className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-full transition cursor-pointer ${
            sidebarTab === "about"
              ? "bg-[#d3e3fd] text-[#041e49] dark:bg-[#004a77]/50 dark:text-[#c2e7ff] font-medium"
              : "hover:bg-black/5 dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5]"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Company Details</span>
        </button>
      </nav>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 border-t border-black/10 dark:border-[#2c2d2e] mt-2">
        {sidebarTab === "services" && (
          <>
            <p className="px-2 text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6]">
              Tap any option to view details
            </p>
            {workspace.services.length === 0 && (
              <p className="px-2 text-xs text-[#5f6368] dark:text-[#9aa0a6]">
                No services added yet.
              </p>
            )}
            {workspace.services.map((s) => (
              <div
                key={s.id}
                onClick={() => handleAskAboutService(s.name)}
                className="p-2.5 rounded-xl bg-white/80 hover:bg-white dark:bg-[#131314] dark:hover:bg-[#282a2c] border border-black/5 dark:border-[#2c2d2e] transition cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium truncate">{s.name}</span>
                  <span className="text-[11px] text-[#0b57d0] dark:text-[#a8c7fa] font-medium shrink-0">
                    {s.price}
                  </span>
                </div>
                <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] truncate">
                  {s.duration}
                </p>
                {s.description && (
                  <p className="text-[11px] text-[#444746] dark:text-[#c4c7c5] line-clamp-2">
                    {s.description}
                  </p>
                )}
              </div>
            ))}
          </>
        )}

        {sidebarTab === "slots" && (
          <div className="space-y-3 px-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                1. Pick Date & Time
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                }}
                className="bg-white dark:bg-[#131314] border border-black/10 dark:border-[#3c4043] rounded-lg px-2 py-1 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DAILY_SLOTS.map((slot) => {
                const booked = takenTimes.has(slot);
                const active = selectedTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={booked}
                    onClick={() => setSelectedTime(slot)}
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium transition ${
                      booked
                        ? "opacity-40 line-through cursor-not-allowed bg-black/5 dark:bg-[#131314]"
                        : active
                        ? "bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#041e49] cursor-pointer"
                        : "bg-white hover:bg-[#e8f0fe] dark:bg-[#131314] dark:hover:bg-[#282a2c] border border-black/10 dark:border-[#3c4043] cursor-pointer"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleQuickBookSubmit}
              className="space-y-2 pt-2 border-t border-black/10 dark:border-[#2c2d2e]"
            >
              <p className="text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                2. Enter Details & Confirm
              </p>
              <input
                type="text"
                required
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-white dark:bg-[#131314] border border-black/10 dark:border-[#3c4043] rounded-xl px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                required
                value={quickContact}
                onChange={(e) => setQuickContact(e.target.value)}
                placeholder="Phone / WhatsApp / Email"
                className="w-full bg-white dark:bg-[#131314] border border-black/10 dark:border-[#3c4043] rounded-xl px-3 py-1.5 text-xs"
              />
              <select
                value={quickService}
                onChange={(e) => setQuickService(e.target.value)}
                className="w-full bg-white dark:bg-[#131314] border border-black/10 dark:border-[#3c4043] rounded-xl px-3 py-1.5 text-xs"
              >
                <option value="">Choose Course / Service...</option>
                {workspace.services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} ({s.price})
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Notes or level (optional)..."
                className="w-full bg-white dark:bg-[#131314] border border-black/10 dark:border-[#3c4043] rounded-xl px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={!selectedTime || !quickName.trim() || !quickContact.trim()}
                className="w-full py-2 rounded-full bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#041e49] disabled:opacity-40 text-xs font-medium cursor-pointer"
              >
                {selectedTime
                  ? `Confirm ${selectedDate} • ${selectedTime}`
                  : "Select a Time Slot Above"}
              </button>
            </form>

            {workspace.bookings.length > 0 && (
              <div className="pt-2 border-t border-black/10 dark:border-[#2c2d2e] space-y-1.5">
                <p className="text-[11px] font-medium text-[#5f6368] dark:text-[#9aa0a6]">
                  Reserved Slots ({workspace.bookings.length})
                </p>
                {workspace.bookings.slice(0, 6).map((b) => (
                  <div
                    key={b.id}
                    className="p-2 rounded-xl bg-white/80 dark:bg-[#131314] border border-black/5 dark:border-[#2c2d2e] text-[11px]"
                  >
                    <div className="font-medium truncate">{b.service_name}</div>
                    <div className="text-[#0b57d0] dark:text-[#a8c7fa]">
                      {b.booking_date} • {b.booking_time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {sidebarTab === "about" && (
          <div className="px-2 space-y-2 text-xs text-[#444746] dark:text-[#c4c7c5]">
            {workspace.profile.tagline && (
              <p className="font-medium text-[#1f1f1f] dark:text-white">
                {workspace.profile.tagline}
              </p>
            )}
            <p>
              <strong>Hours:</strong> {workspace.profile.working_hours}
            </p>
            {workspace.profile.contact_info && (
              <p>
                <strong>Contact:</strong> {workspace.profile.contact_info}
              </p>
            )}
            {workspace.profile.about_details && (
              <p className="leading-relaxed pt-1">{workspace.profile.about_details}</p>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-black/10 dark:border-[#2c2d2e] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] to-[#D96570] text-white flex items-center justify-center text-xs font-semibold shrink-0">
            {(clientMemory?.name || workspace.profile.company_name || "B")[0].toUpperCase()}
          </div>
          <div className="truncate">
            <p className="text-xs font-medium truncate">
              {clientMemory?.name || "Guest Visitor"}
            </p>
            <p className="text-[10px] text-[#5f6368] dark:text-[#9aa0a6] truncate">
              {shortModelName}
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/5 dark:bg-[#282a2c] text-[#5f6368] dark:text-[#9aa0a6]">
          Live
        </span>
      </div>
    </div>
  );

  const renderGeminiPromptControls = (isCenteredHero) => (
    <div className="w-full max-w-[720px] mx-auto space-y-3">
      <form
        onSubmit={handleChatSubmit}
        className="flex items-center gap-2 rounded-[28px] px-3.5 py-2 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-[#e0e4ec] dark:bg-[#1e1f20] dark:shadow-none dark:border-[#3c4043]/60 focus-within:border-[#4285F4] dark:focus-within:border-[#a8c7fa] transition"
      >
        <button
          type="button"
          onClick={() => {
            setSidebarTab("services");
            setDrawerOpen(true);
          }}
          title="Services & Quick Slots"
          className="p-2 rounded-full text-[#444746] hover:bg-black/5 dark:text-[#c4c7c5] dark:hover:bg-[#282a2c] transition cursor-pointer shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isThinking}
          placeholder={`Ask ${workspace.profile.company_name || "bluxury"}`}
          className="flex-1 bg-transparent py-1.5 text-[15px] text-[#1f1f1f] placeholder-[#5f6368] dark:text-[#e3e3e3] dark:placeholder-[#9aa0a6] focus:outline-none"
        />

        <button
          type="button"
          onClick={() => {
            setSidebarTab("services");
            setDrawerOpen(true);
          }}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-[#444746] hover:bg-black/5 dark:text-[#c4c7c5] dark:hover:bg-[#282a2c] transition cursor-pointer shrink-0"
        >
          <span>{shortModelName}</span>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          type="submit"
          disabled={isThinking || !input.trim()}
          aria-label="Send"
          className="p-2.5 rounded-full bg-[#e8f0fe] text-[#0b57d0] hover:bg-[#d3e3fd] dark:bg-[#282a2c] dark:text-[#e3e3e3] dark:hover:bg-[#333537] disabled:opacity-40 transition cursor-pointer shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </form>

      {isCenteredHero && (
        <div className="flex items-center justify-center gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => setModePill("chat")}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              modePill === "chat"
                ? "bg-white text-[#1f1f1f] shadow-xs dark:bg-[#282a2c] dark:text-[#e3e3e3]"
                : "text-[#444746] hover:bg-black/5 dark:text-[#9aa0a6] dark:hover:bg-[#1e1f20]"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => {
              setModePill("task");
              onSendMessage("I want to book a slot");
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
              modePill === "task"
                ? "bg-white text-[#1f1f1f] shadow-xs dark:bg-[#282a2c] dark:text-[#e3e3e3]"
                : "text-[#444746] hover:bg-black/5 dark:text-[#9aa0a6] dark:hover:bg-[#1e1f20]"
            }`}
          >
            Book Slot
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden bg-gradient-to-b from-[#f8fafd] via-[#f3f7fe] to-[#e4effd] dark:bg-none dark:bg-[#131314] text-[#1f1f1f] dark:text-[#e3e3e3]">
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

      <aside className="hidden lg:block w-[268px] shrink-0 border-r border-[#dfe4ea] dark:border-[#282a2c]">
        {renderSidebarBody()}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="px-4 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open Menu"
              className="lg:hidden p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9h16M4 15h16" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[17px] font-medium truncate">
                {workspace.profile.company_name || "bluxury"}
              </span>
              <span className="hidden sm:inline text-[15px] text-[#5f6368] dark:text-[#9aa0a6] truncate">
                {shortModelName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {showModeToggle && (
              <div className="flex items-center p-0.5 rounded-full bg-white/90 dark:bg-[#1e1f20] border border-[#dfe4ea] dark:border-[#3c4043]">
                <button
                  type="button"
                  onClick={onSwitchToVendor}
                  className="px-3 py-1 rounded-full text-xs font-medium text-[#444746] dark:text-[#c4c7c5] hover:text-[#1f1f1f] dark:hover:text-white transition cursor-pointer"
                >
                  Vendor
                </button>
                <button
                  type="button"
                  className="px-3 py-1 rounded-full text-xs font-medium bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#041e49] cursor-pointer"
                >
                  Client
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-full bg-white/90 dark:bg-[#1e1f20] border border-[#dfe4ea] dark:border-[#3c4043] hover:opacity-80 transition cursor-pointer text-xs"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            <button
              type="button"
              onClick={onClearChat}
              title="New Chat"
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-[#282a2c] text-[#444746] dark:text-[#c4c7c5] transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>

            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#4285F4] via-[#9B72CB] to-[#D96570] text-white flex items-center justify-center text-xs font-semibold shrink-0">
              {(clientMemory?.name || workspace.profile.company_name || "U")[0].toUpperCase()}
            </div>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col justify-between lg:justify-center px-4 sm:px-8 pb-5 pt-4 overflow-y-auto">
            <div className="lg:hidden" />

            <div className="w-full max-w-[720px] mx-auto space-y-6 my-auto">
              <div className="flex flex-col items-center text-center space-y-3">
                <GeminiSparkle className="w-9 h-9 lg:hidden" />
                <h2 className="text-[28px] sm:text-[34px] font-normal tracking-tight">
                  {clientMemory?.name
                    ? `What's the vibe, ${clientMemory.name}?`
                    : "Where should we start?"}
                </h2>
              </div>

              <div className="hidden lg:block">{renderGeminiPromptControls(true)}</div>

              <div className="max-w-[540px] mx-auto pt-2 space-y-1">
                {suggestionItems.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    onClick={() => onSendMessage(item.text)}
                    className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-left text-sm hover:bg-black/5 dark:text-[#c4c7c5] dark:hover:bg-[#1e1f20] transition cursor-pointer"
                  >
                    <span className="text-[#444746] dark:text-[#9aa0a6]">{item.icon}</span>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:hidden pt-4">{renderGeminiPromptControls(true)}</div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
              <div className="max-w-[720px] mx-auto space-y-6">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex gap-3.5 ${
                      m.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {m.role === "assistant" && (
                      <div className="mt-1 shrink-0">
                        <GeminiSparkle className="w-6 h-6" />
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] sm:max-w-[82%] text-[15px] leading-relaxed ${
                        m.role === "user"
                          ? "rounded-3xl rounded-br-md px-4 py-2.5 bg-[#e8f0fe] text-[#1f1f1f] dark:bg-[#282a2c] dark:text-[#e3e3e3] whitespace-pre-wrap"
                          : "py-1 flex-1"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>

                      {/* 1. Clickable Course / Package Chips */}
                      {m.role === "assistant" &&
                        m.uiHints?.showServiceOptions &&
                        workspace.services.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {workspace.services.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => onSendMessage(s.name)}
                                className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-[#e8f0fe] dark:bg-[#1e1f20] dark:hover:bg-[#282a2c] text-[#0b57d0] dark:text-[#a8c7fa] border border-[#dfe4ea] dark:border-[#3c4043] transition cursor-pointer"
                              >
                                {s.name}
                              </button>
                            ))}
                          </div>
                        )}

                      {/* 2. Clickable Date Chips */}
                      {m.role === "assistant" && m.uiHints?.showDateOptions && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onSendMessage("Tomorrow")}
                            className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-[#e8f0fe] dark:bg-[#1e1f20] dark:hover:bg-[#282a2c] text-[#0b57d0] dark:text-[#a8c7fa] border border-[#dfe4ea] dark:border-[#3c4043] transition cursor-pointer"
                          >
                            Tomorrow
                          </button>
                          <div className="flex items-center gap-1.5 bg-white dark:bg-[#1e1f20] border border-[#dfe4ea] dark:border-[#3c4043] rounded-full px-2.5 py-1">
                            <input
                              type="date"
                              value={chatPickedDate}
                              onChange={(e) => setChatPickedDate(e.target.value)}
                              className="text-xs bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => onSendMessage(chatPickedDate)}
                              className="px-2.5 py-0.5 rounded-full bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#041e49] text-[11px] font-medium cursor-pointer"
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 3. Clickable Time Slot Chips */}
                      {m.role === "assistant" && m.uiHints?.showTimeOptions && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {DAILY_SLOTS.map((slot) => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => onSendMessage(slot)}
                              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-[#e8f0fe] dark:bg-[#1e1f20] dark:hover:bg-[#282a2c] text-[#0b57d0] dark:text-[#a8c7fa] border border-[#dfe4ea] dark:border-[#3c4043] transition cursor-pointer"
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* 4. Editable Final Review & Confirm Card */}
                      {m.role === "assistant" &&
                        m.uiHints?.showConfirmCard &&
                        m.uiHints?.draftBooking && (
                          <EditableConfirmBookingCard
                            draft={m.uiHints.draftBooking}
                            workspace={workspace}
                            onConfirm={onDirectBook}
                            onCancel={onCancelDraft}
                          />
                        )}

                      {/* 5. Subtle Book CTA Pill */}
                      {m.role === "assistant" && m.uiHints?.showBookCtaPill && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onSendMessage(
                                `I want to book ${m.uiHints.preselectedService}`
                              )
                            }
                            className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#0b57d0] text-white dark:bg-[#a8c7fa] dark:text-[#041e49] transition cursor-pointer"
                          >
                            Book {m.uiHints.preselectedService} →
                          </button>
                        </div>
                      )}

                      {/* 6. Confirmed Schedule Receipt */}
                      {m.role === "assistant" && m.bookingCreated && (
                        <div className="mt-3 rounded-2xl p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-1 max-w-md">
                          <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                            ✓ Confirmed Schedule #{m.bookingCreated.id}
                          </div>
                          <div>
                            <strong>Course / Service:</strong> {m.bookingCreated.service_name}
                          </div>
                          <div>
                            <strong>When:</strong> {m.bookingCreated.booking_date} at{" "}
                            {m.bookingCreated.booking_time}
                          </div>
                          <div>
                            <strong>Name:</strong> {m.bookingCreated.client_name} (
                            {m.bookingCreated.client_contact})
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-center gap-3.5">
                    <GeminiSparkle className="w-6 h-6 animate-spin" />
                    <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                      Thinking...
                    </span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="px-4 sm:px-8 pb-4 pt-2 shrink-0">
              {renderGeminiPromptControls(false)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}