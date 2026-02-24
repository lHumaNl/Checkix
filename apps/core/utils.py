import uuid
import hashlib
import secrets
import string
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from django.utils import timezone
from django.utils.text import slugify


def generate_uuid() -> str:
    """Generate a UUID4 string."""
    return str(uuid.uuid4())


def generate_short_code(length: int = 8) -> str:
    """Generate a random short code."""
    chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


def generate_numeric_code(length: int = 6) -> str:
    """Generate a random numeric code (e.g., for OTP)."""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_unique_slug(text: str, model_class, field_name: str = 'slug') -> str:
    """Generate a unique slug for a model."""
    base_slug = slugify(text)
    slug = base_slug
    counter = 1

    while model_class.objects.filter(**{field_name: slug}).exists():
        slug = f'{base_slug}-{counter}'
        counter += 1

    return slug


def hash_string(value: str, algorithm: str = 'sha256') -> str:
    """Hash a string using the specified algorithm."""
    hasher = hashlib.new(algorithm)
    hasher.update(value.encode('utf-8'))
    return hasher.hexdigest()


def mask_email(email: str) -> str:
    """Mask email address for display."""
    if '@' not in email:
        return email
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        masked_local = local[0] + '*' * (len(local) - 1)
    else:
        masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
    return f'{masked_local}@{domain}'


def mask_phone(phone: str) -> str:
    """Mask phone number for display."""
    if len(phone) <= 4:
        return phone
    return '*' * (len(phone) - 4) + phone[-4:]


def get_client_ip(request) -> str:
    """Extract client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def get_user_agent(request) -> str:
    """Extract user agent from request."""
    return request.META.get('HTTP_USER_AGENT', '')


def chunks(lst: List[Any], size: int) -> List[List[Any]]:
    """Split a list into chunks of specified size."""
    return [lst[i:i + size] for i in range(0, len(lst), size)]


def flatten_dict(d: Dict[str, Any], parent_key: str = '', sep: str = '.') -> Dict[str, Any]:
    """Flatten a nested dictionary."""
    items = []
    for k, v in d.items():
        new_key = f'{parent_key}{sep}{k}' if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def date_range(start_date: datetime, end_date: datetime) -> List[datetime]:
    """Generate a list of dates between start and end."""
    delta = end_date - start_date
    return [start_date + timedelta(days=i) for i in range(delta.days + 1)]


def humanize_file_size(size_bytes: int) -> str:
    """Convert bytes to human-readable format."""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024:
            return f'{size_bytes:.2f} {unit}'
        size_bytes /= 1024
    return f'{size_bytes:.2f} PB'


def truncate_string(text: str, max_length: int = 100, suffix: str = '...') -> str:
    """Truncate string to max length with suffix."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def build_absolute_uri(request, path: str) -> str:
    """Build absolute URI from request and path."""
    return request.build_absolute_uri(path)


class Singleton:
    """Thread-safe singleton pattern implementation."""
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
