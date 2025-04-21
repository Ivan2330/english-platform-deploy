// src/pages/AdminDashboardPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ProfilePhoto from "../components/ProfilePhoto";
import "./AdminDashboard.css";
import { API_URL } from "../../config";



const AdminDashboardPage = () => {
  const [adminData, setAdminData] = useState(null);
  const [classrooms, setClassrooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminDataAndClassrooms = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [adminRes, classRes] = await Promise.all([
          axios.get(`${API_URL}/staff/staff/me`, { headers }),
          axios.get(`${API_URL}/classrooms/classrooms/`, { headers })
        ]);

        setAdminData(adminRes.data);
        const filtered = classRes.data.filter(cls => cls.teacher_id === adminRes.data.id);
        setClassrooms(filtered);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchAdminDataAndClassrooms();
  }, []);

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header"><h1 className="dashboard-header-h1">Prime Academy</h1></header>

      <section className="dashboard-content">
        <div className="left-panel-buttons">
          <div className="profile-info">
            <h2>{adminData?.username || "Name Surname"} {adminData?.level || "No"} 🚀</h2>
          </div>
          <ProfilePhoto />

        </div>
        <ul className="button-group" class="button-group">
         <ul className="button-group-l" class="button-group-l">
          <li className="button-group-li" itemID="li-1" class="button-group-li" id="li-1">
            <button onClick={() => navigate("/create-user")}>Create User</button>
          </li>
          <li className="button-group-li" itemID="li-2" class="button-group-li" id="li-2">
            <button onClick={() => navigate("/create-user")}>Users List</button>
          </li>
         
          <li className="button-group-li" class="button-group-li">
                <button onClick={() => navigate("/task-list")}>Task List</button>
              </li>
              <li className="button-group-li" class="button-group-li">
                <button onClick={() => navigate("/create-task")}>Create Task</button>
                </li>
              
            
            </ul>
            <ul className="button-group-r" class="button-group-r">
            <li className="button-group-r-li" itemID="button-c" class="button-group-r-li" id="button-c">
            <button  onClick={() => navigate("/create-class")}>Create Class</button>
          </li>
            
          <li className="button-group-r-li" itemID="button-a" class="button-group-r-li" id="button-a">
            <button onClick={() => navigate("/all-classes")}>All Classes</button>
          </li>

            </ul>
          </ul>
        

        <div className="right-panel-classes">
          <h3>Classes</h3>
          <div className="r-panel-list">
            {classrooms.map(cls => (
              <ul key={cls.id} className="r-panel-item">
                <li className="r-panel-item-id">{cls.id}</li>
                <li className="r-panel-item-name">{cls.name}</li>
                <li className="r-panel-item-go"><button className="go-btn" onClick={() => navigate(`/classroom/${cls.id}`)}>Go</button></li> 
              </ul>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboardPage;