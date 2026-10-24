import { Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/nav";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <main className="mx-auto flex min-h-[70dvh] max-w-xl flex-col justify-center px-5 pt-28 pb-20">
        <p className="text-[11px] uppercase tracking-[0.32em] text-blue-2">404</p>
        <h1 className="mt-3 font-serif text-5xl md:text-6xl">This room does not exist.</h1>
        <p className="mt-4 text-mist">
          The page you asked for is not on the floor. Try the work, a fresh quote, or head home.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/">
            <Button>Back home</Button>
          </Link>
          <Link to="/work">
            <Button variant="line">See the work</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
