import { io, Socket } from "socket.io-client";
import { reachGoal } from "./metrika";

const STORAGE_KEY = "widget_chat_session";

type WidgetConfig = {
  siteKey: string;
  apiUrl: string;
};

type SiteConfig = {
  title: string;
  color: string;
  greeting: string;
  position: string;
  offlineMessage: string;
  metrikaCounterId: string | null;
  operatorsOnline: boolean;
  offlineMode: boolean;
};

type MessageStatus = "SENDING" | "DELIVERED" | "READ";

type Message = {
  id: string;
  sender: "VISITOR" | "OPERATOR";
  body: string;
  status?: MessageStatus;
  createdAt: string;
};

type Dialog = {
  id: string;
  status: string;
  messages: Message[];
};

type WidgetState = {
  open: boolean;
  config: SiteConfig | null;
  sessionToken: string | null;
  dialog: Dialog | null;
  needsContact: boolean;
  contactDone: boolean;
  socket: Socket | null;
  typing: boolean;
  offlineSubmitted: boolean;
};

const state: WidgetState = {
  open: false,
  config: null,
  sessionToken: localStorage.getItem(STORAGE_KEY),
  dialog: null,
  needsContact: false,
  contactDone: false,
  socket: null,
  typing: false,
  offlineSubmitted: false,
};

let rootEl: HTMLElement | null = null;
let apiUrl = "";
let siteKey = "";

function getUtmParams(): Record<string, string> {
  const p = new URLSearchParams(location.search);
  const out: Record<string, string> = { pageUrl: location.href };
  const map: [string, string][] = [
    ["utm_source", "utmSource"],
    ["utm_medium", "utmMedium"],
    ["utm_campaign", "utmCampaign"],
    ["utm_content", "utmContent"],
    ["utm_term", "utmTerm"],
  ];
  for (const [q, key] of map) {
    const v = p.get(q);
    if (v) out[key] = v;
  }
  return out;
}

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${apiUrl}/api/widget${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg =
      typeof (err as { error?: unknown }).error === "object" &&
      (err as { error?: { message?: string } }).error?.message
        ? (err as { error: { message: string } }).error.message
        : typeof (err as { error?: string }).error === "string"
          ? (err as { error: string }).error
          : res.statusText;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

let visitorTypingTimer: ReturnType<typeof setTimeout> | null = null;
let markReadTimer: ReturnType<typeof setTimeout> | null = null;
let configPollId: ReturnType<typeof setInterval> | null = null;

async function refreshConfig(): Promise<void> {
  if (!siteKey) return;
  state.config = await api<SiteConfig>(`/config/${siteKey}`);
}

function emitVisitorTyping(typing: boolean) {
  if (!state.dialog?.id || !state.socket) return;
  state.socket.emit("typing", { dialogId: state.dialog.id, typing });
}

function scheduleVisitorTyping() {
  emitVisitorTyping(true);
  if (visitorTypingTimer) clearTimeout(visitorTypingTimer);
  visitorTypingTimer = setTimeout(() => emitVisitorTyping(false), 1200);
}

function addMessage(message: Message) {
  if (!state.dialog) return;
  if (state.dialog.messages.some((m) => m.id === message.id)) return;
  state.dialog.messages.push(message);
}

function replaceMessage(tempId: string, message: Message) {
  if (!state.dialog) return;
  const idx = state.dialog.messages.findIndex((m) => m.id === tempId);
  if (idx >= 0) state.dialog.messages[idx] = message;
  else addMessage(message);
}

async function markOperatorMessagesRead() {
  if (!state.open || !state.dialog?.id || !state.sessionToken) return;
  const hasDelivered = state.dialog.messages.some(
    (m) => m.sender === "OPERATOR" && m.status === "DELIVERED"
  );
  if (!hasDelivered) return;
  try {
    await api<{ updated: number }>(`/dialog/${siteKey}/read`, {
      method: "POST",
      body: JSON.stringify({
        sessionToken: state.sessionToken,
        dialogId: state.dialog.id,
      }),
    });
    for (const m of state.dialog.messages) {
      if (m.sender === "OPERATOR" && m.status === "DELIVERED") m.status = "READ";
    }
    render();
  } catch {
    /* ignore */
  }
}

function scheduleMarkRead() {
  if (markReadTimer) clearTimeout(markReadTimer);
  markReadTimer = setTimeout(() => void markOperatorMessagesRead(), 400);
}

function connectSocket(dialogId: string) {
  state.socket?.disconnect();
  state.socket = io(apiUrl, {
    query: { dialogId },
    transports: ["websocket", "polling"],
  });
  state.socket.on("message", (payload: { message: Message }) => {
    if (!state.dialog) return;
    const before = state.dialog.messages.length;
    addMessage(payload.message);
    if (state.dialog.messages.length === before) return;
    if (payload.message.sender === "OPERATOR" && state.config?.metrikaCounterId) {
      reachGoal(state.config.metrikaCounterId, "chat_operator_replied");
    }
    render();
    if (payload.message.sender === "OPERATOR" && state.open) scheduleMarkRead();
  });
  state.socket.on("typing", (p: { typing: boolean; from?: string }) => {
    if (p.from === "operator") {
      state.typing = p.typing;
      render();
    }
  });
  state.socket.on("dialog:closed", () => {
    if (state.config?.metrikaCounterId) {
      reachGoal(state.config.metrikaCounterId, "chat_dialog_closed");
    }
  });
}

function styles(color: string, position: string): string {
  const side = position === "left" ? "left:20px" : "right:20px";
  const accent = color || "#465fff";
  return `
    #wc-root, #wc-root * { box-sizing: border-box; }
    #wc-root {
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.45;
      z-index: 2147483646;
      -webkit-font-smoothing: antialiased;
      text-align: left;
    }
    #wc-launcher {
      position: fixed; bottom: 20px; ${side};
      width: 56px; height: 56px; border-radius: 50%;
      background: ${accent}; color: #fff; border: none; cursor: pointer;
      box-shadow: 0 4px 20px ${accent}66, 0 2px 8px rgba(0,0,0,.15);
      display: flex; align-items: center; justify-content: center;
      transition: transform .15s ease, box-shadow .15s ease;
    }
    #wc-launcher:hover { transform: scale(1.05); }
    #wc-panel {
      position: fixed; bottom: 88px; ${side};
      width: min(380px, calc(100vw - 40px));
      height: min(520px, calc(100vh - 120px));
      background: #fff; border-radius: 16px;
      box-shadow: 0 12px 48px rgba(16,24,40,.18);
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid #e4e7ec;
    }
    #wc-header {
      flex-shrink: 0;
      background: ${accent}; color: #fff;
      padding: 14px 16px;
      font-weight: 600; font-size: 15px;
      display: flex; justify-content: space-between; align-items: center;
    }
    #wc-header button {
      background: rgba(255,255,255,.2); border: none; color: #fff;
      cursor: pointer; font-size: 20px; line-height: 1;
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
    }
    #wc-header button:hover { background: rgba(255,255,255,.3); }
    #wc-body {
      flex: 1; display: flex; flex-direction: column;
      min-height: 0; overflow: hidden;
    }
    #wc-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f9fafb;
    }
    #wc-messages::-webkit-scrollbar { width: 6px; }
    #wc-messages::-webkit-scrollbar-thumb { background: #d0d5dd; border-radius: 3px; }
    .wc-msg {
      max-width: 82%; padding: 10px 14px; border-radius: 14px;
      line-height: 1.45; word-break: break-word; font-size: 14px;
    }
    .wc-msg.visitor {
      align-self: flex-end;
      background: ${accent}; color: #fff;
      border-bottom-right-radius: 4px;
      display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
    }
    .wc-msg-status {
      font-size: 10px; opacity: .85; line-height: 1;
    }
    .wc-msg-status.sending { opacity: .6; }
    .wc-msg.operator {
      align-self: flex-start;
      background: #fff; color: #344054;
      border: 1px solid #e4e7ec;
      border-bottom-left-radius: 4px;
    }
    .wc-typing {
      flex-shrink: 0;
      font-size: 12px; color: #667085;
      padding: 4px 16px 8px; background: #f9fafb;
    }
    .wc-footer-block {
      flex-shrink: 0;
      padding: 14px 16px;
      border-top: 1px solid #e4e7ec;
      background: #fff;
    }
    .wc-footer-title {
      margin: 0 0 12px; font-size: 13px; font-weight: 500; color: #344054;
    }
    .wc-field { margin-bottom: 10px; }
    .wc-field:last-of-type { margin-bottom: 12px; }
    .wc-label {
      display: block; margin-bottom: 4px;
      font-size: 12px; font-weight: 500; color: #475467;
      text-align: left;
    }
    .wc-input, .wc-textarea {
      display: block; width: 100%;
      padding: 10px 12px;
      border: 1px solid #d0d5dd; border-radius: 10px;
      font-size: 14px; font-family: inherit;
      color: #101828; background: #fff;
      outline: none;
      text-align: left;
      transition: border-color .15s, box-shadow .15s;
      -webkit-appearance: none; appearance: none;
    }
    .wc-input:focus, .wc-textarea:focus {
      border-color: ${accent};
      box-shadow: 0 0 0 3px ${accent}22;
    }
    .wc-input::placeholder, .wc-textarea::placeholder { color: #98a2b3; }
    .wc-textarea { resize: none; min-height: 44px; }
    .wc-btn {
      display: block; width: 100%;
      padding: 11px 16px;
      background: ${accent}; color: #fff;
      border: none; border-radius: 10px;
      font-size: 14px; font-weight: 600; font-family: inherit;
      cursor: pointer;
      transition: filter .15s, transform .1s;
      -webkit-appearance: none; appearance: none;
    }
    .wc-btn:hover { filter: brightness(1.08); }
    .wc-btn:active { transform: scale(0.98); }
    .wc-btn:disabled { opacity: .6; cursor: not-allowed; }
    .wc-chat-row {
      display: flex; gap: 8px; align-items: flex-end;
    }
    .wc-chat-row .wc-textarea { flex: 1; margin: 0; }
    .wc-chat-row .wc-btn {
      width: auto; flex-shrink: 0;
      padding: 10px 18px; min-height: 44px;
    }
    #wc-offline {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 0;
    }
    #wc-offline > p {
      margin: 0 0 16px; font-size: 14px; color: #475467; line-height: 1.5;
      text-align: left;
    }
    #wc-offline .wc-field, #wc-contact .wc-field { text-align: left; }
    .wc-offline-success { justify-content: center; text-align: left; }
    .wc-offline-success .wc-success-title {
      margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #101828;
    }
    .wc-offline-success p { margin: 0 0 20px; color: #475467; line-height: 1.5; }
    .wc-status-dot {
      display: inline-block; width: 8px; height: 8px;
      border-radius: 50%; margin-right: 6px;
      background: #12b76a; vertical-align: middle;
    }
    .wc-status-dot.offline { background: #f79009; }
    @media (max-width: 480px) {
      #wc-panel {
        bottom: 80px; left: 12px !important; right: 12px !important;
        width: auto; height: min(75vh, 520px);
      }
    }
  `;
}

function fieldHtml(id: string, label: string, type: string, placeholder: string): string {
  return `
    <div class="wc-field">
      <span class="wc-label">${label}</span>
      <input class="wc-input" id="${id}" type="${type}" placeholder="${placeholder}" />
    </div>
  `;
}

function visitorStatusHtml(status?: MessageStatus): string {
  if (status === "SENDING") return '<span class="wc-msg-status sending">…</span>';
  if (status === "DELIVERED" || !status) return '<span class="wc-msg-status delivered">✓</span>';
  return "";
}

function renderMessages(): string {
  if (!state.dialog?.messages.length && state.config) {
    return `<div class="wc-msg operator">${escapeHtml(state.config.greeting)}</div>`;
  }
  return (state.dialog?.messages ?? [])
    .map((m) => {
      const cls = m.sender === "VISITOR" ? "visitor" : "operator";
      const status =
        m.sender === "VISITOR" ? visitorStatusHtml(m.status ?? "DELIVERED") : "";
      return `<div class="wc-msg ${cls}">${escapeHtml(m.body)}${status}</div>`;
    })
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderContactForm(): string {
  return `
    <div class="wc-footer-block" id="wc-contact">
      <p class="wc-footer-title">Оставьте контакт, чтобы мы могли ответить</p>
      ${fieldHtml("wc-name", "Имя", "text", "Как к вам обращаться")}
      ${fieldHtml("wc-email", "Email", "email", "name@example.com")}
      ${fieldHtml("wc-phone", "Телефон", "tel", "+7 ...")}
      <button type="button" class="wc-btn" id="wc-contact-submit">Отправить</button>
    </div>
  `;
}

function renderOfflineSuccess(): string {
  return `
    <div id="wc-offline" class="wc-offline-success">
      <p class="wc-success-title">Спасибо!</p>
      <p>Ваше сообщение отправлено. Мы свяжемся с вами в ближайшее время.</p>
      <button type="button" class="wc-btn" id="wc-offline-close">Закрыть</button>
    </div>
  `;
}

function renderOffline(): string {
  if (state.offlineSubmitted) return renderOfflineSuccess();
  const msg = state.config?.offlineMessage ?? "Операторы сейчас недоступны. Оставьте сообщение — мы ответим позже.";
  return `
    <div id="wc-offline">
      <p>${escapeHtml(msg)}</p>
      ${fieldHtml("wc-off-name", "Имя", "text", "Ваше имя")}
      ${fieldHtml("wc-off-email", "Email", "email", "Email")}
      ${fieldHtml("wc-off-phone", "Телефон", "tel", "Телефон")}
      <div class="wc-field">
        <span class="wc-label">Сообщение</span>
        <textarea class="wc-textarea" id="wc-off-msg" rows="3" placeholder="Ваш вопрос..."></textarea>
      </div>
      <button type="button" class="wc-btn" id="wc-off-submit">Отправить заявку</button>
    </div>
  `;
}

function renderChatFooter(): string {
  return `
    <div class="wc-footer-block" id="wc-footer">
      <div class="wc-chat-row">
        <textarea class="wc-textarea" id="wc-input" rows="1" placeholder="Напишите сообщение..."></textarea>
        <button type="button" class="wc-btn" id="wc-send">➤</button>
      </div>
    </div>
  `;
}

const CHAT_ICON = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/></svg>`;

function render() {
  if (!rootEl || !state.config) return;
  const c = state.config;
  const pos = c.position === "left" ? "left" : "right";

  if (!state.open) {
    rootEl.innerHTML = `
      <style>${styles(c.color, pos)}</style>
      <button type="button" id="wc-launcher" aria-label="Открыть чат">${CHAT_ICON}</button>
    `;
    rootEl.querySelector("#wc-launcher")?.addEventListener("click", () => {
      void (async () => {
        try {
          await refreshConfig();
        } catch {
          /* оставляем предыдущий конфиг */
        }
        state.open = true;
        reachGoal(state.config?.metrikaCounterId ?? c.metrikaCounterId, "chat_widget_opened");
        render();
      })();
    });
    return;
  }

  const offline = c.offlineMode;
  const showContact =
    !offline && state.needsContact && !state.contactDone && state.dialog;

  let bodyInner = "";
  if (offline) {
    bodyInner = renderOffline();
  } else {
    bodyInner = `
      <div id="wc-body">
        <div id="wc-messages">${renderMessages()}</div>
        ${state.typing ? '<div class="wc-typing">Оператор печатает...</div>' : ""}
      </div>
      ${showContact ? renderContactForm() : renderChatFooter()}
    `;
  }

  rootEl.innerHTML = `
    <style>${styles(c.color, pos)}</style>
    <button type="button" id="wc-launcher" aria-label="Чат">${CHAT_ICON}</button>
    <div id="wc-panel" role="dialog" aria-label="Чат поддержки">
      <div id="wc-header">
        <span>${escapeHtml(c.title)}</span>
        <button type="button" id="wc-close" aria-label="Закрыть">×</button>
      </div>
      ${offline ? bodyInner : bodyInner}
    </div>
  `;

  rootEl.querySelector("#wc-close")?.addEventListener("click", () => {
    state.open = false;
    render();
  });

  const messagesEl = rootEl.querySelector("#wc-messages");
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;

  if (offline) bindOffline();
  else if (showContact) bindContact();
  else bindChat();

  if (state.open && state.dialog && !offline) scheduleMarkRead();
}

function bindChat() {
  const input = rootEl?.querySelector("#wc-input") as HTMLTextAreaElement | null;
  const send = rootEl?.querySelector("#wc-send");

  const doSend = async () => {
    const body = input?.value.trim();
    if (!body || !state.sessionToken) return;

    if (send) send.setAttribute("disabled", "true");
    emitVisitorTyping(false);

    let tempId: string | null = null;

    try {
      if (!state.dialog) {
        const res = await api<{
          dialog: Dialog;
          needsContact: boolean;
          metrikaEvents: { firstMessage: string; contactRequested: string | null };
          metrikaCounterId: string | null;
        }>(`/dialog/${siteKey}/start`, {
          method: "POST",
          body: JSON.stringify({
            sessionToken: state.sessionToken,
            message: body,
            context: getUtmParams(),
          }),
        });
        state.dialog = res.dialog;
        state.needsContact = res.needsContact;
        localStorage.setItem(STORAGE_KEY, state.sessionToken!);
        reachGoal(res.metrikaCounterId, res.metrikaEvents.firstMessage);
        if (res.metrikaEvents.contactRequested) {
          reachGoal(res.metrikaCounterId, res.metrikaEvents.contactRequested);
        }
        connectSocket(res.dialog.id);
      } else {
        tempId = `tmp-${Date.now()}`;
        addMessage({
          id: tempId,
          sender: "VISITOR",
          body,
          status: "SENDING",
          createdAt: new Date().toISOString(),
        });
        render();
        const res = await api<{ message: Message }>(`/message/${siteKey}`, {
          method: "POST",
          body: JSON.stringify({
            sessionToken: state.sessionToken,
            dialogId: state.dialog.id,
            body,
          }),
        });
        replaceMessage(tempId, {
          ...res.message,
          status: res.message.status ?? "DELIVERED",
        });
      }
      if (input) input.value = "";
      render();
    } catch (e) {
      if (tempId && state.dialog) {
        state.dialog.messages = state.dialog.messages.filter((m) => m.id !== tempId);
      }
      console.error(e);
      alert("Не удалось отправить сообщение");
    } finally {
      send?.removeAttribute("disabled");
    }
  };

  send?.addEventListener("click", doSend);
  input?.addEventListener("input", () => {
    if (input?.value.trim()) scheduleVisitorTyping();
    else emitVisitorTyping(false);
  });
  input?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      doSend();
    }
  });
}

function bindContact() {
  const btn = rootEl?.querySelector("#wc-contact-submit");
  btn?.addEventListener("click", async () => {
    const name = (rootEl?.querySelector("#wc-name") as HTMLInputElement)?.value.trim();
    const email = (rootEl?.querySelector("#wc-email") as HTMLInputElement)?.value.trim();
    const phone = (rootEl?.querySelector("#wc-phone") as HTMLInputElement)?.value.trim();
    if (!name || (!email && !phone)) {
      alert("Укажите имя и email или телефон");
      return;
    }
    btn.setAttribute("disabled", "true");
    try {
      const res = await api<{ metrikaEvent: string; metrikaCounterId: string | null }>(
        `/contact/${siteKey}`,
        {
          method: "POST",
          body: JSON.stringify({
            sessionToken: state.sessionToken,
            name,
            email: email || undefined,
            phone: phone || undefined,
          }),
        }
      );
      state.contactDone = true;
      state.needsContact = false;
      reachGoal(res.metrikaCounterId, res.metrikaEvent);
      render();
    } catch {
      alert("Ошибка сохранения контакта");
      btn.removeAttribute("disabled");
    }
  });
}

function bindOffline() {
  rootEl?.querySelector("#wc-offline-close")?.addEventListener("click", () => {
    state.open = false;
    render();
  });

  const btn = rootEl?.querySelector("#wc-off-submit");
  btn?.addEventListener("click", async () => {
    const name = (rootEl?.querySelector("#wc-off-name") as HTMLInputElement)?.value.trim();
    const email = (rootEl?.querySelector("#wc-off-email") as HTMLInputElement)?.value.trim();
    const phone = (rootEl?.querySelector("#wc-off-phone") as HTMLInputElement)?.value.trim();
    const message = (rootEl?.querySelector("#wc-off-msg") as HTMLTextAreaElement)?.value.trim();
    if (!name || !message || (!email && !phone)) {
      alert("Заполните имя, сообщение и email или телефон");
      return;
    }
    btn?.setAttribute("disabled", "true");
    try {
      const res = await api<{
        sessionToken: string;
        metrikaEvent: string;
        metrikaCounterId: string | null;
      }>(`/offline/${siteKey}`, {
        method: "POST",
        body: JSON.stringify({
          sessionToken: state.sessionToken ?? undefined,
          name,
          email: email || undefined,
          phone: phone || undefined,
          message,
          context: getUtmParams(),
        }),
      });
      state.sessionToken = res.sessionToken;
      localStorage.setItem(STORAGE_KEY, res.sessionToken);
      reachGoal(res.metrikaCounterId, res.metrikaEvent);
      state.offlineSubmitted = true;
      render();
    } catch {
      alert("Ошибка отправки");
      btn?.removeAttribute("disabled");
    }
  });
}

function showInitError(message: string) {
  if (!rootEl) return;
  rootEl.innerHTML = `
    <style>#wc-root{font-family:system-ui,sans-serif;font-size:13px;color:#667085;padding:12px 16px;max-width:280px}</style>
    <p>${escapeHtml(message)}</p>
  `;
}

export async function initWidget(opts: WidgetConfig) {
  siteKey = opts.siteKey;
  apiUrl = opts.apiUrl.replace(/\/$/, "");

  rootEl = document.getElementById("wc-root");
  if (!rootEl) {
    rootEl = document.createElement("div");
    rootEl.id = "wc-root";
    document.body.appendChild(rootEl);
  }

  try {
    state.config = await api<SiteConfig>(`/config/${siteKey}`);
    reachGoal(state.config.metrikaCounterId, "chat_widget_shown");

    const session = await api<{
      sessionToken: string;
      visitor: { hasContact: boolean };
      dialog: Dialog | null;
    }>(`/session/${siteKey}`, {
      method: "POST",
      body: JSON.stringify({ sessionToken: state.sessionToken }),
    });

    state.sessionToken = session.sessionToken;
    localStorage.setItem(STORAGE_KEY, session.sessionToken);
    state.dialog = session.dialog;
    state.contactDone = session.visitor.hasContact;
    state.needsContact = !!session.dialog && !session.visitor.hasContact;

    if (session.dialog) {
      connectSocket(session.dialog.id);
    }

    if (configPollId) clearInterval(configPollId);
    configPollId = setInterval(() => {
      void refreshConfig().then(() => {
        if (state.open) render();
      });
    }, 45_000);

    render();
  } catch (e) {
    console.error("[WidgetChat]", e);
    const msg = e instanceof Error ? e.message : "Чат недоступен";
    if (/not found|не найден|404/i.test(msg)) {
      showInitError("Чат для этого сайта отключён или ключ неверный.");
    } else {
      showInitError("Не удалось подключить чат. Попробуйте обновить страницу.");
    }
  }
}

const w = window as Window & {
  WidgetChat?: {
    init?: (o: WidgetConfig) => void | Promise<void>;
    initWidget?: (o: WidgetConfig) => void | Promise<void>;
    q?: unknown[][];
  };
};

if (w.WidgetChat?.q) {
  for (const item of w.WidgetChat.q) {
    if (item[0] === "init") void initWidget(item[1] as WidgetConfig);
  }
}

/** Имя `init` — для IIFE global `WidgetChat.init` (см. vite lib.name) */
export { initWidget as init };
