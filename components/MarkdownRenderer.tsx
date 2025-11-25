import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  return (
    <div className={`prose prose-sm max-w-none break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override paragraph to avoid huge margins in some contexts
          p: ({ node, ...props }) => <p className="my-1 leading-relaxed" {...props} />,
          // Ensure links open in new tabs
          a: ({ node, ...props }) => <a target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline" {...props} />,
          // Style code blocks slightly
          code: ({ node, inline, className, children, ...props }: any) => {
             if (inline) {
               return <code className="bg-slate-100 text-slate-800 rounded px-1 py-0.5 text-xs font-mono" {...props}>{children}</code>;
             }
             return <code className="block bg-slate-800 text-slate-100 rounded-lg p-3 my-2 text-xs font-mono overflow-x-auto" {...props}>{children}</code>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};