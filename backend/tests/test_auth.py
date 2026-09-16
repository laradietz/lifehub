def test_register_creates_user(client):
    response = client.post(
        "/api/auth/register",
        json={"email": "ana@example.com", "password": "supersecret123", "full_name": "Ana Gomez"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ana@example.com"
    assert "hashed_password" not in body
    assert "password" not in body


def test_register_duplicate_email_fails(client):
    payload = {"email": "dup@example.com", "password": "supersecret123"}
    client.post("/api/auth/register", json=payload)
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409


def test_register_rejects_short_password(client):
    response = client.post("/api/auth/register", json={"email": "short@example.com", "password": "123"})
    assert response.status_code == 422


def test_login_success_and_me(client):
    client.post("/api/auth/register", json={"email": "login@example.com", "password": "supersecret123"})
    response = client.post("/api/auth/login", data={"username": "login@example.com", "password": "supersecret123"})
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens and "refresh_token" in tokens

    me = client.get("/api/users/me", headers={"Authorization": f"Bearer {tokens['access_token']}"})
    assert me.status_code == 200
    assert me.json()["email"] == "login@example.com"


def test_login_wrong_password_fails(client):
    client.post("/api/auth/register", json={"email": "wrong@example.com", "password": "supersecret123"})
    response = client.post("/api/auth/login", data={"username": "wrong@example.com", "password": "badpassword"})
    assert response.status_code == 401


def test_me_without_token_fails(client):
    response = client.get("/api/users/me")
    assert response.status_code == 401


def test_refresh_rotates_and_revokes_previous_token(client):
    client.post("/api/auth/register", json={"email": "refresh@example.com", "password": "supersecret123"})
    login = client.post("/api/auth/login", data={"username": "refresh@example.com", "password": "supersecret123"})
    refresh_token = login.json()["refresh_token"]

    refreshed = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refreshed.status_code == 200
    new_refresh = refreshed.json()["refresh_token"]

    reused = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert reused.status_code == 401

    logout = client.post("/api/auth/logout", json={"refresh_token": new_refresh})
    assert logout.status_code == 204

    after_logout = client.post("/api/auth/refresh", json={"refresh_token": new_refresh})
    assert after_logout.status_code == 401


def test_password_reset_flow(client, db_session):
    import hashlib

    from app.models.auth_token import PasswordResetToken

    client.post("/api/auth/register", json={"email": "reset@example.com", "password": "supersecret123"})

    request_response = client.post("/api/auth/password-reset/request", json={"email": "reset@example.com"})
    assert request_response.status_code == 202

    stored = db_session.query(PasswordResetToken).first()
    assert stored is not None

    # Simulamos el codigo en claro: en un flujo real llega por email, aca solo validamos la logica.
    raw_code = "123456"
    stored.token_hash = hashlib.sha256(raw_code.encode("utf-8")).hexdigest()
    db_session.commit()

    wrong_code_response = client.post(
        "/api/auth/password-reset/confirm",
        json={"email": "reset@example.com", "code": "000000", "new_password": "brandnewpassword"},
    )
    assert wrong_code_response.status_code == 400

    confirm_response = client.post(
        "/api/auth/password-reset/confirm",
        json={"email": "reset@example.com", "code": raw_code, "new_password": "brandnewpassword"},
    )
    assert confirm_response.status_code == 200

    # El codigo ya usado no debe poder reutilizarse.
    reuse_response = client.post(
        "/api/auth/password-reset/confirm",
        json={"email": "reset@example.com", "code": raw_code, "new_password": "anotherpassword123"},
    )
    assert reuse_response.status_code == 400

    old_login = client.post("/api/auth/login", data={"username": "reset@example.com", "password": "supersecret123"})
    assert old_login.status_code == 401

    new_login = client.post("/api/auth/login", data={"username": "reset@example.com", "password": "brandnewpassword"})
    assert new_login.status_code == 200


def test_password_reset_locks_after_too_many_wrong_attempts(client, db_session):
    import hashlib

    from app.models.auth_token import PasswordResetToken

    client.post("/api/auth/register", json={"email": "lockout@example.com", "password": "supersecret123"})
    client.post("/api/auth/password-reset/request", json={"email": "lockout@example.com"})

    stored = db_session.query(PasswordResetToken).first()
    stored.token_hash = hashlib.sha256("123456".encode("utf-8")).hexdigest()
    db_session.commit()

    for _ in range(5):
        response = client.post(
            "/api/auth/password-reset/confirm",
            json={"email": "lockout@example.com", "code": "000000", "new_password": "brandnewpassword"},
        )
        assert response.status_code == 400

    # Incluso con el codigo correcto, ya se agotaron los intentos permitidos.
    final_attempt = client.post(
        "/api/auth/password-reset/confirm",
        json={"email": "lockout@example.com", "code": "123456", "new_password": "brandnewpassword"},
    )
    assert final_attempt.status_code == 400


def test_password_reset_request_does_not_leak_existing_email(client):
    response = client.post("/api/auth/password-reset/request", json={"email": "doesnotexist@example.com"})
    assert response.status_code == 202


def test_password_reset_revokes_existing_sessions(client, db_session):
    import hashlib

    from app.models.auth_token import PasswordResetToken

    client.post("/api/auth/register", json={"email": "revoke@example.com", "password": "supersecret123"})
    login = client.post("/api/auth/login", data={"username": "revoke@example.com", "password": "supersecret123"})
    old_refresh_token = login.json()["refresh_token"]

    client.post("/api/auth/password-reset/request", json={"email": "revoke@example.com"})
    stored = db_session.query(PasswordResetToken).first()
    stored.token_hash = hashlib.sha256("123456".encode("utf-8")).hexdigest()
    db_session.commit()

    confirm = client.post(
        "/api/auth/password-reset/confirm",
        json={"email": "revoke@example.com", "code": "123456", "new_password": "brandnewpassword"},
    )
    assert confirm.status_code == 200

    # La sesion abierta ANTES del reseteo no debe seguir siendo utilizable despues.
    reused = client.post("/api/auth/refresh", json={"refresh_token": old_refresh_token})
    assert reused.status_code == 401


def test_access_token_rejected_at_refresh_endpoint(client):
    client.post("/api/auth/register", json={"email": "typeconfusion@example.com", "password": "supersecret123"})
    login = client.post(
        "/api/auth/login", data={"username": "typeconfusion@example.com", "password": "supersecret123"}
    )
    access_token = login.json()["access_token"]

    response = client.post("/api/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == 401


def test_refresh_token_rejected_as_bearer_token(client):
    client.post("/api/auth/register", json={"email": "typeconfusion2@example.com", "password": "supersecret123"})
    login = client.post(
        "/api/auth/login", data={"username": "typeconfusion2@example.com", "password": "supersecret123"}
    )
    refresh_token = login.json()["refresh_token"]

    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {refresh_token}"})
    assert response.status_code == 401


def test_tampered_access_token_rejected(client):
    client.post("/api/auth/register", json={"email": "tamper@example.com", "password": "supersecret123"})
    login = client.post("/api/auth/login", data={"username": "tamper@example.com", "password": "supersecret123"})
    access_token = login.json()["access_token"]

    tampered = access_token[:-4] + ("A" if access_token[-4] != "A" else "B") + access_token[-3:]
    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {tampered}"})
    assert response.status_code == 401


def test_malformed_authorization_header_rejected(client):
    response = client.get("/api/users/me", headers={"Authorization": "Bearer not-a-real-jwt"})
    assert response.status_code == 401


def test_expired_access_token_rejected(client, monkeypatch):
    from datetime import timedelta

    from app.core import security

    monkeypatch.setattr(security, "timedelta", lambda **kwargs: timedelta(**{**kwargs, "minutes": -1}))
    client.post("/api/auth/register", json={"email": "expired@example.com", "password": "supersecret123"})
    login = client.post("/api/auth/login", data={"username": "expired@example.com", "password": "supersecret123"})
    expired_access_token = login.json()["access_token"]

    response = client.get("/api/users/me", headers={"Authorization": f"Bearer {expired_access_token}"})
    assert response.status_code == 401
