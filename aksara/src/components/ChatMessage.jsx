import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ChatMessage({ message, isUser }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
          isUser
            ? 'bg-emerald-500 text-white rounded-br-sm'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-sm'
        }`}
      >
        {isUser ? (
          // User message: plain text
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        ) : (
          // AI message: render markdown
          <div className="text-sm prose prose-sm dark:prose-invert max-w-none
            prose-p:my-1 prose-p:leading-relaxed
            prose-ul:my-1 prose-ul:pl-4
            prose-ol:my-1 prose-ol:pl-4
            prose-li:my-0.5
            prose-strong:font-semibold prose-strong:text-emerald-600 dark:prose-strong:text-emerald-400
            prose-headings:my-2 prose-headings:font-semibold
            prose-code:bg-gray-200 dark:prose-code:bg-gray-700 prose-code:px-1 prose-code:rounded
          ">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom rendering untuk lebih rapi
                p: ({ children }) => <p className="my-1">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 my-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {children}
                  </strong>
                ),
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => (
                  <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-xs">
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 underline"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>
        )}
        
        {/* Timestamp */}
        {message.time_str && (
          <p className={`text-[10px] mt-1 ${
            isUser ? 'text-emerald-100' : 'text-gray-400'
          }`}>
            {message.time_str}
          </p>
        )}
      </div>
    </div>
  );
}