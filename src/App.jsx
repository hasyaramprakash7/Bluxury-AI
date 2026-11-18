import { useEffect, useRef, useState } from "react";
import VendorDashboard from "./components/VendorDashboard.jsx";
import ClientDashboard from "./components/ClientDashboard.jsx";

const EMPTY_STATE = {
  profile: {
    company_name: "",
    tagline: "",
    working_hours: "Mon-Sat, 10:00 AM - 7:00 PM",
    contact_info: "",
    about_details: "",
    ai_model: "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
    has_pin: false,
  },
  services: [],
  bookings: [],
  availableModels: [],
};

function getPersistentClientId() {
  const key = "ai_booking_client_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = "client_" + Math.random().toString(36).slice(2, 11);
    localStorage.setItem(key, id);
  }
  return id;
}

function slugifyCompany(name) {
  return (
    String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || ""
  );
}

function parseRouteFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts[0] === "client" && parts[1]) {
    return {
      dashboard: "client",
      vendorId: decodeURIComponent(parts[1]).toLowerCase(),
      clientOnlyMode: true,
    };
  }
  if (parts[0] === "vendor" && parts[1]) {
    return {
      dashboard: "vendor",
      vendorId: decodeURIComponent(parts[1]).toLowerCase(),
      clientOnlyMode: false,
    };
  }
  return {
    dashboard: "vendor",
    vendorId: "",
    clientOnlyMode: false,
  };
}

export default function App() {
  const initialRoute = parseRouteFromUrl();

  const [activeDashboard, setActiveDashboard] = useState(initialRoute.dashboard);
  const [vendorId, setVendorId] = useState(initialRoute.vendorId);
  const [clientOnlyMode, setClientOnlyMode] = useState(initialRoute.clientOnlyMode);

  const [vendorPin, setVendorPin] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [connected, setConnected] = useState(false);
  const [pendingAuth, setPendingAuth] = useState(null);

  const [workspace, setWorkspace] = useState(EMPTY_STATE);
  const [clientMemory, setClientMemory] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState(null);

  const wsRef = useRef(null);
  const clientIdRef = useRef(getPersistentClientId());

  const addClientLog = (line) => {
    setLogs((prev) => [...prev.slice(-49), line]);
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  };

  const navigateTo = (nextDashboard, nextVendorId, lockClientMode = false) => {
    const cleanVendor = slugifyCompany(nextVendorId);
    if (!cleanVendor) {
      window.history.pushState({}, "", "/");
      setVendorId("");
      setPinVerified(false);
      setVendorPin("");
      setActiveDashboard("vendor");
      setClientOnlyMode(false);
      return;
    }

    const nextPath = `/${nextDashboard}/${encodeURIComponent(cleanVendor)}`;
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }

    if (cleanVendor !== vendorId) {
      setChatHistory([]);
      setVendorPin("");
      setPinVerified(false);
      setVendorId(cleanVendor);
    }
    setActiveDashboard(nextDashboard);
    setClientOnlyMode(lockClientMode);
  };

  useEffect(() => {
    const handlePopState = () => {
      const route = parseRouteFromUrl();
      setActiveDashboard(route.dashboard);
      setClientOnlyMode(route.clientOnlyMode);
      if (route.vendorId !== vendorId) {
        setChatHistory([]);
        setVendorPin("");
        setPinVerified(false);
        setVendorId(route.vendorId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) {
      setConnected(false);
      setWorkspace(EMPTY_STATE);
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws?vendor=${encodeURIComponent(
        vendorId
      )}&clientId=${encodeURIComponent(clientIdRef.current)}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      addClientLog(`[SOCKET] Connected to "${vendorId}"`);
      if (pendingAuth && pendingAuth.vendorId === vendorId) {
        ws.send(
          JSON.stringify({
            type: "verify_pin",
            companyName: pendingAuth.companyName,
            pin: pendingAuth.pin,
          })
        );
        setPendingAuth(null);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      setIsThinking(false);
      addClientLog(`[SOCKET] Disconnected from "${vendorId}"`);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "log") {
        addClientLog(msg.line);
      } else if (msg.type === "sync_state") {
        setWorkspace(msg.state);
        if (msg.clientMemory) setClientMemory(msg.clientMemory);
        if (!msg.state.profile.has_pin && vendorPin) {
          setPinVerified(true);
        }
      } else if (msg.type === "pin_result") {
        setPinVerified(Boolean(msg.verified));
        if (msg.verified) {
          if (msg.created) showToast(`Created & locked workspace "${vendorId}"!`);
        } else {
          showToast("Incorrect password for this company.");
        }
      } else if (msg.type === "ai_stream_start") {
        setChatHistory((prev) => [...prev, { role: "assistant", content: "" }]);
      } else if (msg.type === "ai_stream_update") {
        setChatHistory((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: msg.content };
          }
          return updated;
        });
      } else if (msg.type === "ai_stream_end") {
        setIsThinking(false);
        setChatHistory((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = { ...last, content: msg.reply };
          }
          return updated;
        });
        if (msg.clientMemory) setClientMemory(msg.clientMemory);
        if (msg.bookingCreated) {
          showToast(
            `Confirmed: ${msg.bookingCreated.booking_date} at ${msg.bookingCreated.booking_time}`
          );
        }
      } else if (msg.type === "ai_reply") {
        setIsThinking(false);
        setChatHistory((prev) => [...prev, { role: "assistant", content: msg.reply }]);
        if (msg.clientMemory) setClientMemory(msg.clientMemory);
      } else if (msg.type === "toast") {
        showToast(msg.message);
      } else if (msg.type === "error") {
        setIsThinking(false);
        showToast(msg.message);
      }
    };

    return () => ws.close();
  }, [vendorId]);

  const sendSocket = (payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleVendorAuth = (companyNameInput, passwordInput) => {
    const cleanId = slugifyCompany(companyNameInput);
    const cleanPin = String(passwordInput || "").trim();
    if (!cleanId || !cleanPin) {
      showToast("Please enter both Company Name and Password.");
      return;
    }

    setVendorPin(cleanPin);

    if (cleanId === vendorId && wsRef.current?.readyState === WebSocket.OPEN) {
      sendSocket({
        type: "verify_pin",
        companyName: companyNameInput.trim(),
        pin: cleanPin,
      });
    } else {
      setPendingAuth({
        vendorId: cleanId,
        companyName: companyNameInput.trim(),
        pin: cleanPin,
      });
      const nextPath = `/vendor/${encodeURIComponent(cleanId)}`;
      window.history.pushState({}, "", nextPath);
      setChatHistory([]);
      setPinVerified(false);
      setVendorId(cleanId);
    }
  };

  const handleLogoutVendor = () => {
    setPinVerified(false);
    setVendorPin("");
    navigateTo("vendor", "", false);
  };

  const handleClientSend = (text) => {
    if (!text.trim() || isThinking) return;
    setChatHistory((prev) => [...prev, { role: "user", content: text }]);
    setIsThinking(true);
    sendSocket({
      type: "client_chat",
      message: text,
      history: chatHistory,
    });
  };

  const copyClientLink = () => {
    const shareUrl = `${window.location.origin}/client/${encodeURIComponent(vendorId)}`;
    navigator.clipboard.writeText(shareUrl);
    showToast(`Copied Client Link: /client/${vendorId}`);
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden relative">
      {toast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#0b57d0] lg:bg-[#a8c7fa] text-white lg:text-[#041e49] text-xs font-medium px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      {activeDashboard === "client" ? (
        <>
          {!clientOnlyMode && (
            <button
              type="button"
              onClick={() => navigateTo("vendor", vendorId, false)}
              className="fixed bottom-20 right-4 z-30 px-3 py-1.5 rounded-full text-xs font-medium bg-white/95 lg:bg-[#1e1f20]/95 text-[#1f1f1f] lg:text-[#e3e3e3] border border-[#dfe4ea] lg:border-[#3c4043] shadow-lg hover:opacity-90 transition cursor-pointer"
            >
              ← Vendor Admin
            </button>
          )}
          <ClientDashboard
            workspace={workspace}
            clientMemory={clientMemory}
            messages={chatHistory}
            isThinking={isThinking}
            onSendMessage={handleClientSend}
            onDirectBook={(booking) => sendSocket({ type: "direct_book", booking })}
            onClearChat={() => setChatHistory([])}
          />
        </>
      ) : (
        <VendorDashboard
          workspace={workspace}
          vendorId={vendorId}
          connected={connected}
          logs={logs}
          pin={vendorPin}
          pinVerified={pinVerified}
          onPinChange={setVendorPin}
          onVendorAuth={handleVendorAuth}
          onLogoutVendor={handleLogoutVendor}
          onPreviewClient={() => navigateTo("client", vendorId, false)}
          onCopyClientLink={copyClientLink}
          onClearLogs={() => setLogs([])}
          onSaveProfile={(profile, newPin) =>
            sendSocket({ type: "save_profile", profile, pin: vendorPin, newPin })
          }
          onAddService={(service) =>
            sendSocket({ type: "add_service", service, pin: vendorPin })
          }
          onDeleteService={(id) =>
            sendSocket({ type: "delete_service", id, pin: vendorPin })
          }
          onUpdateStatus={(id, status) =>
            sendSocket({ type: "update_booking_status", id, status, pin: vendorPin })
          }
        />
      )}
    </div>
  );
}