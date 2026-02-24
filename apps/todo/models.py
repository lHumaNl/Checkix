from django.db import models
from django.conf import settings

from apps.core.models import TimestampedModel, SoftDeleteModel


class TodoList(TimestampedModel, SoftDeleteModel):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='todo_lists'
    )
    folder = models.ForeignKey(
        'folders.Folder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='todos'
    )
    tags = models.ManyToManyField(
        'tags.Tag',
        blank=True,
        related_name='todo_lists'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    icon = models.CharField(max_length=50, blank=True)
    is_favorite = models.BooleanField(default=False)

    class Meta:
        db_table = 'todo_lists'
        ordering = ['-is_favorite', '-created_at']

    def __str__(self):
        return self.name

    @property
    def items_count(self):
        if hasattr(self, '_items_count'):
            return self._items_count
        return self.items.count()

    @property
    def completed_items_count(self):
        if hasattr(self, '_completed_items_count'):
            return self._completed_items_count
        return self.items.filter(status='completed').count()

    @property
    def progress_percentage(self):
        total = self.items_count
        if total == 0:
            return 0
        return round((self.completed_items_count / total) * 100)

    def complete(self):
        from django.utils import timezone
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()

    def cancel(self):
        self.status = 'cancelled'
        self.save()

    def reopen(self):
        self.status = 'active'
        self.completed_at = None
        self.save()


class TodoItem(TimestampedModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    todo_list = models.ForeignKey(
        TodoList,
        on_delete=models.CASCADE,
        related_name='items'
    )
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    order = models.PositiveIntegerField(default=0)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )

    class Meta:
        db_table = 'todo_items'
        ordering = ['order', 'created_at']

    def __str__(self):
        return self.title

    def complete(self):
        from django.utils import timezone
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()

    def uncomplete(self):
        self.status = 'pending'
        self.completed_at = None
        self.save()

    def cancel(self):
        self.status = 'cancelled'
        self.save()

    def get_ancestors(self):
        ancestors = []
        item = self.parent
        while item:
            ancestors.append(item)
            item = item.parent
        return ancestors

    def get_descendants(self):
        descendants = []
        for child in self.children.all():
            descendants.append(child)
            descendants.extend(child.get_descendants())
        return descendants

    @property
    def is_completed(self):
        return self.status == 'completed'
