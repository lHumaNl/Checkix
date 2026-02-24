import pytest
from rest_framework import status

from tests.factories import UserFactory, TodoListFactory, TodoItemFactory


@pytest.mark.django_db
class TestTodoListViewSet:
    def test_list_todos(self, authenticated_client, user):
        TodoListFactory.create_batch(3, user=user)
        response = authenticated_client.get("/api/v1/todos/")
        assert response.status_code == status.HTTP_200_OK

    def test_create_todo(self, authenticated_client, user):
        response = authenticated_client.post(
            "/api/v1/todos/",
            {"name": "Shopping List"},
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Shopping List"

    def test_update_todo(self, authenticated_client, user):
        todo = TodoListFactory(user=user)
        response = authenticated_client.patch(
            f"/api/v1/todos/{todo.id}/",
            {"name": "Updated"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK

    def test_delete_todo(self, authenticated_client, user):
        todo = TodoListFactory(user=user)
        response = authenticated_client.delete(f"/api/v1/todos/{todo.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_list_excludes_other_users(self, authenticated_client, user):
        TodoListFactory.create_batch(2, user=user)
        other = UserFactory()
        TodoListFactory.create_batch(3, user=other)
        response = authenticated_client.get("/api/v1/todos/")
        data = response.data
        count = data["count"] if isinstance(data, dict) else len(data)
        assert count == 2
