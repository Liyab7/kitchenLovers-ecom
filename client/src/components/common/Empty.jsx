import { FiInbox } from 'react-icons/fi';

export default function Empty({
  title = 'Nothing here yet',
  hint,
  icon: Icon = FiInbox,
  action = null,
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
        <Icon className="text-2xl" />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      {hint && <p className="text-sm text-ink/55 mt-1 max-w-sm mx-auto">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
