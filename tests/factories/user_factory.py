import factory
from factory.django import DjangoModelFactory
from django.contrib.auth.models import User

from apps.users.models import UserProfile, Group, GroupMembership


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.username}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True

    @classmethod
    def create_with_password(cls, password="testpass123", **kwargs):
        user = cls(**kwargs)
        user.set_password(password)
        user.save()
        return user


class UserProfileFactory(DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = factory.SubFactory(UserFactory)
    timezone = "UTC"
    language = "en"
    notification_preferences = factory.LazyFunction(lambda: {"email": True, "push": False})
    employee_id = factory.Sequence(lambda n: f"EMP{n:05d}")
    department = factory.Faker("job")


class GroupFactory(DjangoModelFactory):
    class Meta:
        model = Group

    name = factory.Sequence(lambda n: f"Group {n}")
    description = factory.Faker("sentence")


class GroupMembershipFactory(DjangoModelFactory):
    class Meta:
        model = GroupMembership

    user = factory.SubFactory(UserFactory)
    group = factory.SubFactory(GroupFactory)
    role = "member"
