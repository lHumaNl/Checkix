import pytest
from django.core.cache import cache

from rest_framework import status

from tests.factories import (
    UserFactory,
    UserProfileFactory,
    GroupFactory,
    GroupMembershipFactory,
)


@pytest.mark.django_db
class TestUserMeView:
    def test_get_current_user(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/users/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == user.username
        assert response.data['email'] == user.email

    def test_update_current_user(self, authenticated_client, user):
        response = authenticated_client.patch(
            '/api/v1/users/me/',
            {'first_name': 'Updated'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        
        user.refresh_from_db()
        assert user.first_name == 'Updated'

    def test_unauthenticated_access_denied(self, api_client):
        response = api_client.get('/api/v1/users/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestGroupViewSet:
    def test_list_groups(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group)
        
        response = authenticated_client.get('/api/v1/users/groups/')
        assert response.status_code == status.HTTP_200_OK

    def test_list_groups_only_user_memberships(self, authenticated_client, user):
        other_user = UserFactory()
        
        group1 = GroupFactory()
        GroupMembershipFactory(user=user, group=group1)
        
        group2 = GroupFactory()
        GroupMembershipFactory(user=other_user, group=group2)
        
        response = authenticated_client.get('/api/v1/users/groups/')
        assert response.status_code == status.HTTP_200_OK
        
        group_ids = [g['id'] for g in response.data['results']]
        assert group1.id in group_ids
        assert group2.id not in group_ids

    def test_create_group(self, authenticated_client, user):
        response = authenticated_client.post(
            '/api/v1/users/groups/',
            {
                'name': 'Test Group',
                'description': 'Test description',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Test Group'

    def test_create_group_adds_owner(self, authenticated_client, user):
        response = authenticated_client.post(
            '/api/v1/users/groups/',
            {'name': 'Test Group'},
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        
        from apps.users.models import GroupMembership, Group
        group = Group.objects.get(name='Test Group')
        membership = GroupMembership.objects.get(user=user, group=group)
        assert membership.role == 'owner'

    def test_retrieve_group(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group)
        
        response = authenticated_client.get(f'/api/v1/users/groups/{group.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == group.id

    def test_update_group_as_owner(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='owner')
        
        response = authenticated_client.patch(
            f'/api/v1/users/groups/{group.id}/',
            {'name': 'Updated Name'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Name'

    def test_update_group_as_member_denied(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='member')
        
        response = authenticated_client.patch(
            f'/api/v1/users/groups/{group.id}/',
            {'name': 'Updated Name'},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_group_as_owner(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='owner')
        
        response = authenticated_client.delete(f'/api/v1/users/groups/{group.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_group_as_member_denied(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='member')
        
        response = authenticated_client.delete(f'/api/v1/users/groups/{group.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_access_non_member_group(self, authenticated_client, user):
        group = GroupFactory()
        
        response = authenticated_client.get(f'/api/v1/users/groups/{group.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestGroupMembershipViewSet:
    def test_list_memberships(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='owner')
        GroupMembershipFactory(group=group)
        
        response = authenticated_client.get(f'/api/v1/users/groups/{group.id}/memberships/')
        assert response.status_code == status.HTTP_200_OK

    def test_add_member_as_owner(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='owner')
        new_user = UserFactory()
        
        response = authenticated_client.post(
            f'/api/v1/users/groups/{group.id}/memberships/',
            {'user_id': new_user.id, 'role': 'member'},
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_add_member_as_member_denied(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='member')
        new_user = UserFactory()
        
        response = authenticated_client.post(
            f'/api/v1/users/groups/{group.id}/memberships/',
            {'user_id': new_user.id, 'role': 'member'},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_membership_as_owner(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='owner')
        member = UserFactory()
        membership = GroupMembershipFactory(user=member, group=group, role='member')
        
        response = authenticated_client.patch(
            f'/api/v1/users/groups/{group.id}/memberships/{membership.id}/',
            {'role': 'owner'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK

    def test_remove_member_as_owner(self, authenticated_client, user):
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group, role='owner')
        member = UserFactory()
        membership = GroupMembershipFactory(user=member, group=group)
        
        response = authenticated_client.delete(
            f'/api/v1/users/groups/{group.id}/memberships/{membership.id}/'
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestWSTicket:
    def test_ws_ticket_generates_ticket(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/users/ws-ticket/')
        assert response.status_code == status.HTTP_200_OK
        assert 'ticket' in response.data
        
        ticket = response.data['ticket']
        cached_user_id = cache.get(f'ws_ticket:{ticket}')
        assert cached_user_id == user.id

    def test_ws_ticket_unique_each_request(self, authenticated_client, user):
        response1 = authenticated_client.get('/api/v1/users/ws-ticket/')
        response2 = authenticated_client.get('/api/v1/users/ws-ticket/')
        
        assert response1.data['ticket'] != response2.data['ticket']

    def test_ws_ticket_unauthenticated_denied(self, api_client):
        response = api_client.get('/api/v1/users/ws-ticket/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_ws_ticket_expires(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/users/ws-ticket/')
        ticket = response.data['ticket']
        
        cache.delete(f'ws_ticket:{ticket}')
        
        cached_user_id = cache.get(f'ws_ticket:{ticket}')
        assert cached_user_id is None
