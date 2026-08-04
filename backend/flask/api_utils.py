from __future__ import annotations

from typing import Any

from flask import current_app, jsonify, request
from werkzeug.exceptions import HTTPException


def json_body() -> dict[str, Any]:
    """Return a JSON object body without raising on empty or malformed input."""
    body = request.get_json(silent=True)
    return body if isinstance(body, dict) else {}


def error_response(message: str, status: int):
    return jsonify({"error": message}), status


def register_error_handlers(app) -> None:
    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        return error_response(error.description, error.code or 500)

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        current_app.logger.exception("Unhandled API error", exc_info=error)
        return error_response("Wystapil nieoczekiwany blad serwera.", 500)


def log_exception(message: str, error: Exception) -> None:
    current_app.logger.exception(message, exc_info=error)
