import { Camera, Building2, Instagram, ArrowDown, ArrowRight, CheckCircle } from 'lucide-react';

const SOURCES = [
  { icon: Camera, label: 'Street View', sub: 'Image file', color: 'text-blue-400' },
  { icon: Building2, label: 'City Registry', sub: 'Business data', color: 'text-emerald-400' },
  { icon: Instagram, label: 'Instagram', sub: 'Social posts', color: 'text-pink-400' },
];

const PROCESSES = [
  'AI Vision Analysis',
  'Data Lookup',
  'Geo-tag Analysis',
];

const RESULTS = [
  'Storefront detected: vintage clothing',
  'Business license found',
  '3 posts tagged',
];

export default function SignalFusion() {
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-white">Signal Fusion Pipeline</h2>
        <span className="text-xs font-semibold text-primary border border-primary rounded-full px-3 py-1">
          Multi-Signal
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-8">
        How StreetTrade combines multiple data sources to verify businesses
      </p>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Left column: sources -> process -> results */}
        <div className="flex-1 space-y-5">
          {/* Source cards */}
          <div className="grid grid-cols-3 gap-3">
            {SOURCES.map(({ icon: Icon, label, sub, color }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 rounded-xl border border-surface-border bg-surface-light p-4 text-center"
              >
                <Icon className={`w-6 h-6 ${color}`} />
                <span className="text-sm font-medium text-white">{label}</span>
                <span className="text-[11px] text-gray-500">{sub}</span>
              </div>
            ))}
          </div>

          {/* Arrow down */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1 text-primary">
              <ArrowDown className="w-5 h-5" />
              <ArrowDown className="w-5 h-5" />
              <ArrowDown className="w-5 h-5" />
            </div>
          </div>

          {/* Process cards */}
          <div className="grid grid-cols-3 gap-3">
            {PROCESSES.map((label) => (
              <div
                key={label}
                className="flex items-center justify-center rounded-xl bg-primary/15 border border-primary/30 px-3 py-3 text-center"
              >
                <span className="text-sm font-semibold text-primary">{label}</span>
              </div>
            ))}
          </div>

          {/* Result labels */}
          <div className="grid grid-cols-3 gap-3">
            {RESULTS.map((text) => (
              <div
                key={text}
                className="rounded-lg bg-surface-lighter px-3 py-2.5 text-center"
              >
                <span className="text-xs text-gray-400">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow right */}
        <div className="hidden lg:flex flex-col items-center gap-1 text-primary px-2">
          <ArrowRight className="w-6 h-6" />
        </div>
        <div className="flex lg:hidden items-center gap-1 text-primary">
          <ArrowDown className="w-6 h-6" />
        </div>

        {/* Fused result card */}
        <div className="w-full lg:w-56 shrink-0 rounded-2xl border border-primary/40 bg-surface-light p-5 shadow-[0_0_24px_rgba(232,140,10,0.12)]">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
            Fused Result
          </p>

          {/* Confidence */}
          <p className="text-xs text-gray-400 mb-1">Confidence</p>
          <p className="text-4xl font-extrabold text-primary leading-none mb-3">91%</p>

          {/* Business name */}
          <p className="text-base font-semibold text-white mb-3">Rose &amp; Thorn Vintage</p>

          {/* Verified badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">Verified Business</span>
          </div>
        </div>
      </div>
    </div>
  );
}
