import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.enums import CategoryType
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate

DEFAULT_TASK_CATEGORIES = ["Trabajo", "Personal", "Hogar", "Salud", "Estudio"]
DEFAULT_REMINDER_CATEGORIES = ["Seguros", "Documentos", "Suscripciones", "Servicios", "Turnos"]


class CategoryService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CategoryRepository(db)

    def list(self, user_id: uuid.UUID, type_: Optional[CategoryType] = None) -> list[Category]:
        return self.repo.list(user_id, type_)

    def create(self, user_id: uuid.UUID, data: CategoryCreate) -> Category:
        category = self.repo.create(user_id, **data.model_dump())
        self.db.commit()
        self.db.refresh(category)
        return category

    def delete(self, category_id: uuid.UUID, user_id: uuid.UUID) -> None:
        category = self.repo.get_owned(category_id, user_id)
        if not category:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoría no encontrada.")
        self.repo.delete(category)
        self.db.commit()


def seed_default_categories(db: Session, user_id: uuid.UUID) -> None:
    """Crea categorias iniciales al registrarse para que los selects no arranquen vacios."""
    for name in DEFAULT_TASK_CATEGORIES:
        db.add(Category(user_id=user_id, type=CategoryType.TASK, name=name))
    for name in DEFAULT_REMINDER_CATEGORIES:
        db.add(Category(user_id=user_id, type=CategoryType.REMINDER, name=name))
