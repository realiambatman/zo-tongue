import React from "react";

type Props = {
  thoughtsText?: string;
  className?: string;
};

/**
 * Collapsible reasoning block for assistant messages (kept out of the main bubble body).
 */
export const ModelThoughtsCollapsible: React.FC<Props> = ({
  thoughtsText,
  className = "",
}) => {
  const t = thoughtsText?.trim();
  if (!t) return null;

  return (
    <details
      className={`mt-2 rounded-xl border border-slate-200/90 bg-white/60 text-left open:shadow-sm ${className}`}
    >
      <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-accent hover:text-indigo-700">
        Thoughts
      </summary>
      <div className="border-t border-slate-100 px-3 pb-3 pt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-600">
        {t}
      </div>
    </details>
  );
};
