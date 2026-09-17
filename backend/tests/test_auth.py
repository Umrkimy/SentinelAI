from fastapi.testclient import TestClient

import backend.app.services.auth_service as auth_service


def configure_test_admin(monkeypatch) -> None:
    monkeypatch.setattr(auth_service, "ADMIN_USERNAME", "admin")
    monkeypatch.setattr(
        auth_service,
        "ADMIN_PASSWORD_HASH",
        auth_service.password_hash.hash("test-password"),
    )
    monkeypatch.setattr(
        auth_service,
        "JWT_SECRET",
        "test-secret-for-local-suite-only-1234567890",
    )


def test_admin_can_log_in_and_view_profile(
    client: TestClient,
    monkeypatch,
) -> None:
    configure_test_admin(monkeypatch)

    login = client.post(
        "/auth/token",
        data={
            "username": "admin",
            "password": "test-password",
        },
    )

    assert login.status_code == 200
    token = login.json()["access_token"]

    profile = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert profile.status_code == 200
    assert profile.json() == {
        "username": "admin",
        "role": "admin",
    }


def test_login_rejects_wrong_password(
    client: TestClient,
    monkeypatch,
) -> None:
    configure_test_admin(monkeypatch)

    response = client.post(
        "/auth/token",
        data={
            "username": "admin",
            "password": "wrong-password",
        },
    )

    assert response.status_code == 401
