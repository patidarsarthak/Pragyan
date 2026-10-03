#!/usr/bin/env python3
"""
SIH26074 - Twilio SMS Webhook Adapter
--------------------------------------
Endpoints:
- POST /webhook/sms: Inbound SMS receiver with Twilio signature validation.

Reuses bot.core.handle_message with zero duplicated logic.
Features:
- Validates X-Twilio-Signature (bypassed when MOCK_MODE=true or header X-Mock-Mode: true)
- Plain text TwiML response (<Response><Message>...</Message></Response>)
- Enforces strict plain text, under 160 characters (max 2 segments = 320 chars), no emoji
- Keyword flow: PIN code or village name to register, FORECAST, ADVISORY, STOP
- Reads secrets strictly from environment variables
"""

import os
import hmac
import hashlib
import base64
import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, Response, Form, Header, HTTPException, status
from dotenv import load_dotenv

from backend.bot.core import handle_message

load_dotenv()
logger = logging.getLogger("SMS_Twilio")

router = APIRouter(prefix="/webhook", tags=["SMS Bot & IVR"])

def get_auth_token() -> str:
    """Read secret dynamically from env only."""
    return os.getenv("TWILIO_AUTH_TOKEN", "")


def is_mock_mode(request: Optional[Request] = None) -> bool:
    """Checks if mock mode is active via env or request header."""
    env_mock = os.getenv("MOCK_MODE", "").lower() in ["1", "true", "yes"] or \
               os.getenv("TWILIO_MOCK_MODE", "").lower() in ["1", "true", "yes"]
    if env_mock:
        return True
    if request and request.headers.get("x-mock-mode", "").lower() in ["1", "true", "yes"]:
        return True
    # If no auth token is configured, default to mock mode for testing
    if not get_auth_token():
        return True
    return False


def validate_twilio_signature(
    url: str,
    params: Dict[str, Any],
    signature: Optional[str],
    auth_token: str
) -> bool:
    """Validates X-Twilio-Signature using Twilio validator or pure HMAC-SHA1."""
    if not signature:
        return False
    try:
        from twilio.request_validator import RequestValidator
        validator = RequestValidator(auth_token)
        return validator.validate(url, params, signature)
    except Exception as e:
        logger.debug(f"Twilio package validator fallback to native HMAC: {e}")
        # RFC HMAC-SHA1 calculation according to Twilio specs
        data = url
        for k in sorted(params.keys()):
            data += f"{k}{params[k]}"
        expected = base64.b64encode(
            hmac.new(auth_token.encode("utf-8"), data.encode("utf-8"), hashlib.sha1).digest()
        ).decode("utf-8")
        return hmac.compare_digest(expected, signature)


def build_twiml_sms_response(body_text: str) -> Response:
    """Generates valid TwiML XML response for SMS delivery."""
    # Escape standard XML characters
    escaped = (
        body_text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
    twiml = (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f"<Response>\n"
        f"    <Message>{escaped}</Message>\n"
        f"</Response>"
    )
    return Response(content=twiml.encode("utf-8"), media_type="application/xml; charset=utf-8")


@router.post("/sms", summary="Twilio Inbound SMS Webhook")
async def handle_incoming_sms(
    request: Request,
    From: str = Form(default=""),
    To: str = Form(default=""),
    Body: str = Form(default=""),
    MessageSid: Optional[str] = Form(default=None),
    x_twilio_signature: Optional[str] = Header(None, alias="X-Twilio-Signature")
):
    """
    Inbound SMS webhook handler for Twilio.
    1. Validates signature (or bypasses if mock mode).
    2. Routes text through bot.core.handle_message.
    3. Responds with formatted plain text TwiML under 160 characters (max 2 segments).
    """
    mock = is_mock_mode(request)
    
    # Read raw form body for signature validation
    form_data = await request.form()
    params_dict = {k: v for k, v in form_data.items()}

    # Twilio Signature Verification
    if not mock:
        full_url = str(request.url)
        # Handle reverse proxies or proto headers
        forwarded_proto = request.headers.get("x-forwarded-proto")
        if forwarded_proto and full_url.startswith("http://") and forwarded_proto == "https":
            full_url = "https://" + full_url[7:]

        auth_token = get_auth_token()
        valid = validate_twilio_signature(full_url, params_dict, x_twilio_signature, auth_token)
        if not valid:
            logger.warning(f"Rejected SMS from {From}: Invalid Twilio signature.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid Twilio signature."
            )
    else:
        logger.info(f"[MOCK MODE] Signature validation bypassed for SMS from {From}.")

    sender_id = From.strip() or "anonymous_farmer"
    message_text = Body.strip()

    logger.info(f"Inbound SMS from {sender_id}: '{message_text}'")

    # Delegate entirely to core message handler (zero duplicated logic)
    res = handle_message(
        sender_id=sender_id,
        message_text=message_text,
        channel="sms",
        lang="en"
    )

    reply_text = res["reply_text"]
    logger.info(f"Outbound SMS to {sender_id} ({res['char_count']} chars, {res['segments']} seg): '{reply_text}'")

    return build_twiml_sms_response(reply_text)
