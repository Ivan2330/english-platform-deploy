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

  // Робимо абсолютний HTTPS-URL (щоб не було mixed content)
  const toAbsoluteHttps = (url) => {
    if (!url) return null;
    let out = url;

    if (out.startsWith("/")) {
      const base = (API_URL || window.location.origin).replace(/\/$/, "");
      out = `${base}${out}`;
    }
    if (/^http:\/\//i.test(out) && window.location.protocol === "https:") {
      out = out.replace(/^http:\/\//i, "https://");
    }
    return out;
  };

  // Підтягнути фото з localStorage.user (щоб не мигало після перезавантаження)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.profile_image) {
          setPhotoUrl(toAbsoluteHttps(u.profile_image));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowEditor(true);
    }
  };

  const handleSave = async () => {
    if (!editorRef.current) return;

    const canvas = editorRef.current.getImageScaledToCanvas();

    canvas.toBlob(
      async (blob) => {
        if (!blob) return;

        // Надішлемо як file з ім'ям
        const fileWithName = new File([blob], "avatar.png", { type: blob.type || "image/png" });
        const formData = new FormData();
        formData.append("file", fileWithName);

        try {
          const response = await axios.patch(`${API_URL}/users/me/photo`, formData, {
            headers: {
              ...headers,
              "Content-Type": "multipart/form-data",
            },
          });

          // нормалізуємо URL і додаємо cache-buster
          const rawUrl = response.data?.photo_url;
          const url = toAbsoluteHttps(rawUrl);
          const busted = url ? `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}` : null;

          setPhotoUrl(busted);
          setShowEditor(false);

          // оновимо localStorage.user
          try {
            const raw = localStorage.getItem("user");
            if (raw) {
              const u = JSON.parse(raw);
              u.profile_image = url; // збережемо абсолютний URL
              localStorage.setItem("user", JSON.stringify(u));
            }
          } catch {
            /* ignore */
          }
        } catch (error) {
          console.error("Upload failed:", error);
        }
      },
      "image/png",
      0.92
    );
  };

  // ❗ Видалили кнопки "Update Photo" та "Delete Photo".
  // Щоб не втратити зручність — фото/плейсхолдер клікабельні для вибору файлу.
  const openPicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  return (
    <div className="photo-wrapper">
      {photoUrl && !showEditor && (
        <img
          src={photoUrl}
          alt="Profile"
          className="profile-photo-img"
          onClick={openPicker}
          style={{ cursor: "pointer" }}
          title="Click to update photo"
        />
      )}

      {!photoUrl && !showEditor && (
        <div className="profile-placeholder" onClick={openPicker} style={{ cursor: "pointer" }}>
          <img
            src={avatar}
            alt="No Photo"
            className="profile-placeholder-noPhoto"
            width="200"
            height="200"
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

      {/* прихований інпут — викликається кліком по фото/плейсхолдеру */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ProfilePhoto;
