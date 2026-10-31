import { STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { formatAmount } from "@/lib/utils";
import { SHOWCASE_DRIVERS, deliveryTotals } from "./showcase-data";
import { LandingIcon } from "./landing-icons";
import s from "./landing.module.css";
export function ShowcaseDeliveries({
  openDriver,
  onToggle,
}: {
  openDriver: string | null;
  onToggle: (key: string) => void;
}) {
  return (
    <div
      data-testid="showcase-screen-deliveries"
      className={`${s.fade} space-y-4`}
    >
      <h3 className="text-xl font-bold">Bilan du jour</h3>
      <p className="text-xs text-gray-500">
        Colis confiés aux livreurs à la date de tournée sélectionnée (heure
        d’Abidjan).
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-xl bg-[#4f46e5] px-3 py-2 text-white">
          Aujourd’hui
        </span>
        <span className="rounded-xl border border-gray-200 bg-white px-3 py-2">
          Hier
        </span>
        <span className="rounded-xl border border-gray-200 bg-white px-3 py-2">
          29/10/2026
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-gray-500">
        À remettre attendu : produits livrés après remises et acomptes conservés
        par la boutique, hors frais de livraison. Le reste dû global est le
        solde actuel, toutes dates confondues.
      </p>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <p className="mb-3 text-xs font-bold">Total de la journée</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["À remettre attendu", deliveryTotals.expected],
            ["Encaissé", deliveryTotals.collected],
            ["Reversé", deliveryTotals.remitted],
            ["Reste dû global", deliveryTotals.due],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] text-gray-500">{label}</p>
              <p
                className={`mt-1 text-sm font-bold ${label === "Reste dû global" ? "text-[#b45309]" : "text-[#4338ca]"}`}
              >
                {formatAmount(Number(value))} FCFA
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden grid-cols-[2fr_repeat(4,1fr)_1.5fr] gap-2 px-3 text-[10px] text-gray-500 lg:grid">
        <span>Livreur</span>
        {[
          "Livrés",
          "En cours",
          "Annulés",
          "Reportés",
          "À remettre attendu",
        ].map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      {SHOWCASE_DRIVERS.map((d) => {
        const open = openDriver === d.key;
        return (
          <article
            key={d.key}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <div className="grid gap-3 p-3 lg:grid-cols-[2fr_repeat(4,1fr)_1.5fr] lg:items-center lg:gap-2">
              <button
                data-testid={`showcase-driver-${d.key}`}
                type="button"
                aria-expanded={open}
                aria-controls={`showcase-tour-${d.key}`}
                onClick={() => onToggle(d.key)}
                className="flex min-h-11 items-center gap-2 text-left text-sm font-semibold text-[#4338ca]"
              >
                {d.name}
                <LandingIcon
                  name="chevron"
                  width={14}
                  height={14}
                  className={open ? "rotate-180" : ""}
                />
              </button>
              {[
                ["Livrés", d.delivered],
                ["En cours", d.progress],
                ["Annulés", d.cancelled],
                ["Reportés", d.postponed],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between text-xs lg:block"
                >
                  <span className="text-gray-500 lg:hidden">{label}</span>
                  <b>{value}</b>
                </div>
              ))}
              <strong className="text-right text-xs text-[#4338ca]">
                {formatAmount(d.collected - d.fees)} FCFA
              </strong>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-gray-100 p-3 md:grid-cols-4">
              {[
                ["Encaissé sur la tournée", d.collected],
                ["Frais retenus", d.fees],
                ["Reversé à cette date", d.remitted],
                ["Reste dû global actuel", d.due],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] text-gray-500">{label}</dt>
                  <dd
                    className={`mt-1 text-xs font-semibold ${label === "Reste dû global actuel" ? (d.due ? "text-[#b45309]" : "text-[#166534]") : ""}`}
                  >
                    {formatAmount(Number(value))} FCFA
                  </dd>
                </div>
              ))}
            </dl>
            {open && (
              <div
                id={`showcase-tour-${d.key}`}
                className={`${s.fade} border-t border-gray-100 bg-gray-50 p-3`}
              >
                <h4 className="mb-1 text-xs font-semibold">
                  Commandes de la tournée
                </h4>
                <p className="mb-3 text-[10px] text-gray-500">
                  Extrait de la tournée · commandes d’exemple.
                </p>
                <div className="grid gap-2 md:grid-cols-2">
                  {d.orders.map((o) => (
                    <div
                      key={o.client}
                      className="rounded-xl border border-gray-200 bg-white p-3 text-xs"
                    >
                      <div className="flex flex-wrap justify-between gap-2">
                        <b>{o.client}</b>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] ${STATUS_COLORS[o.status]}`}
                        >
                          {STATUS_LABELS[o.status]}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-gray-500">
                        {o.phone}
                      </p>
                      <p className="mt-3 text-gray-700">{o.products}</p>
                      <p className="mt-2 font-semibold text-[#4338ca]">
                        {o.status === "in_progress"
                          ? "À remettre si livré"
                          : "À remettre"}{" "}
                        : {formatAmount(o.amount)} FCFA
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  {d.delivered +
                    d.progress +
                    d.cancelled +
                    d.postponed -
                    d.orders.length}{" "}
                  autres commandes sur cette tournée
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
