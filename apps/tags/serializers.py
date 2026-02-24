from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field

from apps.core.serializers import BaseModelSerializer
from apps.tags.models import Tag


class TagSerializer(BaseModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Tag
        fields = ['id', 'name', 'color', 'user_id', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'user_id']


class TagCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['name', 'color', 'description']


class TagUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['name', 'color', 'description']
        extra_kwargs = {
            'name': {'required': False},
            'color': {'required': False},
            'description': {'required': False},
        }


class TagMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name', 'color']
