import React, { useEffect, useRef, useState } from "react";
import { WS_URL, API_URL } from "../../config";
import axios from "axios";
import "../pages/CallComponent.css";
import micro_on from "../assets/calls/micON.svg";
import micro_off from "../assets/calls/micOFF.svg";
import camera_on from "../assets/calls/camON.svg";
import camera_off from "../assets/calls/camOFF.svg";
import end_call from "../assets/calls/endCall.svg";

const CallComponent = ({ classroomId, currentUserId, role, onLeave }) => {
  const [callId, setCallId] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const makingOffer = useRef(false);
  const polite = useRef(role !== "staff");
  const pendingIce = useRef([]);
  const peerJoined = useRef(false);

  const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
  const wsToken = () => localStorage.getItem("token");

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
        if (!call) {
          console.log("⏳ Waiting for teacher to start call");
          return;
        }

        const { data: parts } = await axios.get(`${API_URL}/calls/calls/${call.id}/participants`, { headers });
        const me = parts.find(p => p.user_id === currentUserId && !p.left_at);
        if (!me) await axios.post(`${API_URL}/calls/calls/${call.id}/join`, {}, { headers });

        setCallId(call.id);
      } catch (e) {
        console.error("REST init error", e);
      }
    })();
  }, [classroomId, role, currentUserId]);

  useEffect(() => {
    if (!callId) return;

    const ws = new WebSocket(`${WS_URL}/calls-ws/ws/calls/${callId}?token=${wsToken()}`);
    socketRef.current = ws;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;

    pc.onconnectionstatechange = () => console.log("🔗 state", pc.connectionState);
    pc.onicegatheringstatechange = () => console.log("🧊 gathering", pc.iceGatheringState);

    const addTracks = () => {
      if (mediaStreamRef.current) {
        console.log("🎞️ Adding tracks to PC");
        mediaStreamRef.current.getTracks().forEach(t => pc.addTrack(t, mediaStreamRef.current));
        return true;
      }
      return false;
    };
    if (!addTracks()) {
      const interval = setInterval(() => addTracks() && clearInterval(interval), 400);
    }

    pc.ontrack = ({ streams }) => {
      console.log("📡 ontrack", streams);
      if (remoteVideoRef.current && streams[0]) remoteVideoRef.current.srcObject = streams[0];
    };

    pc.onicecandidate = e => {
      if (e.candidate) {
        console.log("📤 ICE", e.candidate);
        ws.send(JSON.stringify({ action: "ice_candidate", candidate: e.candidate, user: currentUserId }));
      }
    };

    pc.onnegotiationneeded = async () => {
      if (!peerJoined.current) return;
      try {
        makingOffer.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
        console.log("📤 offer (negotiationneeded)");
      } catch (e) {
        console.error("negotiationneeded error", e);
      } finally {
        makingOffer.current = false;
      }
    };

    ws.onopen = () => console.log("✅ WS open");
    ws.onerror = e => console.error("❌ WS error", e);
    ws.onclose = () => console.warn("⚠️ WS closed");

    ws.onmessage = async ({ data }) => {
      const msg = JSON.parse(data);
      console.log("📨", msg);

      try {
        if (msg.action === "you_joined") {
          console.log("🟢 Alone in the call — wait for peer");
        }

        if (msg.action === "join" && msg.user !== currentUserId) {
          peerJoined.current = true;
          if (pc.signalingState === "stable") {
            console.log("🆕 peer joined, sending offer");
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
          }
        }

        if (msg.action === "offer" && msg.user !== currentUserId) {
          console.log("↘️ offer", msg.user);
          peerJoined.current = true;
          const offerDesc = new RTCSessionDescription(msg.offer);
          const ready = !makingOffer.current && (pc.signalingState === "stable" || pc.signalingState === "have-remote-offer");
          const collision = msg.offer && !ready;

          if (collision && !polite.current) {
            console.log("⚔️  Impolite collision — ignoring offer");
            return;
          }
          if (collision && polite.current) {
            console.log("🔄 Polite collision — rollback local offer");
            await pc.setLocalDescription({ type: "rollback" });
          }

          await pc.setRemoteDescription(offerDesc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          ws.send(JSON.stringify({ action: "answer", answer, user: currentUserId }));
          pendingIce.current.forEach(c => pc.addIceCandidate(c).catch(console.error));
          pendingIce.current = [];
        }

        if (msg.action === "answer" && msg.user !== currentUserId) {
          console.log("↘️ answer", msg.user);
          await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
          pendingIce.current.forEach(c => pc.addIceCandidate(c).catch(console.error));
          pendingIce.current = [];
        }

        if (msg.action === "ice_candidate" && msg.user !== currentUserId && msg.candidate) {
          console.log("❄️ ICE ←", msg.user);
          const cand = new RTCIceCandidate(msg.candidate);
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(cand).catch(console.error);
          } else {
            pendingIce.current.push(cand);
          }
        }
      } catch (e) {
        console.error("RTC error", e);
      }
    };

    return () => {
      ws.close();
      pc.close();
    };
  }, [callId, currentUserId, role]);

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
    try {
      await axios.delete(`${API_URL}/calls/calls/${callId}/leave`, { headers: authHeaders() });
    } catch {}
    if (onLeave) onLeave();
  };

  if (!callId) return <p>🔌 Waiting for call...</p>;

  return (
    <div className="call-container">
      <h2>📞 Call in progress</h2>
      <div className="video-wrapper">
        <video ref={remoteVideoRef} autoPlay playsInline className="video" />
        <video ref={localVideoRef} autoPlay muted playsInline className="video" />
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
