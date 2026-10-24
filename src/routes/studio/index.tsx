import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/")({
  component: StudioHome,
});

function StudioHome() {
  return (
    <main className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-2 md:px-8">
      {[
        { to: "/studio/pipeline", title: "Pipeline", body: "Inquiry through delivered. Advance the night in one motion." },
        { to: "/studio/gear", title: "Gear", body: "Sound and decor stock. Service flags before they strand a show." },
        { to: "/studio/crew", title: "Crew", body: "Calls, assignments, a sheet you can print in the van." },
        { to: "/studio/vendors", title: "Vendors", body: "Florals, rigging, linen — lead times in one directory." },
        { to: "/studio/marketing", title: "Case Forge", body: "Delivered jobs mint a page. Testimonials fire themselves." },
        { to: "/studio/live/$projectId", params: { projectId: "job_meridian" }, title: "Pulse", body: "Run-of-show, sound check, setup. Shared with the client." },
      ].map((c) => (
        <Link
          key={c.title}
          to={c.to}
          params={"params" in c ? c.params : undefined}
          className="glass rounded-lg p-6 hover:glow-blue"
        >
          <h2 className="font-serif text-3xl">{c.title}</h2>
          <p className="mt-2 text-sm text-mist">{c.body}</p>
        </Link>
      ))}
    </main>
  );
}
