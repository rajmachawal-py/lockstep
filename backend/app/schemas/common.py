"""
Common Pydantic schemas shared across the application.
"""

from pydantic import BaseModel
from typing import Optional, Generic, TypeVar, List
from uuid import UUID
from datetime import datetime

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response wrapper."""
    items: List[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str
    error_code: Optional[str] = None


class ConflictResponse(BaseModel):
    """409 Conflict response with current server state."""
    detail: str
    current_version: int
    current_data: dict
    your_version: int
