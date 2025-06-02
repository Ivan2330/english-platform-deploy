// CallComponent.jsx — суперлогована версія v2 (фікс "Skipping remote answer")

import React, { useEffect, useRef, useState } from "react";
import { WS_URL, API_URL } from "../../config";
import axios from "axios";
import "../pages/CallComponent.css";
import micro_on from "../assets/calls/micON.svg";
import micro_off from "../assets/calls/micOFF.svg";
import camera_on from "../assets/calls/camON.svg";
import camera_off from "../assets/calls/camOFF.svg";
import end_call from "../assets/calls/endCall.svg";

/**
 * Мета компонента — створити WebRTC‑дзвінок teacher ↔ student через
 *   • REST‑ендпоїнти /calls
 *   • WebSocket сигнальний канал
 *   • STUN google
 *
 * У цій версії ми ЗНИМАЄМО перевірку `signalingState === "stable"` для answer‑пакетів.
 * Через неї peer A ігнорував answer від peer B, тому зʼєднання не переходило у "connected".
 */

const CallComponent = ({ classroomId, currentUserId, role, onLeave }) => {
  // ---------- state ----------
  const [callId, setCallId] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  // ---------- refs ----------
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const wsToken = () => localStorage.getItem("token");

  // ---------- 1. getUserMedia ----------
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        console.log("✅ Local media stream", stream.getTracks().map(t => t.kind));
      } catch (e) {
        console.error("❌ getUserMedia() failed", e);
      }
    })();
  }, []);

  // ---------- 2. REST‑ініціалізація дзвінка ----------
  useEffect(() => {
    if (!mediaStreamRef.current) return; // чекаємо камеру/мік

    (async () => {
      try {
        const headers = authHeaders();
        // 2.1 Перевіряємо активний дзвінок у класі
        const { data: calls } = await axios.get(`${API_URL}/calls/calls/?classroom_id=${classroomId}`, { headers });
        let call = calls.find(c => c.status === "active");

        // 2.2 Викладач створює, студент — лише приєднується
        if (!call && role === "staff") {
          const { data: created } = await axios.post(`${API_URL}/calls/calls/`, { classroom_id: classroomId, status: "active" }, { headers });
          call = created;
          console.log("📞 Call created", call.id);
        }
        if (!call) return; // студент, а активного дзвінка немає

        // 2.3 Долучаємось як participant (idempotent)
        const { data: parts } = await axios.get(`${API_URL}/calls/calls/${call.id}/participants`, { headers });
        const me = parts.find(p => p.user_id === currentUserId && !p.left_at);
        if (!me) await axios.post(`${API_URL}/calls/calls/${call.id}/join`, {}, { headers });

        setCallId(call.id);
      } catch (e) {
        console.error("REST init error", e);
      }
    })();
  }, [classroomId, role, currentUserId]);

  // ---------- 3. WebSocket + WebRTC ----------
  useEffect(() => {
    if (!callId) return;

    // 3.1 WebSocket — сигнальний канал
    const ws = new WebSocket(`${WS_URL}/calls-ws/ws/calls/${callId}?token=${wsToken()}`);
    socketRef.current = ws;

    // 3.2 PeerConnection
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    // – логування станів –
    pc.onconnectionstatechange = () => console.log("🔗 PC state", pc.connectionState);
    pc.onicegatheringstatechange = () => console.log("🧊 ICE gathering", pc.iceGatheringState);

    // 3.3 Додаємо треки
    console.log("🎞️ addTrack:");
    mediaStreamRef.current.getTracks().forEach(t => {
      console.log("  •", t.kind);
      pc.addTrack(t, mediaStreamRef.current);
    });

    // 3.4 Remote media
    pc.ontrack = ({ streams }) => {
      console.log("📡 ontrack", streams);
      if (remoteVideoRef.current && streams[0]) remoteVideoRef.current.srcObject = streams[0];
    };

    // 3.5 ICE
    pc.onicecandidate = e => {
      if (e.candidate) {
        console.log("📤 ICE → WS", e.candidate.candidate);
        ws.send(JSON.stringify({ action: "ice_candidate", candidate: e.candidate, user: currentUserId }));
      }
    };

    // 3.6 WS events
    ws.onopen = () => console.log("✅ WS open");
    ws.onerror = e => console.error("❌ WS error", e);
    ws.onclose = () => console.warn("⚠️ WS closed");

    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data);
      console.log("📨", msg);

      try {
        if (msg.action === "you_joined") {
          // Перший у дзвінку генерує offer
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
        }
        if (msg.action === "join" && msg.user !== currentUserId) {
          console.log("🆕 peer joined, send offer");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
        }
        if (msg.action === "offer" && msg.user !== currentUserId) {
          console.log("↘️ offer from", msg.user);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ action: "answer", answer, user: currentUserId }));
        }
        if (msg.action === "answer" && msg.user !== currentUserId) {
          console.log("↘️ answer from", msg.user);
          // 🟢 ФІКС – ЗАВЖДИ встановлюємо remoteDescription
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        }
        if (msg.action === "ice_candidate" && msg.user !== currentUserId && msg.candidate) {
          console.log("❄️ ICE from", msg.user);
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      } catch (err) {
        console.error("RTC handling error", err);
      }
    };

    return () => ws.close();
  }, [callId, currentUserId]);

  // ---------- 4. helpers ----------
  const toggleMic = () => {
    const audioTrack = mediaStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicOn(audioTrack.enabled);
      socketRef.current?.send(JSON.stringify({ action: "toggle_mic", status: audioTrack.enabled }));
      console.log("🎤 mic", audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    const videoTrack = mediaStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCamOn(videoTrack.enabled);
      socketRef.current?.send(JSON.stringify({ action: "toggle_camera", status: videoTrack.enabled }));
      console.log("📸 cam", videoTrack.enabled);
    }
  };

  const leaveCall = async () => {
    socketRef.current?.send(JSON.stringify({ action: "end_call" }));
    socketRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    try { await axios.delete(`${API_URL}/calls/calls/${callId}/leave`, { headers: authHeaders() }); } catch {}
    if (onLeave) onLeave();
  };

  // ---------- UI ----------
  if (!callId) return <p>🔌 Waiting for call...</p>;

  return (
    <div className="call-container">
      <h2>📞 Call in progress</h2>
      <div className="video-wrapper">
        <video ref={remoteVideoRef} autoPlay playsInline className="video" />
        <video ref={localVideoRef} autoPlay muted playsInline className="video" />
      </div>
      <div className="button-group-actions">
        <button onClick={toggleMic}>{micOn ? <img src={micro_on} alt="Mic ON" /> : <img src={micro_off} alt="Mic OFF" />}</button>
        <button onClick={toggleCam}>{camOn ? <img src={camera_on} alt="Cam ON" /> : <img src={camera_off} alt="Cam OFF" />}</button>
        <button onClick={leaveCall}><img src={end_call} alt="End CALL" /></button>
      </div>
    </div>
  );
};

export default CallComponent;
