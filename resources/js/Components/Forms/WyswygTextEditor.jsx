import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import "../../../css/wyswyg-dark.css";
import { Code2 } from "lucide-react";
import FormatLabelName from "../../Utilities/FormatLabelName";
import { useTheme } from "../../Context/ThemeContext";

// Define custom toolbar options
const toolbarOptions = [
  [{ font: [] }],
  [{ header: [1, 2, false] }],
  ["bold", 'italic', 'underline', 'blockquote'],
  [{ color: [] }, { background: [] }],
  [{ align: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "image", "video"],
  ["clean"],
];

// Define modules for ReactQuill
const modules = {
  toolbar: toolbarOptions,
  clipboard: {
    matchVisual: false,
  },
};

const WyswygTextEditor = ({ value, name, displayName, error, onChange, action }) => {
  const { theme } = useTheme();
  const isDark = theme === 'bg-skin-black';
  const [content, setContent] = useState(value ?? '');
  const [isHtmlMode, setIsHtmlMode] = useState(false);

  const encodeHtml = (str) => {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

  };

  const decodeHtml = (str) => {
    return str
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&amp;/g, "&");
  };

  const toggleHtmlMode = (e) => {
    e.preventDefault();
    const next = isHtmlMode ? decodeHtml(content) : encodeHtml(content);
    setIsHtmlMode(!isHtmlMode);
    setContent(next);
    onChange({ name, value: next });
  };

  const handleContentChange = (nextValue) => {
    setContent(nextValue);
    onChange({ name, value: nextValue });
  };

  return (
    <>
      <label
        htmlFor={name}
        className={`mb-1 block text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
      >
        {displayName || FormatLabelName(name)}
      </label>
      <div className={`rounded-xl border p-3 sm:p-4 ${isDark ? 'border-[#2a2e39] bg-[#0b0e14]' : 'border-slate-200 bg-slate-50'}`}>
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={toggleHtmlMode}
            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition ${isDark ? 'border-[#2a2e39] text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            <Code2 size={13} />
            {isHtmlMode ? 'Switch to rich text' : 'View raw HTML'}
          </button>
        </div>

        <div className={isDark ? 'wysiwyg-dark' : ''}>
          <ReactQuill
            value={content} // Pass delta or text, not HTML
            onChange={handleContentChange}
            modules={modules}
            theme="snow"
            placeholder="Write something awesome..."
          />
        </div>

        {error && (
            <div className={`mt-2 text-sm font-semibold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                {error}
            </div>
        )}

        <div className="mt-4">
          <h3 className={`mb-2 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#787b86]' : 'text-slate-500'}`}>Preview</h3>
          <div
              className={`rounded-lg border p-4 text-sm leading-6 ${isDark ? 'border-[#2a2e39] bg-[#131722] text-[#d1d4dc]' : 'border-slate-200 bg-white text-slate-700'}`}
              dangerouslySetInnerHTML={{ __html: isHtmlMode ? encodeHtml(content) : decodeHtml(content) }}
              style={{ listStyleType: 'disc', paddingLeft: '20px' }}
          />
        </div>
      </div>
    </>
  );
};

export default WyswygTextEditor;
