from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse

from apps.tags.models import Tag
from apps.tags.serializers import (
    TagSerializer,
    TagCreateSerializer,
    TagUpdateSerializer,
    TagMinimalSerializer
)
from apps.tags.filters import TagFilter


@extend_schema_view(
    list=extend_schema(
        summary='List all tags',
        description='Retrieve a list of all tags for the authenticated user',
        tags=['Tags']
    ),
    retrieve=extend_schema(
        summary='Retrieve a tag',
        description='Get details of a specific tag',
        tags=['Tags']
    ),
    create=extend_schema(
        summary='Create a tag',
        description='Create a new tag',
        tags=['Tags']
    ),
    update=extend_schema(
        summary='Update a tag',
        description='Update an existing tag',
        tags=['Tags']
    ),
    partial_update=extend_schema(
        summary='Partially update a tag',
        description='Partially update an existing tag',
        tags=['Tags']
    ),
    destroy=extend_schema(
        summary='Delete a tag',
        description='Delete a tag',
        tags=['Tags']
    ),
)
class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    filterset_class = TagFilter
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['name']

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return TagCreateSerializer
        if self.action in ['update', 'partial_update']:
            return TagUpdateSerializer
        if self.action == 'list':
            return TagMinimalSerializer
        return TagSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(
        summary='Get tag statistics',
        description='Get statistics about tags usage',
        responses={200: OpenApiResponse(description='Tag statistics')},
        tags=['Tags']
    )
    @action(detail=False, methods=['get'])
    def stats(self, request):
        queryset = self.get_queryset()
        total_tags = queryset.count()
        tags_with_description = queryset.exclude(description='').count()
        colors = list(queryset.values_list('color', flat=True).distinct())

        return Response({
            'total_tags': total_tags,
            'tags_with_description': tags_with_description,
            'tags_without_description': total_tags - tags_with_description,
            'unique_colors': len(colors),
            'colors_used': colors,
        })

    @extend_schema(
        summary='Bulk create tags',
        description='Create multiple tags at once',
        request=TagCreateSerializer(many=True),
        responses={201: TagSerializer(many=True)},
        tags=['Tags']
    )
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        serializer = TagCreateSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        tags = []
        for item in serializer.validated_data:
            tag, created = Tag.objects.get_or_create(
                name=item['name'],
                user=request.user,
                defaults=item
            )
            tags.append(tag)

        output_serializer = TagSerializer(tags, many=True)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary='Bulk delete tags',
        description='Delete multiple tags at once',
        request={'type': 'object', 'properties': {'ids': {'type': 'array', 'items': {'type': 'string'}}}},
        responses={204: OpenApiResponse(description='Tags deleted successfully')},
        tags=['Tags']
    )
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        ids = request.data.get('ids', [])
        if not ids:
            return Response(
                {'error': 'No tag IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        deleted_count, _ = self.get_queryset().filter(id__in=ids).delete()
        return Response({'deleted_count': deleted_count}, status=status.HTTP_204_NO_CONTENT)
