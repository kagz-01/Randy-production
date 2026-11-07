import { useEffect, useRef, useState } from "react";
import { Download, Plus, Share2, X } from "lucide-react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

const DISMISSED_AT_KEY = "randy-install-prompt-dismissed-at";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const PROMPT_DELAY_MS = 5000;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function wasRecentlyDismissed(): boolean {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY));
    if (Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_FOR_MS) {
      return true;
    }
    window.localStorage.removeItem(DISMISSED_AT_KEY);
  } catch (error) {
    console.warn("Could not read the install-prompt preference.", error);
  }
  return false;
}

function rememberDismissal(): void {
  try {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
  } catch (error) {
    console.warn("Could not save the install-prompt preference.", error);
  }
}

export function InstallPrompt() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [canPromptInstall, setCanPromptInstall] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      void navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.warn("Could not register the app service worker.", error);
      });
    }

    const isPhone = window.matchMedia("(max-width: 767px)").matches;
    const userAgent = navigator.userAgent;
    const ios = /iPhone|iPod/i.test(userAgent);
    const android = /Android/i.test(userAgent);
    if (!isPhone || (!ios && !android) || isStandalone() || wasRecentlyDismissed()) {
      return;
    }

    setIsIos(ios);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as BeforeInstallPromptEvent;
      setCanPromptInstall(true);
    };
    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      setCanPromptInstall(false);
      setVisible(false);
      rememberDismissal();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    const timer = window.setTimeout(() => setVisible(true), PROMPT_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!visible) return null;

  const install = async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) {
      setShowSteps(true);
      return;
    }

    deferredPrompt.current = null;
    setCanPromptInstall(false);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") {
        setVisible(false);
        rememberDismissal();
      } else {
        setShowSteps(true);
      }
    } catch (error) {
      console.warn("The browser could not open its install prompt.", error);
      setShowSteps(true);
    }
  };

  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
  };

  return (
    <aside
      aria-label="Install Randy Production"
      className="fixed inset-x-0 bottom-0 z-[100] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
    >
      <div className="mx-auto max-w-lg rounded-2xl border border-paper/15 bg-ink/95 p-4 shadow-[0_16px_50px_rgb(0_0_0/0.55)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-paper/10 bg-void">
            <img src="/logo/logo.png" alt="" className="size-full object-cover" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-paper">Install Randy Production</p>
            <p className="mt-0.5 text-xs leading-relaxed text-mist">
              Add us to your home screen for quick access.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss install prompt"
            onClick={dismiss}
            className="-mr-1 -mt-1 grid size-9 shrink-0 place-items-center rounded-full text-mist transition hover:bg-paper/10 hover:text-paper"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {showSteps ? (
          <div className="mt-3 rounded-xl border border-paper/10 bg-paper/[0.04] p-3 text-xs leading-relaxed text-paper/85">
            {isIos ? (
              <p className="flex items-start gap-2">
                <Share2 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-blue-2" />
                <span>
                  Tap your browser&apos;s <strong>Share</strong> button, choose{" "}
                  <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                </span>
              </p>
            ) : (
              <p className="flex items-start gap-2">
                <Plus aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-blue-2" />
                <span>
                  Open your browser menu and choose <strong>Install app</strong> or{" "}
                  <strong>Add to Home screen</strong>.
                </span>
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-3 flex gap-2">
          {showSteps ? (
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 flex-1 rounded-full bg-paper px-4 text-sm font-semibold text-void transition hover:bg-white"
            >
              Got it
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-paper px-4 text-sm font-semibold text-void transition hover:bg-white"
            >
              <Download aria-hidden="true" size={16} />
              {canPromptInstall ? "Install app" : "How to install"}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
