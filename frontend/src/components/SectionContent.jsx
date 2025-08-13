// src/components/SectionContent.jsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "./SectionContent.css";

export default function SectionContent({ content }) {
  return (
    <div className="section-md">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}
