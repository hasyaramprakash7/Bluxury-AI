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

function extractDeterministicDetails(userText, currentMem, services) {
  const updated = { ...currentMem };
  const text = userText.trim();

  const nameMatch = text.match(
    /(?:my name is|i am|i'm|this is|call me)\s+([a-zA-Z][a-zA-Z\s]{1,28}?)(?:[.,!?]|$|\s+(?:and|my|from|for))/i
  );
  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    if (!/^(interested|looking|booking|want|need|here)$/i.test(candidate)) {
      updated.name = candidate;
    }
  }

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d[\d\s-]{8,14}\d)/);
  if (emailMatch) {
    updated.contact = emailMatch[0].trim();
  } else if (phoneMatch) {
    updated.contact = phoneMatch[0].replace(/\s+/g, "");
  }

  for (const s of services) {
    if (text.toLowerCase().includes(s.name.toLowerCase())) {
      updated.preferred_service = s.name;
      break;
    }
  }

  return updated;
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
        company_name: raw.company_name,
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
    const existing = this.ctx.storage.sql
      .exec(
        "SELECT client_id, name, contact, project_summary, preferred_service, preferred_slot FROM clients WHERE client_id = ?",
        clientId
      )
      .toArray()[0];

    if (existing) return existing;

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

  async webSocketMessage(ws, rawMessage) {
    try {
      const msg = JSON.parse(String(rawMessage));
      const tags = this.ctx.getTags(ws);
      const clientId = tags[0] || "guest";

      if (msg.type === "verify_pin") {
        const raw = this.getProfileRow();
        const enteredPin = String(msg.pin || "").trim();
        const enteredCompany = String(msg.companyName || "").trim();

        if (!raw.vendor_pin && enteredPin) {
          this.ctx.storage.sql.exec(
            `INSERT INTO company_profile (id, company_name, tagline, working_hours, contact_info, about_details, ai_model, vendor_pin)
             VALUES (1, ?, '', 'Mon-Sat, 10:00 AM - 7:00 PM', '', '', '${DEFAULT_MODEL_ID}', ?)
             ON CONFLICT(id) DO UPDATE SET
               company_name = COALESCE(NULLIF(excluded.company_name, ''), company_profile.company_name),
               vendor_pin = excluded.vendor_pin`,
            enteredCompany,
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

      if (msg.type === "direct_book") {
        const t0 = Date.now();
        const b = msg.booking;
        if (!b?.client_name || !b?.client_contact || !b?.booking_date || !b?.booking_time) {
          ws.send(JSON.stringify({ type: "error", message: "Please fill all booking fields." }));
          return;
        }
        if (this.isSlotTaken(b.booking_date, b.booking_time)) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: `Slot ${b.booking_date} at ${b.booking_time} was just booked. Pick another time.`,
            })
          );
          return;
        }

        this.ctx.storage.sql.exec(
          `INSERT INTO bookings (client_id, client_name, client_contact, service_name, project_title, project_notes, booking_date, booking_time, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
          clientId,
          String(b.client_name).trim(),
          String(b.client_contact).trim(),
          String(b.service_name || "Consultation").trim(),
          String(b.project_title || "Project Consultation").trim(),
          String(b.project_notes || "").trim(),
          String(b.booking_date).trim(),
          String(b.booking_time).trim()
        );

        this.saveClientMemory(clientId, {
          name: String(b.client_name).trim(),
          contact: String(b.client_contact).trim(),
          preferred_service: String(b.service_name || "").trim(),
          project_summary: String(b.project_notes || b.project_title || "").trim(),
          preferred_slot: `${b.booking_date} ${b.booking_time}`,
        });

        this.broadcastState();
        this.emitLog(
          ws,
          "DIRECT_BOOK",
          `Instant slot booked (${b.booking_date} ${b.booking_time}) — 0 AI tokens`,
          Date.now() - t0
        );
        ws.send(
          JSON.stringify({
            type: "toast",
            message: `Confirmed for ${b.booking_date} at ${b.booking_time}!`,
          })
        );
        return;
      }

      if (msg.type === "client_chat") {
        const reqStart = Date.now();
        const recentHistory = Array.isArray(msg.history) ? msg.history.slice(-6) : [];
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

        clientMem = extractDeterministicDetails(userText, clientMem, state.services);
        this.saveClientMemory(clientId, clientMem);

        this.emitLog(
          ws,
          "SQLITE_READ",
          `Loaded ${state.services.length} services & memory (${clientMem.name || "no name"}, ${clientMem.contact || "no contact"})`,
          Date.now() - dbStart
        );

        const servicesText =
          state.services.length > 0
            ? state.services
                .map((s) => `• ${s.name} — Price: ${s.price}, Timeline: ${s.duration} (${s.description})`)
                .join("\n")
            : "Custom consultations available.";

        const unavailableSlots = state.bookings
          .filter((b) => b.status !== "completed")
          .slice(0, 15)
          .map((b) => `${b.booking_date} at ${b.booking_time}`);

        const missingQueue = [];
        if (!clientMem.name) missingQueue.push("their Name");
        if (!clientMem.contact) missingQueue.push("their Phone Number or Email");
        if (!clientMem.preferred_service) missingQueue.push("which Service Package they want");
        if (!clientMem.project_summary) missingQueue.push("a brief description of their Project Idea");
        if (!clientMem.preferred_slot) missingQueue.push("their Preferred Date & Time");

        const nextStepInstruction =
          missingQueue.length > 0
            ? `If the user wants to book, acknowledge what they just shared and ask ONLY for ${missingQueue[0]} next. DO NOT list all missing fields at once.`
            : `All 5 booking details are collected! Summarize them briefly and ask the user to confirm—or if they just confirmed, output the <BOOKING_JSON> tag now.`;

        const systemPrompt = `You are a friendly, natural booking concierge for "${state.profile.company_name}".
Working Hours: ${state.profile.working_hours} | Contact: ${state.profile.contact_info}
Offers & Policies: ${state.profile.about_details}
Packages:
${servicesText}
Availability: ${
          unavailableSlots.length === 0
            ? "All working hours are currently open and available for booking."
            : `All working hours are open EXCEPT these already-booked slots: ${unavailableSlots.join(", ")}.`
        }

ALREADY KNOWN ABOUT THIS CLIENT (NEVER ASK FOR THESE AGAIN):
- Name: ${clientMem.name || "Not yet given"}
- Contact: ${clientMem.contact || "Not yet given"}
- Package: ${clientMem.preferred_service || "Not yet chosen"}
- Project Idea: ${clientMem.project_summary || "Not yet shared"}
- Preferred Date & Time: ${clientMem.preferred_slot || "Not yet chosen"}

CONVERSATION RULES:
1. Keep replies short (2-3 sentences), warm, and conversational. Never dump a bullet list of missing fields.
2. ${nextStepInstruction}
3. Whenever the user gives new info (name, contact, package, project idea, or date/time), append this exact tag at the end:
<CLIENT_UPDATE>{"name":"...","contact":"...","preferred_service":"...","project_summary":"...","preferred_slot":"..."}</CLIENT_UPDATE>
4. Once all 5 details are known AND the user confirms booking, append:
<BOOKING_JSON>{"client_name":"...","client_contact":"...","service_name":"...","project_title":"...","project_notes":"...","booking_date":"YYYY-MM-DD","booking_time":"HH:MM AM/PM"}</BOOKING_JSON>`;

        const aiStart = Date.now();
        this.emitLog(ws, "AI_CALL", `Calling Workers AI (${selectedModel}) with streaming...`);

        const aiResult = await this.env.AI.run(selectedModel, {
          messages: [
            { role: "system", content: systemPrompt },
            ...recentHistory,
            { role: "user", content: userText },
          ],
          stream: true,
          max_tokens: 260,
          temperature: 0.25,
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

        let reply = stripControlTags(rawFull) || "How can I assist you with your project today?";

        const updateMatch = rawFull.match(/<CLIENT_UPDATE>([\s\S]*?)<\/CLIENT_UPDATE>/);
        if (updateMatch) {
          try {
            const u = JSON.parse(updateMatch[1]);
            clientMem = {
              ...clientMem,
              name: u.name && u.name !== "..." && u.name !== "Not yet given" ? String(u.name).trim() : clientMem.name,
              contact: u.contact && u.contact !== "..." && u.contact !== "Not yet given" ? String(u.contact).trim() : clientMem.contact,
              preferred_service:
                u.preferred_service && u.preferred_service !== "..." && u.preferred_service !== "Not yet chosen"
                  ? String(u.preferred_service).trim()
                  : clientMem.preferred_service,
              project_summary:
                u.project_summary && u.project_summary !== "..." && u.project_summary !== "Not yet shared"
                  ? String(u.project_summary).trim()
                  : clientMem.project_summary,
              preferred_slot:
                u.preferred_slot && u.preferred_slot !== "..." && u.preferred_slot !== "Not yet chosen"
                  ? String(u.preferred_slot).trim()
                  : clientMem.preferred_slot,
            };
            this.saveClientMemory(clientId, clientMem);
            this.emitLog(ws, "MEMORY_SAVE", `Saved client memory for ${clientId}`);
          } catch (e) {
            this.emitLog(ws, "WARN", `Failed to parse CLIENT_UPDATE: ${e.message}`);
          }
        }

        let createdBooking = null;
        const bookMatch = rawFull.match(/<BOOKING_JSON>([\s\S]*?)<\/BOOKING_JSON>/);
        if (bookMatch) {
          try {
            const b = JSON.parse(bookMatch[1]);
            const bDate = String(b.booking_date || "").trim();
            const bTime = String(b.booking_time || "").trim();

            if (bDate && bTime && this.isSlotTaken(bDate, bTime)) {
              reply = `That slot (${bDate} at ${bTime}) was just reserved by another client. Please choose a different time!`;
              this.emitLog(ws, "CONFLICT", `Blocked double-booking for ${bDate} ${bTime}`);
            } else {
              this.ctx.storage.sql.exec(
                `INSERT INTO bookings (client_id, client_name, client_contact, service_name, project_title, project_notes, booking_date, booking_time, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
                clientId,
                String(b.client_name || clientMem.name || "Client").trim(),
                String(b.client_contact || clientMem.contact || "Not provided").trim(),
                String(b.service_name || clientMem.preferred_service || "Consultation").trim(),
                String(b.project_title || "Client Project Inquiry").trim(),
                String(b.project_notes || clientMem.project_summary || "").trim(),
                bDate || "TBD",
                bTime || "TBD"
              );
              this.broadcastState();
              createdBooking = this.getPublicState().bookings[0] || null;
              this.emitLog(ws, "BOOKING_SAVED", `Created confirmed booking #${createdBooking?.id}`);
            }
          } catch (e) {
            this.emitLog(ws, "WARN", `Failed to parse BOOKING_JSON: ${e.message}`);
          }
        }

        ws.send(
          JSON.stringify({
            type: "ai_stream_end",
            reply,
            modelUsed: selectedModel,
            clientMemory: this.getOrCreateClient(clientId),
            bookingCreated: createdBooking,
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