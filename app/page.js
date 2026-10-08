"use client";

import { useEffect, useRef, useState } from "react";
import "./globals.css";

const API_BASE =
  process.env.NEXT_PUBLIC_FADES_API_URL ||
  "https://api.fades.lol";

function getInitials(user) {
  const name =
    user?.displayName ||
    user?.username ||
    "F";

  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatConversationTime(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  const now = new Date();

  const sameDay =
    value.getFullYear() === now.getFullYear() &&
    value.getMonth() === now.getMonth() &&
    value.getDate() === now.getDate();

  if (sameDay) {
    return value.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return value.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function conversationName(conversation, currentUser) {
  if (!conversation) {
    return "Conversation";
  }

  if (conversation.type === "group") {
    return (
      conversation.name ||
      "Group"
    );
  }

  const participant =
    conversation.participants?.find(
      (participant) =>
        participant.userId !== currentUser?.id
    );

  return (
    participant?.displayName ||
    participant?.username ||
    "Fades user"
  );
}

function conversationParticipant(
  conversation,
  currentUser
) {
  if (!conversation) {
    return null;
  }

  if (conversation.type === "group") {
    return null;
  }

  return (
    conversation.participants?.find(
      (participant) =>
        participant.userId !== currentUser?.id
    ) || null
  );
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);

  const [conversations, setConversations] =
    useState([]);

  const [activeConversation, setActiveConversation] =
    useState(null);

  const [messages, setMessages] =
    useState([]);

  const [message, setMessage] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [userResults, setUserResults] =
    useState([]);

  const [loadingUser, setLoadingUser] =
    useState(true);

  const [loadingConversations, setLoadingConversations] =
    useState(true);

  const [loadingMessages, setLoadingMessages] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [editingMessage, setEditingMessage] =
    useState(null);

  const [editingText, setEditingText] =
    useState("");

  const [showNewChat, setShowNewChat] =
    useState(false);

  const [showSidebar, setShowSidebar] =
    useState(true);

  const [showGroupCreator, setShowGroupCreator] =
    useState(false);

  const [groupName, setGroupName] =
    useState("");

  const [selectedGroupUsers, setSelectedGroupUsers] =
    useState([]);

  const [error, setError] =
    useState("");

  const textareaRef =
    useRef(null);

  const messagesEndRef =
    useRef(null);

  const searchTimeoutRef =
    useRef(null);

  /*
  =========================================================
  API
  =========================================================
  */

  async function api(
    endpoint,
    options = {}
  ) {
    const response =
      await fetch(
        `${API_BASE}${endpoint}`,
        {
          credentials: "include",
          ...options,
          headers: {
            "Content-Type":
              "application/json",
            ...(options.headers || {}),
          },
        }
      );

    let data = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Something went wrong."
      );
    }

    return data;
  }

  /*
  =========================================================
  LOAD CURRENT USER
  =========================================================
  */

  async function loadCurrentUser() {
    try {
      const data =
        await api("/auth/me");

      setCurrentUser(
        data?.user ||
          data
      );
    } catch (err) {
      console.error(
        "Failed to load user:",
        err
      );

      setError(
        "Please sign in to use Fades Chat."
      );
    } finally {
      setLoadingUser(false);
    }
  }

  /*
  =========================================================
  LOAD CONVERSATIONS
  =========================================================
  */

  async function loadConversations() {
    try {
      setLoadingConversations(true);

      const data =
        await api(
          "/chat/conversations"
        );

      setConversations(
        Array.isArray(data)
          ? data
          : data?.conversations || []
      );
    } catch (err) {
      console.error(
        "Failed to load conversations:",
        err
      );

      setError(
        err.message ||
          "Unable to load conversations."
      );
    } finally {
      setLoadingConversations(false);
    }
  }

  /*
  =========================================================
  LOAD MESSAGES
  =========================================================
  */

  async function loadMessages(
    conversationId
  ) {
    if (!conversationId) {
      return;
    }

    try {
      setLoadingMessages(true);

      const data =
        await api(
          `/chat/conversations/${conversationId}/messages`
        );

      setMessages(
        Array.isArray(data)
          ? data
          : data?.messages || []
      );

      await api(
        `/chat/conversations/${conversationId}/read`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );
    } catch (err) {
      console.error(
        "Failed to load messages:",
        err
      );

      setMessages([]);

      setError(
        err.message ||
          "Unable to load messages."
      );
    } finally {
      setLoadingMessages(false);
    }
  }

  /*
  =========================================================
  INITIAL LOAD
  =========================================================
  */

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    loadConversations();
  }, [currentUser]);

  /*
  =========================================================
  OPEN CONVERSATION
  =========================================================
  */

  async function openConversation(
    conversation
  ) {
    if (!conversation?.id) {
      return;
    }

    setActiveConversation(
      conversation
    );

    setShowNewChat(false);
    setShowSidebar(false);
    setError("");

    await loadMessages(
      conversation.id
    );
  }

  /*
  =========================================================
  NEW DIRECT CONVERSATION
  =========================================================
  */

  async function startDirectChat(
    user
  ) {
    if (!user?.id) {
      return;
    }

    try {
      setError("");

      const data =
        await api(
          "/chat/conversations",
          {
            method: "POST",
            body: JSON.stringify({
              type: "direct",
              participantIds: [
                user.id,
              ],
            }),
          }
        );

      const conversation =
        data?.conversation ||
        data;

      await loadConversations();

      setShowNewChat(false);

      await openConversation(
        conversation
      );
    } catch (err) {
      console.error(
        "Failed to create conversation:",
        err
      );

      setError(
        err.message ||
          "Unable to start conversation."
      );
    }
  }

  /*
  =========================================================
  GROUP CONVERSATION
  =========================================================
  */

  async function createGroup() {
    if (
      selectedGroupUsers.length === 0
    ) {
      return;
    }

    try {
      setError("");

      const data =
        await api(
          "/chat/conversations",
          {
            method: "POST",
            body: JSON.stringify({
              type: "group",
              name:
                groupName.trim() ||
                "New group",
              participantIds:
                selectedGroupUsers.map(
                  (user) =>
                    user.id
                ),
            }),
          }
        );

      const conversation =
        data?.conversation ||
        data;

      setShowGroupCreator(false);
      setShowNewChat(false);
      setGroupName("");
      setSelectedGroupUsers([]);

      await loadConversations();

      await openConversation(
        conversation
      );
    } catch (err) {
      console.error(
        "Failed to create group:",
        err
      );

      setError(
        err.message ||
          "Unable to create group."
      );
    }
  }

  /*
  =========================================================
  USER SEARCH
  =========================================================
  */

  function searchUsers(value) {
    setSearch(value);

    clearTimeout(
      searchTimeoutRef.current
    );

    if (!value.trim()) {
      setUserResults([]);
      return;
    }

    searchTimeoutRef.current =
      setTimeout(
        async () => {
          try {
            const data =
              await api(
                `/chat/users/search?q=${encodeURIComponent(
                  value.trim()
                )}`
              );

            setUserResults(
              Array.isArray(data)
                ? data
                : data?.users || []
            );
          } catch (err) {
            console.error(
              "User search failed:",
              err
            );

            setUserResults([]);
          }
        },
        300
      );
  }

  /*
  =========================================================
  SEND MESSAGE
  =========================================================
  */

  async function sendMessage(
    event
  ) {
    event?.preventDefault();

    const text =
      message.trim();

    if (
      !text ||
      !activeConversation ||
      sending
    ) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const data =
        await api(
          `/chat/conversations/${activeConversation.id}/messages`,
          {
            method: "POST",
            body: JSON.stringify({
              content: text,
            }),
          }
        );

      const newMessage =
        data?.message ||
        data;

      setMessages(
        (current) => [
          ...current,
          newMessage,
        ]
      );

      setMessage("");

      if (textareaRef.current) {
        textareaRef.current.style.height =
          "auto";
      }

      await loadConversations();
    } catch (err) {
      console.error(
        "Failed to send message:",
        err
      );

      setError(
        err.message ||
          "Unable to send message."
      );
    } finally {
      setSending(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }

  /*
  =========================================================
  EDIT MESSAGE
  =========================================================
  */

  function beginEdit(
    item
  ) {
    setEditingMessage(
      item
    );

    setEditingText(
      item.content || ""
    );
  }

  async function saveEdit() {
    if (
      !editingMessage ||
      !editingText.trim()
    ) {
      return;
    }

    try {
      const data =
        await api(
          `/chat/messages/${editingMessage.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              content:
                editingText.trim(),
            }),
          }
        );

      const updated =
        data?.message ||
        data;

      setMessages(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              editingMessage.id
                ? updated
                : item
          )
      );

      setEditingMessage(null);
      setEditingText("");
    } catch (err) {
      console.error(
        "Failed to edit message:",
        err
      );

      setError(
        err.message ||
          "Unable to edit message."
      );
    }
  }

  /*
  =========================================================
  DELETE MESSAGE
  =========================================================
  */

  async function deleteMessage(
    item
  ) {
    if (!item?.id) {
      return;
    }

    try {
      await api(
        `/chat/messages/${item.id}`,
        {
          method: "DELETE",
        }
      );

      setMessages(
        (current) =>
          current.map(
            (message) =>
              message.id === item.id
                ? {
                    ...message,
                    deleted: true,
                    content:
                      "This message was deleted.",
                  }
                : message
          )
      );
    } catch (err) {
      console.error(
        "Failed to delete message:",
        err
      );

      setError(
        err.message ||
          "Unable to delete message."
      );
    }
  }

  /*
  =========================================================
  TEXTAREA
  =========================================================
  */

  function resizeTextarea() {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height =
      "auto";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        150
      )}px`;
  }

  /*
  =========================================================
  AUTO SCROLL
  =========================================================
  */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [
    messages,
    loadingMessages,
  ]);

  /*
  =========================================================
  GROUP SELECTION
  =========================================================
  */

  function toggleGroupUser(
    user
  ) {
    setSelectedGroupUsers(
      (current) => {
        const exists =
          current.some(
            (item) =>
              item.id === user.id
          );

        if (exists) {
          return current.filter(
            (item) =>
              item.id !== user.id
          );
        }

        return [
          ...current,
          user,
        ];
      }
    );
  }

  /*
  =========================================================
  CONVERSATION DATA
  =========================================================
  */

  const activeName =
    conversationName(
      activeConversation,
      currentUser
    );

  const activeParticipant =
    conversationParticipant(
      activeConversation,
      currentUser
    );

  /*
  =========================================================
  LOADING SCREEN
  =========================================================
  */

  if (loadingUser) {
    return (
      <main className="app loading-screen">
        <div className="loading-logo">
          <span>f</span>
        </div>

        <div className="loading-text">
          Fades Chat
        </div>
      </main>
    );
  }

  /*
  =========================================================
  MAIN
  =========================================================
  */

  return (
    <main className="app">
      <div className="ambient" />
      <div className="noise" />

      <div className="chat-shell">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside
          className={`sidebar ${
            showSidebar
              ? "sidebar-visible"
              : ""
          }`}
        >
          <div className="sidebar-top">

            <div className="brand">
              <div className="brand-mark">
                <span>f</span>
              </div>

              <div className="brand-text">
                <strong>Fades</strong>
                <span>Chat</span>
              </div>
            </div>

            <button
              type="button"
              className="new-message-button"
              onClick={() => {
                setShowNewChat(true);
                setSearch("");
                setUserResults([]);
              }}
              title="New message"
            >
              <span>+</span>
            </button>
          </div>

          <div className="sidebar-search">
            <span className="search-icon">
              ⌕
            </span>

            <input
              value={search}
              onChange={(event) =>
                searchUsers(
                  event.target.value
                )
              }
              placeholder="Search"
            />
          </div>

          {showNewChat ? (
            <div className="new-chat-panel">

              <div className="panel-heading">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewChat(false);
                    setSearch("");
                    setUserResults([]);
                  }}
                  className="back-button"
                >
                  ←
                </button>

                <div>
                  <strong>
                    New message
                  </strong>

                  <span>
                    Find someone on Fades
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="group-create-button"
                onClick={() =>
                  setShowGroupCreator(
                    true
                  )
                }
              >
                <div className="group-icon">
                  +
                </div>

                <div>
                  <strong>
                    New group
                  </strong>

                  <span>
                    Start a group conversation
                  </span>
                </div>
              </button>

              <div className="search-results">
                {search.trim() &&
                userResults.length === 0 ? (
                  <div className="empty-search">
                    No users found.
                  </div>
                ) : (
                  userResults.map(
                    (user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="user-result"
                        onClick={() => {
                          if (
                            showGroupCreator
                          ) {
                            toggleGroupUser(
                              user
                            );
                          } else {
                            startDirectChat(
                              user
                            );
                          }
                        }}
                      >
                        <div className="avatar">
                          {getInitials(
                            user
                          )}
                        </div>

                        <div className="user-result-info">
                          <strong>
                            {user.displayName ||
                              user.username}
                          </strong>

                          <span>
                            @{user.username}
                          </span>
                        </div>

                        {showGroupCreator &&
                          selectedGroupUsers.some(
                            (item) =>
                              item.id ===
                              user.id
                          ) && (
                            <div className="selected-check">
                              ✓
                            </div>
                          )}
                      </button>
                    )
                  )
                )}
              </div>

              {showGroupCreator && (
                <div className="group-builder">

                  <input
                    value={groupName}
                    onChange={(event) =>
                      setGroupName(
                        event.target.value
                      )
                    }
                    placeholder="Group name"
                    maxLength={80}
                  />

                  <div className="selected-users">
                    {selectedGroupUsers.map(
                      (user) => (
                        <span
                          key={user.id}
                        >
                          {user.displayName ||
                            user.username}
                        </span>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      selectedGroupUsers.length ===
                      0
                    }
                    onClick={
                      createGroup
                    }
                  >
                    Create group
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="conversation-list">

              {loadingConversations ? (
                <div className="conversation-loading">
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              ) : conversations.length ===
                0 ? (
                <div className="sidebar-empty">
                  <div className="empty-icon">
                    ✦
                  </div>

                  <strong>
                    No conversations yet
                  </strong>

                  <span>
                    Start a new conversation
                    with someone on Fades.
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setShowNewChat(true)
                    }
                  >
                    New message
                  </button>
                </div>
              ) : (
                conversations.map(
                  (conversation) => {
                    const participant =
                      conversationParticipant(
                        conversation,
                        currentUser
                      );

                    const name =
                      conversationName(
                        conversation,
                        currentUser
                      );

                    const selected =
                      activeConversation?.id ===
                      conversation.id;

                    return (
                      <button
                        key={
                          conversation.id
                        }
                        type="button"
                        className={`conversation ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          openConversation(
                            conversation
                          )
                        }
                      >
                        <div className="conversation-avatar">
                          {conversation.type ===
                          "group"
                            ? "••"
                            : getInitials(
                                participant
                              )}
                        </div>

                        <div className="conversation-main">
                          <div className="conversation-heading">
                            <strong>
                              {name}
                            </strong>

                            <span>
                              {formatConversationTime(
                                conversation.updatedAt ||
                                  conversation.lastMessageAt
                              )}
                            </span>
                          </div>

                          <div className="conversation-preview">
                            {conversation.lastMessage?.content ||
                              conversation.lastMessage ||
                              "Start a conversation"}
                          </div>
                        </div>

                        {conversation.unread && (
                          <div className="unread-dot" />
                        )}
                      </button>
                    );
                  }
                )
              )}
            </div>
          )}

          <div className="sidebar-footer">
            <div className="account">
              <div className="avatar small">
                {getInitials(
                  currentUser
                )}
              </div>

              <div className="account-info">
                <strong>
                  {currentUser?.displayName ||
                    currentUser?.username ||
                    "Fades user"}
                </strong>

                <span>
                  @{currentUser?.username ||
                    "user"}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* =================================================
            MAIN CHAT
        ================================================= */}

        <section className="chat-area">

          {!activeConversation ? (
            <div className="welcome">

              <button
                type="button"
                className="mobile-menu"
                onClick={() =>
                  setShowSidebar(
                    true
                  )
                }
              >
                ☰
              </button>

              <div className="welcome-mark">
                <span>f</span>
              </div>

              <h1>
                Fades Chat
              </h1>

              <p>
                Simple, private messaging
                with your Fades account.
              </p>

              <button
                type="button"
                className="welcome-button"
                onClick={() =>
                  setShowNewChat(true)
                }
              >
                Start a conversation
              </button>
            </div>
          ) : (
            <>
              {/* ===========================================
                  CHAT HEADER
              =========================================== */}

              <header className="chat-header">

                <button
                  type="button"
                  className="mobile-back"
                  onClick={() =>
                    setShowSidebar(true)
                  }
                >
                  ←
                </button>

                <div className="chat-header-avatar">
                  {activeConversation.type ===
                  "group"
                    ? "••"
                    : getInitials(
                        activeParticipant
                      )}
                </div>

                <div className="chat-header-info">
                  <strong>
                    {activeName}
                  </strong>

                  <span>
                    {activeConversation.type ===
                    "group"
                      ? `${
                          activeConversation.participants
                            ?.length ||
                          0
                        } members`
                      : "Fades Chat"}
                  </span>
                </div>

                <div className="chat-header-actions">
                  <button
                    type="button"
                    title="Search messages"
                  >
                    ⌕
                  </button>

                  <button
                    type="button"
                    title="Conversation info"
                  >
                    ⋯
                  </button>
                </div>
              </header>

              {/* ===========================================
                  MESSAGES
              =========================================== */}

              <div
                className="messages"
                role="log"
                aria-live="polite"
              >
                {loadingMessages ? (
                  <div className="messages-loading">
                    <div className="message-loading-avatar" />
                    <div className="message-loading-lines">
                      <span />
                      <span />
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="conversation-empty">

                    <div className="conversation-empty-avatar">
                      {activeConversation.type ===
                      "group"
                        ? "••"
                        : getInitials(
                            activeParticipant
                          )}
                    </div>

                    <strong>
                      {activeName}
                    </strong>

                    <span>
                      This is the beginning
                      of your conversation.
                    </span>
                  </div>
                ) : (
                  messages.map(
                    (item) => {
                      const own =
                        item.userId ===
                          currentUser?.id ||
                        item.senderId ===
                          currentUser?.id;

                      const deleted =
                        item.deleted ||
                        item.isDeleted;

                      return (
                        <div
                          key={item.id}
                          className={`message-row ${
                            own
                              ? "own"
                              : "other"
                          }`}
                        >
                          {!own && (
                            <div className="message-avatar">
                              {getInitials(
                                item.sender
                              )}
                            </div>
                          )}

                          <div className="message-stack">

                            {!own &&
                              activeConversation.type ===
                                "group" && (
                                <span className="sender-name">
                                  {item.sender
                                    ?.displayName ||
                                    item.sender
                                      ?.username ||
                                    "User"}
                                </span>
                              )}

                            <div className="message-bubble">
                              {editingMessage?.id ===
                              item.id ? (
                                <div className="edit-box">

                                  <textarea
                                    value={
                                      editingText
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      setEditingText(
                                        event
                                          .target
                                          .value
                                      )
                                    }
                                    autoFocus
                                  />

                                  <div className="edit-actions">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingMessage(
                                          null
                                        );
                                        setEditingText(
                                          ""
                                        );
                                      }}
                                    >
                                      Cancel
                                    </button>

                                    <button
                                      type="button"
                                      className="save-edit"
                                      onClick={
                                        saveEdit
                                      }
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div
                                    className={`message-text ${
                                      deleted
                                        ? "deleted"
                                        : ""
                                    }`}
                                  >
                                    {deleted
                                      ? "This message was deleted."
                                      : item.content}
                                  </div>

                                  <div className="message-meta">
                                    <span>
                                      {formatTime(
                                        item.createdAt
                                      )}
                                    </span>

                                    {item.edited &&
                                      !deleted && (
                                        <span>
                                          edited
                                        </span>
                                      )}

                                    {own &&
                                      item.read && (
                                        <span className="read-mark">
                                          ✓✓
                                        </span>
                                      )}
                                  </div>
                                </>
                              )}
                            </div>

                            {own &&
                              !deleted &&
                              editingMessage?.id !==
                                item.id && (
                                <div className="message-actions">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      beginEdit(
                                        item
                                      )
                                    }
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteMessage(
                                        item
                                      )
                                    }
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    }
                  )
                )}

                <div
                  ref={messagesEndRef}
                />
              </div>

              {/* ===========================================
                  ERROR
              =========================================== */}

              {error && (
                <div className="error-bar">
                  <span>
                    {error}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setError("")
                    }
                  >
                    ×
                  </button>
                </div>
              )}

              {/* ===========================================
                  COMPOSER
              =========================================== */}

              <div className="composer-area">

                <form
                  className="composer"
                  onSubmit={
                    sendMessage
                  }
                >
                  <button
                    type="button"
                    className="composer-button"
                    title="Attachments"
                  >
                    +
                  </button>

                  <textarea
                    ref={
                      textareaRef
                    }
                    value={message}
                    onChange={(
                      event
                    ) => {
                      setMessage(
                        event.target
                          .value
                      );

                      resizeTextarea();
                    }}
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          "Enter" &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();

                        sendMessage(
                          event
                        );
                      }
                    }}
                    placeholder={`Message ${activeName}...`}
                    rows={1}
                    disabled={
                      sending
                    }
                  />

                  <button
                    type="submit"
                    className={`send-button ${
                      message.trim()
                        ? "active"
                        : ""
                    }`}
                    disabled={
                      sending ||
                      !message.trim()
                    }
                    aria-label="Send message"
                  >
                    {sending
                      ? "..."
                      : "↑"}
                  </button>
                </form>

                <div className="composer-hint">
                  <span>
                    Enter to send
                  </span>

                  <span>
                    Shift + Enter for a new line
                  </span>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
