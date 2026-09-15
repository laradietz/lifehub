def test_default_categories_are_seeded_on_register(client, auth_headers):
    response = client.get("/api/categories?type=task", headers=auth_headers)
    assert response.status_code == 200
    names = {category["name"] for category in response.json()}
    assert "Trabajo" in names
    assert "Personal" in names

    reminder_categories = client.get("/api/categories?type=reminder", headers=auth_headers).json()
    assert any(category["name"] == "Seguros" for category in reminder_categories)


def test_create_custom_category(client, auth_headers):
    response = client.post(
        "/api/categories", json={"type": "task", "name": "Voluntariado", "color": "#22c55e"}, headers=auth_headers
    )
    assert response.status_code == 201
    assert response.json()["is_system"] is False

    listing = client.get("/api/categories?type=task", headers=auth_headers).json()
    assert any(category["name"] == "Voluntariado" for category in listing)


def test_cannot_delete_another_users_category(client, auth_headers):
    created = client.post("/api/categories", json={"type": "task", "name": "Mia"}, headers=auth_headers)
    category_id = created.json()["id"]

    client.post("/api/auth/register", json={"email": "b@example.com", "password": "supersecret123"})
    other_login = client.post("/api/auth/login", data={"username": "b@example.com", "password": "supersecret123"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.delete(f"/api/categories/{category_id}", headers=other_headers)
    assert response.status_code == 404
