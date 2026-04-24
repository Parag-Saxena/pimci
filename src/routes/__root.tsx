import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Pimci — AI post composer & scheduler for LinkedIn and X" },
      {
        name: "description",
        content:
          "Write, AI-generate, and schedule LinkedIn and X posts from one minimal workspace.",
      },
      { property: "og:title", content: "Pimci — AI post composer & scheduler for LinkedIn and X" },
      {
        property: "og:description",
        content: "Write, AI-generate, and schedule LinkedIn and X posts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Pimci — AI post composer & scheduler for LinkedIn and X" },
      { name: "description", content: "Create and schedule social media posts for LinkedIn and X with AI-powered content generation." },
      { property: "og:description", content: "Create and schedule social media posts for LinkedIn and X with AI-powered content generation." },
      { name: "twitter:description", content: "Create and schedule social media posts for LinkedIn and X with AI-powered content generation." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ba6c51d1-6c3e-4e26-82bf-249e84484830/id-preview-130cb85b--677ca6d3-5807-4393-a79e-f69705e1daf2.lovable.app-1777040361599.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/ba6c51d1-6c3e-4e26-82bf-249e84484830/id-preview-130cb85b--677ca6d3-5807-4393-a79e-f69705e1daf2.lovable.app-1777040361599.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={150}>
        <Outlet />
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </AuthProvider>
  );
}
