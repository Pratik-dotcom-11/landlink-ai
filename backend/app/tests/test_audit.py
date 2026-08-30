def test_list_audit_logs(client, admin_token):
    response = client.get("/api/v1/audit/logs", headers=admin_token)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1


def test_get_single_audit_log(client, admin_token):
    list_res = client.get("/api/v1/audit/logs", headers=admin_token)
    log_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/audit/logs/{log_id}", headers=admin_token)
    assert response.status_code == 200
    log = response.json()
    assert log["id"] == log_id
    assert "event_type" in log
    assert "action_summary" in log
