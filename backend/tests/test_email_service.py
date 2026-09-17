import logging

from app.core.config import settings
from app.services.email_service import EmailService, _strip_header_injection


def test_falls_back_to_logging_when_smtp_not_configured(monkeypatch, caplog):
    monkeypatch.setattr(settings, "SMTP_HOST", None)
    service = EmailService()

    with caplog.at_level(logging.INFO, logger="lifehub.email"):
        service.send("someone@example.com", "Asunto de prueba", "Cuerpo")

    assert "someone@example.com" in caplog.text
    assert "Asunto de prueba" in caplog.text


def test_strip_header_injection_removes_crlf():
    cleaned = _strip_header_injection("Hola\r\nBcc: attacker@evil.com")
    assert "\r" not in cleaned
    assert "\n" not in cleaned
    assert "attacker@evil.com" in cleaned  # solo saca los saltos de linea, no censura contenido


def test_send_sanitizes_subject_before_logging(monkeypatch, caplog):
    monkeypatch.setattr(settings, "SMTP_HOST", None)
    service = EmailService()

    with caplog.at_level(logging.INFO, logger="lifehub.email"):
        service.send("someone@example.com", "Hola\r\nBcc: attacker@evil.com", "Cuerpo")

    for record in caplog.records:
        assert "\r" not in record.getMessage()


def test_sends_via_smtp_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_PORT", 587)
    monkeypatch.setattr(settings, "SMTP_USER", "user@example.com")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "secret")
    monkeypatch.setattr(settings, "SMTP_USE_TLS", True)

    calls = {"starttls": 0, "login": None, "sent": None}

    class FakeSMTP:
        def __init__(self, host, port, timeout=None):
            calls["host"] = host
            calls["port"] = port

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

        def starttls(self):
            calls["starttls"] += 1

        def login(self, user, password):
            calls["login"] = (user, password)

        def send_message(self, message):
            calls["sent"] = message

    import app.services.email_service as email_service_module

    monkeypatch.setattr(email_service_module.smtplib, "SMTP", FakeSMTP)

    EmailService().send("someone@example.com", "Asunto", "Cuerpo")

    assert calls["host"] == "smtp.example.com"
    assert calls["starttls"] == 1
    assert calls["login"] == ("user@example.com", "secret")
    assert calls["sent"]["To"] == "someone@example.com"
    assert calls["sent"]["Subject"] == "Asunto"


def test_send_password_reset_code_falls_back_to_logging(monkeypatch, caplog):
    monkeypatch.setattr(settings, "SMTP_HOST", None)
    service = EmailService()

    with caplog.at_level(logging.INFO, logger="lifehub.email"):
        service.send_password_reset_code("someone@example.com", "123456")

    assert "someone@example.com" in caplog.text
