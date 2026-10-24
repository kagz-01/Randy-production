import { createFileRoute } from "@tanstack/react-router";
import { MERCH_ADD_ONS, MERCH_AREAS } from "@/data/catalog";

export const Route = createFileRoute("/studio/merch")({ component: MerchCatalogPage });

function MerchCatalogPage() {
  const totalAreas = MERCH_AREAS.length;
  const totalCount = MERCH_AREAS.reduce((sum: number, item: { count: number }) => sum + item.count, 0);

  return (
    <main className="shell py-8">
      <div className="glass rounded-xl p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">Merch catalog</p>
        <h1 className="mt-2 font-serif text-4xl md:text-5xl">Count-led product families.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist">
          Product ranges built for branded merch, uniforms, event drops, and print-ready promo kits. Each line includes the count and the style variants most commonly quoted.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Areas" value={String(totalAreas)} detail="catalog groups" />
          <Stat label="Stock count" value={String(totalCount)} detail="item family count" />
          <Stat label="Add-ons" value={String(MERCH_ADD_ONS.length)} detail="extra promo lines" />
        </div>
      </div>

      <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {MERCH_AREAS.map((item) => (
          <article key={item.area} className="glass rounded-lg p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-serif text-2xl text-paper">{item.area}</h2>
              <span className="rounded-full border border-blue/30 bg-blue/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-blue-2">
                {item.count}
              </span>
            </div>

            <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-mist">Examples</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.examples.map((example: string) => (
                <span key={`${item.area}-${example}`} className="rounded-full border border-paper/10 bg-paper/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-paper/80">
                  {example}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 glass rounded-xl p-5 md:p-6">
        <p className="text-[11px] uppercase tracking-[0.18em] text-blue-2">Plus</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MERCH_ADD_ONS.map((item) => (
            <span key={item} className="rounded-full border border-paper/10 bg-paper/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-paper/80">
              {item}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-paper/10 bg-ink/50 p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-3 font-serif text-3xl text-paper">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-blue-2">{detail}</p>
    </div>
  );
}
