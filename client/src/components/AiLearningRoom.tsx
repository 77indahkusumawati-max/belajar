import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bot,
  Check,
  Clipboard,
  History,
  Menu,
  MessageCirclePlus,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Send,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type MessageRole = "user" | "assistant";
type ChatMessage = { id: string; role: MessageRole; content: string; createdAt: string };
type ChatSession = { id: string; title: string; messages: ChatMessage[]; updatedAt: string };

type AiLearningRoomProps = {
  subject: string;
  level?: string;
  userName: string;
};

const STORAGE_KEY = "belajar_ai_conversations";
const OLD_HISTORY_KEY = "belajar_ai_history";
const welcomeMessage = (userName: string) => `Halo ${userName}! Aku teman belajar AI-mu. Kamu boleh menanyakan apa saja—pelajaran, pekerjaan rumah, ide, bahasa, teknologi, atau topik sehari-hari. Aku akan membantu menjelaskannya dengan cara yang mudah dipahami.`;

const quickPrompts = [
  { label: "Jelaskan dengan sederhana", prompt: "Jelaskan konsep yang sedang kupelajari dengan bahasa sederhana dan contoh sehari-hari." },
  { label: "Bantu pecahkan soal", prompt: "Bantu aku memecahkan soal ini langkah demi langkah. Tunjukkan alasan di setiap langkah." },
  { label: "Buatkan rangkuman", prompt: "Buatkan rangkuman singkat dengan poin-poin penting, istilah kunci, dan satu contoh." },
  { label: "Uji pemahamanku", prompt: "Buatkan 5 pertanyaan kuis tentang topik ini, satu per satu, lalu beri tahu apakah jawabanku benar." },
];

const createMessage = (role: MessageRole, content: string): ChatMessage => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

const createSession = (userName: string): ChatSession => {
  const now = new Date().toISOString();
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: "Percakapan baru",
    messages: [createMessage("assistant", welcomeMessage(userName))],
    updatedAt: now,
  };
};

function loadSessions(userName: string): ChatSession[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as ChatSession[] | null;
    if (stored?.length) return stored;
    const oldHistory = JSON.parse(localStorage.getItem(OLD_HISTORY_KEY) || "[]") as Array<{ prompt?: string; answer?: string; createdAt?: string }>;
    if (oldHistory.length) {
      const migrated = createSession(userName);
      migrated.title = oldHistory[0]?.prompt?.slice(0, 42) || "Percakapan sebelumnya";
      migrated.messages = oldHistory.reverse().flatMap((item) => [
        createMessage("user", item.prompt || "Pertanyaan sebelumnya"),
        createMessage("assistant", item.answer || "Jawaban sebelumnya"),
      ]);
      return [migrated];
    }
  } catch {
    // Ignore malformed local data and start with a clean conversation.
  }
  return [createSession(userName)];
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function fallbackAnswer(question: string, subject: string, level?: string) {
  const lower = question.toLowerCase();
  if (lower.includes("spldv") || lower.includes("persamaan linear")) {
    return "SPLDV adalah sistem yang terdiri dari dua persamaan linear dengan dua variabel. Cara yang umum digunakan adalah substitusi dan eliminasi. Kalau kamu punya soalnya, kirimkan angkanya—kita kerjakan bersama dari langkah pertama.";
  }
  if (lower.includes("rangkuman") || lower.includes("ringkas")) {
    return `Aku siap membuat rangkuman tentang “${question.replace(/buatkan|rangkuman|ringkasan/gi, "").trim() || subject}”. Supaya hasilnya tepat, kirimkan teks, foto soal, atau sebutkan topik dan jenjangnya${level ? ` (${level})` : ""}.`;
  }
  if (lower.includes("kuis") || lower.includes("soal")) {
    return "Bisa. Aku dapat membuat kuis pilihan ganda, isian singkat, atau latihan bertahap. Sebutkan topik, tingkat kesulitan, dan jumlah soal yang kamu inginkan.";
  }
  return `Aku menerima pertanyaanmu tentang “${question}”. Koneksi AI lengkap belum tersedia di perangkat ini, tetapi ruang belajar ini sudah siap menjawab pertanyaan umum saat layanan AI aktif. Untuk sementara, tambahkan konteks, contoh, atau materi yang ingin dibahas agar aku dapat membantu dengan lebih terarah.`;
}

export default function AiLearningRoom({ subject, level, userName }: AiLearningRoomProps) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(userName));
  const [activeId, setActiveId] = useState(() => loadSessions(userName)[0]?.id || "");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileHistoryOpen, setMobileHistoryOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeId) || sessions[0],
    [activeId, sessions],
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
  }, [sessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeSession?.messages.length, pending]);

  const updateSession = (sessionId: string, updater: (session: ChatSession) => ChatSession) => {
    setSessions((current) => current.map((session) => (session.id === sessionId ? updater(session) : session)));
  };

  const newConversation = () => {
    const session = createSession(userName);
    setSessions((current) => [session, ...current].slice(0, 20));
    setActiveId(session.id);
    setInput("");
    setMobileHistoryOpen(false);
    window.setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteConversation = (sessionId: string) => {
    const remaining = sessions.filter((session) => session.id !== sessionId);
    const next = remaining.length ? remaining : [createSession(userName)];
    setSessions(next);
    setActiveId((current) => (current === sessionId ? next[0].id : current));
    toast.success("Percakapan dihapus.");
  };

  const askAI = async (question: string, currentMessages: ChatMessage[]) => {
    const baseUrl = (import.meta.env.VITE_FRONTEND_FORGE_API_URL || "").replace(/\/$/, "");
    const apiKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
    if (!baseUrl || !apiKey) return fallbackAnswer(question, subject, level);
    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-5-mini",
          max_completion_tokens: 800,
          messages: [
            {
              role: "system",
              content: `Kamu adalah Belajar AI, asisten yang ramah dan serbaguna untuk ${userName}. Kamu boleh menjawab pertanyaan umum apa pun dengan jelas, tetapi untuk materi belajar gunakan langkah-langkah sederhana, contoh, dan cek pemahaman. Jangan mengarang fakta; nyatakan jika perlu informasi tambahan. Konteks opsional pengguna: mapel aktif ${subject}, jenjang ${level || "umum"}. Jawab dalam Bahasa Indonesia kecuali pengguna meminta bahasa lain.`,
            },
            ...currentMessages.slice(-10).map((message) => ({ role: message.role === "assistant" ? "assistant" : "user", content: message.content })),
            { role: "user", content: question },
          ],
        }),
      });
      if (!response.ok) throw new Error("AI request failed");
      const data = await response.json();
      return data.choices?.[0]?.message?.content || fallbackAnswer(question, subject, level);
    } catch {
      return fallbackAnswer(question, subject, level);
    }
  };

  const sendMessage = async (preset?: string) => {
    const question = (preset ?? input).trim();
    if (!question || pending || !activeSession) return;
    const sessionId = activeSession.id;
    const userMessage = createMessage("user", question);
    const context = activeSession.messages;
    updateSession(sessionId, (session) => ({
      ...session,
      title: session.title === "Percakapan baru" ? question.slice(0, 44) : session.title,
      messages: [...session.messages, userMessage],
      updatedAt: userMessage.createdAt,
    }));
    setInput("");
    setPending(true);
    const answer = await askAI(question, context);
    const assistantMessage = createMessage("assistant", answer);
    updateSession(sessionId, (session) => ({ ...session, messages: [...session.messages, assistantMessage], updatedAt: assistantMessage.createdAt }));
    setPending(false);
  };

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      toast.error("Jawaban belum bisa disalin di browser ini.");
    }
  };

  if (!activeSession) return null;

  return (
    <section className="relative -mx-4 min-h-[calc(100vh-118px)] overflow-hidden bg-[#f7f3ee] px-4 pb-6 sm:-mx-7 sm:px-7 lg:-mx-10 lg:px-10">
      <div className="mx-auto max-w-[1420px] pt-3 sm:pt-5">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#a65332]">RUANG BELAJAR AI</p>
            <h1 className="mt-2 font-display text-[40px] leading-none tracking-[-0.055em] text-[#26323a] sm:text-[46px]">Tanya apa saja.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#8e8174]">Teman berpikir untuk memahami pelajaran, mengembangkan ide, dan menemukan jawaban dengan cara yang lebih mudah.</p>
          </div>
          <Badge className="hidden rounded-full bg-[#e3f0ea] px-3 py-2 text-[10px] font-bold text-[#456e63] hover:bg-[#e3f0ea] sm:inline-flex"><Sparkles size={12} className="mr-1" />AI siap membantu</Badge>
        </div>

        <div className="relative grid min-h-[650px] overflow-hidden rounded-[28px] border border-[#e5dbd0] bg-[#fffdf9] shadow-[0_18px_50px_rgba(61,48,35,0.07)] lg:grid-cols-[260px_1fr] dark-card">
          <aside className={`${mobileHistoryOpen ? "absolute inset-0 z-20 flex" : "hidden"} flex-col border-r border-[#e9e0d7] bg-[#fffdf9] p-4 lg:relative lg:flex`}>
            <div className="flex items-center justify-between gap-3 px-1 pb-4">
              <div className="flex items-center gap-2"><History size={16} className="text-[#a65332]" /><span className="text-sm font-bold text-[#26323a]">Percakapan</span></div>
              <button className="rounded-lg p-1.5 text-[#a99b8e] hover:bg-[#f2ebe3] lg:hidden" onClick={() => setMobileHistoryOpen(false)} aria-label="Tutup riwayat percakapan"><X size={17} /></button>
            </div>
            <Button onClick={newConversation} className="h-10 w-full justify-start gap-2 rounded-xl bg-[#26323a] px-3 text-xs font-bold text-[#fffaf1] hover:bg-[#3b4b55]"><MessageCirclePlus size={15} />Percakapan baru</Button>
            <div className="mt-5 flex-1 space-y-1.5 overflow-y-auto pr-1">
              <p className="px-2 pb-2 text-[9px] font-bold uppercase tracking-[0.18em] text-[#b1a397]">Terbaru</p>
              {sessions.map((session) => (
                <div key={session.id} className={`group flex items-center gap-1 rounded-xl transition ${session.id === activeSession.id ? "bg-[#f6e2d5]" : "hover:bg-[#f7f1eb]"}`}>
                  <button onClick={() => { setActiveId(session.id); setMobileHistoryOpen(false); }} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                    <p className={`truncate text-xs font-bold ${session.id === activeSession.id ? "text-[#a65332]" : "text-[#76695e]"}`}>{session.title}</p>
                    <p className="mt-1 text-[10px] text-[#b0a094]">{session.messages.length - 1} pesan · {formatTime(session.updatedAt)}</p>
                  </button>
                  <button onClick={() => deleteConversation(session.id)} aria-label={`Hapus ${session.title}`} className="mr-1 rounded-lg p-1.5 text-[#b8a99d] opacity-0 transition group-hover:opacity-100 hover:bg-white hover:text-[#be4f3d]"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-[#f4ede4] p-3.5">
              <div className="flex items-center gap-2 text-[#a65332]"><Sparkles size={14} /><span className="text-[10px] font-bold uppercase tracking-[0.14em]">Konteks aktif</span></div>
              <p className="mt-2 text-xs font-bold text-[#6f6256]">{subject}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-[#a08f80]">{level || "Jenjang umum"} · bisa diubah dari menu utama</p>
            </div>
          </aside>

          <div className="flex min-h-[650px] min-w-0 flex-col bg-[#fbf8f4]">
            <header className="flex items-center justify-between gap-3 border-b border-[#eee5dc] bg-[#fffdf9] px-4 py-3.5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button onClick={() => setMobileHistoryOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#e3d9ce] bg-[#fffaf1] text-[#76695e] lg:hidden" aria-label="Buka daftar percakapan"><Menu size={17} /></button>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e3f0ea] text-[#456e63]"><Bot size={18} /></div>
                <div className="min-w-0"><p className="truncate text-sm font-bold text-[#26323a]">Belajar AI</p><p className="truncate text-[10px] text-[#a49384]">Tanya apa saja · {subject}</p></div>
              </div>
              <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 text-[10px] font-bold text-[#5b927f] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#6e9e8e]" />Online</span><button className="rounded-lg p-2 text-[#a99b8e] hover:bg-[#f2ebe3]" onClick={newConversation} aria-label="Buat percakapan baru"><Plus size={16} /></button><MoreHorizontal size={17} className="text-[#b1a397]" /></div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
              <div className="mx-auto max-w-3xl space-y-7">
                <div className="text-center"><span className="rounded-full bg-[#f2ebe3] px-3 py-1 text-[10px] font-bold text-[#a49384]">Hari ini</span></div>
                {activeSession.messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    {message.role === "assistant" && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#26323a] text-[#f6cfad]"><Sparkles size={15} /></div>}
                    <div className={`max-w-[88%] sm:max-w-[78%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`rounded-[20px] px-4 py-3 text-sm leading-7 ${message.role === "user" ? "rounded-br-md bg-[#e97848] text-white shadow-[0_8px_18px_rgba(233,120,72,0.16)]" : "rounded-bl-md border border-[#ece2d9] bg-[#fffdf9] text-[#5f554b] shadow-[0_6px_20px_rgba(61,48,35,0.035)]"}`}>
                        <p className="whitespace-pre-line">{message.content}</p>
                      </div>
                      <div className={`mt-1.5 flex items-center gap-2 px-1 text-[10px] text-[#b1a397] ${message.role === "user" ? "justify-end" : ""}`}>
                        <span>{formatTime(message.createdAt)}</span>
                        {message.role === "assistant" && <button className="inline-flex items-center gap-1 hover:text-[#a65332]" onClick={() => copyMessage(message)}>{copiedId === message.id ? <><Check size={11} />Tersalin</> : <><Clipboard size={11} />Salin</>}</button>}
                      </div>
                    </div>
                    {message.role === "user" && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f6cfad] text-[#70402d]"><UserRound size={15} /></div>}
                  </div>
                ))}
                {pending && <div className="flex gap-3"><div className="mt-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#26323a] text-[#f6cfad]"><Sparkles size={15} /></div><div className="rounded-[20px] rounded-bl-md border border-[#ece2d9] bg-[#fffdf9] px-4 py-3 text-sm text-[#a49384]"><span className="inline-flex gap-1"><span className="animate-bounce">•</span><span className="animate-bounce [animation-delay:120ms]">•</span><span className="animate-bounce [animation-delay:240ms]">•</span></span> <span className="ml-1 text-xs">sedang berpikir</span></div></div>}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="border-t border-[#eee5dc] bg-[#fffdf9] px-4 pb-4 pt-3 sm:px-6">
              <div className="mx-auto max-w-3xl">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {quickPrompts.map((item) => <button key={item.label} onClick={() => { setInput(item.prompt); inputRef.current?.focus(); }} className="shrink-0 rounded-full border border-[#e6dcd2] bg-[#fffaf1] px-3 py-1.5 text-[10px] font-bold text-[#806f61] transition hover:border-[#e97848] hover:bg-[#fff0e6] hover:text-[#a65332]">{item.label}</button>)}
                </div>
                <div className="relative flex items-end gap-2 rounded-2xl border border-[#dfd3c7] bg-[#fffaf1] p-1.5 shadow-[0_8px_24px_rgba(61,48,35,0.05)] focus-within:border-[#e97848] focus-within:ring-2 focus-within:ring-[#e97848]/10">
                  <Input ref={inputRef} value={input} disabled={pending} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Tulis pertanyaan apa saja..." aria-label="Tulis pertanyaan untuk AI" className="h-10 border-0 bg-transparent px-3 text-sm shadow-none focus-visible:ring-0" />
                  <Button onClick={() => sendMessage()} disabled={!input.trim() || pending} aria-label="Kirim pertanyaan" className="h-10 w-10 shrink-0 rounded-xl bg-[#26323a] p-0 text-white hover:bg-[#3b4b55]"><Send size={16} /></Button>
                </div>
                <p className="mt-2 text-center text-[10px] text-[#b2a394]">AI bisa keliru. Gunakan jawaban sebagai teman berpikir dan cek kembali informasi penting.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
