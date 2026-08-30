def test_list_verification_tasks(client, verifier_token):
    response = client.get("/api/v1/verification/tasks", headers=verifier_token)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
    assert "counts_by_status" in data


def test_get_verification_task_detail(client, verifier_token):
    list_res = client.get("/api/v1/verification/tasks", headers=verifier_token)
    task_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/verification/tasks/{task_id}", headers=verifier_token)
    assert response.status_code == 200
    task = response.json()
    assert task["id"] == task_id
    assert "task_code" in task


def test_claim_verification_task(client, verifier_token):
    list_res = client.get("/api/v1/verification/tasks", headers=verifier_token)
    task_id = list_res.json()["items"][0]["id"]

    response = client.post(
        f"/api/v1/verification/tasks/{task_id}/claim",
        headers=verifier_token,
        json={"notes": "Claimed for immediate audit"}
    )
    assert response.status_code == 200
    task = response.json()
    assert task["status"] == "IN_PROGRESS"
    assert task["assigned_verifier_name"] is not None


def test_save_verification_draft(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    rec_id = list_res.json()["items"][0]["id"]

    response = client.post(
        f"/api/v1/verification/records/{rec_id}/save-draft",
        headers=verifier_token,
        json={
            "verifier_notes": "Working on column 4 verification",
            "field_updates": [{"field_key": "ownerName", "value": "Rameshwar Prasad"}]
        }
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_submit_verification_approval(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    rec_id = list_res.json()["items"][0]["id"]

    response = client.post(
        f"/api/v1/verification/records/{rec_id}/submit",
        headers=verifier_token,
        json={
            "resolution_notes": "Certified against revenue scan",
            "field_corrections": [{"field_key": "ownerName", "edited_value": "Rameshwar Prasad Certified"}]
        }
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_reject_verification(client, verifier_token):
    list_res = client.get("/api/v1/records", headers=verifier_token)
    rec_id = list_res.json()["items"][0]["id"]

    response = client.post(
        f"/api/v1/verification/records/{rec_id}/reject",
        headers=verifier_token,
        json={
            "rejection_reason": "Severely degraded document scan with unreadable khasra numbers",
            "verifier_notes": "Requested fresh 600 DPI scan from tehsil office."
        }
    )
    assert response.status_code == 200
    assert response.json()["success"] is True
