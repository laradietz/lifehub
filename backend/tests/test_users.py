def _register_and_login(client, email: str = "user@example.com", password: str = "supersecret123") -> str:
    client.post("/api/auth/register", json={"email": email, "password": password})
    login = client.post("/api/auth/login", data={"username": email, "password": password})
    return login.json()["access_token"]


def test_update_profile(client):
    token = _register_and_login(client)
    response = client.patch(
        "/api/users/me",
        json={"full_name": "Nuevo Nombre"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Nuevo Nombre"


def test_cannot_access_without_valid_token(client):
    response = client.get("/api/users/me", headers={"Authorization": "Bearer invalid.token.value"})
    assert response.status_code == 401


def test_cannot_update_other_users_data_via_id(client):
    # No existe endpoint que reciba un user_id externo: /me siempre opera sobre el usuario del token.
    token_a = _register_and_login(client, email="a@example.com")
    token_b = _register_and_login(client, email="b@example.com")

    client.patch("/api/users/me", json={"full_name": "Soy A"}, headers={"Authorization": f"Bearer {token_a}"})

    me_b = client.get("/api/users/me", headers={"Authorization": f"Bearer {token_b}"})
    assert me_b.json()["full_name"] != "Soy A"
