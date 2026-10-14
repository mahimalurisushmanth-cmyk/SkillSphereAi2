import os

class Settings:
    PROJECT_NAME: str = "SkillSphere AI Mentorship API"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./skillsphere.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "skillsphere-super-secure-jwt-secret-key-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    FRONTEND_URL: str = os.getenv("APP_URL", "http://localhost:3000")

settings = Settings()
