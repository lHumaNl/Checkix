from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.core.serializers import BaseModelSerializer
from apps.folders.models import Folder


class FolderSerializer(BaseModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(read_only=True)
    parent_id = serializers.PrimaryKeyRelatedField(read_only=True)
    children = serializers.SerializerMethodField()
    depth = serializers.ReadOnlyField()
    is_root = serializers.ReadOnlyField()

    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'user_id', 'parent_id', 'icon', 'order',
            'children', 'depth', 'is_root', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_id', 'depth', 'is_root']

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        children = obj.children.all()
        serializer = FolderListSerializer(children, many=True)
        return serializer.data


class FolderListSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    depth = serializers.ReadOnlyField()

    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent_id', 'icon', 'order', 'children', 'depth']

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        children = obj.children.all()
        serializer = FolderListSerializer(children, many=True)
        return serializer.data


class FolderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ['name', 'parent', 'icon', 'order']
        extra_kwargs = {
            'parent': {'required': False, 'allow_null': True},
            'icon': {'required': False, 'allow_blank': True},
            'order': {'required': False},
        }


class FolderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ['name', 'parent', 'icon', 'order']
        extra_kwargs = {
            'name': {'required': False},
            'parent': {'required': False, 'allow_null': True},
            'icon': {'required': False, 'allow_blank': True},
            'order': {'required': False},
        }


class FolderTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ['id', 'name', 'icon', 'order', 'children']

    @extend_schema_field(serializers.ListField(child=serializers.DictField()))
    def get_children(self, obj):
        children = obj.children.all()
        serializer = FolderTreeSerializer(children, many=True)
        return serializer.data


class FolderMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ['id', 'name', 'icon']


class FolderWithPathSerializer(serializers.ModelSerializer):
    path = serializers.SerializerMethodField()

    class Meta:
        model = Folder
        fields = ['id', 'name', 'path', 'icon', 'order']

    @extend_schema_field(serializers.ListField(child=serializers.CharField()))
    def get_path(self, obj):
        ancestors = obj.get_ancestors()
        path = [folder.name for folder in reversed(ancestors)]
        path.append(obj.name)
        return path
