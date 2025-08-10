// import React, { useEffect, useRef, useState } from "react";
// import { WS_URL, API_URL } from "../../config";
// import axios from "axios";
// import "../pages/CallComponent.css";
// import micro_on from "../assets/calls/micON.svg";
// import micro_off from "../assets/calls/micOFF.svg";
// import camera_on from "../assets/calls/camON.svg";
// import camera_off from "../assets/calls/camOFF.svg";
// import end_call from "../assets/calls/endCall.svg";

// const CallComponent = ({ classroomId, currentUserId, role, onLeave }) => {
//   const [callId, setCallId] = useState(null);
//   const [micOn, setMicOn] = useState(true);
//   const [camOn, setCamOn] = useState(true);

//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);
//   const mediaStreamRef = useRef(null);
//   const socketRef = useRef(null);
//   const pcRef = useRef(null);
//   const remoteStream = useRef(new MediaStream());

//   const makingOffer = useRef(false);
//   const polite = useRef(role !== "staff");
//   const pendingIce = useRef([]);
//   const peerJoined = useRef(false);

//   const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
//   const wsToken = () => localStorage.getItem("token");

//   useEffect(() => {
//     (async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//         mediaStreamRef.current = stream;
//         if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//         console.log("✅ Local media acquired", stream.getTracks().map(t => `${t.kind} (${t.id})`));
//       } catch (e) {
//         console.error("❌ Failed to acquire media:", e);
//       }
//     })();
//   }, []);

//   useEffect(() => {
//     (async () => {
//       try {
//         const headers = authHeaders();
//         const { data: calls } = await axios.get(`${API_URL}/calls/calls/?classroom_id=${classroomId}`, { headers });
//         let call = calls.find(c => c.status === "active");

//         if (!call && role === "staff") {
//           const { data: created } = await axios.post(`${API_URL}/calls/calls/`, { classroom_id: classroomId, status: "active" }, { headers });
//           call = created;
//         }

//         if (!call) return;

//         const { data: parts } = await axios.get(`${API_URL}/calls/calls/${call.id}/participants`, { headers });
//         const me = parts.find(p => p.user_id === currentUserId && !p.left_at);
//         if (!me) await axios.post(`${API_URL}/calls/calls/${call.id}/join`, {}, { headers });

//         setCallId(call.id);
//       } catch (e) {
//         console.error("❌ Call init error:", e);
//       }
//     })();
//   }, [classroomId, role, currentUserId]);

//   useEffect(() => {
//     if (!callId) return;

//     const ws = new WebSocket(`${WS_URL}/calls-ws/ws/calls/${callId}?token=${wsToken()}`);
//     socketRef.current = ws;

//     const pc = new RTCPeerConnection({
//       iceServers: [
//         { urls: "stun:stun.l.google.com:19302" },
//         { urls: "turn:my-prime-academy.online:3478", username: "Prime#1910", credential: "Prime#1910Academy" }
//       ]
//     });
//     pcRef.current = pc;
//     window.pcRef = pc;

//     remoteVideoRef.current.srcObject = remoteStream.current;

//     const addTracks = () => {
//       if (!mediaStreamRef.current) return false;
//       mediaStreamRef.current.getTracks().forEach(track => {
//         if (!pc.getSenders().find(s => s.track?.id === track.id)) {
//           pc.addTrack(track, mediaStreamRef.current);
//           console.log("🎞️ Added local track:", track.kind, track.id);
//         }
//       });
//       return true;
//     };
//     if (!addTracks()) {
//       const interval = setInterval(() => addTracks() && clearInterval(interval), 400);
//     }

//     pc.ontrack = (event) => {
//       const video = remoteVideoRef.current;
//       const incomingStream = event.streams?.[0];

//       if (!incomingStream || !video) return;

//       if (event.track.kind === "video") {
//         console.log("🎥 Incoming video track:", event.track.id);
//       }

//       event.track && !remoteStream.current.getTracks().some(t => t.id === event.track.id) &&
//         remoteStream.current.addTrack(event.track);

//       if (!video.srcObject) {
//         video.srcObject = remoteStream.current;
//       }

//       video.onloadedmetadata = () => {
//         video.play()
//           .then(() => console.log("▶️ Remote video playing"))
//           .catch(e => console.error("❌ video play error (metadata):", e));
//       };

//       setTimeout(() => {
//         video.play().catch(e => console.error("❌ video play retry:", e));
//       }, 1000);

//       console.log("📡 ontrack triggered");

//       setTimeout(() => {
//         console.log("🧪 FINAL CHECK —", {
//           videoWidth: video?.videoWidth,
//           readyState: video?.readyState,
//           paused: video?.paused,
//           srcObject: video?.srcObject,
//           tracks: video?.srcObject?.getTracks().map(t => `${t.kind} ${t.readyState}`)
//         });

//         const statsInterval = setInterval(() => {
//           pc.getStats(null).then(stats => {
//             stats.forEach(report => {
//               if (report.type === "inbound-rtp" && report.kind === "video") {
//                 console.log("📊 Video stats:", {
//                   framesDecoded: report.framesDecoded,
//                   framesDropped: report.framesDropped,
//                   framesPerSecond: report.framesPerSecond,
//                 });
//               }
//             });
//           });
//         }, 5000);
//         setTimeout(() => clearInterval(statsInterval), 20000);

//       }, 5000);
//     };

//     pc.onicecandidate = e => {
//       if (e.candidate) {
//         console.log("📤 Sending ICE:", e.candidate);
//         ws.send(JSON.stringify({ action: "ice_candidate", candidate: e.candidate, user: currentUserId }));
//       }
//     };

//     pc.onnegotiationneeded = async () => {
//       if (!peerJoined.current) return;
//       try {
//         makingOffer.current = true;
//         const offer = await pc.createOffer();
//         await pc.setLocalDescription(offer);
//         ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
//       } catch (e) {
//         console.error("negotiationneeded error", e);
//       } finally {
//         makingOffer.current = false;
//       }
//     };

//     ws.onmessage = async ({ data }) => {
//       const msg = JSON.parse(data);
//       console.log("📨 WS msg:", msg);
//       try {
//         if (msg.action === "you_joined") console.log("🟢 Waiting for peer");

//         if (msg.action === "join" && msg.user !== currentUserId) {
//           peerJoined.current = true;
//           if (pc.signalingState === "stable") {
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);
//             ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
//           }
//         }

//         if (msg.action === "offer" && msg.user !== currentUserId) {
//           peerJoined.current = true;
//           const offerDesc = new RTCSessionDescription(msg.offer);
//           const ready = !makingOffer.current && (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer");
//           const collision = msg.offer && !ready;

//           if (collision && !polite.current) return;
//           if (collision && polite.current) await pc.setLocalDescription({ type: "rollback" });

//           await pc.setRemoteDescription(offerDesc);
//           const answer = await pc.createAnswer();
//           await pc.setLocalDescription(answer);
//           ws.send(JSON.stringify({ action: "answer", answer, user: currentUserId }));
//           pendingIce.current.forEach(c => pc.addIceCandidate(c).catch(console.error));
//           pendingIce.current = [];
//         }

//         if (msg.action === "answer" && msg.user !== currentUserId) {
//           if (!pc.localDescription || pc.localDescription.type !== "offer") {
//             console.warn("⏳ Ignoring early answer — no local offer yet");
//             return;
//           }
//           await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
//           pendingIce.current.forEach(c => pc.addIceCandidate(c).catch(console.error));
//           pendingIce.current = [];
//         }

//         if (msg.action === "ice_candidate" && msg.user !== currentUserId && msg.candidate) {
//           const cand = new RTCIceCandidate(msg.candidate);
//           if (pc.remoteDescription?.type) {
//             await pc.addIceCandidate(cand).catch(console.error);
//           } else {
//             pendingIce.current.push(cand);
//           }
//         }
//       } catch (e) {
//         console.error("RTC message error:", e);
//       }
//     };

//     return () => {
//       ws.close();
//       pc.close();
//     };
//   }, [callId]);

//   useEffect(() => {
//     window.localVideoRef = localVideoRef;
//     window.remoteVideoRef = remoteVideoRef;
//   }, []);

//   const toggleMic = () => {
//     const track = mediaStreamRef.current?.getAudioTracks()[0];
//     if (!track) return;
//     track.enabled = !track.enabled;
//     setMicOn(track.enabled);
//     socketRef.current?.send(JSON.stringify({ action: "toggle_mic", status: track.enabled }));
//   };

//   const toggleCam = () => {
//     const track = mediaStreamRef.current?.getVideoTracks()[0];
//     if (!track) return;
//     track.enabled = !track.enabled;
//     setCamOn(track.enabled);
//     socketRef.current?.send(JSON.stringify({ action: "toggle_camera", status: track.enabled }));
//   };

//   const leaveCall = async () => {
//     socketRef.current?.send(JSON.stringify({ action: "end_call" }));
//     socketRef.current?.close();
//     mediaStreamRef.current?.getTracks().forEach(t => t.stop());
//     try {
//       await axios.delete(`${API_URL}/calls/calls/${callId}/leave`, { headers: authHeaders() });
//     } catch {}
//     if (onLeave) onLeave();
//   };

//   if (!callId) return <p>🔌 Waiting for call...</p>;

//   return (
//     <div className="call-container">
//       <h2>📞 Call in progress</h2>
//       <div className="video-wrapper">
//         <video ref={remoteVideoRef} autoPlay playsInline className="video remote" />
//         <video ref={localVideoRef} autoPlay muted playsInline className="video local" />
//       </div>
//       <div className="button-group-actions">
//         <button onClick={toggleMic}>{micOn ? <img src={micro_on} alt="mic on" /> : <img src={micro_off} alt="mic off" />}</button>
//         <button onClick={toggleCam}>{camOn ? <img src={camera_on} alt="cam on" /> : <img src={camera_off} alt="cam off" />}</button>
//         <button onClick={leaveCall}><img src={end_call} alt="end" /></button>
//       </div>
//     </div>
//   );
// };

// export default CallComponent;

// src/components/CallComponent.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { WS_URL, API_URL } from "../../config";

// ==== 🔧 НАЛАШТУВАННЯ (під себе) ====
// 1) Укажи свій TURN або залиш як є для тесту.
const TURN_URL = "turn:my-prime-academy.online:3478";
const TURN_USERNAME = "Prime#1910";
const TURN_PASSWORD = "Prime#1910Academy";

// 2) Скільки секунд триває діагностика до підсумкового вердикту:
const DIAG_WINDOW_SEC = 40;

// 3) Чи вмикати TURN-тест та relay-only
const DEFAULT_USE_TURN = true;        // вмикаємо TURN під час діагностики
const DEFAULT_RELAY_ONLY = false;     // для жорсткої перевірки зроби true

// 4) Діапазон логів у DOM, щоби не “роздувати” сторінку
const MAX_LOG_LINES = 500;

// ========= Утиліти =========
const nowTS = () => new Date().toISOString().replace("T", " ").replace("Z", "");
const newId = (p="id") => `${p}_${Math.random().toString(36).slice(2,8)}`;

function downloadText(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function safeParse(x){ try{return JSON.parse(x);}catch{return null;} }

function guessICEType(candStr) {
  if (!candStr) return "unknown";
  if (candStr.includes(" typ relay")) return "relay";
  if (candStr.includes(" typ srflx")) return "srflx";
  if (candStr.includes(" typ host")) return "host";
  return "unknown";
}

function verdictLabel(v){
  switch(v){
    case "OK": return "✅ OK — відеодзвінок працює";
    case "NEED_TURN": return "ℹ️ Потрібен TURN (без нього не з'єднується)";
    case "TURN_AUTH": return "❌ TURN: помилка авторизації (username/password/realm)";
    case "TURN_UNREACHABLE": return "❌ TURN: недоступний або заблокований (мережа/фаєрвол/порти)";
    case "SIGNALING": return "❌ Проблема сигналінгу (WS/SDP порядок/recipient_id)";
    case "AUTOPLAY": return "⚠️ Автовідтворення заблоковане політикою браузера";
    case "UNKNOWN": return "❓ Невизначено (дивись логи)";
    default: return v;
  }
}

// ========= Компонент =========
export default function CallComponent({ classroomId, currentUserId, role, onLeave }) {
  // Стани UI
  const [callId, setCallId] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // Діагностика
  const [useTurn, setUseTurn] = useState(DEFAULT_USE_TURN);
  const [relayOnly, setRelayOnly] = useState(DEFAULT_RELAY_ONLY);
  const [verdict, setVerdict] = useState("UNKNOWN");
  const [summary, setSummary] = useState(null);

  // Медія/RTC
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  // Службове
  const polite = useRef(role !== "staff"); // учень ввічливий у glare
  const peerJoined = useRef(false);
  const peerIdRef = useRef(null);
  const makingOffer = useRef(false);
  const pendingIce = useRef([]);
  const statsIntervalRef = useRef(null);
  const diagTimerRef = useRef(null);

  // Метрики для вердикту
  const diag = useRef({
    startedAt: Date.now(),
    wsOpen: false,
    wsMsgs: 0,
    offered: false,
    answered: false,
    remoteDescSet: false,
    ontrackFired: false,
    autoplayOk: false,
    iceLocalTypes: new Set(),
    iceRemoteTypes: new Set(),
    iceConnStates: [],
    pcConnStates: [],
    iceErrors: [],      // onicecandidateerror
    relaysSeen: false,  // чи є relay-кандидати (local або remote)
    stableConnected: false,
    turnAuthSuspected: false,
    turnUnreachSuspected: false,
  });

  // Логи
  const logsRef = useRef([]);
  const push = (lvl, text) => {
    const line = `[${nowTS()}] [${lvl}] ${text}`;
    // console + DOM
    if (lvl === "ERR") console.error(line);
    else if (lvl === "WARN") console.warn(line);
    else console.log(line);
    logsRef.current.push(line);
    if (logsRef.current.length > MAX_LOG_LINES) logsRef.current.shift();
    const el = document.getElementById("webrtc-log");
    if (el) el.textContent = logsRef.current.join("\n");
  };

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const wsToken = () => localStorage.getItem("token") || "";

  // 1) Локальні медіа
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        push("INFO", `Local media OK: ${stream.getTracks().map(t => `${t.kind}:${t.id}`).join(", ")}`);
      } catch (e) {
        push("ERR", `getUserMedia failed: ${e?.message || e}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) REST — знайти/створити дзвінок + join
  useEffect(() => {
    (async () => {
      try {
        const headers = authHeaders();
        const { data: calls } = await axios.get(`${API_URL}/calls/calls/?classroom_id=${classroomId}`, { headers });
        let call = calls.find(c => c.status === "active");
        if (!call && role === "staff") {
          const { data: created } = await axios.post(`${API_URL}/calls/calls/`, { classroom_id: classroomId, status: "active" }, { headers });
          call = created;
          push("INFO", `Created call #${call.id}`);
        }
        if (!call) {
          push("WARN", "No active call (and not staff). Waiting…");
          return;
        }
        const { data: parts } = await axios.get(`${API_URL}/calls/calls/${call.id}/participants`, { headers });
        const me = parts.find(p => p.user_id === currentUserId && !p.left_at);
        if (!me) {
          await axios.post(`${API_URL}/calls/calls/${call.id}/join`, {}, { headers });
          push("INFO", `Joined call #${call.id}`);
        }
        setCallId(call.id);
      } catch (e) {
        push("ERR", `Call init error: ${e?.message || e}`);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId, role, currentUserId]);

  // 3) WS + RTCPeerConnection
  useEffect(() => {
    if (!callId) return;

    // WS
    const ws = new WebSocket(`${WS_URL}/ws/calls/${callId}?token=${wsToken()}`);
    socketRef.current = ws;

    ws.onopen = () => {
      diag.current.wsOpen = true;
      push("INFO", "WS open");
    };
    ws.onclose = (ev) => push("WARN", `WS close (code=${ev.code})`);
    ws.onerror = () => push("ERR", "WS error");

    // RTCPeerConnection
    const iceServers = useTurn
      ? [{ urls: "stun:stun.l.google.com:19302" }, { urls: TURN_URL, username: TURN_USERNAME, credential: TURN_PASSWORD }]
      : [{ urls: "stun:stun.l.google.com:19302" }];

    const pc = new RTCPeerConnection({
      iceServers,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      ...(relayOnly ? { iceTransportPolicy: "relay" } : {}),
    });
    pcRef.current = pc;
    window.__pc__ = pc;

    // Слухуємо помилки ICE (ключ до діагностики TURN)
    pc.addEventListener("icecandidateerror", (ev) => {
      // Chrome experimental: ev.url/host/port/errorText
      const msg = `ICE ERROR url=${ev.url || "?"} host=${ev.host || "?"} port=${ev.port || "?"} err=${ev.errorText || ev.errorCode}`;
      diag.current.iceErrors.push(msg);
      push("ERR", msg);
      if ((ev.url || "").includes("turn:")) {
        // Якщо RELAY-ONLY і помилка від TURN — ймовірно або unreachable, або креденшали
        if (ev.errorText?.toLowerCase()?.includes("unauthorized")) diag.current.turnAuthSuspected = true;
        else diag.current.turnUnreachSuspected = true;
      }
    });

    // Станові індикатори
    pc.oniceconnectionstatechange = () => {
      diag.current.iceConnStates.push(pc.iceConnectionState);
      push("INFO", `ICE state → ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        diag.current.stableConnected = true;
      }
    };
    pc.onconnectionstatechange = () => {
      diag.current.pcConnStates.push(pc.connectionState);
      push("INFO", `PC state → ${pc.connectionState}`);
    };
    pc.onsignalingstatechange = () => {
      push("INFO", `Signaling → ${pc.signalingState}`);
    };

    // Додаємо локальні треки ДО сигналінгу
    const ensureTracks = async () => {
      let tries = 0;
      while (!mediaStreamRef.current && tries < 20) {
        await new Promise(r => setTimeout(r, 200));
        tries++;
      }
      if (!mediaStreamRef.current) {
        push("ERR", "No local media (ensureTracks)");
        return false;
      }
      mediaStreamRef.current.getTracks().forEach(track => {
        const exists = pc.getSenders().find(s => s.track?.id === track.id);
        if (!exists) {
          pc.addTrack(track, mediaStreamRef.current);
          push("INFO", `+ local ${track.kind} ${track.id}`);
        }
      });
      return true;
    };

    // Remote stream
    remoteStreamRef.current = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;

    pc.ontrack = (ev) => {
      const t = ev.track;
      if (t && !remoteStreamRef.current.getTracks().some(x => x.id === t.id)) {
        remoteStreamRef.current.addTrack(t);
        push("INFO", `ontrack: ${t.kind} ${t.id}`);
      }
      const v = remoteVideoRef.current;
      if (v && v.paused) {
        v.play().then(() => {
          diag.current.ontrackFired = true;
          diag.current.autoplayOk = true;
          push("INFO", "▶️ remote video playing");
        }).catch(e => {
          diag.current.ontrackFired = true;
          diag.current.autoplayOk = false;
          push("WARN", `Autoplay block: ${e?.name || e}`);
        });
      }
      // метрики
      if (!statsIntervalRef.current) {
        statsIntervalRef.current = setInterval(async () => {
          try {
            const stats = await pc.getStats(null);
            stats.forEach((r) => {
              if (r.type === "inbound-rtp" && r.kind === "video") {
                push("INFO", `stats: framesDecoded=${r.framesDecoded} fps=${r.framesPerSecond} dropped=${r.framesDropped}`);
              }
            });
          } catch {}
        }, 5000);
      }
    };

    // ICE кандидати
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const candStr = e.candidate.candidate || "";
        const type = e.candidate.type || guessICEType(candStr);
        diag.current.iceLocalTypes.add(type);
        if (type === "relay") diag.current.relaysSeen = true;
        push("INFO", `➡️ local ICE ${type} | ${candStr.split(" ").slice(0,6).join(" ")}`);
        const msg = { action: "ice_candidate", candidate: e.candidate, user: currentUserId };
        if (peerIdRef.current) msg.recipient_id = peerIdRef.current;
        ws.send(JSON.stringify(msg));
      } else {
        push("INFO", "ICE gathering complete");
      }
    };

    pc.onnegotiationneeded = async () => {
      if (!peerJoined.current) return;
      try {
        makingOffer.current = true;
        if (!(await ensureTracks())) return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const msg = { action: "offer", offer, user: currentUserId };
        if (peerIdRef.current) msg.recipient_id = peerIdRef.current;
        ws.send(JSON.stringify(msg));
        diag.current.offered = true;
        push("INFO", "↗️ sent offer (onnegotiationneeded)");
      } catch (e) {
        push("ERR", `negotiationneeded: ${e?.message || e}`);
      } finally {
        makingOffer.current = false;
      }
    };

    // WS повідомлення
    ws.onmessage = async ({ data }) => {
      const msg = safeParse(data);
      if (!msg) return;
      diag.current.wsMsgs += 1;

      if (msg.action === "peers") {
        if (Array.isArray(msg.peers) && msg.peers.length > 0) {
          peerJoined.current = true;
          peerIdRef.current = msg.peers[0];
          if (await ensureTracks()) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId, recipient_id: peerIdRef.current }));
            diag.current.offered = true;
            push("INFO", "↗️ sent offer (peers)");
          }
        }
      }
      if (msg.action === "join" && msg.user !== currentUserId) {
        peerJoined.current = true;
        peerIdRef.current = msg.user;
        if (await ensureTracks()) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId, recipient_id: peerIdRef.current }));
          diag.current.offered = true;
          push("INFO", "↗️ sent offer (join)");
        }
      }
      if (msg.action === "offer" && msg.user !== currentUserId && msg.offer) {
        peerJoined.current = true;
        peerIdRef.current = msg.user;
        const ready = !makingOffer.current && (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer");
        const collision = msg.offer && !ready;
        if (collision && !polite.current) {
          push("WARN", "glare: ignore foreign offer (impolite)");
          return;
        }
        if (collision && polite.current) {
          push("WARN", "glare: rollback (polite)");
          await pc.setLocalDescription({ type: "rollback" });
        }
        if (await ensureTracks()) {
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          diag.current.remoteDescSet = true;
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ action: "answer", answer, user: currentUserId, recipient_id: peerIdRef.current }));
          diag.current.answered = true;
          push("INFO", "↘️ sent answer");
          for (const c of pendingIce.current) {
            await pc.addIceCandidate(c).catch(e => push("ERR", `addIceCandidate (queue): ${e?.message || e}`));
          }
          pendingIce.current = [];
        }
      }
      if (msg.action === "answer" && msg.user !== currentUserId && msg.answer) {
        if (!pc.localDescription || pc.localDescription.type !== "offer") {
          push("WARN", "Ignoring answer (no local offer)");
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        diag.current.remoteDescSet = true;
        push("INFO", "✔ remote answer set");
        for (const c of pendingIce.current) {
          await pc.addIceCandidate(c).catch(e => push("ERR", `addIceCandidate (queue): ${e?.message || e}`));
        }
        pendingIce.current = [];
      }
      if (msg.action === "ice_candidate" && msg.user !== currentUserId && msg.candidate) {
        const candStr = msg.candidate.candidate || "";
        const t = guessICEType(candStr);
        diag.current.iceRemoteTypes.add(t);
        if (t === "relay") diag.current.relaysSeen = true;
        push("INFO", `⬅️ remote ICE ${t} | ${candStr.split(" ").slice(0,6).join(" ")}`);
        const cand = new RTCIceCandidate(msg.candidate);
        if (pc.remoteDescription?.type) {
          await pc.addIceCandidate(cand).catch(e => push("ERR", `addIceCandidate: ${e?.message || e}`));
        } else {
          pendingIce.current.push(cand);
        }
      }
      if (msg.action === "call_ended") {
        push("WARN", "call_ended by host");
        await doLeave(true);
      }
    };

    // Діагностіка таймер
    diag.current.startedAt = Date.now();
    if (diagTimerRef.current) clearTimeout(diagTimerRef.current);
    diagTimerRef.current = setTimeout(() => finalizeVerdict(), DIAG_WINDOW_SEC * 1000);

    return () => {
      try { ws.close(); } catch {}
      try { pc.close(); } catch {}
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      if (diagTimerRef.current) {
        clearTimeout(diagTimerRef.current);
        diagTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, useTurn, relayOnly]);

  // Допоміжні дії
  const toggleMic = () => {
    const track = mediaStreamRef.current?.getAudioTracks()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socketRef.current?.send(JSON.stringify({ action: "toggle_mic", status: track.enabled }));
  };
  const toggleCam = () => {
    const track = mediaStreamRef.current?.getVideoTracks()?.[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    socketRef.current?.send(JSON.stringify({ action: "toggle_camera", status: track.enabled }));
  };

  const doLeave = async (silent=false) => {
    try { socketRef.current?.send(JSON.stringify({ action: "end_call" })); } catch {}
    try { socketRef.current?.close(); } catch {}
    mediaStreamRef.current?.getTracks()?.forEach(t => t.stop());
    try {
      if (callId) await axios.delete(`${API_URL}/calls/calls/${callId}/leave`, { headers: authHeaders() });
    } catch {}
    if (!silent && onLeave) onLeave();
  };

  // Підсумковий вердикт
  const finalizeVerdict = () => {
    const d = diag.current;

    // Якщо все добре
    if (d.stableConnected && d.ontrackFired && d.autoplayOk) {
      setVerdict("OK");
      makeSummary("OK");
      return;
    }

    // Якщо віддалене відео прийшло (ontrack) але play заблокований — політика
    if (d.ontrackFired && !d.autoplayOk) {
      setVerdict("AUTOPLAY");
      makeSummary("AUTOPLAY");
      return;
    }

    // Якщо немає relay й з'єднання не стабілізується → скоріше за все потрібен TURN
    const noRelay = !d.relaysSeen;
    if (noRelay && !d.stableConnected) {
      setVerdict("NEED_TURN");
      makeSummary("NEED_TURN");
      return;
    }

    // Якщо ми були в relay-only і бачимо помилки від TURN
    if (relayOnly && useTurn) {
      if (d.turnAuthSuspected) {
        setVerdict("TURN_AUTH");
        makeSummary("TURN_AUTH");
        return;
      }
      if (d.turnUnreachSuspected || !d.relaysSeen) {
        setVerdict("TURN_UNREACHABLE");
        makeSummary("TURN_UNREACHABLE");
        return;
      }
    }

    // Якщо є WS але немає обміну SDP коректного
    if (d.wsOpen && (!d.offered || !d.remoteDescSet)) {
      setVerdict("SIGNALING");
      makeSummary("SIGNALING");
      return;
    }

    setVerdict("UNKNOWN");
    makeSummary("UNKNOWN");
  };

  const makeSummary = (v) => {
    const d = diag.current;
    const s = {
      verdict: v,
      usedTurn: useTurn,
      relayOnly,
      stats: {
        wsOpen: d.wsOpen,
        wsMsgs: d.wsMsgs,
        offered: d.offered,
        answered: d.answered,
        remoteDescSet: d.remoteDescSet,
        ontrackFired: d.ontrackFired,
        autoplayOk: d.autoplayOk,
        relaysSeen: d.relaysSeen,
        iceConnStates: d.iceConnStates,
        pcConnStates: d.pcConnStates,
        iceLocalTypes: Array.from(d.iceLocalTypes),
        iceRemoteTypes: Array.from(d.iceRemoteTypes),
        iceErrors: d.iceErrors,
        stableConnected: d.stableConnected,
        turnAuthSuspected: d.turnAuthSuspected,
        turnUnreachSuspected: d.turnUnreachSuspected,
      },
      turnConfig: useTurn ? { TURN_URL, TURN_USERNAME } : null,
      ts: nowTS(),
    };
    setSummary(s);
    push("INFO", `SUMMARY: ${JSON.stringify(s)}`);
  };

  // UI
  if (!callId) return <p style={{fontFamily:"system-ui"}}>🔌 Waiting for call…</p>;

  return (
    <div style={{fontFamily:"system-ui", color:"#eaeaea"}}>
      <h2>📞 Call diagnostics</h2>

      <div style={{display:"flex", gap:12, flexWrap:"wrap", alignItems:"center"}}>
        <label style={{display:"flex", gap:6, alignItems:"center"}}>
          <input type="checkbox" checked={useTurn} onChange={e => setUseTurn(e.target.checked)} />
          Use TURN
        </label>
        <label style={{display:"flex", gap:6, alignItems:"center"}}>
          <input type="checkbox" checked={relayOnly} onChange={e => setRelayOnly(e.target.checked)} />
          Relay‑only (hard TURN test)
        </label>
        <button onClick={() => { logsRef.current=[]; const el=document.getElementById("webrtc-log"); if (el) el.textContent=""; diag.current = {
          startedAt: Date.now(), wsOpen:false, wsMsgs:0, offered:false, answered:false,
          remoteDescSet:false, ontrackFired:false, autoplayOk:false, iceLocalTypes:new Set(),
          iceRemoteTypes:new Set(), iceConnStates:[], pcConnStates:[], iceErrors:[],
          relaysSeen:false, stableConnected:false, turnAuthSuspected:false, turnUnreachSuspected:false
        }; setVerdict("UNKNOWN"); setSummary(null); }}
        >🧹 Clear</button>
        <button onClick={() => downloadText(logsRef.current.join("\n"), `webrtc_log_${newId()}.txt`)}
        >⬇️ Download log</button>
        <span style={{
          padding:"6px 10px", borderRadius:8,
          background: verdict==="OK" ? "#0f5132" :
                     verdict==="AUTOPLAY" ? "#664d03" :
                     verdict.startsWith("TURN") ? "#842029" :
                     verdict==="NEED_TURN" ? "#084298" : "#343a40",
          border:"1px solid rgba(255,255,255,.2)"
        }}>
          {verdictLabel(verdict)}
        </span>
      </div>

      <div style={{display:"grid", gap:12, marginTop:12}}>
        <div style={{display:"grid", gap:8}}>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <video ref={remoteVideoRef} autoPlay playsInline
              // muted // ← розкоментуй для тесту автоплею без кліку
              style={{width:"100%", maxWidth:720, background:"#000", borderRadius:12}} />
            <video ref={localVideoRef} autoPlay playsInline muted
              style={{width:240, height:135, objectFit:"cover", background:"#000", borderRadius:12}} />
          </div>
          <div style={{display:"flex", gap:8}}>
            <button onClick={toggleMic}>🎙️ {micOn ? "Mic ON" : "Mic OFF"}</button>
            <button onClick={toggleCam}>🎥 {camOn ? "Cam ON" : "Cam OFF"}</button>
            <button onClick={() => doLeave(false)}>🚪 Leave</button>
            <button onClick={() => {
              const v = remoteVideoRef.current; if (!v) return;
              v.muted = !v.muted;
            }}>
              🔊 Toggle remote mute
            </button>
          </div>
        </div>

        <div style={{display:"flex", gap:24, flexWrap:"wrap"}}>
          <div>
            <b>PC state</b>
            <ul style={{margin: "6px 0"}}>
              <li>connection: <code>{pcRef.current?.connectionState || "—"}</code></li>
              <li>iceConnection: <code>{pcRef.current?.iceConnectionState || "—"}</code></li>
              <li>signaling: <code>{pcRef.current?.signalingState || "—"}</code></li>
            </ul>
          </div>
          <div>
            <b>ICE types seen</b>
            <ul style={{margin: "6px 0"}}>
              <li>local: <code>{Array.from(diag.current.iceLocalTypes).join(", ") || "—"}</code></li>
              <li>remote: <code>{Array.from(diag.current.iceRemoteTypes).join(", ") || "—"}</code></li>
            </ul>
          </div>
        </div>

        <div>
          <b>Log (auto‑roll, last {MAX_LOG_LINES})</b>
          <pre id="webrtc-log" style={{
            marginTop:6, height:260, overflow:"auto",
            background:"#0a0a0a", color:"#bde0bd",
            padding:10, borderRadius:8, fontSize:12, lineHeight:1.3
          }} />
        </div>

        <div>
          <b>Summary JSON</b>
          <pre style={{
            marginTop:6, background:"#101010", color:"#dbe4ff",
            padding:10, borderRadius:8, fontSize:12, lineHeight:1.3
          }}>{summary ? JSON.stringify(summary, null, 2) : "// will appear after diagnostic window ends or when connection stabilizes"}</pre>
          <div style={{display:"flex", gap:8}}>
            <button onClick={() => {
              if (!summary) return;
              downloadText(JSON.stringify(summary, null, 2), `webrtc_summary_${newId()}.json`);
            }}>⬇️ Download summary</button>
            <button onClick={() => {
              // Ручне підбиття підсумку будь-коли
              (window.getVerdictNow || finalizeVerdict)();
            }}>🧪 Finalize now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
