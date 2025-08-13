// src/components/ProfilePhoto.jsx
import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import AvatarEditor from "react-avatar-editor";
import "../pages/ProfilePhoto.css";
import { API_URL } from "../../config";
import avatar from "../assets/user-avatar.svg";

const ProfilePhoto = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0.5, y: 0.5 });
  const [showEditor, setShowEditor] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  // Нормалізація URL: додаємо базу для /static/... і форсимо https
  const toAbsoluteHttps = (url) => {
    if (!url) return null;
    let out = url;

    // якщо в БД збережено відносний шлях (/static/...)
    if (out.startsWith("/")) {
      const base = (API_URL || window.location.origin).replace(/\/$/, "");
      out = `${base}${out}`;
    }

    // уникнути mixed content
    if (/^http:\/\//i.test(out) && window.location.protocol === "https:") {
      out = out.replace(/^http:\/\//i, "https://");
    }
    return out;
  };

  // Показати поточне фото, якщо є в user у localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.profile_image) {
          setPhotoUrl(toAbsoluteHttps(u.profile_image));
        }
      }
    } catch (_) {
      /* ignore */
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!editorRef.current) return;

    const canvas = editorRef.current.getImageScaledToCanvas();
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      // Імʼя файлу допоможе бекенду визначити тип за потреби
      const fileWithName = new File([blob], "avatar.png", { type: blob.type || "image/png" });
      formData.append("file", fileWithName);

      try {
        const response = await axios.patch(`${API_URL}/users/me/photo`, formData, {
          headers: {
            ...headers,
            "Content-Type": "multipart/form-data",
          },
        });

        // бек повертає абсолютний URL — але все одно нормалізуємо
        const url = toAbsoluteHttps(response.data?.photo_url);
        setPhotoUrl(url);
        setShowEditor(false);

        // оновимо локального юзера, щоб фото зʼявлялось після перезавантаження
        try {
          const raw = localStorage.getItem("user");
          if (raw) {
            const u = JSON.parse(raw);
            // збережемо відносний шлях теж, якщо треба. Але є абсолютний — ок.
            u.profile_image = url;
            localStorage.setItem("user", JSON.stringify(u));
          }
        } catch (_) {
          /* ignore */
        }
      } catch (error) {
        console.error("Upload failed:", error);
      }
    }, "image/png", 0.92);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/users/me/photo`, { headers });
      setPhotoUrl(null);
      setSelectedFile(null);
      setShowEditor(false);

      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const u = JSON.parse(raw);
          u.profile_image = null;
          localStorage.setItem("user", JSON.stringify(u));
        }
      } catch (_) {
        /* ignore */
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div className="photo-wrapper">
      {photoUrl && !showEditor && (
        <img src={photoUrl} alt="Profile" className="profile-photo-img" />
      )}

      {!photoUrl && !showEditor && (
        <div className="profile-placeholder">
          <img
            src={avatar}
            alt="No Photo"
            className="profile-placeholder-noPhoto"
            width="200px"
            height="200px"
          />
        </div>
      )}

      {showEditor && selectedFile && (
        <div className="photo-editor">
          <AvatarEditor
            ref={editorRef}
            image={selectedFile}
            width={200}
            height={200}
            border={50}
            scale={scale}
            position={position}
            onPositionChange={setPosition}
            borderRadius={100}
          />
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
          <button onClick={handleSave}>Confirm</button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button onClick={() => fileInputRef.current?.click()} className="update-photo">
        Update Photo
      </button>
      <button onClick={handleDelete} className="delete-photo">
        Delete Photo
      </button>
    </div>
  );
};

export default ProfilePhoto;
