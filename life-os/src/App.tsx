import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db/db";
import { ensureDefaults } from "./db/seed";
import { Shell } from "./components/Shell";
import { LockScreen } from "./components/Lock";
import { Btn, Empty, Skeleton } from "./components/ui";
import { hasPin } from "./lib/security";
import { useSettingsReady } from "./lib/settings";
import { ensureChannel, onNotificationTap, syncNotifications } from "./lib/notifications";
import { maybeRefreshNews } from "./lib/jobs";

const Home = lazy(() => import("./pages/Home"));
const MyDay = lazy(() => import("./pages/MyDay"));
const News = lazy(() => import("./pages/News"));
const Tech = lazy(() => import("./pages/Tech"));
const Earn = lazy(() => import("./pages/Earn"));
const Finance = lazy(() => import("./pages/Finance"));
const Career = lazy(() => import("./pages/Career"));
const Projects = lazy(() => import("./pages/Projects"));
const YouTube = lazy(() => import("./pages/YouTube"));
const Reports = lazy(() => import("./pages/Reports"));
const SettingsPage = lazy(() => import("./pages/Settings"));

class Boundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: "10vh auto" }}>
        <Empty icon="⚠️" title="Something went wrong" action={<Btn kind="primary" onClick={() => location.reload()}>Reload</Btn>}>
          {this.state.err.message}. Your data is stored on this device and was not lost.
        </Empty>
      </div>
    );
  }
}

const Loading = () => <div className="col" aria-busy="true" aria-label="Loading page"><Skeleton h={32} w="40%" /><Skeleton h={140} /><Skeleton h={140} /></div>;
const AUTO_LOCK_MS = 30_000;

export function App() {
  const s = useSettingsReady();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [locked, setLocked] = useState(hasPin());
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    ensureDefaults().then(() => setReady(true)).catch((e) => setDbError(`Local storage is unavailable (${(e as Error).message}). Private browsing can block it.`));
  }, []);

  // auto-lock after being in the background
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else {
        if (hasPin() && hiddenAt.current && Date.now() - hiddenAt.current > AUTO_LOCK_MS) setLocked(true);
        hiddenAt.current = null;
        void maybeRefreshNews();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    let sub: Promise<{ remove: () => void }> | undefined;
    if (Capacitor.isNativePlatform()) {
      sub = CapApp.addListener("backButton", ({ canGoBack }) => { if (canGoBack) history.back(); else void CapApp.minimizeApp(); });
    }
    return () => { document.removeEventListener("visibilitychange", onVis); sub?.then((x) => x.remove()); };
  }, []);

  // notification taps → route
  useEffect(() => onNotificationTap((route) => nav(route)), [nav]);

  // keep scheduled notifications in sync with data/settings
  const snapshot = useLiveQuery(async () => ({ t: await db.tasks.toArray(), o: await db.opportunities.toArray() }), [], undefined);
  const settingsKey = s ? JSON.stringify([s.timezone, s.briefingTime, s.morningPlanTime, s.eveningReviewTime, s.weeklyReviewDay, s.weeklyReviewTime, s.techSummaryDay, s.techSummaryTime, s.notify]) : "";
  useEffect(() => {
    if (!s || !snapshot || !ready) return;
    const h = setTimeout(() => { void ensureChannel().then(() => syncNotifications(s)); }, 1200);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, settingsKey, ready]);

  useEffect(() => { if (ready) void maybeRefreshNews(); }, [ready]);

  if (dbError) return <div style={{ padding: 24, maxWidth: 560, margin: "10vh auto" }}><Empty icon="⚠️" title="Can't open local storage">{dbError}</Empty></div>;
  if (!ready || !s) return <div style={{ padding: 24 }}><Loading /></div>;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  return (
    <Boundary>
      <Shell canLock={hasPin()} onLock={() => setLocked(true)}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/day" element={<MyDay />} />
            <Route path="/news" element={<News />} />
            <Route path="/tech" element={<Tech />} />
            <Route path="/earn" element={<Earn />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/career" element={<Career />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/youtube" element={<YouTube />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Empty icon="🧭" title="Page not found" action={<Btn onClick={() => nav("/")}>Go home</Btn>} />} />
          </Routes>
        </Suspense>
      </Shell>
    </Boundary>
  );
}
