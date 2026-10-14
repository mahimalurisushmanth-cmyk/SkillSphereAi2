from typing import List, Optional
import json
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from backend.database import get_db
from backend.models import AITrendItem, AIToolItem, AITrendRefreshState
from backend.schemas import (
    AITrendItemResponse, AIToolItemResponse, AITrendsStatusResponse
)
from backend.services.trends_service import (
    perform_trends_refresh, get_trends_freshness, seed_tools_if_empty, seed_trends_if_empty
)

router = APIRouter(prefix="/api/trends", tags=["trends"])

@router.get("", response_model=List[AITrendItemResponse])
def get_ai_trends(
    q: Optional[str] = Query(None, description="Search keyword in title, summary, or tags"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    seed_trends_if_empty(db)

    query = db.query(AITrendItem)

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AITrendItem.title.ilike(term),
                AITrendItem.summary.ilike(term),
                AITrendItem.tags.ilike(term),
                AITrendItem.source_name.ilike(term),
            )
        )

    if category and category.lower() != "all":
        query = query.filter(AITrendItem.category.ilike(f"%{category.strip()}%"))

    trends = query.order_by(AITrendItem.published_at.desc(), AITrendItem.id.desc()).offset(offset).limit(limit).all()
    return trends

@router.get("/tools", response_model=List[AIToolItemResponse])
def get_ai_tools_directory(
    q: Optional[str] = Query(None, description="Search tools by name, use cases, or description"),
    category: Optional[str] = Query(None, description="Filter by category"),
    pricing_model: Optional[str] = Query(None, description="Filter by pricing model"),
    db: Session = Depends(get_db)
):
    seed_tools_if_empty(db)

    query = db.query(AIToolItem)

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                AIToolItem.name.ilike(term),
                AIToolItem.description.ilike(term),
                AIToolItem.use_cases.ilike(term),
            )
        )

    if category and category.lower() != "all":
        query = query.filter(AIToolItem.category.ilike(f"%{category.strip()}%"))

    if pricing_model and pricing_model.lower() != "all":
        query = query.filter(AIToolItem.pricing_model.ilike(f"%{pricing_model.strip()}%"))

    tools = query.order_by(AIToolItem.name.asc()).all()
    return tools

@router.get("/status", response_model=AITrendsStatusResponse)
def get_trends_refresh_status(db: Session = Depends(get_db)):
    seed_trends_if_empty(db)
    seed_tools_if_empty(db)

    state = db.query(AITrendRefreshState).first()
    if not state:
        state = AITrendRefreshState(
            status_message="Ready",
            source_health_json=json.dumps({"ArXiv AI Research": "healthy", "MIT Technology Review AI": "healthy"})
        )
        db.add(state)
        db.commit()
        db.refresh(state)

    source_health = {}
    if state.source_health_json:
        try:
            source_health = json.loads(state.source_health_json)
        except Exception:
            source_health = {}

    freshness = get_trends_freshness(state)
    total_trends = db.query(AITrendItem).count()
    total_tools = db.query(AIToolItem).count()

    return AITrendsStatusResponse(
        last_successful_refresh=state.last_successful_refresh,
        next_scheduled_refresh=state.next_scheduled_refresh,
        items_retrieved_count=state.items_retrieved_count or total_trends,
        freshness=freshness,
        status_message=state.status_message,
        source_health=source_health,
        total_trends=total_trends,
        total_tools=total_tools
    )

@router.post("/refresh")
def trigger_trends_refresh(
    force: bool = Query(False, description="Force refresh ignoring rate limits"),
    db: Session = Depends(get_db)
):
    result = perform_trends_refresh(db, force=force)
    return result
