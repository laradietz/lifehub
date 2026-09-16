import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.enums import HouseholdMemberStatus, HouseholdRole
from app.models.household import Household, HouseholdMember
from app.models.user import User
from app.repositories.household_repository import HouseholdRepository
from app.repositories.user_repository import UserRepository
from app.schemas.household import (
    HouseholdCreate,
    HouseholdInviteCreate,
    HouseholdMemberRead,
    HouseholdRead,
    HouseholdUpdate,
    PendingInvitationRead,
)
from app.services.email_service import EmailService

_OWNER_CANNOT_LEAVE = "El dueño no puede eliminarse del hogar; para eso, eliminá el hogar."


def _member_read(member: HouseholdMember, *, email: str, full_name: str | None) -> HouseholdMemberRead:
    return HouseholdMemberRead(
        id=member.id,
        user_id=member.user_id,
        email=email,
        full_name=full_name,
        role=member.role,
        status=member.status,
        created_at=member.created_at,
    )


def _household_read(household: Household) -> HouseholdRead:
    return HouseholdRead(
        id=household.id,
        name=household.name,
        owner_id=household.owner_id,
        created_at=household.created_at,
        updated_at=household.updated_at,
        members=[_member_read(m, email=m.user.email, full_name=m.user.full_name) for m in household.members],
    )


def _pending_read(member: HouseholdMember) -> PendingInvitationRead:
    return PendingInvitationRead(
        id=member.id,
        household_id=member.household_id,
        household_name=member.household.name,
        role=member.role,
        created_at=member.created_at,
    )


class HouseholdService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = HouseholdRepository(db)
        self.user_repo = UserRepository(db)
        self.email_service = EmailService()

    def list_my_households(self, user_id: uuid.UUID) -> list[HouseholdRead]:
        return [_household_read(h) for h in self.repo.list_for_user(user_id)]

    def get_visible_or_404(self, household_id: uuid.UUID, user_id: uuid.UUID) -> Household:
        household = self.repo.get(household_id)
        if not household or not self.repo.is_accepted_member(household_id, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Hogar no encontrado.")
        return household

    def get(self, household_id: uuid.UUID, user_id: uuid.UUID) -> HouseholdRead:
        return _household_read(self.get_visible_or_404(household_id, user_id))

    def _require_owner(self, household: Household, user_id: uuid.UUID) -> None:
        if household.owner_id != user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el dueño del hogar puede hacer esto.")

    def create(self, user_id: uuid.UUID, data: HouseholdCreate) -> HouseholdRead:
        household = self.repo.create_household(data.name, user_id)
        self.db.commit()
        return self.get(household.id, user_id)

    def update(self, household_id: uuid.UUID, user_id: uuid.UUID, data: HouseholdUpdate) -> HouseholdRead:
        household = self.get_visible_or_404(household_id, user_id)
        self._require_owner(household, user_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(household, field, value)
        self.db.commit()
        return self.get(household_id, user_id)

    def delete(self, household_id: uuid.UUID, user_id: uuid.UUID) -> None:
        household = self.get_visible_or_404(household_id, user_id)
        self._require_owner(household, user_id)
        self.repo.delete(household)
        self.db.commit()

    def invite(self, household_id: uuid.UUID, user_id: uuid.UUID, data: HouseholdInviteCreate) -> HouseholdMemberRead:
        household = self.get_visible_or_404(household_id, user_id)
        self._require_owner(household, user_id)

        target = self.user_repo.get_by_email(data.email)
        if not target:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No encontramos ninguna cuenta con ese email.")
        if target.id == user_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "No podés invitarte a vos mismo.")

        existing = self.repo.get_member(household_id, target.id)
        if existing:
            if existing.status == HouseholdMemberStatus.ACCEPTED:
                raise HTTPException(status.HTTP_409_CONFLICT, "Esa persona ya es miembro del hogar.")
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una invitación pendiente para ese email.")

        member = self.repo.add_member(
            household_id, target.id, role=HouseholdRole.MEMBER, status=HouseholdMemberStatus.PENDING
        )
        self.db.commit()
        self.db.refresh(member)

        self.email_service.send(
            target.email,
            f"Invitación a unirte al hogar «{household.name}»",
            f"{household.name} te invitó a sumarte a su hogar en Vida En Orden. Entrá a la app para aceptar la invitación.",
        )

        return _member_read(member, email=target.email, full_name=target.full_name)

    def remove_member(self, household_id: uuid.UUID, user_id: uuid.UUID, member_id: uuid.UUID) -> None:
        household = self.get_visible_or_404(household_id, user_id)
        self._require_owner(household, user_id)

        member = self.repo.get_member_by_id(member_id)
        if not member or member.household_id != household_id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Miembro no encontrado.")
        if member.user_id == household.owner_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, _OWNER_CANNOT_LEAVE)

        self.repo.delete_member(member)
        self.db.commit()

    def leave(self, household_id: uuid.UUID, user_id: uuid.UUID) -> None:
        household = self.get_visible_or_404(household_id, user_id)
        if household.owner_id == user_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, _OWNER_CANNOT_LEAVE)

        member = self.repo.get_member(household_id, user_id)
        if member:
            self.repo.delete_member(member)
            self.db.commit()

    def list_pending_invitations(self, user_id: uuid.UUID) -> list[PendingInvitationRead]:
        return [_pending_read(m) for m in self.repo.list_pending_for_user(user_id)]

    def accept_invitation(self, user: User, member_id: uuid.UUID) -> HouseholdMemberRead:
        member = self._get_own_pending_invitation_or_404(user.id, member_id)
        member.status = HouseholdMemberStatus.ACCEPTED
        self.db.commit()
        self.db.refresh(member)
        return _member_read(member, email=user.email, full_name=user.full_name)

    def decline_invitation(self, user_id: uuid.UUID, member_id: uuid.UUID) -> None:
        member = self._get_own_pending_invitation_or_404(user_id, member_id)
        self.repo.delete_member(member)
        self.db.commit()

    def _get_own_pending_invitation_or_404(self, user_id: uuid.UUID, member_id: uuid.UUID) -> HouseholdMember:
        member = self.repo.get_member_by_id(member_id)
        if not member or member.user_id != user_id or member.status != HouseholdMemberStatus.PENDING:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Invitación no encontrada.")
        return member
