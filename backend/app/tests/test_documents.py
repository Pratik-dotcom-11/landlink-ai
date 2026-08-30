import io


def test_list_documents(client, operator_token):
    response = client.get("/api/v1/documents", headers=operator_token)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] >= 1
    assert len(data["items"]) >= 1


def test_get_document_detail(client, operator_token):
    list_res = client.get("/api/v1/documents", headers=operator_token)
    doc_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/documents/{doc_id}", headers=operator_token)
    assert response.status_code == 200
    doc = response.json()
    assert doc["id"] == doc_id
    assert "original_filename" in doc
    assert "document_unique_code" in doc


def test_get_document_raw(client, operator_token):
    list_res = client.get("/api/v1/documents", headers=operator_token)
    doc_id = list_res.json()["items"][0]["id"]

    response = client.get(f"/api/v1/documents/{doc_id}/raw")
    assert response.status_code == 200


def test_upload_document(client, operator_token):
    dummy_svg = b"""<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="blue"/></svg>"""
    file_payload = ("test_khasra_upload.svg", io.BytesIO(dummy_svg), "image/svg+xml")

    response = client.post(
        "/api/v1/documents/upload",
        headers=operator_token,
        files={"file": file_payload},
        data={
            "state_code": "MP",
            "state_name": "Madhya Pradesh",
            "district_name": "Indore",
            "tehsil_name": "Indore",
            "village_name": "Sanwer",
            "primary_language": "Hindi",
            "script_type": "Devanagari",
            "auto_trigger_ocr": "true"
        }
    )
    assert response.status_code == 201
    doc = response.json()
    assert doc["state_name"] == "Madhya Pradesh"
    assert doc["district_name"] == "Indore"
    assert doc["land_record_id"] is not None


def test_process_document(client, operator_token):
    list_res = client.get("/api/v1/documents", headers=operator_token)
    doc_id = list_res.json()["items"][0]["id"]

    response = client.post(f"/api/v1/documents/{doc_id}/process", headers=operator_token)
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_batch_process_documents(client, operator_token):
    list_res = client.get("/api/v1/documents", headers=operator_token)
    doc_ids = [d["id"] for d in list_res.json()["items"][:2]]

    response = client.post(
        "/api/v1/documents/batch-process",
        headers=operator_token,
        json={"document_ids": doc_ids}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["queued_count"] >= 1
