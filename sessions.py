from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from database import get_db
from models import User, Session as MentorshipSession, MentorshipRequest, Notification
from schemas import SessionCreate, SessionUpdate, SessionResponse
from auth import get_current_user

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.get("", response_model=List[SessionResponse])
def get_user_sessions(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = (
        db.query(MentorshipSession)
        .filter(or_(MentorshipSession.student_id == current_user.id, MentorshipSession.mentor_id == current_user.id))
    )
    if status_filter:
        query = query.filter(MentorshipSession.status == status_filter)

    sessions = query.order_by(MentorshipSession.scheduled_at.asc()).all()
    return sessions

@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_in: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify participants
    if current_user.id not in [session_in.student_id, session_in.mentor_id]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be either the student or mentor to schedule a session"
        )

    # Check for verified relationship
    accepted_rel = db.query(MentorshipRequest).filter(
        MentorshipRequest.student_id == session_in.student_id,
        MentorshipRequest.mentor_id == session_in.mentor_id,
        MentorshipRequest.status == "accepted"
    ).first()
    if not accepted_rel and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sessions can only be scheduled for accepted mentorships"
        )

    # Conflict check for mentor: duration overlap
    session_start = session_in.scheduled_at
    session_end = session_start + timedelta(minutes=session_in.duration_minutes)

    conflicts = db.query(MentorshipSession).filter(
        MentorshipSession.mentor_id == session_in.mentor_id,
        MentorshipSession.status.in_(["confirmed", "proposed"])
    ).all()

    for c in conflicts:
        c_start = c.scheduled_at
        c_end = c_start + timedelta(minutes=c.duration_minutes)
        if (session_start < c_end) and (session_end > c_start):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Scheduling conflict: The mentor already has a session from {c_start.strftime('%Y-%m-%d %H:%M')} to {c_end.strftime('%H:%M')} UTC."
            )

    sess = MentorshipSession(
        mentorship_request_id=session_in.mentorship_request_id or (accepted_rel.id if accepted_rel else None),
        student_id=session_in.student_id,
        mentor_id=session_in.mentor_id,
        title=session_in.title.strip(),
        scheduled_at=session_in.scheduled_at,
        duration_minutes=session_in.duration_minutes,
        meeting_method=session_in.meeting_method,
        meeting_link_or_location=session_in.meeting_link_or_location.strip(),
        status="confirmed",
        notes=session_in.notes,
        created_by_id=current_user.id
    )
    db.add(sess)

    # Notify counterparty
    other_party_id = session_in.mentor_id if current_user.id == session_in.student_id else session_in.student_id
    db.add(Notification(
        user_id=other_party_id,
        title="Session Scheduled 📅",
        content=f"{current_user.full_name} scheduled a session '{sess.title}' on {sess.scheduled_at.strftime('%b %d, %Y at %H:%M UTC')}.",
        type="session_scheduled",
        related_id=sess.id
    ))

    db.commit()
    db.refresh(sess)
    return sess

@router.patch("/{session_id}", response_model=SessionResponse)
def update_session(
    session_id: int,
    session_in: SessionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sess = db.query(MentorshipSession).filter(MentorshipSession.id == session_id).first()
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    if current_user.id not in [sess.student_id, sess.mentor_id] and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")

    update_dict = session_in.model_dump(exclude_unset=True)

    # If rescheduling, check conflicts
    if "scheduled_at" in update_dict:
        new_start = update_dict["scheduled_at"]
        new_dur = update_dict.get("duration_minutes", sess.duration_minutes)
        new_end = new_start + timedelta(minutes=new_dur)

        conflicts = db.query(MentorshipSession).filter(
            MentorshipSession.id != sess.id,
            MentorshipSession.mentor_id == sess.mentor_id,
            MentorshipSession.status.in_(["confirmed", "proposed"])
        ).all()
        for c in conflicts:
            c_start = c.scheduled_at
            c_end = c_start + timedelta(minutes=c.duration_minutes)
            if (new_start < c_end) and (new_end > c_start):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Scheduling conflict with an existing session."
                )

    for field, val in update_dict.items():
        setattr(sess, field, val)

    other_party_id = sess.mentor_id if current_user.id == sess.student_id else sess.student_id
    db.add(Notification(
        user_id=other_party_id,
        title=f"Session Updated: {sess.title}",
        content=f"{current_user.full_name} updated session status to '{sess.status}'.",
        type="session_updated",
        related_id=sess.id
    ))

    db.commit()
    db.refresh(sess)
    return sess
