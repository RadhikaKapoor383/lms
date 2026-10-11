"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useLazyGetSessionQuery, useLazyLogOutQuery } from "@/redux/features/auth/authApi";
import { sessionEnded } from "@/redux/features/auth/authSlice";

// Keeps a login from lasting forever (the server enforces the same rules - this
// is the friendly side of it):
//   * IDLE: after a stretch with no mouse / keyboard / touch activity you get a
//     "still there?" warning, then you are logged out.
//   * MAX:  a hard cap from the moment you logged in (set by the server, default
//     2 hours). You get a heads-up 5 minutes before.
// While you are really using the site, a small ping tells the server you are
// still here. Several tabs share one activity clock, so a quiet background tab
// can't log you out while you are working in another one.

const ACTIVITY_KEY = "lms:lastActive";
const ENDED_KEY = "lms:sessionEnded";
const TICK_MS = 5000;
const PING_MIN_GAP_MS = 60 * 1000; // at most one "still here" ping a minute
const IDLE_WARNING_SECONDS = 60;
const MAX_WARNING_SECONDS = 5 * 60;
// We log out a little BEFORE the server's idle limit, so the page ends the
// session itself instead of being surprised by it.
const IDLE_MARGIN_MS = 90 * 1000;
const EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"] as const;

type Limits = { idleMs: number; endsAtMs: number; maxSeconds: number; idleSeconds: number };
type Warning = { kind: "idle" | "max"; secondsLeft: number } | null;

const describe = (seconds: number): string => {
  if (seconds % 3600 === 0) {
    const h = seconds / 3600;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  const m = Math.round(seconds / 60);
  return `${m} minute${m === 1 ? "" : "s"}`;
};

const readStoredActivity = (): number => {
  try {
    return Number(window.localStorage.getItem(ACTIVITY_KEY) || 0);
  } catch {
    return 0;
  }
};

export default function SessionGuard() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const user = useAppSelector((state) => state.auth.user);
  const endedReason = useAppSelector((state) => state.auth.endedReason);

  const [getSession] = useLazyGetSessionQuery();
  const [logOut] = useLazyLogOutQuery();

  const [warning, setWarning] = useState<Warning>(null);
  const limitsRef = useRef<Limits | null>(null);
  const lastActiveRef = useRef<number>(Date.now());
  const lastWriteRef = useRef<number>(0);
  const lastPingRef = useRef<number>(Date.now());
  const idleWarningOpenRef = useRef(false);
  const endingRef = useRef(false);
  // true once someone has actually been logged in on THIS page visit
  const hadUserRef = useRef(false);

  const markActive = useCallback(() => {
    const now = Date.now();
    lastActiveRef.current = now;
    if (now - lastWriteRef.current > 3000) {
      lastWriteRef.current = now;
      try {
        window.localStorage.setItem(ACTIVITY_KEY, String(now));
      } catch {
        /* storage unavailable (private mode): this tab still works on its own */
      }
    }
  }, []);

  const ping = useCallback(async () => {
    lastPingRef.current = Date.now();
    try {
      const res: any = await getSession(undefined, false).unwrap();
      applySession(res?.session);
    } catch {
      /* a 401 is handled by the API layer (it logs us out and says why) */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getSession]);

  const applySession = (s: any) => {
    if (!s) return;
    const skew = new Date(s.serverNow).getTime() - Date.now(); // server clock minus ours
    limitsRef.current = {
      idleMs: Math.max(s.idleSeconds * 500, s.idleSeconds * 1000 - IDLE_MARGIN_MS),
      endsAtMs: new Date(s.endsAt).getTime() - skew,
      maxSeconds: s.maxSeconds,
      idleSeconds: s.idleSeconds,
    };
  };

  const endSession = useCallback(
    async (kind: "idle" | "max") => {
      if (endingRef.current) return;
      endingRef.current = true;
      const l = limitsRef.current;
      const message =
        kind === "max"
          ? `Your session ended after ${describe(l?.maxSeconds ?? 7200)}. Please log in again.`
          : `You were logged out after ${describe(l?.idleSeconds ?? 1800)} of inactivity. Please log in again.`;
      try {
        window.localStorage.setItem(ENDED_KEY, JSON.stringify({ message, at: Date.now() }));
      } catch {
        /* ignore */
      }
      try {
        await logOut(undefined).unwrap();
      } catch {
        /* the server may already have ended it - fine */
      }
      setWarning(null);
      dispatch(sessionEnded(message));
    },
    [dispatch, logOut]
  );

  // Load the limits when someone logs in; reset when they log out.
  useEffect(() => {
    if (user) hadUserRef.current = true;
    if (!user) {
      limitsRef.current = null;
      endingRef.current = false;
      idleWarningOpenRef.current = false;
      setWarning(null);
      return;
    }
    const now = Date.now();
    lastActiveRef.current = now;
    lastPingRef.current = now;
    endingRef.current = false;
    getSession(undefined, false)
      .unwrap()
      .then((res: any) => applySession(res?.session))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Activity listeners + the once-every-few-seconds check.
  useEffect(() => {
    if (!user) return;

    const onActivity = () => {
      // While the "still there?" box is up only its button counts - otherwise a
      // twitch of the mouse would silently dismiss it.
      if (!idleWarningOpenRef.current) markActive();
    };
    EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    const onVisible = () => document.visibilityState === "visible" && onActivity();
    document.addEventListener("visibilitychange", onVisible);

    // A logout in another tab ends this one too.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== ENDED_KEY || !e.newValue) return;
      try {
        dispatch(sessionEnded(JSON.parse(e.newValue).message));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);

    const tick = () => {
      const limits = limitsRef.current;
      if (!limits || endingRef.current) return;
      const now = Date.now();

      if (now >= limits.endsAtMs) return void endSession("max");

      const lastActive = Math.max(lastActiveRef.current, readStoredActivity());
      const idleFor = now - lastActive;
      if (idleFor >= limits.idleMs) return void endSession("idle");

      const idleLeft = Math.ceil((limits.idleMs - idleFor) / 1000);
      const maxLeft = Math.ceil((limits.endsAtMs - now) / 1000);

      if (idleLeft <= IDLE_WARNING_SECONDS) {
        idleWarningOpenRef.current = true;
        setWarning({ kind: "idle", secondsLeft: idleLeft });
        return;
      }
      idleWarningOpenRef.current = false;
      setWarning(maxLeft <= MAX_WARNING_SECONDS ? { kind: "max", secondsLeft: maxLeft } : null);

      // Really using the site? Tell the server (at most once a minute).
      if (
        document.visibilityState === "visible" &&
        lastActive > lastPingRef.current &&
        now - lastPingRef.current >= PING_MIN_GAP_MS
      ) {
        void ping();
      }
    };
    const id = window.setInterval(tick, TICK_MS);
    tick();

    return () => {
      window.clearInterval(id);
      EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [user, dispatch, endSession, markActive, ping]);

  // Once the system has logged you out WHILE you were using the site, take you
  // to the login page (which shows why). Someone who just arrives with an old
  // cookie stays where they are; the login page will still explain if they go there.
  useEffect(() => {
    if (!user && endedReason && hadUserRef.current && pathname !== "/login") {
      router.push("/login");
    }
  }, [user, endedReason, pathname, router]);

  const stayLoggedIn = () => {
    idleWarningOpenRef.current = false;
    markActive();
    setWarning(null);
    void ping();
  };

  if (!user || !warning) return null;

  if (warning.kind === "idle") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-6">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="idle-title"
          aria-describedby="idle-text"
          className="w-full max-w-sm border border-parchment-dark bg-parchment p-6 text-center dark:border-ink-light dark:bg-ink"
        >
          <h2 id="idle-title" className="font-display text-2xl text-ink dark:text-parchment">
            Still there?
          </h2>
          <p id="idle-text" className="mt-3 text-ink/70 dark:text-parchment/70">
            You&apos;ll be logged out in {warning.secondsLeft} second{warning.secondsLeft === 1 ? "" : "s"} because
            there has been no activity.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              autoFocus
              onClick={stayLoggedIn}
              className="rounded-full bg-mustard px-5 py-2 text-sm font-medium text-ink hover:bg-mustard-dark"
            >
              Stay logged in
            </button>
            <button
              onClick={() => void endSession("idle")}
              className="text-sm text-ink/60 hover:underline dark:text-parchment/60"
            >
              Log out now
            </button>
          </div>
        </div>
      </div>
    );
  }

  const minutes = Math.max(1, Math.ceil(warning.secondsLeft / 60));
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 max-w-xs border border-parchment-dark bg-parchment p-4 text-sm text-ink shadow dark:border-ink-light dark:bg-ink dark:text-parchment"
    >
      Your session ends in about {minutes} minute{minutes === 1 ? "" : "s"}. Save your work - you&apos;ll need to
      log in again.
    </div>
  );
}
