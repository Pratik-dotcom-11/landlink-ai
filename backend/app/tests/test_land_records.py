def test_list_land_records(client, verifier_token):
    response = client.get("/api/v1/records", headers=verifier_token)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


def test_get_land_record_detail(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    rec_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/records/{rec_id}", headers=verifier_token)
    assert response.status_code == 200
    record = response.json()
    assert record["id"] == rec_id
    assert "khasra_number" in record
    assert "primary_owner_name" in record
    assert "fields" in record
    assert "validation_results_summary" in record


def test_update_land_record(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    rec_id = list_res.json()["items"][0]["id"]

    response = client.put(
        f"/api/v1/records/{rec_id}",
        headers=verifier_token,
        json={
            "primary_owner_name": "रामेश्वर प्रसाद शर्मा (Rameshwar Prasad Sharma)",
            "total_area_hectares": 2.5000
        }
    )
    assert response.status_code == 200
    updated = response.json()
    assert "Sharma" in updated["primary_owner_name"]
    assert updated["total_area_hectares"] == 2.5000


def test_get_record_fields_and_edit(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    items = list_res.json()["items"]
    assert len(items) >= 1
    
    rec_id = items[0]["id"]
    fields = []
    for it in items:
        fields_res = client.get(f"/api/v1/records/{it['id']}/fields", headers=verifier_token)
        f_data = fields_res.json()
        if len(f_data) >= 1:
            rec_id = it["id"]
            fields = f_data
            break

    assert len(fields) >= 1
    field_id = fields[0]["id"]

    # Manual field edit
    edit_res = client.put(
        f"/api/v1/records/{rec_id}/fields/{field_id}",
        headers=verifier_token,
        json={
            "edited_value": "Rameshwar Prasad Sharma",
            "verification_notes": "Added lineage surname from stamp endorsement"
        }
    )
    assert edit_res.status_code == 200
    f_updated = edit_res.json()
    assert f_updated["edited_value"] == "Rameshwar Prasad Sharma"
    assert f_updated["is_manually_edited"] is True


def test_export_land_record_json_and_geojson(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    rec_id = list_res.json()["items"][0]["id"]

    # JSON export
    res_json = client.get(f"/api/v1/records/{rec_id}/export?format=json", headers=verifier_token)
    assert res_json.status_code == 200
    assert "cadastral_jurisdiction" in res_json.json()

    # GeoJSON export
    res_geojson = client.get(f"/api/v1/records/{rec_id}/export?format=geojson", headers=verifier_token)
    assert res_geojson.status_code == 200
    assert res_geojson.json()["type"] == "Feature"
