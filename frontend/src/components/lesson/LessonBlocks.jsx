import { useState } from "react";
import ReactMarkdown from "react-markdown";

const CALLOUT_LABEL = { tip: "Tip", note: "Note", warning: "Watch out", example: "Example" };
const keyOf = (blockId, qId) => `${blockId}:${qId ?? "null"}`;

/* ---------- Теорія ---------- */
function TheoryBlock({ block }) {
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
        /* мовчки: користувач може повторити */
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
          onChange={(e) => setVal(e.target.value)}
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
        onChange={(e) => setVal(e.target.value)}
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
        onChange={(e) => setVal(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        placeholder="Start typing…"
      />
      <div className="writing-meta">{words} words</div>
    </div>
  );
}

/* ---------- Listening / Video ---------- */
function MediaTask({ block, tag, runner }) {
  const qs = block.questions || [];
  const multi = qs.length > 1;
  return (
    <div className="blk task">
      <span className="blk-tag">{tag}</span>
      {block.title && <div className="blk-title">{block.title}</div>}
      {block.media_url ? (
        tag === "Video"
          ? <video className="media-video" src={block.media_url} controls />
          : <audio className="media-audio" src={block.media_url} controls />
      ) : (
        <div className="media-empty">{tag} not attached yet</div>
      )}
      {qs.map((q, i) => (
        <AutoQuestion key={q.id} question={q} label={multi ? `${i + 1}. ` : ""} blockId={block.id} runner={runner} />
      ))}
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

/* ---------- Диспетчер ---------- */
export default function BlockRenderer({ block, runner }) {
  if (block.block_type === "theory") return <TheoryBlock block={block} />;
  switch (block.task_type) {
    case "multiple_choice": return <TaskBlock block={block} tag="Multiple choice" QuestionComp={MCQuestion} runner={runner} />;
    case "true_false": return <TaskBlock block={block} tag="True / False" QuestionComp={TFQuestion} runner={runner} />;
    case "gap_fill": return <TaskBlock block={block} tag="Gap fill" QuestionComp={GapQuestion} runner={runner} />;
    case "short_answer": return <TaskBlock block={block} tag="Short answer" QuestionComp={ShortInput} runner={runner} />;
    case "open_text":
    case "writing": return <WritingTask block={block} runner={runner} />;
    case "listening": return <MediaTask block={block} tag="Listening" runner={runner} />;
    case "video": return <MediaTask block={block} tag="Video" runner={runner} />;
    default: return <GenericTask block={block} />;
  }
}