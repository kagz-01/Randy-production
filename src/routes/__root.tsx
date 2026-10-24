import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { AmbientOrbs } from "@/components/site/fx";
import { NotFoundPage } from "@/lib/not-found-page";
import appCss from "../styles.css?url";

const APP_NAME = "Randy Production";

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const u = await getSessionUser();
  return u ? { id: u.id, email: u.email } : null;
});

export const Route = createRootRoute({
  beforeLoad: async () => ({ sessionUser: await fetchSessionUser() }),
  notFoundComponent: NotFoundPage,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "Randy Production — multidisciplinary creative agency: media production, event planning & management, branding, digital marketing, and public relations. Nairobi.",
      },
      { name: "theme-color", content: "#050506" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="text-paper">
        <PreviewHostBridge />
        <AmbientOrbs />
        <div className="relative min-h-dvh">
          <AuthProvider>
            <Outlet />
            <Toaster
              theme="dark"
              position="bottom-center"
              toastOptions={{
                style: {
                  background: "#0b0b0d",
                  border: "1px solid rgba(243,241,234,0.12)",
                  color: "#f3f1ea",
                },
              }}
            />
          </AuthProvider>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
