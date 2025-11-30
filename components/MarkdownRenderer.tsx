import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "" 
}) => {
  return (
    <div className={`prose prose-sm max-w-none break-words prose-slate ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Override paragraph styling
          p: ({ node, ...props }) => (
            <p className="my-1.5 leading-relaxed" {...props} />
          ),
          // Ensure links open in new tabs with accent color
          a: ({ node, ...props }) => (
            <a 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-accent hover:text-accent-hover underline underline-offset-2 transition-colors duration-200" 
              {...props} 
            />
          ),
          // Styled code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code 
                  className="bg-slate-100 text-ink rounded-md px-1.5 py-0.5 text-[13px] font-mono" 
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code 
                className="block bg-ink text-slate-100 rounded-xl p-4 my-3 text-[13px] font-mono overflow-x-auto" 
                {...props}
              >
                {children}
              </code>
            );
          },
          // Styled lists
          ul: ({ node, ...props }) => (
            <ul className="my-2 ml-4 list-disc list-outside space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-2 ml-4 list-decimal list-outside space-y-1" {...props} />
          ),
          // Styled blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote 
              className="border-l-4 border-accent/30 pl-4 my-3 italic text-ink-muted" 
              {...props} 
            />
          ),
          // Styled headings
          h1: ({ node, ...props }) => (
            <h1 className="font-display text-2xl font-bold mt-6 mb-3" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="font-display text-xl font-bold mt-5 mb-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="font-display text-lg font-semibold mt-4 mb-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
