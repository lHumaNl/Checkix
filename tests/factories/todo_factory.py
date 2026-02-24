import factory
from factory.django import DjangoModelFactory

from apps.todo.models import TodoList, TodoItem
from tests.factories.user_factory import UserFactory


class TodoListFactory(DjangoModelFactory):
    class Meta:
        model = TodoList

    name = factory.Sequence(lambda n: f"Todo List {n}")
    description = factory.Faker("paragraph")
    user = factory.SubFactory(UserFactory)
    status = "active"
    priority = "medium"
    icon = "list"
    is_favorite = False

    @factory.post_generation
    def tags(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for tag in extracted:
                self.tags.add(tag)


class TodoItemFactory(DjangoModelFactory):
    class Meta:
        model = TodoItem

    todo_list = factory.SubFactory(TodoListFactory)
    title = factory.Sequence(lambda n: f"Todo Item {n}")
    description = factory.Faker("sentence")
    status = "pending"
    order = factory.Sequence(lambda n: n)
    priority = "medium"
