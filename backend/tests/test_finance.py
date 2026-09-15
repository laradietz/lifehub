def test_create_and_list_income(client, auth_headers):
    response = client.post(
        "/api/incomes",
        json={"amount": "1500.00", "date": "2026-09-01", "payment_method": "transfer"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["amount"] == "1500.00"

    listing = client.get("/api/incomes", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_create_and_list_expense(client, auth_headers):
    response = client.post(
        "/api/expenses",
        json={"amount": "50.00", "date": "2026-09-05", "payment_method": "cash", "description": "Supermercado"},
        headers=auth_headers,
    )
    assert response.status_code == 201

    listing = client.get("/api/expenses", headers=auth_headers)
    assert len(listing.json()) == 1


def test_expense_rejects_non_positive_amount(client, auth_headers):
    response = client.post(
        "/api/expenses", json={"amount": "0", "date": "2026-09-05", "payment_method": "cash"}, headers=auth_headers
    )
    assert response.status_code == 422


def test_cannot_access_another_users_expense(client, auth_headers):
    created = client.post(
        "/api/expenses", json={"amount": "10.00", "date": "2026-09-05", "payment_method": "cash"}, headers=auth_headers
    )
    expense_id = created.json()["id"]

    client.post("/api/auth/register", json={"email": "otro-fin@example.com", "password": "supersecret123"})
    other_login = client.post(
        "/api/auth/login", data={"username": "otro-fin@example.com", "password": "supersecret123"}
    )
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.get(f"/api/expenses/{expense_id}", headers=other_headers)
    assert response.status_code == 404


def test_update_and_delete_expense(client, auth_headers):
    created = client.post(
        "/api/expenses", json={"amount": "10.00", "date": "2026-09-05", "payment_method": "cash"}, headers=auth_headers
    )
    expense_id = created.json()["id"]

    updated = client.patch(f"/api/expenses/{expense_id}", json={"amount": "20.00"}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["amount"] == "20.00"

    deleted = client.delete(f"/api/expenses/{expense_id}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/expenses/{expense_id}", headers=auth_headers).status_code == 404


def test_finance_summary_computes_totals_and_category_breakdown(client, auth_headers):
    client.post(
        "/api/incomes", json={"amount": "2000.00", "date": "2026-09-10", "payment_method": "transfer"}, headers=auth_headers
    )

    categories = client.get("/api/categories?type=expense", headers=auth_headers).json()
    comida = next(cat for cat in categories if cat["name"] == "Comida")

    client.post(
        "/api/expenses",
        json={"amount": "300.00", "date": "2026-09-05", "payment_method": "card", "category_id": comida["id"]},
        headers=auth_headers,
    )
    client.post(
        "/api/expenses",
        json={"amount": "100.00", "date": "2026-09-06", "payment_method": "cash", "category_id": comida["id"]},
        headers=auth_headers,
    )

    response = client.get("/api/finance/summary?month=2026-09-01", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total_income"] == "2000.00"
    assert body["total_expense"] == "400.00"
    assert body["balance"] == "1600.00"
    assert body["top_expense_category"]["category_name"] == "Comida"
    assert len(body["evolution"]) == 6
    assert body["evolution"][-1]["month"] == "2026-09"


def test_finance_summary_requires_auth(client):
    response = client.get("/api/finance/summary")
    assert response.status_code == 401
