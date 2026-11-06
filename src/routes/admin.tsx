import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteNav } from "@/components/site/nav";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  return (
    <div className="min-h-dvh bg-void">
      <SiteNav />
      <div className="mx-auto w-full max-w-[1480px] pt-24 lg:px-6">
        <Outlet />
      </div>
    </div>
  );
}
