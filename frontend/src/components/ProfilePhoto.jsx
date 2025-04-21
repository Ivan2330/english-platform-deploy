// src/components/ProfilePhoto.jsx
import React, { useState, useRef } from "react";
import axios from "axios";
import AvatarEditor from "react-avatar-editor";
import "../pages/ProfilePhoto.css"
import { API_URL } from "../../config";
import avatar from "../assets/user-avatar.svg"


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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowEditor(true);
    }
  };

  const handleSave = async () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append("file", blob);

        try {
          const response = await axios.patch(`${API_URL}/users/me/photo`, formData, {
            headers: {
              ...headers,
              "Content-Type": "multipart/form-data",
            },
          });
          setPhotoUrl(response.data.photo_url);
          setShowEditor(false);
        } catch (error) {
          console.error("Upload failed:", error);
        }
      });
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API_URL}/users/me/photo`, { headers });
      setPhotoUrl(null);
      setSelectedFile(null);
      setShowEditor(false);
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
         <img src={avatar} alt="No Photo" className="profile-placeholder-noPhoto" width="200px" height="200px" class="profile-placeholder-noPhoto"/>

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
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <button onClick={() => fileInputRef.current.click()} className="update-photo">Update Photo</button>
      <button onClick={handleDelete} className="delete-photo">Delete Photo</button>
    </div>
  );
};

export default ProfilePhoto;