// CallComponent.jsx — super‑verbose debug version v3 (fully removes early‑return, richer logs)

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
 * Повністю логована версія CallComponent.
 *  🔹 REST — створення/приєднання до дзвінка відразу (НЕ чекає камеру).
 *  🔹 WebSocket — сигналізація (token у query).
 *  🔹 WebRTC  — STUN Google; answer завжди ставимо.
 *  🔹 Console logs — emoji‑прапорці кожного кроку.
 */

const CallComponent = ({ classroomId, currentUserId, role, onLeave }) => {
  // ----- React state -----
  const [callId, setCallId] = useState(null);
  const [micOn, setMicOn]   = useState(true);
  const [camOn, setCamOn]   = useState(true);

  // ----- refs -----
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const socketRef      = useRef(null);
  const pcRef          = useRef(null);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const wsToken     = () => localStorage.getItem("token");

  // ---------- 1. getUserMedia (асинхронно) ----------
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        console.log("✅ gUM", stream.getTracks().map(t => t.kind));
      } catch (e) {
        console.error("❌ gUM", e);
      }
    })();
  }, []);

  // ---------- 2. REST ініціалізація дзвінка (не чекаємо gUM) ----------
  useEffect(() => {
    (async () => {
      try {
        const headers = authHeaders();
        console.log("🔄 Checking active call for classroom", classroomId);
        const { data: calls } = await axios.get(`${API_URL}/calls/calls/?classroom_id=${classroomId}`, { headers });
        let call = calls.find(c => c.status === "active");

        if (!call && role === "staff") {
          const { data: created } = await axios.post(`${API_URL}/calls/calls/`, { classroom_id: classroomId, status: "active" }, { headers });
          call = created;
          console.log("📞 Call created", call.id);
        }
        if (!call) { console.log("⏳ Waiting for teacher to start call"); return; }

        const { data: parts } = await axios.get(`${API_URL}/calls/calls/${call.id}/participants`, { headers });
        const me = parts.find(p => p.user_id === currentUserId && !p.left_at);
        if (!me) await axios.post(`${API_URL}/calls/calls/${call.id}/join`, {}, { headers });

        setCallId(call.id);
      } catch (e) {
        console.error("REST init error", e);
      }
    })();
  }, [classroomId, role, currentUserId]);

  // ---------- 3. WebSocket + WebRTC ----------
  useEffect(() => {
    if (!callId) return;

    // 3.1 WS
    const ws = new WebSocket(`${WS_URL}/calls-ws/ws/calls/${callId}?token=${wsToken()}`);
    socketRef.current = ws;

    // 3.2 PeerConnection
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    pc.onconnectionstatechange   = () => console.log("🔗 state", pc.connectionState);
    pc.onicegatheringstatechange = () => console.log("🧊 gathering", pc.iceGatheringState);

    // додати треки (якщо gUM вже є)
    if (mediaStreamRef.current) {
      console.log("🎞️ Adding tracks to PC");
      mediaStreamRef.current.getTracks().forEach(t => pc.addTrack(t, mediaStreamRef.current));
    } else {
      // якщо gUM прийде пізніше
      const interval = setInterval(() => {
        if (mediaStreamRef.current) {
          clearInterval(interval);
          console.log("🎞️ Late gUM, add tracks");
          mediaStreamRef.current.getTracks().forEach(t => pc.addTrack(t, mediaStreamRef.current));
        }
      }, 500);
    }

    pc.ontrack = ({ streams }) => {
      console.log("📡 ontrack", streams);
      if (remoteVideoRef.current && streams[0]) remoteVideoRef.current.srcObject = streams[0];
    };

    pc.onicecandidate = e => {
      if (e.candidate) {
        console.log("📤 ICE", e.candidate.candidate);
        ws.send(JSON.stringify({ action: "ice_candidate", candidate: e.candidate, user: currentUserId }));
      }
    };

    // --- WS handlers ---
    ws.onopen  = () => console.log("✅ WS open");
    ws.onerror = e => console.error("❌ WS error", e);
    ws.onclose = () => console.warn("⚠️ WS closed");

    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data);
      console.log("📨", msg);

      try {
        if (msg.action === "you_joined") {
          console.log("👋 I am first, making offer");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
        }
        if (msg.action === "join" && msg.user !== currentUserId) {
          console.log("🆕 peer joined, sending offer");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
        }
        if (msg.action === "offer" && msg.user !== currentUserId) {
          console.log("↘️ offer", msg.user);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ action: "answer", answer, user: currentUserId }));
        }
        if (msg.action === "answer" && msg.user !== currentUserId) {
          console.log("↘️ answer", msg.user);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
        }
        if (msg.action === "ice_candidate" && msg.user !== currentUserId && msg.candidate) {
          console.log("❄️ ICE ←", msg.user);
          await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
        }
      } catch (err) {
        console.error("RTC error", err);
      }
    };

    return () => ws.close();
  }, [callId, currentUserId]);

  // ---------- helpers ----------
  const toggleMic = () => {
    const track = mediaStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socketRef.current?.send(JSON.stringify({ action: "toggle_mic", status: track.enabled }));
  };

  const toggleCam = () => {
    const track = mediaStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    socketRef.current?.send(JSON.stringify({ action: "toggle_camera", status: track.enabled }));
  };

  const leaveCall = async () => {
    socketRef.current?.send(JSON.stringify({ action: "end_call" }));
    socketRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    try { await axios.delete(`${API_URL}/calls/calls/${callId}/leave`, { headers: authHeaders() }); } catch {}
    if (onLeave) onLeave();
  };

  // ---------- render ----------
  if (!callId) return <p>🔌 Waiting for call...</p>;

  return (
    <div className="call-container">
      <h2>📞 Call in progress</h2>
      <div className="video-wrapper">
        <video ref={remoteVideoRef} autoPlay playsInline className="video" />
        <video ref={localVideoRef}  autoPlay muted playsInline className="video" />
      </div>
      <div className="button-group-actions">
        <button onClick={toggleMic}>{micOn ? <img src={micro_on} alt="mic on" /> : <img src={micro_off} alt="mic off" />}</button>
        <button onClick={toggleCam}>{camOn ? <img src={camera_on} alt="cam on" /> : <img src={camera_off} alt="cam off" />}</button>
        <button onClick={leaveCall}><img src={end_call} alt="end" /></button>
      </div>
    </div>
  );
};

export default CallComponent;
