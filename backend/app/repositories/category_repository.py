import uuid
from typing import Any, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.enums import CategoryType


class CategoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def list(self, user_id: uuid.UUID, type_: Optional[CategoryType] = None) -> list[Category]:
        stmt = select(Category).where(or_(Category.user_id == user_id, Category.user_id.is_(None)))
        if type_ is not None:
            stmt = stmt.where(Category.type == type_)
        stmt = stmt.order_by(Category.name).limit(1000)
        return list(self.db.scalars(stmt))

    def get_owned(self, category_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Category]:
        stmt = select(Category).where(Category.id == category_id, Category.user_id == user_id)
        return self.db.scalar(stmt)

    def create(self, user_id: Optional[uuid.UUID], **fields: Any) -> Category:
        category = Category(user_id=user_id, **fields)
        self.db.add(category)
        self.db.flush()
        return category

    def delete(self, category: Category) -> None:
        self.db.delete(category)
