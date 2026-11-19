import { DurableObject } from "cloudflare:workers";

export const ALLOWED_MODELS = [
  {
    id: "@cf/ibm-granite/granite-4.0-h-micro",
    label: "Granite 4.0 H Micro (Fastest)",
    tier: "Ultra-Economy",
    dailyFreeEstimate: "~450+ bookings/day free",
    description: "Lowest Neuron cost & fastest TTFT. Ideal for rapid appointment booking.",
  },
  {
    id: "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
    label: "Llama 3.1 8B Fast (Default)",
    tier: "Balanced",
    dailyFreeEstimate: "~300 bookings/day free",
    description: "Best balance of speed, low cost, and reliable structured JSON booking.",
  },
  {
    id: "@cf/zai-org/glm-4.7-flash",
    label: "GLM 4.7 Flash",
    tier: "Agentic & Project Scoping",
    dailyFreeEstimate: "~200 bookings/day free",
    description: "Strong multi-turn project requirement discovery and tool extraction.",
  },
  {
    id: "@cf/google/gemma-4-26b-a4b-it",
    label: "Gemma 4 26B",
    tier: "Pro Reasoning",
    dailyFreeEstimate: "~150 bookings/day free",
    description: "High-accuracy technical project scoping and nuanced client Q&A.",
  },
  {
    id: "@cf/openai/gpt-oss-20b",
    label: "GPT-OSS 20B",
    tier: "Pro Reasoning",
    dailyFreeEstimate: "~120 bookings/day free",
    description: "Deep reasoning for complex software/enterprise consulting quotes.",
  },
  {
    id: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    label: "Llama 3.3 70B Instruct",
    tier: "Flagship",
    dailyFreeEstimate: "~60 bookings/day free",
    description: "Maximum intelligence for complex architectural and multi-service proposals.",
  },
];

const DEFAULT_MODEL_ID = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";

function sanitizeModelId(candidate) {
  if (!candidate) return DEFAULT_MODEL_ID;
  const found = ALLOWED_MODELS.find((m) => m.id === String(candidate).trim());
  return found ? found.id : DEFAULT_MODEL_ID;
}

function stripControlTags(text) {
  let clean = text
    .replace(/<CLIENT_UPDATE>[\s\S]*?<\/CLIENT_UPDATE>/g, "")
    .replace(/<BOOKING_JSON>[\s\S]*?<\/BOOKING_JSON>/g, "");

  const partialIdx = clean.search(/<(CLIENT_UPDATE|BOOKING_JSON|CLIENT_|BOOKING_)/);
  if (partialIdx !== -1) {
    clean = clean.slice(0, partialIdx);
  }
  return clean.trim();
}

function extractStreamToken(parsed) {
  if (!parsed || typeof parsed !== "object") return "";
  if (typeof parsed.response === "string") return parsed.response;
  const deltaContent = parsed.choices?.[0]?.delta?.content;
  if (typeof deltaContent === "string") return deltaContent;
  const messageContent = parsed.choices?.[0]?.message?.content;
  if (typeof messageContent === "string") return messageContent;
  return "";
}

function isLikelyQuestion(text) {
  const lower = text.trim().toLowerCase();
  if (lower.includes("?")) return true;
  return /^(what|which|how|why|when|where|who|tell|explain|show|give|can you|do you|is there|fee|fees|cost|price|much|fist|first)\b/.test(
    lower
  );
}

function isServiceName(candidate, services) {
  if (!candidate) return false;
  const cLower = candidate.trim().toLowerCase();
  return services.some((s) => s.name.trim().toLowerCase() === cLower);
}

const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

function parseDateFromText(text) {
  const lower = text.toLowerCase();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const iso = lower.match(/\b(202\d-\d{2}-\d{2})\b/);
  if (iso) return iso[1];

  if (/\btomorrow\b/.test(lower)) {
    return new Date(Date.now() + 86400000).toISOString().split("T")[0];
  }
  if (/\btoday\b/.test(lower)) {
    return now.toISOString().split("T")[0];
  }

  const monthFirst = lower.match(
    /\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?\b/
  );
  if (monthFirst) {
    return `${year}-${String(MONTHS[monthFirst[1]]).padStart(2, "0")}-${String(Number(monthFirst[2])).padStart(2, "0")}`;
  }

  const dayFirst = lower.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/
  );
  if (dayFirst) {
    return `${year}-${String(MONTHS[dayFirst[2]]).padStart(2, "0")}-${String(Number(dayFirst[1])).padStart(2, "0")}`;
  }

  const thisMonth = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+this\s+month|this\s+month)?\b/);
  if (
    thisMonth &&
    (lower.includes("month") ||
      /\b\d{1,2}(?:st|nd|rd|th)\b/.test(lower) ||
      /^\d{1,2}$/.test(lower.trim()))
  ) {
    const dayNum = Number(thisMonth[1]);
    if (dayNum >= 1 && dayNum <= 31) {
      return `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    }
  }

  return "";
}

function parseTimeFromText(text) {
  const lower = text.toLowerCase();
  const m = lower.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/);
  if (!m) return { formatted: "", outOfHours: false };

  const hour = Number(m[1]);
  const mins = m[2] || "00";
  const period = m[3].toUpperCase();

  let hour24 = hour % 12;
  if (period === "PM") hour24 += 12;

  const outOfHours = hour24 < 10 || hour24 >= 19;
  const formatted = `${String(hour).padStart(2, "0")}:${mins} ${period}`;
  return { formatted, outOfHours };
}

function extractStepByStepDetails(userText, currentMem, services, lastAssistantMsg = "") {
  const updated = { ...currentMem };
  const text = userText.trim();
  const lower = text.toLowerCase();
  let matchedServiceInTurn = false;

  // Wipe any previously poisoned name that matches a service name
  if (isServiceName(updated.name, services)) {
    updated.name = "";
  }

  for (const s of services) {
    const sLower = s.name.toLowerCase();
    if (lower === sLower || lower.includes(sLower)) {
      updated.preferred_service = s.name;
      matchedServiceInTurn = true;
      break;
    }
    const firstWord = sLower.split(" ")[0];
    if (firstWord.length >= 5 && lower.includes(firstWord)) {
      updated.preferred_service = s.name;
      matchedServiceInTurn = true;
      break;
    }
  }

  if (!matchedServiceInTurn && /agentic|agineyic|aginet/i.test(lower)) {
    const agentic = services.find((s) => /agentic/i.test(s.name));
    if (agentic) {
      updated.preferred_service = agentic.name;
      matchedServiceInTurn = true;
    }
  }

  if (isLikelyQuestion(text)) {
    return { updated, outOfHours: false, parsedTime: "" };
  }

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d[\d\s-]{8,14}\d)/);
  if (emailMatch) {
    updated.contact = emailMatch[0].trim();
  } else if (phoneMatch) {
    updated.contact = phoneMatch[0].replace(/\s+/g, "");
  }

  const nameMatch = text.match(
    /(?:my name is|i am|i'm|this is|call me|change name to|name to)\s+([a-zA-Z][a-zA-Z\s]{1,26}?)(?:[.,!]|$)/i
  );

  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    if (
      !isServiceName(candidate, services) &&
      !/^(interested|looking|booking|want|need|here|beginner|intermediate|advanced)$/i.test(candidate)
    ) {
      updated.name = candidate;
    }
  } else if (
    !matchedServiceInTurn &&
    !isServiceName(text, services) &&
    /name/i.test(lastAssistantMsg) &&
    /^[a-zA-Z][a-zA-Z\s]{1,26}$/.test(text) &&
    !/^(yes|ok|okay|sure|confirm|no|cancel|hi|hello|book|demo|slot|tomorrow|today|beginner|intermediate|advanced)$/i.test(text)
  ) {
    updated.name = text;
  }

  const lvlMatch = lower.match(/\b(beginner|intermediate|advanced)\b/i);
  if (lvlMatch) {
    const lvl = lvlMatch[1];
    updated.project_summary = `${lvl.charAt(0).toUpperCase() + lvl.slice(1).toLowerCase()} level`;
  }

  const parsedDate = parseDateFromText(text);
  const { formatted: parsedTime, outOfHours } = parseTimeFromText(text);

  const existingParts = (updated.preferred_slot || "").split("|").map((p) => p.trim());
  let currentDate = /^\d{4}-\d{2}-\d{2}$/.test(existingParts[0] || "") ? existingParts[0] : "";
  let currentTime = /(?:AM|PM)$/i.test(existingParts[1] || "") ? existingParts[1] : "";

  if (parsedDate) currentDate = parsedDate;
  if (parsedTime && !outOfHours) currentTime = parsedTime;

  if (currentDate && currentTime) {
    updated.preferred_slot = `${currentDate} | ${currentTime}`;
  } else if (currentDate) {
    updated.preferred_slot = currentDate;
  } else if (currentTime) {
    updated.preferred_slot = `| ${currentTime}`;
  }

  return { updated, outOfHours, parsedTime };
}

export class VendorWorkspace extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS company_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        company_name TEXT NOT NULL DEFAULT '',
        tagline TEXT NOT NULL DEFAULT '',
        working_hours TEXT NOT NULL DEFAULT 'Mon-Sat, 10:00 AM - 7:00 PM',
        contact_info TEXT NOT NULL DEFAULT '',
        about_details TEXT NOT NULL DEFAULT '',
        ai_model TEXT NOT NULL DEFAULT '${DEFAULT_MODEL_ID}',
        vendor_pin TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        duration TEXT NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS clients (
        client_id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT '',
        contact TEXT NOT NULL DEFAULT '',
        project_summary TEXT NOT NULL DEFAULT '',
        preferred_service TEXT NOT NULL DEFAULT '',
        preferred_slot TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL DEFAULT '',
        client_name TEXT NOT NULL,
        client_contact TEXT NOT NULL,
        service_name TEXT NOT NULL,
        project_title TEXT NOT NULL,
        project_notes TEXT NOT NULL,
        booking_date TEXT NOT NULL,
        booking_time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'confirmed',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      this.ctx.storage.sql.exec(
        `ALTER TABLE company_profile ADD COLUMN ai_model TEXT NOT NULL DEFAULT '${DEFAULT_MODEL_ID}'`
      );
    } catch {
      // Column already exists
    }
  }

  emitLog(ws, stage, detail, ms = null) {
    const time = new Date().toISOString().split("T")[1].replace("Z", "");
    const suffix = ms !== null ? ` (${ms}ms)` : "";
    const line = `[${time}] [${stage}] ${detail}${suffix}`;
    console.log(line);
    try {
      ws.send(JSON.stringify({ type: "log", line, stage, detail, ms }));
    } catch {
      // Ignore closed socket
    }
  }

  async fetch(request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const clientId = (url.searchParams.get("clientId") || "guest").slice(0, 64);

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server, [clientId]);

    const clientMemory = this.getOrCreateClient(clientId);

    server.send(
      JSON.stringify({
        type: "sync_state",
        state: this.getPublicState(),
        clientMemory,
      })
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  getProfileRow() {
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT company_name, tagline, working_hours, contact_info, about_details, ai_model, vendor_pin FROM company_profile WHERE id = 1"
      )
      .toArray();

    return (
      rows[0] || {
        company_name: "",
        tagline: "",
        working_hours: "Mon-Sat, 10:00 AM - 7:00 PM",
        contact_info: "",
        about_details: "",
        ai_model: DEFAULT_MODEL_ID,
        vendor_pin: "",
      }
    );
  }

  getPublicState() {
    const raw = this.getProfileRow();
    const services = this.ctx.storage.sql
      .exec("SELECT id, name, price, duration, description FROM services ORDER BY id ASC")
      .toArray();

    const bookings = this.ctx.storage.sql
      .exec(
        "SELECT id, client_id, client_name, client_contact, service_name, project_title, project_notes, booking_date, booking_time, status, created_at FROM bookings ORDER BY id DESC LIMIT 100"
      )
      .toArray();

    return {
      profile: {
        company_name: raw.company_name || "",
        tagline: raw.tagline,
        working_hours: raw.working_hours,
        contact_info: raw.contact_info,
        about_details: raw.about_details,
        ai_model: sanitizeModelId(raw.ai_model),
        has_pin: Boolean(raw.vendor_pin),
      },
      services,
      bookings,
      availableModels: ALLOWED_MODELS,
    };
  }

  getOrCreateClient(clientId) {
    const services = this.ctx.storage.sql
      .exec("SELECT name FROM services")
      .toArray();

    const existing = this.ctx.storage.sql
      .exec(
        "SELECT client_id, name, contact, project_summary, preferred_service, preferred_slot FROM clients WHERE client_id = ?",
        clientId
      )
      .toArray()[0];

    if (existing) {
      const cleanName =
        existing.name &&
        existing.name.length <= 32 &&
        !isLikelyQuestion(existing.name) &&
        !isServiceName(existing.name, services)
          ? existing.name
          : "";
      const cleanSummary =
        existing.project_summary && !isLikelyQuestion(existing.project_summary)
          ? existing.project_summary
          : "";

      if (cleanName !== existing.name) {
        this.ctx.storage.sql.exec(
          "UPDATE clients SET name = ? WHERE client_id = ?",
          cleanName,
          clientId
        );
      }

      return {
        ...existing,
        name: cleanName,
        project_summary: cleanSummary,
      };
    }

    this.ctx.storage.sql.exec("INSERT INTO clients (client_id) VALUES (?)", clientId);
    return {
      client_id: clientId,
      name: "",
      contact: "",
      project_summary: "",
      preferred_service: "",
      preferred_slot: "",
    };
  }

  saveClientMemory(clientId, mem) {
    this.ctx.storage.sql.exec(
      `UPDATE clients SET name = ?, contact = ?, preferred_service = ?, project_summary = ?, preferred_slot = ?, updated_at = CURRENT_TIMESTAMP WHERE client_id = ?`,
      mem.name || "",
      mem.contact || "",
      mem.preferred_service || "",
      mem.project_summary || "",
      mem.preferred_slot || "",
      clientId
    );
  }

  verifyPin(providedPin) {
    const currentPin = this.getProfileRow().vendor_pin;
    if (!currentPin) return true;
    return currentPin === String(providedPin || "").trim();
  }

  broadcastState() {
    const payload = JSON.stringify({
      type: "sync_state",
      state: this.getPublicState(),
    });
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload);
      } catch {
        // Ignore closed sockets
      }
    }
  }

  isSlotTaken(date, time) {
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT COUNT(*) as cnt FROM bookings WHERE LOWER(booking_date) = LOWER(?) AND LOWER(booking_time) = LOWER(?) AND status != 'completed'",
        date.trim(),
        time.trim()
      )
      .toArray();
    return (rows[0]?.cnt || 0) > 0;
  }

  createConfirmedBooking(ws, clientId, details) {
    const bDate = String(details.booking_date || "").trim();
    const bTime = String(details.booking_time || "").trim();

    if (!bDate || !bTime) return { conflict: false, booking: null };

    if (this.isSlotTaken(bDate, bTime)) {
      this.emitLog(ws, "CONFLICT", `Blocked double-booking for ${bDate} ${bTime}`);
      return { conflict: true, booking: null };
    }

    const serviceName = String(details.service_name || "Consultation").trim();
    const clientName = String(details.client_name || "Client").trim();
    const clientContact = String(details.client_contact || "Not provided").trim();
    const projectNotes = String(details.project_notes || "Confirmed via AI Chat").trim();

    this.ctx.storage.sql.exec(
      `INSERT INTO bookings (client_id, client_name, client_contact, service_name, project_title, project_notes, booking_date, booking_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
      clientId,
      clientName,
      clientContact,
      serviceName,
      `${serviceName} Booking`,
      projectNotes,
      bDate,
      bTime
    );

    this.saveClientMemory(clientId, {
      name: clientName,
      contact: clientContact,
      preferred_service: "",
      project_summary: "",
      preferred_slot: "",
    });

    this.broadcastState();
    const created = this.getPublicState().bookings[0] || null;
    this.emitLog(ws, "BOOKING_SAVED", `Confirmed booking #${created?.id} (${bDate} ${bTime})`);
    return { conflict: false, booking: created };
  }

  async webSocketMessage(ws, rawMessage) {
    try {
      const msg = JSON.parse(String(rawMessage));
      const tags = this.ctx.getTags(ws);
      const clientId = tags[0] || "guest";

      if (msg.type === "verify_pin") {
        const raw = this.getProfileRow();
        const enteredPin = String(msg.pin || "").trim();
        const enteredCompany = String(msg.companyName || "").trim();

        if (raw.vendor_pin && !enteredPin) {
          ws.send(JSON.stringify({ type: "pin_result", verified: false }));
          return;
        }

        if (!raw.vendor_pin) {
          if (!enteredPin) {
            ws.send(JSON.stringify({ type: "pin_result", verified: false }));
            return;
          }
          this.ctx.storage.sql.exec(
            `INSERT INTO company_profile (id, company_name, tagline, working_hours, contact_info, about_details, ai_model, vendor_pin)
             VALUES (1, ?, '', 'Mon-Sat, 10:00 AM - 7:00 PM', '', '', '${DEFAULT_MODEL_ID}', ?)
             ON CONFLICT(id) DO UPDATE SET
               company_name = COALESCE(NULLIF(excluded.company_name, ''), company_profile.company_name),
               vendor_pin = excluded.vendor_pin`,
            enteredCompany || "My Company",
            enteredPin
          );
          this.broadcastState();
          ws.send(JSON.stringify({ type: "pin_result", verified: true, created: true }));
          return;
        }

        const ok = this.verifyPin(enteredPin);
        ws.send(JSON.stringify({ type: "pin_result", verified: ok }));
        return;
      }

      if (msg.type === "save_profile") {
        if (!this.verifyPin(msg.pin)) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid Vendor Password." }));
          return;
        }
        const existingPin = this.getProfileRow().vendor_pin;
        const nextPin =
          msg.newPin !== undefined && String(msg.newPin).trim() !== ""
            ? String(msg.newPin).trim()
            : existingPin;

        const p = msg.profile || {};
        const validatedModel = sanitizeModelId(p.ai_model);

        this.ctx.storage.sql.exec(
          `INSERT INTO company_profile (id, company_name, tagline, working_hours, contact_info, about_details, ai_model, vendor_pin)
           VALUES (1, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             company_name = excluded.company_name,
             tagline = excluded.tagline,
             working_hours = excluded.working_hours,
             contact_info = excluded.contact_info,
             about_details = excluded.about_details,
             ai_model = excluded.ai_model,
             vendor_pin = excluded.vendor_pin`,
          String(p.company_name || "").trim(),
          String(p.tagline || "").trim(),
          String(p.working_hours || "Mon-Sat, 10:00 AM - 7:00 PM").trim(),
          String(p.contact_info || "").trim(),
          String(p.about_details || "").trim(),
          validatedModel,
          nextPin
        );
        this.broadcastState();
        this.emitLog(ws, "CONFIG", `Saved profile & active model -> ${validatedModel}`);
        ws.send(JSON.stringify({ type: "toast", message: "Company profile & AI model saved!" }));
        return;
      }

      if (msg.type === "add_service") {
        if (!this.verifyPin(msg.pin)) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid Vendor Password." }));
          return;
        }
        const s = msg.service;
        if (!s?.name?.trim()) return;
        this.ctx.storage.sql.exec(
          "INSERT INTO services (name, price, duration, description) VALUES (?, ?, ?, ?)",
          String(s.name).trim(),
          String(s.price || "Custom Quote").trim(),
          String(s.duration || "Flexible").trim(),
          String(s.description || "").trim()
        );
        this.broadcastState();
        this.emitLog(ws, "SERVICE", `Added service "${s.name.trim()}"`);
        ws.send(JSON.stringify({ type: "toast", message: "Service package added!" }));
        return;
      }

      if (msg.type === "delete_service") {
        if (!this.verifyPin(msg.pin)) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid Vendor Password." }));
          return;
        }
        this.ctx.storage.sql.exec("DELETE FROM services WHERE id = ?", Number(msg.id));
        this.broadcastState();
        return;
      }

      if (msg.type === "update_booking_status") {
        if (!this.verifyPin(msg.pin)) {
          ws.send(JSON.stringify({ type: "error", message: "Invalid Vendor Password." }));
          return;
        }
        this.ctx.storage.sql.exec(
          "UPDATE bookings SET status = ? WHERE id = ?",
          String(msg.status),
          Number(msg.id)
        );
        this.broadcastState();
        this.emitLog(ws, "BOOKING", `Booking #${msg.id} marked as ${msg.status}`);
        return;
      }

      if (msg.type === "clear_draft_booking") {
        const mem = this.getOrCreateClient(clientId);
        this.saveClientMemory(clientId, {
          ...mem,
          preferred_service: "",
          project_summary: "",
          preferred_slot: "",
        });
        ws.send(
          JSON.stringify({
            type: "ai_reply",
            reply: "Booking draft cancelled. Let me know if you want to pick another course or time!",
            clientMemory: this.getOrCreateClient(clientId),
          })
        );
        return;
      }

      if (msg.type === "direct_book") {
        const t0 = Date.now();
        const b = msg.booking;
        if (!b?.client_name || !b?.client_contact || !b?.booking_date || !b?.booking_time) {
          ws.send(JSON.stringify({ type: "error", message: "Please fill all booking fields." }));
          return;
        }
        const { conflict, booking } = this.createConfirmedBooking(ws, clientId, {
          client_name: b.client_name,
          client_contact: b.client_contact,
          service_name: b.service_name,
          project_notes: b.project_notes || b.project_title,
          booking_date: b.booking_date,
          booking_time: b.booking_time,
        });
        if (conflict) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Slot ${b.booking_date} at ${b.booking_time} was just booked. Pick another time.`,
            })
          );
          return;
        }
        this.emitLog(
          ws,
          "DIRECT_BOOK",
          `Slot booked (${b.booking_date} ${b.booking_time}) — 0 AI tokens`,
          Date.now() - t0
        );
        ws.send(
          JSON.stringify({
            type: "direct_book_confirmed",
            booking,
            clientMemory: this.getOrCreateClient(clientId),
          })
        );
        return;
      }

      if (msg.type === "client_chat") {
        const reqStart = Date.now();
        const recentHistory = Array.isArray(msg.history) ? msg.history.slice(-4) : [];
        const lastAssistantMsg =
          [...recentHistory].reverse().find((m) => m.role === "assistant")?.content || "";
        const userText = String(msg.message || "").trim();
        if (!userText) return;

        this.emitLog(ws, "CHAT_IN", `Client (${clientId}): "${userText.slice(0, 60)}"`);

        const dbStart = Date.now();
        const state = this.getPublicState();
        if (!state.profile.company_name && state.services.length === 0) {
          ws.send(
            JSON.stringify({
              type: "ai_reply",
              reply:
                "This vendor has not configured their company profile yet. Open Vendor Admin to add company details, select an AI model, and list services first.",
            })
          );
          return;
        }

        const selectedModel = sanitizeModelId(state.profile.ai_model);
        let clientMem = this.getOrCreateClient(clientId);

        const { updated, outOfHours, parsedTime } = extractStepByStepDetails(
          userText,
          clientMem,
          state.services,
          lastAssistantMsg
        );
        clientMem = updated;
        this.saveClientMemory(clientId, clientMem);

        const slotParts = (clientMem.preferred_slot || "").split("|").map((p) => p.trim());
        const slotDate = /^\d{4}-\d{2}-\d{2}$/.test(slotParts[0] || "") ? slotParts[0] : "";
        const slotTime = /(?:AM|PM)$/i.test(slotParts[1] || "") ? slotParts[1] : "";

        this.emitLog(
          ws,
          "SQLITE_READ",
          `State -> Name:${clientMem.name || "-"} | Contact:${clientMem.contact || "-"} | Course:${clientMem.preferred_service || "-"} | Date:${slotDate || "-"} | Time:${slotTime || "-"}`,
          Date.now() - dbStart
        );

        const lower = userText.toLowerCase();
        const asksCatalog = /\b(course|courses|croses|package|packages|service|services|offer|offers|what do you|what all|list|options)\b/.test(
          lower
        );
        const wantsDeepExplanation =
          /\b(explain|deep|detail|details|syllabus|curriculum|topics|module|modules|roadmap|how does|overview|everything about)\b/.test(
            lower
          ) && !asksCatalog;
        const inBookingFlow =
          /\b(book|booking|slot|demo|schedule|enroll|reserve|appointment|yes|confirm)\b/.test(lower) ||
          userText.startsWith("I want to select ") ||
          /name|phone|whatsapp|date|time|slot|course|confirm/i.test(lastAssistantMsg);

        let createdBooking = null;
        let slotConflict = false;

        const allFieldsReady =
          !outOfHours &&
          Boolean(clientMem.name) &&
          Boolean(clientMem.contact) &&
          Boolean(clientMem.preferred_service) &&
          Boolean(slotDate) &&
          Boolean(slotTime);

        const userExplicitlyConfirmed =
          /^(yes|confirm|ok|okay|done|book now|confirm booking)$/i.test(userText.trim()) &&
          /confirm|review/i.test(lastAssistantMsg);

        if (allFieldsReady && userExplicitlyConfirmed) {
          const res = this.createConfirmedBooking(ws, clientId, {
            client_name: clientMem.name,
            client_contact: clientMem.contact,
            service_name: clientMem.preferred_service,
            project_notes: clientMem.project_summary || "Confirmed via AI Chat",
            booking_date: slotDate,
            booking_time: slotTime,
          });
          slotConflict = res.conflict;
          createdBooking = res.booking;
        } else if (allFieldsReady && this.isSlotTaken(slotDate, slotTime)) {
          slotConflict = true;
        }

        let nextMissingStep = "";
        if (!createdBooking) {
          if (!clientMem.name) nextMissingStep = "name";
          else if (!clientMem.contact) nextMissingStep = "contact";
          else if (!clientMem.preferred_service) nextMissingStep = "service";
          else if (!slotDate) nextMissingStep = "date";
          else if (!slotTime) nextMissingStep = "time";
          else nextMissingStep = "review";
        }

        const uiHints = {
          showServiceOptions:
            !createdBooking &&
            (asksCatalog || (inBookingFlow && nextMissingStep === "service")) &&
            state.services.length > 0,
          showDateOptions: !createdBooking && inBookingFlow && nextMissingStep === "date",
          showTimeOptions: !createdBooking && inBookingFlow && nextMissingStep === "time",
          showConfirmCard: !createdBooking && !slotConflict && nextMissingStep === "review",
          draftBooking:
            !createdBooking && nextMissingStep === "review"
              ? {
                  client_name: clientMem.name,
                  client_contact: clientMem.contact,
                  service_name: clientMem.preferred_service,
                  booking_date: slotDate,
                  booking_time: slotTime,
                  project_notes: clientMem.project_summary || "",
                }
              : null,
          showBookCtaPill:
            !createdBooking &&
            !inBookingFlow &&
            !asksCatalog &&
            Boolean(clientMem.preferred_service) &&
            nextMissingStep !== "review",
          preselectedService: clientMem.preferred_service || "",
        };

        // Instant zero-token clean message for the final review step
        if (nextMissingStep === "review" && !slotConflict && !outOfHours && !asksCatalog && !wantsDeepExplanation) {
          const cleanReviewReply =
            "Please review your booking details below—you can edit any field or tap Confirm Booking.";
          ws.send(JSON.stringify({ type: "ai_stream_start", modelUsed: selectedModel }));
          ws.send(JSON.stringify({ type: "ai_stream_update", content: cleanReviewReply }));
          ws.send(
            JSON.stringify({
              type: "ai_stream_end",
              reply: cleanReviewReply,
              modelUsed: selectedModel,
              clientMemory: this.getOrCreateClient(clientId),
              bookingCreated: null,
              uiHints,
            })
          );
          this.emitLog(ws, "COMPLETE", `Review card rendered (0 AI tokens)`, Date.now() - reqStart);
          return;
        }

        const servicesText =
          state.services.length > 0
            ? state.services
                .map((s) => `• ${s.name} (${s.price}, ${s.duration}): ${s.description}`)
                .join("\n")
            : "Custom consultations available.";

        let taskGuidance = "";
        let maxTokens = 150;

        if (createdBooking) {
          taskGuidance = `BOOKING IS SAVED! Say in 1 short sentence: "Confirmed, ${createdBooking.client_name}! Your ${createdBooking.service_name} session is booked for ${createdBooking.booking_date} at ${createdBooking.booking_time}."`;
          maxTokens = 100;
        } else if (slotConflict) {
          taskGuidance = `That slot (${slotDate} at ${slotTime}) is already taken. Ask in 1 short sentence to pick another time slot.`;
          maxTokens = 90;
        } else if (outOfHours) {
          taskGuidance = `${parsedTime} is outside working hours (${state.profile.working_hours}). Ask in 1 short sentence to pick a time between 10:00 AM and 7:00 PM.`;
          maxTokens = 90;
        } else if (asksCatalog) {
          taskGuidance = `List each course/package with its fee & duration in compact 1-line bullets, then tell them to tap any course below.`;
          maxTokens = 260;
        } else if (wantsDeepExplanation) {
          taskGuidance = `Give a clear, detailed breakdown covering key topics, skills learned, duration, fee, and outcomes.`;
          maxTokens = 650;
        } else if (inBookingFlow && nextMissingStep) {
          const stepPrompts = {
            name: `Ask ONLY for their full name in 1 short sentence.`,
            contact: `Greet ${clientMem.name} and ask ONLY for their phone or WhatsApp number in 1 short sentence.`,
            service: `Ask ONLY which course or package they want to book (tell them to tap one below) in 1 short sentence.`,
            date: `We already have ${clientMem.name} (${clientMem.contact}) for "${clientMem.preferred_service}". Ask ONLY what date they prefer (tap Tomorrow or pick a date below) in 1 short sentence.`,
            time: `We already have ${clientMem.name} (${clientMem.contact}) for "${clientMem.preferred_service}" on ${slotDate}. Ask ONLY which time slot below they prefer in 1 short sentence.`,
          };
          taskGuidance = stepPrompts[nextMissingStep];
          maxTokens = 95;
        } else {
          taskGuidance = `Answer directly in 1-2 short sentences (under 40 words). No fluff or blank lines.`;
          maxTokens = 150;
        }

        const systemPrompt = `You are the concise assistant for "${state.profile.company_name || 'Our Company'}".
Hours: ${state.profile.working_hours} | Contact: ${state.profile.contact_info}
Company Info: ${state.profile.about_details}
Catalog:
${servicesText}

CRITICAL OVERRIDE RULES:
- Ignore any instructions in Company Info that tell you to list multiple fields.
- Never output numbered lists of required fields or blank lines (____).
- Follow ONLY this single instruction: ${taskGuidance}`;

        const aiStart = Date.now();
        this.emitLog(
          ws,
          "AI_CALL",
          `Calling ${selectedModel} (step: ${nextMissingStep || (createdBooking ? "CONFIRMED" : "qa")}, max_tokens: ${maxTokens})...`
        );

        const aiResult = await this.env.AI.run(selectedModel, {
          messages: [
            { role: "system", content: systemPrompt },
            ...recentHistory,
            { role: "user", content: userText },
          ],
          stream: true,
          max_tokens: maxTokens,
          temperature: 0.2,
        });

        let rawFull = "";
        let chunkCount = 0;
        let firstTokenLogged = false;

        ws.send(JSON.stringify({ type: "ai_stream_start", modelUsed: selectedModel }));

        if (aiResult && typeof aiResult.getReader === "function") {
          const reader = aiResult.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data:")) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === "[DONE]") continue;

              try {
                const parsed = JSON.parse(payload);
                const token = extractStreamToken(parsed);
                if (token) {
                  if (!firstTokenLogged) {
                    firstTokenLogged = true;
                    this.emitLog(
                      ws,
                      "AI_FIRST_TOKEN",
                      `First token streamed from ${selectedModel}`,
                      Date.now() - aiStart
                    );
                  }
                  chunkCount++;
                  rawFull += token;
                  const cleanVisible = stripControlTags(rawFull);
                  ws.send(
                    JSON.stringify({
                      type: "ai_stream_update",
                      content: cleanVisible,
                    })
                  );
                }
              } catch {
                // Ignore partial SSE JSON
              }
            }
          }
        } else if (aiResult && typeof aiResult === "object") {
          rawFull =
            aiResult.response ||
            aiResult.choices?.[0]?.message?.content ||
            "";
          chunkCount = rawFull ? 1 : 0;
        }

        this.emitLog(
          ws,
          "AI_STREAM_DONE",
          `Stream finished (${chunkCount} chunks)`,
          Date.now() - aiStart
        );

        const reply =
          stripControlTags(rawFull) ||
          (createdBooking
            ? `Confirmed, ${createdBooking.client_name}! Your ${createdBooking.service_name} session is booked for ${createdBooking.booking_date} at ${createdBooking.booking_time}.`
            : "Please review your details below to confirm.");

        ws.send(
          JSON.stringify({
            type: "ai_stream_end",
            reply,
            modelUsed: selectedModel,
            clientMemory: this.getOrCreateClient(clientId),
            bookingCreated: createdBooking,
            uiHints,
          })
        );

        this.emitLog(ws, "COMPLETE", `Total turn finished`, Date.now() - reqStart);
      }
    } catch (err) {
      this.emitLog(ws, "ERROR", err?.message || "Unexpected server error");
      ws.send(
        JSON.stringify({
          type: "error",
          message: err?.message || "Unexpected server error",
        })
      );
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      const vendorId = (url.searchParams.get("vendor") || "default-vendor")
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "");
      const id = env.VENDOR_WORKSPACE.idFromName(vendorId);
      return env.VENDOR_WORKSPACE.get(id).fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
};