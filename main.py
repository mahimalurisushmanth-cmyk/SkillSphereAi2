from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, SessionLocal
from seed import seed_initial_data
from routers import (
    auth, mentors, requests, conversations, sessions, notifications, ai, trends
)

# Initialize database schema
Base.metadata.create_all(bind=engine)

# Seed initial mentors if empty
with SessionLocal() as db:
    seed_initial_data(db)

app = FastAPI(
    title="SkillSphere AI Mentorship API",
    description="Real-world mentorship, matching, messaging, and scheduling platform API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(mentors.router)
app.include_router(requests.router)
app.include_router(conversations.router)
app.include_router(sessions.router)
app.include_router(notifications.router)
app.include_router(ai.router)
app.include_router(trends.router)

@app.get("/")
def read_root():
    return {
        "app": "SkillSphere AI Mentorship Platform",
        "status": "online",
        "docs_url": "/docs",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
