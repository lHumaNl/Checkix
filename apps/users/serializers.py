from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Group, GroupMembership, UserProfile


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    manager = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        allow_null=True,
        required=False
    )
    manager_detail = UserSerializer(source='manager', read_only=True)

    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'timezone', 'language',
            'notification_preferences', 'ldap_dn', 'employee_id',
            'department', 'manager', 'manager_detail',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class UserProfileWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'timezone', 'language', 'notification_preferences',
            'ldap_dn', 'employee_id', 'department', 'manager'
        ]


class GroupMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        source='user',
        write_only=True
    )
    group = serializers.PrimaryKeyRelatedField(read_only=True)
    group_name = serializers.CharField(source='group.name', read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = GroupMembership
        fields = [
            'id', 'user', 'user_id', 'group', 'group_name',
            'role', 'role_display', 'joined_at'
        ]
        read_only_fields = ['id', 'group', 'joined_at']


class GroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    owner_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            'id', 'name', 'description', 'ldap_group_dn',
            'members', 'member_count', 'owner_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    @extend_schema_field(serializers.IntegerField)
    def get_member_count(self, obj):
        return obj.memberships.filter(role='member').count()

    @extend_schema_field(serializers.IntegerField)
    def get_owner_count(self, obj):
        return obj.memberships.filter(role='owner').count()


class GroupDetailSerializer(GroupSerializer):
    memberships = GroupMembershipSerializer(many=True, read_only=True)

    class Meta(GroupSerializer.Meta):
        fields = GroupSerializer.Meta.fields + ['memberships']


class GroupWriteSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        many=True,
        required=False
    )

    class Meta:
        model = Group
        fields = ['name', 'description', 'ldap_group_dn', 'members']

    def create(self, validated_data):
        members = validated_data.pop('members', [])
        group = Group.objects.create(**validated_data)
        for user in members:
            GroupMembership.objects.create(
                user=user,
                group=group,
                role='member'
            )
        return group

    def update(self, instance, validated_data):
        members = validated_data.pop('members', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if members is not None:
            existing_user_ids = set(
                instance.memberships.values_list('user_id', flat=True)
            )
            new_user_ids = {user.id for user in members}
            to_remove = existing_user_ids - new_user_ids
            to_add = new_user_ids - existing_user_ids
            owner_ids = set(
                instance.memberships.filter(role='owner').values_list('user_id', flat=True)
            )
            safe_to_remove = to_remove - owner_ids
            instance.memberships.filter(user_id__in=safe_to_remove).delete()
            for user_id in to_add:
                GroupMembership.objects.create(
                    user_id=user_id,
                    group=instance,
                    role='member'
                )
        return instance


class UserMeSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'date_joined', 'last_login', 'profile'
        ]
        read_only_fields = ['id', 'username', 'is_active', 'date_joined', 'last_login']


class UserMeUpdateSerializer(serializers.ModelSerializer):
    profile = UserProfileWriteSerializer(required=False)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'profile']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if profile_data:
            profile, _ = UserProfile.objects.get_or_create(user=instance)
            for attr, value in profile_data.items():
                setattr(profile, attr, value)
            profile.save()
        return instance
