import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPipeline, listTestimonials, captureTestimonial, type JobRow } from "@/lib/server/studio";
import { WORK } from "@/data/catalog";

export const Route = createFileRoute("/studio/marketing")({ component: MarketingPage });

function MarketingPage() {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [tms, setTms] = useState<Awaited<ReturnType<typeof listTestimonials>>>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");

  async function refresh() {
    const [j, t] = await Promise.all([listPipeline(), listTestimonials()]);
    setJobs(j);
    setTms(t);
  }
  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  const delivered = jobs.filter((j) => j.status === "delivered" || j.is_showcase);
  const pending = tms.filter((t) => t.requested && !t.body);

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <section>
        <h2 className="font-serif text-3xl">Case Forge</h2>
        <p className="mt-1 text-sm text-mist">Every delivered night mints a shareable page.</p>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {delivered.map((j) => {
            const work = WORK.find((w) => j.title.toLowerCase().includes(w.title.split(" ")[0].toLowerCase()));
            return (
              <Link
                key={j.id}
                to="/cases/$slug"
                params={{ slug: j.id }}
                className="group overflow-hidden rounded-lg"
              >
                <div className="relative aspect-[16/9]">
                  <img
                    src={work?.image ?? "/images/hero-gala.jpg"}
                    alt=""
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <p className="font-serif text-2xl">{j.title}</p>
                    <p className="text-xs uppercase tracking-[0.16em] text-blue-2">{j.client_name}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-3xl">Testimonial capture</h2>
        <p className="mt-1 text-sm text-mist">Fires automatically when a job hits delivered.</p>
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
