import uuid

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import HouseholdMemberStatus, HouseholdRole
from app.models.mixins import TimestampMixin, UUIDMixin


class Household(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "households"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    members: Mapped[list["HouseholdMember"]] = relationship(
        back_populates="household", cascade="all, delete-orphan"
    )


class HouseholdMember(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "household_members"
    __table_args__ = (UniqueConstraint("household_id", "user_id", name="uq_household_user"),)

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[HouseholdRole] = mapped_column(
        Enum(HouseholdRole, name="household_role"), default=HouseholdRole.MEMBER, nullable=False
    )
    status: Mapped[HouseholdMemberStatus] = mapped_column(
        Enum(HouseholdMemberStatus, name="household_member_status"),
        default=HouseholdMemberStatus.PENDING,
        nullable=False,
    )

    household: Mapped["Household"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="household_memberships", foreign_keys=[user_id])
