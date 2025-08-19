import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ProfilePhoto from "../components/ProfilePhoto";
import "./StudentDashboard.css";
import logotype from "../assets/my_logo-1.svg";
import { API_URL } from "../../config";
import rocket from "../assets/rocket-svg.svg";
import class_mode from "../assets/class-mode.svg";
import eng_practice from "../assets/eng-practice.svg";
import speaking from "../assets/speaking-club.svg";
import phone_number from "../assets/phone-number.svg";
import telegram from "../assets/tel.svg";
import instagram from "../assets/instagram.svg";

const StudentDashboardPage = () => {
  const [studentData, setStudentData] = useState(null);
  const [studentClass, setStudentClass] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [studentRes, classesRes] = await Promise.all([
          axios.get(`${API_URL}/students/students/me`, { headers }),
          axios.get(`${API_URL}/classrooms/classrooms/`, { headers }),
        ]);

        setStudentData(studentRes.data);

        const matchedClass = classesRes.data.find(
          (cls) =>
            cls.students?.some((s) => s.id === studentRes.data.id) ||
            cls.student_id === studentRes.data.id
        );

        setStudentClass(matchedClass);
      } catch (error) {
        console.error("Failed to fetch student dashboard info:", error);
      }
    };

    fetchStudentData();
  }, []);

  return (
    <div className="student-dashboard-s">
      <header className="dashboard-header-s">
        <span>Prime Academy</span>
        <div className="contact-btn-dropdown">
          <button className="contact-btn">Contact us</button>
          <ul className="contact-btn-dropdown-ul">
            <li className="contact-btn-dropdown-li">
              <img src={phone_number} alt="" />
              +38 099 179 70 47
            </li>
            <li className="contact-btn-dropdown-li">
              <img src={telegram} alt="" />
              @primeacademy
            </li>
            <li className="contact-btn-dropdown-li">
              <img src={instagram} alt="" />
              @primeacademy
            </li>
          </ul>
        </div>
      </header>

      <section className="dashboard-content-s">
        <div className="left-block">
          <ProfilePhoto />
          <div className="middle-block">
            <h2>
              {studentData?.username || "Name Surname"}{" "}
              <span className="level-badge">
                {studentData?.level || "N/A"}
                <img src={rocket} alt="" />
              </span>
            </h2>
            <div className="lesson-balance">
              Lesson Balance <span>{studentData?.lesson_balance || 0}</span>
            </div>
          </div>
        </div>

        <div className="right-logo">
          <img src={logotype} alt="Student Logo" />
        </div>
      </section>

      <section className="dashboard-navigation-section">
        <div className="dashboard-navigation">
          <button className="nav-tab">Learning</button>
          {/* Прибрано "not yet available" */}
          <button className="nav-tab nav-tab-2">Additional</button>
        </div>

        <div className="student-actions">
          <div className="student-actions-build">
            {studentClass && (
              <div
                className="student-tile"
                onClick={() => navigate(`/classroom/${studentClass.id}`)}
              >
                <div className="student-tile-img">
                  <img src={class_mode} alt="Class Mode" />
                </div>
                <span>Class Mode</span>
              </div>
            )}

            <div className="student-tile">
              <div className="student-tile-img student-title-img-speaking-club">
                <img src={speaking} alt="Speaking Club" />
              </div>
              <span>Speaking Club</span>
            </div>

            {/* 🔗 Перехід на Eng Practice */}
            <div
              className="student-tile"
              onClick={() => navigate("/eng-practice")}
              style={{ cursor: "pointer" }}
            >
              <div className="student-tile-img student-title-img-speaking-club">
                <img src={eng_practice} alt="Eng Practice" />
              </div>
              <span>Eng Practice</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudentDashboardPage;
