import logging

logger = logging.getLogger("lifehub.email")


class EmailService:
    """Capa de servicio de email. Placeholder listo para enchufar un proveedor real
    (SendGrid, SES, SMTP) sin tocar el resto de la aplicacion: solo hay que reemplazar
    la implementacion interna de estos metodos.
    """

    def send_password_reset(self, to_email: str, token: str) -> None:
        logger.info("Password reset solicitado para %s (token generado, no se loguea el valor).", to_email)

    def send(self, to_email: str, subject: str, body: str) -> None:
        logger.info("Email a %s | asunto: %s", to_email, subject)
