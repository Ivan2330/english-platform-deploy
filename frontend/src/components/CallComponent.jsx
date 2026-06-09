import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  RoomAudioRenderer,
  useLocalParticipant,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import "./call-ui.css";
import axios from "axios";
import { API_URL } from "../../config";

/* ---------- Іконки ---------- */
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>
);
const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18" /><path d="M9 9v2a3 3 0 0 0 5 2.2" /><path d="M15 9.3V6a3 3 0 0 0-5.7-1.3" /><path d="M5 11a7 7 0 0 0 11 5.3" /><path d="M12 18v3" /></svg>
);
const CamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2" /><path d="m16 10 6-3v10l-6-3" /></svg>
);
const CamOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18" /><path d="M16 16H4a2 2 0 0 1-2-2V8" /><path d="M6 6h8a2 2 0 0 1 2 2v2l4-2v8" /></svg>
);
const LeaveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6c0 8 7 15 15 15a2 2 0 0 0 2-2v-2.5a1 1 0 0 0-.8-1l-3.2-.7a1 1 0 0 0-1 .3l-1.2 1.3a12 12 0 0 1-5.5-5.5l1.3-1.2a1 1 0 0 0 .3-1l-.7-3.2a1 1 0 0 0-1-.8H5a2 2 0 0 0-2 2z" transform="rotate(135 12 12)" /></svg>
);
const MicOffMini = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 3 18 18" /><path d="M9 9v2a3 3 0 0 0 5 2.2" /><path d="M15 9.3V6a3 3 0 0 0-5.7-1.3" /><path d="M5 11a7 7 0 0 0 11 5.3" /><path d="M12 18v3" /></svg>
);

/* ---------- Хелпери ---------- */
function gradientFor(identity, isLocal) {
  if (isLocal) return "linear-gradient(135deg,#6C63FF,#D4307E)";
  const palette = [
    "linear-gradient(135deg,#6C63FF,#9D4EDD)",
    "linear-gradient(135deg,#D4307E,#9D4EDD)",
    "linear-gradient(135deg,#1f9d57,#6C63FF)",
    "linear-gradient(135deg,#f0883e,#D4307E)",
    "linear-gradient(135deg,#3aa0c2,#6C63FF)",
  ];
  let h = 0;
  const s = String(identity || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
function initialsOf(name) {
  if (!name) return "?";
  const parts = name.replace(/[._-]+/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
function roleOf(metadata) {
  try { return JSON.parse(metadata || "{}").role || null; } catch { return null; }
}

/* ---------- Плитка учасника ---------- */
function Tile({ trackRef }) {
  const p = trackRef.participant;
  const camOn = !!(trackRef.publication && !trackRef.publication.isMuted && trackRef.source === Track.Source.Camera);
  const micOn = p.isMicrophoneEnabled;
  const speaking = p.isSpeaking;
  const role = roleOf(p.metadata);
  const rawName = p.name || p.identity;
  const label = p.isLocal ? "You" : rawName;
  const q = p.connectionQuality;
  const qColor = q === "poor" ? "#f0a020" : q === "lost" ? "#e05050" : "#36c98d";

  return (
    <div className={`lkc-tile ${speaking ? "is-speaking" : ""}`}>
      {camOn ? (
        <VideoTrack trackRef={trackRef} className="lkc-video" />
      ) : (
        <div className="lkc-avatar" style={{ background: gradientFor(p.identity, p.isLocal) }}>
          {initialsOf(rawName)}
        </div>
      )}
      <span className="lkc-quality" style={{ background: qColor }} title={`Connection: ${q || "unknown"}`} />
      <div className="lkc-namebar">
        <span className="lkc-name">
          {label}{role === "teacher" && !p.isLocal ? " · teacher" : ""}
        </span>
        {!micOn && <span className="lkc-micoff"><MicOffMini /></span>}
      </div>
    </div>
  );
}

/* ---------- Контроли ---------- */
function CallControls({ onLeave }) {
  const lp = useLocalParticipant();
  const localParticipant = lp.localParticipant;
  const micOn = lp.isMicrophoneEnabled ?? localParticipant?.isMicrophoneEnabled ?? false;
  const camOn = lp.isCameraEnabled ?? localParticipant?.isCameraEnabled ?? false;

  return (
    <div className="lkc-controls">
      <button className={`lkc-btn ${micOn ? "" : "is-off"}`} onClick={() => localParticipant?.setMicrophoneEnabled(!micOn)} title={micOn ? "Вимкнути мікрофон" : "Увімкнути мікрофон"} aria-label="Мікрофон">
        {micOn ? <MicIcon /> : <MicOffIcon />}
      </button>
      <button className={`lkc-btn ${camOn ? "" : "is-off"}`} onClick={() => localParticipant?.setCameraEnabled(!camOn)} title={camOn ? "Вимкнути камеру" : "Увімкнути камеру"} aria-label="Камера">
        {camOn ? <CamIcon /> : <CamOffIcon />}
      </button>
      <button className="lkc-btn lkc-leave" onClick={onLeave} title="Вийти з дзвінка" aria-label="Вийти">
        <LeaveIcon />
      </button>
    </div>
  );
}

/* ---------- Сцена ---------- */
function CallStage({ onLeave }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.Microphone, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  const tiles = tracks.filter((t) => t.source === Track.Source.Camera);
  const count = tiles.length;

  return (
    <div className="lkc">
      <div className="lkc-statusbar">
        <span className="lkc-live"><span className="lkc-livedot" /> Call in progress</span>
        <span className="lkc-count">{count} {count === 1 ? "person" : "people"}</span>
      </div>
      <div className="lkc-stage">
        {count === 0 && <div className="lkc-waiting">Очікуємо учасників…</div>}
        {tiles.map((tr) => (
          <Tile key={`${tr.participant.identity}_${tr.source}`} trackRef={tr} />
        ))}
      </div>
      <CallControls onLeave={onLeave} />
      <RoomAudioRenderer />
    </div>
  );
}

const CallComponent = ({ classroomId, currentUserId, role, onLeave }) => {
  const [token, setToken] = useState(null);
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getToken = async () => {
      try {
        const t = localStorage.getItem("token");
        const { data } = await axios.get(`${API_URL}/livekit/token`, {
          params: { classroom_id: classroomId },
          headers: { Authorization: `Bearer ${t}` },
        });
        setToken(data.token);
        setUrl(data.url);
      } catch (e) {
        setError(
          e?.response?.status === 503
            ? "Дзвінки ще не налаштовані (LiveKit)."
            : "Не вдалося приєднатися до дзвінка."
        );
      }
    };
    getToken();
  }, [classroomId]);

  if (error) return <div className="call-state">{error}</div>;
  if (!token || !url) return <div className="call-state">Підключення…</div>;

  return (
    <LiveKitRoom token={token} serverUrl={url} connect={true} video={true} audio={true} onDisconnected={onLeave} style={{ height: "100%", width: "100%" }}>
      <CallStage onLeave={onLeave} />
    </LiveKitRoom>
  );
};

export default CallComponent;