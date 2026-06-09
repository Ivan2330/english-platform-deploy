import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../../config";
import "./LessonBuilder.css";
import "../styles/homework.css";

const TASK_TYPES = [
  "multiple_choice",
  "true_false",
  "gap_fill",
  "short_answer",
  "writing",
  "listening",
  "video",
  "matching",
  "ordering",
];
const CALLOUTS = ["none", "note", "tip", "warning", "example"];

const auth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

export default function LessonBuilder() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/lesson-content/${lessonId}/full`, auth());
      setLesson(data);
      setActiveSection((prev) => prev ?? data.sections?.[0]?.id ?? null);
    } catch {
      setError("Не вдалося завантажити урок.");
    }
  }, [lessonId]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <div className="lb-state">{error}</div>;
  if (!lesson) return <div className="lb-state">Завантаження…</div>;

  const sections = lesson.sections || [];
  const current = sections.find((s) => s.id === activeSection);

  const addSection = async () => {
    const title = prompt("Назва секції:", "New section");
    if (!title) return;
    const { data } = await axios.post(
      `${API_URL}/sections/`,
      { lesson_id: lesson.id, title, kind: "general", order: sections.length },
      auth()
    );
    await load();
    setActiveSection(data.id);
  };

  const deleteSection = async (id) => {
    if (!window.confirm("Видалити секцію з усіма блоками?")) return;
    await axios.delete(`${API_URL}/sections/${id}`, auth());
    setActiveSection(null);
    await load();
  };

  const renameSection = async (s) => {
    const title = prompt("Назва секції:", s.title);
    if (title == null || title.trim() === "") return;
    await axios.put(`${API_URL}/sections/${s.id}`, { title }, auth());
    await load();
  };

  const toggleHomework = async (s) => {
    const kind = s.kind === "homework" ? "general" : "homework";
    await axios.put(`${API_URL}/sections/${s.id}`, { kind }, auth());
    await load();
  };

  const deleteBlock = async (id) => {
    if (!window.confirm("Видалити блок?")) return;
    await axios.delete(`${API_URL}/blocks/${id}`, auth());
    await load();
  };

  // Перепорядкування: переприсвоюємо order = індекс і шлемо лише змінені
  const reorder = async (items, endpoint) => {
    await Promise.all(
      items
        .map((it, i) =>
          it.order !== i ? axios.put(`${API_URL}/${endpoint}/${it.id}`, { order: i }, auth()) : null
        )
        .filter(Boolean)
    );
    await load();
  };
  const moveSection = (idx, dir) => {
    const arr = [...sections];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    reorder(arr, "sections");
  };
  const moveBlock = (idx, dir) => {
    if (!current) return;
    const arr = [...current.blocks];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    reorder(arr, "blocks");
  };

  return (
    <div className="lb-page">
      <header className="lb-top">
        <div className="lbh-top-left">
          <Link className="lb-back" to="/lesson-builder">←</Link>
          <div className="lb-title">Конструктор · {lesson.title}</div>
        </div>
        <a className="lb-preview" href={`/lesson-view/${lesson.id}`} target="_blank" rel="noreferrer">
          Превʼю ↗
        </a>
      </header>

      <div className="lb-body">
        <aside className="lb-rail">
          <div className="lb-rail-head">
            <span>Секції</span>
            <button onClick={addSection}>+</button>
          </div>
          {sections.map((s, i) => (
            <div key={s.id} className={`lb-rail-item ${s.id === activeSection ? "is-active" : ""}`}>
              <button className="lb-rail-name" onClick={() => setActiveSection(s.id)}>
                {s.title}
                {s.kind === "homework" && <span className="hw-badge">HW</span>}
              </button>
              <div className="lb-rail-actions">
                <button className="lb-mini" onClick={() => moveSection(i, -1)} disabled={i === 0}>▲</button>
                <button className="lb-mini" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}>▼</button>
                <button
                  className={`lb-mini ${s.kind === "homework" ? "is-hw" : ""}`}
                  onClick={() => toggleHomework(s)}
                  title={s.kind === "homework" ? "Зробити звичайною секцією" : "Позначити як домашнє завдання"}
                >🏠</button>
                <button className="lb-mini" onClick={() => renameSection(s)}>✎</button>
                <button className="lb-mini" onClick={() => deleteSection(s.id)}>✕</button>
              </div>
            </div>
          ))}
          {!sections.length && <div className="lb-empty">Додай першу секцію →</div>}
        </aside>

        <main className="lb-main">
          {current ? (
            <>
              <div className="lb-blocks">
                {current.blocks.map((b, i) => (
                  <div key={b.id} className="lb-block">
                    <div className="lb-block-move">
                      <button onClick={() => moveBlock(i, -1)} disabled={i === 0}>▲</button>
                      <button onClick={() => moveBlock(i, 1)} disabled={i === current.blocks.length - 1}>▼</button>
                    </div>
                    <div className="lb-block-info">
                      <span className="lb-block-type">
                        {b.block_type === "theory" ? "Theory" : (b.task_type || "task")}
                      </span>
                      <span className="lb-block-title">
                        {b.title || (b.content ? b.content.slice(0, 50) + "…" : "—")}
                      </span>
                    </div>
                    <div className="lb-block-actions">
                      <button onClick={() => setEditingBlock(b)}>Edit</button>
                      <button onClick={() => deleteBlock(b.id)}>Delete</button>
                    </div>
                  </div>
                ))}
                {!current.blocks.length && <div className="lb-empty">У секції ще немає блоків.</div>}
              </div>
              <div className="lb-add">
                <button onClick={() => setEditingBlock({ block_type: "theory", _new: true })}>
                  + Теорія
                </button>
                <button
                  onClick={() =>
                    setEditingBlock({ block_type: "task", task_type: "multiple_choice", _new: true })
                  }
                >
                  + Завдання
                </button>
              </div>
            </>
          ) : (
            <div className="lb-empty">Обери або додай секцію.</div>
          )}
        </main>
      </div>

      {editingBlock && current && (
        <BlockEditor
          block={editingBlock}
          sectionId={current.id}
          order={current.blocks.length}
          onClose={() => setEditingBlock(null)}
          onSaved={async () => {
            setEditingBlock(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

/* ============ Редактор блоку ============ */
function BlockEditor({ block, sectionId, order, onClose, onSaved }) {
  const isNew = !!block._new;
  const [blockType, setBlockType] = useState(block.block_type || "task");
  const [content, setContent] = useState(block.content || "");
  const [callout, setCallout] = useState(block.callout_style || "none");
  const [taskType, setTaskType] = useState(block.task_type || "multiple_choice");
  const [title, setTitle] = useState(block.title || "");
  const [mediaUrl, setMediaUrl] = useState(block.media_url || "");
  const [questions, setQuestions] = useState(() =>
    (block.questions || []).map((q) => ({
      question_text: q.question_text || "",
      options: q.options ? Object.entries(q.options).map(([k, v]) => ({ key: k, text: v })) : [],
      correct_answer: q.correct_answer || "",
      explanation: q.explanation || "",
    }))
  );
  const [pairs, setPairs] = useState(() => (block.config?.pairs || []).map((p) => ({ ...p })));
  const [items, setItems] = useState(() => [...(block.config?.items || [])]);
  const [saving, setSaving] = useState(false);

  const usesQuestions =
    blockType === "task" && !["writing", "matching", "ordering"].includes(taskType);
  const usesMedia = taskType === "listening" || taskType === "video";

  const setQ = (i, patch) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const addQ = () =>
    setQuestions((qs) => [...qs, { question_text: "", options: [], correct_answer: "", explanation: "" }]);
  const delQ = (i) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  const addOpt = (i) =>
    setQ(i, {
      options: [
        ...questions[i].options,
        { key: String.fromCharCode(97 + questions[i].options.length), text: "" },
      ],
    });
  const setOpt = (i, oi, text) =>
    setQ(i, { options: questions[i].options.map((o, idx) => (idx === oi ? { ...o, text } : o)) });
  const delOpt = (i, oi) =>
    setQ(i, { options: questions[i].options.filter((_, idx) => idx !== oi) });

  const addPair = () => setPairs((p) => [...p, { left: "", right: "" }]);
  const setPair = (i, patch) => setPairs((p) => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const delPair = (i) => setPairs((p) => p.filter((_, idx) => idx !== i));
  const addItem = () => setItems((it) => [...it, ""]);
  const setItem = (i, val) => setItems((it) => it.map((x, idx) => (idx === i ? val : x)));
  const delItem = (i) => setItems((it) => it.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const qPayload = usesQuestions
        ? questions.map((q, idx) => ({
            question_text: q.question_text,
            options: q.options.length
              ? Object.fromEntries(q.options.map((o) => [o.key, o.text]))
              : null,
            correct_answer: q.correct_answer || null,
            explanation: q.explanation || null,
            order: idx,
          }))
        : [];

      let config = {};
      if (taskType === "matching") config = { pairs: pairs.filter((p) => p.left && p.right) };
      else if (taskType === "ordering") config = { items: items.filter((x) => x.trim()) };

      const payload = {
        section_id: sectionId,
        order: isNew ? order : block.order ?? 0,
        block_type: blockType,
        content: blockType === "theory" ? content : null,
        callout_style: blockType === "theory" ? callout : null,
        task_type: blockType === "task" ? taskType : null,
        title: blockType === "task" ? title || null : null,
        media_url: usesMedia ? mediaUrl || null : null,
        config: blockType === "task" ? config : null,
        questions: qPayload,
      };
      if (isNew) await axios.post(`${API_URL}/blocks/`, payload, auth());
      else await axios.put(`${API_URL}/blocks/${block.id}`, payload, auth());
      await onSaved();
    } catch {
      alert("Помилка збереження блоку.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="lb-modal-bg" onClick={onClose}>
      <div className="lb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lb-modal-head">
          <span>{isNew ? "Новий блок" : "Редагувати блок"}</span>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="lb-modal-body">
          <div className="lb-seg">
            <button className={blockType === "theory" ? "on" : ""} onClick={() => setBlockType("theory")}>
              Теорія
            </button>
            <button className={blockType === "task" ? "on" : ""} onClick={() => setBlockType("task")}>
              Завдання
            </button>
          </div>

          {blockType === "theory" ? (
            <>
              <label>Стиль</label>
              <select value={callout} onChange={(e) => setCallout(e.target.value)}>
                {CALLOUTS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <label>Текст (markdown)</label>
              <textarea
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="## Заголовок&#10;Текст **жирним**&#10;- пункт"
              />
            </>
          ) : (
            <>
              <label>Тип завдання</label>
              <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label>Заголовок</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Напр.: Choose the correct form"
              />
              {usesMedia && (
                <>
                  <label>URL медіа</label>
                  <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="https://…" />
                </>
              )}

              {taskType === "matching" && (
                <div className="lb-questions">
                  <div className="lb-q-head">
                    <span>Пари (ліве → праве)</span>
                    <button onClick={addPair}>+ пара</button>
                  </div>
                  {pairs.map((p, i) => (
                    <div key={i} className="lb-pair">
                      <input value={p.left} onChange={(e) => setPair(i, { left: e.target.value })} placeholder="ліве" />
                      <span className="lb-pair-arrow">→</span>
                      <input value={p.right} onChange={(e) => setPair(i, { right: e.target.value })} placeholder="праве" />
                      <button onClick={() => delPair(i)}>✕</button>
                    </div>
                  ))}
                  {!pairs.length && <div className="lb-empty">Додай першу пару →</div>}
                </div>
              )}

              {taskType === "ordering" && (
                <div className="lb-questions">
                  <div className="lb-q-head">
                    <span>Елементи (у правильному порядку)</span>
                    <button onClick={addItem}>+ елемент</button>
                  </div>
                  {items.map((it, i) => (
                    <div key={i} className="lb-item-row">
                      <span className="lb-item-num">{i + 1}</span>
                      <input value={it} onChange={(e) => setItem(i, e.target.value)} placeholder="елемент" />
                      <button onClick={() => delItem(i)}>✕</button>
                    </div>
                  ))}
                  {!items.length && <div className="lb-empty">Додай перший елемент →</div>}
                </div>
              )}

              {usesQuestions && (
                <div className="lb-questions">
                  <div className="lb-q-head">
                    <span>Питання</span>
                    <button onClick={addQ}>+ питання</button>
                  </div>
                  {questions.map((q, i) => (
                    <div key={i} className="lb-q">
                      <div className="lb-q-top">
                        <span>#{i + 1}</span>
                        <button onClick={() => delQ(i)}>✕</button>
                      </div>
                      <input
                        value={q.question_text}
                        onChange={(e) => setQ(i, { question_text: e.target.value })}
                        placeholder="Текст питання"
                      />
                      <div className="lb-opts">
                        {q.options.map((o, oi) => (
                          <div key={oi} className="lb-opt">
                            <span className="lb-opt-key">{o.key}</span>
                            <input
                              value={o.text}
                              onChange={(e) => setOpt(i, oi, e.target.value)}
                              placeholder="Варіант"
                            />
                            <button onClick={() => delOpt(i, oi)}>✕</button>
                          </div>
                        ))}
                        <button className="lb-add-opt" onClick={() => addOpt(i)}>+ варіант</button>
                      </div>
                      <input
                        value={q.correct_answer}
                        onChange={(e) => setQ(i, { correct_answer: e.target.value })}
                        placeholder="Правильна відповідь (напр. b / True / went)"
                      />
                    </div>
                  ))}
                  {!questions.length && <div className="lb-empty">Додай перше питання →</div>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="lb-modal-foot">
          <button className="lb-cancel" onClick={onClose}>Скасувати</button>
          <button className="lb-save" onClick={save} disabled={saving}>
            {saving ? "Збереження…" : "Зберегти"}
          </button>
        </div>
      </div>
    </div>
  );
}