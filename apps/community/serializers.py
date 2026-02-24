from rest_framework import serializers

from apps.core.serializers import BaseModelSerializer
from apps.community.models import CommunityTemplate, TemplateRating


class TemplateRatingSerializer(BaseModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    community_template_name = serializers.CharField(source='community_template.name', read_only=True)

    class Meta:
        model = TemplateRating
        fields = [
            'id', 'community_template', 'community_template_name', 'user', 'user_email',
            'rating', 'comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class TemplateRatingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateRating
        fields = ['rating', 'comment']
        extra_kwargs = {
            'comment': {'required': False, 'allow_blank': True},
        }


class CommunityTemplateSerializer(BaseModelSerializer):
    checklist_template_id = serializers.PrimaryKeyRelatedField(read_only=True)
    author_email = serializers.EmailField(source='author.email', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rating_count = serializers.ReadOnlyField()

    class Meta:
        model = CommunityTemplate
        fields = [
            'id', 'checklist_template', 'checklist_template_id', 'author', 'author_email',
            'name', 'description', 'category', 'category_display', 'status', 'status_display',
            'tags', 'download_count', 'rating', 'rating_count', 'is_featured',
            'published_at', 'approved_by', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'author', 'status', 'download_count', 'rating', 'rating_count',
            'is_featured', 'published_at', 'approved_by', 'created_at', 'updated_at'
        ]


class CommunityTemplateListSerializer(serializers.ModelSerializer):
    author_email = serializers.EmailField(source='author.email', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    rating_count = serializers.ReadOnlyField()

    class Meta:
        model = CommunityTemplate
        fields = [
            'id', 'name', 'description', 'category', 'category_display',
            'tags', 'download_count', 'rating', 'rating_count', 'is_featured',
            'author_email', 'published_at', 'created_at'
        ]


class CommunityTemplateCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityTemplate
        fields = ['checklist_template', 'name', 'description', 'category', 'tags']
        extra_kwargs = {
            'description': {'required': True},
            'category': {'required': True},
            'tags': {'required': False, 'default': list},
        }


class CommunityTemplateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityTemplate
        fields = ['name', 'description', 'category', 'tags']
        extra_kwargs = {
            'name': {'required': False},
            'description': {'required': False},
            'category': {'required': False},
            'tags': {'required': False},
        }


class CommunityTemplateMinimalSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = CommunityTemplate
        fields = ['id', 'name', 'category', 'category_display', 'rating', 'download_count']


class CommunityTemplateApproveSerializer(serializers.Serializer):
    pass


class CommunityTemplateRejectSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class CommunityStatsSerializer(serializers.Serializer):
    total_templates = serializers.IntegerField()
    approved_templates = serializers.IntegerField()
    pending_templates = serializers.IntegerField()
    featured_templates = serializers.IntegerField()
    total_downloads = serializers.IntegerField()
    categories = serializers.DictField()
    top_rated = serializers.ListField()
    most_downloaded = serializers.ListField()
