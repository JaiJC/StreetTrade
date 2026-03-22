export default function RadiusSlider({ radiusKm, onChange }) {
  const min = 0.5;
  const max = 10;
  const percent = ((radiusKm - min) / (max - min)) * 100;

  let walkLabel = "driving distance";
  if (radiusKm < 1) {
    walkLabel = "~12 min walk";
  } else if (radiusKm <= 2) {
    walkLabel = "~20 min walk";
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <label htmlFor="radius" className="text-sm font-medium text-slate-700">
          Search radius
        </label>
        <span className="text-xs text-slate-500">{walkLabel}</span>
      </div>
      <div className="relative pt-6">
        <span
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
          style={{ left: `${percent}%` }}
        >
          {radiusKm.toFixed(1)} km
        </span>
        <input
          id="radius"
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={radiusKm}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-full accent-streettrade-accent"
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
        <span>0.5 km</span>
        <span>10 km</span>
      </div>
    </div>
  );
}
