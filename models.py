from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, Float, ForeignKey
)
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), default="student", nullable=False)  # "student", "mentor", "admin"
    avatar_url = Column(String(500), nullable=True)
    learning_goal = Column(String(500), nullable=True)
    target_role = Column(String(255), nullable=True)
    skill_level = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    mentor_profile = relationship("MentorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    sent_requests = relationship("MentorshipRequest", foreign_keys="MentorshipRequest.student_id", back_populates="student")
    received_requests = relationship("MentorshipRequest", foreign_keys="MentorshipRequest.mentor_id", back_populates="mentor")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    bio = Column(Text, nullable=False)
    skills = Column(String(500), nullable=False)  # e.g. "Python, PyTorch, LLMs, MLOps"
    expertise_domain = Column(String(255), default="Machine Learning", nullable=False)
    education = Column(String(255), nullable=True)
    years_of_experience = Column(Integer, default=3, nullable=False)
    linkedin_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    languages = Column(String(255), default="English", nullable=False)
    meeting_preference = Column(String(50), default="online", nullable=False)  # "online", "in-person", "both"
    available_days = Column(String(255), default="Mon, Wed, Fri", nullable=False)
    available_times = Column(String(255), default="18:00 - 21:00 UTC", nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    rating = Column(Float, default=5.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="mentor_profile")

class MentorshipRequest(Base):
    __tablename__ = "mentorship_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    learning_goals = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    preferred_times = Column(String(255), nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # "pending", "accepted", "rejected", "cancelled", "completed"
    mentor_response = Column(Text, nullable=True)
    alternative_times = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    student = relationship("User", foreign_keys=[student_id], back_populates="sent_requests")
    mentor = relationship("User", foreign_keys=[mentor_id], back_populates="received_requests")
    conversation = relationship("Conversation", back_populates="request", uselist=False, cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="request", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    mentorship_request_id = Column(Integer, ForeignKey("mentorship_requests.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    request = relationship("MentorshipRequest", back_populates="conversation")
    student = relationship("User", foreign_keys=[student_id])
    mentor = relationship("User", foreign_keys=[mentor_id])
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])

class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    mentorship_request_id = Column(Integer, ForeignKey("mentorship_requests.id", ondelete="SET NULL"), nullable=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mentor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=45, nullable=False)
    meeting_method = Column(String(50), default="online", nullable=False)  # "online", "in-person"
    meeting_link_or_location = Column(String(500), nullable=False)
    status = Column(String(50), default="confirmed", nullable=False)  # "proposed", "confirmed", "rescheduled", "cancelled", "completed"
    notes = Column(Text, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    request = relationship("MentorshipRequest", back_populates="sessions")
    student = relationship("User", foreign_keys=[student_id])
    mentor = relationship("User", foreign_keys=[mentor_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)  # "request", "message", "session", "system"
    related_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")

class AITrendItem(Base):
    __tablename__ = "ai_trend_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    summary = Column(Text, nullable=False)
    url = Column(String(1000), unique=True, index=True, nullable=False)
    source_name = Column(String(255), nullable=False)
    category = Column(String(100), default="Models & LLMs", nullable=False)
    published_at = Column(DateTime, nullable=False, index=True)
    retrieved_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    tags = Column(String(500), nullable=True)

class AIToolItem(Base):
    __tablename__ = "ai_tool_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), default="Coding & Dev", nullable=False)
    use_cases = Column(Text, nullable=False)
    website_url = Column(String(1000), nullable=False)
    pricing_model = Column(String(100), default="Freemium", nullable=False)
    pricing_details = Column(String(255), nullable=True)
    verified_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class AITrendRefreshState(Base):
    __tablename__ = "ai_trend_refresh_state"

    id = Column(Integer, primary_key=True)
    last_successful_refresh = Column(DateTime, nullable=True)
    next_scheduled_refresh = Column(DateTime, nullable=True)
    items_retrieved_count = Column(Integer, default=0, nullable=False)
    status_message = Column(String(255), default="Operational", nullable=False)
    source_health_json = Column(Text, default="{}", nullable=False)

