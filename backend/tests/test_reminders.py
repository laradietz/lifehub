def test_create_and_list_reminder(client, auth_headers):
    response = client.post(
        "/api/reminders",
        json={"name": "Seguro del auto", "due_date": "2026-10-20", "priority": "high"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Seguro del auto"
    assert body["advance_notice_days"] == [30, 7, 1]
    assert body["is_completed"] is False

    listing = client.get("/api/reminders", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_completed_reminders_excluded_by_default(client, auth_headers):
    created = client.post("/api/reminders", json={"name": "Turno medico", "due_date": "2026-05-01"}, headers=auth_headers)
    reminder_id = created.json()["id"]
    client.patch(f"/api/reminders/{reminder_id}", json={"is_completed": True}, headers=auth_headers)

    default_listing = client.get("/api/reminders", headers=auth_headers).json()
    assert default_listing == []

    full_listing = client.get("/api/reminders?include_completed=true", headers=auth_headers).json()
    assert len(full_listing) == 1


def test_completing_recurring_reminder_creates_next_occurrence(client, auth_headers):
    created = client.post(
        "/api/reminders",
        json={"name": "Pago del gimnasio", "due_date": "2026-01-01", "recurrence": "monthly"},
        headers=auth_headers,
    )
    reminder_id = created.json()["id"]

    client.patch(f"/api/reminders/{reminder_id}", json={"is_completed": True}, headers=auth_headers)

    listing = client.get("/api/reminders", headers=auth_headers).json()
    assert len(listing) == 1
    assert listing[0]["due_date"] == "2026-02-01"
    assert listing[0]["is_completed"] is False


def test_cannot_access_another_users_reminder(client, auth_headers):
    created = client.post("/api/reminders", json={"name": "Privado", "due_date": "2026-01-01"}, headers=auth_headers)
    reminder_id = created.json()["id"]

    client.post("/api/auth/register", json={"email": "otra@example.com", "password": "supersecret123"})
    other_login = client.post(
        "/api/auth/login", data={"username": "otra@example.com", "password": "supersecret123"}
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.get(f"/api/reminders/{reminder_id}", headers=other_headers)
    assert response.status_code == 404


def test_delete_reminder(client, auth_headers):
    created = client.post("/api/reminders", json={"name": "Borrar", "due_date": "2026-01-01"}, headers=auth_headers)
    reminder_id = created.json()["id"]

    response = client.delete(f"/api/reminders/{reminder_id}", headers=auth_headers)
    assert response.status_code == 204
    assert client.get(f"/api/reminders/{reminder_id}", headers=auth_headers).status_code == 404
