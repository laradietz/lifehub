import logging
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.document import Document
from app.models.enums import NotificationChannel, NotificationType
from app.models.event import Event
from app.models.reminder import Reminder
from app.models.user import User
from app.models.vehicle import Vehicle, VehicleMaintenance
from app.repositories.notification_repository import NotificationRepository
from app.services.email_service import EmailService

logger = logging.getLogger("lifehub.notifications")

# Documentos, mantenimientos de vehiculos y eventos no tienen un campo de aviso
# configurable como Reminder.advance_notice_days -- se usa este default fijo para los tres.
_DEFAULT_NOTICE_DAYS = (7, 1)


class NotificationDispatchService:
    """Revisa vencimientos de todos los usuarios y crea notificaciones nuevas.

    Pensado para correr periodicamente desde un scheduler (ver run_notification_dispatch
    mas abajo), no desde un request HTTP -- por eso recibe su propia sesion de DB en vez
    de usar Depends(get_db). El alcance (Fase 8, decidido con el usuario) es Recordatorios
    + Documentos + Vehiculos + Eventos del Calendario; Tareas y Suscripciones quedan afuera
    por ahora (NotificationType.TASK/SUBSCRIPTION existen en el esquema para el futuro).
    """

    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)
        self.email_service = EmailService()

    def run(self) -> int:
        created = 0
        created += self._check_reminders()
        created += self._check_documents()
        created += self._check_vehicle_maintenance()
        created += self._check_events()
        self.db.commit()
        return created

    def _notify(
        self,
        user_id,
        notif_type: NotificationType,
        title: str,
        message: str,
        related_entity_type: str,
        related_entity_id,
    ) -> bool:
        if self.repo.exists_for_entity_today(user_id, related_entity_type, related_entity_id):
            return False

        self.repo.create(
            user_id,
            type=notif_type,
            channel=NotificationChannel.IN_APP,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
        )

        user = self.db.get(User, user_id)
        self.repo.create(
            user_id,
            type=notif_type,
            channel=NotificationChannel.EMAIL,
            title=title,
            message=message,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id,
            sent_at=datetime.now(timezone.utc),
        )
        if user:
            self.email_service.send(user.email, title, message)
        return True

    @staticmethod
    def _day_word(days_until: int) -> str:
        return "día" if days_until == 1 else "días"

    def _check_reminders(self) -> int:
        created = 0
        today = date.today()
        reminders = list(self.db.scalars(select(Reminder).where(Reminder.is_completed.is_(False))))
        for reminder in reminders:
            days_until = (reminder.due_date - today).days
            if days_until not in (reminder.advance_notice_days or []):
                continue
            title = f"Recordatorio próximo: {reminder.name}"
            message = (
                f'"{reminder.name}" vence el {reminder.due_date.isoformat()} '
                f"(en {days_until} {self._day_word(days_until)})."
            )
            if self._notify(reminder.user_id, NotificationType.REMINDER, title, message, "reminder", reminder.id):
                created += 1
        return created

    def _check_documents(self) -> int:
        created = 0
        today = date.today()
        horizon = today + timedelta(days=max(_DEFAULT_NOTICE_DAYS))
        documents = list(
            self.db.scalars(
                select(Document).where(Document.expiry_date.is_not(None), Document.expiry_date.between(today, horizon))
            )
        )
        for document in documents:
            days_until = (document.expiry_date - today).days
            if days_until not in _DEFAULT_NOTICE_DAYS:
                continue
            title = f"Documento por vencer: {document.name}"
            message = (
                f'"{document.name}" vence el {document.expiry_date.isoformat()} '
                f"(en {days_until} {self._day_word(days_until)})."
            )
            if self._notify(document.user_id, NotificationType.DOCUMENT, title, message, "document", document.id):
                created += 1
        return created

    def _check_vehicle_maintenance(self) -> int:
        created = 0
        today = date.today()
        horizon = today + timedelta(days=max(_DEFAULT_NOTICE_DAYS))
        rows = self.db.execute(
            select(VehicleMaintenance, Vehicle.user_id, Vehicle.brand, Vehicle.model)
            .join(Vehicle, Vehicle.id == VehicleMaintenance.vehicle_id)
            .where(VehicleMaintenance.next_due_date.is_not(None), VehicleMaintenance.next_due_date.between(today, horizon))
        ).all()
        for maintenance, user_id, brand, model in rows:
            days_until = (maintenance.next_due_date - today).days
            if days_until not in _DEFAULT_NOTICE_DAYS:
                continue
            title = f"Mantenimiento próximo: {brand} {model}"
            message = (
                f"{maintenance.type.value.replace('_', ' ')} vence el {maintenance.next_due_date.isoformat()} "
                f"(en {days_until} {self._day_word(days_until)})."
            )
            if self._notify(user_id, NotificationType.VEHICLE, title, message, "vehicle_maintenance", maintenance.id):
                created += 1
        return created

    def _check_events(self) -> int:
        created = 0
        today = date.today()
        now = datetime.now(timezone.utc)
        horizon = now + timedelta(days=max(_DEFAULT_NOTICE_DAYS))
        events = list(self.db.scalars(select(Event).where(Event.start_at >= now, Event.start_at <= horizon)))
        for event in events:
            days_until = (event.start_at.date() - today).days
            if days_until not in _DEFAULT_NOTICE_DAYS:
                continue
            title = f"Evento próximo: {event.title}"
            message = (
                f'"{event.title}" es el {event.start_at.date().isoformat()} '
                f"(en {days_until} {self._day_word(days_until)})."
            )
            if self._notify(event.user_id, NotificationType.EVENT, title, message, "event", event.id):
                created += 1
        return created


def run_notification_dispatch() -> None:
    """Entrypoint que llama el scheduler (ver app/main.py) -- crea su propia sesion de DB
    porque corre en un hilo de fondo, fuera del ciclo de vida de un request HTTP."""
    db = SessionLocal()
    try:
        created = NotificationDispatchService(db).run()
        if created:
            logger.info("Se crearon %s notificaciones nuevas.", created)
    except Exception:
        db.rollback()
        logger.exception("Error corriendo el chequeo periodico de notificaciones.")
    finally:
        db.close()
