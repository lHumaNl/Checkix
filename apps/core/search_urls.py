from django.urls import path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.tags.models import Tag
from apps.folders.models import Folder
from apps.checklists.models import ChecklistTemplate
from apps.todo.models import TodoList


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="global_search",
        description="Search across all resources",
        parameters=[
            OpenApiParameter(name="q", description="Search query", required=True, type=str),
            OpenApiParameter(name="type", description="Filter by resource type", required=False, type=str),
        ],
    )
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        resource_type = request.query_params.get("type", "all")
        user = request.user

        if not query:
            return Response({"results": {}})

        results = {}

        if resource_type in ["all", "tags"]:
            tags = Tag.objects.filter(name__icontains=query, user=user)
            results["tags"] = [{"id": t.id, "name": t.name} for t in tags[:10]]

        if resource_type in ["all", "folders"]:
            folders = Folder.objects.filter(name__icontains=query, user=user)
            results["folders"] = [{"id": f.id, "name": f.name} for f in folders[:10]]

        if resource_type in ["all", "checklists"]:
            checklists = ChecklistTemplate.objects.filter(
                name__icontains=query, user=user, is_deleted=False
            )
            results["checklists"] = [
                {"id": c.id, "name": c.name, "description": c.description}
                for c in checklists[:10]
            ]

        if resource_type in ["all", "todos"]:
            todos = TodoList.objects.filter(name__icontains=query, user=user, is_deleted=False)
            results["todos"] = [
                {"id": t.id, "name": t.name, "status": t.status}
                for t in todos[:10]
            ]

        return Response({"results": results})


app_name = "search"

urlpatterns = [
    path("", GlobalSearchView.as_view(), name="global-search"),
]
