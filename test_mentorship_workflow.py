import os
import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import User, MentorProfile, MentorshipRequest, Message, Session

client = TestClient(app)

def test_full_mentorship_workflow_and_security():
    # 1. Register a mentor account
    mentor_email = "test.mentor.alpha@skillsphere.ai"
    mentor_reg = client.post("/api/auth/register", json={
        "email": mentor_email,
        "password": "MentorPassword123!",
        "full_name": "Dr. Sarah Connor",
        "role": "mentor",
        "target_role": "AI / ML Researcher",
        "skill_level": "Advanced"
    })
    assert mentor_reg.status_code in [201, 409]
    
    # Login mentor
    mentor_login = client.post("/api/auth/login", json={
        "email": mentor_email,
        "password": "MentorPassword123!"
    })
    assert mentor_login.status_code == 200
    mentor_token = mentor_login.json()["access_token"]
    mentor_id = mentor_login.json()["user"]["id"]
    mentor_headers = {"Authorization": f"Bearer {mentor_token}"}

    # Update mentor profile to ensure it is published and discoverable
    prof_update = client.put("/api/mentors/profile/me", headers=mentor_headers, json={
        "title": "Principal Deep Learning Specialist",
        "bio": "Expert in deep neural architectures, PyTorch pipelines, and LLM fine-tuning.",
        "skills": "PyTorch, CUDA, Transformers, MLOps",
        "expertise_domain": "Deep Learning",
        "years_of_experience": 8,
        "languages": "English",
        "meeting_preference": "online",
        "available_days": "Mon, Wed",
        "available_times": "19:00 - 21:00 UTC",
        "is_published": True
    })
    assert prof_update.status_code == 200
    assert prof_update.json()["is_published"] is True

    # 2. Register a student account
    student_email = "test.student.beta@skillsphere.ai"
    student_reg = client.post("/api/auth/register", json={
        "email": student_email,
        "password": "StudentPassword123!",
        "full_name": "Alex Rivera",
        "role": "student",
        "learning_goal": "Master PyTorch and build portfolio models",
        "target_role": "AI / ML Engineer",
        "skill_level": "Beginner"
    })
    assert student_reg.status_code in [201, 409]

    # Login student
    student_login = client.post("/api/auth/login", json={
        "email": student_email,
        "password": "StudentPassword123!"
    })
    assert student_login.status_code == 200
    student_token = student_login.json()["access_token"]
    student_id = student_login.json()["user"]["id"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # 3. Log in as the student and find the mentor in directory
    search_res = client.get("/api/mentors?q=Sarah")
    assert search_res.status_code == 200
    mentors_found = search_res.json()
    assert any(m["user_id"] == mentor_id for m in mentors_found)

    # 4. Submit a mentorship request as student
    req_res = client.post("/api/mentorship-requests", headers=student_headers, json={
        "mentor_id": mentor_id,
        "learning_goals": "I want to transition into ML engineering and finish two projects.",
        "message": "Hi Dr. Connor, I admire your work in deep learning. Could we connect?",
        "preferred_times": "Wednesdays at 19:00 UTC"
    })
    assert req_res.status_code in [201, 409]
    if req_res.status_code == 201:
        request_data = req_res.json()
        request_id = request_data["id"]
        assert request_data["status"] == "pending"
    else:
        # Existing request from previous run
        user_reqs = client.get("/api/mentorship-requests", headers=student_headers).json()
        target = [r for r in user_reqs if r["mentor_id"] == mentor_id][0]
        request_id = target["id"]

    # 5. Log in as mentor and inspect incoming request, then accept
    mentor_reqs = client.get("/api/mentorship-requests", headers=mentor_headers).json()
    matching_req = next((r for r in mentor_reqs if r["id"] == request_id), None)
    assert matching_req is not None

    if matching_req["status"] == "pending":
        accept_res = client.patch(f"/api/mentorship-requests/{request_id}", headers=mentor_headers, json={
            "status": "accepted",
            "mentor_response": "Happy to guide you Alex! Let's start this week."
        })
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "accepted"

    # 6. Log in as student and confirm updated status
    student_req_check = client.get(f"/api/mentorship-requests/{request_id}", headers=student_headers).json()
    assert student_req_check["status"] == "accepted"
    conversation_id = student_req_check["conversation_id"]
    assert conversation_id is not None

    # 7. Send a message from each account and verify persistence
    # Student sends message
    msg1_res = client.post(f"/api/conversations/{conversation_id}/messages", headers=student_headers, json={
        "content": "Thank you for accepting! When is the best time for our kickoff?"
    })
    assert msg1_res.status_code == 201

    # Mentor sends message
    msg2_res = client.post(f"/api/conversations/{conversation_id}/messages", headers=mentor_headers, json={
        "content": "Wednesday at 19:00 UTC works great for our first 45-minute sprint."
    })
    assert msg2_res.status_code == 201

    # Fetch conversation messages as student
    student_msgs = client.get(f"/api/conversations/{conversation_id}/messages", headers=student_headers).json()
    assert len(student_msgs) >= 2
    assert any(m["content"] == msg1_res.json()["content"] for m in student_msgs)
    assert any(m["content"] == msg2_res.json()["content"] for m in student_msgs)

    # 8. Schedule a session and confirm it appears on both dashboards
    session_res = client.post("/api/sessions", headers=student_headers, json={
        "student_id": student_id,
        "mentor_id": mentor_id,
        "title": "Kickoff & Portfolio Roadmap Review",
        "scheduled_at": "2026-10-21T19:00:00Z",
        "duration_minutes": 45,
        "meeting_method": "online",
        "meeting_link_or_location": "https://meet.google.com/xyz-skillsphere-kickoff",
        "notes": "Bring portfolio repo links"
    })
    assert session_res.status_code in [201, 409]
    
    # Check student sessions
    student_sessions = client.get("/api/sessions", headers=student_headers).json()
    assert any(s["mentor_id"] == mentor_id for s in student_sessions)

    # Check mentor sessions
    mentor_sessions = client.get("/api/sessions", headers=mentor_headers).json()
    assert any(s["student_id"] == student_id for s in mentor_sessions)

    # 9. Verify database persistence by creating a fresh DB session
    with SessionLocal() as db_verify:
        db_student = db_verify.query(User).filter(User.id == student_id).first()
        assert db_student is not None
        assert db_student.email == student_email
        db_req = db_verify.query(MentorshipRequest).filter(MentorshipRequest.id == request_id).first()
        assert db_req.status == "accepted"

    # 10. Security & permission verification: unauthorized user cannot access private messages or alter requests
    unauth_reg = client.post("/api/auth/register", json={
        "email": "intruder@skillsphere.ai",
        "password": "IntruderPassword123!",
        "full_name": "Intruder User",
        "role": "student"
    })
    if unauth_reg.status_code == 201:
        intruder_token = unauth_reg.json()["access_token"]
    else:
        intruder_token = client.post("/api/auth/login", json={
            "email": "intruder@skillsphere.ai",
            "password": "IntruderPassword123!"
        }).json()["access_token"]

    intruder_headers = {"Authorization": f"Bearer {intruder_token}"}

    # Intruder tries to read private conversation
    unauth_chat = client.get(f"/api/conversations/{conversation_id}/messages", headers=intruder_headers)
    assert unauth_chat.status_code == 403

    # Intruder tries to send message in private conversation
    unauth_send = client.post(f"/api/conversations/{conversation_id}/messages", headers=intruder_headers, json={
        "content": "Malicious attempt to intercept chat"
    })
    assert unauth_send.status_code == 403

    # Intruder tries to modify someone else's request
    unauth_mod = client.patch(f"/api/mentorship-requests/{request_id}", headers=intruder_headers, json={
        "status": "rejected"
    })
    assert unauth_mod.status_code == 403
