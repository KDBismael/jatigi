import { formatAmount } from "@/lib/utils";
import { deliveryTotals } from "./showcase-data";
import s from "./landing.module.css";
export function ShowcaseDashboard() {
  return (
    <div
      data-testid="showcase-screen-dashboard"
      className={`${s.fade} space-y-4`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Bonjour, Kouassi</h3>
          <p className="mt-1 text-xs text-gray-500">
            Bienvenue, voici l’ensemble de votre activité.
          </p>
        </div>
        <span className="rounded-xl bg-[#4f46e5] px-3 py-2 text-xs font-semibold text-white">
          Exporter en Excel
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[
          ["Chiffre d’affaires aujourd’hui", deliveryTotals.expected],
          ["Chiffre d’affaires ce mois", 3480000],
          ["Panier moyen", 11500],
          ["Bénéfice estimé", 1120000],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <p className="text-[11px] text-gray-500">{label}</p>
            <p className="mt-1 text-lg font-bold text-[#4f46e5]">
              {formatAmount(Number(value))}{" "}
              <span className="text-[10px] font-normal text-gray-500">
                FCFA
              </span>
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[#e0e7ff] bg-[#eef2ff] p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#4338ca]">
              Objectif mensuel
            </p>
            <p className="mt-1 text-xs text-gray-600">
              3 480 000 / 5 000 000 FCFA
            </p>
          </div>
          <span className="text-lg font-bold text-[#4338ca]">69,6 %</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e0e7ff]">
          <div
            className={`${s.fill} h-full w-[69.6%] rounded-full bg-[#4f46e5]`}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {[
          ["Commandes du mois", "312"],
          ["Livraisons effectuées", "268"],
          ["Commandes annulées", "19"],
          ["Dépenses", "410 000 FCFA"],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-gray-200 bg-white p-3"
          >
            <p className="text-[11px] text-gray-500">{label}</p>
            <p className="mt-1 text-lg font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap justify-between gap-2 text-xs font-semibold">
          <span>Évolution des ventes · Cette semaine</span>
          <span className="text-[#4f46e5]">● Ventes</span>
        </div>
        <div
          role="img"
          aria-label="Graphique d’exemple des ventes de la semaine, maximum le vendredi"
          className="flex h-40 items-end justify-around gap-3 border-b border-gray-100 px-2"
        >
          {[42, 58, 51, 74, 88, 66, 39].map((height, i) => (
            <div
              key={i}
              className="flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <div
                className={`${s.bar} w-full max-w-9 rounded-t-md ${i === 4 ? "bg-[#4f46e5]" : "bg-[#c7d2fe]"}`}
                style={{ height: `${height}%`, animationDelay: `${i * 0.06}s` }}
              />
              <span className="text-[10px] text-gray-500">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
