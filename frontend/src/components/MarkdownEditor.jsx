// // src/components/MarkdownEditor.jsx
// import React, { useState } from "react";
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";
// import remarkBreaks from "remark-breaks";
// import "./MarkdownEditor.css";

// export default function MarkdownEditor({ value, onChange }) {
//   const [tab, setTab] = useState("edit"); // edit | preview

//   return (
//     <div className="md-editor">
//       <div className="md-tabs">
//         <button className={tab==="edit" ? "active":""} onClick={()=>setTab("edit")}>Edit</button>
//         <button className={tab==="preview" ? "active":""} onClick={()=>setTab("preview")}>Preview</button>
//       </div>

//       {tab === "edit" ? (
//         <textarea
//           className="md-textarea"
//           value={value}
//           onChange={(e) => onChange(e.target.value)}
//           placeholder="Пиши markdown: **жирний**, *курсив*, - списки, 1. нумерація, таблиці, чекбокси - [ ] ..."
//         />
//       ) : (
//         <div className="md-preview">
//           <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
//             {value || ""}
//           </ReactMarkdown>
//         </div>
//       )}
//     </div>
//   );
// }

// src/components/MarkdownEditor.jsx
// import React, { useState } from "react";
// import "./MarkdownEditor.css";
// import SectionContent from "./SectionContent"; // рендеримо тим самим компонентом, що і в уроці

// export default function MarkdownEditor({ value, onChange }) {
//   const [tab, setTab] = useState("edit"); // edit | preview

//   return (
//     <div className="md-editor">
//       <div className="md-tabs">
//         <button className={tab==="edit" ? "active":""} onClick={()=>setTab("edit")}>Edit</button>
//         <button className={tab==="preview" ? "active":""} onClick={()=>setTab("preview")}>Preview</button>
//       </div>

//       {tab === "edit" ? (
//         <textarea
//           className="md-textarea"
//           value={value}
//           onChange={(e) => onChange(e.target.value)}
//           placeholder={
//             "Пиши markdown: **жирний**, *курсив*, списки, таблиці...\n" +
//             "Слайди/картки: вставляй [[slide]] або --- на окремому рядку.\n" +
//             "Місце для медіа з БД (media_url): [[MEDIA]]"
//           }
//         />
//       ) : (
//         <div className="md-preview">
//           {/* У прев’ю показуємо так само, як у фінальному рендері (без mediaUrl) */}
//           <SectionContent content={value || ""} />
//         </div>
//       )}
//     </div>
//   );
// }
// SectionContent.jsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// суворий спліт тільки по рядку, де ЛИШЕ --- (без пайпів та тексту)
const slideDelimiter = /^\s*---\s*$/m;

export default function SectionContent({ content = "" }) {
  // Якщо у тебе є [[slide]], теж можна врахувати
  const parts = content
    .split(slideDelimiter)          // розбиваємо лише по самостійному ---
    .flatMap(p => p.split(/\[\[\s*slide\s*\]\]/i)); // і по [[slide]]

  return (
    <div className="section-content">
      {parts.map((part, idx) => (
        <div className="md-slide" key={idx}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: (props) => <table {...props} className="md-table" />,
              thead: (props) => <thead {...props} />,
              tbody: (props) => <tbody {...props} />,
              tr: (props) => <tr {...props} />,
              th: (props) => <th {...props} />,
              td: (props) => <td {...props} />,
            }}
          >
            {part}
          </ReactMarkdown>
        </div>
      ))}
    </div>
  );
}
