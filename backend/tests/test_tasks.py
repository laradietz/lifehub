def test_create_and_list_task(client, auth_headers):
    response = client.post(
        "/api/tasks",
        json={"title": "Pagar el alquiler", "priority": "high"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Pagar el alquiler"
    assert body["status"] == "pending"
    assert body["priority"] == "high"

    listing = client.get("/api/tasks", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_task_requires_auth(client):
    response = client.get("/api/tasks")
    assert response.status_code == 401


def test_update_task_status(client, auth_headers):
    created = client.post("/api/tasks", json={"title": "Lavar el auto"}, headers=auth_headers)
    task_id = created.json()["id"]

    updated = client.patch(f"/api/tasks/{task_id}", json={"status": "in_progress"}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["status"] == "in_progress"


def test_completing_recurring_task_creates_next_occurrence(client, auth_headers):
    created = client.post(
        "/api/tasks",
        json={"title": "Regar las plantas", "due_date": "2026-01-01T10:00:00Z", "recurrence": "weekly"},
        headers=auth_headers,
    )
    task_id = created.json()["id"]

    completed = client.patch(f"/api/tasks/{task_id}", json={"status": "completed"}, headers=auth_headers)
    assert completed.status_code == 200
    assert completed.json()["status"] == "completed"

    listing = client.get("/api/tasks", headers=auth_headers).json()
    assert len(listing) == 2
    pending = [task for task in listing if task["status"] == "pending"][0]
    assert pending["due_date"].startswith("2026-01-08")


def test_completing_non_recurring_task_does_not_duplicate(client, auth_headers):
    created = client.post("/api/tasks", json={"title": "Tarea unica"}, headers=auth_headers)
    task_id = created.json()["id"]

    client.patch(f"/api/tasks/{task_id}", json={"status": "completed"}, headers=auth_headers)

    listing = client.get("/api/tasks", headers=auth_headers).json()
    assert len(listing) == 1


def test_cannot_access_another_users_task(client, auth_headers):
    created = client.post("/api/tasks", json={"title": "Privada"}, headers=auth_headers)
    task_id = created.json()["id"]

    client.post("/api/auth/register", json={"email": "otro@example.com", "password": "supersecret123"})
    other_login = client.post(
        "/api/auth/login", data={"username": "otro@example.com", "password": "supersecret123"}
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.get(f"/api/tasks/{task_id}", headers=other_headers)
    assert response.status_code == 404


def test_filter_tasks_by_status(client, auth_headers):
    client.post("/api/tasks", json={"title": "A"}, headers=auth_headers)
    done = client.post("/api/tasks", json={"title": "B"}, headers=auth_headers)
    client.patch(f"/api/tasks/{done.json()['id']}", json={"status": "completed"}, headers=auth_headers)

    pending_only = client.get("/api/tasks?status=pending", headers=auth_headers).json()
    assert len(pending_only) == 1
    assert pending_only[0]["title"] == "A"


def test_delete_task(client, auth_headers):
    created = client.post("/api/tasks", json={"title": "Borrar esto"}, headers=auth_headers)
    task_id = created.json()["id"]

    response = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 204

    get_response = client.get(f"/api/tasks/{task_id}", headers=auth_headers)
    assert get_response.status_code == 404
