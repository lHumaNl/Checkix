import uuid

from django.contrib.auth.models import User
from django.core.cache import cache
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Group, GroupMembership, UserProfile
from .permissions import IsGroupOwnerOrReadOnly, IsProfileOwner
from .serializers import (
    GroupDetailSerializer,
    GroupMembershipSerializer,
    GroupSerializer,
    GroupWriteSerializer,
    UserMeSerializer,
    UserMeUpdateSerializer,
)


@extend_schema_view(
    get=extend_schema(
        summary='Get current user',
        description='Retrieve the authenticated user profile and settings',
        responses={200: UserMeSerializer}
    ),
    put=extend_schema(
        summary='Update current user',
        description='Update the authenticated user profile and settings',
        request=UserMeUpdateSerializer,
        responses={200: UserMeSerializer}
    ),
    patch=extend_schema(
        summary='Partial update current user',
        description='Partially update the authenticated user profile and settings',
        request=UserMeUpdateSerializer,
        responses={200: UserMeSerializer}
    ),
)
class UserMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserMeSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserMeUpdateSerializer(request.user, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserMeSerializer(request.user).data)

    def patch(self, request):
        serializer = UserMeUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserMeSerializer(request.user).data)


@extend_schema_view(
    list=extend_schema(
        summary='List groups',
        description='Retrieve a list of all groups',
        parameters=[
            OpenApiParameter(
                name='search',
                description='Search by group name',
                type=str,
                required=False
            ),
        ],
        responses={200: GroupSerializer(many=True)}
    ),
    retrieve=extend_schema(
        summary='Get group details',
        description='Retrieve detailed information about a specific group',
        responses={200: GroupDetailSerializer}
    ),
    create=extend_schema(
        summary='Create group',
        description='Create a new group',
        request=GroupWriteSerializer,
        responses={201: GroupDetailSerializer}
    ),
    update=extend_schema(
        summary='Update group',
        description='Update an existing group',
        request=GroupWriteSerializer,
        responses={200: GroupDetailSerializer}
    ),
    partial_update=extend_schema(
        summary='Partial update group',
        description='Partially update an existing group',
        request=GroupWriteSerializer,
        responses={200: GroupDetailSerializer}
    ),
    destroy=extend_schema(
        summary='Delete group',
        description='Delete a group',
        responses={204: None}
    ),
)
class GroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsGroupOwnerOrReadOnly]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return Group.objects.filter(
            memberships__user=self.request.user
        ).prefetch_related('memberships__user').distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return GroupDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return GroupWriteSerializer
        return GroupSerializer

    def perform_create(self, serializer):
        group = serializer.save()
        GroupMembership.objects.create(
            user=self.request.user,
            group=group,
            role='owner'
        )


@extend_schema_view(
    list=extend_schema(
        summary='List group memberships',
        description='Retrieve all memberships for a group',
        responses={200: GroupMembershipSerializer(many=True)}
    ),
    create=extend_schema(
        summary='Add member to group',
        description='Add a new member to the group',
        request=GroupMembershipSerializer,
        responses={201: GroupMembershipSerializer}
    ),
    update=extend_schema(
        summary='Update membership',
        description='Update a group membership role',
        request=GroupMembershipSerializer,
        responses={200: GroupMembershipSerializer}
    ),
    partial_update=extend_schema(
        summary='Partial update membership',
        description='Partially update a group membership',
        request=GroupMembershipSerializer,
        responses={200: GroupMembershipSerializer}
    ),
    destroy=extend_schema(
        summary='Remove member from group',
        description='Remove a member from the group',
        responses={204: None}
    ),
)
class GroupMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = GroupMembershipSerializer
    permission_classes = [IsAuthenticated, IsGroupOwnerOrReadOnly]

    def get_queryset(self):
        return GroupMembership.objects.filter(
            group_id=self.kwargs['group_pk']
        ).select_related('user', 'group')

    def perform_create(self, serializer):
        serializer.save(group_id=self.kwargs['group_pk'])


@extend_schema(
    summary='Generate WebSocket ticket',
    description=(
        'Issue a short-lived one-time ticket (valid 60 s) for WebSocket authentication. '
        'Use ?ticket=<uuid> in the WS URL instead of exposing the JWT token in the URL.'
    ),
    responses={200: {'type': 'object', 'properties': {'ticket': {'type': 'string', 'format': 'uuid'}}}},
    tags=['Auth'],
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ws_ticket(request):
    ticket = str(uuid.uuid4())
    cache.set(f'ws_ticket:{ticket}', request.user.id, timeout=60)
    return Response({'ticket': ticket})
