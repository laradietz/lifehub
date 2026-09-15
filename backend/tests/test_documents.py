def test_create_and_list_document(client, auth_headers):
    response = client.post(
        "/api/documents",
        json={"name": "DNI", "category": "id", "expiry_date": "2030-01-01"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["file_name"] is None

    listing = client.get("/api/documents", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_filter_documents_by_category_and_expiry(client, auth_headers):
    client.post("/api/documents", json={"name": "DNI", "category": "id", "expiry_date": "2030-01-01"}, headers=auth_headers)
    client.post(
        "/api/documents",
        json={"name": "Seguro auto", "category": "insurance", "expiry_date": "2026-09-20"},
        headers=auth_headers,
    )
    client.post("/api/documents", json={"name": "Sin vencimiento", "category": "other"}, headers=auth_headers)

    by_category = client.get("/api/documents?category=insurance", headers=auth_headers).json()
    assert len(by_category) == 1
    assert by_category[0]["name"] == "Seguro auto"

    expiring_soon = client.get("/api/documents?expiring_within_days=30", headers=auth_headers).json()
    assert len(expiring_soon) == 1
    assert expiring_soon[0]["name"] == "Seguro auto"


def test_update_and_delete_document(client, auth_headers):
    created = client.post("/api/documents", json={"name": "Pasaporte", "category": "passport"}, headers=auth_headers)
    document_id = created.json()["id"]

    updated = client.patch(f"/api/documents/{document_id}", json={"notes": "Vence pronto"}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["notes"] == "Vence pronto"

    deleted = client.delete(f"/api/documents/{document_id}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/documents/{document_id}", headers=auth_headers).status_code == 404


def test_cannot_access_another_users_document(client, auth_headers):
    created = client.post("/api/documents", json={"name": "Privado", "category": "other"}, headers=auth_headers)
    document_id = created.json()["id"]

    client.post("/api/auth/register", json={"email": "otro-doc@example.com", "password": "supersecret123"})
    other_login = client.post("/api/auth/login", data={"username": "otro-doc@example.com", "password": "supersecret123"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.get(f"/api/documents/{document_id}", headers=other_headers)
    assert response.status_code == 404


def test_upload_download_and_remove_document_file(client, auth_headers):
    created = client.post("/api/documents", json={"name": "Garantía TV", "category": "warranty"}, headers=auth_headers)
    document_id = created.json()["id"]

    upload = client.post(
        f"/api/documents/{document_id}/file",
        files={"file": ("garantia.pdf", b"contenido-de-prueba", "application/pdf")},
        headers=auth_headers,
    )
    assert upload.status_code == 200
    body = upload.json()
    assert body["file_name"] == "garantia.pdf"
    assert body["file_size"] == len(b"contenido-de-prueba")
    assert body["mime_type"] == "application/pdf"

    download = client.get(f"/api/documents/{document_id}/file", headers=auth_headers)
    assert download.status_code == 200
    assert download.content == b"contenido-de-prueba"
    assert "garantia.pdf" in download.headers["content-disposition"]

    removed = client.delete(f"/api/documents/{document_id}/file", headers=auth_headers)
    assert removed.status_code == 200
    assert removed.json()["file_name"] is None

    assert client.get(f"/api/documents/{document_id}/file", headers=auth_headers).status_code == 404


def test_upload_rejects_file_over_size_limit(client, auth_headers, monkeypatch):
    import app.services.document_service as document_service_module

    monkeypatch.setattr(document_service_module, "_MAX_UPLOAD_BYTES", 10)

    created = client.post("/api/documents", json={"name": "Grande", "category": "other"}, headers=auth_headers)
    document_id = created.json()["id"]

    upload = client.post(
        f"/api/documents/{document_id}/file",
        files={"file": ("grande.pdf", b"x" * 100, "application/pdf")},
        headers=auth_headers,
    )
    assert upload.status_code == 413
