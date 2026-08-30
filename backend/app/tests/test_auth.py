def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_success(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin.rajesh@landrecords.gov.in", "password": "demo123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"
    assert data["email"] == "admin.rajesh@landrecords.gov.in"


def test_login_invalid_password(client):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin.rajesh@landrecords.gov.in", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_get_me(client, admin_token):
    response = client.get("/api/v1/auth/me", headers=admin_token)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin.rajesh@landrecords.gov.in"
    assert data["role_code"] == "ADMIN"
    assert len(data["permissions"]) > 0


def test_get_roles(client, admin_token):
    response = client.get("/api/v1/auth/roles", headers=admin_token)
    assert response.status_code == 200
    roles = response.json()
    assert len(roles) >= 4
    codes = [r["code"] for r in roles]
    assert "ADMIN" in codes
    assert "VERIFIER" in codes
    assert "DATA_OPERATOR" in codes


def test_list_users_as_admin(client, admin_token):
    response = client.get("/api/v1/auth/users", headers=admin_token)
    assert response.status_code == 200
    users = response.json()
    assert len(users) >= 3


def test_create_user_as_admin(client, admin_token):
    roles_res = client.get("/api/v1/auth/roles", headers=admin_token)
    operator_role = next(r for r in roles_res.json() if r["code"] == "DATA_OPERATOR")

    response = client.post(
        "/api/v1/auth/users",
        headers=admin_token,
        json={
            "email": "new.operator@landrecords.gov.in",
            "password": "securepassword123",
            "full_name": "Suresh Kumar",
            "role_id": operator_role["id"],
            "department": "Tehsil Indore",
            "designation": "Data Entry Operator"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new.operator@landrecords.gov.in"
    assert data["full_name"] == "Suresh Kumar"


def test_logout(client, admin_token):
    response = client.post("/api/v1/auth/logout", headers=admin_token)
    assert response.status_code == 200
    assert response.json()["success"] is True
