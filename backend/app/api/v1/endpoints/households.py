import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.household import (
    HouseholdCreate,
    HouseholdInviteCreate,
    HouseholdMemberRead,
    HouseholdRead,
    HouseholdUpdate,
    PendingInvitationRead,
)
from app.services.household_service import HouseholdService

router = APIRouter()


@router.get("", response_model=list[HouseholdRead])
def list_households(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> list[HouseholdRead]:
    service = HouseholdService(db)
    return service.list_my_households(current_user.id)


@router.post("", response_model=HouseholdRead, status_code=status.HTTP_201_CREATED)
def create_household(
    data: HouseholdCreate, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> HouseholdRead:
    service = HouseholdService(db)
    return service.create(current_user.id, data)


@router.get("/invitations/pending", response_model=list[PendingInvitationRead])
def list_pending_invitations(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> list[PendingInvitationRead]:
    service = HouseholdService(db)
    return service.list_pending_invitations(current_user.id)


@router.post("/invitations/{member_id}/accept", response_model=HouseholdMemberRead)
def accept_invitation(
    member_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> HouseholdMemberRead:
    service = HouseholdService(db)
    return service.accept_invitation(current_user, member_id)


@router.post("/invitations/{member_id}/decline", status_code=status.HTTP_204_NO_CONTENT)
def decline_invitation(
    member_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = HouseholdService(db)
    service.decline_invitation(current_user.id, member_id)


@router.get("/{household_id}", response_model=HouseholdRead)
def get_household(
    household_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> HouseholdRead:
    service = HouseholdService(db)
    return service.get(household_id, current_user.id)


@router.patch("/{household_id}", response_model=HouseholdRead)
def update_household(
    household_id: uuid.UUID,
    data: HouseholdUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> HouseholdRead:
    service = HouseholdService(db)
    return service.update(household_id, current_user.id, data)


@router.delete("/{household_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_household(
    household_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = HouseholdService(db)
    service.delete(household_id, current_user.id)


@router.post("/{household_id}/members", response_model=HouseholdMemberRead, status_code=status.HTTP_201_CREATED)
def invite_member(
    household_id: uuid.UUID,
    data: HouseholdInviteCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> HouseholdMemberRead:
    service = HouseholdService(db)
    return service.invite(household_id, current_user.id, data)


@router.delete("/{household_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    household_id: uuid.UUID,
    member_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> None:
    service = HouseholdService(db)
    service.remove_member(household_id, current_user.id, member_id)


@router.post("/{household_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
def leave_household(
    household_id: uuid.UUID, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> None:
    service = HouseholdService(db)
    service.leave(household_id, current_user.id)
