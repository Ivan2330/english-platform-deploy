// src/components/ProfilePhoto.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import AvatarEditor from "react-avatar-editor";
import "../pages/ProfilePhoto.css";
import { API_URL } from "../../config";
import avatar from "../assets/user-avatar.svg";

const ProfilePhoto = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [scale, setScale] = useState(1.2);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [showEditor, setShowEditor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const toAbsolute = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    // якщо бек повернув відносний /static/..., домалюємо базу
    return `${API_URL.replace(/\/$/, "")}${url}`;
  };

  // Підтягуємо поточне фото користувача зі свого профілю
  useEffect(() => {
    const fetchMe = async () => {
      try {
        setErr(null);
        // спершу пробуємо staff, інакше students
        const res =
          (await axios.get(`${API_URL}/staff/staff/me`, { headers }).catch(() => null)) ||
          (await axios.get(`${API_URL}/students/students/me`, { headers }).catch(() => null));

        const img = res?.data?.profile_image;
        setPhotoUrl(toAbsolute(img));
      } catch (e) {
        // не фейлимо UI
      }
    };
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      setErr("Дозволені формати: PNG / JPEG / WEBP");
      return;
    }
    setSelectedFile(file);
    setShowEditor(true);
    setErr(null);
    setMsg(null);
  };

  const blobToFile = (blob, filename) =>
    new File([blob], filename, { type: blob.type || "image/png" });

  const handleSave = async () => {
    if (!editorRef.current) return;
    setLoading(true);
    setErr(null);
    setMsg(null);

    const canvas = editorRef.current.getImageScaledToCanvas();

    const doUpload = async (blob) => {
      const imageFile = blobToFile(blob, "avatar.png");
      const formData = new FormData();
      formData.append("file", imageFile);

      try {
        const response = await axios.patch(`${API_URL}/users/me/photo`, formData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
        const url = response.data?.photo_url;
        setPhotoUrl(url || null);
        setShowEditor(false);
        setSelectedFile(null);
        setMsg("Фото оновлено ✅");
      } catch (error) {
        setErr(error?.response?.data?.detail || "Upload failed");
      } finally {
        setLoading(false);
      }
    };

    canvas.toBlob(
      (blob) => {
        if (blob) return doUpload(blob);
        // Safari фолбек: dataURL -> Blob
        const dataUrl = canvas.toDataURL("image/png");
        const binary = atob(dataUrl.split(",")[1]);
        const array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
        doUpload(new Blob([array], { type: "image/png" }));
      },
      "image/png",
      0.92
    );
  };

  const handleDelete = async () => {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      await axios.delete(`${API_URL}/users/me/photo`, { headers });
      setPhotoUrl(null);
      setSelectedFile(null);
      setShowEditor(false);
      setMsg("Фото видалено");
    } catch (error) {
      setErr(error?.response?.data?.detail || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="photo-wrapper">
      {msg && <div className="alert success">{msg}</div>}
      {err && <div className="alert error">{err}</div>}

      {!showEditor && (
        <div className="avatar-box">
          {photoUrl ? (
            <img src={photoUrl} alt="Profile" className="profile-photo-img" />
          ) : (
            <div className="profile-placeholder">
              <img
                src={avatar}
                alt="No Photo"
                width="200"
                height="200"
                className="profile-placeholder-noPhoto"
              />
            </div>
          )}
        </div>
      )}

      {showEditor && selectedFile && (
        <div className="photo-editor">
          <AvatarEditor
            ref={editorRef}
            image={selectedFile}
            width={220}
            height={220}
            border={40}
            scale={scale}
            position={position}
            onPositionChange={setPosition}
            borderRadius={110}
          />
          <div className="controls">
            <label>
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
              />
            </label>
            <div className="editor-actions">
              <button className="btn primary" onClick={handleSave} disabled={loading}>
                {loading ? "Saving..." : "Confirm"}
              </button>
              <button className="btn ghost" onClick={() => setShowEditor(false)} disabled={loading}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div className="bottom-actions">
        <button onClick={() => fileInputRef.current?.click()} className="update-photo btn">
          Update Photo
        </button>
        <button className="delete-photo btn danger" onClick={handleDelete} disabled={!photoUrl || loading}>
          Delete Photo
        </button>
      </div>
    </div>
  );
};

export default ProfilePhoto;
