import pytest

@pytest.mark.asyncio
async def test_register_user(async_client):
    response = await async_client.post("/auth/register", json={
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "securepassword123",
    })
    assert response.status_code == 201
    assert response.json()["username"] == "testuser"

@pytest.mark.asyncio
async def test_login_user(async_client):
    # Спочатку зареєструємо користувача
    await async_client.post("/auth/register", json={
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "securepassword123",
    })
    # Тестуємо логін
    response = await async_client.post("/auth/login", json={
        "username": "testuser",
        "password": "securepassword123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
