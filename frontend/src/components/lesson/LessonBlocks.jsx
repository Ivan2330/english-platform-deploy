import { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";

const CALLOUT_LABEL = { tip: "Tip", note: "Note", warning: "Watch out", example: "Example" };
const keyOf = (blockId, qId) => `${blockId}:${qId ?? "null"}`;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Теорія ---------- */
function TheoryBlock({ block }) {
  if (block.callout_style === "header") {
    return (
      <div className="blk-hero">
        <div className="md"><ReactMarkdown>{block.content || ""}</ReactMarkdown></div>
      </div>
    );
  }
  const style = block.callout_style && block.callout_style !== "none" ? block.callout_style : null;
  return (
    <div className={`blk theory ${style ? `callout callout-${style}` : ""}`}>
      {style && <div className="callout-label">{CALLOUT_LABEL[style] || ""}</div>}
      <div className="md"><ReactMarkdown>{block.content || ""}</ReactMarkdown></div>
    </div>
  );
}

/* ---------- Хелпер збереження ---------- */
function useSaver(runner, blockId, qId, initial) {
  const [val, setVal] = useState(initial ?? null);
  const [saved, setSaved] = useState(false);
  const commit = async (next) => {
    setVal(next);
    setSaved(false);
    if (runner) {
      try {
        await runner.save(blockId, qId, next);
        setSaved(true);
      } catch {
        /* мовчки */
      }
    }
  };
  return [val, commit, saved, setVal];
}

const SavedTick = ({ saved }) => (saved ? <span className="q-saved">✓</span> : null);

/* ---------- Питання ---------- */
function MCQuestion({ question, label, blockId, runner }) {
  const init = runner?.initial?.get(keyOf(blockId, question.id)) ?? null;
  const [sel, commit, saved] = useSaver(runner, blockId, question.id, init);
  const opts = question.options || {};
  return (
    <div className="q-item">
      <div className="blk-q">{label}{question.question_text}<SavedTick saved={saved} /></div>
      {Object.entries(opts).map(([key, text]) => (
        <button key={key} className={`opt ${sel === key ? "sel" : ""}`} onClick={() => commit(key)}>
          <span className="dot" /> {text}
        </button>
      ))}
    </div>
  );
}

function TFQuestion({ question, label, blockId, runner }) {
  const init = runner?.initial?.get(keyOf(blockId, question.id)) ?? null;
  const [sel, commit, saved] = useSaver(runner, blockId, question.id, init);
  return (
    <div className="q-item">
      <div className="blk-q">{label}{question.question_text}<SavedTick saved={saved} /></div>
      <div className="tf-row">
        {["True", "False"].map((v) => (
          <button key={v} className={`tf ${sel === v ? "sel" : ""}`} onClick={() => commit(v)}>{v}</button>
        ))}
      </div>
    </div>
  );
}

function GapQuestion({ question, label, blockId, runner }) {
  const init = runner?.initial?.get(keyOf(blockId, question.id)) ?? "";
  const [val, commit, saved, setVal] = useSaver(runner, blockId, question.id, init);
  const bank = question.options ? Object.values(question.options) : null;
  return (
    <div className="q-item">
      <div className="blk-q">{label}{question.question_text}<SavedTick saved={saved} /></div>
      {bank ? (
        <div className="bank">
          {bank.map((w, i) => (
            <button key={i} className={`pill ${val === w ? "sel" : ""}`} onClick={() => commit(w)}>{w}</button>
          ))}
        </div>
      ) : (
        <input
          className="gap-input"
          value={val ?? ""}
          onChange={(e) => { setVal(e.target.value); runner?.live?.(blockId, question.id, e.target.value); }}
          onBlur={(e) => commit(e.target.value)}
          placeholder="Type your answer…"
        />
      )}
    </div>
  );
}

function ShortInput({ question, label, blockId, runner }) {
  const init = runner?.initial?.get(keyOf(blockId, question.id)) ?? "";
  const [val, commit, saved, setVal] = useSaver(runner, blockId, question.id, init);
  return (
    <div className="q-item">
      <div className="blk-q">{label}{question.question_text}<SavedTick saved={saved} /></div>
      <input
        className="gap-input"
        value={val ?? ""}
        onChange={(e) => { setVal(e.target.value); runner?.live?.(blockId, question.id, e.target.value); }}
        onBlur={(e) => commit(e.target.value)}
        placeholder="Your answer…"
      />
    </div>
  );
}

function AutoQuestion(props) {
  const hasOptions = props.question.options && Object.keys(props.question.options).length > 0;
  return hasOptions ? <MCQuestion {...props} /> : <ShortInput {...props} />;
}

/* ---------- Блок зі списком питань ---------- */
function TaskBlock({ block, tag, QuestionComp, runner }) {
  const qs = block.questions || [];
  const multi = qs.length > 1;
  return (
    <div className="blk task">
      <span className="blk-tag">{tag}</span>
      {block.title && <div className="blk-title">{block.title}</div>}
      {qs.map((q, i) => (
        <QuestionComp key={q.id} question={q} label={multi ? `${i + 1}. ` : ""} blockId={block.id} runner={runner} />
      ))}
    </div>
  );
}

/* ---------- Writing ---------- */
function WritingTask({ block, runner }) {
  const init = runner?.initial?.get(keyOf(block.id, null)) ?? "";
  const [val, commit, saved, setVal] = useSaver(runner, block.id, null, init);
  const prompt = block.title || block.questions?.[0]?.question_text || "Write your answer";
  const words = (val || "").trim() ? (val || "").trim().split(/\s+/).length : 0;
  return (
    <div className="blk task">
      <span className="blk-tag">Writing</span>
      <div className="blk-q">{prompt}<SavedTick saved={saved} /></div>
      <textarea
        className="writing-area"
        value={val ?? ""}
        onChange={(e) => { setVal(e.target.value); runner?.live?.(block.id, null, e.target.value); }}
        onBlur={(e) => commit(e.target.value)}
        placeholder="Start typing…"
      />
      <div className="writing-meta">{words} words</div>
    </div>
  );
}

/* ---------- Listening / Video ---------- */
function getEmbedUrl(url) {
  if (!url) return null;
  const yt = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  // Google Drive (загальнодоступний файл) → вбудований перегляд
  const gd = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([A-Za-z0-9_-]+)/);
  if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
  return null;
}

function MediaTask({ block, tag, runner }) {
  const qs = block.questions || [];
  const multi = qs.length > 1;
  const embed = getEmbedUrl(block.media_url);
  return (
    <div className="blk task">
      <span className="blk-tag">{tag}</span>
      {block.title && <div className="blk-title">{block.title}</div>}
      {block.media_url ? (
        embed ? (
          <div className="media-embed">
            <iframe
              src={embed}
              title={block.title || tag}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : tag === "Video" ? (
          <video className="media-video" src={block.media_url} controls />
        ) : (
          <div className="media-band"><audio className="media-audio" src={block.media_url} controls /></div>
        )
      ) : (
        <div className="media-empty">{tag} not attached yet</div>
      )}
      {qs.map((q, i) => (
        <AutoQuestion key={q.id} question={q} label={multi ? `${i + 1}. ` : ""} blockId={block.id} runner={runner} />
      ))}
    </div>
  );
}

/* ---------- Matching ---------- */
function MatchingTask({ block, runner }) {
  const pairs = (block.config && block.config.pairs) || [];
  const lefts = pairs.map((p) => p.left);
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), [block.id]);

  const initRaw = runner?.initial?.get(keyOf(block.id, null));
  const initMap = useMemo(() => {
    try { return initRaw ? JSON.parse(initRaw) : {}; } catch { return {}; }
  }, [initRaw]);

  const [sel, setSel] = useState(initMap);
  const [saved, setSaved] = useState(false);

  const pick = async (left, val) => {
    const next = { ...sel, [left]: val };
    setSel(next);
    setSaved(false);
    if (runner) {
      try { await runner.save(block.id, null, JSON.stringify(next)); setSaved(true); } catch {}
    }
  };

  return (
    <div className="blk task">
      <span className="blk-tag">Matching</span>
      {block.title && <div className="blk-title">{block.title}<SavedTick saved={saved} /></div>}
      <div className="match-list">
        {lefts.map((l, i) => (
          <div key={i} className="match-row">
            <span className="match-left">{l}</span>
            <select className="match-sel" value={sel[l] || ""} onChange={(e) => pick(l, e.target.value)}>
              <option value="">—</option>
              {rights.map((r, j) => <option key={j} value={r}>{r}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Ordering ---------- */
function OrderingTask({ block, runner }) {
  const correct = (block.config && block.config.items) || [];
  const initRaw = runner?.initial?.get(keyOf(block.id, null));
  const initOrder = useMemo(() => {
    try {
      const p = initRaw ? JSON.parse(initRaw) : null;
      return Array.isArray(p) && p.length ? p : shuffle(correct);
    } catch {
      return shuffle(correct);
    }
  }, [initRaw, block.id]);

  const [order, setOrder] = useState(initOrder);
  const [saved, setSaved] = useState(false);

  const commit = async (next) => {
    setOrder(next);
    setSaved(false);
    if (runner) {
      try { await runner.save(block.id, null, JSON.stringify(next)); setSaved(true); } catch {}
    }
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  return (
    <div className="blk task">
      <span className="blk-tag">Ordering</span>
      {block.title && <div className="blk-title">{block.title}<SavedTick saved={saved} /></div>}
      <div className="order-list">
        {order.map((it, i) => (
          <div key={i} className="order-row">
            <span className="order-num">{i + 1}</span>
            <span className="order-text">{it}</span>
            <span className="order-btns">
              <button onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
              <button onClick={() => move(i, 1)} disabled={i === order.length - 1}>▼</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Заглушка ---------- */
function GenericTask({ block }) {
  return (
    <div className="blk task">
      <span className="blk-tag">{(block.task_type || "task").replace(/_/g, " ")}</span>
      {block.title && <div className="blk-title">{block.title}</div>}
      {block.questions?.map((q) => <div key={q.id} className="blk-q">{q.question_text}</div>)}
      <div className="blk-soon">Цей тип завдання ще в розробці.</div>
    </div>
  );
}

/* ---------- Панель "Наживо" (для викладача) ---------- */
const NULL_KEY_TYPES = new Set(["writing", "open_text", "matching", "ordering"]);

function fmtLive(v) {
  if (v == null || v === "") return "—";
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.join(" → ");
    if (parsed && typeof parsed === "object")
      return Object.entries(parsed).map(([k, val]) => `${k} → ${val || "—"}`).join(", ");
  } catch {
    /* звичайний рядок */
  }
  return String(v);
}

function BlockLivePanel({ block, live }) {
  const qs = block.questions || [];
  let rows;
  if (NULL_KEY_TYPES.has(block.task_type)) {
    rows = [{ label: "Відповідь", value: live.get(keyOf(block.id, null)) }];
  } else if (qs.length) {
    rows = qs.map((q, i) => ({
      label: qs.length > 1 ? `Q${i + 1}` : "Відповідь",
      value: live.get(keyOf(block.id, q.id)),
    }));
  } else {
    rows = [{ label: "Відповідь", value: live.get(keyOf(block.id, null)) }];
  }

  return (
    <div className="live-panel">
      <div className="live-panel-title">👁 Учень — наживо</div>
      {rows.map((r, i) => (
        <div key={i} className="live-row">
          <span className="live-q">{r.label}</span>
          <span className={`live-v ${r.value ? "" : "empty"}`}>{fmtLive(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Диспетчер ---------- */
function renderBlockBody(block, runner) {
  switch (block.task_type) {
    case "multiple_choice": return <TaskBlock block={block} tag="Multiple choice" QuestionComp={MCQuestion} runner={runner} />;
    case "true_false": return <TaskBlock block={block} tag="True / False" QuestionComp={TFQuestion} runner={runner} />;
    case "gap_fill": return <TaskBlock block={block} tag="Gap fill" QuestionComp={GapQuestion} runner={runner} />;
    case "short_answer": return <TaskBlock block={block} tag="Short answer" QuestionComp={ShortInput} runner={runner} />;
    case "open_text":
    case "writing": return <WritingTask block={block} runner={runner} />;
    case "listening": return <MediaTask block={block} tag="Listening" runner={runner} />;
    case "video": return <MediaTask block={block} tag="Video" runner={runner} />;
    case "matching": return <MatchingTask block={block} runner={runner} />;
    case "ordering": return <OrderingTask block={block} runner={runner} />;
    default: return <GenericTask block={block} />;
  }
}

export default function BlockRenderer({ block, runner, live }) {
  if (block.block_type === "theory") return <TheoryBlock block={block} />;
  const body = renderBlockBody(block, runner);
  if (!live) return body;
  return (
    <>
      {body}
      <BlockLivePanel block={block} live={live} />
    </>
  );
}