import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import {
  deleteStudioMessage,
  downloadStudioAttachment,
  heartbeatStudioPresence,
  listOnlineStudioStaff,
  listStudioChannels,
  listStudioMessages,
  sendStudioMessage,
  toggleStudioReaction,
  type StudioMessageRow,
} from "@/lib/server/studio";

export const Route = createFileRoute("/studio/collaboration")({
  component: StudioCollaboration,
});

type Channel = { id: string; title: string; job_id: string | null };
type OnlinePerson = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_data_url: string | null;
};
type PendingAttachment = { name: string; contentType: string; base64: string };
const REACTIONS = ["🔥", "👏", "❤️", "😂", "👀"];

function StudioCollaboration() {
  const currentUser = useCurrentUser();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StudioMessageRow[]>([]);
  const [online, setOnline] = useState<OnlinePerson[]>([]);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [reply, setReply] = useState<StudioMessageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const refreshChannels = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listStudioChannels();
      setChannels(result);
      setChannelId((current) =>
        current && result.some((channel) => channel.id === current)
          ? current
          : (result[0]?.id ?? null),
      );
      setError(null);
    } catch (cause) {
      console.error("[studio-collaboration] Could not load channels", cause);
      setError("Channels could not be loaded. Refresh and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMessages = useCallback(async (id: string) => {
    const result = await listStudioMessages({ data: { channelId: id } });
    setMessages([...result].reverse());
  }, []);

  const refreshPresence = useCallback(async () => {
    await heartbeatStudioPresence();
    setOnline(await listOnlineStudioStaff());
  }, []);

  useEffect(() => {
    void refreshChannels();
  }, [refreshChannels]);

  useEffect(() => {
    if (!channelId) return;
    let active = true;
    const load = () =>
      refreshMessages(channelId).catch((cause) => {
        console.error("[studio-collaboration] Could not load messages", cause);
        if (active) setError("Messages could not be refreshed.");
      });
    void load();
    const timer = window.setInterval(() => void load(), 8_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [channelId, refreshMessages]);

  useEffect(() => {
    let active = true;
    const update = () =>
      refreshPresence().catch((cause) => {
        console.error("[studio-collaboration] Could not update presence", cause);
        if (active) setError("Team presence could not be refreshed.");
      });
    void update();
    const timer = window.setInterval(() => void update(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshPresence]);

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024) {
      toast.error("Choose a JPG, PNG, WebP, or PDF under 2 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("Could not read the file."));
      reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
      reader.readAsDataURL(file);
    }).catch((cause: unknown) => {
      console.error("[studio-collaboration] Could not read attachment", cause);
      toast.error("That attachment could not be read.");
      return null;
    });
    if (!dataUrl) return;
    setAttachment({
      name: file.name,
      contentType: file.type,
      base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    });
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!channelId || (!body.trim() && !attachment)) return;
    setSending(true);
    setError(null);
    try {
      await sendStudioMessage({
        data: {
          channelId,
          body,
          replyToId: reply?.id,
          attachment: attachment ?? undefined,
        },
      });
      setBody("");
      setAttachment(null);
      setReply(null);
      if (fileInput.current) fileInput.current.value = "";
      await refreshMessages(channelId);
    } catch (cause) {
      console.error("[studio-collaboration] Could not send message", cause);
      setError(cause instanceof Error ? cause.message : "The message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  async function downloadFile(id: string) {
    try {
      const file = await downloadStudioAttachment({ data: { id } });
      const binary = atob(file.base64);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: file.content_type }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.file_name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      console.error("[studio-collaboration] Could not download attachment", cause);
      toast.error("The attachment could not be downloaded.");
    }
  }

  async function react(messageId: string, emoji: string) {
    try {
      await toggleStudioReaction({ data: { messageId, emoji } });
      if (channelId) await refreshMessages(channelId);
    } catch (cause) {
      console.error("[studio-collaboration] Could not update reaction", cause);
      toast.error("The reaction could not be updated.");
    }
  }

  async function removeMessage(messageId: string) {
    if (!window.confirm("Delete this message and its attachment?")) return;
    try {
      await deleteStudioMessage({ data: { id: messageId } });
      if (channelId) await refreshMessages(channelId);
    } catch (cause) {
      console.error("[studio-collaboration] Could not delete message", cause);
      toast.error("The message could not be deleted.");
    }
  }

  const activeChannel = channels.find((channel) => channel.id === channelId);

  return (
    <main className="shell pb-16">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-paper/10 pb-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-2">
            Private team workspace
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-paper md:text-4xl">
            Studio floor
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-mist">
            Coordinate event details, share files, and keep the production team in sync.
          </p>
        </div>
        <div
          aria-label={`${online.length} teammates online`}
          className="flex items-center gap-2 text-xs text-mist"
        >
          <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
          {online.length} online
        </div>
      </header>

      <div className="grid gap-5 pt-6 lg:grid-cols-[230px_minmax(0,1fr)_210px]">
        <aside className="rounded-xl border border-paper/10 bg-ink/75 p-3">
          <h2 className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">
            Channels
          </h2>
          {loading ? <p className="px-3 py-4 text-sm text-mist">Loading channels…</p> : null}
          <div className="grid gap-1">
            {channels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => setChannelId(channel.id)}
                aria-current={channel.id === channelId ? "page" : undefined}
                className={`min-h-11 rounded-lg px-3 text-left text-sm transition-colors ${
                  channel.id === channelId
                    ? "bg-blue/15 text-paper"
                    : "text-mist hover:bg-paper/5 hover:text-paper"
                }`}
              >
                <span className="mr-2 text-blue-2">#</span>
                {channel.title}
              </button>
            ))}
          </div>
          <p className="px-3 pb-2 pt-4 text-[10px] leading-relaxed text-mist/75">
            Event channels appear when a production is booked or in progress.
          </p>
        </aside>

        <section className="flex min-h-[65vh] flex-col overflow-hidden rounded-xl border border-paper/10 bg-ink/75">
          <div className="border-b border-paper/10 px-5 py-4">
            <h2 className="font-medium text-paper">{activeChannel?.title ?? "Studio floor"}</h2>
            <p className="mt-1 text-xs text-mist">
              {activeChannel?.job_id ? "Event production channel" : "General team channel"}
            </p>
          </div>
          {error ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 border-b border-red-300/15 bg-red-300/5 px-5 py-3"
            >
              <p className="text-sm text-red-200">{error}</p>
              <Button
                type="button"
                variant="line"
                className="min-h-11"
                onClick={() => {
                  void refreshChannels();
                  if (channelId) {
                    void refreshMessages(channelId).catch((cause) => {
                      console.error("[studio-collaboration] Could not refresh messages", cause);
                      setError("Messages could not be refreshed.");
                    });
                    void refreshPresence().catch((cause) => {
                      console.error("[studio-collaboration] Could not refresh presence", cause);
                      setError("Team presence could not be refreshed.");
                    });
                  }
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite">
            {!messages.length && !loading ? (
              <div className="grid min-h-48 place-items-center text-center">
                <div>
                  <p className="text-sm font-medium text-paper">Start the conversation</p>
                  <p className="mt-1 text-xs text-mist">
                    Share a production update or ask the team a question.
                  </p>
                </div>
              </div>
            ) : null}
            {messages.map((message) => {
              const reactions =
                typeof message.reactions === "string"
                  ? (JSON.parse(message.reactions) as { emoji: string; count: number }[])
                  : message.reactions;
              return (
                <article
                  key={message.id}
                  className="group rounded-lg border border-paper/[0.07] bg-paper/[0.025] p-3.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      {message.sender_avatar_data_url ? (
                        <img
                          src={message.sender_avatar_data_url}
                          alt=""
                          className="size-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper/10 text-[10px] font-medium text-paper">
                          {message.sender_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <p className="truncate text-sm font-medium text-paper">
                        {message.sender_name}
                      </p>
                      {message.sender_username ? (
                        <span className="truncate text-[10px] text-mist">
                          @{message.sender_username}
                        </span>
                      ) : null}
                    </div>
                    <time className="text-[10px] text-mist/75" dateTime={message.created_at}>
                      {new Intl.DateTimeFormat("en-KE", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(message.created_at))}
                    </time>
                  </div>
                  {message.reply_body ? (
                    <p className="mt-2 border-l-2 border-blue/40 pl-3 text-xs text-mist">
                      Replying to: {message.reply_body}
                    </p>
                  ) : null}
                  {message.body ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-mist">
                      {message.body}
                    </p>
                  ) : null}
                  {message.attachment_id && message.file_name ? (
                    <button
                      type="button"
                      onClick={() => void downloadFile(message.attachment_id!)}
                      className="mt-3 inline-flex min-h-11 items-center rounded-md border border-paper/10 px-3 text-xs text-blue-2 hover:bg-paper/5"
                    >
                      Download · {message.file_name} · {Math.ceil((message.byte_size ?? 0) / 1024)}{" "}
                      KB
                    </button>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {reactions.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        type="button"
                        onClick={() => void react(message.id, reaction.emoji)}
                        className="min-h-11 rounded-full border border-paper/10 px-3 text-xs text-mist hover:border-blue/30 hover:text-paper"
                        aria-label={`${reaction.emoji}, ${reaction.count} reactions`}
                      >
                        {reaction.emoji} {reaction.count}
                      </button>
                    ))}
                    {REACTIONS.filter(
                      (emoji) => !reactions.some((reaction) => reaction.emoji === emoji),
                    ).map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => void react(message.id, emoji)}
                        className="grid size-11 place-items-center rounded-full text-sm text-mist/70 opacity-60 transition-opacity hover:bg-paper/5 hover:text-paper group-hover:opacity-100 focus:opacity-100"
                        aria-label={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setReply(message)}
                      className="ml-auto min-h-11 rounded-md px-3 text-xs text-mist hover:bg-paper/5 hover:text-paper"
                    >
                      Reply
                    </button>
                    {message.sender_id === currentUser?.id ? (
                      <button
                        type="button"
                        onClick={() => void removeMessage(message.id)}
                        className="min-h-11 rounded-md px-3 text-xs text-mist hover:bg-red-400/10 hover:text-red-200"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          <form onSubmit={submitMessage} className="border-t border-paper/10 p-3.5 sm:p-4">
            {reply ? (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-paper/5 px-3 py-2 text-xs text-mist">
                <span className="min-w-0 truncate">
                  Replying to {reply.sender_name}: {reply.body || "attachment"}
                </span>
                <button
                  type="button"
                  onClick={() => setReply(null)}
                  className="min-h-11 shrink-0 rounded-md px-3 text-paper underline underline-offset-2"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            {attachment ? (
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-mist">
                <span className="truncate">Attached: {attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="min-h-11 shrink-0 rounded-md px-3 text-paper underline underline-offset-2"
                >
                  Remove
                </button>
              </div>
            ) : null}
            <div className="flex flex-wrap items-end gap-2">
              <label className="sr-only" htmlFor="studio-message">
                Message
              </label>
              <textarea
                id="studio-message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={5_000}
                rows={2}
                placeholder={`Message ${activeChannel?.title ?? "the team"}…`}
                className="min-h-12 min-w-[180px] flex-1 resize-y rounded-lg border border-paper/10 bg-void/70 px-3 py-2.5 text-sm text-paper placeholder:text-mist/60 focus:border-blue/40 focus:outline-none"
              />
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(event) => void onFileChange(event.currentTarget.files?.[0])}
                className="sr-only"
                aria-label="Attach JPG, PNG, WebP, or PDF"
              />
              <Button
                type="button"
                variant="line"
                className="min-h-11"
                onClick={() => fileInput.current?.click()}
                disabled={sending}
              >
                Attach
              </Button>
              <Button
                type="submit"
                className="min-h-11"
                disabled={sending || (!body.trim() && !attachment)}
              >
                {sending ? "Sending…" : "Send"}
              </Button>
            </div>
            <p className="mt-2 text-[10px] text-mist/70">
              Up to 5,000 characters · JPG, PNG, WebP, and PDF up to 2 MB
            </p>
          </form>
        </section>

        <aside className="rounded-xl border border-paper/10 bg-ink/75 p-4">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">
            On the floor
          </h2>
          <p className="mt-2 text-xs text-mist">{online.length} teammates active now</p>
          <ul className="mt-4 space-y-3">
            {online.map((person) => (
              <li
                key={person.user_id}
                className="flex min-w-0 items-center gap-2.5 text-sm text-paper"
              >
                {person.avatar_data_url ? (
                  <img
                    src={person.avatar_data_url}
                    alt=""
                    className="size-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-paper/10 text-[10px] font-medium">
                    {(person.display_name ?? "S").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="size-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="min-w-0 truncate">
                  <span className="block truncate">{person.display_name ?? "Studio teammate"}</span>
                  {person.username ? (
                    <span className="block truncate text-[10px] text-mist">@{person.username}</span>
                  ) : null}
                </span>
              </li>
            ))}
            {!online.length ? (
              <li className="text-xs text-mist">You’re the first one in right now.</li>
            ) : null}
          </ul>
        </aside>
      </div>
    </main>
  );
}
