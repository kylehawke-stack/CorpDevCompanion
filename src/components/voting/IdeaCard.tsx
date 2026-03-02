import { useState } from 'react';
import { motion } from 'framer-motion';
import type { Idea } from '../../types/index.ts';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';

interface IdeaCardProps {
  idea: Idea;
  onSelect: () => void;
  side: 'left' | 'right';
}

/**
 * Render text with **bold** markdown support.
 */
function renderBoldText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-heading">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function IdeaCard({ idea, onSelect, side }: IdeaCardProps) {
  const [imgError, setImgError] = useState(false);
  const isCompany = idea.tier === 'specific_company';

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex-1"
    >
      <Card
        hoverable
        onClick={onSelect}
        className="p-6 h-full flex flex-col justify-between min-h-[200px] active:scale-[0.98] transition-transform"
      >
        <div>
          {/* Top row: badge + tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge tier={idea.tier} dimensionLabel={idea.dimension} linkedTheme={idea.linkedTheme} />
            {idea.tags?.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-elevated text-muted border border-edge"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Title row with optional logo */}
          <div className="flex items-center gap-3 mt-1">
            {isCompany && idea.logoUrl && !imgError && (
              <img
                src={idea.logoUrl}
                alt=""
                className="w-8 h-8 rounded object-contain shrink-0 bg-white p-0.5"
                onError={() => setImgError(true)}
              />
            )}
            <h3 className="text-lg font-semibold text-heading">{idea.title}</h3>
          </div>

          {/* Bullets */}
          <ul className="text-sm text-body mt-2 leading-relaxed space-y-1">
            {idea.blurb.map((bullet, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-dimmed mt-0.5 shrink-0">&bull;</span>
                <span>{renderBoldText(bullet)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 text-xs text-dimmed uppercase tracking-wide font-medium">
          {side === 'left' ? 'Press A' : 'Press L'}
        </div>
      </Card>
    </motion.div>
  );
}
