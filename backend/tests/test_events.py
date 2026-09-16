def test_create_and_list_event(client, auth_headers):
    response = client.post(
        "/api/events",
        json={"title": "Turno médico", "start_at": "2026-02-01T10:00:00Z"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Turno médico"
    assert body["all_day"] is False

    listing = client.get("/api/events", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_event_requires_auth(client):
    response = client.get("/api/events")
    assert response.status_code == 401


def test_event_requires_start_at(client, auth_headers):
    response = client.post("/api/events", json={"title": "Sin fecha"}, headers=auth_headers)
    assert response.status_code == 422


def test_update_event(client, auth_headers):
    created = client.post(
        "/api/events", json={"title": "Cumpleaños", "start_at": "2026-03-01T00:00:00Z", "all_day": True},
        headers=auth_headers,
    )
    event_id = created.json()["id"]

    updated = client.patch(f"/api/events/{event_id}", json={"location": "Casa de mamá"}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["location"] == "Casa de mamá"


def test_filter_events_by_date_range(client, auth_headers):
    client.post("/api/events", json={"title": "Enero", "start_at": "2026-01-15T10:00:00Z"}, headers=auth_headers)
    client.post("/api/events", json={"title": "Marzo", "start_at": "2026-03-15T10:00:00Z"}, headers=auth_headers)

    filtered = client.get(
        "/api/events?start_after=2026-01-01T00:00:00Z&start_before=2026-01-31T23:59:59Z", headers=auth_headers
    ).json()
    assert len(filtered) == 1
    assert filtered[0]["title"] == "Enero"


def test_cannot_access_another_users_event(client, auth_headers):
    created = client.post(
        "/api/events", json={"title": "Privado", "start_at": "2026-01-01T00:00:00Z"}, headers=auth_headers
    )
    event_id = created.json()["id"]

    client.post("/api/auth/register", json={"email": "otroevento@example.com", "password": "supersecret123"})
    other_login = client.post(
        "/api/auth/login", data={"username": "otroevento@example.com", "password": "supersecret123"}
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.get(f"/api/events/{event_id}", headers=other_headers)
    assert response.status_code == 404


def test_delete_event(client, auth_headers):
    created = client.post(
        "/api/events", json={"title": "Borrar esto", "start_at": "2026-01-01T00:00:00Z"}, headers=auth_headers
    )
    event_id = created.json()["id"]

    response = client.delete(f"/api/events/{event_id}", headers=auth_headers)
    assert response.status_code == 204

    get_response = client.get(f"/api/events/{event_id}", headers=auth_headers)
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


def test_event_with_household_id_requires_membership(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    stranger_headers = _register_and_login(client, "notinhousehold_evt@example.com")

    response = client.post(
        "/api/events",
        json={"title": "Evento de hogar", "start_at": "2026-01-01T00:00:00Z", "household_id": household_id},
        headers=stranger_headers,
    )
    assert response.status_code == 404


def test_household_member_can_view_shared_event(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "member_evt@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "member_evt@example.com")

    created = client.post(
        "/api/events",
        json={"title": "Cena familiar", "start_at": "2026-01-01T20:00:00Z", "household_id": household_id},
        headers=auth_headers,
    )
    event_id = created.json()["id"]

    view = client.get(f"/api/events/{event_id}", headers=member_headers)
    assert view.status_code == 200

    update = client.patch(f"/api/events/{event_id}", json={"location": "Casa"}, headers=member_headers)
    assert update.status_code == 200


def test_only_creator_can_delete_household_event(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "member_evt2@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "member_evt2@example.com")

    created = client.post(
        "/api/events",
        json={"title": "No la borres", "start_at": "2026-01-01T00:00:00Z", "household_id": household_id},
        headers=auth_headers,
    )
    event_id = created.json()["id"]

    response = client.delete(f"/api/events/{event_id}", headers=member_headers)
    assert response.status_code == 404

    response = client.delete(f"/api/events/{event_id}", headers=auth_headers)
    assert response.status_code == 204
