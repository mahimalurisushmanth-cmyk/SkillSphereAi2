from sqlalchemy.orm import Session
from backend.models import User, MentorProfile
from backend.auth import hash_password

def seed_initial_data(db: Session):
    # Only seed if no mentors exist
    existing_mentors = db.query(User).filter(User.role == "mentor").count()
    if existing_mentors > 0:
        return

    mentors_data = [
        {
            "name": "Aarav Mehta",
            "email": "aarav.mehta@skillsphere.ai",
            "password": "Password123!",
            "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
            "title": "Senior Machine Learning Engineer @ Anthropic",
            "bio": "Former robotics researcher with 7+ years building production computer vision and reinforcement learning systems. Mentored 40+ career changers into full-time ML roles.",
            "skills": "Python, PyTorch, Computer Vision, MLOps, System Design",
            "domain": "Machine Learning",
            "education": "M.S. in Computer Science, Georgia Tech",
            "experience": 7,
            "languages": "English, Hindi",
            "preference": "online",
            "days": "Mon, Wed, Fri",
            "times": "18:00 - 21:00 UTC",
            "rating": 4.92
        },
        {
            "name": "Dr. Mira Shah",
            "email": "mira.shah@skillsphere.ai",
            "password": "Password123!",
            "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80",
            "title": "Principal AI Researcher & NLP Lead",
            "bio": "PhD in Computational Linguistics. Focus on large language models, retrieval augmented generation (RAG), and efficient fine-tuning techniques.",
            "skills": "Transformers, LLMs, RAG, Python, Evaluation",
            "domain": "Generative AI",
            "education": "Ph.D. in Computational Linguistics, Stanford",
            "experience": 9,
            "languages": "English, French",
            "preference": "both",
            "days": "Tue, Thu, Sat",
            "times": "16:00 - 19:00 UTC",
            "rating": 4.95
        },
        {
            "name": "Dev Patel",
            "email": "dev.patel@skillsphere.ai",
            "password": "Password123!",
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
            "title": "Staff Data Scientist & Interview Coach",
            "bio": "10+ years across tech and fintech. Specializing in technical interview prep, portfolio reviews, data science problem formulations, and career transitions.",
            "skills": "SQL, Python, Scikit-learn, Statistics, Interview Prep",
            "domain": "Machine Learning",
            "education": "B.S. in Statistics & Data Science, UC Berkeley",
            "experience": 10,
            "languages": "English, Gujarati",
            "preference": "online",
            "days": "Mon, Thu, Sun",
            "times": "19:00 - 22:00 UTC",
            "rating": 4.89
        },
        {
            "name": "Elena Rostova",
            "email": "elena.rostova@skillsphere.ai",
            "password": "Password123!",
            "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
            "title": "Autonomous Systems & Robotics ML Engineer",
            "bio": "Passionate about helping beginners bridge the gap between academic theory and shipped code in production. Experienced in deep reinforcement learning and embedded AI.",
            "skills": "Python, C++, Reinforcement Learning, PyTorch, Docker",
            "domain": "Machine Learning",
            "education": "M.S. in Robotics, Carnegie Mellon",
            "experience": 6,
            "languages": "English, German",
            "preference": "online",
            "days": "Wed, Sat, Sun",
            "times": "15:00 - 18:00 UTC",
            "rating": 4.91
        }
    ]

    for m in mentors_data:
        user = User(
            email=m["email"],
            hashed_password=hash_password(m["password"]),
            full_name=m["name"],
            role="mentor",
            avatar_url=m["avatar"],
            target_role=m["domain"],
            skill_level="Advanced"
        )
        db.add(user)
        db.flush()

        profile = MentorProfile(
            user_id=user.id,
            title=m["title"],
            bio=m["bio"],
            skills=m["skills"],
            expertise_domain=m["domain"],
            education=m["education"],
            years_of_experience=m["experience"],
            languages=m["languages"],
            meeting_preference=m["preference"],
            available_days=m["days"],
            available_times=m["times"],
            is_published=True,
            rating=m["rating"]
        )
        db.add(profile)

    db.commit()
