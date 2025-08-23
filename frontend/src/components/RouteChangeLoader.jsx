// src/components/RouteChangeLoader.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Показує коротку анімацію ЛИШЕ коли змінюється URL (між сторінками).
 * Внутрішні стейти (відкриття чату/дзвінка, зміна уроку) не тригерять лоадер.
 */
export default function RouteChangeLoader({
  minShowMs = 320,        // мінімальний показ, щоб не блимало
  showOnFirstLoad = false // якщо true — показати і на першому завантаженні застосунку
}) {
  const location = useLocation();
  const prevKey = useRef(null);
  const [visible, setVisible] = useState(showOnFirstLoad);
  const hideTimer = useRef(null);

  useEffect(() => {
    const key = location.pathname + location.search + location.hash;

    // Перша отрисовка:
    if (prevKey.current === null) {
      prevKey.current = key;
      if (showOnFirstLoad) {
        clearTimeout(hideTimer.current);
        hideTimer.current = setTimeout(() => setVisible(false), minShowMs);
      }
      return;
    }

    // Якщо шлях змінився — це перехід між сторінками
    if (prevKey.current !== key) {
      prevKey.current = key;
      setVisible(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setVisible(false), minShowMs);
    }
  }, [location, minShowMs, showOnFirstLoad]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  return (
    <>
      <style>{CSS}</style>
      <div
        className={`rt-loader ${visible ? "is-visible" : ""}`}
        aria-hidden={!visible}
        aria-live="polite"
        role="status"
      >
        <div className="rt-card">
          <div className="rt-logo">
            <div className="rt-shine" />
          </div>
          <div className="rt-title">Loading…</div>
          <div className="rt-bar"><span /></div>
        </div>
      </div>
    </>
  );
}

const CSS = `
.rt-loader {
  position: fixed; inset: 0; z-index: 2000;
  display: none; place-items: center;
  background: radial-gradient(120% 120% at 50% 20%, rgba(255,255,255,.98), rgba(245,246,255,.98));
  backdrop-filter: blur(4px);
  pointer-events: none;
}
.rt-loader.is-visible { display: grid; }

.rt-card { display: grid; place-items: center; gap: 16px; }
.rt-logo {
  width: 88px; height: 88px; border-radius: 24px;
  background: linear-gradient(135deg,#7085F6 0%,#FFA4FD 100%);
  box-shadow: 0 14px 38px rgba(112,133,246,.35);
  position: relative; overflow: hidden;
}
.rt-shine {
  position: absolute; inset: -50% auto auto -50%;
  width: 200%; height: 200%;
  background: conic-gradient(from 0deg, transparent 0 35%, rgba(255,255,255,.35) 40%, transparent 60%);
  animation: rt-rotate 1.6s linear infinite;
}
@keyframes rt-rotate { to { transform: rotate(360deg); } }

.rt-title {
  font: 600 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto, "Poppins", sans-serif;
  color: #1C274C; letter-spacing: .2px; text-align: center;
}

.rt-bar {
  width: 220px; height: 6px; border-radius: 999px;
  background: rgba(112,133,246,.18); overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(112,133,246,.24);
}
.rt-bar > span {
  display: block; height: 100%; width: 0%;
  background: linear-gradient(90deg,#7085F6,#FFA4FD);
  animation: rt-indeterminate 1.25s ease-in-out infinite;
}
@keyframes rt-indeterminate {
  0% { width: 10%; transform: translateX(-10%); }
  50% { width: 65%; transform: translateX(35%); }
  100% { width: 10%; transform: translateX(110%); }
}

/* Повага до reduce-motion */
@media (prefers-reduced-motion: reduce) {
  .rt-shine, .rt-bar > span { animation: none; }
}
`;
