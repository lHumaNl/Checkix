from rest_framework import status
from rest_framework.exceptions import APIException


class ChecklistVersionError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Checklist version error.'
    default_code = 'checklist_version_error'


class ChecklistItemError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Checklist item error.'
    default_code = 'checklist_item_error'


class ChecklistTemplateError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Checklist template error.'
    default_code = 'checklist_template_error'


class DuplicateVersionError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Version number already exists.'
    default_code = 'duplicate_version'


class InvalidVersionTransitionError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid version transition.'
    default_code = 'invalid_version_transition'


class PlaceholderValidationError(APIException):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Placeholder validation error.'
    default_code = 'placeholder_validation_error'


class CircularReferenceError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Circular reference detected.'
    default_code = 'circular_reference'


class ChecklistNotFoundError(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Checklist not found.'
    default_code = 'checklist_not_found'


class VersionNotFoundError(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Version not found.'
    default_code = 'version_not_found'


class ItemNotFoundError(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Checklist item not found.'
    default_code = 'item_not_found'
