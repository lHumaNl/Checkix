from django.db import models
from django.conf import settings
from django.utils import timezone

from apps.core.models import TimestampedModel


class CommunityTemplate(TimestampedModel):
    CATEGORY_CHOICES = [
        ('devops', 'DevOps'),
        ('qa', 'QA'),
        ('hr', 'HR'),
        ('finance', 'Finance'),
        ('marketing', 'Marketing'),
        ('operations', 'Operations'),
        ('compliance', 'Compliance'),
        ('general', 'General'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    checklist_template = models.OneToOneField(
        'checklists.ChecklistTemplate',
        on_delete=models.CASCADE,
        related_name='community_template'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='published_templates'
    )
    name = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    tags = models.JSONField(default=list)
    download_count = models.PositiveIntegerField(default=0)
    rating = models.FloatField(default=0.0)
    rating_count = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_templates'
    )

    class Meta:
        db_table = 'community_templates'
        ordering = ['-is_featured', '-published_at', '-created_at']
        indexes = [
            models.Index(fields=['status', 'category']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['rating']),
        ]

    def __str__(self):
        return f"{self.name} by {self.author}"

    def approve(self, approved_by_user):
        self.status = 'approved'
        self.approved_by = approved_by_user
        self.published_at = timezone.now()
        self.save()

    def reject(self):
        self.status = 'rejected'
        self.save()

    def increment_downloads(self):
        from django.db.models import F
        CommunityTemplate.objects.filter(id=self.id).update(
            download_count=F('download_count') + 1
        )
        self.refresh_from_db()

    def update_rating(self):
        from django.db.models import Avg, Count
        result = self.ratings.aggregate(avg=Avg('rating'), cnt=Count('id'))
        self.rating = result['avg'] or 0.0
        self.rating_count = result['cnt'] or 0
        self.save(update_fields=['rating', 'rating_count', 'updated_at'])


class TemplateRating(TimestampedModel):
    community_template = models.ForeignKey(
        CommunityTemplate,
        on_delete=models.CASCADE,
        related_name='ratings'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='template_ratings'
    )
    rating = models.PositiveIntegerField(choices=[(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5')])
    comment = models.TextField(blank=True)

    class Meta:
        db_table = 'community_template_ratings'
        unique_together = ['community_template', 'user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} rated {self.community_template} - {self.rating}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.community_template.update_rating()

    def delete(self, *args, **kwargs):
        template = self.community_template
        super().delete(*args, **kwargs)
        template.update_rating()
