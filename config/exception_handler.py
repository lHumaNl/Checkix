from rest_framework.views import exception_handler as drf_exception_handler


def custom_exception_handler(exc, context):
    response = drf_exception_handler(exc, context)

    if response is not None:
        # Standardize error format to always use {"detail": ...}
        if isinstance(response.data, dict):
            if 'error' in response.data and 'detail' not in response.data:
                response.data['detail'] = response.data.pop('error')
        elif isinstance(response.data, list):
            response.data = {'detail': response.data}

    return response
