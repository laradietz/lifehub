import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("lifehub.email")


def _strip_header_injection(value: str) -> str:
    """Saca \\r y \\n de un valor que va a terminar en un header de email (ej. Subject).
    Sin esto, un campo controlado por el usuario (ej. nombre de un hogar) que contenga
    saltos de línea podría inyectar headers SMTP adicionales (ver AUDITORIA.md, hallazgo
    de la revisión de email_service.py)."""
    return value.replace("\r", " ").replace("\n", " ")


class EmailService:
    """Manda emails reales por SMTP si está configurado (SMTP_HOST en el .env); si no,
    cae a solo loguear -- así el flujo de desarrollo sigue funcionando sin tener que
    configurar un proveedor real (ver AUDITORIA.md, hallazgo S8). Funciona con
    cualquier proveedor que hable SMTP (Gmail, Amazon SES, Postmark, Mailgun, etc.),
    sin agregar un SDK específico de proveedor.
    """

    def __init__(self) -> None:
        self._enabled = bool(settings.SMTP_HOST)

    def _deliver(self, to_email: str, subject: str, body: str) -> None:
        subject = _strip_header_injection(subject)

        if not self._enabled:
            logger.info("Email (SMTP no configurado, solo log) a %s | asunto: %s", to_email, subject)
            return

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = (
            f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            if settings.SMTP_FROM_NAME
            else settings.SMTP_FROM_EMAIL
        )
        message["To"] = to_email
        message.set_content(body)

        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
                if settings.SMTP_USE_TLS:
                    smtp.starttls()
                if settings.SMTP_USER:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD or "")
                smtp.send_message(message)
        except Exception:
            # Un email que no sale no debe tirar abajo el flujo que lo dispara (registro,
            # reset de contraseña, notificación): se loguea el error pero no se relanza.
            logger.exception("No se pudo enviar el email a %s (asunto: %s)", to_email, subject)

    def send_password_reset_code(self, to_email: str, code: str) -> None:
        subject = "Tu código para restablecer la contraseña"
        body = (
            f"Usá este código para restablecer tu contraseña en Life Under Control: {code}\n\n"
            "Vence en 15 minutos. Si no lo pediste vos, podés ignorar este email."
        )
        self._deliver(to_email, subject, body)

    def send(self, to_email: str, subject: str, body: str) -> None:
        self._deliver(to_email, subject, body)
