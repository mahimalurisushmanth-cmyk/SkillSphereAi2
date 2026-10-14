from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.database import get_db
from backend.models import User, MentorProfile
from backend.schemas import (
    MentorDirectoryItem, MentorProfileResponse, MentorProfileUpdate
)
from backend.auth import get_current_user, require_mentor

router = APIRouter(prefix="/api/mentors", tags=["mentors"])

@router.get("", response_model=List[MentorDirectoryItem])
def list_mentors(
    q: Optional[str] = Query(None, description="Search term for name, title, bio, or skills"),
    domain: Optional[str] = Query(None, description="Filter by expertise domain"),
    language: Optional[str] = Query(None, description="Filter by language"),
    meeting_preference: Optional[str] = Query(None, description="Filter by online/in-person"),
    min_experience: Optional[int] = Query(None, description="Minimum years of experience"),
    available_day: Optional[str] = Query(None, description="Filter by available day e.g. Mon"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = (
        db.query(MentorProfile, User)
        .join(User, MentorProfile.user_id == User.id)
        .filter(MentorProfile.is_published == True)
    )

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(term),
                MentorProfile.title.ilike(term),
                MentorProfile.bio.ilike(term),
                MentorProfile.skills.ilike(term),
                MentorProfile.expertise_domain.ilike(term),
            )
        )

    if domain and domain.lower() != "all":
        query = query.filter(MentorProfile.expertise_domain.ilike(f"%{domain.strip()}%"))

    if language and language.lower() != "all":
        query = query.filter(MentorProfile.languages.ilike(f"%{language.strip()}%"))

    if meeting_preference and meeting_preference.lower() != "all":
        query = query.filter(
            or_(
                MentorProfile.meeting_preference == meeting_preference.lower(),
                MentorProfile.meeting_preference == "both"
            )
        )

    if min_experience is not None and min_experience > 0:
        query = query.filter(MentorProfile.years_of_experience >= min_experience)

    if available_day and available_day.lower() != "all":
        query = query.filter(MentorProfile.available_days.ilike(f"%{available_day.strip()}%"))

    total = query.count()
    offset = (page - 1) * page_size
    results = query.order_by(MentorProfile.rating.desc(), MentorProfile.id.desc()).offset(offset).limit(page_size).all()

    items = []
    for profile, user in results:
        items.append(
            MentorDirectoryItem(
                id=profile.id,
                user_id=user.id,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                title=profile.title,
                bio=profile.bio,
                skills=profile.skills,
                expertise_domain=profile.expertise_domain,
                education=profile.education,
                years_of_experience=profile.years_of_experience,
                linkedin_url=profile.linkedin_url,
                portfolio_url=profile.portfolio_url,
                languages=profile.languages,
                meeting_preference=profile.meeting_preference,
                available_days=profile.available_days,
                available_times=profile.available_times,
                rating=profile.rating,
            )
        )
    return items

@router.get("/profile/me", response_model=MentorProfileResponse)
def get_my_mentor_profile(
    current_user: User = Depends(require_mentor),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if not profile:
        profile = MentorProfile(
            user_id=current_user.id,
            title="AI/ML Practitioner & Mentor",
            bio="Dedicated mentor helping students grow practical technical skills.",
            skills="Machine Learning, Python",
            is_published=False
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.put("/profile/me", response_model=MentorProfileResponse)
def update_my_mentor_profile(
    profile_in: MentorProfileUpdate,
    current_user: User = Depends(require_mentor),
    db: Session = Depends(get_db)
):
    profile = db.query(MentorProfile).filter(MentorProfile.user_id == current_user.id).first()
    if not profile:
        profile = MentorProfile(user_id=current_user.id, title="", bio="", skills="")
        db.add(profile)

    # Check publication rules
    new_published = profile_in.is_published if profile_in.is_published is not None else profile.is_published
    title_to_check = profile_in.title if profile_in.title is not None else profile.title
    bio_to_check = profile_in.bio if profile_in.bio is not None else profile.bio
    skills_to_check = profile_in.skills if profile_in.skills is not None else profile.skills

    if new_published:
        if not title_to_check or len(title_to_check.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Publication rule failed: Professional title must be at least 3 characters."
            )
        if not bio_to_check or len(bio_to_check.strip()) < 15:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Publication rule failed: Biography must be at least 15 characters to publish."
            )
        if not skills_to_check or len(skills_to_check.strip()) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Publication rule failed: Skills must be specified to publish."
            )

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    return profile

@router.get("/{mentor_user_id}", response_model=MentorDirectoryItem)
def get_mentor_by_user_id(mentor_user_id: int, db: Session = Depends(get_db)):
    result = (
        db.query(MentorProfile, User)
        .join(User, MentorProfile.user_id == User.id)
        .filter(User.id == mentor_user_id)
        .first()
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mentor not found"
        )
    profile, user = result
    return MentorDirectoryItem(
        id=profile.id,
        user_id=user.id,
        full_name=user.full_name,
        avatar_url=user.avatar_url,
        title=profile.title,
        bio=profile.bio,
        skills=profile.skills,
        expertise_domain=profile.expertise_domain,
        education=profile.education,
        years_of_experience=profile.years_of_experience,
        linkedin_url=profile.linkedin_url,
        portfolio_url=profile.portfolio_url,
        languages=profile.languages,
        meeting_preference=profile.meeting_preference,
        available_days=profile.available_days,
        available_times=profile.available_times,
        rating=profile.rating,
    )
