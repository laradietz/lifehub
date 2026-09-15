from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.token import PasswordResetConfirm, PasswordResetRequest, Token, TokenRefreshRequest
from app.schemas.user import UserCreate, UserRead
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    service = AuthService(db)
    user, _ = service.register(data)
    return user


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> Token:
    service = AuthService(db)
    return service.login(form_data.username, form_data.password)


@router.post("/refresh", response_model=Token)
def refresh(data: TokenRefreshRequest, db: Session = Depends(get_db)) -> Token:
    service = AuthService(db)
    return service.refresh(data.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: TokenRefreshRequest, db: Session = Depends(get_db)) -> None:
    service = AuthService(db)
    service.logout(data.refresh_token)


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(data: PasswordResetRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    service = AuthService(db)
    service.request_password_reset(data.email)
    return {"detail": "Si el email existe, se enviaron instrucciones para restablecer la contraseña."}


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
def confirm_password_reset(data: PasswordResetConfirm, db: Session = Depends(get_db)) -> dict[str, str]:
    service = AuthService(db)
    service.confirm_password_reset(data.token, data.new_password)
    return {"detail": "Contraseña actualizada correctamente."}
