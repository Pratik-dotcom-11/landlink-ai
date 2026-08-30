def test_get_validation_rules(client, verifier_token):
    response = client.get("/api/v1/validation/rules", headers=verifier_token)
    assert response.status_code == 200
    rules = response.json()
    assert len(rules) >= 4
    codes = [r["code"] for r in rules]
    assert "VAL-AREA-SUM" in codes
    assert "VAL-KHASRA-FMT" in codes
    assert "VAL-CONF-THRESH" in codes


def test_get_record_validation_results(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    rec_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/validation/records/{rec_id}/results", headers=verifier_token)
    assert response.status_code == 200
    data = response.json()
    assert data["record_id"] == rec_id
    assert data["total_rules_evaluated"] >= 4
    assert "results" in data


def test_re_run_validation_rules(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    rec_id = list_res.json()["items"][0]["id"]

    response = client.post(f"/api/v1/validation/records/{rec_id}/run", headers=verifier_token)
    assert response.status_code == 200
    data = response.json()
    assert data["record_id"] == rec_id
    assert len(data["results"]) >= 4
