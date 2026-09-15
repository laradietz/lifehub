def test_create_and_list_vehicle(client, auth_headers):
    response = client.post(
        "/api/vehicles",
        json={"brand": "Toyota", "model": "Corolla", "year": 2020, "license_plate": "AB123CD", "mileage": 30000},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["maintenance_records"] == []

    listing = client.get("/api/vehicles", headers=auth_headers)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_update_and_delete_vehicle(client, auth_headers):
    created = client.post("/api/vehicles", json={"brand": "Ford", "model": "Fiesta"}, headers=auth_headers)
    vehicle_id = created.json()["id"]

    updated = client.patch(f"/api/vehicles/{vehicle_id}", json={"mileage": 15000}, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["mileage"] == 15000

    deleted = client.delete(f"/api/vehicles/{vehicle_id}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get(f"/api/vehicles/{vehicle_id}", headers=auth_headers).status_code == 404


def test_cannot_access_another_users_vehicle(client, auth_headers):
    created = client.post("/api/vehicles", json={"brand": "Fiat", "model": "Cronos"}, headers=auth_headers)
    vehicle_id = created.json()["id"]

    client.post("/api/auth/register", json={"email": "otro-veh@example.com", "password": "supersecret123"})
    other_login = client.post("/api/auth/login", data={"username": "otro-veh@example.com", "password": "supersecret123"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.get(f"/api/vehicles/{vehicle_id}", headers=other_headers)
    assert response.status_code == 404


def test_add_maintenance_bumps_vehicle_mileage(client, auth_headers):
    created = client.post(
        "/api/vehicles", json={"brand": "VW", "model": "Gol", "mileage": 10000}, headers=auth_headers
    )
    vehicle_id = created.json()["id"]

    maintenance = client.post(
        f"/api/vehicles/{vehicle_id}/maintenance",
        json={"type": "oil_change", "date": "2026-09-10", "mileage_at_service": 12000, "cost": "50.00"},
        headers=auth_headers,
    )
    assert maintenance.status_code == 201
    maintenance_id = maintenance.json()["id"]

    vehicle = client.get(f"/api/vehicles/{vehicle_id}", headers=auth_headers).json()
    assert vehicle["mileage"] == 12000
    assert len(vehicle["maintenance_records"]) == 1

    # Un mileage_at_service menor al actual no debe hacer retroceder el odometro.
    client.post(
        f"/api/vehicles/{vehicle_id}/maintenance",
        json={"type": "tires", "date": "2026-09-12", "mileage_at_service": 11000},
        headers=auth_headers,
    )
    vehicle_after = client.get(f"/api/vehicles/{vehicle_id}", headers=auth_headers).json()
    assert vehicle_after["mileage"] == 12000

    updated = client.patch(
        f"/api/vehicles/{vehicle_id}/maintenance/{maintenance_id}",
        json={"cost": "60.00"},
        headers=auth_headers,
    )
    assert updated.status_code == 200
    assert updated.json()["cost"] == "60.00"

    deleted = client.delete(f"/api/vehicles/{vehicle_id}/maintenance/{maintenance_id}", headers=auth_headers)
    assert deleted.status_code == 204


def test_cannot_access_maintenance_of_another_users_vehicle(client, auth_headers):
    created = client.post("/api/vehicles", json={"brand": "Renault", "model": "Sandero"}, headers=auth_headers)
    vehicle_id = created.json()["id"]
    maintenance = client.post(
        f"/api/vehicles/{vehicle_id}/maintenance",
        json={"type": "service", "date": "2026-09-01"},
        headers=auth_headers,
    )
    maintenance_id = maintenance.json()["id"]

    client.post("/api/auth/register", json={"email": "otro-mant@example.com", "password": "supersecret123"})
    other_login = client.post("/api/auth/login", data={"username": "otro-mant@example.com", "password": "supersecret123"})
    other_headers = {"Authorization": f"Bearer {other_login.json()['access_token']}"}

    response = client.patch(
        f"/api/vehicles/{vehicle_id}/maintenance/{maintenance_id}", json={"cost": "1.00"}, headers=other_headers
    )
    assert response.status_code == 404
