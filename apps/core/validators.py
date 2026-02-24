import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


def validate_phone_number(value):
    """
    Validate phone number format (supports international format).
    """
    pattern = r'^\+?1?\d{9,15}$'
    if not re.match(pattern, value):
        raise ValidationError(
            _('Enter a valid phone number (e.g., +1234567890).'),
            code='invalid_phone_number'
        )


def validate_strong_password(value):
    """
    Validate that password meets strength requirements.
    """
    if len(value) < 8:
        raise ValidationError(
            _('Password must be at least 8 characters long.'),
            code='password_too_short'
        )
    if not re.search(r'[A-Z]', value):
        raise ValidationError(
            _('Password must contain at least one uppercase letter.'),
            code='password_no_uppercase'
        )
    if not re.search(r'[a-z]', value):
        raise ValidationError(
            _('Password must contain at least one lowercase letter.'),
            code='password_no_lowercase'
        )
    if not re.search(r'\d', value):
        raise ValidationError(
            _('Password must contain at least one digit.'),
            code='password_no_digit'
        )
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
        raise ValidationError(
            _('Password must contain at least one special character.'),
            code='password_no_special'
        )


def validate_no_special_characters(value):
    """
    Validate that string contains only alphanumeric characters and spaces.
    """
    if not re.match(r'^[a-zA-Z0-9\s]+$', value):
        raise ValidationError(
            _('This field can only contain letters, numbers, and spaces.'),
            code='invalid_characters'
        )


def validate_file_size(max_size_mb):
    """
    Factory function to create file size validator.
    """
    def validator(value):
        if value.size > max_size_mb * 1024 * 1024:
            raise ValidationError(
                _('File size cannot exceed %(max_size)s MB.'),
                code='file_too_large',
                params={'max_size': max_size_mb}
            )
    return validator


def validate_file_extension(allowed_extensions):
    """
    Factory function to create file extension validator.
    """
    def validator(value):
        ext = value.name.split('.')[-1].lower()
        if ext not in [e.lower() for e in allowed_extensions]:
            raise ValidationError(
                _('File type not allowed. Allowed types: %(allowed_types)s'),
                code='invalid_file_type',
                params={'allowed_types': ', '.join(allowed_extensions)}
            )
    return validator


def validate_future_date(value):
    """
    Validate that date is in the future.
    """
    from django.utils import timezone
    if value <= timezone.now():
        raise ValidationError(
            _('Date must be in the future.'),
            code='date_not_future'
        )


def validate_past_date(value):
    """
    Validate that date is in the past.
    """
    from django.utils import timezone
    if value >= timezone.now():
        raise ValidationError(
            _('Date must be in the past.'),
            code='date_not_past'
        )


def validate_positive_number(value):
    """
    Validate that number is positive.
    """
    if value <= 0:
        raise ValidationError(
            _('Value must be a positive number.'),
            code='not_positive'
        )


def validate_non_negative_number(value):
    """
    Validate that number is non-negative.
    """
    if value < 0:
        raise ValidationError(
            _('Value cannot be negative.'),
            code='negative_value'
        )
