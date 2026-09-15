import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core import security
from app.core.config import settings
from app.models.auth_token import PasswordResetToken, RefreshToken
from app.models.user import User
from app.models.user_settings import UserSettings
from app.repositories.user_repository import UserRepository
from app.schemas.token import Token
from app.schemas.user import UserCreate
from app.services.email_service import EmailService


RESET_CODE_LENGTH = 6
RESET_CODE_TTL_MINUTES = 15
RESET_CODE_MAX_ATTEMPTS = 5


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _generate_reset_code() -> str:
    return f"{secrets.randbelow(10**RESET_CODE_LENGTH):0{RESET_CODE_LENGTH}d}"


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.users = UserRepository(db)
        self.email_service = EmailService()

    def register(self, data: UserCreate) -> tuple[User, Token]:
        if self.users.get_by_email(data.email):
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese email.")
        user = self.users.create(
            email=data.email,
            hashed_password=security.hash_password(data.password),
            full_name=data.full_name,
        )
        self.db.add(UserSettings(user_id=user.id))
        token = self._issue_tokens(user)
        self.db.commit()
        self.db.refresh(user)
        return user, token

    def authenticate(self, email: str, password: str) -> User:
        user = self.users.get_by_email(email)
        if not user or not security.verify_password(password, user.hashed_password):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email o contraseña incorrectos.")
        if not user.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Cuenta deshabilitada.")
        return user

    def login(self, email: str, password: str) -> Token:
        user = self.authenticate(email, password)
        token = self._issue_tokens(user)
        self.db.commit()
        return token

    def _issue_tokens(self, user: User) -> Token:
        jti = str(uuid.uuid4())
        access = security.create_access_token(str(user.id))
        refresh = security.create_refresh_token(str(user.id), jti)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.db.add(RefreshToken(user_id=user.id, token_hash=_hash_token(refresh), expires_at=expires_at))
        return Token(access_token=access, refresh_token=refresh)

    def refresh(self, refresh_token: str) -> Token:
        try:
            payload = security.decode_token(refresh_token)
        except Exception as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de actualización inválido.") from exc
        if payload.get("type") != "refresh":
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de actualización inválido.")

        token_hash = _hash_token(refresh_token)
        stored = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if not stored or stored.revoked or stored.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de actualización inválido o expirado.")

        user = self.users.get_by_id(uuid.UUID(payload["sub"]))
        if not user or not user.is_active:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario inválido.")

        stored.revoked = True
        token = self._issue_tokens(user)
        self.db.commit()
        return token

    def logout(self, refresh_token: str) -> None:
        token_hash = _hash_token(refresh_token)
        stored = self.db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
        if stored:
            stored.revoked = True
            self.db.commit()

    def request_password_reset(self, email: str) -> None:
        user = self.users.get_by_email(email)
        if not user:
            return  # No revelamos si el email existe o no.

        # Invalidamos cualquier codigo anterior todavia vigente para que solo el
        # ultimo enviado sea valido (evita tener varios codigos activos a la vez).
        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id, PasswordResetToken.used.is_(False)
        ).update({"used": True})

        code = _generate_reset_code()
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_CODE_TTL_MINUTES)
        self.db.add(PasswordResetToken(user_id=user.id, token_hash=_hash_token(code), expires_at=expires_at))
        self.db.commit()
        self.email_service.send_password_reset_code(user.email, code)

    def confirm_password_reset(self, email: str, code: str, new_password: str) -> None:
        invalid_code_error = HTTPException(status.HTTP_400_BAD_REQUEST, "El código es inválido o expiró.")

        user = self.users.get_by_email(email)
        if not user:
            raise invalid_code_error

        stored = (
            self.db.query(PasswordResetToken)
            .filter(PasswordResetToken.user_id == user.id, PasswordResetToken.used.is_(False))
            .order_by(PasswordResetToken.created_at.desc())
            .first()
        )
        if not stored or stored.expires_at < datetime.now(timezone.utc) or stored.attempts >= RESET_CODE_MAX_ATTEMPTS:
            raise invalid_code_error

        if stored.token_hash != _hash_token(code):
            stored.attempts += 1
            self.db.commit()
            raise invalid_code_error

        user.hashed_password = security.hash_password(new_password)
        stored.used = True
        self.db.query(RefreshToken).filter(
            RefreshToken.user_id == user.id, RefreshToken.revoked.is_(False)
        ).update({"revoked": True})
        self.db.commit()
