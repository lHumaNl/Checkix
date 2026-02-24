from rest_framework import serializers


class BaseModelSerializer(serializers.ModelSerializer):
    """
    Base serializer with common fields and methods.
    """

    id = serializers.UUIDField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    class Meta:
        abstract = True


class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    """
    A ModelSerializer that takes an additional `fields` argument to
    control which fields should be displayed.
    """

    def __init__(self, *args, **kwargs):
        fields = kwargs.pop('fields', None)
        exclude_fields = kwargs.pop('exclude_fields', None)
        super().__init__(*args, **kwargs)

        if fields is not None:
            allowed = set(fields)
            existing = set(self.fields)
            for field_name in existing - allowed:
                self.fields.pop(field_name)

        if exclude_fields is not None:
            for field_name in exclude_fields:
                self.fields.pop(field_name, None)


class SoftDeleteSerializer(serializers.ModelSerializer):
    """
    Serializer for soft delete models with is_deleted field.
    """

    is_deleted = serializers.BooleanField(read_only=True)
    deleted_at = serializers.DateTimeField(read_only=True)

    class Meta:
        abstract = True


class ErrorDetailSerializer(serializers.Serializer):
    """
    Serializer for error detail responses.
    """

    code = serializers.CharField()
    message = serializers.CharField()
    details = serializers.DictField(required=False)


class PaginationSerializer(serializers.Serializer):
    """
    Serializer for pagination metadata.
    """

    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    total_pages = serializers.IntegerField()
    current_page = serializers.IntegerField()
