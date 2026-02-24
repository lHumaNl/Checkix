from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import GroupMembershipViewSet, GroupViewSet, UserMeView, ws_ticket

router = DefaultRouter()
router.register(r'groups', GroupViewSet, basename='group')

app_name = 'users'

urlpatterns = [
    path('me/', UserMeView.as_view(), name='me'),
    path('ws-ticket/', ws_ticket, name='ws-ticket'),
    path('', include(router.urls)),
    path(
        'groups/<int:group_pk>/memberships/',
        GroupMembershipViewSet.as_view({'get': 'list', 'post': 'create'}),
        name='group-memberships-list'
    ),
    path(
        'groups/<int:group_pk>/memberships/<int:pk>/',
        GroupMembershipViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update',
            'delete': 'destroy'
        }),
        name='group-memberships-detail'
    ),
]
