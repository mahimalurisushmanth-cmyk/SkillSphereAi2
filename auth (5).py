from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User, MentorProfile
from schemas import UserRegister, UserLogin, UserResponse, UserUpdate, TokenResponse
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists"
        )

    user = User(
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name.strip(),
        role=user_in.role,
        avatar_url=user_in.avatar_url or f"https://api.dicebear.com/7.x/bottts/svg?seed={user_in.full_name}",
        learning_goal=user_in.learning_goal,
        target_role=user_in.target_role or "AI / ML Engineer",
        skill_level=user_in.skill_level or "Beginner",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if user.role == "mentor":
        profile = MentorProfile(
            user_id=user.id,
            title="AI/ML Practitioner & Mentor",
            bio="Passionate engineer helping newcomers navigate practical machine learning, portfolio development, and interview prep.",
            skills="Python, Machine Learning, Scikit-Learn, PyTorch",
            expertise_domain="Machine Learning",
            education="B.S. in Computer Science",
            years_of_experience=3,
            languages="English",
            meeting_preference="online",
            available_days="Tue, Thu, Sat",
            available_times="18:00 - 21:00 UTC",
            is_published=True,
            rating=5.0
        )
        db.add(profile)
        db.commit()

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email.lower()).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/me", response_model=UserResponse)
def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name.strip()
    if user_update.avatar_url is not None:
        current_user.avatar_url = user_update.avatar_url
    if user_update.learning_goal is not None:
        current_user.learning_goal = user_update.learning_goal
    if user_update.target_role is not None:
        current_user.target_role = user_update.target_role
    if user_update.skill_level is not None:
        current_user.skill_level = user_update.skill_level

    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
