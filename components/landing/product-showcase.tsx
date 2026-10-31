"use client";
import { useState, useEffect, useSyncExternalStore, useRef } from "react";
import { SectionHeading } from "./section-heading";
import { ShowcaseDashboard } from "./showcase-dashboard";
import { ShowcaseOrders, type OrderFilter } from "./showcase-orders";
import { ShowcaseDeliveries } from "./showcase-deliveries";
import { SHOWCASE_TABS, type ShowcaseTab } from "./showcase-data";
import s from "./landing.module.css";
function subscribeMotion(callback: () => void) {
  const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  query?.addEventListener("change", callback);
  return () => query?.removeEventListener("change", callback);
}
const getMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
export function ProductShowcase() {
  const [tab, setTab] = useState<ShowcaseTab>("dashboard"),
    [picked, setPicked] = useState(false),
    [filter, setFilter] = useState<OrderFilter>("all"),
    [openDriver, setOpenDriver] = useState<string | null>("koffi");
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [tab]);
  const reduced = useSyncExternalStore(subscribeMotion, getMotion, () => true);
  const active = SHOWCASE_TABS.find((t) => t.key === tab)!;
  useEffect(() => {
    if (picked || reduced) return;
    const timer = setInterval(
      () =>
        setTab(
          (t) =>
            SHOWCASE_TABS[
              (SHOWCASE_TABS.findIndex((x) => x.key === t) + 1) %
                SHOWCASE_TABS.length
            ].key,
        ),
      6000,
    );
    return () => clearInterval(timer);
  }, [picked, reduced]);
  function select(key: ShowcaseTab) {
    setPicked(true);
    setTab(key);
  }
  return (
    <section
      onFocusCapture={() => setPicked(true)}
      id="produit"
      data-testid="section-product-showcase"
      className={`${s.section} bg-white`}
    >
      <div className={s.wrap}>
        <SectionHeading
          eyebrow="Le produit"
          title="Voici Warko, tel que vous l’utiliserez."
          description="Les écrans de Warko. Touchez un onglet pour explorer."
        />
        <div
          role="tablist"
          aria-label="Écrans de l’application"
          data-testid="showcase-tabs"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
        >
          {SHOWCASE_TABS.map((t, i) => (
            <button
              type="button"
              key={t.key}
              role="tab"
              id={`showcase-tab-${t.key}`}
              data-testid={`showcase-tab-${t.key}`}
              data-track="showcase_tab"
              data-track-value={t.key}
              aria-selected={t.key === tab}
              aria-controls="showcase-panel"
              tabIndex={t.key === tab ? 0 : -1}
              onClick={() => select(t.key)}
              onKeyDown={(e) => {
                const next =
                  e.key === "ArrowRight"
                    ? (i + 1) % 3
                    : e.key === "ArrowLeft"
                      ? (i + 2) % 3
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? 2
                          : null;
                if (next !== null) {
                  e.preventDefault();
                  select(SHOWCASE_TABS[next].key);
                  document
                    .getElementById(`showcase-tab-${SHOWCASE_TABS[next].key}`)
                    ?.focus();
                }
              }}
              className={`relative min-h-12 shrink-0 overflow-hidden whitespace-nowrap rounded-xl border px-4 text-sm font-semibold ${t.key === tab ? "border-[#12142a] bg-[#12142a] text-white" : "border-[#e4e4ee] bg-white text-[#3b3f5c]"}`}
            >
              {t.label}
              {t.key === tab && !picked && !reduced && (
                <span key={tab} className={s.progress} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <div className={`${s.showcaseCaptions} mt-4`}>
          {SHOWCASE_TABS.map((t) => (
            <p
              key={t.key}
              data-showcase-caption={t.key}
              aria-hidden={t.key !== tab}
              className={`min-h-12 text-sm leading-relaxed text-[#545873] ${t.key === tab ? s.fade : "invisible"}`}
            >
              {t.caption}
            </p>
          ))}
        </div>
        <div
          data-testid="showcase-device"
          className={`${s.reveal} mt-5 overflow-hidden rounded-[20px] border border-[#d8d9e6] shadow-[0_20px_60px_#0e102012]`}
          onClickCapture={() => setPicked(true)}
        >
          <div className="flex items-center gap-4 border-b border-gray-200 bg-[#f6f6fa] px-4 py-3">
            <div aria-hidden="true" className="flex gap-1.5">
              {["#fca5a5", "#fcd34d", "#86efac"].map((color) => (
                <span
                  key={color}
                  className="h-2 w-2 rounded-full"
                  style={{ background: color }}
                />
              ))}
            </div>
            <span className="mx-auto truncate text-[11px] text-gray-500">
              warko.app{active.path}
            </span>
          </div>
          <div
            className={`${s.showcaseViewport} grid min-w-0 lg:grid-cols-[210px_minmax(0,1fr)]`}
          >
            <aside
              aria-hidden="true"
              className="hidden flex-col gap-1 border-r border-gray-200 bg-white p-4 lg:flex"
            >
              <p
                className={`${s.heading} mb-5 flex items-center gap-2 text-xl font-bold`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#4f46e5] text-base text-white">
                  W
                </span>
                Warko
              </p>
              {[
                "Tableau de bord",
                "Commandes",
                "Livraisons",
                "Produits",
                "Analyses",
                "Dépenses",
                "Objectifs & lives",
                "Bilans mensuels",
                "Équipe",
              ].map((label) => (
                <span
                  key={label}
                  className={`rounded-xl px-3 py-2.5 text-xs ${label === (tab === "deliveries" ? "Livraisons" : active.label) ? "bg-[#eef2ff] font-semibold text-[#4338ca]" : "text-gray-600"}`}
                >
                  {label}
                </span>
              ))}
            </aside>
            <div
              ref={panelRef}
              onScroll={() => setPicked(true)}
              role="tabpanel"
              id="showcase-panel"
              aria-labelledby={`showcase-tab-${tab}`}
              tabIndex={0}
              className="min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-[#f9fafb] p-3 sm:p-5 lg:p-6"
            >
              {tab === "dashboard" ? (
                <ShowcaseDashboard />
              ) : tab === "orders" ? (
                <ShowcaseOrders filter={filter} onFilter={setFilter} />
              ) : (
                <ShowcaseDeliveries
                  openDriver={openDriver}
                  onToggle={(key) =>
                    setOpenDriver(openDriver === key ? null : key)
                  }
                />
              )}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="flex justify-around border-t border-gray-200 bg-white px-1 py-3 lg:hidden"
          >
            {["Tableau", "Commandes", "Livraisons", "Produits"].map(
              (label, i) => (
                <span
                  key={label}
                  className={`flex flex-col items-center gap-2 text-[10px] ${i === SHOWCASE_TABS.findIndex((t) => t.key === tab) ? "font-bold text-[#4f46e5]" : "text-gray-500"}`}
                >
                  <span
                    className={`h-1 w-5 rounded-full ${i === SHOWCASE_TABS.findIndex((t) => t.key === tab) ? "bg-[#4f46e5]" : ""}`}
                  />
                  {label}
                </span>
              ),
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-[#545873]">
          Noms et montants d’exemple. Aucune donnée réelle n’est affichée.
        </p>
      </div>
    </section>
  );
}
