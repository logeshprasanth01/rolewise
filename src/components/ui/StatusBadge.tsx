import React from 'react';
import { FitStatus } from '@/types/database';

interface StatusBadgeProps {
  status: FitStatus | string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  showDot = true,
}) => {
  const normalized = (status || '').toLowerCase().trim();

  let bgClass = 'bg-[#FFF2B8] text-[#252525] border-[#D9D4FE]';
  let dotClass = 'bg-[#252525]';
  let label = status;

  if (normalized.includes('strong') || normalized.includes('aligned')) {
    bgClass = 'bg-[#EAF6F0] text-[#4E9B76] border-[#CEEBDF]';
    dotClass = 'bg-[#4E9B76]';
    label = 'Strong alignment';
  } else if (normalized.includes('transferable')) {
    bgClass = 'bg-[#FFF2B8] text-[#252525] border-[#D8D4FD]';
    dotClass = 'bg-[#252525]';
    label = 'Transferable';
  } else if (normalized.includes('investigation') || normalized.includes('needs')) {
    bgClass = 'bg-[#FFF5DF] text-[#C58A2B] border-[#FCE6BD]';
    dotClass = 'bg-[#C58A2B]';
    label = 'Needs investigation';
  } else if (normalized.includes('not demonstrated') || normalized.includes('gap')) {
    bgClass = 'bg-[#FFF0ED] text-[#E87967] border-[#FBD2CB]';
    dotClass = 'bg-[#E87967]';
    label = 'Not demonstrated';
  } else if (normalized.includes('preparing') || normalized.includes('in progress')) {
    bgClass = 'bg-[#FFF2B8] text-[#252525] border-[#D8D4FD]';
    dotClass = 'bg-[#252525]';
    label = status;
  }

  const paddingClass = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-xs sm:text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${bgClass} ${paddingClass} transition-colors select-none`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const norm = (priority || '').toLowerCase();
  let style = 'bg-[#FFF0ED] text-[#E87967] border-[#FBD2CB]';

  if (norm === 'high') {
    style = 'bg-[#FFF0ED] text-[#E87967] border-[#FBD2CB]';
  } else if (norm === 'medium') {
    style = 'bg-[#FFF5DF] text-[#C58A2B] border-[#FCE6BD]';
  } else {
    style = 'bg-[#F7F7FB] text-[#667085] border-[#E7E8EF]';
  }

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${style}`}>
      {priority} Priority
    </span>
  );
};
