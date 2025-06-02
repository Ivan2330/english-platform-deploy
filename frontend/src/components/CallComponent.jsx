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
 * CallComponent — fully‑logged WebRTC call for classrooms (v4).
 * 
 * ▸ REST  — create / join call immediately (doesn’t wait for camera).
 * ▸ WS    — signalling (token via query‑param).
 * ▸ WebRTC — STUN Google; uses Perfect‑Negotiation pattern,
 *            teacher (staff) is always the "impolite" side (initiator).
 * ▸ Console logs — emoji flags for every step.
 */

const CallComponent = ({ classroomId, currentUserId, role, onLeave }) => {
  // ------------------ React state ------------------
  const [callId, setCallId] = useState(null);
  const [micOn, setMicOn]   = useState(true);
  const [camOn, setCamOn]   = useState(true);

  // ------------------ refs ------------------
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const socketRef      = useRef(null);
  const pcRef          = useRef(null);

  // perfect‑negotiation helpers
  const makingOffer   = useRef(false);
  const polite        = useRef(role !== "staff"); // teacher = impolite (initiator)
  const pendingCands  = useRef([]);               // ICE that arrived before SDP

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const wsToken     = () => localStorage.getItem("token");

  // ---------- 1. getUserMedia ----------
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

  // ---------- 2. REST initialisation ----------
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

  // ---------- 3. WebSocket + WebRTC ----------
  useEffect(() => {
    if (!callId) return;

    // 3.1 WS connection
    const ws = new WebSocket(`${WS_URL}/calls-ws/ws/calls/${callId}?token=${wsToken()}`);
    socketRef.current = ws;

    // 3.2 PeerConnection
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    pc.onconnectionstatechange   = () => console.log("🔗 state", pc.connectionState);
    pc.onicegatheringstatechange = () => console.log("🧊 gathering", pc.iceGatheringState);

    // add tracks when gUM ready
    const addTracks = () => {
      if (mediaStreamRef.current) {
        console.log("🎞️ Adding tracks to PC");
        mediaStreamRef.current.getTracks().forEach(t => pc.addTrack(t, mediaStreamRef.current));
        return true;
      }
      return false;
    };
    if (!addTracks()) {
      const intv = setInterval(() => addTracks() && clearInterval(intv), 400);
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

    // perfect‑negotiation: fire onnegotiationneeded
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
      } catch (err) { console.error(err); }
      finally { makingOffer.current = false; }
    };

    // ----- WS handlers -----
    ws.onopen  = () => console.log("✅ WS open");
    ws.onerror = e => console.error("❌ WS error", e);
    ws.onclose = () => console.warn("⚠️ WS closed");

    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data);
      console.log("📨", msg);

      try {
        // 1️⃣ first user only waits
        if (msg.action === "you_joined") {
          console.log("🟢 Alone in the call — wait for peer");
        }

        // 2️⃣ peer joined — we (teacher/first) create offer
        if (msg.action === "join" && msg.user !== currentUserId && pc.signalingState === "stable") {
          console.log("🆕 peer joined, sending offer");
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
        }

        // 3️⃣ incoming offer
        if (msg.action === "offer" && msg.user !== currentUserId) {
          console.log("↘️ offer", msg.user);
          const offerDesc = new RTCSessionDescription(msg.offer);

          const readyForOffer = !makingOffer.current &&
                                (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer");
          const offerCollision = (msg.offer && !readyForOffer);

          polite.current = role !== "staff"; // staff remains impolite

          if (offerCollision && !polite.current) {
            console.log("⚔️  Impolite collision — ignoring offer");
            return;
          }

          if (offerCollision && polite.current) {
            console.log("🔄 Polite collision — rolling back local offer");
            await pc.setLocalDescription({ type: "rollback" });
          }

          await pc.setRemoteDescription(offerDesc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ action: "answer", answer, user: currentUserId }));

          // flush queued ICE
          pendingCands.current.forEach(c => pc.addIceCandidate(c).catch(console.error));
          pendingCands.current = [];
        }

        // 4️⃣ incoming answer
        if (msg.action === "answer" && msg.user !== currentUserId) {
          console.log("↘️ answer", msg.user);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
          pendingCands.current.forEach(c => pc.addIceCandidate(c).catch(console.error));
          pendingCands.current = [];
        }

        // 5️⃣ incoming ICE
        if (msg.action === "ice_candidate" && msg.user !== currentUserId && msg.candidate) {
          console.log("❄️ ICE ←", msg.user);
          const cand = new RTCIceCandidate(msg.candidate);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(cand);
          } else {
            pendingCands.current.push(cand);
          }
        }
      } catch (err) {
        console.error("RTC error", err);
      }
    };

    return () => ws.close();
  }, [callId, currentUserId, role]);

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
