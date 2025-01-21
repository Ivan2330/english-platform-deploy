import pytest

@pytest.mark.asyncio
async def test_create_student(async_client):
    response = await async_client.post("/students/", json={
        "name": "John Doe",
        "email": "johndoe@example.com",
        "classroom_id": 1,
    })
    assert response.status_code == 201
    assert response.json()["name"] == "John Doe"

@pytest.mark.asyncio
async def test_get_student(async_client):
    await async_client.post("/students/", json={
        "name": "John Doe",
        "email": "johndoe@example.com",
        "classroom_id": 1,
    })
    response = await async_client.get("/students/1")
    assert response.status_code == 200
    assert response.json()["name"] == "John Doe"
