def test_get_default_settings(client, auth_headers):
    response = client.get("/api/settings", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["language"] == "es"
    assert body["currency"] == "USD"
    assert "tasks" in body["enabled_modules"]


def test_update_dashboard_widgets(client, auth_headers):
    response = client.patch(
        "/api/settings", json={"dashboard_widgets": ["today"], "theme": "dark"}, headers=auth_headers
    )
    assert response.status_code == 200
    body = response.json()
    assert body["dashboard_widgets"] == ["today"]
    assert body["theme"] == "dark"


def test_dashboard_summary_counts_pending_and_overdue_tasks(client, auth_headers):
    client.post(
        "/api/tasks", json={"title": "Vencida", "due_date": "2020-01-01T00:00:00Z"}, headers=auth_headers
    )
    client.post("/api/tasks", json={"title": "Sin fecha"}, headers=auth_headers)
    client.post(
        "/api/reminders", json={"name": "Recordatorio futuro", "due_date": "2099-01-01"}, headers=auth_headers
    )

    response = client.get("/api/dashboard/today", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["today"]["tasks_overdue"] == 1
    assert body["today"]["pending_tasks_total"] == 2
    assert len(body["upcoming_reminders"]) == 1


def test_dashboard_requires_auth(client):
    response = client.get("/api/dashboard/today")
    assert response.status_code == 401
