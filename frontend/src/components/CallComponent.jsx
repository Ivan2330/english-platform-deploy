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
  const peerConnectionRef = useRef(null);
  const isCaller = useRef(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const getToken = () => localStorage.getItem("token");

  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
      }
    };
    setupMedia();
  }, []);

  useEffect(() => {
    const initCall = async () => {
      try {
        const headers = getAuthHeaders();
        let call;

        const res = await axios.get(`${API_URL}/calls/calls/?classroom_id=${classroomId}`, { headers });
        const activeCall = res.data.find(c => c.status === "active");

        if (role === "staff") {
          if (!activeCall) {
            const create = await axios.post(`${API_URL}/calls/calls/`, { classroom_id: classroomId, status: "active" }, { headers });
            call = create.data;
          } else {
            call = activeCall;
          }
        } else {
          if (!activeCall) {
            console.warn("No active call");
            return;
          }
          call = activeCall;
        }

        const res2 = await axios.get(`${API_URL}/calls/calls/${call.id}/participants`, { headers });
        const existing = res2.data.find(p => p.user_id === currentUserId);

        if (!existing || existing.left_at !== null) {
          await axios.post(`${API_URL}/calls/calls/${call.id}/join`, {}, { headers });
        }

        if (res2.data.length > 0) {
          isCaller.current = true;
        }

        setCallId(call.id);
      } catch (err) {
        console.error("Call init error:", err);
      }
    };
    initCall();
  }, [classroomId, currentUserId, role]);

  useEffect(() => {
    if (!callId) return;

    const token = getToken();
    const ws = new WebSocket(`${WS_URL}/calls-ws/ws/calls/${callId}?token=${token}`);
    socketRef.current = ws;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;

    mediaStreamRef.current?.getTracks().forEach(track => pc.addTrack(track, mediaStreamRef.current));

    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current && !remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject = streams[0];
      }
    };

    pc.onicecandidate = event => {
      if (event.candidate) {
        ws.send(JSON.stringify({ action: "ice_candidate", candidate: event.candidate, user: currentUserId }));
      }
    };

    ws.onmessage = async event => {
      const data = JSON.parse(event.data);
      console.log("WS MSG:", data);

      if (data.action === "join" && data.user !== currentUserId) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
      }

      if (data.action === "offer" && data.user !== currentUserId) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        ws.send(JSON.stringify({ action: "answer", answer, user: currentUserId }));
      }

      if (data.action === "answer" && data.user !== currentUserId) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }

      if (data.action === "ice_candidate" && data.user !== currentUserId && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.error("ICE error:", e);
        }
      }
    };

    ws.onopen = async () => {
      // якщо ти приєднався і хтось був — ти створюєш offer
      if (isCaller.current) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        ws.send(JSON.stringify({ action: "offer", offer, user: currentUserId }));
      }
    };

    return () => {
      ws.close();
    };
  }, [callId, currentUserId]);

  const toggleMic = () => {
    const track = mediaStreamRef.current?.getAudioTracks()[0];
    if (track) {
      const newStatus = !track.enabled;
      track.enabled = newStatus;
      setMicOn(newStatus);
      socketRef.current?.send(JSON.stringify({ action: "toggle_mic", status: newStatus }));
    }
  };

  const toggleCam = () => {
    const track = mediaStreamRef.current?.getVideoTracks()[0];
    if (track) {
      const newStatus = !track.enabled;
      track.enabled = newStatus;
      setCamOn(newStatus);
      socketRef.current?.send(JSON.stringify({ action: "toggle_camera", status: newStatus }));
    }
  };

  const leaveCall = async () => {
    socketRef.current?.send(JSON.stringify({ action: "end_call" }));
    socketRef.current?.close();
    try {
      await axios.delete(`${API_URL}/calls/calls/${callId}/leave`, { headers: getAuthHeaders() });
    } catch (err) {
      console.error("Leave error:", err);
    }
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    if (typeof onLeave === "function") onLeave();
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
        <button onClick={toggleMic}>{micOn ? <img src={micro_on} /> : <img src={micro_off} />}</button>
        <button onClick={toggleCam}>{camOn ? <img src={camera_on} /> : <img src={camera_off} />}</button>
        <button onClick={leaveCall}><img src={end_call} /></button>
      </div>
    </div>
  );
};

export default CallComponent;