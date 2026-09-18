import { apexOrigin, getRootDomain } from "@/lib/host";

const MESSAGE = "showcase-session";

export function isCreatorHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const root = getRootDomain().split(":")[0] ?? "localhost";
  return host !== root && host.endsWith(`.${root}`);
}

export function isAllowedAuthOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    const root = getRootDomain().split(":")[0] ?? "localhost";
    return host === root || host.endsWith(`.${root}`);
  } catch {
    return false;
  }
}

export function pullApexSession() {
  return new Promise<{ access_token: string; refresh_token: string } | null>((resolve) => {
    const apex = apexOrigin();
    const parent = window.location.origin;
    const frame = document.createElement("iframe");
    frame.src = `${apex}/auth/bridge?origin=${encodeURIComponent(parent)}`;
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden";

    const timer = window.setTimeout(finish, 4000, null);

    function onMessage(event: MessageEvent) {
      if (event.origin !== apex) return;
      if (!event.data || event.data.type !== MESSAGE) return;
      const session = event.data.session as { access_token?: string; refresh_token?: string } | null;
      finish(
        session?.access_token && session.refresh_token
          ? { access_token: session.access_token, refresh_token: session.refresh_token }
          : null,
      );
    }

    function finish(session: { access_token: string; refresh_token: string } | null) {
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      frame.remove();
      resolve(session);
    }

    window.addEventListener("message", onMessage);
    document.body.appendChild(frame);
  });
}

export const AUTH_BRIDGE_MESSAGE = MESSAGE;
