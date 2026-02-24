import pytest
from rest_framework import status

from tests.factories import (
    UserFactory,
    GroupFactory,
    GroupMembershipFactory,
    ChecklistTemplateFactory,
    ChecklistItemFactory,
    ChecklistInstanceFactory,
    AssignmentFactory,
)


@pytest.mark.django_db
class TestAssignmentViewSet:
    def test_list_assignments(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        AssignmentFactory.create_batch(3, user=user, checklist_template=template, assignee_user=user)
        
        response = authenticated_client.get('/api/v1/assignments/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_list_assignments_user_isolation(self, authenticated_client, user):
        other_user = UserFactory()
        template1 = ChecklistTemplateFactory(user=user)
        template2 = ChecklistTemplateFactory(user=other_user)
        AssignmentFactory.create_batch(2, user=user, checklist_template=template1, assignee_user=user)
        AssignmentFactory.create_batch(3, user=other_user, checklist_template=template2, assignee_user=other_user)
        
        response = authenticated_client.get('/api/v1/assignments/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2

    def test_create_assignment_template(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        assignee = UserFactory()
        
        response = authenticated_client.post(
            '/api/v1/assignments/',
            {
                'assignment_type': 'template',
                'checklist_template': template.id,
                'assignee_type': 'user',
                'assignee_user': assignee.id,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_assignment_item(self, authenticated_client, user):
        item = ChecklistItemFactory()
        assignee = UserFactory()
        
        response = authenticated_client.post(
            '/api/v1/assignments/',
            {
                'assignment_type': 'item',
                'checklist_item': item.id,
                'assignee_type': 'user',
                'assignee_user': assignee.id,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_assignment_group(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        group = GroupFactory()
        
        response = authenticated_client.post(
            '/api/v1/assignments/',
            {
                'assignment_type': 'template',
                'checklist_template': template.id,
                'assignee_type': 'group',
                'assignee_group': group.id,
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_assignment_requires_template_for_template_type(self, authenticated_client, user):
        response = authenticated_client.post(
            '/api/v1/assignments/',
            {
                'assignment_type': 'template',
                'assignee_type': 'user',
            },
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_retrieve_assignment(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        assignment = AssignmentFactory(user=user, checklist_template=template, assignee_user=user)
        
        response = authenticated_client.get(f'/api/v1/assignments/{assignment.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert int(response.data['id']) == assignment.id

    def test_update_assignment(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        assignment = AssignmentFactory(user=user, checklist_template=template, assignee_user=user)
        
        response = authenticated_client.patch(
            f'/api/v1/assignments/{assignment.id}/',
            {'is_exclusive': True},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_exclusive'] is True

    def test_delete_assignment(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        assignment = AssignmentFactory(user=user, checklist_template=template, assignee_user=user)
        
        response = authenticated_client.delete(f'/api/v1/assignments/{assignment.id}/')
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_by_template_action(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        AssignmentFactory.create_batch(2, user=user, checklist_template=template, assignee_user=user)
        
        response = authenticated_client.get(f'/api/v1/assignments/by_template/?template_id={template.id}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_by_template_requires_template_id(self, authenticated_client, user):
        response = authenticated_client.get('/api/v1/assignments/by_template/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_by_instance_action(self, authenticated_client, user):
        instance = ChecklistInstanceFactory(user=user)
        AssignmentFactory.create_batch(2, user=user, checklist_instance=instance, assignment_type='runtime', assignee_user=user)
        
        response = authenticated_client.get(f'/api/v1/assignments/by_instance/?instance_id={instance.id}')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2

    def test_by_user_action(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        direct_assignment = AssignmentFactory(
            user=user,
            checklist_template=template,
            assignee_type='user',
            assignee_user=user,
        )
        
        group = GroupFactory()
        GroupMembershipFactory(user=user, group=group)
        group_assignment = AssignmentFactory(
            user=user,
            checklist_template=template,
            assignee_type='group',
            assignee_group=group,
        )
        
        response = authenticated_client.get('/api/v1/assignments/by_user/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['direct']) == 1
        assert len(response.data['group']) == 1

    def test_stats_action(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        AssignmentFactory.create_batch(3, user=user, checklist_template=template, assignee_user=user)
        
        response = authenticated_client.get('/api/v1/assignments/stats/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['total'] == 3

    def test_bulk_create(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        assignee = UserFactory()
        
        response = authenticated_client.post(
            '/api/v1/assignments/bulk_create/',
            {
                'assignments': [
                    {
                        'assignment_type': 'template',
                        'checklist_template': template.id,
                        'assignee_type': 'user',
                        'assignee_user': assignee.id,
                    },
                    {
                        'assignment_type': 'template',
                        'checklist_template': template.id,
                        'assignee_type': 'user',
                        'assignee_user': assignee.id,
                    },
                ]
            },
            format='json',
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data) == 2

    def test_bulk_delete(self, authenticated_client, user):
        template = ChecklistTemplateFactory(user=user)
        assignments = AssignmentFactory.create_batch(3, checklist_template=template, assignee_user=user)
        ids = [a.id for a in assignments]
        
        response = authenticated_client.post(
            '/api/v1/assignments/bulk_delete/',
            {'ids': ids},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['deleted_count'] == 3

    def test_cannot_access_other_users_assignment(self, authenticated_client, user):
        other_user = UserFactory()
        template = ChecklistTemplateFactory(user=other_user)
        assignment = AssignmentFactory(checklist_template=template, assignee_user=other_user)
        
        response = authenticated_client.get(f'/api/v1/assignments/{assignment.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
