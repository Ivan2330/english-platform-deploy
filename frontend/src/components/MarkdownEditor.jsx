// src/components/MarkdownEditor.jsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "./MarkdownEditor.css";

export default function MarkdownEditor({ value, onChange }) {
  const [tab, setTab] = useState("edit"); // edit | preview

  return (
    <div className="md-editor">
      <div className="md-tabs">
        <button className={tab==="edit" ? "active":""} onClick={()=>setTab("edit")}>Edit</button>
        <button className={tab==="preview" ? "active":""} onClick={()=>setTab("preview")}>Preview</button>
      </div>

      {tab === "edit" ? (
        <textarea
          className="md-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Пиши markdown: **жирний**, *курсив*, - списки, 1. нумерація, таблиці, чекбокси - [ ] ..."
        />
      ) : (
        <div className="md-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {value || ""}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
