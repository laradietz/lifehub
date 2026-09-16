from datetime import date, timedelta

from app.services.notification_dispatch_service import NotificationDispatchService


def _in_days(n: int) -> str:
    return (date.today() + timedelta(days=n)).isoformat()


def test_dispatch_creates_notification_for_reminder_due_soon(client, auth_headers, db_session):
    client.post(
        "/api/reminders", json={"name": "Seguro del auto", "due_date": _in_days(7)}, headers=auth_headers
    )

    created = NotificationDispatchService(db_session).run()
    assert created == 1  # una entidad notificada (crea una fila IN_APP + una EMAIL internamente)

    response = client.get("/api/notifications", headers=auth_headers)
    assert response.status_code == 200
    titles = [n["title"] for n in response.json()]
    assert any("Seguro del auto" in t for t in titles)


def test_dispatch_ignores_reminder_outside_advance_notice_days(client, auth_headers, db_session):
    client.post(
        "/api/reminders", json={"name": "Lejano", "due_date": _in_days(15)}, headers=auth_headers
    )

    NotificationDispatchService(db_session).run()

    response = client.get("/api/notifications", headers=auth_headers)
    assert response.json() == []


def test_dispatch_does_not_duplicate_same_day(client, auth_headers, db_session):
    client.post(
        "/api/reminders", json={"name": "Pago tarjeta", "due_date": _in_days(1)}, headers=auth_headers
    )
    service = NotificationDispatchService(db_session)

    first_run = service.run()
    second_run = service.run()

    assert first_run == 1
    assert second_run == 0


def test_dispatch_creates_notification_for_expiring_document(client, auth_headers, db_session):
    client.post(
        "/api/documents",
        json={"name": "DNI", "category": "id", "expiry_date": _in_days(7)},
        headers=auth_headers,
    )

    NotificationDispatchService(db_session).run()

    response = client.get("/api/notifications", headers=auth_headers)
    titles = [n["title"] for n in response.json()]
    assert any("DNI" in t for t in titles)


def test_dispatch_creates_notification_for_vehicle_maintenance(client, auth_headers, db_session):
    vehicle = client.post(
        "/api/vehicles", json={"brand": "Toyota", "model": "Corolla"}, headers=auth_headers
    ).json()
    client.post(
        f"/api/vehicles/{vehicle['id']}/maintenance",
        json={"type": "oil_change", "date": date.today().isoformat(), "next_due_date": _in_days(1)},
        headers=auth_headers,
    )

    NotificationDispatchService(db_session).run()

    response = client.get("/api/notifications", headers=auth_headers)
    titles = [n["title"] for n in response.json()]
    assert any("Toyota Corolla" in t for t in titles)


def test_dispatch_creates_notification_for_upcoming_event(client, auth_headers, db_session):
    start_at = f"{_in_days(1)}T10:00:00Z"
    client.post("/api/events", json={"title": "Turno médico", "start_at": start_at}, headers=auth_headers)

    NotificationDispatchService(db_session).run()

    response = client.get("/api/notifications", headers=auth_headers)
    titles = [n["title"] for n in response.json()]
    assert any("Turno médico" in t for t in titles)


def test_notifications_require_auth(client):
    assert client.get("/api/notifications").status_code == 401
    assert client.get("/api/notifications/unread-count").status_code == 401
    assert client.post("/api/notifications/read-all").status_code == 401


def test_unread_count_and_mark_read(client, auth_headers, db_session):
    client.post("/api/reminders", json={"name": "Pago", "due_date": _in_days(1)}, headers=auth_headers)
    NotificationDispatchService(db_session).run()

    unread = client.get("/api/notifications/unread-count", headers=auth_headers)
    assert unread.json()["count"] == 1

    notification_id = client.get("/api/notifications", headers=auth_headers).json()[0]["id"]
    marked = client.patch(f"/api/notifications/{notification_id}/read", headers=auth_headers)
    assert marked.status_code == 200
    assert marked.json()["is_read"] is True

    unread_after = client.get("/api/notifications/unread-count", headers=auth_headers)
    assert unread_after.json()["count"] == 0


def test_mark_all_read(client, auth_headers, db_session):
    client.post("/api/reminders", json={"name": "Uno", "due_date": _in_days(1)}, headers=auth_headers)
    client.post("/api/documents", json={"name": "DNI", "category": "id", "expiry_date": _in_days(1)}, headers=auth_headers)
    NotificationDispatchService(db_session).run()

    assert client.get("/api/notifications/unread-count", headers=auth_headers).json()["count"] == 2

    response = client.post("/api/notifications/read-all", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["updated"] == 2
    assert client.get("/api/notifications/unread-count", headers=auth_headers).json()["count"] == 0


def test_cannot_mark_another_users_notification_as_read(client, auth_headers, db_session):
    client.post("/api/reminders", json={"name": "Privado", "due_date": _in_days(1)}, headers=auth_headers)
    NotificationDispatchService(db_session).run()
    notification_id = client.get("/api/notifications", headers=auth_headers).json()[0]["id"]

    client.post("/api/auth/register", json={"email": "otronotif@example.com", "password": "supersecret123"})
    other_login = client.post(
        "/api/auth/login", data={"username": "otronotif@example.com", "password": "supersecret123"}
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.patch(f"/api/notifications/{notification_id}/read", headers=other_headers)
    assert response.status_code == 404
    assert client.get("/api/notifications", headers=other_headers).json() == []
