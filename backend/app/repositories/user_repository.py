import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> Optional[User]:
        stmt = select(User).where(User.email == email.lower())
        return self.db.scalar(stmt)

    def create(self, *, email: str, hashed_password: str, full_name: Optional[str]) -> User:
        user = User(email=email.lower(), hashed_password=hashed_password, full_name=full_name)
        self.db.add(user)
        self.db.flush()
        return user
