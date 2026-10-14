from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, MentorshipRequest, Conversation, Notification
from schemas import (
    MentorshipRequestCreate, MentorshipRequestUpdate, MentorshipRequestResponse
)
from auth import get_current_user

router = APIRouter(prefix="/api/mentorship-requests", tags=["mentorship-requests"])

def format_request_response(req: MentorshipRequest) -> dict:
    conv_id = req.conversation.id if req.conversation else None
    return {
        "id": req.id,
        "student_id": req.student_id,
        "mentor_id": req.mentor_id,
        "learning_goals": req.learning_goals,
        "message": req.message,
        "preferred_times": req.preferred_times,
        "status": req.status,
        "mentor_response": req.mentor_response,
        "alternative_times": req.alternative_times,
        "created_at": req.created_at,
        "updated_at": req.updated_at,
        "student": req.student,
        "mentor": req.mentor,
        "conversation_id": conv_id,
    }

@router.post("", response_model=MentorshipRequestResponse, status_code=status.HTTP_201_CREATED)
def create_mentorship_request(
    req_in: MentorshipRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id == req_in.mentor_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot submit a mentorship request to yourself."
        )

    mentor = db.query(User).filter(User.id == req_in.mentor_id).first()
    if not mentor or mentor.role != "mentor":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The specified mentor does not exist or is not registered as a mentor."
        )

    # Check for duplicate active request
    existing = db.query(MentorshipRequest).filter(
        MentorshipRequest.student_id == current_user.id,
        MentorshipRequest.mentor_id == req_in.mentor_id,
        MentorshipRequest.status.in_(["pending", "accepted"])
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have an active request ({existing.status}) with this mentor."
        )

    request_obj = MentorshipRequest(
        student_id=current_user.id,
        mentor_id=req_in.mentor_id,
        learning_goals=req_in.learning_goals.strip(),
        message=req_in.message.strip(),
        preferred_times=req_in.preferred_times.strip(),
        status="pending"
    )
    db.add(request_obj)

    # In-app notification for mentor
    notif = Notification(
        user_id=req_in.mentor_id,
        title="New Mentorship Request",
        content=f"{current_user.full_name} sent you a mentorship request: '{req_in.learning_goals[:60]}...'",
        type="request_received",
        related_id=request_obj.id
    )
    db.add(notif)
    db.commit()
    db.refresh(request_obj)

    return format_request_response(request_obj)

@router.get("", response_model=List[MentorshipRequestResponse])
def get_user_requests(
    role_view: Optional[str] = None,  # "student", "mentor", or None for auto
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(MentorshipRequest)
    if role_view == "mentor" or (role_view is None and current_user.role == "mentor"):
        query = query.filter(MentorshipRequest.mentor_id == current_user.id)
    else:
        query = query.filter(MentorshipRequest.student_id == current_user.id)

    if status_filter:
        query = query.filter(MentorshipRequest.status == status_filter)

    requests = query.order_by(MentorshipRequest.created_at.desc()).all()
    return [format_request_response(r) for r in requests]

@router.get("/{request_id}", response_model=MentorshipRequestResponse)
def get_request_detail(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(MentorshipRequest).filter(MentorshipRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    if current_user.id not in [req.student_id, req.mentor_id] and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized to view this request")

    return format_request_response(req)

@router.patch("/{request_id}", response_model=MentorshipRequestResponse)
def update_request_status(
    request_id: int,
    update_in: MentorshipRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    req = db.query(MentorshipRequest).filter(MentorshipRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")

    target_status = update_in.status

    # Validate permissions & transitions
    if target_status in ["accepted", "rejected"]:
        if current_user.id != req.mentor_id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the mentor can accept or reject this request."
            )
        if req.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition request from '{req.status}' to '{target_status}'."
            )

    elif target_status == "cancelled":
        if current_user.id != req.student_id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the requesting student can cancel this request."
            )
        if req.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only pending requests can be cancelled."
            )

    elif target_status == "completed":
        if current_user.id not in [req.student_id, req.mentor_id] and current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized")
        if req.status != "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only accepted mentorships can be marked completed."
            )

    # Apply updates
    req.status = target_status
    if update_in.mentor_response is not None:
        req.mentor_response = update_in.mentor_response.strip()
    if update_in.alternative_times is not None:
        req.alternative_times = update_in.alternative_times.strip()

    # If accepted, provision conversation if not existing
    if target_status == "accepted":
        existing_conv = db.query(Conversation).filter(Conversation.mentorship_request_id == req.id).first()
        if not existing_conv:
            conv = Conversation(
                mentorship_request_id=req.id,
                student_id=req.student_id,
                mentor_id=req.mentor_id
            )
            db.add(conv)

        # Notify student
        db.add(Notification(
            user_id=req.student_id,
            title="Mentorship Request Accepted! 🎉",
            content=f"{current_user.full_name} accepted your mentorship request. You can now message and schedule sessions.",
            type="request_accepted",
            related_id=req.id
        ))

    elif target_status == "rejected":
        # Notify student
        db.add(Notification(
            user_id=req.student_id,
            title="Mentorship Request Update",
            content=f"{current_user.full_name} declined your mentorship request." + (f" Note: {req.mentor_response}" if req.mentor_response else ""),
            type="request_rejected",
            related_id=req.id
        ))

    elif target_status == "cancelled":
        # Notify mentor
        db.add(Notification(
            user_id=req.mentor_id,
            title="Request Cancelled",
            content=f"{current_user.full_name} has cancelled their mentorship request.",
            type="request_cancelled",
            related_id=req.id
        ))

    db.commit()
    db.refresh(req)
    return format_request_response(req)
