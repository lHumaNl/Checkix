from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse, HttpResponseRedirect
from django.conf import settings
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from apps.webhooks.urls import events_urlpatterns
from apps.stats.views import dashboard_stats, dashboard_chart_completion, dashboard_heatmap, dashboard_activities


def health_check(request):
    return JsonResponse({"status": "healthy", "service": "checkix"})


def root_redirect(request):
    return HttpResponseRedirect("/api/docs/")


urlpatterns = [
    path("", root_redirect),
    path("admin/", admin.site.urls),
    path("health/", health_check, name="health_check"),
    path("api/v1/auth/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("api/v1/users/", include("apps.users.urls")),
    path("api/v1/tags/", include("apps.tags.urls")),
    path("api/v1/folders/", include("apps.folders.urls")),
    path("api/v1/checklists/", include("apps.checklists.urls")),
    path("api/v1/checklist-instances/", include("apps.checklist_instances.urls")),
    path("api/v1/todos/", include("apps.todo.urls")),
    path("api/v1/calendar/", include("apps.calendar.urls")),
    path("api/v1/assignments/", include("apps.assignments.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/webhooks/", include("apps.webhooks.urls")),
    path("api/v1/webhook-events/", include(events_urlpatterns)),
    path("api/v1/audit/", include("apps.audit.urls")),
    path("api/v1/run-links/", include("apps.run_links.urls")),
    path("api/v1/community/", include("apps.community.urls")),
    path("api/v1/dashboard/stats/", dashboard_stats, name="dashboard-stats"),
    path("api/v1/dashboard/chart/completion/", dashboard_chart_completion, name="dashboard-chart-completion"),
    path("api/v1/dashboard/heatmap/", dashboard_heatmap, name="dashboard-heatmap"),
    path("api/v1/dashboard/activities/", dashboard_activities, name="dashboard-activities"),
    path("api/v1/stats/", include("apps.stats.urls")),
    path("api/v1/ldap/", include("apps.ldap.urls")),
    path("api/v1/search/", include("apps.core.search_urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    import debug_toolbar
    urlpatterns = [
        path("__debug__/", include(debug_toolbar.urls)),
    ] + urlpatterns
