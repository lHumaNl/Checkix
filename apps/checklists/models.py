from django.core.exceptions import ValidationError
from django.db import models
from django.conf import settings
from mptt.models import MPTTModel, TreeForeignKey

from apps.core.models import TimestampedModel, SoftDeleteModel


class ChecklistTemplate(TimestampedModel, SoftDeleteModel):
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='checklist_templates'
    )
    folder = models.ForeignKey(
        'folders.Folder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='checklist_templates'
    )
    tags = models.ManyToManyField(
        'tags.Tag',
        blank=True,
        related_name='checklist_templates'
    )
    current_version = models.ForeignKey(
        'ChecklistVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_for_template'
    )
    sequential_mode = models.BooleanField(default=False)
    icon = models.CharField(max_length=50, blank=True)
    is_favorite = models.BooleanField(default=False, db_index=True)
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('archived', 'Archived'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft', db_index=True)
    category = models.CharField(max_length=100, blank=True)
    estimated_duration = models.DurationField(null=True, blank=True)

    class Meta:
        db_table = 'checklist_templates'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def create_new_version(self, changelog=''):
        latest_version = self.versions.order_by('-version_number').first()
        new_version_number = (latest_version.version_number + 1) if latest_version else 1
        
        new_version = ChecklistVersion.objects.create(
            template=self,
            version_number=new_version_number,
            changelog=changelog,
            is_active=False
        )
        
        if latest_version:
            for item in latest_version.items.all():
                item.copy_to_version(new_version)
        
        return new_version

    def set_active_version(self, version):
        self.versions.filter(is_active=True).update(is_active=False)
        version.is_active = True
        version.save()
        self.current_version = version
        self.save()

    @property
    def versions_count(self):
        if hasattr(self, '_versions_count'):
            return self._versions_count
        return self.versions.count()

    @property
    def items_count(self):
        if hasattr(self, '_items_count'):
            return self._items_count
        if self.current_version:
            return self.current_version.items.filter(parent__isnull=True).count()
        return 0


class ChecklistVersion(TimestampedModel):
    template = models.ForeignKey(
        ChecklistTemplate,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField()
    changelog = models.TextField(blank=True)
    is_active = models.BooleanField(default=False)

    class Meta:
        db_table = 'checklist_versions'
        unique_together = ['template', 'version_number']
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.template.name} v{self.version_number}"

    @property
    def items_count(self):
        return self.items.count()


class Placeholder(TimestampedModel):
    TYPE_CHOICES = [
        ('dropdown', 'Dropdown'),
        ('text', 'Text Input'),
        ('date', 'Date Picker'),
        ('number', 'Number Input'),
        ('checkbox', 'Checkbox'),
    ]

    name = models.CharField(max_length=100)
    placeholder_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    is_required = models.BooleanField(default=True)
    default_value = models.CharField(max_length=200, blank=True)
    version = models.ForeignKey(
        ChecklistVersion,
        on_delete=models.CASCADE,
        related_name='placeholders',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'checklist_placeholders'

    def __str__(self):
        return f"{self.name} ({self.get_placeholder_type_display()})"

    def copy_to_version(self, new_version):
        new_placeholder = Placeholder.objects.create(
            name=self.name,
            placeholder_type=self.placeholder_type,
            is_required=self.is_required,
            default_value=self.default_value,
            version=new_version
        )
        for option in self.options.all():
            PlaceholderOption.objects.create(
                placeholder=new_placeholder,
                value=option.value,
                display_text=option.display_text,
                order=option.order
            )
        return new_placeholder


class PlaceholderOption(TimestampedModel):
    placeholder = models.ForeignKey(
        Placeholder,
        on_delete=models.CASCADE,
        related_name='options'
    )
    value = models.CharField(max_length=200)
    display_text = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'checklist_placeholder_options'
        ordering = ['order']

    def __str__(self):
        return f"{self.display_text} ({self.value})"


class ChecklistItem(MPTTModel, TimestampedModel):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    version = models.ForeignKey(
        ChecklistVersion,
        on_delete=models.CASCADE,
        related_name='items'
    )
    parent = TreeForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    placeholder = models.ForeignKey(
        Placeholder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='items'
    )
    is_halt = models.BooleanField(default=False)
    halt_message = models.CharField(max_length=500, blank=True)

    class Meta:
        db_table = 'checklist_items'

    class MPTTMeta:
        order_insertion_by = ['order', 'title']

    def __str__(self):
        return self.title

    def clean(self):
        if self.parent_id and self.pk:
            if self.parent_id == self.pk:
                raise ValidationError('An item cannot be its own parent.')

    def copy_to_version(self, new_version, parent=None):
        new_item = ChecklistItem.objects.create(
            version=new_version,
            parent=parent,
            title=self.title,
            description=self.description,
            order=self.order,
            is_required=self.is_required,
            priority=self.priority,
            placeholder=self.placeholder,
            is_halt=self.is_halt,
            halt_message=self.halt_message
        )
        for child in self.children.all():
            child.copy_to_version(new_version, new_item)
        return new_item

    @property
    def depth(self):
        return self.level

    def get_all_children(self):
        return list(self.get_descendants())
