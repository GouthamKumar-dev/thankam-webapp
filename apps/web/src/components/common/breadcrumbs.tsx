import { Link, useLocation } from 'react-router-dom';

export function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {parts.map((part, index) => {
        const to = `/${parts.slice(0, index + 1).join('/')}`;
        const label = part.replace(/-/g, ' ');

        return (
          <span key={to} className="inline-flex items-center gap-2">
            {index > 0 ? <span className="text-slate-300">/</span> : null}
            <Link to={to} className="rounded-md bg-white px-2 py-1 capitalize hover:text-slate-700">
              {label}
            </Link>
          </span>
        );
      })}
    </div>
  );
}
