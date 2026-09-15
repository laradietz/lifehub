def test_create_and_list_subscription(client, auth_headers):
    response = client.post(
        "/api/subscriptions",
        json={
            "name": "Spotify",
            "price": "9.99",
            "frequency": "monthly",
            "next_billing_date": "2026-09-18",
            "payment_method": "card",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["is_active"] is True

    listing = client.get("/api/subscriptions", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_inactive_subscriptions_excluded_by_default(client, auth_headers):
    created = client.post(
        "/api/subscriptions",
        json={"name": "Gimnasio", "price": "20", "frequency": "monthly", "next_billing_date": "2026-09-01", "payment_method": "card"},
        headers=auth_headers,
    )
    subscription_id = created.json()["id"]
    client.patch(f"/api/subscriptions/{subscription_id}", json={"is_active": False}, headers=auth_headers)

    default_listing = client.get("/api/subscriptions", headers=auth_headers).json()
    assert default_listing == []

    full_listing = client.get("/api/subscriptions?include_inactive=true", headers=auth_headers).json()
    assert len(full_listing) == 1


def test_subscription_summary_normalizes_frequencies(client, auth_headers):
    client.post(
        "/api/subscriptions",
        json={"name": "Netflix", "price": "12", "frequency": "monthly", "next_billing_date": "2026-09-20", "payment_method": "card"},
        headers=auth_headers,
    )
    client.post(
        "/api/subscriptions",
        json={"name": "Dominio anual", "price": "120", "frequency": "yearly", "next_billing_date": "2026-12-01", "payment_method": "card"},
        headers=auth_headers,
    )
    client.post(
        "/api/subscriptions",
        json={"name": "Diario", "price": "5", "frequency": "weekly", "next_billing_date": "2026-09-18", "payment_method": "cash"},
        headers=auth_headers,
    )

    response = client.get("/api/subscriptions/summary", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    # 12 (mensual) + 120/12=10 (anual) + 5*52/12=21.67 (semanal)
    assert body["monthly_total"] == "43.67"
    assert body["annual_total"] == "524.00"
    assert body["next_billing"]["name"] == "Diario"


def test_cannot_access_another_users_subscription(client, auth_headers):
    created = client.post(
        "/api/subscriptions",
        json={"name": "Privada", "price": "1", "frequency": "monthly", "next_billing_date": "2026-09-01", "payment_method": "cash"},
        headers=auth_headers,
    )
    subscription_id = created.json()["id"]

    client.post("/api/auth/register", json={"email": "otro-sub@example.com", "password": "supersecret123"})
    other_login = client.post(
        "/api/auth/login", data={"username": "otro-sub@example.com", "password": "supersecret123"}
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.get(f"/api/subscriptions/{subscription_id}", headers=other_headers)
    assert response.status_code == 404


def test_delete_subscription(client, auth_headers):
    created = client.post(
        "/api/subscriptions",
        json={"name": "Borrar", "price": "1", "frequency": "monthly", "next_billing_date": "2026-09-01", "payment_method": "cash"},
        headers=auth_headers,
    )
    subscription_id = created.json()["id"]

    response = client.delete(f"/api/subscriptions/{subscription_id}", headers=auth_headers)
    assert response.status_code == 204
    assert client.get(f"/api/subscriptions/{subscription_id}", headers=auth_headers).status_code == 404
