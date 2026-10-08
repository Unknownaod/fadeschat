"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

const POLL_MS = 4000;

/* ---------- helpers ---------- */

const hueOf = (s = "") => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const initials = (u) => (u?.displayName || u?.username || "F").split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const isOwn = (m, id) => !!id && (m.userId === id || m.senderId === id || m.sender?.id === id);
const senderOf = (m) => m.userId || m.senderId || m.sender?.id;
const validDate = (d) => { const v = new Date(d); return Number.isNaN(v.getTime()) ? null : v; };
const timeOf = (d) => validDate(d)?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) || "";
const dayKey = (d) => validDate(d)?.toDateString() || "";
const listTime = (d) => {
  const v = validDate(d); if (!v) return "";
  return v.toDateString() === new Date().toDateString() ? timeOf(v) : v.toLocaleDateString([], { month: "short", day: "numeric" });
};
const dayLabel = (d) => {
  const v = validDate(d); if (!v) return "";
  const today = new Date(); const y = new Date(); y.setDate(today.getDate() - 1);
  if (v.toDateString() === today.toDateString()) return "Today";
  if (v.toDateString() === y.toDateString()) return "Yesterday";
  return v.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
};
const close = (a, b) => Math.abs(new Date(b.createdAt) - new Date(a.createdAt)) < 5 * 60000;
const peerOf = (c, me) => (!c || c.type === "group" ? null : c.participants?.find((p) => p.userId !== me?.id) || null);
const nameOf = (c, me) => !c ? "Conversation" : c.type === "group" ? c.name || "Group" : peerOf(c, me)?.displayName || peerOf(c, me)?.username || "Fades user";
const previewOf = (c) => { const l = c.lastMessage; return (typeof l === "string" ? l : l?.content) || "No messages yet"; };
const stamp = (c) => new Date(c.updatedAt || c.lastMessageAt || 0).getTime() || 0;
const sig = (a) => a.filter((m) => !m.pending).map((m) => [m.id, m.content, m.edited, m.read, m.deleted || m.isDeleted].join(":")).join("|");

function Avatar({ user, group, id, size = 40 }) {
  return (
    <span className="av" style={{ "--h": hueOf(id || user?.id || user?.username), "--s": `${size}px` }}>
      {group ? "👥" : initials(user)}
    </span>
  );
}

/* ---------- page ---------- */

export default function Chat() {
  const router = useRouter();

  const [me, setMe] = useState(null);
  const [convs, setConvs] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [tabs, setTabs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState({ items: [], loading: false });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState([]);
  const [omniOpen, setOmniOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [group, setGroup] = useState(null);
  const [toast, setToast] = useState("");

  const meRef = useRef(null);
  const activeRef = useRef(null);
  const known = useRef({});
  const lastRead = useRef(null);
  const taRef = useRef(null);
  const endRef = useRef(null);
  const omniRef = useRef(null);
  const toastTimer = useRef(null);
  const stick = useRef("auto");

  activeRef.current = activeId;

  const notify = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }, []);

  const active = convs.find((c) => c.id === activeId) || known.current[activeId] || null;

  /* ----- data ----- */

  const fetchConvs = useCallback(async () => {
    try {
      const data = await api("/chat/conversations");
      const list = (Array.isArray(data) ? data : data?.conversations || []).slice().sort((a, b) => stamp(b) - stamp(a));
      list.forEach((c) => { known.current[c.id] = c; });
      setConvs(list);
    } catch (err) {
      if (!document.hidden) console.error(err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  const fetchMessages = useCallback(async (id, silent) => {
    try {
      const data = await api(`/chat/conversations/${id}/messages`);
      const items = Array.isArray(data) ? data : data?.messages || [];
      if (activeRef.current !== id) return;

      setThread((t) =>
        silent && sig(t.items) === sig(items)
          ? t
          : { items: [...items, ...t.items.filter((m) => m.pending)], loading: false }
      );

      const last = items[items.length - 1];
      if (last && !isOwn(last, meRef.current?.id) && lastRead.current !== last.id) {
        lastRead.current = last.id;
        api(`/chat/conversations/${id}/read`, { method: "POST", body: "{}" }).then(fetchConvs).catch(() => {});
      }
    } catch (err) {
      if (!silent) { setThread({ items: [], loading: false }); notify(err.message || "Unable to load messages."); }
    }
  }, [fetchConvs, notify]);

  useEffect(() => {
    api("/auth/me")
      .then((d) => { const u = d?.user || d; meRef.current = u; setMe(u); fetchConvs(); })
      .catch(() => router.replace("/login"));
  }, [router, fetchConvs]);

  useEffect(() => {
    if (!me) return;
    const tick = () => { if (document.hidden) return; fetchConvs(); if (activeRef.current) fetchMessages(activeRef.current, true); };
    const t = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", tick); };
  }, [me, fetchConvs, fetchMessages]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setPeople([]); return; }
    const t = setTimeout(() => {
      api(`/chat/users/search?q=${encodeURIComponent(q)}`)
        .then((d) => setPeople((Array.isArray(d) ? d : d?.users || []).filter((u) => u.id !== meRef.current?.id)))
        .catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!group) return;
    const q = group.q.trim();
    if (!q) { setGroup((g) => (g && g.results.length ? { ...g, results: [] } : g)); return; }
    const t = setTimeout(() => {
      api(`/chat/users/search?q=${encodeURIComponent(q)}`)
        .then((d) => setGroup((g) => g && { ...g, results: (Array.isArray(d) ? d : d?.users || []).filter((u) => u.id !== meRef.current?.id) }))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [group?.q]);

  useEffect(() => {
    const el = endRef.current;
    if (el) el.scrollIntoView({ behavior: stick.current });
    stick.current = "smooth";
  }, [thread.items.length, activeId]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [draft]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); omniRef.current?.focus(); }
      if (e.key === "Escape") { setOmniOpen(false); setMenuOpen(false); setGroup(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ----- actions ----- */

  function openConversation(c) {
    if (!c?.id) return;
    known.current[c.id] = c;
    lastRead.current = null;
    stick.current = "auto";
    setTabs((t) => (t.includes(c.id) ? t : [...t, c.id]));
    setActiveId(c.id);
    setThread({ items: [], loading: true });
    setEditing(null);
    setOmniOpen(false);
    setQuery("");
    if (window.innerWidth < 820) setRailOpen(false);
    fetchMessages(c.id, false);
    setTimeout(() => taRef.current?.focus(), 80);
  }

  function closeTab(id) {
    const i = tabs.indexOf(id);
    const next = tabs.filter((t) => t !== id);
    setTabs(next);
    if (activeId === id) {
      const nid = next[i] || next[i - 1];
      if (nid) openConversation(known.current[nid]);
      else { setActiveId(null); setThread({ items: [], loading: false }); }
    }
  }

  async function startDirect(user) {
    try {
      const data = await api("/chat/conversations", { method: "POST", body: JSON.stringify({ type: "direct", participantIds: [user.id] }) });
      const c = data?.conversation || data;
      known.current[c.id] = c;
      await fetchConvs();
      openConversation(c);
    } catch (err) { notify(err.message || "Unable to start conversation."); }
  }

  async function createGroup() {
    if (!group?.users.length) return;
    try {
      const data = await api("/chat/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "group", name: group.name.trim() || "New group", participantIds: group.users.map((u) => u.id) }),
      });
      const c = data?.conversation || data;
      known.current[c.id] = c;
      setGroup(null);
      await fetchConvs();
      openConversation(c);
    } catch (err) { notify(err.message || "Unable to create group."); }
  }

  async function send(e) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !activeId || sending) return;
    const tmp = { id: `tmp-${Date.now()}`, content: text, userId: me.id, createdAt: new Date().toISOString(), pending: true };
    setSending(true);
    setDraft("");
    stick.current = "smooth";
    setThread((t) => ({ ...t, items: [...t.items, tmp] }));
    try {
      const data = await api(`/chat/conversations/${activeId}/messages`, { method: "POST", body: JSON.stringify({ content: text }) });
      const saved = data?.message || data;
      setThread((t) => ({ ...t, items: t.items.map((m) => (m.id === tmp.id ? saved : m)) }));
      fetchConvs();
    } catch (err) {
      setThread((t) => ({ ...t, items: t.items.filter((m) => m.id !== tmp.id) }));
      setDraft(text);
      notify(err.message || "Message not sent. Try again.");
    } finally {
      setSending(false);
      taRef.current?.focus();
    }
  }

  async function saveEdit() {
    const text = editing?.text.trim();
    if (!text) return;
    try {
      const data = await api(`/chat/messages/${editing.id}`, { method: "PATCH", body: JSON.stringify({ content: text }) });
      const updated = data?.message || data;
      setThread((t) => ({ ...t, items: t.items.map((m) => (m.id === editing.id ? { ...m, ...updated, edited: true } : m)) }));
      setEditing(null);
    } catch (err) { notify(err.message || "Unable to edit message."); }
  }

  async function removeMessage(m) {
    try {
      await api(`/chat/messages/${m.id}`, { method: "DELETE" });
      setThread((t) => ({ ...t, items: t.items.map((x) => (x.id === m.id ? { ...x, deleted: true } : x)) }));
      fetchConvs();
    } catch (err) { notify(err.message || "Unable to delete message."); }
  }

  async function logout() {
    try { await api("/auth/logout", { method: "POST", body: "{}" }); } catch {}
    router.replace("/");
  }

  /* ----- render ----- */

  if (!me) return <main className="boot"><div className="boot-mark"><span>f</span></div><span>Fades Chat</span></main>;

  const q = query.trim().toLowerCase();
  const convMatches = (q ? convs.filter((c) => nameOf(c, me).toLowerCase().includes(q)) : convs.slice(0, 5));
  const first = (me.displayName || me.username || "there").split(" ")[0];
  const isGroup = active?.type === "group";
  const items = thread.items;

  return (
    <div className="app-window">
      {(menuOpen || omniOpen) && <div className="scrim" onClick={() => { setMenuOpen(false); setOmniOpen(false); }} />}

      {/* tab strip */}
      <div className="tabbar">
        <Link href="/" className="tab-brand" title="Fades home"><span className="brand-mark"><span>f</span></span></Link>
        <div className="tabs" role="tablist">
          <div role="tab" tabIndex={0} aria-selected={activeId === null} className={`tab ${activeId === null ? "active" : ""}`}
            onClick={() => setActiveId(null)} onKeyDown={(e) => e.key === "Enter" && setActiveId(null)}>
            <span className="tab-ico">⌂</span><span className="tab-title">Home</span>
          </div>
          {tabs.map((id) => {
            const c = known.current[id]; if (!c) return null;
            return (
              <div key={id} role="tab" tabIndex={0} aria-selected={activeId === id} className={`tab ${activeId === id ? "active" : ""}`}
                onClick={() => openConversation(c)} onKeyDown={(e) => e.key === "Enter" && openConversation(c)}>
                <Avatar user={peerOf(c, me)} group={c.type === "group"} id={c.id} size={18} />
                <span className="tab-title">{nameOf(c, me)}</span>
                {c.unread && activeId !== id && <i className="tab-dot" />}
                <button type="button" className="tab-close" aria-label="Close tab" onClick={(e) => { e.stopPropagation(); closeTab(id); }}>×</button>
              </div>
            );
          })}
        </div>
        <button type="button" className="tab-new" title="New message (⌘K)" onClick={() => omniRef.current?.focus()}>+</button>

        <div className="tab-actions">
          <button type="button" className="me-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu"><Avatar user={me} size={30} /></button>
          {menuOpen && (
            <div className="menu" role="menu">
              <div className="menu-head"><Avatar user={me} size={38} /><div><strong>{me.displayName || me.username}</strong><span>@{me.username}</span></div></div>
              <Link href="/settings" className="menu-item" role="menuitem">Account settings</Link>
              <Link href="/" className="menu-item" role="menuitem">Fades Chat home</Link>
              <button type="button" className="menu-item danger" role="menuitem" onClick={logout}>Sign out</button>
            </div>
          )}
        </div>
      </div>

      {/* toolbar + omnibox */}
      <div className="toolbar">
        <div className="toolbar-left">
          <button type="button" className="icon-btn" title="Toggle sidebar" aria-pressed={railOpen} onClick={() => setRailOpen((o) => !o)}>☰</button>
        </div>

        <div className={`omni ${omniOpen ? "open" : ""}`}>
          <span className="omni-ico">⌕</span>
          <input ref={omniRef} value={query} placeholder="Search people and conversations" aria-label="Search"
            onChange={(e) => { setQuery(e.target.value); setOmniOpen(true); }} onFocus={() => setOmniOpen(true)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const target = convMatches[0] ? { c: convMatches[0] } : people[0] ? { u: people[0] } : null;
              if (target?.c) openConversation(target.c); else if (target?.u) startDirect(target.u);
            }} />
          <kbd>⌘K</kbd>
          {omniOpen && (
            <div className="omni-menu">
              {convMatches.length > 0 && <div className="omni-label">{q ? "Conversations" : "Recent"}</div>}
              {convMatches.map((c) => (
                <button type="button" key={c.id} className="omni-item" onClick={() => openConversation(c)}>
                  <Avatar user={peerOf(c, me)} group={c.type === "group"} id={c.id} size={30} />
                  <span><strong>{nameOf(c, me)}</strong><em>{previewOf(c)}</em></span>
                </button>
              ))}
              {q && people.length > 0 && <div className="omni-label">People on Fades</div>}
              {q && people.map((u) => (
                <button type="button" key={u.id} className="omni-item" onClick={() => startDirect(u)}>
                  <Avatar user={u} size={30} />
                  <span><strong>{u.displayName || u.username}</strong><em>@{u.username}</em></span>
                  <small>Message</small>
                </button>
              ))}
              {q && !convMatches.length && !people.length && <div className="omni-empty">No one found for “{query.trim()}”.</div>}
              <button type="button" className="omni-item omni-action" onClick={() => { setOmniOpen(false); setGroup({ name: "", q: "", results: [], users: [] }); }}>
                <span className="av-plus">+</span><span><strong>New group</strong><em>Start a conversation with several people</em></span>
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-right">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setGroup({ name: "", q: "", results: [], users: [] })}>New group</button>
        </div>
      </div>

      <div className="body">
        {/* sidebar */}
        <aside className={`rail ${railOpen ? "open" : ""}`}>
          <div className="rail-inner">
            <div className="rail-head"><strong>Chats</strong><span>{convs.length}</span></div>
            <div className="rail-list">
              {loadingConvs ? (
                [0, 1, 2, 3, 4].map((i) => <div className="skel" key={i} />)
              ) : convs.length === 0 ? (
                <div className="rail-empty"><strong>No conversations yet</strong><span>Search for someone with ⌘K to say hello.</span></div>
              ) : convs.map((c) => (
                <button type="button" key={c.id} className={`row ${activeId === c.id ? "selected" : ""}`} onClick={() => openConversation(c)}>
                  <Avatar user={peerOf(c, me)} group={c.type === "group"} id={c.id} size={44} />
                  <span className="row-main">
                    <span className="row-top"><strong>{nameOf(c, me)}</strong><em>{listTime(c.updatedAt || c.lastMessageAt)}</em></span>
                    <span className="row-prev">{previewOf(c)}</span>
                  </span>
                  {c.unread && activeId !== c.id && <i className="unread" />}
                </button>
              ))}
            </div>
          </div>
        </aside>
        {railOpen && <div className="rail-scrim" onClick={() => setRailOpen(false)} />}

        {/* stage */}
        <section className="stage">
          {!active ? (
            <div className="home">
              <div className="home-inner">
                <div className="boot-mark big"><span>f</span></div>
                <h1>Hi, {first}</h1>
                <p>Pick up a conversation or start a new one.</p>
                <button type="button" className="home-search" onClick={() => omniRef.current?.focus()}>
                  <span>⌕</span> Search people and conversations <kbd>⌘K</kbd>
                </button>
                <div className="tiles">
                  {convs.slice(0, 7).map((c) => (
                    <button type="button" key={c.id} className="tile" onClick={() => openConversation(c)}>
                      <Avatar user={peerOf(c, me)} group={c.type === "group"} id={c.id} size={48} />
                      <strong>{nameOf(c, me)}</strong>
                      <span>{previewOf(c)}</span>
                    </button>
                  ))}
                  <button type="button" className="tile tile-add" onClick={() => setGroup({ name: "", q: "", results: [], users: [] })}>
                    <span className="av-plus">+</span><strong>New group</strong><span>Add people</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <header className="stage-head">
                <Avatar user={peerOf(active, me)} group={isGroup} id={active.id} size={40} />
                <div><strong>{nameOf(active, me)}</strong><span>{isGroup ? `${active.participants?.length || 0} members` : `@${peerOf(active, me)?.username || "fades"}`}</span></div>
              </header>

              <div className="messages" role="log" aria-live="polite">
                {thread.loading ? (
                  <div className="msg-skel"><i /><i /><i /></div>
                ) : items.length === 0 ? (
                  <div className="thread-empty">
                    <Avatar user={peerOf(active, me)} group={isGroup} id={active.id} size={72} />
                    <strong>{nameOf(active, me)}</strong>
                    <span>This is the start of your conversation. Say hello.</span>
                  </div>
                ) : items.map((m, i) => {
                  const prev = items[i - 1], next = items[i + 1];
                  const own = isOwn(m, me.id);
                  const newDay = dayKey(m.createdAt) !== dayKey(prev?.createdAt);
                  const cont = !!prev && !newDay && senderOf(prev) === senderOf(m) && close(prev, m);
                  const tail = !(next && dayKey(next.createdAt) === dayKey(m.createdAt) && senderOf(next) === senderOf(m) && close(m, next));
                  const deleted = m.deleted || m.isDeleted;
                  const isEditing = editing?.id === m.id;
                  return (
                    <div key={m.id}>
                      {newDay && <div className="day"><span>{dayLabel(m.createdAt)}</span></div>}
                      <div className={`msg ${own ? "own" : "other"} ${cont ? "cont" : ""} ${tail ? "tail" : ""} ${m.pending ? "pending" : ""}`}>
                        {!own && <div className="msg-av">{tail && <Avatar user={m.sender} id={senderOf(m)} size={30} />}</div>}
                        <div className="msg-col">
                          {!own && isGroup && !cont && <span className="who">{m.sender?.displayName || m.sender?.username || "User"}</span>}
                          <div className="bubble">
                            {isEditing ? (
                              <div className="edit">
                                <textarea autoFocus value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") setEditing(null); }} />
                                <div><button type="button" onClick={() => setEditing(null)}>Cancel</button><button type="button" className="save" onClick={saveEdit}>Save</button></div>
                              </div>
                            ) : (
                              <>
                                <div className={`text ${deleted ? "deleted" : ""}`}>{deleted ? "This message was deleted." : m.content}</div>
                                {tail && (
                                  <div className="meta">
                                    <span>{m.pending ? "Sending…" : timeOf(m.createdAt)}</span>
                                    {m.edited && !deleted && <span>edited</span>}
                                    {own && m.read && !deleted && <span className="read">✓✓</span>}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          {!isEditing && !deleted && !m.pending && (
                            <div className="tools">
                              <button type="button" onClick={() => navigator.clipboard?.writeText(m.content).then(() => notify("Copied"))}>Copy</button>
                              {own && <button type="button" onClick={() => setEditing({ id: m.id, text: m.content || "" })}>Edit</button>}
                              {own && <button type="button" className="danger" onClick={() => removeMessage(m)}>Delete</button>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <form className="composer" onSubmit={send}>
                <textarea ref={taRef} rows={1} value={draft} placeholder={`Message ${nameOf(active, me)}`} aria-label="Message"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <button type="submit" className={`send ${draft.trim() ? "on" : ""}`} disabled={!draft.trim() || sending} aria-label="Send message">↑</button>
              </form>
            </>
          )}
        </section>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}

      {group && (
        <div className="modal-scrim" onClick={() => setGroup(null)}>
          <div className="modal" role="dialog" aria-label="New group" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><strong>New group</strong><button type="button" className="icon-btn" onClick={() => setGroup(null)} aria-label="Close">×</button></div>
            <input className="modal-input" placeholder="Group name" maxLength={80} value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} autoFocus />
            <input className="modal-input" placeholder="Search people to add" value={group.q} onChange={(e) => setGroup({ ...group, q: e.target.value })} />
            {group.users.length > 0 && (
              <div className="chips">{group.users.map((u) => (
                <button type="button" key={u.id} onClick={() => setGroup({ ...group, users: group.users.filter((x) => x.id !== u.id) })}>{u.displayName || u.username} ×</button>
              ))}</div>
            )}
            <div className="modal-list">
              {group.results.map((u) => {
                const on = group.users.some((x) => x.id === u.id);
                return (
                  <button type="button" key={u.id} className="omni-item" onClick={() => setGroup({ ...group, users: on ? group.users.filter((x) => x.id !== u.id) : [...group.users, u] })}>
                    <Avatar user={u} size={32} />
                    <span><strong>{u.displayName || u.username}</strong><em>@{u.username}</em></span>
                    {on && <b className="tick">✓</b>}
                  </button>
                );
              })}
              {group.q.trim() && !group.results.length && <div className="omni-empty">No people found.</div>}
            </div>
            <button type="button" className="btn btn-primary btn-block" disabled={!group.users.length} onClick={createGroup}>
              Create group{group.users.length ? ` (${group.users.length + 1})` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
