from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner_field = getattr(view, 'owner_field', 'user')
        owner = obj
        for field in owner_field.split('.'):
            owner = getattr(owner, field, None)
            if owner is None:
                return False
        return owner == request.user


class IsGroupOwnerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        group_pk = view.kwargs.get('group_pk')
        if group_pk:
            from .models import Group
            try:
                group = Group.objects.get(pk=group_pk)
            except Group.DoesNotExist:
                return True
            return group.memberships.filter(
                user=request.user,
                role='owner'
            ).exists()
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if hasattr(obj, 'group'):
            return obj.group.memberships.filter(
                user=request.user,
                role='owner'
            ).exists()
        return obj.memberships.filter(
            user=request.user,
            role='owner'
        ).exists()


class IsGroupMember(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.members.filter(id=request.user.id).exists()


class IsProfileOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user
