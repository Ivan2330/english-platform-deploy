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
import "../pages/CallComponent.css";
import micro_on from "../assets/calls/micON.svg";
import micro_off from "../assets/calls/micOFF.svg";
import camera_on from "../assets/calls/camON.svg";
import camera_off from "../assets/calls/camOFF.svg";
import end_call from "../assets/calls/endCall.svg";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "turn:my-prime-academy.online:3478", username: "Prime#1910", credential: "Prime#1910Academy" },
];

const CallComponent = ({ classroomId, currentUserId, role, onLeave }) => {
  const [callId, setCallId] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const mediaStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());

  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const makingOffer = useRef(false);
  const polite = useRef(role !== "staff"); // студент — polite
  const pendingIce = useRef([]);
  const peerJoined = useRef(false);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const wsToken = () => localStorage.getItem("token") || "";

  const log = (...args) => console.log("[CALL]", ...args);
  const warn = (...args) => console.warn("[CALL]", ...args);
  const err = (...args) => console.error("[CALL]", ...args);

  // 1) Локальні медіа ДО сигналінгу
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        log("Local media:", stream.getTracks().map(t => `${t.kind}:${t.id}`));
      } catch (e) {
        err("getUserMedia failed:", e);
      }
    })();
  }, []);

  // 2) Створення/пошук Call + join
  useEffect(() => {
    (async () => {
      try {
        const headers = authHeaders();
        const { data: calls } = await axios.get(`${API_URL}/calls/calls/?classroom_id=${classroomId}`, { headers });
        let call = calls.find(c => c.status === "active");

        if (!call) {
          const { data: created } = await axios.post(`${API_URL}/calls/calls/`, { classroom_id: classroomId, status: "active" }, { headers });
          call = created;
          log("Created call:", call.id);
        }
        if (!call) {
          warn("No active call in classroom");
          return;
        }

        const { data: parts } = await axios.get(`${API_URL}/calls/calls/${call.id}/participants`, { headers });
        const me = parts.find(p => p.user_id === currentUserId && !p.left_at);
        if (!me) {
          await axios.post(`${API_URL}/calls/calls/${call.id}/join`, {}, { headers });
          log("Joined call:", call.id);
        }

        setCallId(call.id);
      } catch (e) {
        err("Call init error:", e);
      }
    })();
  }, [classroomId, role, currentUserId]);

  // 3) WS + RTCPeerConnection
  useEffect(() => {
    if (!callId) return;

    // ТВОЄ: тримаю префікс як у тебе
    const ws = new WebSocket(`${WS_URL}/calls-ws/ws/calls/${callId}?token=${wsToken()}`);
    socketRef.current = ws;

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    });
    pcRef.current = pc;
    window.pcRef = pc;

    // Стани для дебагу
    pc.oniceconnectionstatechange = () => log("ICE state →", pc.iceConnectionState);
    pc.onconnectionstatechange = () => log("PC state →", pc.connectionState);
    pc.onsignalingstatechange = () => log("Signaling →", pc.signalingState);

    // Remote stream → video
    remoteStreamRef.current = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;

    // Додаємо локальні треки гарантовано ДО сигналінгу
    const ensureTracks = async () => {
      let tries = 0;
      while (!mediaStreamRef.current && tries < 20) {
        await new Promise(r => setTimeout(r, 150));
        tries++;
      }
      if (!mediaStreamRef.current) {
        err("No local media, cannot add tracks");
        return false;
      }
      mediaStreamRef.current.getTracks().forEach(track => {
        if (!pc.getSenders().find(s => s.track?.id === track.id)) {
          pc.addTrack(track, mediaStreamRef.current);
          log("Added local track:", track.kind, track.id);
        }
      });
      return true;
    };

    pc.ontrack = (event) => {
      const video = remoteVideoRef.current;
      const incomingStream = event.streams?.[0];
      if (!incomingStream || !video) return;

      if (!remoteStreamRef.current.getTracks().some(t => t.id === event.track.id)) {
        remoteStreamRef.current.addTrack(event.track);
      }
      if (!video.srcObject) video.srcObject = remoteStreamRef.current;

      video.onloadedmetadata = () => {
        video.play()
          .then(() => log("▶️ Remote video playing"))
          .catch(e => err("Video play error (metadata):", e));
      };
      setTimeout(() => video.play().catch(e => err("Video play retry:", e)), 400);

      log("ontrack:", event.track.kind, event.track.id);
    };

    pc.onicecandidate = e => {
      if (e.candidate) {
        log("➡️ local ICE:", e.candidate.candidate?.split(" ").slice(0,6).join(" "));
        ws.send(JSON.stringify({ action: "ice_candidate", candidate: e.candidate, user: currentUserId }));
      } else {
        log("ICE gathering complete");
      }
    };

    pc.onnegotiationneeded = async () => {
      if (!peerJoined.current) return;
      try {
        makingOffer.current = true;
        if (!(await ensureTracks())) return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
        log("↗️ sent offer (onnegotiationneeded)");
      } catch (e) {
        err("negotiationneeded error:", e);
      } finally {
        makingOffer.current = false;
      }
    };

    ws.onopen = () => log("WS open");
    ws.onerror = (e) => err("WS error", e);
    ws.onclose = (ev) => warn(`WS close (code=${ev.code}${ev.reason ? `, reason=${ev.reason}` : ""})`);

    ws.onmessage = async ({ data }) => {
      const msg = safeJSON(data);
      if (!msg) return;
      log("WS msg:", msg);

      try {
        if (msg.action === "peers") {
          const peers = Array.isArray(msg.peers) ? msg.peers : [];
          if (peers.length > 0) {
            peerJoined.current = true;
            if (await ensureTracks()) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
              log("↗️ sent offer (peers)");
            }
          }
        }

        if (msg.action === "you_joined") {
          log("you_joined");
        }

        if (msg.action === "join" && msg.user !== currentUserId) {
          peerJoined.current = true;
          if (pc.signalingState === "stable" && await ensureTracks()) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
            log("↗️ sent offer (join)");
          }
        }

        if (msg.action === "offer" && msg.user !== currentUserId && msg.offer) {
          peerJoined.current = true;
          const ready = !makingOffer.current && (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer");
          const collision = msg.offer && !ready;

          if (collision && !polite.current) {
            warn("glare: ignore foreign offer (impolite)");
            return;
          }
          if (collision && polite.current) {
            warn("glare: rollback (polite)");
            await pc.setLocalDescription({ type: "rollback" });
          }

          if (await ensureTracks()) {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ action: "answer", answer, user: currentUserId }));
            log("↘️ sent answer");

            for (const c of pendingIce.current) {
              await pc.addIceCandidate(c).catch(err);
            }
            pendingIce.current = [];
          }
        }

        if (msg.action === "answer" && msg.user !== currentUserId && msg.answer) {
          if (!pc.localDescription || pc.localDescription.type !== "offer") {
            warn("Ignoring answer (no local offer)");
            return;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
          log("✔ remote answer set");
          for (const c of pendingIce.current) {
            await pc.addIceCandidate(c).catch(err);
          }
          pendingIce.current = [];
        }

        if (msg.action === "ice_candidate" && msg.user !== currentUserId && msg.candidate) {
          const cand = new RTCIceCandidate(msg.candidate);
          if (pc.remoteDescription?.type) {
            await pc.addIceCandidate(cand).catch(err);
          } else {
            pendingIce.current.push(cand);
          }
          log("⬅️ remote ICE:", msg.candidate.candidate?.split(" ").slice(0,6).join(" "));
        }

        if (msg.action === "call_ended") {
          warn("Call ended by host");
          await leaveCall();
        }
      } catch (e) {
        err("RTC message error:", e);
      }
    };

    // Перш ніж щось відправляти — гарантуємо треки
    (async () => { await ensureTracks(); })();

    return () => {
      try { ws.close(); } catch {}
      try { pc.close(); } catch {}
    };
  }, [callId]);

  useEffect(() => {
    window.localVideoRef = localVideoRef;
    window.remoteVideoRef = remoteVideoRef;
  }, []);

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

  const leaveCall = async () => {
    try { socketRef.current?.send(JSON.stringify({ action: "end_call" })); } catch {}
    try { socketRef.current?.close(); } catch {}
    mediaStreamRef.current?.getTracks()?.forEach(t => t.stop());
    try {
      if (callId) await axios.delete(`${API_URL}/calls/calls/${callId}/leave`, { headers: authHeaders() });
    } catch {}
    if (onLeave) onLeave?.();
  };

  if (!callId) return <p>🔌 Waiting for call...</p>;

  return (
    <div className="call-container">
      <h2>📞 Call in progress</h2>
      <div className="video-wrapper">
        <video ref={remoteVideoRef} autoPlay playsInline className="video remote" />
        <video ref={localVideoRef} autoPlay muted playsInline className="video local" />
      </div>
      <div className="button-group-actions">
        <button onClick={toggleMic}>
          {micOn ? <img src={micro_on} alt="mic on" /> : <img src={micro_off} alt="mic off" />}
        </button>
        <button onClick={toggleCam}>
          {camOn ? <img src={camera_on} alt="cam on" /> : <img src={camera_off} alt="cam off" />}
        </button>
        <button onClick={leaveCall}><img src={end_call} alt="end" /></button>
      </div>
    </div>
  );
};

export default CallComponent;

// helpers
function safeJSON(x) { try { return JSON.parse(x); } catch { return null; } }

