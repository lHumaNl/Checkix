from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.community.models import CommunityTemplate, TemplateRating
from apps.community.serializers import (
    CommunityTemplateSerializer,
    CommunityTemplateListSerializer,
    CommunityTemplateCreateSerializer,
    CommunityTemplateUpdateSerializer,
    CommunityTemplateMinimalSerializer,
    CommunityTemplateApproveSerializer,
    CommunityTemplateRejectSerializer,
    CommunityStatsSerializer,
    TemplateRatingSerializer,
    TemplateRatingCreateSerializer,
)
from apps.community.filters import CommunityTemplateFilter, TemplateRatingFilter
from apps.community.services import CommunityService


@extend_schema_view(
    list=extend_schema(
        summary='List community templates',
        description='Retrieve a list of all approved community templates',
        tags=['Community Templates']
    ),
    retrieve=extend_schema(
        summary='Retrieve a community template',
        description='Get details of a specific community template',
        tags=['Community Templates']
    ),
    create=extend_schema(
        summary='Publish a template',
        description='Publish a checklist template to the community',
        tags=['Community Templates']
    ),
    update=extend_schema(
        summary='Update a community template',
        description='Update an existing community template',
        tags=['Community Templates']
    ),
    partial_update=extend_schema(
        summary='Partially update a community template',
        description='Partially update an existing community template',
        tags=['Community Templates']
    ),
    destroy=extend_schema(
        summary='Delete a community template',
        description='Delete a community template',
        tags=['Community Templates']
    ),
)
class CommunityTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = CommunityTemplateSerializer
    filterset_class = CommunityTemplateFilter
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'rating', 'download_count', 'published_at']
    ordering = ['-is_featured', '-rating', '-created_at']

    def get_queryset(self):
        qs = CommunityTemplate.objects.select_related(
            'author', 'checklist_template', 'approved_by'
        )
        if self.action in ['update', 'partial_update', 'destroy']:
            return qs.filter(author=self.request.user)
        return qs.all()

    def get_serializer_class(self):
        if self.action == 'create':
            return CommunityTemplateCreateSerializer
        if self.action in ['update', 'partial_update']:
            return CommunityTemplateUpdateSerializer
        if self.action == 'list':
            return CommunityTemplateListSerializer
        return CommunityTemplateSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @extend_schema(
        summary='Download a template',
        description='Copy a community template to your own templates',
        responses={201: OpenApiResponse(description='Template copied')},
        tags=['Community Templates']
    )
    @action(detail=True, methods=['post'])
    def download(self, request, pk=None):
        community_template = self.get_object()

        if community_template.status != 'approved':
            return Response(
                {'error': 'Template is not approved for download'},
                status=status.HTTP_400_BAD_REQUEST
            )

        new_template = CommunityService.download_template(
            community_template=community_template,
            user=request.user,
        )

        return Response(
            {'message': 'Template downloaded', 'template_id': str(new_template.id)},
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        summary='Approve a template',
        description='Approve a pending community template (admin only)',
        request=CommunityTemplateApproveSerializer(),
        responses={200: CommunityTemplateSerializer()},
        tags=['Community Templates']
    )
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        community_template = self.get_object()
        community_template = CommunityService.approve_template(
            community_template=community_template,
            approved_by=request.user,
        )
        serializer = self.get_serializer(community_template)
        return Response(serializer.data)

    @extend_schema(
        summary='Reject a template',
        description='Reject a pending community template (admin only)',
        request=CommunityTemplateRejectSerializer(),
        responses={200: CommunityTemplateSerializer()},
        tags=['Community Templates']
    )
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        community_template = self.get_object()
        community_template = CommunityService.reject_template(community_template)
        serializer = self.get_serializer(community_template)
        return Response(serializer.data)

    @extend_schema(
        summary='Feature a template',
        description='Toggle featured status of a template (admin only)',
        request={'type': 'object', 'properties': {'featured': {'type': 'boolean'}}},
        responses={200: CommunityTemplateSerializer()},
        tags=['Community Templates']
    )
    @action(detail=True, methods=['post'])
    def feature(self, request, pk=None):
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        community_template = self.get_object()
        featured = request.data.get('featured', True)
        community_template = CommunityService.feature_template(
            community_template=community_template,
            featured=featured,
        )
        serializer = self.get_serializer(community_template)
        return Response(serializer.data)

    @extend_schema(
        summary='Rate a template',
        description='Rate a community template',
        request=TemplateRatingCreateSerializer(),
        responses={200: TemplateRatingSerializer()},
        tags=['Community Templates']
    )
    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        community_template = self.get_object()

        if community_template.status != 'approved':
            return Response(
                {'error': 'Cannot rate unapproved template'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = TemplateRatingCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rating, created = CommunityService.rate_template(
            community_template=community_template,
            user=request.user,
            rating=serializer.validated_data['rating'],
            comment=serializer.validated_data.get('comment', ''),
        )

        output_serializer = TemplateRatingSerializer(rating)
        return Response(output_serializer.data)

    @extend_schema(
        summary='Get template ratings',
        description='Get all ratings for a community template',
        responses={200: TemplateRatingSerializer(many=True)},
        tags=['Community Templates']
    )
    @action(detail=True, methods=['get'])
    def ratings(self, request, pk=None):
        community_template = self.get_object()
        ratings = community_template.ratings.select_related('user').all()
        serializer = TemplateRatingSerializer(ratings, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get featured templates',
        description='Get all featured community templates',
        responses={200: CommunityTemplateMinimalSerializer(many=True)},
        tags=['Community Templates']
    )
    @action(detail=False, methods=['get'])
    def featured(self, request):
        templates = CommunityService.get_featured_templates()
        serializer = CommunityTemplateMinimalSerializer(templates, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get top rated templates',
        description='Get top rated community templates',
        responses={200: CommunityTemplateMinimalSerializer(many=True)},
        tags=['Community Templates']
    )
    @action(detail=False, methods=['get'])
    def top_rated(self, request):
        templates = CommunityService.get_top_rated_templates()
        serializer = CommunityTemplateMinimalSerializer(templates, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get most downloaded templates',
        description='Get most downloaded community templates',
        responses={200: CommunityTemplateMinimalSerializer(many=True)},
        tags=['Community Templates']
    )
    @action(detail=False, methods=['get'])
    def most_downloaded(self, request):
        templates = CommunityService.get_most_downloaded_templates()
        serializer = CommunityTemplateMinimalSerializer(templates, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get pending templates',
        description='Get all pending community templates (admin only)',
        responses={200: CommunityTemplateListSerializer(many=True)},
        tags=['Community Templates']
    )
    @action(detail=False, methods=['get'])
    def pending(self, request):
        if not request.user.is_staff:
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN
            )

        templates = CommunityService.get_pending_templates()
        serializer = CommunityTemplateListSerializer(templates, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get my published templates',
        description='Get all templates published by the current user',
        responses={200: CommunityTemplateListSerializer(many=True)},
        tags=['Community Templates']
    )
    @action(detail=False, methods=['get'])
    def my_templates(self, request):
        templates = CommunityService.get_user_published_templates(request.user)
        serializer = CommunityTemplateListSerializer(templates, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Get community statistics',
        description='Get overall community statistics',
        responses={200: CommunityStatsSerializer()},
        tags=['Community Templates']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        stats = CommunityService.get_community_stats()
        serializer = CommunityStatsSerializer(stats)
        return Response(serializer.data)

    @extend_schema(
        summary='Get templates by category',
        description='Get approved templates grouped by category',
        responses={200: OpenApiResponse(description='Templates by category')},
        tags=['Community Templates']
    )
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        categories = CommunityService.get_templates_by_category()
        return Response(categories)


@extend_schema_view(
    list=extend_schema(
        summary='List template ratings',
        description='Retrieve a list of template ratings',
        tags=['Template Ratings']
    ),
    retrieve=extend_schema(
        summary='Retrieve a rating',
        description='Get details of a specific rating',
        tags=['Template Ratings']
    ),
)
class TemplateRatingViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TemplateRatingSerializer
    filterset_class = TemplateRatingFilter
    ordering_fields = ['created_at', 'rating']
    ordering = ['-created_at']

    def get_queryset(self):
        return TemplateRating.objects.select_related('user', 'community_template').all()

    @extend_schema(
        summary='Get my ratings',
        description='Get all ratings by the current user',
        responses={200: TemplateRatingSerializer(many=True)},
        tags=['Template Ratings']
    )
    @action(detail=False, methods=['get'])
    def my_ratings(self, request):
        ratings = CommunityService.get_user_ratings(request.user)
        serializer = self.get_serializer(ratings, many=True)
        return Response(serializer.data)

    @extend_schema(
        summary='Delete my rating',
        description='Delete the current user\'s rating for a template',
        request={'type': 'object', 'properties': {'template_id': {'type': 'string'}}},
        responses={200: OpenApiResponse(description='Rating deleted')},
        tags=['Template Ratings']
    )
    @action(detail=False, methods=['delete'])
    def delete_my_rating(self, request):
        template_id = request.data.get('template_id')

        if not template_id:
            return Response(
                {'error': 'template_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            template = CommunityTemplate.objects.get(id=template_id)
        except CommunityTemplate.DoesNotExist:
            return Response(
                {'error': 'Template not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        deleted = CommunityService.delete_rating(
            community_template=template,
            user=request.user,
        )

        if deleted:
            return Response({'message': 'Rating deleted'})
        return Response(
            {'error': 'Rating not found'},
            status=status.HTTP_404_NOT_FOUND
        )
