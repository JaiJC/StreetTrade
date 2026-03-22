import { MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Business } from '../data/types';

interface BusinessCardProps {
  business: Business;
  isSelected: boolean;
  onClick: () => void;
}

const categoryEmojis: Record<string, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  bakery: '🥐',
  retail: '🛍️',
  grocery: '🥬',
  salon: '💇',
  repair: '🔧',
  art: '🎨',
};

const sourceTagStyles: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  street_view: { bg: 'bg-teal-50', text: 'text-teal-600', label: 'Street View', emoji: '📷' },
  social_media: { bg: 'bg-pink-50', text: 'text-pink-600', label: 'Social', emoji: '📱' },
  both: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Registry', emoji: '📋' },
  registry: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Registry', emoji: '📋' },
};

export default function BusinessCard({ business, isSelected, onClick }: BusinessCardProps) {
  const navigate = useNavigate();
  const confidencePct = Math.round(business.confidence * 100);
  const sourceTag = sourceTagStyles[business.source];
  const emoji = categoryEmojis[business.category] || '📍';

  const handleClick = () => {
    onClick();
    navigate(`/business/${business.id}`);
  };

  // Build source tags array for multi-source display
  const tags: { bg: string; text: string; label: string; emoji: string }[] = [];
  if (business.source === 'both') {
    tags.push(sourceTagStyles.street_view);
    tags.push(sourceTagStyles.registry);
    tags.push(sourceTagStyles.social_media);
  } else if (business.source === 'street_view') {
    // Show Registry badge — most data comes from city registry
    tags.push(sourceTagStyles.registry);
  } else {
    tags.push(sourceTag);
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-white border-[#e88c0a] shadow-lg shadow-[#e88c0a]/10'
          : 'bg-white border-gray-100 hover:shadow-lg hover:shadow-gray-100'
      }`}
    >
      {/* Row 1: Emoji + Name + Confidence % */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-sm text-gray-900 leading-tight">
          <span className="mr-1.5">{emoji}</span>
          {business.name}
        </h3>
        <span className="shrink-0 text-sm font-semibold text-[#e88c0a]">
          {confidencePct}%
        </span>
      </div>

      {/* Row 2: Description */}
      <p className="text-xs text-gray-500 leading-relaxed mb-2.5 line-clamp-2 pl-6">
        {business.description}
      </p>

      {/* Row 3: Source tags + Hidden badge */}
      <div className="flex items-center gap-1.5 mb-2.5 pl-6">
        {tags.map((tag) => (
          <span
            key={tag.label}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tag.bg} ${tag.text}`}
          >
            {tag.emoji} {tag.label}
          </span>
        ))}
        {!business.onGoogle && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-[#e88c0a]">
            ✨ Hidden
          </span>
        )}
      </div>

      {/* Row 4: Address */}
      <div className="flex items-center gap-1.5 mb-3 pl-6">
        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
        <p className="text-xs text-gray-400 truncate">{business.address}</p>
      </div>

      {/* Row 5: Confidence progress bar */}
      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-[#e88c0a]"
          style={{ width: `${confidencePct}%` }}
        />
      </div>
    </button>
  );
}
