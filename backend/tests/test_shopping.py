from datetime import datetime, timedelta, timezone

from app.models.shopping import ShoppingHistory
from app.models.user import User


def _register_and_login(client, email: str) -> dict[str, str]:
    client.post("/api/auth/register", json={"email": email, "password": "supersecret123"})
    login = client.post("/api/auth/login", data={"username": email, "password": "supersecret123"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _create_household(client, headers, name="Casa") -> str:
    response = client.post("/api/households", json={"name": name}, headers=headers)
    return response.json()["id"]


def _invite_and_accept(client, owner_headers, household_id, member_headers, email):
    client.post(f"/api/households/{household_id}/members", json={"email": email}, headers=owner_headers)
    member_id = client.get("/api/households/invitations/pending", headers=member_headers).json()[0]["id"]
    client.post(f"/api/households/invitations/{member_id}/accept", headers=member_headers)


def _user_id(db_session, email: str) -> str:
    user = db_session.query(User).filter(User.email == email).one()
    return str(user.id)


def test_create_personal_list_and_items(client, auth_headers):
    created = client.post("/api/shopping/lists", json={"name": "Semanal"}, headers=auth_headers)
    assert created.status_code == 201
    list_id = created.json()["id"]

    item = client.post(
        f"/api/shopping/lists/{list_id}/items", json={"name": "Pan", "quantity": 1}, headers=auth_headers
    )
    assert item.status_code == 201

    detail = client.get(f"/api/shopping/lists/{list_id}", headers=auth_headers)
    assert len(detail.json()["items"]) == 1


def test_household_member_sees_shared_list(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "shopper@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "shopper@example.com")

    created = client.post(
        "/api/shopping/lists", json={"name": "Super", "household_id": household_id}, headers=auth_headers
    )
    list_id = created.json()["id"]

    listing = client.get("/api/shopping/lists", headers=member_headers)
    assert any(shopping_list["id"] == list_id for shopping_list in listing.json())


def test_non_member_cannot_create_list_for_foreign_household(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    stranger_headers = _register_and_login(client, "notinhouse@example.com")

    response = client.post(
        "/api/shopping/lists", json={"name": "Ajena", "household_id": household_id}, headers=stranger_headers
    )
    assert response.status_code == 404


def test_pending_member_cannot_see_household_list(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    pending_headers = _register_and_login(client, "notyet@example.com")
    client.post(
        f"/api/households/{household_id}/members", json={"email": "notyet@example.com"}, headers=auth_headers
    )

    client.post("/api/shopping/lists", json={"name": "Super", "household_id": household_id}, headers=auth_headers)

    listing = client.get("/api/shopping/lists", headers=pending_headers)
    assert listing.json() == []


def test_only_list_owner_can_rename_or_delete_list(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "notowner@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "notowner@example.com")

    created = client.post(
        "/api/shopping/lists", json={"name": "Super", "household_id": household_id}, headers=auth_headers
    )
    list_id = created.json()["id"]

    rename = client.patch(f"/api/shopping/lists/{list_id}", json={"name": "Otro"}, headers=member_headers)
    assert rename.status_code == 403

    delete = client.delete(f"/api/shopping/lists/{list_id}", headers=member_headers)
    assert delete.status_code == 403


def test_any_household_member_can_add_and_toggle_items(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "addsitems@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "addsitems@example.com")

    created = client.post(
        "/api/shopping/lists", json={"name": "Super", "household_id": household_id}, headers=auth_headers
    )
    list_id = created.json()["id"]

    item = client.post(
        f"/api/shopping/lists/{list_id}/items", json={"name": "Fideos"}, headers=member_headers
    )
    assert item.status_code == 201
    item_id = item.json()["id"]

    toggled = client.patch(
        f"/api/shopping/lists/{list_id}/items/{item_id}", json={"is_purchased": True}, headers=member_headers
    )
    assert toggled.status_code == 200
    assert toggled.json()["is_purchased"] is True
    assert toggled.json()["purchased_at"] is not None


def test_suggestions_require_at_least_two_purchases(client, auth_headers, db_session):
    user_id = _user_id(db_session, "owner@example.com")
    db_session.add(ShoppingHistory(user_id=user_id, item_name="Café", purchased_at=datetime.now(timezone.utc)))
    db_session.commit()

    response = client.get("/api/shopping/suggestions", headers=auth_headers)
    assert response.json() == []


def test_suggestions_computed_from_history(client, auth_headers, db_session):
    user_id = _user_id(db_session, "owner@example.com")
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            ShoppingHistory(user_id=user_id, item_name="Leche", purchased_at=now - timedelta(days=20)),
            ShoppingHistory(user_id=user_id, item_name="Leche", purchased_at=now - timedelta(days=10)),
        ]
    )
    db_session.commit()

    response = client.get("/api/shopping/suggestions", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["item_name"] == "Leche"
    assert body[0]["avg_interval_days"] == 10
    assert body[0]["suggested"] is True


def test_suggestions_exclude_items_already_on_an_unpurchased_list(client, auth_headers, db_session):
    user_id = _user_id(db_session, "owner@example.com")
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            ShoppingHistory(user_id=user_id, item_name="Leche", purchased_at=now - timedelta(days=20)),
            ShoppingHistory(user_id=user_id, item_name="Leche", purchased_at=now - timedelta(days=10)),
        ]
    )
    db_session.commit()

    created = client.post("/api/shopping/lists", json={"name": "Pendientes"}, headers=auth_headers)
    list_id = created.json()["id"]
    client.post(f"/api/shopping/lists/{list_id}/items", json={"name": "leche"}, headers=auth_headers)

    response = client.get("/api/shopping/suggestions", headers=auth_headers)
    assert response.json() == []


def test_suggestions_are_scoped_per_user_not_household(client, auth_headers, db_session):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "noownhistory@example.com")
    _invite_and_accept(client, auth_headers, household_id, member_headers, "noownhistory@example.com")

    owner_id = _user_id(db_session, "owner@example.com")
    now = datetime.now(timezone.utc)
    db_session.add_all(
        [
            ShoppingHistory(user_id=owner_id, item_name="Yerba", purchased_at=now - timedelta(days=20)),
            ShoppingHistory(user_id=owner_id, item_name="Yerba", purchased_at=now - timedelta(days=10)),
        ]
    )
    db_session.commit()

    response = client.get("/api/shopping/suggestions", headers=member_headers)
    assert response.json() == []
