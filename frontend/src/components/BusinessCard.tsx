import { Camera, Smartphone, Sparkles, MapPin } from 'lucide-react';
import type { Business } from '../data/types';

interface BusinessCardProps {
  business: Business;
  isSelected: boolean;
  onClick: () => void;
}

const sourceConfig = {
  street_view: { icon: Camera, label: 'Street View' },
  social_media: { icon: Smartphone, label: 'Social Media' },
  both: { icon: Sparkles, label: 'Multi-Source' },
} as const;

export default function BusinessCard({ business, isSelected, onClick }: BusinessCardProps) {
  const { icon: SourceIcon, label: sourceLabel } = sourceConfig[business.source];
  const confidencePct = Math.round(business.confidence * 100);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group cursor-pointer ${
        isSelected
          ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10'
          : 'bg-surface-light border-surface-lighter hover:border-gray-500 hover:shadow-md hover:shadow-black/20'
      }`}
    >
      {/* Top row: name + exclusive badge */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3
          className={`font-semibold text-sm leading-tight ${
            isSelected ? 'text-primary-light' : 'text-white group-hover:text-primary-light'
          } transition-colors`}
        >
          {business.name}
        </h3>
        {!business.onGoogle ? (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-semibold uppercase tracking-wide">
            Exclusive
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 text-[10px] font-medium">
            On Google
          </span>
        )}
      </div>

      {/* Category */}
      <p className="text-xs text-gray-400 capitalize mb-2">{business.category}</p>

      {/* Address */}
      <div className="flex items-center gap-1.5 mb-3">
        <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
        <p className="text-xs text-gray-500 truncate">{business.address}</p>
      </div>

      {/* Bottom row: confidence bar + source */}
      <div className="flex items-center gap-3">
        {/* Confidence bar */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
              Confidence
            </span>
            <span className="text-[10px] font-semibold text-primary">{confidencePct}%</span>
          </div>
          <div className="h-1.5 w-full bg-surface-lighter rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${confidencePct}%`,
                background: `linear-gradient(90deg, #059669, #10b981, #34d399)`,
              }}
            />
          </div>
        </div>

        {/* Source badge */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-lighter text-gray-400">
          <SourceIcon className="w-3 h-3" />
          <span className="text-[10px] font-medium whitespace-nowrap">{sourceLabel}</span>
        </div>
      </div>
    </button>
  );
}
