from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import User, Conversation, Message, Notification
from schemas import MessageCreate, MessageResponse, ConversationResponse
from auth import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

@router.get("", response_model=List[ConversationResponse])
def get_user_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    convs = (
        db.query(Conversation)
        .filter(or_(Conversation.student_id == current_user.id, Conversation.mentor_id == current_user.id))
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    results = []
    for c in convs:
        last_msg = (
            db.query(Message)
            .filter(Message.conversation_id == c.id)
            .order_by(Message.created_at.desc())
            .first()
        )
        unread_count = (
            db.query(Message)
            .filter(
                Message.conversation_id == c.id,
                Message.sender_id != current_user.id,
                Message.is_read == False
            )
            .count()
        )

        last_msg_resp = None
        if last_msg:
            last_msg_resp = MessageResponse(
                id=last_msg.id,
                conversation_id=last_msg.conversation_id,
                sender_id=last_msg.sender_id,
                sender_name=last_msg.sender.full_name if last_msg.sender else "User",
                content=last_msg.content,
                is_read=last_msg.is_read,
                created_at=last_msg.created_at
            )

        results.append(
            ConversationResponse(
                id=c.id,
                mentorship_request_id=c.mentorship_request_id,
                student=c.student,
                mentor=c.mentor,
                last_message=last_msg_resp,
                unread_count=unread_count,
                updated_at=c.updated_at
            )
        )
    return results

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if current_user.id not in [conv.student_id, conv.mentor_id] and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You are not a participant in this conversation"
        )

    # Mark incoming messages as read
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).update({"is_read": True})
    db.commit()

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    return [
        MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_id,
            sender_name=m.sender.full_name if m.sender else "User",
            content=m.content,
            is_read=m.is_read,
            created_at=m.created_at
        )
        for m in messages
    ]

@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    conversation_id: int,
    msg_in: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    if current_user.id not in [conv.student_id, conv.mentor_id] and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: You cannot send messages in this conversation"
        )

    msg = Message(
        conversation_id=conv.id,
        sender_id=current_user.id,
        content=msg_in.content.strip(),
        is_read=False
    )
    db.add(msg)

    conv.updated_at = datetime.utcnow()

    # Recipient is the other user
    recipient_id = conv.mentor_id if current_user.id == conv.student_id else conv.student_id

    # Add notification for recipient
    db.add(Notification(
        user_id=recipient_id,
        title="New Message",
        content=f"{current_user.full_name}: {msg_in.content[:50]}",
        type="new_message",
        related_id=conv.id
    ))

    db.commit()
    db.refresh(msg)

    return MessageResponse(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        sender_name=current_user.full_name,
        content=msg.content,
        is_read=msg.is_read,
        created_at=msg.created_at
    )
