// src/components/SectionContent.jsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "./SectionContent.css";

// Підтримуємо розділювачі: [[slide]] або рядок з ---
// (кастомний знак — [[slide]]; також працює класичний hr)
const SPLIT_RE = /\n(?:\[\[slide\]\]|\-{3,})\n/i;

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
    const ext = url.split(".").pop();
    return (
      <video
        controls
        preload="metadata"
        playsInline
        className="md-media-video"
      >
        <source src={url} type={`video/${ext}`} />
      </video>
    );
  }
  if (kind === "audio") {
    const ext = url.split(".").pop();
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
  // fallback — просто посилання
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

  // Для кожної секції ще перевіряємо [[MEDIA]]; якщо є mediaUrl — вставляємо в тому місці
  // Якщо [[MEDIA]] ніде немає, але mediaUrl переданий — додамо його окремою карткою в кінці
  const cards = [];
  sections.forEach((sec, idx) => {
    if (mediaUrl && MEDIA_TOKEN_RE.test(sec)) {
      const parts = sec.split(MEDIA_TOKEN_RE);
      // до токена
      if (parts[0]?.trim()) {
        cards.push({ kind: "md", text: parts[0] });
      }
      // медіа-картка
      cards.push({ kind: "media", url: mediaUrl });
      // після токена
      if (parts[1]?.trim()) {
        cards.push({ kind: "md", text: parts[1] });
      }
    } else {
      cards.push({ kind: "md", text: sec });
    }
  });

  // якщо медіа не вставили токеном — додамо наприкінці окремою карткою
  const mediaAlreadyPlaced = cards.some(c => c.kind === "media");
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
                remarkPlugins={[remarkGfm, remarkBreaks]}
                skipHtml={false} // дозволяємо <video>, <audio>, <iframe>, <img> у markdown
              >
                {String(c.text || "").trim()}
              </ReactMarkdown>
            </article>
          )
        )}
      </div>
    </div>
  );
}
