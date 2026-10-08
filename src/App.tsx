import { useEffect, useRef, useState } from "react";
import type {
  AppConfig,
  Candidate,
  Entity,
  EntityType,
  Mode,
  PlanRequest,
  PlanResponse,
  Profile,
  SearchResponse,
} from "./shared";

const TYPES: EntityType[] = ["movie", "artist", "book"];
const TYPE_NAMES = { movie: "Film", artist: "Music", book: "Books" };
const DEMO_PROFILES: [Profile, Profile] = [
  {
    seeds: [
      { id: "movie-amelie", name: "Amélie", type: "movie" },
      { id: "artist-bon-iver", name: "Bon Iver", type: "artist" },
    ],
  },
  {
    seeds: [
      { id: "movie-spirited-away", name: "Spirited Away", type: "movie" },
      { id: "artist-nina-simone", name: "Nina Simone", type: "artist" },
    ],
  },
];
const EMPTY_PROFILES = (): [Profile, Profile] => [{ seeds: [] }, { seeds: [] }];

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 12h15M13 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DomainIcon({ type }: { type: EntityType }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      {type === "movie" ? (
        <>
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <path
            d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </>
      ) : type === "artist" ? (
        <>
          <path
            d="M9 17V6l11-3v12M9 9l11-3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <ellipse
            cx="6"
            cy="18"
            rx="3"
            ry="2.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <ellipse
            cx="17"
            cy="16"
            rx="3"
            ry="2.5"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        </>
      ) : (
        <>
          <path
            d="M12 6C9 4 6 4 3 5v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
async function api<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = 25_000,
): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  const interrupted = new Promise<never>((_, reject) => {
    onAbort = () => {
      controller.abort();
      reject(new DOMException("Request cancelled", "AbortError"));
    };
    if (options?.signal?.aborted) onAbort();
    else options?.signal?.addEventListener("abort", onAbort, { once: true });
    timeout = setTimeout(() => {
      controller.abort();
      reject(
        new Error(
          `The request timed out after ${timeoutMs / 1000} seconds. Check the server connection and try again.`,
        ),
      );
    }, timeoutMs);
  });
  const responseData = async () => {
    const response = await fetch(path, {
      ...options,
      signal: controller.signal,
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error(
        "The server returned an unreadable response. Please try again.",
      );
    }
    if (!response.ok)
      throw new Error(
        data.error?.message || "Something went wrong. Please try again.",
      );
    return data as T;
  };
  try {
    return await Promise.race([responseData(), interrupted]);
  } finally {
    clearTimeout(timeout);
    if (onAbort) options?.signal?.removeEventListener("abort", onAbort);
  }
}
function ProfileEditor({
  index,
  profile,
  mode,
  maxSeeds,
  disabled,
  onChange,
}: {
  index: number;
  profile: Profile;
  mode: Mode;
  maxSeeds: number;
  disabled: boolean;
  onChange: (profile: Profile) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<EntityType>("movie");
  const [results, setResults] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setResults([]);
    setError("");
    if (query.trim().length < 2) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      api<SearchResponse>(
        `/api/search?q=${encodeURIComponent(query.trim())}&type=${type}&mode=${mode}`,
        { signal: controller.signal },
      )
        .then((data) => {
          if (!controller.signal.aborted) setResults(data.entities);
        })
        .catch((err) => {
          if (!controller.signal.aborted) setError(err.message);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, type, mode]);
  useEffect(() => {
    setQuery("");
  }, [mode]);
  const canAdd = profile.seeds.length < maxSeeds;
  return (
    <section
      className={`profile-card person-${index}`}
      aria-labelledby={`profile-${index}`}
    >
      <div className="profile-heading">
        <span className="avatar">{index === 0 ? "A" : "B"}</span>
        <div>
          <h3 id={`profile-${index}`}>Person {index === 0 ? "A" : "B"}</h3>
          <p>
            {index === 0
              ? "Your familiar favorites."
              : "Their different point of view."}
          </p>
        </div>
        <span className="seed-count">
          {profile.seeds.length}/{maxSeeds}
        </span>
      </div>
      <div
        className="type-tabs"
        aria-label={`Search category for person ${index === 0 ? "A" : "B"}`}
      >
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={type === t ? "active" : ""}
            aria-pressed={type === t}
            disabled={disabled}
            onClick={() => setType(t)}
          >
            <DomainIcon type={t} />
            {TYPE_NAMES[t]}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`search-${index}`}>
        Find a favorite {type} for person {index === 0 ? "A" : "B"}
      </label>
      <div className="search-field">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            cx="10"
            cy="10"
            r="6"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="m15 15 5 5" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        <input
          id={`search-${index}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          maxLength={120}
          placeholder={`Search ${type === "movie" ? "a favorite film" : type === "artist" ? "an artist you love" : "a favorite book"}…`}
          disabled={disabled || !canAdd}
          autoComplete="off"
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="search-results" aria-live="polite">
          {loading ? (
            <p>Finding favorites…</p>
          ) : error ? (
            <p role="alert" className="error-text">
              {error}
            </p>
          ) : results.length === 0 ? (
            <p>
              No matches.{" "}
              {mode === "demo"
                ? "Demo has a small curated catalog. Try “Amélie”, “Bon Iver” or “Piranesi”."
                : "Try another title or artist."}
            </p>
          ) : (
            results.map((entity) => (
              <button
                key={entity.id}
                disabled={
                  disabled ||
                  profile.seeds.some((s) => s.id === entity.id) ||
                  !canAdd
                }
                onClick={() => {
                  onChange({ seeds: [...profile.seeds, entity] });
                  setQuery("");
                }}
              >
                <span>
                  {entity.name}
                  <small>
                    {TYPE_NAMES[entity.type]}
                    {entity.disambiguation ? ` · ${entity.disambiguation}` : ""}
                  </small>
                </span>
                <span>＋</span>
              </button>
            ))
          )}
        </div>
      )}
      <div className="seed-list">
        {profile.seeds.map((seed) => (
          <span className="seed" key={seed.id}>
            <DomainIcon type={seed.type} />
            <span>
              {seed.name}
              {seed.disambiguation && (
                <small className="seed-disambiguation">
                  {seed.disambiguation}
                </small>
              )}
            </span>
            <button
              aria-label={`Remove ${seed.name} from person ${index === 0 ? "A" : "B"}`}
              disabled={disabled}
              onClick={() =>
                onChange({
                  seeds: profile.seeds.filter((s) => s.id !== seed.id),
                })
              }
            >
              ×
            </button>
          </span>
        ))}
        {profile.seeds.length === 0 && (
          <p className="empty-seeds">
            Add at least one favorite to start a connection.
          </p>
        )}
      </div>
      <p className="profile-note">
        {canAdd
          ? "A little variety makes the bridge more interesting."
          : "Your taste palette is full. Remove one to add another."}
      </p>
    </section>
  );
}
function RankSupport({ candidate }: { candidate: Candidate }) {
  return (
    <div className="rank-support">
      <span className="support-label">Recommendation-list support</span>
      <div>
        {candidate.ranks.map((rank, i) => (
          <span key={i} className={`rank person-${i}`}>
            <b>{i === 0 ? "A" : "B"}</b>{" "}
            {rank === null ? "Not returned" : `Rank #${rank}`}
          </span>
        ))}
      </div>
    </div>
  );
}
export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState("");
  const [mode, setMode] = useState<Mode>("demo");
  const [profiles, setProfiles] = useState<[Profile, Profile]>(DEMO_PROFILES);
  const [minutes, setMinutes] = useState<30 | 60 | 90>(60);
  const [focus, setFocus] = useState<"balanced" | "adventurous">("balanced");
  const [excluded, setExcluded] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTrace, setShowTrace] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  const [status, setStatus] = useState("");
  const resultRef = useRef<HTMLElement>(null);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const planController = useRef<AbortController | null>(null);
  const configController = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const fetchConfig = () => {
    configController.current?.abort();
    const controller = new AbortController();
    configController.current = controller;
    setConfigError("");
    api<AppConfig>("/api/config", { signal: controller.signal }, 10_000)
      .then((value) => {
        if (!controller.signal.aborted) setConfig(value);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setConfigError(err.message);
      });
  };
  useEffect(() => {
    fetchConfig();
    return () => {
      requestSequence.current += 1;
      planController.current?.abort();
      planController.current = null;
      configController.current?.abort();
    };
  }, []);
  function changeMode(next: Mode) {
    if (next === mode) return;
    setStatus("");
    setMode(next);
    setProfiles(next === "demo" ? DEMO_PROFILES : EMPTY_PROFILES());
    setPlan(null);
    setExcluded([]);
    setError("");
  }
  function invalidate() {
    setStatus("");
    setPlan(null);
    setExcluded([]);
    setError("");
  }
  function cancelPlan() {
    requestSequence.current += 1;
    planController.current?.abort();
    planController.current = null;
    setLoading(false);
    setStatus(
      "Planning cancelled. Your selections and previous session are unchanged.",
    );
  }
  async function generate(excludeIds: string[] = excluded) {
    // The ref closes the gap before React renders disabled controls.
    if (planController.current) return;
    const controller = new AbortController();
    planController.current = controller;
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");
    setStatus("");
    const request: PlanRequest = { mode, profiles, minutes, focus, excludeIds };
    try {
      const nextPlan = await api<PlanResponse>(
        "/api/plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        },
        50_000,
      );
      if (sequence !== requestSequence.current || controller.signal.aborted)
        return;
      setPlan(nextPlan);
      setExcluded(excludeIds);
      window.setTimeout(() => {
        if (sequence !== requestSequence.current) return;
        resultTitleRef.current?.focus({ preventScroll: true });
        resultRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 80);
    } catch (err) {
      if (sequence !== requestSequence.current || controller.signal.aborted)
        return;
      setError(
        err instanceof Error
          ? err.message
          : "Could not build a session. Please try again.",
      );
    } finally {
      if (sequence === requestSequence.current) {
        planController.current = null;
        setLoading(false);
      }
    }
  }
  function reset() {
    setResetVersion((value) => value + 1);
    setProfiles(mode === "demo" ? DEMO_PROFILES : EMPTY_PROFILES());
    setMinutes(60);
    setFocus("balanced");
    invalidate();
    setShowTrace(false);
  }
  function download(format: "json" | "txt") {
    if (!plan || loading) return;
    const content =
      format === "json"
        ? JSON.stringify(
            {
              app: "Common Ground",
              request: { mode, profiles, minutes, focus, excludeIds: excluded },
              plan,
            },
            null,
            2,
          )
        : `COMMON GROUND\n${plan.totalMinutes}-minute shared cultural session\nSource: ${plan.source}${mode === "demo" ? " (scripted fixtures, not Qloo API output)" : ""}\n\n${plan.steps.map((s, i) => `${i + 1}. ${s.entity.name}${s.entity.disambiguation ? ` (${s.entity.disambiguation})` : ""} — ${s.minutes} minutes\n${s.activity}\nConversation: ${s.prompt}\nSelection: ${s.entity.reason}`).join("\n\n")}\n\nMethodology: ${plan.methodology}\n${plan.warnings.join("\n")}`;
    const url = URL.createObjectURL(
      new Blob([content], {
        type:
          format === "json" ? "application/json" : "text/plain;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `common-ground-${mode}.${format}`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const ready =
    config && profiles.every((profile) => profile.seeds.length > 0) && !loading;
  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#" aria-label="Common Ground home">
          <span className="brand-mark">
            <i />
            <i />
          </span>
          common ground<span className="brand-dot">.</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#workspace">
            Make a connection <Arrow />
          </a>
          <span className="header-tag">A cultural discovery experiment</span>
        </nav>
      </header>
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> DIFFERENT TASTES. SHARED POSSIBILITIES.
            </div>
            <h1 id="hero-title">
              Meet in the
              <br />
              <em>unexpected.</em>
            </h1>
            <p>
              You bring your favorites. They bring theirs.
              <br className="desktop-break" /> Find a little film, music, and
              literature to explore together.
            </p>
            <a className="hero-link" href="#workspace">
              Find your common ground <Arrow />
            </a>
            <div className="hero-meta">
              <span>02 people</span>
              <i />
              <span>03 cultural worlds</span>
              <i />
              <span>01 shared session</span>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <span className="orbit-label top-label">YOUR WORLD</span>
            <div className="taste-circle circle-a">
              <span>the familiar</span>
              <svg viewBox="0 0 160 160">
                <path
                  d="M35 90c10-70 90-60 75 0-10 50-75 25-50-10 25-35 75 10 40 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="taste-circle circle-b">
              <svg viewBox="0 0 160 160">
                <path
                  d="M80 28v104M28 80h104M43 43l74 74M43 117l74-74M60 31l40 98M31 60l98 40M31 100l98-40M60 129l40-98"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
              </svg>
              <span>the unfamiliar</span>
            </div>
            <div className="intersection-star">
              <svg viewBox="0 0 64 64" width="64" height="64">
                <path
                  d="M32 7v50M7 32h50M14 14l36 36M14 50l36-36"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="orbit-label bottom-label">THEIR WORLD</span>
            <div className="art-caption">a place you haven’t met yet ↗</div>
            <span className="art-coordinate">FIG. 01 / THE SPACE BETWEEN</span>
          </div>
        </section>
        <section
          id="workspace"
          className="workspace"
          aria-labelledby="workspace-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / THE STARTING POINT</span>
              <h2 id="workspace-title">Two tastes. One new direction.</h2>
            </div>
            <button className="text-button" disabled={loading} onClick={reset}>
              ↺ Start fresh
            </button>
          </div>
          <div className="mode-bar">
            <div>
              <span className={`status-dot ${mode}`} />
              <strong>
                {mode === "demo" ? "Offline demo" : "Live Qloo mode"}
              </strong>
              <span className="mode-description">
                {mode === "demo"
                  ? "Curated, scripted fixtures. No Qloo API calls."
                  : "Real Qloo recommendations. Keys stay on the server."}
              </span>
            </div>
            <div className="segmented mode-control" aria-label="Data mode">
              <button
                aria-pressed={mode === "demo"}
                className={mode === "demo" ? "selected" : ""}
                disabled={loading}
                onClick={() => changeMode("demo")}
              >
                Demo
              </button>
              <button
                aria-pressed={mode === "live"}
                className={mode === "live" ? "selected" : ""}
                disabled={loading || !config?.liveAvailable}
                title={
                  config?.liveAvailable
                    ? "Use real Qloo API"
                    : "Set QLOO_API_KEY on the server to enable"
                }
                onClick={() => changeMode("live")}
              >
                Live Qloo{" "}
                {!config?.liveAvailable && <span aria-hidden="true">↗</span>}
              </button>
            </div>
          </div>
          {!config?.liveAvailable && (
            <p className="config-note">
              Live mode needs a server-side Qloo API key. The demo is ready to
              explore; never paste credentials here.
            </p>
          )}
          {configError && (
            <div role="alert" className="alert error">
              Could not reach the server: {configError}{" "}
              <button onClick={fetchConfig}>Retry connection</button>
            </div>
          )}
          <div className="profiles-grid">
            {profiles.map((profile, index) => (
              <ProfileEditor
                key={`${mode}-${resetVersion}-${index}`}
                index={index}
                profile={profile}
                mode={mode}
                maxSeeds={config?.maxSeeds ?? 5}
                disabled={loading || !config}
                onChange={(next) => {
                  setProfiles((current) =>
                    index === 0 ? [next, current[1]] : [current[0], next],
                  );
                  invalidate();
                }}
              />
            ))}
            <div className="between-profiles" aria-hidden="true">
              &
            </div>
          </div>
          <div className="session-controls">
            <div className="control-group">
              <label id="duration-label">Make a little time</label>
              <div className="segmented" aria-labelledby="duration-label">
                {([30, 60, 90] as const).map((value) => (
                  <button
                    key={value}
                    disabled={loading}
                    aria-pressed={minutes === value}
                    className={minutes === value ? "selected" : ""}
                    onClick={() => {
                      setMinutes(value);
                      invalidate();
                    }}
                  >
                    {value} <span>min</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label id="focus-label">Choose your approach</label>
              <div className="segmented" aria-labelledby="focus-label">
                <button
                  disabled={loading}
                  aria-pressed={focus === "balanced"}
                  className={focus === "balanced" ? "selected" : ""}
                  onClick={() => {
                    setFocus("balanced");
                    invalidate();
                  }}
                >
                  Find a balance
                </button>
                <button
                  disabled={loading}
                  aria-pressed={focus === "adventurous"}
                  className={focus === "adventurous" ? "selected" : ""}
                  onClick={() => {
                    setFocus("adventurous");
                    invalidate();
                  }}
                >
                  Take a detour
                </button>
              </div>
            </div>
            <button
              className="primary-button"
              disabled={!ready}
              onClick={() => generate()}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Finding the connection…
                </>
              ) : (
                <>
                  Build our session <Arrow />
                </>
              )}
            </button>
          </div>
          <p className="session-footnote">
            A guided tasting, not a full movie or book. Activity times are
            planning suggestions.
          </p>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <span>
                Your selections are still here. Adjust them or try again.
              </span>
            </div>
          )}
          <p className="request-status" role="status">
            {status}
          </p>
          {loading && (
            <div className="loading-panel" role="status">
              <span className="spinner" />
              <div>
                <strong>Looking for a place to meet.</strong>
                <p>
                  Comparing cultural candidates, checking both perspectives, and
                  fitting your time.
                </p>
              </div>
              <button className="cancel-button" onClick={cancelPlan}>
                Cancel planning
              </button>
            </div>
          )}
        </section>
        {plan ? (
          <section
            ref={resultRef}
            className="results"
            aria-labelledby="results-title"
            aria-busy={loading}
          >
            <div className="section-heading">
              <div>
                <span className="eyebrow">02 / YOUR SHARED SESSION</span>
                <h2 id="results-title" tabIndex={-1} ref={resultTitleRef}>
                  A small departure from the usual.
                </h2>
                <p>
                  {plan.totalMinutes} minutes · {plan.steps.length} cultural
                  stops ·{" "}
                  {plan.source === "curated-demo"
                    ? "Scripted demo results"
                    : "Live Qloo recommendations"}
                </p>
              </div>
              <div className="export-buttons">
                <button disabled={loading} onClick={() => download("txt")}>
                  ↓ Save session
                </button>
                <button
                  disabled={loading}
                  onClick={() => download("json")}
                  aria-label="Export session and provenance as JSON"
                >
                  JSON ↗
                </button>
              </div>
            </div>
            {plan.warnings.map((warning, i) => (
              <div className="alert warning" key={i}>
                {warning}
              </div>
            ))}
            {excluded.length > 0 && (
              <div className="feedback-note">
                <span>
                  {excluded.length} suggestion{excluded.length === 1 ? "" : "s"}{" "}
                  set aside in this session.
                </span>
                <button disabled={loading} onClick={() => generate([])}>
                  Reconsider skipped picks
                </button>
              </div>
            )}
            <div className="plan-grid">
              {plan.steps.map((step, i) => (
                <article
                  key={step.entity.id}
                  className={`plan-card plan-${step.entity.type}`}
                >
                  <div className="card-visual" aria-hidden="true">
                    <div className="visual-number">0{i + 1}</div>
                    <div className={`domain-art ${step.entity.type}`}>
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <span>
                      {step.entity.type === "artist"
                        ? "LISTEN / CONNECT"
                        : step.entity.type === "movie"
                          ? "WATCH / WONDER"
                          : "READ / REFLECT"}
                    </span>
                  </div>
                  <div className="plan-card-body">
                    <div className="card-category">
                      <span>
                        <DomainIcon type={step.entity.type} />
                        {TYPE_NAMES[step.entity.type]}
                      </span>
                      <span>{step.minutes} min</span>
                    </div>
                    <h3>{step.entity.name}</h3>
                    {step.entity.disambiguation && (
                      <p className="entity-disambiguation">
                        {step.entity.disambiguation}
                      </p>
                    )}
                    <p className="activity">{step.activity}</p>
                    <RankSupport candidate={step.entity} />
                    <p className="selection-reason">{step.entity.reason}</p>
                    <div className="conversation">
                      <span>TAKE IT TOGETHER</span>
                      <p>“{step.prompt}”</p>
                    </div>
                    <details className="alternatives">
                      <summary>
                        Explore {step.alternatives.length} alternative
                        {step.alternatives.length === 1 ? "" : "s"}{" "}
                        <span>＋</span>
                      </summary>
                      {step.alternatives.length ? (
                        step.alternatives.map((candidate) => (
                          <div className="alternative" key={candidate.id}>
                            <strong>{candidate.name}</strong>
                            {candidate.disambiguation && (
                              <p className="entity-disambiguation">
                                {candidate.disambiguation}
                              </p>
                            )}
                            <RankSupport candidate={candidate} />
                            <p>{candidate.reason}</p>
                          </div>
                        ))
                      ) : (
                        <p>No more candidates met the current constraints.</p>
                      )}
                    </details>
                    <button
                      className="replan-button"
                      disabled={loading}
                      onClick={() => generate([...excluded, step.entity.id])}
                    >
                      Not for us. Find another <Arrow />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <div className="methodology">
              <div>
                <span className="eyebrow">THE REASONING, OPEN TO YOU</span>
                <h3>A bridge with a paper trail.</h3>
                <p>{plan.methodology}</p>
                <p className="small-note">
                  List ranks are evidence of returned recommendations, not a
                  probability of liking something. Conversation prompts and
                  activity times are app-authored.
                </p>
              </div>
              <button
                className="trace-toggle"
                aria-expanded={showTrace}
                aria-controls="agent-trace"
                onClick={() => setShowTrace(!showTrace)}
              >
                {showTrace ? "Hide" : "View"} agent steps{" "}
                <span>{showTrace ? "−" : "+"}</span>
              </button>
            </div>
            {showTrace && (
              <ol id="agent-trace" className="trace-list">
                {plan.trace.map((event, index) => (
                  <li key={index}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{event.node.replaceAll("_", " ")}</strong>
                      <p>{event.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : (
          <section
            className="how-it-works"
            aria-label="How Common Ground works"
          >
            <div>
              <span>01</span>
              <h3>Start with what you love.</h3>
              <p>
                A film, an artist, a book. Small clues from two different
                worlds.
              </p>
            </div>
            <div>
              <span>02</span>
              <h3>Let culture connect the dots.</h3>
              <p>
                In live mode, Qloo finds candidates across domains. Our agent
                compares support for both people.
              </p>
            </div>
            <div>
              <span>03</span>
              <h3>Try something. Then adjust.</h3>
              <p>
                Explore a short session together. Rule out a pick and let the
                agent find a new direction.
              </p>
            </div>
          </section>
        )}
      </main>
      <footer>
        <div className="footer-brand">
          common ground<span>.</span>
        </div>
        <p>Culture is better with company.</p>
        <div>
          <span>Built for the Qloo Agentic Hackathon</span>
          <span>
            No account. No saved taste profile. Exports stay with you.
          </span>
        </div>
      </footer>
    </div>
  );
}
