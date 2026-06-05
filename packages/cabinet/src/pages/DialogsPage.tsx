import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { RefreshCw } from "lucide-react";
import { getToken, api, type DialogDetail, type DialogListItem, type Site } from "../lib/api";
import Button from "../components/ui/Button";
import { messageStatusLabel } from "../lib/messageStatus";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  WAITING_VISITOR: "Ожидает",
  CLOSED: "Закрыт",
  OFFLINE: "Офлайн",
};

const badgeClass: Record<string, string> = {
  NEW: "bg-blue-light-50 text-blue-light-600",
  IN_PROGRESS: "bg-brand-50 text-brand-600",
  WAITING_VISITOR: "bg-warning-50 text-warning-600",
  CLOSED: "bg-gray-100 text-gray-600",
  OFFLINE: "bg-warning-50 text-warning-700",
};

export default function DialogsPage() {
  const [dialogs, setDialogs] = useState<DialogListItem[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DialogDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [visitorTyping, setVisitorTyping] = useState(false);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  selectedIdRef.current = selectedId;

  const loadDialogs = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (siteFilter) params.set("siteId", siteFilter);
    if (search) params.set("q", search);
    const q = params.toString() ? `?${params}` : "";
    setDialogs(await api<DialogListItem[]>(`/api/dialogs${q}`));
  }, [statusFilter, siteFilter, search]);

  useEffect(() => {
    api<Site[]>("/api/sites").then(setSites).catch(console.error);
  }, []);

  useEffect(() => {
    loadDialogs();
  }, [loadDialogs]);

  const emitTyping = useCallback((typing: boolean) => {
    const id = selectedIdRef.current;
    const socket = socketRef.current;
    if (!id || !socket) return;
    socket.emit("typing", { dialogId: id, typing });
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const socket = io(window.location.origin, { auth: { token, role: "operator" }, path: "/socket.io" });
    socketRef.current = socket;
    socket.on("dialog:new", () => loadDialogs());
    socket.on("dialog:updated", () => {
      loadDialogs();
      const id = selectedIdRef.current;
      if (id) loadDetail(id);
    });
    socket.on("typing", (p: { dialogId: string; typing: boolean; from?: string }) => {
      if (p.from === "visitor" && p.dialogId === selectedIdRef.current) {
        setVisitorTyping(p.typing);
      }
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [loadDialogs]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedId) {
      setVisitorTyping(false);
      return;
    }
    socket.emit("join:dialog", { dialogId: selectedId });
    return () => {
      socket.emit("leave:dialog", { dialogId: selectedId });
      setVisitorTyping(false);
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || detail?.status === "CLOSED") {
      emitTyping(false);
      return;
    }
    if (!reply.trim()) {
      emitTyping(false);
      return;
    }
    emitTyping(true);
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => emitTyping(false), 1200);
    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      emitTyping(false);
    };
  }, [reply, selectedId, detail?.status, emitTyping]);

  async function loadDetail(id: string) {
    setDetail(await api<DialogDetail>(`/api/dialogs/${id}`));
  }

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
    setVisitorTyping(false);
  }, [selectedId]);

  async function sendReply() {
    if (!selectedId || !reply.trim()) return;
    emitTyping(false);
    await api(`/api/dialogs/${selectedId}/messages`, { method: "POST", body: JSON.stringify({ body: reply }) });
    setReply("");
    await loadDetail(selectedId);
    loadDialogs();
  }

  async function patchStatus(status: string) {
    if (!selectedId) return;
    await api(`/api/dialogs/${selectedId}`, { method: "PATCH", body: JSON.stringify({ status }) });
    await loadDetail(selectedId);
    loadDialogs();
  }

  async function assignMe() {
    if (!selectedId) return;
    const me = await api<{ id: string }>("/api/auth/me");
    await api(`/api/dialogs/${selectedId}`, {
      method: "PATCH",
      body: JSON.stringify({ operatorId: me.id, status: "IN_PROGRESS" }),
    });
    await loadDetail(selectedId);
    loadDialogs();
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Диалоги</h2>
          <p className="text-theme-sm text-gray-500">Входящие обращения с сайтов</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
          >
            <option value="">Все сайты</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            type="search"
            placeholder="Поиск..."
            className="h-10 w-40 rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            onClick={loadDialogs}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 px-3 text-sm hover:bg-gray-50 dark:border-gray-700"
          >
            <RefreshCw className="size-4" /> Обновить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-6" style={{ minHeight: "calc(100vh - 220px)" }}>
        <div className="xl:col-span-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden flex flex-col">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Список ({dialogs.length})
            </span>
          </div>
          <ul className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-gray-100 dark:divide-gray-800">
            {dialogs.length === 0 ? (
              <li className="p-6 text-center text-sm text-gray-500">Нет диалогов</li>
            ) : (
              dialogs.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(d.id)}
                    className={`w-full text-left px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-white/5 ${
                      selectedId === d.id ? "bg-brand-50 dark:bg-brand-500/10" : ""
                    }`}
                  >
                    <div className="flex justify-between gap-2 mb-1">
                      <span className="font-medium text-gray-800 dark:text-white/90 truncate">
                        {d.visitor.name ?? "Без имени"}
                      </span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass[d.status] ?? badgeClass.NEW}`}>
                        {STATUS_LABELS[d.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{d.site.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                      {d.lastMessage?.body ?? "—"}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="xl:col-span-8 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 flex flex-col min-h-[480px]">
          {!detail ? (
            <div className="flex flex-1 items-center justify-center text-gray-500">Выберите диалог</div>
          ) : (
            <>
              <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                      {detail.visitor.name ?? "Посетитель"}
                    </h3>
                    {detail.visitor.email && <p className="text-sm text-gray-500">{detail.visitor.email}</p>}
                    {detail.visitor.phone && <p className="text-sm text-gray-500">{detail.visitor.phone}</p>}
                    <p className="mt-2 text-xs text-gray-400">
                      {detail.site.name}
                      {detail.pageUrl && (
                        <>
                          {" · "}
                          <a href={detail.pageUrl} target="_blank" rel="noreferrer" className="text-brand-500">
                            страница
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={assignMe}>Взять</Button>
                    {detail.status !== "CLOSED" ? (
                      <Button size="sm" variant="outline" onClick={() => patchStatus("CLOSED")}>Закрыть</Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => patchStatus("IN_PROGRESS")}>Открыть</Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {detail.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "OPERATOR" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        m.sender === "OPERATOR"
                          ? "bg-brand-500 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-bl-sm"
                      }`}
                    >
                      <span>{m.body}</span>
                      {messageStatusLabel(m.status, m.sender) && (
                        <span
                          className={`mt-1 block text-[10px] ${
                            m.sender === "OPERATOR" ? "text-white/70" : "text-gray-400"
                          }`}
                        >
                          {messageStatusLabel(m.status, m.sender)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {visitorTyping && (
                  <p className="text-xs text-gray-500 italic">Посетитель печатает…</p>
                )}
              </div>
              {detail.status !== "CLOSED" && (
                <div className="border-t border-gray-200 p-4 flex gap-3 dark:border-gray-800">
                  <textarea
                    className="flex-1 min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 resize-none"
                    rows={2}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Ответ..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <Button size="sm" onClick={sendReply}>Отправить</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
