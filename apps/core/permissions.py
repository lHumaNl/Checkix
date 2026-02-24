from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Permission to only allow owners of an object to access it.
    Assumes the model instance has an `owner` or `user` attribute.
    """

    def has_object_permission(self, request, view, obj):
        owner_field = getattr(obj, 'owner', None) or getattr(obj, 'user', None)
        if owner_field is None:
            return False
        return owner_field == request.user


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission to allow read access to all but write access only to owner.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner_field = getattr(obj, 'owner', None) or getattr(obj, 'user', None)
        if owner_field is None:
            return False
        return owner_field == request.user


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Permission to allow read access to all but write access only to authenticated users.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission to allow read access to all but write access only to admin users.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class IsSuperUser(permissions.BasePermission):
    """
    Permission to only allow superusers.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class IsVerified(permissions.BasePermission):
    """
    Permission to only allow verified users.
    Assumes the user model has an `is_verified` attribute.
    """

    def has_permission(self, request, view):
        return request.user and getattr(request.user, 'is_verified', False)
