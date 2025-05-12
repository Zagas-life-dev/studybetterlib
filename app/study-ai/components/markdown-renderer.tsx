"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeKatex from "rehype-katex"
import remarkMath from "remark-math"
import 'katex/dist/katex.min.css'
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      className="prose prose-invert max-w-none prose-pre:my-1 prose-p:my-1 prose-headings:mb-2 prose-headings:mt-3"
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "")
          return match ? (
            <SyntaxHighlighter
              language={match[1]}
              style={vscDarkPlus}
              PreTag="div"
              wrapLines={true}
              wrapLongLines={true}
              className="rounded-md text-sm"
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code className="bg-gray-700 px-1 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          )
        },
        // Make table full width and add scroll for overflow
        table({ node, ...props }) {
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700" {...props} />
            </div>
          )
        },
        // Style table headers
        th({ node, ...props }) {
          return (
            <th
              className="px-3 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
              {...props}
            />
          )
        },
        // Style table cells
        td({ node, ...props }) {
          return <td className="px-3 py-2 whitespace-nowrap" {...props} />
        },
        // Add proper styling for block quotes
        blockquote({ node, ...props }) {
          return (
            <blockquote
              className="border-l-4 border-gray-600 pl-4 py-1 my-2 text-gray-300"
              {...props}
            />
          )
        },
        // Style links
        a({ node, ...props }) {
          return (
            <a
              className="text-blue-400 hover:text-blue-300 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          )
        },
        // Ensure lists have proper spacing
        ul({ node, ...props }) {
          return <ul className="list-disc pl-5 my-2" {...props} />
        },
        ol({ node, ...props }) {
          return <ol className="list-decimal pl-5 my-2" {...props} />
        },
        // Style list items
        li({ node, ...props }) {
          return <li className="my-0.5" {...props} />
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}