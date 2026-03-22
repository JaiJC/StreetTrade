import { categoryEmoji, friendlySource } from "../lib/categories";

function confidenceColor(confidencePercent) {
  if (confidencePercent > 80) return "bg-green-500";
  if (confidencePercent >= 50) return "bg-yellow-400";
  return "bg-slate-400";
}

export default function ResultCard({ business, distanceKm, isSelected, onSelect }) {
  const confidencePercent = Math.round(business.confidence * 100);
  const emoji = categoryEmoji(business.category);
  const source = friendlySource(business.source);

  return (
    <article
      onClick={() => onSelect?.(business.id)}
      className={`cursor-pointer space-y-3 rounded-2xl border bg-white p-4 shadow-sm transition ${
        isSelected ? "border-amber-300 ring-2 ring-amber-200" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm">
            {emoji}
          </span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{business.name}</h3>
            <p className="text-sm text-slate-500">{business.category}</p>
          </div>
        </div>
        {!business.already_on_google ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
            ✨ Not on Google
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Also on Google
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <span>{distanceKm.toFixed(1)} km away</span>
        <span>•</span>
        <span>{business.address}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="w-full">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>AI confidence: {confidencePercent}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100">
            <div
              className={`h-1.5 rounded-full ${confidenceColor(confidencePercent)}`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
        </div>
        <span className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
          {source}
        </span>
      </div>
    </article>
  );
}
