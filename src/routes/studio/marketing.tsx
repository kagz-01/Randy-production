import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { captureTestimonial, listTestimonials } from "@/lib/server/studio";
import { SERVICES, WORK } from "@/data/catalog";

export const Route = createFileRoute("/studio/marketing")({ component: MarketingPage });

function MarketingPage() {
  const [tms, setTms] = useState<Awaited<ReturnType<typeof listTestimonials>>>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refresh() {
    setLoadError(null);
    try {
      setTms(await listTestimonials());
    } catch (error) {
      console.error("[case-forge] Could not load testimonials", error);
      setLoadError("Testimonials could not be loaded. Please refresh and try again.");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  const pending = tms.filter((t) => t.requested && !t.body);

  return (
    <main className="shell py-8">
      <section>
        <h2 className="font-serif text-3xl">Case Forge</h2>
        <p className="mt-1 text-sm text-mist">
          Build shareable stories from the real work in the Randy Production catalog.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {WORK.map((work) => {
            const service = SERVICES.find(({ key }) => key === work.service)?.label ?? work.service;
            return (
              <Link
                key={work.id}
                to="/cases/$slug"
                params={{ slug: work.id }}
                className="group overflow-hidden rounded-lg border border-paper/10 bg-ink/60 transition-colors hover:border-blue/40"
              >
                <div className="aspect-[16/9] overflow-hidden bg-void">
                  <img
                    src={work.image}
                    alt={`${work.title} — ${work.event}`}
                    className="size-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-blue-2">{service} · {work.event}</p>
                  <p className="mt-2 font-serif text-2xl">{work.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-paper/75">{work.logline}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {work.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full border border-paper/15 bg-paper/5 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-mist">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-3xl">Testimonial capture</h2>
        <p className="mt-1 text-sm text-mist">
          Capture a client&apos;s words after a project is delivered.
        </p>
        {loadError ? <p role="alert" className="mt-4 text-sm text-red-300">{loadError}</p> : null}
        <div className="mt-6 grid gap-3">
          {tms
            .filter((t) => t.body)
            .map((t) => (
              <blockquote key={t.id} className="glass rounded-lg p-5">
                <p className="font-serif text-2xl">“{t.body}”</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-mist">
                  {t.author}
                  {t.company ? ` · ${t.company}` : ""}
                </p>
              </blockquote>
            ))}
        </div>
        {pending[0] ? (
          <form
            className="glass mt-6 grid gap-3 rounded-lg p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await captureTestimonial({ data: { id: pending[0].id, author, body } });
                toast.success("Captured");
                setAuthor("");
                setBody("");
                await refresh();
              } catch {
                toast.error("Could not save");
              }
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-blue-2">Request waiting</p>
            <Input placeholder="Name" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-paper/5 p-3 text-sm outline-none shadow-[0_0_0_1px_rgb(243_241_234/0.12)]"
              placeholder="One line. A number if you have it."
            />
            <Button>File it</Button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
