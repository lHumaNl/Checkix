from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.checklists.views import (
    ChecklistTemplateViewSet,
    ChecklistVersionViewSet,
    ChecklistItemViewSet
)

router = DefaultRouter()
router.register(r'', ChecklistTemplateViewSet, basename='checklist-template')

templates_router = DefaultRouter()
templates_router.register(
    r'(?P<template_pk>[^/.]+)/versions',
    ChecklistVersionViewSet,
    basename='checklist-version'
)
templates_router.register(
    r'(?P<template_pk>[^/.]+)/versions/(?P<version_pk>[^/.]+)/items',
    ChecklistItemViewSet,
    basename='checklist-item'
)

app_name = 'checklists'

urlpatterns = [
    path('', include(router.urls)),
    path('', include(templates_router.urls)),
]
