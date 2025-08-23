// src/components/GlobalLoader.jsx
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const CSS = `
.gl-loader__overlay {
  position: fixed; inset: 0; z-index: 2000;
  display: none; place-items: center;
  background: radial-gradient(120% 120% at 50% 20%, rgba(255,255,255,.98), rgba(245,246,255,.98));
  backdrop-filter: blur(4px);
}
.gl-loader__overlay.is-visible { display: grid; }

.gl-brand { display: grid; place-items: center; gap: 18px; }
.gl-logo {
  width: 92px; height: 92px; border-radius: 24px;
  background: linear-gradient(135deg,#7085F6 0%,#FFA4FD 100%);
  box-shadow: 0 14px 38px rgba(112,133,246,.35);
  position: relative; overflow: hidden;
}
.gl-shine {
  position: absolute; inset: -50% auto auto -50%;
  width: 200%; height: 200%;
  background: conic-gradient(from 0deg, transparent 0 35%, rgba(255,255,255,.35) 40%, transparent 60%);
  animation: gl-rotate 1.6s linear infinite;
}
@keyframes gl-rotate { to { transform: rotate(360deg); } }

.gl-title {
  font: 600 18px/1.2 system-ui, -apple-system, Segoe UI, Roboto, "Poppins", sans-serif;
  color: #1C274C; letter-spacing: .2px; text-align: center;
}

.gl-progress {
  width: 220px; height: 6px; border-radius: 999px;
  background: rgba(112,133,246,.18); overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(112,133,246,.24);
}
.gl-bar {
  height: 100%; width: 0%; background: linear-gradient(90deg,#7085F6,#FFA4FD);
  animation: gl-indeterminate 1.25s ease-in-out infinite;
}
@keyframes gl-indeterminate {
  0% { width: 10%; transform: translateX(-10%); }
  50% { width: 65%; transform: translateX(35%); }
  100% { width: 10%; transform: translateX(110%); }
}
`;

export default function GlobalLoader({
  minShowMs = 350,   // мінімальний час показу (щоб не блимав)
  bootShowMs = 600,  // короткий показ при старті застосунку
  attachAxios = true // вмикаємо інтерсептори axios
}) {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const bootTimer = useRef(null);
  const hideTimer = useRef(null);
  const mounted = useRef(false);
  const interceptors = useRef({ req: null, res: null });

  const show = () => {
    if (!mounted.current) return;
    clearTimeout(hideTimer.current);
    setVisible(true);
  };
  const hide = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!mounted.current) return;
      setVisible(prev => (count === 0 ? false : prev));
    }, minShowMs);
  };

  useEffect(() => {
    mounted.current = true;

    // Початковий короткий показ
    show();
    bootTimer.current = setTimeout(() => hide(), bootShowMs);

    if (attachAxios) {
      // Лічильник активних axios-запитів
      interceptors.current.req = axios.interceptors.request.use(cfg => {
        setCount(n => {
          const next = n + 1;
          if (next === 1) show();
          return next;
        });
        return cfg;
      });
      const finalize = () => setCount(n => {
        const next = Math.max(0, n - 1);
        if (next === 0) hide();
        return next;
      });
      interceptors.current.res = axios.interceptors.response.use(
        r => { finalize(); return r; },
        e => { finalize(); return Promise.reject(e); }
      );
    }

    return () => {
      mounted.current = false;
      clearTimeout(bootTimer.current);
      clearTimeout(hideTimer.current);
      if (attachAxios) {
        axios.interceptors.request.eject(interceptors.current.req);
        axios.interceptors.response.eject(interceptors.current.res);
      }
    };
  }, []); // один раз

  return (
    <>
      <style>{CSS}</style>
      <div className={`gl-loader__overlay ${visible ? 'is-visible' : ''}`} aria-hidden={!visible}>
        <div className="gl-brand" role="status" aria-live="polite" aria-label="Loading">
          <div className="gl-logo"><div className="gl-shine" /></div>
          <div className="gl-title">Loading…</div>
          <div className="gl-progress"><div className="gl-bar" /></div>
        </div>
      </div>
    </>
  );
}
