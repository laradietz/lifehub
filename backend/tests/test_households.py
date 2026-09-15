def _register_and_login(client, email: str) -> dict[str, str]:
    client.post("/api/auth/register", json={"email": email, "password": "supersecret123"})
    login = client.post("/api/auth/login", data={"username": email, "password": "supersecret123"})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def _create_household(client, headers, name="Casa") -> str:
    response = client.post("/api/households", json={"name": name}, headers=headers)
    assert response.status_code == 201
    return response.json()["id"]


def _invite(client, headers, household_id, email):
    return client.post(f"/api/households/{household_id}/members", json={"email": email}, headers=headers)


def test_create_household_creates_owner_as_accepted_member(client, auth_headers):
    household_id = _create_household(client, auth_headers)

    detail = client.get(f"/api/households/{household_id}", headers=auth_headers)
    assert detail.status_code == 200
    members = detail.json()["members"]
    assert len(members) == 1
    assert members[0]["role"] == "owner"
    assert members[0]["status"] == "accepted"


def test_invite_by_email_creates_pending_member(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    other_headers = _register_and_login(client, "invitee@example.com")

    response = _invite(client, auth_headers, household_id, "invitee@example.com")
    assert response.status_code == 201
    assert response.json()["status"] == "pending"

    pending = client.get("/api/households/invitations/pending", headers=other_headers)
    assert len(pending.json()) == 1
    assert pending.json()[0]["household_name"] == "Casa"


def test_invite_nonexistent_email_returns_404(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    response = _invite(client, auth_headers, household_id, "nadie@example.com")
    assert response.status_code == 404


def test_invite_self_returns_400(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    response = _invite(client, auth_headers, household_id, "owner@example.com")
    assert response.status_code == 400


def test_invite_already_member_returns_409(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    other_headers = _register_and_login(client, "member@example.com")
    _invite(client, auth_headers, household_id, "member@example.com")
    member_id = client.get("/api/households/invitations/pending", headers=other_headers).json()[0]["id"]
    client.post(f"/api/households/invitations/{member_id}/accept", headers=other_headers)

    response = _invite(client, auth_headers, household_id, "member@example.com")
    assert response.status_code == 409


def test_invite_already_pending_returns_409(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    _register_and_login(client, "pending@example.com")
    _invite(client, auth_headers, household_id, "pending@example.com")

    response = _invite(client, auth_headers, household_id, "pending@example.com")
    assert response.status_code == 409


def test_non_owner_member_cannot_invite(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "member2@example.com")
    _invite(client, auth_headers, household_id, "member2@example.com")
    member_id = client.get("/api/households/invitations/pending", headers=member_headers).json()[0]["id"]
    client.post(f"/api/households/invitations/{member_id}/accept", headers=member_headers)

    _register_and_login(client, "target@example.com")
    response = _invite(client, member_headers, household_id, "target@example.com")
    assert response.status_code == 403


def test_non_member_cannot_invite(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    stranger_headers = _register_and_login(client, "stranger@example.com")
    _register_and_login(client, "target2@example.com")

    response = _invite(client, stranger_headers, household_id, "target2@example.com")
    assert response.status_code == 404


def test_pending_invitee_cannot_get_household_detail(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    other_headers = _register_and_login(client, "waiting@example.com")
    _invite(client, auth_headers, household_id, "waiting@example.com")

    response = client.get(f"/api/households/{household_id}", headers=other_headers)
    assert response.status_code == 404


def test_accept_invitation_makes_member_accepted_and_visible(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    other_headers = _register_and_login(client, "accepter@example.com")
    _invite(client, auth_headers, household_id, "accepter@example.com")
    member_id = client.get("/api/households/invitations/pending", headers=other_headers).json()[0]["id"]

    response = client.post(f"/api/households/invitations/{member_id}/accept", headers=other_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"

    detail = client.get(f"/api/households/{household_id}", headers=other_headers)
    assert detail.status_code == 200


def test_decline_invitation_deletes_row_and_allows_reinvite(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    other_headers = _register_and_login(client, "decliner@example.com")
    _invite(client, auth_headers, household_id, "decliner@example.com")
    member_id = client.get("/api/households/invitations/pending", headers=other_headers).json()[0]["id"]

    response = client.post(f"/api/households/invitations/{member_id}/decline", headers=other_headers)
    assert response.status_code == 204
    assert client.get("/api/households/invitations/pending", headers=other_headers).json() == []

    reinvite = _invite(client, auth_headers, household_id, "decliner@example.com")
    assert reinvite.status_code == 201


def test_accept_invitation_of_another_user_returns_404(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    invitee_headers = _register_and_login(client, "realinvitee@example.com")
    _invite(client, auth_headers, household_id, "realinvitee@example.com")
    member_id = client.get("/api/households/invitations/pending", headers=invitee_headers).json()[0]["id"]

    intruder_headers = _register_and_login(client, "intruder@example.com")
    response = client.post(f"/api/households/invitations/{member_id}/accept", headers=intruder_headers)
    assert response.status_code == 404


def test_remove_member_by_non_owner_returns_403(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "removable@example.com")
    _invite(client, auth_headers, household_id, "removable@example.com")
    member_id = client.get("/api/households/invitations/pending", headers=member_headers).json()[0]["id"]
    client.post(f"/api/households/invitations/{member_id}/accept", headers=member_headers)

    response = client.delete(f"/api/households/{household_id}/members/{member_id}", headers=member_headers)
    assert response.status_code == 403


def test_owner_cannot_remove_self_or_leave(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    owner_member_id = client.get(f"/api/households/{household_id}", headers=auth_headers).json()["members"][0]["id"]

    remove = client.delete(f"/api/households/{household_id}/members/{owner_member_id}", headers=auth_headers)
    assert remove.status_code == 400

    leave = client.post(f"/api/households/{household_id}/leave", headers=auth_headers)
    assert leave.status_code == 400


def test_owner_can_delete_household_cascades_members(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    member_headers = _register_and_login(client, "willbegone@example.com")
    _invite(client, auth_headers, household_id, "willbegone@example.com")
    member_id = client.get("/api/households/invitations/pending", headers=member_headers).json()[0]["id"]
    client.post(f"/api/households/invitations/{member_id}/accept", headers=member_headers)

    response = client.delete(f"/api/households/{household_id}", headers=auth_headers)
    assert response.status_code == 204
    assert client.get(f"/api/households/{household_id}", headers=auth_headers).status_code == 404
    assert client.get(f"/api/households/{household_id}", headers=member_headers).status_code == 404


def test_cross_household_isolation(client, auth_headers):
    household_id = _create_household(client, auth_headers)
    stranger_headers = _register_and_login(client, "outsider@example.com")

    listing = client.get("/api/households", headers=stranger_headers)
    assert listing.json() == []

    detail = client.get(f"/api/households/{household_id}", headers=stranger_headers)
    assert detail.status_code == 404
