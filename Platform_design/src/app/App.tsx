import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type {
  AuthFormValues,
  AuthRequestContext,
  Conversation,
  MemoryMode,
  MemoryTab,
  Message,
  MessageRole,
  Persona,
  Screen,
} from "../types";
import { memoryConfig } from "../types";
import { api } from "./api";
import MessageBubble from "../components/MessageBubble";
import ConversationItem from "../components/ConversationList";
import WelcomeScreen from "../components/WelcomeScreen";
import MemoryPanel from "../components/MemoryPanel";
import PersonaCard, { NavButton } from "../components/PersonaSelector";
import Toast from "../components/Toast";
import ProfileMenu from "../components/ProfileMenu";
import AuthScreen from "../components/AuthScreen";
import StatsScreen from "../components/StatsScreen";
import GraphScreen from "../components/GraphScreen";
import EntitiesScreen from "../components/EntitiesScreen";
import MemoryComparisonScreen from "../components/MemoryComparisonScreen";
import CreatePersonaCard from "../components/CreatePersonaCard";
import { Send, Search, Plus, SlidersHorizontal, Pin, Archive, Database, Brain, Workflow, FileClock, Activity, UserRound, UserPlus, LogIn, Building, FolderKanban, CalendarDays, Atom, TrendingUp, Clock, MessageCircleMore, ChevronLeft, ChevronRight, Menu, X, Sparkles, PanelRight, Mail, Lock, Eye, EyeOff, ArrowLeft, RefreshCw, Download, Upload, AlertCircle, Loader2, GitCompareArrows } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const DEFAULT_GENERAL_ASSISTANT_PERSONA: Persona = {
  id: "general_assistant",
  name: "General Assistant",
  description: "Helpful all-purpose assistant for everyday tasks",
  domain: "general",
  memory_type: "buffer",
  avatar: "🤖",
  is_builtin: true,
  system_prompt: "You are a helpful, friendly AI assistant. Remember everything the user tells you and use it to provide personalized, contextual responses.",
  temperature: 0.7,
};

const THINKING_PLACEHOLDER = "AI is thinking...";

const sidebarSectionClass = "px-3 py-3";

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("chat");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<MemoryTab>("entities");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(DEFAULT_GENERAL_ASSISTANT_PERSONA);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [personaEditForm, setPersonaEditForm] = useState({
    name: "",
    description: "",
    system_prompt: "",
    memory_type: "buffer" as MemoryMode,
    domain: "general",
    avatar: "🎭",
    temperature: "0.7",
  });
  const [personaEditLoading, setPersonaEditLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [isWideDesktop, setIsWideDesktop] = useState(
    () => window.innerWidth >= 1280);
  const [isMemoryPanelOpen, setIsMemoryPanelOpen] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthMenuOpen, setIsAuthMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [memoryTypeOverride, setMemoryTypeOverride] = useState<MemoryMode | "">("");
  const [authMessage, setAuthMessage] = useState<{ text: string; type: "error" | "success" | "info" } | null>(null);
  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => setToast({ message, type });

  const isAuthenticated = Boolean(session?.user);
  const authContext = useMemo(
    () =>
      session?.access_token && user?.id
        ? { accessToken: session.access_token, userId: user.id }
        : undefined,
    [session?.access_token, user?.id]
  );

  const closeAuthMenu = useCallback(() => {
    setIsAuthMenuOpen(false);
  }, []);

  const openPersonaEditor = useCallback((persona: Persona) => {
    setEditingPersona(persona);
    setPersonaEditForm({
      name: persona.name || "",
      description: persona.description || "",
      system_prompt: persona.system_prompt || "",
      memory_type: persona.memory_type || "buffer",
      domain: persona.domain || "general",
      avatar: persona.avatar || "🎭",
      temperature: String(persona.temperature ?? 0.7),
    });
  }, []);

  const closePersonaEditor = useCallback(() => {
    setEditingPersona(null);
    setPersonaEditLoading(false);
  }, []);

  const handlePersonaEditSave = useCallback(async () => {
    if (!editingPersona) return;

    const nextName = personaEditForm.name.trim();
    const nextSystemPrompt = personaEditForm.system_prompt.trim();

    if (!nextName) {
      showToast("Persona name is required", "error");
      return;
    }

    if (!nextSystemPrompt) {
      showToast("System prompt is required", "error");
      return;
    }

    const temperature = Number(personaEditForm.temperature);
    if (Number.isNaN(temperature) || temperature < 0 || temperature > 2) {
      showToast("Temperature must be between 0 and 2", "error");
      return;
    }

    setPersonaEditLoading(true);

    try {
      const updated = await api.updatePersona(editingPersona.id, {
        name: nextName,
        description: personaEditForm.description.trim(),
        system_prompt: nextSystemPrompt,
        memory_type: personaEditForm.memory_type,
        domain: personaEditForm.domain.trim() || "general",
        avatar: personaEditForm.avatar.trim() || "🎭",
        temperature,
      }, authContext);

      setPersonas((prev) => prev.map((persona) => (persona.id === updated.id ? updated : persona)));
      if (selectedPersona?.id === updated.id) {
        setSelectedPersona(updated);
      }
      showToast("Persona updated successfully", "success");
      closePersonaEditor();
    } catch {
      showToast("Failed to update persona", "error");
      setPersonaEditLoading(false);
    }
  }, [authContext, closePersonaEditor, editingPersona, personaEditForm, selectedPersona?.id]);

  const syncAuthState = useCallback(async () => {
    const [{ data: userData }, { data: sessionData }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);

    const nextSession = sessionData.session;
    const nextUser = userData.user ?? nextSession?.user ?? null;

    setSession(nextSession);
    setUser(nextUser);

    if (nextUser) {
      setCurrentScreen((screen) =>
        screen === "login" || screen === "register" ? "chat" : screen
      );
    }
  }, []);

  // ── Init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;

    void (async () => {
      await syncAuthState();
      if (!active) return;
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setIsAuthMenuOpen(false);

      if (nextSession?.user) {
        setCurrentScreen((screen) =>
          screen === "login" || screen === "register" ? "chat" : screen
        );
      } else {
        setCurrentScreen("chat");
        setSelectedConvId(null);
        setMessages([]);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [syncAuthState]);
  useEffect(() => {
    // Check backend health
    api
      .health(authContext)
      .then(() => setBackendOnline(true))
      .catch(() => setBackendOnline(false));

    // Load personas
    api
      .listPersonas(authContext)
      .then((data) => {
        setPersonas(data);
        let defaultPersona = DEFAULT_GENERAL_ASSISTANT_PERSONA;
        for (const persona of data as Persona[]) {
          if (persona.id === "general_assistant" || persona.name === "General Assistant") {
            defaultPersona = persona;
            break;
          }
        }
        setSelectedPersona(defaultPersona);
      })
      .catch(() => {});
  }, [authContext]);

  useEffect(() => {
    const handler = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setIsWideDesktop(window.innerWidth >= 1280);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    setIsAuthMenuOpen(false);
    setAuthMessage(null);
  }, [currentScreen]);

  useEffect(() => {
    if (!isAuthenticated) {
      setConversations([]);
      setSelectedConvId(null);
      setMessages([]);
    }
  }, [isAuthenticated]);

  // ── Load conversations ────────────────────────────────────────────────
  const loadConversations = useCallback(
    async (search = "") => {
      if (!authContext) {
        setConversations([]);
        return;
      }
      setConversationsLoading(true);
      try {
        const [activeConversations, archivedConversations] = await Promise.all([
          api.listConversations(search, false, authContext),
          api.listConversations(search, true, authContext),
        ]);

        setConversations(
          [...activeConversations, ...archivedConversations].sort((a, b) => {
            if (a.is_archived !== b.is_archived) {
              return a.is_archived ? 1 : -1;
            }
            if (a.is_pinned !== b.is_pinned) {
              return a.is_pinned ? -1 : 1;
            }
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          })
        );
      } catch {
        showToast("Could not load conversations", "error");
      } finally {
        setConversationsLoading(false);
      }
    },
    [authContext]
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    void loadConversations();
  }, [isAuthenticated, loadConversations]);

  // ── Load conversation messages ────────────────────────────────────────
  const loadConversation = useCallback(async (id: number) => {
    try {
      const data = await api.getConversation(id, authContext);
      const msgs: Message[] = (data.messages || []).map((m: any) => ({
        id: String(m.id),
        role: m.role as MessageRole,
        content: m.content,
        timestamp: new Date(m.created_at),
        token_count: m.token_count,
      }));
      setMessages(msgs);
    } catch {
      showToast("Could not load messages", "error");
    }
  }, [authContext]);

  const handleSelectConversation = useCallback(
    (id: number) => {
      setSelectedConvId(id);
      setCurrentScreen("chat");
      setSidebarOpen(false);
      loadConversation(id);
    },
    [loadConversation]
  );

  // ── Create conversation ───────────────────────────────────────────────
  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await api.createConversation({
        title: "New Chat",
        persona_id: selectedPersona?.id || "general_assistant",
        memory_type: memoryTypeOverride || "buffer",
        user_id: user?.id,
      }, authContext);
      setConversations((prev) => [conv, ...prev]);
      setSelectedConvId(conv.id);
      setMessages([]);
      setCurrentScreen("chat");
      setSidebarOpen(false);
      showToast("New conversation created", "success");
    } catch {
      showToast("Please login or register to start a conversation.", "error");
    }
  }, [selectedPersona, memoryTypeOverride, user?.id, authContext]);

  const updateConversationInSidebar = useCallback(
    (convId: number, userMessage: string) => {
      const title =
        userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
      const now = new Date().toISOString();
      const conversation = conversations.find((conv) => conv.id === convId);
      const shouldPersistTitle = conversation?.title === "New Chat";
      const previousTitle = conversation?.title || "New Chat";

      setConversations((prev) =>
        [...prev]
          .map((conv) =>
            conv.id === convId
              ? {
                  ...conv,
                  title: shouldPersistTitle ? title : conv.title,
                  message_count: conv.message_count + 2,
                  updated_at: now,
                }
              : conv
          )
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) {
              return a.is_pinned ? -1 : 1;
            }
            return (
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            );
          })
      );

      if (shouldPersistTitle) {
        void api.updateConversation(
          convId,
          { title },
          authContext
        ).catch(() => {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === convId ? { ...conv, title: previousTitle } : conv
            )
          );
          showToast("Failed to save conversation title", "error");
        });
      }
    },
    [conversations, authContext]
  );

  // ── Send message ──────────────────────────────────────────────────────
  const handleSendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || !selectedConvId || isTyping) return;

    const assistantMsgId = `assistant-${Date.now() + 1}`;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    const assistantPlaceholder: Message = {
      id: assistantMsgId,
      role: "assistant",
      content: THINKING_PLACEHOLDER,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setInputValue("");
    setIsTyping(true);

    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
    }
    const controller = new AbortController();
    streamAbortRef.current = controller;

    let streamErrored = false;
    let firstChunkArrived = false;

    try {
      await api.sendMessageStream(
        selectedConvId,
        text,
        {
          accessToken: session?.access_token,
          userId: session?.user?.id,
        },
        {
          onThinking: () => {
            setIsTyping(true);
          },
          onChunk: (chunk) => {
            if (!chunk) return;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: firstChunkArrived || msg.content !== THINKING_PLACEHOLDER
                        ? `${msg.content}${chunk}`
                        : chunk,
                    }
                  : msg
              )
            );
            firstChunkArrived = true;
          },
          onDone: (payload) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      // Keep progressively streamed content. Only fallback to payload response if needed.
                      content:
                        !msg.content || msg.content === THINKING_PLACEHOLDER
                          ? (payload?.response || "")
                          : msg.content,
                      timestamp: new Date(),
                    }
                  : msg
              )
            );
            setMemoryRefreshKey((v) => v + 1);
              updateConversationInSidebar(selectedConvId, text);
          },
          onError: (message) => {
            streamErrored = true;
            showToast(message || "Streaming failed", "error");
          },
        },
        controller.signal
      );
    } catch (err) {
      if ((err as any)?.name !== "AbortError") {
        streamErrored = true;
        console.error("Failed:", err);
        showToast("Network error while streaming response", "error");
      }
    } finally {
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }

      if (streamErrored) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantMsgId) return msg;
            if (msg.content.trim() && msg.content !== THINKING_PLACEHOLDER) return msg;
            return {
              ...msg,
              content: "Response interrupted. Please retry.",
            };
          })
        );
      }
      setIsTyping(false);
    }
  }, [inputValue, selectedConvId, isTyping, session, updateConversationInSidebar]);

  // ── Pin conversation ──────────────────────────────────────────────────
  const handlePinConversation = useCallback(
    async (id: number) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;
      try {
        await api.updateConversation(id, { is_pinned: !conv.is_pinned }, authContext);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, is_pinned: !c.is_pinned } : c
          )
        );
        showToast(conv.is_pinned ? "Unpinned" : "Pinned", "success");
      } catch {
        showToast("Failed to update", "error");
      }
    },
    [conversations, authContext]
  );

  const handleArchiveConversation = useCallback(
    async (id: number) => {
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return;

      const wasSelected = selectedConvId === id;
      const previousSelectedConvId = selectedConvId;
      const previousMessages = messages;

      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_archived: !c.is_archived } : c
        )
      );

      if (wasSelected) {
        setSelectedConvId(null);
        setMessages([]);
      }

      try {
        await api.updateConversation(
          id,
          { is_archived: !conv.is_archived },
          authContext
        );
        showToast(
          conv.is_archived ? "Conversation unarchived" : "Conversation archived",
          "success"
        );
      } catch {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, is_archived: !c.is_archived } : c
          )
        );
        if (wasSelected) {
          setSelectedConvId(previousSelectedConvId);
          setMessages(previousMessages);
        }
        showToast("Failed to archive", "error");
      }
    },
    [conversations, selectedConvId, messages, authContext]
  );

  const handleRenameConversation = useCallback(
    async (id: number, newTitle: string) => {
      const conversation = conversations.find((c) => c.id === id);
      if (!conversation) return;

      const previousTitle = conversation.title;
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );

      try {
        await api.updateConversation(id, { title: newTitle }, authContext)
        showToast("Conversation renamed", "success");
      } catch {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: previousTitle } : c))
        );
        showToast("Failed to rename", "error");
      }
    },
    [conversations, authContext]
  )

  // ── Delete conversation ───────────────────────────────────────────────
  const handleDeleteConversation = useCallback(
    async (id: number) => {
      const wasSelected = selectedConvId === id;
      try {
        await api.deleteConversation(id, authContext);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (wasSelected) {
          setSelectedConvId(null);
          setMessages([]);
          setCurrentScreen("chat");
        }
        showToast("Conversation deleted", "success");
      } catch {
        showToast("Failed to delete", "error");
      }
    },
    [selectedConvId, authContext]
  );

  // ── Search conversations ──────────────────────────────────────────────
  const handleSearch = useCallback(
    (q: string) => {
      setSearchQuery(q);
      loadConversations(q);
    },
    [loadConversations]
  );

  // ── Export conversation ───────────────────────────────────────────────
  const handleExport = useCallback(
    async (format: "json" | "markdown") => {
      if (!selectedConvId) return;
      try {
        const data = await api.exportConversation(selectedConvId, format, authContext);
        const content =
          format === "json"
            ? JSON.stringify(data, null, 2)
            : data.markdown || "";
        const blob = new Blob([content], {
          type: format === "json" ? "application/json" : "text/markdown",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversation-${selectedConvId}.${
          format === "json" ? "json" : "md"
        }`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported as ${format.toUpperCase()}`, "success");
      } catch {
        showToast("Export failed", "error");
      }
    },
    [selectedConvId, authContext]
  );

  const handleImportClick = useCallback(() => {
    setIsImportMenuOpen(false);
    importInputRef.current?.click();
  }, []);

  const handleImportFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) return;

      setIsImporting(true);
      setImportProgress(10);

      try {
        const text = await file.text();
        setImportProgress(35);

        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error("Selected file is not valid JSON.");
        }

        setImportProgress(70);
        await api.importConversation(parsed, authContext);
        setImportProgress(100);
        await loadConversations(searchQuery);
        showToast("Conversation imported successfully", "success");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Import failed";
        showToast(message, "error");
      } finally {
        setTimeout(() => setImportProgress(null), 700);
        setIsImporting(false);
      }
    },
    [authContext, loadConversations, searchQuery]
  );

  // ── Change memory type ─────────────────────────────────────────────────
  const handleChangeMemoryType = useCallback(
    async (memType: MemoryMode) => {
      if (!selectedConvId) {
        setMemoryTypeOverride(memType);
        return;
      }
      try {
        await api.updateConversation(selectedConvId, { memory_type: memType }, authContext);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvId ? { ...c, memory_type: memType } : c
          )
        );
        showToast(`Memory switched to ${memType}`, "success");
      } catch {
        showToast("Failed to update memory type", "error");
      }
    },
    [selectedConvId, authContext]
  );

  // ── Delete persona ─────────────────────────────────────────────────────
  const handleDeletePersona = useCallback(async (id: string) => {
    try {
      await api.deletePersona(id, authContext);
      setPersonas((prev) => prev.filter((p) => p.id !== id));
      showToast("Persona deleted", "success");
    } catch {
      showToast("Cannot delete builtin persona", "error");
    }
  }, [authContext]);

  const handleAuthSubmit = useCallback(
    async (form: AuthFormValues) => {
      setAuthMessage(null);
      const isRegister = currentScreen === "register";

      const trimmedFullName = form.fullName.trim();
      const trimmedEmail = form.email.trim();
      const trimmedPassword = form.password.trim();

      const showAuthError = (text: string) => {
        setAuthMessage({ text, type: "error" });
      };

      const mapSupabaseAuthError = (message: string) => {
        const normalizedMessage = message.toLowerCase();

        if (normalizedMessage.includes("invalid login credentials")) {
          return "Incorrect email or password. Please try again.";
        }

        if (normalizedMessage.includes("email not confirmed")) {
          return "Please verify your email before logging in.";
        }

        if (normalizedMessage.includes("user already registered")) {
          return "An account with this email already exists. Please login.";
        }

        return message;
      };

      try {
        if (isRegister) {
          if (!trimmedFullName && !trimmedEmail && !trimmedPassword) {
            showAuthError("Please fill in all fields");
            return;
          }

          const trimmedName = form.fullName.trim();

          if (trimmedName.length < 2) {
            showAuthError("Please enter your full name");
            return;
          }

          if (!/^[a-zA-Z]+(\s[a-zA-Z]+)*$/.test(trimmedName)) {
            showAuthError("Name can only contain letters. Multiple spaces are not allowed.");
            return;
          }

          if (!trimmedEmail) {
            showAuthError("Email address is required");
            return;
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            showAuthError("Please enter a valid email (e.g. name@example.com)");
            return;
          }

          if (!trimmedPassword) {
            showAuthError("Password is required");
            return;
          }

          if (form.password.length < 8) {
            showAuthError("Password must be at least 8 characters");
            return;
          }

          if (!/[A-Z]/.test(form.password)) {
            showAuthError("Password must contain at least one uppercase letter");
            return;
          }

          if (!/\d/.test(form.password)) {
            showAuthError("Password must contain at least one number");
            return;
          }

          if (!/[!@#$%^&*]/.test(form.password)) {
            showAuthError("Password must contain at least one special character (!@#$%^&*)");
            return;
          }

          if (!form.confirmPassword) {
            showAuthError("Please confirm your password");
            return;
          }

          if (form.password !== form.confirmPassword) {
            showAuthError("Passwords do not match");
            return;
          }

          const { data, error } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
              data: {
                full_name: form.fullName,
              },
            },
          });

          if (error) {
            setAuthMessage({ text: mapSupabaseAuthError(error.message), type: "error" });
            return;
          }

          setSession(data.session ?? null);
          setUser(data.user ?? data.session?.user ?? null);
          setAuthMessage({ text: "Account created! Please check your email to verify.", type: "success" });
        } else {
          if (!trimmedEmail) {
            showAuthError("Email address is required");
            return;
          }

          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            showAuthError("Please enter a valid email");
            return;
          }

          if (!form.password) {
            showAuthError("Password is required");
            return;
          }

          if (!form.password.trim()) {
            showAuthError("Password cannot be empty");
            return;
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
          });

          if (error) {
            setAuthMessage({ text: mapSupabaseAuthError(error.message), type: "error" });
            return;
          }

          setSession(data.session ?? null);
          setUser(data.user ?? data.session?.user ?? null);
          setAuthMessage({ text: "Welcome back!", type: "success" });
        }

        setIsAuthMenuOpen(false);
        setCurrentScreen("chat");
        showToast(isRegister ? "Registration successful" : "Login successful", "success");
      } catch {
        showToast("Authentication failed", "error");
      }
    },
    [currentScreen]
  );

  const handleLogout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        showToast(error.message, "error");
        return;
      }

      setSession(null);
      setUser(null);
      setSelectedConvId(null);
      setMessages([]);
      setIsAuthMenuOpen(false);
      setCurrentScreen("chat");
      showToast("Logged out", "info");
    } catch {
      showToast("Logout failed", "error");
    }
  }, []);

  const currentConversation = conversations.find((c) => c.id === selectedConvId);
  const pinnedConversations = conversations.filter((c) => c.is_pinned && !c.is_archived);
  const recentConversations = conversations.filter((c) => !c.is_pinned && !c.is_archived);
  const archivedConversations = conversations.filter((c) => c.is_archived);
  const [sidebarView, setSidebarView] = useState<"recent" | "archived">("recent");
  const showSidebar = isDesktop ? !sidebarCollapsed : sidebarOpen;
  const authMode =
    currentScreen === "login" || currentScreen === "register"
      ? currentScreen
      : null;

  // Auth screen
  if (authMode) {
    return (
      <div className="flex h-[100dvh] w-full bg-[#FBF7F6] overflow-hidden font-[Inter,sans-serif] text-[#24161A]">
        <div className="flex flex-1 min-w-0 flex-col">
          <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-5 shrink-0 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#7A1F2B] to-[#C8A96A] flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-[#101827]">
                  ConversiQ
                </div>
                <div className="text-[11px] text-[#6B7280]">Secure auth</div>
              </div>
            </div>
          </header>
          <AuthScreen
            mode={authMode}
            onBack={() => setCurrentScreen("chat")}
            onSwitchMode={(mode) => setCurrentScreen(mode)}
            onSubmit={handleAuthSubmit}
            authMessage={authMessage}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-[#FBF7F6] overflow-hidden font-[Inter,sans-serif] text-[#24161A]">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Backend offline warning */}
      {backendOnline === false && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-[#7A1F2B] text-white text-[12px] py-2 text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" />
          Backend offline — start Flask server on port 5000
        </div>
      )}

      {/* Mobile overlay */}
      <AnimatePresence>
        {!isDesktop && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── LEFT SIDEBAR ── */}
      <motion.aside
        initial={false}
        animate={
          isDesktop
            ? { width: sidebarCollapsed ? 64 : 260, x: 0 }
            : { width: sidebarOpen ? 260 : 0, x: 0 }
        }
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className={`${
          isDesktop ? "relative" : "fixed z-50 h-full"
        } bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 overflow-hidden`}
      >
        {/* Logo */}
        <div className="px-3 py-3 border-b border-[#F3F4F6] flex items-center gap-2.5 shrink-0 min-h-[64px]">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7A1F2B] to-[#C8A96A] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span
              style={{
                fontFamily: "'Dancing Script', cursive",
                fontSize: "30px",
                fontWeight: "700",
                background: "linear-gradient(135deg, #7A1F2B, #B76E4E)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.3px",
              }}
            >
              ConversiQ
            </span>
          )}
          {!isDesktop && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="ml-auto p-1 hover:bg-[#F7E9EB] rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>
          )}
        </div>

        {/* New chat + Search */}
        <div
          className={`px-3 py-3 border-b border-[#F3F4F6] shrink-0 ${
            sidebarCollapsed ? "flex justify-center" : ""
          }`}
        >
          {sidebarCollapsed ? (
            <button
              onClick={() => {
                handleNewConversation();
                setSidebarCollapsed(false);
              }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7A1F2B] to-[#C8A96A] flex items-center justify-center hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          ) : (
            <>
              <button
                onClick={handleNewConversation}
                className="w-full py-3 px-3.5 text-white text-[13px] font-semibold rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #7A1F2B 0%, #C8A96A 100%)",
                }}
              >
                <Plus className="w-4 h-4" />
                New Conversation
              </button>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full rounded-2xl border border-[#EAD9DC] bg-[#FBF7F6] py-2.5 pl-9 pr-3 text-[12px] text-[#24161A] placeholder-[#98A2B3] focus:border-[#D8B7BC] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/15"
                />
              </div>
            </>
          )}
        </div>

        {/* Conversation list */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {conversationsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 text-[#7A1F2B] animate-spin" />
              </div>
            ) : (
              <>
                {pinnedConversations.length > 0 && (
                  <div className={sidebarSectionClass}>
                    <div className="mb-2 flex items-center gap-1.5 px-1.5">
                      <Pin className="w-3 h-3 text-[#9CA3AF]" />
                      <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">
                        Pinned
                      </span>
                    </div>
                    <div className="space-y-2">
                      {pinnedConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isSelected={selectedConvId === conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          onPin={() => handlePinConversation(conv.id)}
                          onArchive={() => handleArchiveConversation(conv.id)}
                          onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                          onDelete={() => handleDeleteConversation(conv.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div className={sidebarSectionClass}>
                  <div className="mb-2 flex items-center gap-1 px-1.5">
                    <button
                      onClick={() => setSidebarView("recent")}
                      className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition-colors ${
                        sidebarView === "recent"
                          ? "bg-[#F7E9EB] text-[#7A1F2B]"
                          : "text-[#9CA3AF] hover:text-[#6B7280]"
                      }`}
                    >
                      Recent
                    </button>
                    <button
                      onClick={() => setSidebarView("archived")}
                      className={`flex-1 py-1 text-[10px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                        sidebarView === "archived"
                          ? "bg-[#FFF3E8] text-[#F59E0B]"
                          : "text-[#9CA3AF] hover:text-[#6B7280]"
                      }`}
                    >
                      <Archive className="w-3 h-3" />
                      Archived
                      {archivedConversations.length > 0 && (
                        <span className="bg-[#F59E0B] text-white rounded-full px-1.5 text-[9px] ml-0.5">
                          {archivedConversations.length}
                        </span>
                      )}
                    </button>
                  </div>
                  {sidebarView === "recent" && (
                    <div className="space-y-2">
                      {pinnedConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isSelected={selectedConvId === conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          onPin={() => handlePinConversation(conv.id)}
                          onArchive={() => handleArchiveConversation(conv.id)}
                          onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                          onDelete={() => handleDeleteConversation(conv.id)}
                        />
                      ))}
                      {recentConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isSelected={selectedConvId === conv.id}
                          onClick={() => handleSelectConversation(conv.id)}
                          onPin={() => handlePinConversation(conv.id)}
                          onArchive={() => handleArchiveConversation(conv.id)}
                          onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                          onDelete={() => handleDeleteConversation(conv.id)}
                        />
                      ))}
                    </div>
                  )}
                  {sidebarView === "archived" && (
                    <div className="space-y-2">
                      {archivedConversations.length === 0 ? (
                        <div className="text-[12px] text-[#9CA3AF] text-center py-6">
                          No archived conversations
                        </div>
                      ) : (
                        archivedConversations.map((conv) => (
                          <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isSelected={selectedConvId === conv.id}
                            onClick={() => handleSelectConversation(conv.id)}
                            onPin={() => handlePinConversation(conv.id)}
                            onArchive={() => handleArchiveConversation(conv.id)}
                            onRename={(newTitle) => handleRenameConversation(conv.id, newTitle)}
                            onDelete={() => handleDeleteConversation(conv.id)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Bottom nav */}
        <div
          className={`border-t border-[#F3F4F6] p-2 shrink-0 ${
            sidebarCollapsed
              ? "flex flex-col gap-1 items-center"
              : "grid grid-cols-5 gap-1"
          }`}
        >
          {(
            [
              { id: "chat" as Screen, icon: MessageCircleMore, tip: "Chat" },
              { id: "graph" as Screen, icon: Workflow, tip: "Graph" },
              { id: "entities" as Screen, icon: Brain, tip: "Entities" },
              { id: "comparison" as Screen, icon: GitCompareArrows, tip: "Compare" },
              { id: "personas" as Screen, icon: UserRound, tip: "Personas" },
              { id: "stats" as Screen, icon: TrendingUp, tip: "Stats" },
            ] as const
          ).map(({ id, icon: Icon, tip }) => (
            <NavButton
              key={id}
              icon={Icon}
              active={currentScreen === id}
              onClick={() => setCurrentScreen(id)}
              tooltip={tip}
            />
          ))}
        </div>
      </motion.aside>

      {/* Collapse toggle */}
      {isDesktop && (
        <div className="relative">
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 flex h-12 w-6 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-sm transition-colors hover:bg-[#F8F9FF]"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3 h-3 text-[#6B7280]" />
            ) : (
              <ChevronLeft className="w-3 h-3 text-[#6B7280]" />
            )}
          </button>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 sm:px-5 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {!isDesktop && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 hover:bg-[#F8F9FF] rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-[#8A94A6]" />
              </button>
            )}

            {currentScreen === "chat" &&
              selectedConvId &&
              currentConversation && (
                <>
                  {selectedPersona && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F8F9FF] rounded-full border border-[#E5E7EB] shrink-0">
                      <span className="text-lg">{selectedPersona.avatar}</span>
                      <span className="text-[13px] font-medium text-[#162033] hidden sm:inline">
                        {selectedPersona.name}
                      </span>
                    </div>
                  )}
                  {/* Memory type selector */}
                  <select
                    value={currentConversation.memory_type}
                    onChange={(e) =>
                      handleChangeMemoryType(e.target.value as MemoryMode)
                    }
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full border-0 focus:outline-none cursor-pointer"
                    style={{
                      color:
                        memoryConfig[currentConversation.memory_type]?.color ||
                        "#6C63FF",
                      backgroundColor:
                        memoryConfig[currentConversation.memory_type]?.bg ||
                        "#F0EFFF",
                    }}
                  >
                    <option value="buffer">Buffer Memory</option>
                    <option value="summary">Summary Memory</option>
                    <option value="entity">Entity Memory</option>
                    <option value="kg">KG Memory</option>
                    <option value="sequential">Sequential Chain</option>
                  </select>
                </>
              )}
          </div>

          <div className="flex items-center gap-1">
            {/* Export button */}
            {selectedConvId && (
              <div className="relative group">
                <button
                  className="p-2.5 hover:bg-[#F8F9FF] rounded-xl transition-colors"
                  title="Export"
                >
                  <Download className="w-4.5 h-4.5 text-[#8A94A6]" />
                </button>
                <div className="absolute right-0 top-10 z-50 hidden group-hover:block bg-white border border-[#E5E7EB] rounded-xl shadow-lg overflow-hidden">
                  <button
                    onClick={() => handleExport("json")}
                    className="block w-full text-left px-4 py-2.5 text-[12px] hover:bg-[#F8F9FF]"
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => handleExport("markdown")}
                    className="block w-full text-left px-4 py-2.5 text-[12px] hover:bg-[#F8F9FF]"
                  >
                    Export as Markdown
                  </button>
                </div>
              </div>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsImportMenuOpen((v) => !v)}
                className={`p-2.5 rounded-xl transition-colors ${
                  isImportMenuOpen
                    ? "bg-[#F0EFFF] text-[#6C63FF]"
                    : "hover:bg-[#F8F9FF]"
                }`}
                title="Settings"
              >
                <SlidersHorizontal className="w-4.5 h-4.5 text-[#8A94A6]" />
              </button>

              {isImportMenuOpen && (
                <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-[#E5E7EB] bg-white shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#F3F4F6]">
                    <div className="text-[12px] font-semibold text-[#162033]">
                      Conversation tools
                    </div>
                    <div className="text-[11px] text-[#8A94A6] mt-0.5">
                      Import JSON exports from the backend
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleImportClick}
                    disabled={isImporting}
                    className="w-full text-left px-4 py-3 text-[12px] hover:bg-[#F8F9FF] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? "Importing..." : "Import conversation"}
                  </button>
                  <div className="px-4 pb-4">
                    <div className="h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#7A1F2B] transition-all duration-300"
                        style={{ width: `${importProgress ?? 0}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[10px] text-[#9CA3AF]">
                      {importProgress === null
                        ? "Ready to import"
                        : `${importProgress}% complete`}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsMemoryPanelOpen((v) => !v)}
              className={`p-2.5 rounded-xl transition-colors ${
                isMemoryPanelOpen
                  ? "bg-[#F0EFFF] text-[#6C63FF]"
                  : "hover:bg-[#F8F9FF] text-[#8A94A6]"
              }`}
              title="Toggle memory panel"
            >
              <PanelRight className="w-4.5 h-4.5" />
            </button>
            <ProfileMenu
              user={user}
              isOpen={isAuthMenuOpen}
              onToggle={() => setIsAuthMenuOpen((v) => !v)}
              onLogin={() => {
                setAuthMessage(null);
                setCurrentScreen("login");
                setIsAuthMenuOpen(false);
              }}
              onRegister={() => {
                setAuthMessage(null);
                setCurrentScreen("register");
                setIsAuthMenuOpen(false);
              }}
              onLogout={handleLogout}
              onClose={closeAuthMenu}
            />
          </div>
        </header>

        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFileChange}
        />

        {/* Screen content */}
        <div className="flex-1 overflow-hidden">
          {/* ── CHAT SCREEN ── */}
          {currentScreen === "chat" && (
            <div className="h-full flex bg-[#FBF7F6] pb-14 md:pb-0">
              <div className="flex-1 flex flex-col min-w-0">
                {!selectedConvId ? (
                  <WelcomeScreen onNewConversation={handleNewConversation} />
                ) : (
                  <>
                    {/* Messages */}
                    <div
                      className="flex-1 overflow-y-auto px-6 py-6"
                      style={{
                        backgroundColor: "#FBF7F6",
                        backgroundImage:
                          "radial-gradient(circle, #7A1F2B15 1px, transparent 1px)",
                        backgroundSize: "24px 24px",
                      }}
                    >
                      <div className="max-w-2xl mx-auto space-y-5 px-0 sm:px-2 lg:px-0">
                        {messages.length === 0 && (
                          <div className="text-center py-12 text-[#9CA3AF]">
                            <div className="text-4xl mb-3">💬</div>
                            <div className="text-[14px]">
                              Start the conversation...
                            </div>
                          </div>
                        )}
                        <AnimatePresence initial={false}>
                          {messages.map((msg, i) => (
                            <MessageBubble key={msg.id} message={msg} index={i} />
                          ))}
                        </AnimatePresence>
                        <div ref={messagesEndRef} />
                      </div>
                    </div>

                    {/* Input */}
                    <div className="border-t border-[#E5E7EB] bg-white px-4 py-4 sm:px-6 shrink-0">
                      <div className="max-w-2xl mx-auto">
                        <div className="flex items-end gap-3 bg-white border border-[#E5E7EB] rounded-[28px] px-2 py-1 focus-within:ring-2 focus-within:ring-[#7A1F2B]/20 focus-within:border-[#D8B7BC]/40 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                          <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => {
                              setInputValue(e.target.value);
                              e.target.style.height = "auto";
                              e.target.style.height =
                                Math.min(e.target.scrollHeight, 120) + "px";
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Type your message..."
                            rows={1}
                            disabled={isTyping}
                            className="flex-1 bg-transparent text-[14px] text-[#101827] placeholder-[#98A2B3] resize-none focus:outline-none leading-[3] max-h-[140px] overflow-y-auto disabled:opacity-60"
                          />
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isTyping}
                            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                            style={{
                              background:
                                "linear-gradient(135deg, #7A1F2B 0%, #C8A96A 100%)",
                            }}
                          >
                            {isTyping ? (
                              <Loader2 className="w-4 h-4 text-white animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 text-white" />
                            )}
                          </motion.button>
                        </div>
                        <p className="text-[11px] text-[#9CA3AF] mt-2 text-center">
                          Press{" "}
                          <kbd className="font-mono bg-[#F3F4F6] px-1 rounded text-[10px]">
                            Enter
                          </kbd>{" "}
                          to send ·{" "}
                          <kbd className="font-mono bg-[#F3F4F6] px-1 rounded text-[10px]">
                            Shift+Enter
                          </kbd>{" "}
                          for new line
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Memory panel (right) */}
              <div
                className={`${
                  isWideDesktop ? "block" : "hidden"
                } w-[300px] shrink-0 transition-all duration-300 ${
                  isMemoryPanelOpen
                    ? "opacity-100"
                    : "w-0 opacity-0 pointer-events-none overflow-hidden"
                }`}
              >
                <MemoryPanel
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  conversationId={selectedConvId}
                  refreshKey={memoryRefreshKey}
                  authContext={authContext}
                />
              </div>
            </div>
          )}

          {/* ── GRAPH SCREEN ── */}
          {currentScreen === "graph" && (
            <GraphScreen conversationId={selectedConvId} authContext={authContext} />
          )}

          {/* ── ENTITIES SCREEN ── */}
          {currentScreen === "entities" && (
            <EntitiesScreen conversationId={selectedConvId} authContext={authContext} />
          )}

          {/* ── MEMORY COMPARISON SCREEN ── */}
          {currentScreen === "comparison" && (
            <MemoryComparisonScreen
              conversations={conversations}
              personas={personas}
              authContext={authContext}
            />
          )}

          {/* ── PERSONAS SCREEN ── */}
          {currentScreen === "personas" && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-5">
                <div>
                  <h2 className="text-[19px] font-bold text-[#1A1A2E]">
                    AI Personas
                  </h2>
                  <p className="text-[13px] text-[#6B7280] mt-0.5">
                    Choose the personality and memory mode for your conversations
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {personas.map((persona, i) => (
                    <motion.div
                      key={persona.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <PersonaCard
                        persona={persona}
                        isActive={selectedPersona?.id === persona.id}
                        onSelect={() => setSelectedPersona(persona)}
                        onEdit={
                          !persona.is_builtin
                            ? () => openPersonaEditor(persona)
                            : undefined
                        }
                        onDelete={
                          !persona.is_builtin
                            ? () => handleDeletePersona(persona.id)
                            : undefined
                        }
                      />
                    </motion.div>
                  ))}
                  {/* Create custom */}
                  <CreatePersonaCard
                    authContext={authContext}
                    onCreated={(persona) => {
                      setPersonas((prev) => [...prev, persona]);
                      showToast("Persona created!", "success");
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STATS SCREEN ── */}
          {currentScreen === "stats" && <StatsScreen authContext={authContext} />}
        </div>

        {editingPersona && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="w-full max-w-2xl rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#F3F4F6] px-5 py-4">
                <div>
                  <div className="text-[14px] font-semibold text-[#1A1A2E]">
                    Edit Persona
                  </div>
                  <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                    Pre-filled from {editingPersona.name}
                  </div>
                </div>
                <button
                  onClick={closePersonaEditor}
                  className="p-1.5 rounded-lg hover:bg-[#F8F9FF] transition-colors"
                >
                  <X className="w-4 h-4 text-[#6B7280]" />
                </button>
              </div>

              <div className="grid gap-3 p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                      Name *
                    </label>
                    <input
                      value={personaEditForm.name}
                      onChange={(e) => setPersonaEditForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
                      placeholder="Persona name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                      Avatar
                    </label>
                    <input
                      value={personaEditForm.avatar}
                      onChange={(e) => setPersonaEditForm((f) => ({ ...f, avatar: e.target.value }))}
                      className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
                      placeholder="🎭"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                    Description
                  </label>
                  <input
                    value={personaEditForm.description}
                    onChange={(e) => setPersonaEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
                    placeholder="Short description"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                    System prompt *
                  </label>
                  <textarea
                    rows={4}
                    value={personaEditForm.system_prompt}
                    onChange={(e) => setPersonaEditForm((f) => ({ ...f, system_prompt: e.target.value }))}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20 resize-none"
                    placeholder="System prompt"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                      Memory type
                    </label>
                    <select
                      value={personaEditForm.memory_type}
                      onChange={(e) => setPersonaEditForm((f) => ({ ...f, memory_type: e.target.value as MemoryMode }))}
                      className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
                    >
                      <option value="buffer">Buffer</option>
                      <option value="summary">Summary</option>
                      <option value="entity">Entity</option>
                      <option value="kg">Knowledge Graph</option>
                      <option value="sequential">Sequential</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                      Domain
                    </label>
                    <input
                      value={personaEditForm.domain}
                      onChange={(e) => setPersonaEditForm((f) => ({ ...f, domain: e.target.value }))}
                      className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
                      placeholder="general"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-[#8A94A6] mb-2">
                      Temperature
                    </label>
                    <input
                      value={personaEditForm.temperature}
                      onChange={(e) => setPersonaEditForm((f) => ({ ...f, temperature: e.target.value }))}
                      className="w-full rounded-xl border border-[#E5E7EB] bg-[#FBFBFD] px-3 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#7A1F2B]/20"
                      placeholder="0.7"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-[#9CA3AF]">
                    Name and system prompt are required. Temperature must be between 0 and 2.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={closePersonaEditor}
                      className="rounded-xl border border-[#E5E7EB] px-4 py-2.5 text-[13px] font-medium text-[#374151] hover:bg-[#FBFBFD]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handlePersonaEditSave}
                      disabled={personaEditLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#7A1F2B] px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                    >
                      {personaEditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4 opacity-0" />}
                      Save changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile memory panel sheet */}
      <AnimatePresence>
        {!isDesktop && isMemoryPanelOpen && currentScreen === "chat" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setIsMemoryPanelOpen(false)}
            />
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed bottom-0 left-0 right-0 h-[72vh] bg-white rounded-t-2xl border-t border-[#E5E7EB] z-50"
            >
              <div className="w-10 h-1 bg-[#D1D5DB] rounded-full mx-auto mt-2 mb-1" />
              <MemoryPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                conversationId={selectedConvId}
                refreshKey={memoryRefreshKey}
                authContext={authContext}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      {!isDesktop && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] grid grid-cols-5 px-2 py-1">
          {(
            [
              { id: "chat" as Screen, icon: MessageCircleMore, tip: "Chat" },
              { id: "graph" as Screen, icon: Workflow, tip: "Graph" },
              {
                id: "entities" as Screen,
                icon: Brain,
                tip: "Entities",
              },
              {
                id: "personas" as Screen,
                icon: UserRound,
                tip: "Personas",
              },
              { id: "stats" as Screen, icon: TrendingUp, tip: "Stats" },
            ] as const
          ).map(({ id, icon: Icon, tip }) => (
            <NavButton
              key={id}
              icon={Icon}
              active={currentScreen === id}
              onClick={() => setCurrentScreen(id)}
              tooltip={tip}
            />
          ))}
        </div>
      )}

      <style>{`
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }

        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.55; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        .slide-up-fade { animation: slideUpFade 300ms ease-out both; }
        .typing-dot { animation: typingBounce 900ms infinite ease-in-out; }
        .typing-dot:nth-child(1) { animation-delay: 0ms; }
        .typing-dot:nth-child(2) { animation-delay: 150ms; }
        .typing-dot:nth-child(3) { animation-delay: 300ms; }
      `}</style>
    </div>
  );
}
