import { clsx } from 'clsx';

const variants: Record<string, string> = {
  job_booked:       'bg-green-500/20 text-green-400 border border-green-500/30',
  booked:           'bg-green-500/20 text-green-400 border border-green-500/30',
  quote_given:      'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  lead:             'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  callback_needed:  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  callback:         'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  'no-action':      'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  no_action:        'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  emergency:        'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse',
  transferred:      'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  voicemail:        'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  in_progress:      'bg-purple-500/20 text-purple-400 border border-purple-500/30',
};

const labels: Record<string, string> = {
  job_booked:       'Job Booked',
  booked:           'Job Booked',
  quote_given:      'Quote Given',
  lead:             'Lead',
  callback_needed:  'Callback Needed',
  callback:         'Callback',
  'no-action':      'No Action',
  no_action:        'No Action',
  emergency:        '🚨 Emergency',
  transferred:      'Transferred',
  voicemail:        'Voicemail',
  in_progress:      'In Progress',
};

export function OutcomeBadge({ outcome }: { outcome: string }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[outcome] || variants.callback_needed)}>
      {labels[outcome] || outcome}
    </span>
  );
}
