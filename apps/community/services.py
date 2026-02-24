from django.db import transaction
from django.utils import timezone

from apps.community.models import CommunityTemplate, TemplateRating


class CommunityService:
    @staticmethod
    @transaction.atomic
    def publish_template(checklist_template, name, description, category, tags=None, author=None):
        community_template = CommunityTemplate.objects.create(
            checklist_template=checklist_template,
            name=name,
            description=description,
            category=category,
            tags=tags or [],
            author=author,
            status='pending',
        )
        return community_template

    @staticmethod
    @transaction.atomic
    def update_template(community_template, **kwargs):
        for attr, value in kwargs.items():
            if hasattr(community_template, attr):
                setattr(community_template, attr, value)
        community_template.save()
        return community_template

    @staticmethod
    @transaction.atomic
    def delete_template(community_template):
        community_template.delete()

    @staticmethod
    @transaction.atomic
    def approve_template(community_template, approved_by):
        community_template.approve(approved_by)
        return community_template

    @staticmethod
    @transaction.atomic
    def reject_template(community_template):
        community_template.reject()
        return community_template

    @staticmethod
    @transaction.atomic
    def feature_template(community_template, featured=True):
        community_template.is_featured = featured
        community_template.save(update_fields=['is_featured', 'updated_at'])
        return community_template

    @staticmethod
    @transaction.atomic
    def rate_template(community_template, user, rating, comment=''):
        template_rating, created = TemplateRating.objects.update_or_create(
            community_template=community_template,
            user=user,
            defaults={
                'rating': rating,
                'comment': comment,
            }
        )
        return template_rating, created

    @staticmethod
    @transaction.atomic
    def delete_rating(community_template, user):
        try:
            rating = TemplateRating.objects.get(
                community_template=community_template,
                user=user,
            )
            rating.delete()
            return True
        except TemplateRating.DoesNotExist:
            return False

    @staticmethod
    def get_approved_templates(category=None, search=None):
        queryset = CommunityTemplate.objects.filter(
            status='approved'
        ).select_related('author', 'checklist_template')

        if category:
            queryset = queryset.filter(category=category)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset.order_by('-is_featured', '-rating', '-download_count')

    @staticmethod
    def get_featured_templates(limit=10):
        return CommunityTemplate.objects.filter(
            status='approved',
            is_featured=True,
        ).select_related('author', 'checklist_template')[:limit]

    @staticmethod
    def get_top_rated_templates(limit=10):
        return CommunityTemplate.objects.filter(
            status='approved',
            rating_count__gte=1,
        ).select_related('author', 'checklist_template').order_by('-rating')[:limit]

    @staticmethod
    def get_most_downloaded_templates(limit=10):
        return CommunityTemplate.objects.filter(
            status='approved',
        ).select_related('author', 'checklist_template').order_by('-download_count')[:limit]

    @staticmethod
    def get_pending_templates():
        return CommunityTemplate.objects.filter(
            status='pending'
        ).select_related('author', 'checklist_template').order_by('-created_at')

    @staticmethod
    def get_user_published_templates(user):
        return CommunityTemplate.objects.filter(
            author=user
        ).select_related('checklist_template').order_by('-created_at')

    @staticmethod
    def get_user_ratings(user):
        return TemplateRating.objects.filter(
            user=user
        ).select_related('community_template').order_by('-created_at')

    @staticmethod
    @transaction.atomic
    def download_template(community_template, user):
        community_template.increment_downloads()

        from apps.checklists.models import ChecklistTemplate, ChecklistVersion

        original_template = community_template.checklist_template

        new_template = ChecklistTemplate.objects.create(
            name=original_template.name,
            description=original_template.description,
            user=user,
            folder=None,
            sequential_mode=original_template.sequential_mode,
            icon=original_template.icon,
            estimated_duration=original_template.estimated_duration,
        )

        source_version = original_template.current_version
        if source_version:
            new_version = ChecklistVersion.objects.create(
                template=new_template,
                version_number=1,
                changelog='Downloaded from community',
                is_active=True,
            )
            for item in source_version.items.filter(parent__isnull=True):
                item.copy_to_version(new_version)
            new_template.current_version = new_version
            new_template.save(update_fields=['current_version'])

        return new_template

    @staticmethod
    def get_community_stats():
        from django.db.models import Count, Sum, Avg

        total_templates = CommunityTemplate.objects.count()
        approved_templates = CommunityTemplate.objects.filter(status='approved').count()
        pending_templates = CommunityTemplate.objects.filter(status='pending').count()
        featured_templates = CommunityTemplate.objects.filter(status='approved', is_featured=True).count()
        total_downloads = CommunityTemplate.objects.aggregate(
            total=Sum('download_count')
        )['total'] or 0

        categories = dict(
            CommunityTemplate.objects.filter(status='approved')
            .values('category')
            .annotate(count=Count('category'))
            .values_list('category', 'count')
        )

        top_rated = list(
            CommunityTemplate.objects.filter(status='approved', rating_count__gte=1)
            .order_by('-rating')
            .values('id', 'name', 'rating', 'download_count')[:5]
        )

        most_downloaded = list(
            CommunityTemplate.objects.filter(status='approved')
            .order_by('-download_count')
            .values('id', 'name', 'rating', 'download_count')[:5]
        )

        return {
            'total_templates': total_templates,
            'approved_templates': approved_templates,
            'pending_templates': pending_templates,
            'featured_templates': featured_templates,
            'total_downloads': total_downloads,
            'categories': categories,
            'top_rated': top_rated,
            'most_downloaded': most_downloaded,
        }

    @staticmethod
    def get_templates_by_category():
        from django.db.models import Count

        return dict(
            CommunityTemplate.objects.filter(status='approved')
            .values('category')
            .annotate(count=Count('category'))
            .values_list('category', 'count')
        )
