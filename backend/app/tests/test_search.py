def test_search_cadastral_records(client, verifier_token):
    response = client.get("/api/v1/search/cadastral?query=Rameshwar", headers=verifier_token)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
    assert any("Rameshwar" in (it["primary_owner_name"] or "") or "रामेश्वर" in (it["primary_owner_name"] or "") or "Rameshwar" in (it["owner_name_transliterated"] or "") for it in data["items"])


def test_search_by_khasra(client, verifier_token):
    response = client.get("/api/v1/search/cadastral?khasra_number=142", headers=verifier_token)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


def test_search_by_district(client, verifier_token):
    response = client.get("/api/v1/search/cadastral?district_name=Sehore", headers=verifier_token)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1


def test_get_search_facets(client, verifier_token):
    response = client.get("/api/v1/search/facets", headers=verifier_token)
    assert response.status_code == 200
    facets = response.json()
    assert "states" in facets
    assert "districts" in facets
    assert "record_types" in facets
