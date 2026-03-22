import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Business } from '../data/types';

interface BusinessCardProps {
  business: Business;
  isSelected: boolean;
  onClick: () => void;
}

const sourceTagStyles: Record<string, { bg: string; text: string; label: string }> = {
  street_view: { bg: 'bg-teal-500/20', text: 'text-teal-400', label: 'Street View' },
  social_media: { bg: 'bg-pink-500/20', text: 'text-pink-400', label: 'Inst' },
  both: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Registry' },
};

export default function BusinessCard({ business, isSelected, onClick }: BusinessCardProps) {
  const navigate = useNavigate();
  const confidencePct = Math.round(business.confidence * 100);
  const sourceTag = sourceTagStyles[business.source];

  const handleClick = () => {
    onClick();
    navigate(`/business/${business.id}`);
  };

  // Build source tags array for multi-source display
  const tags: { bg: string; text: string; label: string }[] = [];
  if (business.source === 'both') {
    tags.push(sourceTagStyles.street_view);
    tags.push(sourceTagStyles.both);
    tags.push(sourceTagStyles.social_media);
  } else {
    tags.push(sourceTag);
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group cursor-pointer ${
        isSelected
          ? 'bg-[#0f1724] border-[#e88c0a] shadow-lg shadow-[#e88c0a]/10'
          : 'bg-[#0f1724] border-[#1e2a3a] hover:border-[#2a3a4a]'
      }`}
    >
      {/* Row 1: Name + Confidence % */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-bold text-sm text-white leading-tight">
          {business.name}
        </h3>
        <span className="shrink-0 text-sm font-bold text-[#e88c0a]">
          {confidencePct}%
        </span>
      </div>

      {/* Row 2: Description */}
      <p className="text-xs text-gray-500 leading-relaxed mb-2.5 line-clamp-2">
        {business.description}
      </p>

      {/* Row 3: Source tags */}
      <div className="flex items-center gap-1.5 mb-2.5">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tag.bg} ${tag.text}`}
          >
            {tag.label}
          </span>
        ))}
      </div>

      {/* Row 4: Address + distance */}
      <div className="flex items-center gap-1.5 mb-3">
        <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
        <p className="text-xs text-gray-500 truncate">{business.address}</p>
        <span className="text-xs text-gray-600 shrink-0 ml-auto">0.3 km</span>
      </div>

      {/* Row 5: Confidence progress bar */}
      <div className="h-1 w-full bg-[#1a2332] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-[#e88c0a]"
          style={{ width: `${confidencePct}%` }}
        />
      </div>
    </button>
  );
}
