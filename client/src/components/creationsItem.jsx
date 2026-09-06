import { ChevronDown } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

const CreationsItem = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const title = item.title || item.prompt || "Untitled Creation";
  const date = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString()
    : item.created_at
      ? new Date(item.created_at).toLocaleDateString()
      : item.date || "";
  const type = item.type || "article";
  const isImage =
    type === "image" ||
    type === "remove-bg" ||
    type === "remove-background" ||
    type === "remove-object" ||
    (typeof item.content === "string" &&
      (item.content.startsWith("http://") ||
        item.content.startsWith("https://") ||
        item.content.startsWith("data:image")));

  const formatTypeLabel = (t) => {
    if (!t) return "Article";
    if (t === "remove-bg" || t === "remove-background") return "Remove BG";
    if (t === "remove-object") return "Remove Object";
    if (t === "blog-title") return "Blog Title";
    if (t === "resume-review") return "Resume Review";
    if (t === "image") return "Image";
    return t;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-xs transition-all duration-200 overflow-hidden hover:shadow-sm">
      {/* Header (Clickable row) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-5 flex items-center justify-between cursor-pointer select-none gap-4"
      >
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="font-medium text-gray-800 text-sm truncate">
            {title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {formatTypeLabel(type)} {date ? `• ${date}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="px-3.5 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 capitalize">
            {formatTypeLabel(type)}
          </span>
          <ChevronDown
            className={`size-4 text-gray-400 transition-transform duration-200 ${
              isExpanded ? "rotate-180 text-gray-600" : ""
            }`}
          />
        </div>
      </div>

      {/* Expanded Content Area */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-3 border-t border-gray-100 bg-gray-50/50">
          {isImage ? (
            <div className="flex justify-center p-2">
              <img
                src={item.content}
                alt={title}
                className="max-h-80 rounded-xl object-contain shadow-xs"
              />
            </div>
          ) : (
            <div className="text-sm text-gray-700 leading-relaxed">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-lg font-bold text-gray-900 mt-3 mb-2">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-base font-bold text-gray-900 mt-3 mb-2">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="my-2 leading-relaxed text-gray-700">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 my-2 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 my-2 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-200/60 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">
                      {children}
                    </code>
                  ),
                }}
              >
                {item.content || "No generated content available."}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreationsItem;
