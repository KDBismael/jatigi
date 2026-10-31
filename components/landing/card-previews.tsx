import { STATUS_LABELS, STATUS_COLORS, STATUSES } from "@/lib/constants";
import { formatAmount } from "@/lib/utils";
import { SHOWCASE_DRIVERS } from "./showcase-data";
const panel =
  "mb-4 flex flex-col gap-2 rounded-xl bg-[#f6f6fa] p-3.5 text-sm text-[#3b3f5c]";
function Row({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3 ${strong ? "border-t border-[#e4e4ee] pt-2 font-bold" : ""}`}
    >
      <span>{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}
export function ProblemPreview({ kind }: { kind: string }) {
  if (kind === "money")
    return (
      <div
        className={`${panel} border border-[#fde68a] !bg-[#fffbeb] !text-[#78350f]`}
      >
        <Row
          label="Koffi a encaissé"
          value={formatAmount(SHOWCASE_DRIVERS[0].collected)}
        />
        <Row label="Frais" value={formatAmount(SHOWCASE_DRIVERS[0].fees)} />
        <Row
          label="Déjà donné"
          value={
            <>
              <s className="mr-2">50 000</s> 60 000 ?
            </>
          }
        />
        <Row strong label="Il reste" value="?" />
      </div>
    );
  if (kind === "disputes")
    return (
      <div className={`${panel} leading-snug`}>
        <p className="max-w-[90%] self-end rounded-xl bg-[#4f46e5] px-3 py-2 text-white">
          Tu me dois encore 28 000.
        </p>
        <p className="max-w-[90%] self-start rounded-xl border border-[#e4e4ee] bg-white px-3 py-2">
          Non, je t’ai tout donné hier soir.
        </p>
      </div>
    );
  return (
    <div className={panel}>
      <Row label="Ventes du mois" value="3 480 000" />
      <Row label="Pub, transport, emballage" value="?" />
      <Row
        strong
        label="Bénéfice"
        value={<span className="text-[#b45309]">Aucune idée</span>}
      />
    </div>
  );
}
export function FeaturePreview({ kind }: { kind: string }) {
  if (kind === "orders")
    return (
      <div className={`${panel} !flex-row flex-wrap gap-1.5`}>
        {STATUSES.map((status) => (
          <span
            key={status}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        ))}
      </div>
    );
  if (kind === "riders")
    return (
      <div className={panel}>
        <Row
          label="29/10 · 19:42"
          value={
            <strong className="text-[#166534]">
              + {formatAmount(SHOWCASE_DRIVERS[0].remitted)} FCFA
            </strong>
          }
        />
        <Row
          label="Koffi"
          value={<span className="text-xs text-[#545873]">saisi par Awa</span>}
        />
      </div>
    );
  if (kind === "stock")
    return (
      <div className={panel}>
        <Row
          label="Lot du 12/10"
          value={<span className="font-semibold text-[#166534]">+ 24</span>}
        />
        <Row label="Commande Aïcha K." value="− 2" />
        <Row strong label="Sérum éclat en stock" value="22" />
      </div>
    );
  if (kind === "live") {
    const amount = 142000,
      goal = 200000,
      progress = Math.round((amount / goal) * 100);
    return (
      <div className={panel}>
        <Row
          label="Live du soir"
          value={
            <span className="rounded-full bg-[#dcfce7] px-2 py-1 text-xs font-semibold text-[#166534]">
              En cours
            </span>
          }
        />
        <Row
          label={`${formatAmount(amount)} / ${formatAmount(goal)} FCFA`}
          value={<strong className="text-[#4338ca]">{progress} %</strong>}
        />
        <div className="h-2 overflow-hidden rounded-full bg-[#e4e4ee]">
          <div
            className="h-full rounded-full bg-[#4f46e5]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }
  if (kind === "expenses")
    return (
      <div className={panel}>
        <Row label="Publicité" value="180 000" />
        <Row label="Transport" value="65 000" />
        <Row label="Autres catégories" value="165 000" />
        <Row strong label="Dépenses d’octobre" value="410 000" />
      </div>
    );
  return (
    <div className={`${panel} !flex-row flex-wrap`}>
      {["Bon A4", "Ticket 80 mm", "Ticket 58 mm", "Excel", "Google Sheets"].map(
        (text) => (
          <span
            key={text}
            className="rounded-xl border border-[#e4e4ee] bg-white px-2.5 py-1.5 text-xs font-semibold"
          >
            {text}
          </span>
        ),
      )}
    </div>
  );
}
