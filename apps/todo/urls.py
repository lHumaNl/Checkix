from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.todo.views import TodoListViewSet, TodoItemViewSet

router = DefaultRouter()
router.register(r'', TodoListViewSet, basename='todo-list')
router.register(r'(?P<todo_list_pk>[^/.]+)/items', TodoItemViewSet, basename='todo-items')

app_name = 'todo'

urlpatterns = [
    path('', include(router.urls)),
]
