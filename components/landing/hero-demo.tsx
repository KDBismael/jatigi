"use client";
import { useState } from "react";
import { formatAmount } from "@/lib/utils";
import { SHOWCASE_DRIVERS, deliveryTotals } from "./showcase-data";
import s from "./landing.module.css";
export function HeroDemo() {
  const [settled, setSettled] = useState(false);
  const payment = settled ? SHOWCASE_DRIVERS[0].due : 0;
  return (
    <div
      data-testid="hero-demo"
      className={`${s.enter} ${s.delay3} relative mx-auto w-full max-w-[316px] pb-8`}
    >
      <div
        className={`${s.float} rounded-[36px] border-8 border-[#2a2d4f] bg-white px-4 pt-5 pb-[18px] text-[#12142a] shadow-[0_30px_80px_#0007]`}
        role="group"
        aria-label="Démo interactive : bilan du jour d’une boutique (exemple)"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-[#545873]">Bilan du jour</p>
            <p className="mt-1 text-lg font-bold text-[#12142a]">
              Jeudi 29 octobre
            </p>
          </div>
          <span className="rounded-full bg-[#eef0ff] px-2 py-1 text-[11px] font-semibold text-[#4338ca]">
            Exemple
          </span>
        </div>
        <div className={`${s.glow} rounded-[20px] bg-[#0e1020] p-4`}>
          <p className="text-xs text-[#a9add0]">Reste dû ce soir</p>
          <p
            data-testid="hero-demo-due"
            className="my-2 flex flex-wrap items-baseline gap-2 text-[#fbbf24]"
          >
            <strong
              key={String(settled)}
              className={`${s.heading} ${settled ? s.bump : ""} text-[32px] font-extrabold leading-none`}
            >
              {formatAmount(deliveryTotals.due - payment)}
            </strong>
            <span className="text-base font-semibold text-white">FCFA</span>
          </p>
          <div className="mt-4 flex flex-wrap justify-between gap-2 text-[11px] text-[#c4bdd0]">
            <span>Encaissé {formatAmount(deliveryTotals.collected)}</span>
            <span>Reversé {formatAmount(deliveryTotals.remitted + payment)}</span>
          </div>
        </div>
        <div className="my-3 space-y-2">
          {SHOWCASE_DRIVERS.map((d, i) => {
            const paid = d.due === 0 || (i === 0 && settled);
            return (
              <div
                key={d.key}
                className="flex items-center gap-2.5 rounded-xl border border-[#e4e4ee] px-3 py-2.5"
              >
                <span
                  className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full text-xs font-bold ${paid ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fef3c7] text-[#92400e]"}`}
                >
                  {d.name.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#12142a]">
                    {d.name}
                  </p>
                  <p className="mt-1 text-[10px] text-[#545873]">
                    {d.delivered + d.progress + d.cancelled + d.postponed}{" "}
                    commandes · frais {formatAmount(d.fees)}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${paid ? "text-[#166534]" : "text-[#12142a]"}`}
                  >
                    {formatAmount(paid ? 0 : d.due)}
                  </p>
                  <p
                    className={`mt-1 text-[10px] ${paid ? "text-[#166534]" : "text-[#92400e]"}`}
                  >
                    {paid ? "Soldé" : "À réclamer"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          data-testid={settled ? "hero-demo-reset" : "hero-demo-settle"}
          data-track={settled ? "hero_demo_reset" : "hero_demo_settle"}
          onClick={() => setSettled(!settled)}
          className={`${s.button} ${settled ? "border border-[#e4e4ee] bg-white text-[#12142a]" : s.primary} w-full !px-2 !text-[13px]`}
        >
          {settled ? "Revoir la démo" : "Enregistrer le reversement de Koffi"}
        </button>
      </div>
      {settled ? (
        <div
          data-testid="hero-demo-toast"
          role="status"
          className={`${s.pop} absolute bottom-[104px] left-3 right-3 flex items-center gap-3 rounded-[20px] border border-green-200 bg-white p-4 text-sm text-[#166534] shadow-xl`}
        >
          <span>
            <b>28 000 FCFA enregistrés.</b>
            <br />
            Koffi est soldé. Tout est tracé.
          </span>
        </div>
      ) : (
        <div
          aria-hidden="true"
          className={`${s.pop} absolute bottom-[104px] left-3 right-3 flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-semibold text-[#166534] shadow-xl`}
        >
          Serge a reversé 55 000 FCFA
        </div>
      )}
    </div>
  );
}
