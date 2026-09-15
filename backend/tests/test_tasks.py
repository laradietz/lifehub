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


def _register_and_login(client, email: str) -> dict[str, str]:
    client.post("/api/auth/register", json={"email": email, "password": "supersecret123"})
    login = client.post("/api/auth/login", data={"username": email, "password": "supersecret123"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _create_household(client, headers, name="Casa") -> str:
    response = client.post("/api/households", json={"name": name}, headers=headers)
    return response.json()["id"]


def _invite_and_accept(client, owner_headers, household_id, member_headers, email) -> str:
    client.post(f"/api/households/{household_id}/members", json={"email": email}, headers=owner_headers)
    member_id = client.get("/api/households/invitations/pending", headers=member_headers).json()[0]["id"]
    client.post(f"/api/households/invitations/{member_id}/accept", headers=member_headers)
    return member_id


def _member_user_id(client, member_headers) -> str:
    return client.get("/api/users/me", headers=member_headers).json()["id"]


def test_task_with_household_id_requires_membership(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    stranger_headers = _register_and_login(client, "notinhousehold@example.com")

    response = client.post(
        "/api/tasks", json={"title": "Tarea de hogar", "household_id": household_id}, headers=stranger_headers
    )
    assert response.status_code == 404


def test_assign_task_requires_household_id(client, auth_headers):
    other_headers = _register_and_login(client, "assignee1@example.com")
    other_user_id = _member_user_id(client, other_headers)

    response = client.post(
        "/api/tasks", json={"title": "Sin hogar", "assigned_to_id": other_user_id}, headers=auth_headers
    )
    assert response.status_code == 400


def test_assign_task_to_non_member_returns_400(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    outsider_headers = _register_and_login(client, "outsider2@example.com")
    outsider_id = _member_user_id(client, outsider_headers)

    response = client.post(
        "/api/tasks",
        json={"title": "Mal asignada", "household_id": household_id, "assigned_to_id": outsider_id},
        headers=auth_headers,
    )
    assert response.status_code == 400


def test_assignee_can_view_and_update_household_task(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "assignee2@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "assignee2@example.com")
    member_id_user = _member_user_id(client, member_headers)

    created = client.post(
        "/api/tasks",
        json={"title": "Sacar la basura", "household_id": household_id, "assigned_to_id": member_id_user},
        headers=auth_headers,
    )
    task_id = created.json()["id"]

    view = client.get(f"/api/tasks/{task_id}", headers=member_headers)
    assert view.status_code == 200

    update = client.patch(f"/api/tasks/{task_id}", json={"status": "completed"}, headers=member_headers)
    assert update.status_code == 200
    assert update.json()["status"] == "completed"


def test_non_member_cannot_view_household_task(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "assignee3@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "assignee3@example.com")
    member_id_user = _member_user_id(client, member_headers)

    created = client.post(
        "/api/tasks",
        json={"title": "Tarea privada del hogar", "household_id": household_id, "assigned_to_id": member_id_user},
        headers=auth_headers,
    )
    task_id = created.json()["id"]

    outsider_headers = _register_and_login(client, "trulyoutside@example.com")
    response = client.get(f"/api/tasks/{task_id}", headers=outsider_headers)
    assert response.status_code == 404


def test_only_creator_can_delete_household_task(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "assignee4@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "assignee4@example.com")
    member_id_user = _member_user_id(client, member_headers)

    created = client.post(
        "/api/tasks",
        json={"title": "No la borres", "household_id": household_id, "assigned_to_id": member_id_user},
        headers=auth_headers,
    )
    task_id = created.json()["id"]

    response = client.delete(f"/api/tasks/{task_id}", headers=member_headers)
    assert response.status_code == 404

    response = client.delete(f"/api/tasks/{task_id}", headers=auth_headers)
    assert response.status_code == 204


def test_clearing_household_id_also_clears_assignment(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "assignee5@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "assignee5@example.com")
    member_id_user = _member_user_id(client, member_headers)

    created = client.post(
        "/api/tasks",
        json={"title": "Tarea compartida", "household_id": household_id, "assigned_to_id": member_id_user},
        headers=auth_headers,
    )
    task_id = created.json()["id"]

    updated = client.patch(f"/api/tasks/{task_id}", json={"household_id": None}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["household_id"] is None
    assert updated.json()["assigned_to_id"] is None
