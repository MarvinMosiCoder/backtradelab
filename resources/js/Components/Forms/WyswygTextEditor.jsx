import React, { useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { QuillDeltaToHtmlConverter } from "quill-delta-to-html";
import FormatLabelName from "../../Utilities/FormatLabelName";

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
    setIsHtmlMode(!isHtmlMode);
    setContent(isHtmlMode ? decodeHtml(content) : encodeHtml(content));
  };

  const handleContentChange = (value) => {
    setContent(value);
  };

  return (
    <>
      <label
        htmlFor={name}
        className="block text-sm font-bold text-gray-700 font-poppins"
      >
        {displayName || FormatLabelName(name)}
      </label>
      <div className="editor-container w-full p-4 bg-white rounded shadow">
        {
          action == 'Add' ? 
            <button onClick={(e)=>toggleHtmlMode(e)}>
              {
              isHtmlMode 
              ?
                <>
                  <span className="bg-green text-green-700">
                    EncodeHtml <i className="fa fa-code"></i> 
                  </span>
                </> 
              : 
                <>
                  <span>
                    DecodeHtml <i className="fa fa-code"></i> 
                  </span>
                </> 
              }
            </button>
          :
            <button onClick={(e)=>toggleHtmlMode(e)}>
              {
              isHtmlMode 
              ?
                <>
                  <span className="bg-green text-green-700">
                    DecodeHtml <i className="fa fa-code"></i> 
                  </span>
                </> 
              : 
                <>
                  <span>
                    EncodeHtml <i className="fa fa-code"></i> 
                  </span>
                </> 
              }
            </button>
        }
        
     
        <ReactQuill
          value={content} // Pass delta or text, not HTML
          onChange={handleContentChange}
          modules={modules}
          theme="snow"
          placeholder="Write something awesome..."
          name="message"
        />
        {error && (
            <div className="font-poppins font-bold text-red-600 mt-2">
                {error}
            </div>
        )}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Preview</h3>
          {
            action == 'Edit' ?
              <div 
                  className="p-4 bg-gray-100 rounded border"
                  dangerouslySetInnerHTML={{ __html: decodeHtml(value)}} 
                  style={{ listStyleType: 'disc', paddingLeft: '20px' }}
              />
            :
              <div 
                  className="p-4 bg-gray-100 rounded border"
                  dangerouslySetInnerHTML={{ __html: isHtmlMode ? encodeHtml(content) : decodeHtml(content) }} 
                  style={{ listStyleType: 'disc', paddingLeft: '20px' }}
              />
          }
        </div>
      </div>
    </>
  );
};

export default WyswygTextEditor;
