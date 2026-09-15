import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import HouseholdMemberStatus, HouseholdRole
from app.models.household import Household, HouseholdMember


class HouseholdRepository:
    def __init__(self, db: Session):
        self.db = db

    def get(self, household_id: uuid.UUID) -> Optional[Household]:
        stmt = (
            select(Household)
            .where(Household.id == household_id)
            .options(selectinload(Household.members).selectinload(HouseholdMember.user))
        )
        return self.db.scalar(stmt)

    def list_for_user(self, user_id: uuid.UUID) -> list[Household]:
        stmt = (
            select(Household)
            .join(HouseholdMember, HouseholdMember.household_id == Household.id)
            .where(HouseholdMember.user_id == user_id, HouseholdMember.status == HouseholdMemberStatus.ACCEPTED)
            .options(selectinload(Household.members).selectinload(HouseholdMember.user))
            .order_by(Household.name.asc())
        )
        return list(self.db.scalars(stmt))

    def get_member(self, household_id: uuid.UUID, user_id: uuid.UUID) -> Optional[HouseholdMember]:
        stmt = select(HouseholdMember).where(
            HouseholdMember.household_id == household_id, HouseholdMember.user_id == user_id
        )
        return self.db.scalar(stmt)

    def get_member_by_id(self, member_id: uuid.UUID) -> Optional[HouseholdMember]:
        stmt = (
            select(HouseholdMember)
            .where(HouseholdMember.id == member_id)
            .options(selectinload(HouseholdMember.household))
        )
        return self.db.scalar(stmt)

    def is_accepted_member(self, household_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        member = self.get_member(household_id, user_id)
        return member is not None and member.status == HouseholdMemberStatus.ACCEPTED

    def list_accepted_household_ids(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        stmt = select(HouseholdMember.household_id).where(
            HouseholdMember.user_id == user_id, HouseholdMember.status == HouseholdMemberStatus.ACCEPTED
        )
        return list(self.db.scalars(stmt))

    def list_pending_for_user(self, user_id: uuid.UUID) -> list[HouseholdMember]:
        stmt = (
            select(HouseholdMember)
            .where(HouseholdMember.user_id == user_id, HouseholdMember.status == HouseholdMemberStatus.PENDING)
            .options(selectinload(HouseholdMember.household))
            .order_by(HouseholdMember.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    def create_household(self, name: str, owner_id: uuid.UUID) -> Household:
        household = Household(name=name, owner_id=owner_id)
        self.db.add(household)
        self.db.flush()
        self.add_member(household.id, owner_id, role=HouseholdRole.OWNER, status=HouseholdMemberStatus.ACCEPTED)
        return household

    def add_member(
        self, household_id: uuid.UUID, user_id: uuid.UUID, *, role: HouseholdRole, status: HouseholdMemberStatus
    ) -> HouseholdMember:
        member = HouseholdMember(household_id=household_id, user_id=user_id, role=role, status=status)
        self.db.add(member)
        self.db.flush()
        return member

    def delete_member(self, member: HouseholdMember) -> None:
        self.db.delete(member)

    def delete(self, household: Household) -> None:
        self.db.delete(household)
