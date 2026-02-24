from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.ldap.views import LDAPSyncLogViewSet, LDAPManagementViewSet

router = DefaultRouter()
router.register(r'logs', LDAPSyncLogViewSet, basename='ldap-log')
router.register(r'manage', LDAPManagementViewSet, basename='ldap-manage')

app_name = 'ldap'

urlpatterns = [
    path('', include(router.urls)),
]
