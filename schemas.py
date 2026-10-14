from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# User Schemas
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role: str = Field("student", pattern="^(student|mentor)$")
    avatar_url: Optional[str] = None
    learning_goal: Optional[str] = None
    target_role: Optional[str] = None
    skill_level: Optional[str] = "Beginner"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    avatar_url: Optional[str] = None
    learning_goal: Optional[str] = None
    target_role: Optional[str] = None
    skill_level: Optional[str] = None
    created_at: datetime

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    learning_goal: Optional[str] = None
    target_role: Optional[str] = None
    skill_level: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Mentor Profile Schemas
class MentorProfileBase(BaseModel):
    title: str = Field(..., min_length=3)
    bio: str = Field(..., min_length=10)
    skills: str = Field(..., min_length=2)
    expertise_domain: str = "Machine Learning"
    education: Optional[str] = None
    years_of_experience: int = Field(0, ge=0)
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    languages: str = "English"
    meeting_preference: str = Field("online", pattern="^(online|in-person|both)$")
    available_days: str = "Mon, Wed, Fri"
    available_times: str = "18:00 - 21:00 UTC"
    is_published: bool = False

class MentorProfileCreate(MentorProfileBase):
    pass

class MentorProfileUpdate(BaseModel):
    title: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[str] = None
    expertise_domain: Optional[str] = None
    education: Optional[str] = None
    years_of_experience: Optional[int] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    languages: Optional[str] = None
    meeting_preference: Optional[str] = None
    available_days: Optional[str] = None
    available_times: Optional[str] = None
    is_published: Optional[bool] = None

class MentorProfileResponse(MentorProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    rating: float
    created_at: datetime
    updated_at: datetime
    user: UserResponse

class MentorDirectoryItem(BaseModel):
    id: int
    user_id: int
    full_name: str
    avatar_url: Optional[str] = None
    title: str
    bio: str
    skills: str
    expertise_domain: str
    education: Optional[str] = None
    years_of_experience: int
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    languages: str
    meeting_preference: str
    available_days: str
    available_times: str
    rating: float

# Mentorship Request Schemas
class MentorshipRequestCreate(BaseModel):
    mentor_id: int
    learning_goals: str = Field(..., min_length=5)
    message: str = Field(..., min_length=5)
    preferred_times: str = Field(..., min_length=3)

class MentorshipRequestUpdate(BaseModel):
    status: str = Field(..., pattern="^(accepted|rejected|cancelled|completed)$")
    mentor_response: Optional[str] = None
    alternative_times: Optional[str] = None

class MentorshipRequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    mentor_id: int
    learning_goals: str
    message: str
    preferred_times: str
    status: str
    mentor_response: Optional[str] = None
    alternative_times: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    student: UserResponse
    mentor: UserResponse
    conversation_id: Optional[int] = None

# Message & Conversation Schemas
class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1)

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    sender_name: str
    content: str
    is_read: bool
    created_at: datetime

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mentorship_request_id: int
    student: UserResponse
    mentor: UserResponse
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0
    updated_at: datetime

# Session Schemas
class SessionCreate(BaseModel):
    mentorship_request_id: Optional[int] = None
    student_id: int
    mentor_id: int
    title: str = Field(..., min_length=3)
    scheduled_at: datetime
    duration_minutes: int = Field(45, ge=15, le=180)
    meeting_method: str = Field("online", pattern="^(online|in-person)$")
    meeting_link_or_location: str = Field(..., min_length=3)
    notes: Optional[str] = None

class SessionUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    meeting_method: Optional[str] = None
    meeting_link_or_location: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(confirmed|rescheduled|cancelled|completed)$")
    notes: Optional[str] = None

class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mentorship_request_id: Optional[int] = None
    student_id: int
    mentor_id: int
    title: str
    scheduled_at: datetime
    duration_minutes: int
    meeting_method: str
    meeting_link_or_location: str
    status: str
    notes: Optional[str] = None
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    student: UserResponse
    mentor: UserResponse

# Notification Schemas
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    content: str
    type: str
    related_id: Optional[int] = None
    is_read: bool
    created_at: datetime

# AI Schemas
class AIStudyBuddyRequest(BaseModel):
    message: str
    career: Optional[str] = "AI / ML Engineer"
    level: Optional[str] = "Beginner"
    goal: Optional[str] = "Learn AI and build projects"

class AIStudyBuddyResponse(BaseModel):
    reply: str
    gemini_configured: bool = True

# AI Trends and Tools Schemas
class AITrendItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: str
    url: str
    source_name: str
    category: str
    published_at: datetime
    retrieved_at: datetime
    tags: Optional[str] = None

class AIToolItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    category: str
    use_cases: str
    website_url: str
    pricing_model: str
    pricing_details: Optional[str] = None
    verified_at: datetime

class AITrendsStatusResponse(BaseModel):
    last_successful_refresh: Optional[datetime] = None
    next_scheduled_refresh: Optional[datetime] = None
    items_retrieved_count: int = 0
    freshness: str = "fresh"  # "fresh", "cached", "stale"
    status_message: str = "Operational"
    source_health: dict = Field(default_factory=dict)
    total_trends: int = 0
    total_tools: int = 0

