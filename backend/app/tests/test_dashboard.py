def test_get_dashboard_summary(client, admin_token):
    response = client.get("/api/v1/dashboard/summary", headers=admin_token)
    assert response.status_code == 200
    data = response.json()
    assert "total_documents" in data
    assert "processed_documents" in data
    assert "average_ocr_confidence" in data
    assert "active_verifiers_count" in data


def test_get_district_progress(client, admin_token):
    response = client.get("/api/v1/dashboard/district-progress", headers=admin_token)
    assert response.status_code == 200
    districts = response.json()
    assert len(districts) >= 1
    assert "district_name" in districts[0]


def test_get_accuracy_by_language(client, admin_token):
    response = client.get("/api/v1/dashboard/accuracy-by-language", headers=admin_token)
    assert response.status_code == 200
    languages = response.json()
    assert len(languages) >= 3
    langs = [l["language"] for l in languages]
    assert "Hindi" in langs
    assert "Marathi" in langs


def test_get_timeline_trend(client, admin_token):
    response = client.get("/api/v1/dashboard/timeline-trend", headers=admin_token)
    assert response.status_code == 200
    trends = response.json()
    assert len(trends) >= 5
