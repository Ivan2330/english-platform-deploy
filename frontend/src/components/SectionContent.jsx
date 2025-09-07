// src/components/SectionContent.jsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
// import remarkBreaks from "remark-breaks"; // не використовуємо, щоб не ламати таблиці
import "./SectionContent.css";

// ТІЛЬКИ явний розділювач [[slide]] — щоб не конфліктувати з GFM-таблицями
const SPLIT_RE = /\n\[\[slide\]\]\n/i;

// Токен для вбудованого місця під media_url
const MEDIA_TOKEN_RE = /\[\[\s*media\s*\]\]/i;

function getKind(url) {
  const u = String(url || "").toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|avif|svg)(\?.*)?$/.test(u)) return "image";
  if (/\.(mp4|webm|ogg)(\?.*)?$/.test(u)) return "video";
  if (/\.(mp3|wav|ogg)(\?.*)?$/.test(u)) return "audio";
  if (/youtube\.com\/watch\?v=|youtu\.be\//.test(u)) return "youtube";
  if (/vimeo\.com\//.test(u)) return "vimeo";
  return "link";
}

function MediaInline({ url, alt = "" }) {
  const kind = getKind(url);
  if (!url) return null;

  if (kind === "image") {
    return <img src={url} alt={alt || "Image"} loading="lazy" className="md-media-img" />;
  }
  if (kind === "video") {
    const ext = (url.split(".").pop() || "").toLowerCase();
    return (
      <video controls preload="metadata" playsInline className="md-media-video">
        <source src={url} type={`video/${ext}`} />
      </video>
    );
  }
  if (kind === "audio") {
    const ext = (url.split(".").pop() || "").toLowerCase();
    return (
      <audio controls preload="metadata" className="md-media-audio">
        <source src={url} type={`audio/${ext}`} />
      </audio>
    );
  }
  if (kind === "youtube") {
    const embed = url
      .replace("watch?v=", "embed/")
      .replace("youtu.be/", "www.youtube.com/embed/");
    return (
      <iframe
        className="md-media-iframe"
        src={embed}
        title={alt || "YouTube video"}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  if (kind === "vimeo") {
    const embed = url.replace("vimeo.com", "player.vimeo.com/video");
    return (
      <iframe
        className="md-media-iframe"
        src={embed}
        title={alt || "Vimeo video"}
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // fallback — просто лінк
  return (
    <a href={url} target="_blank" rel="noreferrer" className="md-media-link">
      {url}
    </a>
  );
}

export default function SectionContent({ content, mediaUrl }) {
  const raw = String(content || "");

  // Розбиваємо markdown на секції-картки лише якщо реально є розділювач
  const hasSplit = SPLIT_RE.test(raw);
  const sections = hasSplit ? raw.split(SPLIT_RE) : [raw];

  // Будуємо картки, підставляємо медіа за [[MEDIA]] або додаємо в кінці
  const cards = [];
  sections.forEach((sec) => {
    if (mediaUrl && MEDIA_TOKEN_RE.test(sec)) {
      const parts = sec.split(MEDIA_TOKEN_RE);
      if (parts[0]?.trim()) cards.push({ kind: "md", text: parts[0] });
      cards.push({ kind: "media", url: mediaUrl });
      if (parts[1]?.trim()) cards.push({ kind: "md", text: parts[1] });
    } else {
      cards.push({ kind: "md", text: sec });
    }
  });

  const mediaAlreadyPlaced = cards.some((c) => c.kind === "media");
  if (mediaUrl && !mediaAlreadyPlaced) {
    cards.push({ kind: "media", url: mediaUrl });
  }

  return (
    <div className="section-md">
      <div className="md-cards">
        {cards.map((c, i) =>
          c.kind === "media" ? (
            <article key={`m-${i}`} className="md-card">
              <MediaInline url={c.url} />
            </article>
          ) : (
            <article key={`t-${i}`} className="md-card">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]} // без remark-breaks
                skipHtml={false} // дозволяємо <video>, <audio>, <iframe>, <img> у markdown
                components={{
                  table: (props) => <table {...props} className="md-table" />,
                  thead: (props) => <thead {...props} className="md-thead" />,
                  tbody: (props) => <tbody {...props} className="md-tbody" />,
                  tr: (props) => <tr {...props} className="md-tr" />,
                  th: (props) => <th {...props} className="md-th" />,
                  td: (props) => <td {...props} className="md-td" />,
                }}
              >
                {String(c.text || "")} {/* без .trim(), щоб не ламати розмітку */}
              </ReactMarkdown>
            </article>
          )
        )}
      </div>
    </div>
  );
}
