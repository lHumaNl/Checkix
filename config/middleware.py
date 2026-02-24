from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def get_user_from_ticket(ticket_str):
    """Validate a one-time WS ticket from the cache and return the user."""
    from django.core.cache import cache
    from django.contrib.auth import get_user_model
    User = get_user_model()

    cache_key = f'ws_ticket:{ticket_str}'
    user_id = cache.get(cache_key)
    if user_id:
        cache.delete(cache_key)  # One-time use — consume immediately
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            pass
    return AnonymousUser()


@database_sync_to_async
def get_user_from_token(token_str):
    """Validate a JWT access token and return the user."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        token = AccessToken(token_str)
        return User.objects.get(id=token['user_id'])
    except Exception:
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Authenticate WebSocket connections via a short-lived ticket or JWT token.

    Preferred: obtain a ticket from GET /api/v1/users/ws-ticket/ and pass
    it as ?ticket=<uuid>. The ticket is valid for 60 seconds and consumed
    on first use, so it never appears in subsequent requests or logs.

    Fallback: pass the JWT access token as ?token=<jwt>. This is less secure
    because the token may appear in server logs and browser history.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)

        ticket = params.get('ticket', [None])[0]
        token = params.get('token', [None])[0]

        if ticket:
            scope['user'] = await get_user_from_ticket(ticket)
        elif token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
