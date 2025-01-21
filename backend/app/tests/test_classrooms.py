import pytest

@pytest.mark.asyncio
async def test_create_classroom(async_client):
    response = await async_client.post("/classrooms/", json={
        "name": "Math Class",
        "type": "group",
        "teacher_id": 1,
    })
    assert response.status_code == 201
    assert response.json()["name"] == "Math Class"

@pytest.mark.asyncio
async def test_get_classroom(async_client):
    await async_client.post("/classrooms/", json={
        "name": "Math Class",
        "type": "group",
        "teacher_id": 1,
    })
    response = await async_client.get("/classrooms/1")
    assert response.status_code == 200
    assert response.json()["name"] == "Math Class"
