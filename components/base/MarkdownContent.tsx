"use client";
import Markdown from "react-markdown";

export default function MarkdownContent({ nodes }: { nodes: string }) {
    return <Markdown components={{
        p: ({ children }) => <p className="text-gray-700 dark:text-gray-300 mb-4">{children}</p>,
            h2: ({ children }) => <h2 className="text-2xl font-bold mb-4 text-gray-700 dark:text-gray-300">{children}</h2>,
            h3: ({ children }) => <h3 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">{children}</h3>,
            h4: ({ children }) => <h4 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-300">{children}</h4>,
            h5: ({ children }) => <h5 className="text-base font-bold mb-4 text-gray-700 dark:text-gray-300">{children}</h5>,
            h6: ({ children }) => <h6 className="text-sm font-bold mb-4 text-gray-700 dark:text-gray-300">{children}</h6>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-gray-700 dark:text-gray-300">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-gray-700 dark:text-gray-300">{children}</ol>,
            li: ({ children }) => <li className="mb-2 text-gray-700 dark:text-gray-300">{children}</li>,
            a: ({ children, href }) => <a href={href} className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300">{children}</a>,
            hr: ({ children }) => <hr className="my-4 border-gray-300 dark:border-gray-700" />,
            img: ({ src, alt }) => <img src={src} alt={alt} className="mb-4" />,
            code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 p-2 rounded-md text-gray-700 dark:text-gray-300">{children}</code>,
            blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 mb-4 text-gray-700 dark:text-gray-300">{children}</blockquote>,
        }}>{nodes}</Markdown>;
}