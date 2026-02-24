import pytest
from rest_framework import status

from tests.factories import (
    UserFactory,
    GroupFactory,
    GroupMembershipFactory,
    ChecklistTemplateFactory,
    CommunityTemplateFactory,
    TemplateRatingFactory,
)


@pytest.mark.django_db
class TestCommunityTemplateViewSet:
    def test_list_community_templates(self, authenticated_client, user):
        CommunityTemplateFactory.create_batch(3, status='approved')
        
        response = authenticated_client.get('/api/v1/community/templates/')
        assert response.status_code == status.HTTP_200_OK

    def test_create_community_template(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        
        response = authenticated_client.post(
            '/api/v1/community/templates/',
            {
                'checklist_template': template.id,
                'name': 'Community Template',
                'description': 'Test description',
                'category': 'general',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Community Template'

    def test_create_sets_author(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        
        response = authenticated_client.post(
            '/api/v1/community/templates/',
            {
                'checklist_template': template.id,
                'name': 'Community Template',
                'description': 'Test',
                'category': 'general',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_update_own_template(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        community = CommunityTemplateFactory(checklist_template=template, author=user)
        
        response = authenticated_client.patch(
            f'/api/v1/community/templates/{community.id}/',
            {'name': 'Updated Name'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Updated Name'

    def test_cannot_update_other_users_template(self, authenticated_client, user):
        other_user = UserFactory()
        community = CommunityTemplateFactory(author=other_user)
        
        response = authenticated_client.patch(
            f'/api/v1/community/templates/{community.id}/',
            {'name': 'Updated Name'},
            format='json',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_own_template(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        community = CommunityTemplateFactory(checklist_template=template, author=user)
        
        response = authenticated_client.delete(f'/api/v1/community/templates/{community.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_cannot_delete_other_users_template(self, authenticated_client, user):
        other_user = UserFactory()
        community = CommunityTemplateFactory(author=other_user)
        
        response = authenticated_client.delete(f'/api/v1/community/templates/{community.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_download_approved_template(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='approved', download_count=0)
        
        response = authenticated_client.post(f'/api/v1/community/templates/{community.id}/download/')
        assert response.status_code == status.HTTP_201_CREATED
        
        community.refresh_from_db()
        assert community.download_count == 1

    def test_download_unapproved_template_fails(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='pending')
        
        response = authenticated_client.post(f'/api/v1/community/templates/{community.id}/download/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_approve_template_admin_only(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='pending')
        
        response = authenticated_client.post(f'/api/v1/community/templates/{community.id}/approve/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_approve_template_as_admin(self, admin_client, admin_user):
        community = CommunityTemplateFactory(status='pending')
        
        response = admin_client.post(f'/api/v1/community/templates/{community.id}/approve/')
        assert response.status_code == status.HTTP_200_OK
        
        community.refresh_from_db()
        assert community.status == 'approved'
        assert community.approved_by == admin_user

    def test_reject_template_admin_only(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='pending')
        
        response = authenticated_client.post(f'/api/v1/community/templates/{community.id}/reject/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_reject_template_as_admin(self, admin_client, admin_user):
        community = CommunityTemplateFactory(status='pending')
        
        response = admin_client.post(f'/api/v1/community/templates/{community.id}/reject/')
        assert response.status_code == status.HTTP_200_OK
        
        community.refresh_from_db()
        assert community.status == 'rejected'

    def test_feature_template_admin_only(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='approved')
        
        response = authenticated_client.post(
            f'/api/v1/community/templates/{community.id}/feature/',
            {'featured': True},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_feature_template_as_admin(self, admin_client, admin_user):
        community = CommunityTemplateFactory(status='approved', is_featured=False)
        
        response = admin_client.post(
            f'/api/v1/community/templates/{community.id}/feature/',
            {'featured': True},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        
        community.refresh_from_db()
        assert community.is_featured is True

    def test_rate_template(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='approved')
        
        response = authenticated_client.post(
            f'/api/v1/community/templates/{community.id}/rate/',
            {'rating': 5, 'comment': 'Great template!'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK

    def test_rate_unapproved_template_fails(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='pending')
        
        response = authenticated_client.post(
            f'/api/v1/community/templates/{community.id}/rate/',
            {'rating': 5},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_get_template_ratings(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='approved')
        TemplateRatingFactory.create_batch(3, community_template=community)
        
        response = authenticated_client.get(f'/api/v1/community/templates/{community.id}/ratings/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3

    def test_featured_action(self, authenticated_client, user):
        CommunityTemplateFactory(status='approved', is_featured=True)
        CommunityTemplateFactory(status='approved', is_featured=False)
        
        response = authenticated_client.get('/api/v1/community/templates/featured/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_top_rated_action(self, authenticated_client, user):
        c1 = CommunityTemplateFactory(status='approved', rating=4.5, rating_count=5)
        c2 = CommunityTemplateFactory(status='approved', rating=3.5, rating_count=5)
        
        response = authenticated_client.get('/api/v1/community/templates/top_rated/')
        assert response.status_code == status.HTTP_200_OK

    def test_most_downloaded_action(self, authenticated_client, user):
        CommunityTemplateFactory(status='approved', download_count=100)
        CommunityTemplateFactory(status='approved', download_count=50)
        
        response = authenticated_client.get('/api/v1/community/templates/most_downloaded/')
        assert response.status_code == status.HTTP_200_OK

    def test_pending_action_admin_only(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/community/templates/pending/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_pending_action_as_admin(self, admin_client, admin_user):
        CommunityTemplateFactory(status='pending')
        CommunityTemplateFactory(status='approved')
        
        response = admin_client.get('/api/v1/community/templates/pending/')
        assert response.status_code == status.HTTP_200_OK

    def test_my_templates_action(self, authenticated_client, user):
        CommunityTemplateFactory.create_batch(2, author=user)
        CommunityTemplateFactory()
        
        response = authenticated_client.get('/api/v1/community/templates/my_templates/')
        assert response.status_code == status.HTTP_200_OK

    def test_stats_action(self, authenticated_client, user):
        CommunityTemplateFactory(status='approved')
        CommunityTemplateFactory(status='pending')
        
        response = authenticated_client.get('/api/v1/community/templates/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert 'total_templates' in response.data

    def test_by_category_action(self, authenticated_client, user):
        CommunityTemplateFactory(status='approved', category='devops')
        CommunityTemplateFactory(status='approved', category='qa')
        
        response = authenticated_client.get('/api/v1/community/templates/by_category/')
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestTemplateRatingViewSet:
    def test_list_ratings(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='approved')
        TemplateRatingFactory.create_batch(3, community_template=community)
        
        response = authenticated_client.get('/api/v1/community/ratings/')
        assert response.status_code == status.HTTP_200_OK

    def test_my_ratings_action(self, authenticated_client, user):
        TemplateRatingFactory.create_batch(2, user=user)
        TemplateRatingFactory()
        
        response = authenticated_client.get('/api/v1/community/ratings/my_ratings/')
        assert response.status_code == status.HTTP_200_OK

    def test_delete_my_rating(self, authenticated_client, user):
        community = CommunityTemplateFactory(status='approved')
        rating = TemplateRatingFactory(community_template=community, user=user)
        
        response = authenticated_client.delete(
            '/api/v1/community/ratings/delete_my_rating/',
            {'template_id': community.id},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK

    def test_delete_my_rating_requires_template_id(self, authenticated_client, user):
        response = authenticated_client.delete('/api/v1/community/ratings/delete_my_rating/', {})
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_other_users_rating_fails(self, authenticated_client, user):
        other_user = UserFactory()
        community = CommunityTemplateFactory(status='approved')
        TemplateRatingFactory(community_template=community, user=other_user)
        
        response = authenticated_client.delete(
            '/api/v1/community/ratings/delete_my_rating/',
            {'template_id': community.id},
            format='json',
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
