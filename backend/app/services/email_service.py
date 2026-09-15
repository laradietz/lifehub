import logging

logger = logging.getLogger("lifehub.email")


class EmailService:
    """Capa de servicio de email. Placeholder listo para enchufar un proveedor real
    (SendGrid, SES, SMTP) sin tocar el resto de la aplicacion: solo hay que reemplazar
    la implementacion interna de estos metodos.
    """

    def send_password_reset_code(self, to_email: str, code: str) -> None:
        # En un entorno real este codigo viaja unicamente por email; en desarrollo lo
        # logueamos para poder probar el flujo sin tener un proveedor de email configurado.
        logger.info("Codigo de restablecimiento de contrasena para %s: %s", to_email, code)

    def send(self, to_email: str, subject: str, body: str) -> None:
        logger.info("Email a %s | asunto: %s", to_email, subject)
