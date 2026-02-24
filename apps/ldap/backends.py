import logging
import ldap
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone
from django_auth_ldap.backend import LDAPBackend as _LDAPBackend

from apps.ldap.models import LDAPSyncLog

logger = logging.getLogger(__name__)
User = get_user_model()


class LDAPBackend(_LDAPBackend):
    """
    Extended LDAP backend with additional features.
    Uses django-auth-ldap under the hood.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = super().authenticate(request, username=username, password=password, **kwargs)
            if user:
                self._update_user_profile(user)
            return user
        except Exception as e:
            logger.error(f"LDAP authentication error for {username}: {e}")
            return None

    def _update_user_profile(self, user):
        try:
            from apps.users.models import UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            
            if hasattr(user, 'ldap_user') and user.ldap_user:
                dn = user.ldap_user.dn
                if dn:
                    profile.ldap_dn = dn
                
                attrs = user.ldap_user.attributes
                if 'employeeID' in attrs:
                    profile.employee_id = str(attrs['employeeID'][0])
                if 'department' in attrs:
                    profile.department = str(attrs['department'][0])
            
            profile.save()
        except Exception as e:
            logger.warning(f"Failed to update profile for {user.username}: {e}")


class LDAPFallbackBackend(_LDAPBackend):
    """
    LDAP backend that falls back to Django's ModelBackend.
    """
    
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = super().authenticate(request, username=username, password=password, **kwargs)
        except Exception:
            user = None

        if user is None:
            try:
                from django.contrib.auth.backends import ModelBackend
                backend = ModelBackend()
                user = backend.authenticate(request, username=username, password=password, **kwargs)
            except Exception:
                pass
        
        if user:
            self._update_user_profile(user)
        
        return user

    def _update_user_profile(self, user):
        try:
            from apps.users.models import UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.save()
        except Exception:
            pass


class LDAPService:
    """
    Service for LDAP synchronization and management.
    """
    
    @classmethod
    def test_connection(cls) -> dict:
        """
        Test LDAP server connection.
        """
        result = {
            'success': False,
            'server_reachable': False,
            'bind_successful': False,
            'base_dn_accessible': False,
            'user_count': None,
            'group_count': None,
            'error_message': None,
        }
        
        try:
            ldap_config = getattr(settings, 'AUTH_LDAP_SERVER_URI', None)
            if not ldap_config:
                result['error_message'] = 'LDAP not configured'
                return result
            
            conn = ldap.initialize(ldap_config)
            result['server_reachable'] = True
            
            bind_dn = getattr(settings, 'AUTH_LDAP_BIND_DN', '')
            bind_password = getattr(settings, 'AUTH_LDAP_BIND_PASSWORD', '')
            
            if bind_dn:
                conn.simple_bind_s(bind_dn, bind_password)
            else:
                conn.simple_bind_s('', '')
            
            result['bind_successful'] = True
            
            base_dn = cls._get_search_dn('user')
            if base_dn:
                result['base_dn_accessible'] = True
                
                try:
                    user_filter = getattr(settings, 'AUTH_LDAP_USER_SEARCH', None)
                    if user_filter:
                        filter_str = user_filter.filterstr if hasattr(user_filter, 'filterstr') else '(objectClass=*)'
                    else:
                        filter_str = '(objectClass=person)'
                    
                    result_user = conn.search_s(base_dn, ldap.SCOPE_SUBTREE, filter_str, ['dn'])
                    result['user_count'] = len(result_user)
                except Exception:
                    pass
                
                try:
                    group_dn = cls._get_search_dn('group')
                    if group_dn:
                        group_filter = getattr(settings, 'AUTH_LDAP_GROUP_SEARCH', None)
                        if group_filter:
                            filter_str = group_filter.filterstr if hasattr(group_filter, 'filterstr') else '(objectClass=group)'
                        else:
                            filter_str = '(objectClass=group)'
                        
                        result_group = conn.search_s(group_dn, ldap.SCOPE_SUBTREE, filter_str, ['dn'])
                        result['group_count'] = len(result_group)
                except Exception:
                    pass
            
            conn.unbind_s()
            result['success'] = True
            
        except ldap.SERVER_DOWN:
            result['error_message'] = 'LDAP server is not reachable'
        except ldap.INVALID_CREDENTIALS:
            result['error_message'] = 'Invalid LDAP bind credentials'
        except Exception as e:
            result['error_message'] = str(e)
        
        return result
    
    @classmethod
    def _get_search_dn(cls, search_type: str) -> str:
        """
        Get the search DN from settings.
        """
        if search_type == 'user':
            search = getattr(settings, 'AUTH_LDAP_USER_SEARCH', None)
        else:
            search = getattr(settings, 'AUTH_LDAP_GROUP_SEARCH', None)
        
        if search and hasattr(search, 'base_dn'):
            return search.base_dn
        return None
    
    @classmethod
    def sync_users(cls) -> dict:
        """
        Sync all users from LDAP.
        """
        sync_log = LDAPSyncLog.objects.create(
            status='success',
            started_at=timezone.now()
        )
        
        result = {
            'success': False,
            'users_synced': 0,
            'users_created': 0,
            'users_updated': 0,
            'error_message': None,
        }
        
        try:
            ldap_config = getattr(settings, 'AUTH_LDAP_SERVER_URI', None)
            if not ldap_config:
                result['error_message'] = 'LDAP not configured'
                sync_log.status = 'failed'
                sync_log.error_message = result['error_message']
                sync_log.completed_at = timezone.now()
                sync_log.save()
                return result
            
            conn = ldap.initialize(ldap_config)
            
            bind_dn = getattr(settings, 'AUTH_LDAP_BIND_DN', '')
            bind_password = getattr(settings, 'AUTH_LDAP_BIND_PASSWORD', '')
            
            if bind_dn:
                conn.simple_bind_s(bind_dn, bind_password)
            else:
                conn.simple_bind_s('', '')
            
            base_dn = cls._get_search_dn('user')
            user_filter = getattr(settings, 'AUTH_LDAP_USER_SEARCH', None)
            
            if user_filter and hasattr(user_filter, 'filterstr'):
                filter_str = user_filter.filterstr
            else:
                filter_str = '(objectClass=person)'
            
            user_attr_map = getattr(settings, 'AUTH_LDAP_USER_ATTR_MAP', {})
            attrs = list(user_attr_map.values()) + ['dn']
            
            search_result = conn.search_s(base_dn, ldap.SCOPE_SUBTREE, filter_str, attrs)
            
            for dn, attrs_dict in search_result:
                try:
                    username_attr = user_attr_map.get('username', 'uid')
                    username = attrs_dict.get(username_attr, [b''])[0]
                    if isinstance(username, bytes):
                        username = username.decode('utf-8')
                    
                    if not username:
                        continue
                    
                    user, created = User.objects.get_or_create(
                        username=username,
                        defaults={
                            'email': cls._get_attr(attrs_dict, user_attr_map.get('email', 'mail')),
                            'first_name': cls._get_attr(attrs_dict, user_attr_map.get('first_name', 'givenName')),
                            'last_name': cls._get_attr(attrs_dict, user_attr_map.get('last_name', 'sn')),
                        }
                    )
                    
                    if created:
                        result['users_created'] += 1
                    else:
                        changed = False
                        email = cls._get_attr(attrs_dict, user_attr_map.get('email', 'mail'))
                        first_name = cls._get_attr(attrs_dict, user_attr_map.get('first_name', 'givenName'))
                        last_name = cls._get_attr(attrs_dict, user_attr_map.get('last_name', 'sn'))
                        
                        if email and user.email != email:
                            user.email = email
                            changed = True
                        if first_name and user.first_name != first_name:
                            user.first_name = first_name
                            changed = True
                        if last_name and user.last_name != last_name:
                            user.last_name = last_name
                            changed = True
                        
                        if changed:
                            user.save()
                            result['users_updated'] += 1
                    
                    result['users_synced'] += 1
                    
                except Exception as e:
                    logger.warning(f"Error syncing LDAP user {dn}: {e}")
            
            conn.unbind_s()
            result['success'] = True
            
        except Exception as e:
            result['error_message'] = str(e)
            sync_log.status = 'failed'
            logger.error(f"LDAP sync error: {e}")
        
        sync_log.users_synced = result['users_synced']
        sync_log.users_created = result['users_created']
        sync_log.users_updated = result['users_updated']
        sync_log.error_message = result['error_message'] or ''
        sync_log.completed_at = timezone.now()
        sync_log.save()
        
        return result
    
    @classmethod
    def _get_attr(cls, attrs_dict: dict, attr_name: str) -> str:
        """
        Get attribute value from LDAP attributes dict.
        """
        if not attr_name:
            return ''
        value = attrs_dict.get(attr_name, [b''])[0]
        if isinstance(value, bytes):
            return value.decode('utf-8')
        return value
    
    @classmethod
    def get_stats(cls) -> dict:
        """
        Get LDAP sync statistics.
        """
        total_syncs = LDAPSyncLog.objects.count()
        successful_syncs = LDAPSyncLog.objects.filter(status='success').count()
        failed_syncs = LDAPSyncLog.objects.filter(status='failed').count()
        
        last_sync = LDAPSyncLog.objects.first()
        
        return {
            'configured': bool(getattr(settings, 'AUTH_LDAP_SERVER_URI', None)),
            'total_syncs': total_syncs,
            'successful_syncs': successful_syncs,
            'failed_syncs': failed_syncs,
            'success_rate': round(successful_syncs / total_syncs * 100, 2) if total_syncs > 0 else 0,
            'last_sync_at': last_sync.started_at if last_sync else None,
            'last_sync_status': last_sync.status if last_sync else None,
        }
