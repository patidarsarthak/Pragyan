#!/usr/bin/env python3
"""
SIH26074 - Automated Test Suite: SMS and IVR Twilio Adapters
------------------------------------------------------------
Tests:
1. Twilio signature validation (valid, invalid 403, and mock mode bypass).
2. SMS registration keyword flow (PIN code & village name).
3. SMS plain text constraints (<160 characters / 2 segments, no emoji, short codes).
4. SMS unmapped PIN honest response.
5. SMS FORECAST, ADVISORY, and STOP unsubscription flows.
6. IVR /webhook/voice initial greeting and language gather.
7. IVR language selection (Hindi / English prompts).
8. IVR PIN code resolution with mapped vs unmapped honest handling.
9. IVR 3-day forecast playback and 'press 9 to repeat' action handling.
"""

import os
import hmac
import hashlib
import base64
import pytest
from starlette.testclient import TestClient

from backend.main import app
from backend.bot.core import unregister_user, _USER_REGISTRY
from backend.bot.sms_twilio import validate_twilio_signature


@pytest.fixture(autouse=True)
def clean_user_registry():
    """Ensure a clean registry before each test run."""
    _USER_REGISTRY.clear()
    yield
    _USER_REGISTRY.clear()


@pytest.fixture
def client():
    return TestClient(app)


def generate_twilio_signature(url: str, params: dict, auth_token: str) -> str:
    """Helper to compute valid Twilio signature for testing."""
    data = url
    for k in sorted(params.keys()):
        data += f"{k}{params[k]}"
    return base64.b64encode(
        hmac.new(auth_token.encode("utf-8"), data.encode("utf-8"), hashlib.sha1).digest()
    ).decode("utf-8")


# ============================================================================
# 1. TWILIO SIGNATURE & MOCK MODE TESTS
# ============================================================================

def test_signature_validation_algorithm():
    auth_token = "test_secret_token_123"
    url = "https://example.com/webhook/sms"
    params = {"From": "+919876543210", "Body": "828104"}
    
    valid_sig = generate_twilio_signature(url, params, auth_token)
    assert validate_twilio_signature(url, params, valid_sig, auth_token) is True
    assert validate_twilio_signature(url, params, "invalid_sig", auth_token) is False
    assert validate_twilio_signature(url, params, None, auth_token) is False


def test_sms_webhook_signature_enforcement(client, monkeypatch):
    """When MOCK_MODE is disabled, invalid signature must return 403 Forbidden."""
    monkeypatch.setenv("MOCK_MODE", "false")
    monkeypatch.setenv("TWILIO_MOCK_MODE", "false")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "real_secret_token_456")

    response = client.post(
        "/webhook/sms",
        data={"From": "+919876543210", "Body": "828104"},
        headers={"X-Twilio-Signature": "invalid_tampered_signature"}
    )
    assert response.status_code == 403
    assert "Invalid Twilio signature" in response.text


def test_sms_webhook_mock_mode_bypass(client, monkeypatch):
    """When mock mode is enabled via header or env, signature validation is bypassed."""
    monkeypatch.setenv("MOCK_MODE", "true")
    monkeypatch.setenv("TWILIO_AUTH_TOKEN", "real_secret_token_456")

    response = client.post(
        "/webhook/sms",
        data={"From": "+919876543210", "Body": "828104"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    assert "<Response>" in response.text
    assert "<Message>" in response.text


# ============================================================================
# 2. SMS BOT KEYWORD & REGISTRATION FLOW TESTS
# ============================================================================

def test_sms_registration_by_pincode(client):
    """User texts 6-digit PIN code to register."""
    sender = "+919876543210"
    response = client.post(
        "/webhook/sms",
        data={"From": sender, "Body": "828104"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    text = response.text
    assert "BAGDAHA" in text or "BARORA" in text
    assert "Today:" in text
    # Enforce plain text & SMS segment bounds
    assert len(text) < 500  # Raw XML
    # Extract message body
    body = text.split("<Message>")[1].split("</Message>")[0]
    assert len(body) <= 160, f"SMS exceeds 160 characters: {len(body)}"
    # Verify no emojis
    assert all(ord(c) < 128 for c in body), "SMS body contains non-ASCII or emoji"


def test_sms_registration_by_village_name(client):
    """User texts village name like 'BAGDAHA' to register."""
    sender = "+919123456789"
    response = client.post(
        "/webhook/sms",
        data={"From": sender, "Body": "BAGDAHA"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    body = response.text.split("<Message>")[1].split("</Message>")[0]
    assert "Reg: BAGDAHA" in body
    assert len(body) <= 160


def test_sms_unmapped_pincode_honest_handling(client):
    """Unmapped PIN code must honestly report missing mapping without hallucinating."""
    sender = "+919555555555"
    response = client.post(
        "/webhook/sms",
        data={"From": sender, "Body": "828999"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    body = response.text.split("<Message>")[1].split("</Message>")[0]
    assert "not mapped" in body.lower()
    assert "828999" in body


def test_sms_forecast_flow(client):
    """Test FORECAST command when registered vs unregistered."""
    sender = "+919444444444"
    # 1. Unregistered request
    resp1 = client.post(
        "/webhook/sms",
        data={"From": sender, "Body": "FORECAST"},
        headers={"X-Mock-Mode": "true"}
    )
    body1 = resp1.text.split("<Message>")[1].split("</Message>")[0]
    assert "register first" in body1.lower()

    # 2. Register via PIN
    client.post(
        "/webhook/sms",
        data={"From": sender, "Body": "828104"},
        headers={"X-Mock-Mode": "true"}
    )

    # 3. Request forecast now that registered
    resp2 = client.post(
        "/webhook/sms",
        data={"From": sender, "Body": "FORECAST"},
        headers={"X-Mock-Mode": "true"}
    )
    body2 = resp2.text.split("<Message>")[1].split("</Message>")[0]
    assert "D1:" in body2
    assert "Adv:" in body2
    # Ensure under 2 segments (max 320 chars)
    assert len(body2) <= 320, f"Forecast exceeds 2 segments: {len(body2)}"
    # No emojis
    assert all(ord(c) < 128 for c in body2)


def test_sms_stop_keyword_flow(client):
    """STOP keyword unregisters user and silences updates."""
    sender = "+919333333333"
    # Register
    client.post("/webhook/sms", data={"From": sender, "Body": "828104"}, headers={"X-Mock-Mode": "true"})

    # Send STOP
    resp = client.post("/webhook/sms", data={"From": sender, "Body": "STOP"}, headers={"X-Mock-Mode": "true"})
    body = resp.text.split("<Message>")[1].split("</Message>")[0]
    assert "Unsubscribed" in body

    # Subsequent FORECAST prompts for re-registration
    resp2 = client.post("/webhook/sms", data={"From": sender, "Body": "FORECAST"}, headers={"X-Mock-Mode": "true"})
    body2 = resp2.text.split("<Message>")[1].split("</Message>")[0]
    assert "register first" in body2.lower()


# ============================================================================
# 3. IVR VOICE ADAPTER TESTS
# ============================================================================

def test_ivr_initial_voice_call(client):
    """Inbound voice call returns language selection TwiML."""
    response = client.post(
        "/webhook/voice",
        data={"From": "+919876543210", "CallSid": "CA12345"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    assert "application/xml" in response.headers["content-type"]
    text = response.text
    assert "<Gather" in text
    assert 'action="/webhook/voice/lang"' in text
    assert "Polly.Aditi" in text  # Hindi voice
    assert "Polly.Kajal" in text  # English voice


def test_ivr_language_selection_hindi(client):
    """Selecting 1 configures Hindi language and prompts for PIN code."""
    response = client.post(
        "/webhook/voice/lang",
        data={"Digits": "1", "From": "+919876543210"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    text = response.text
    assert "<Gather" in text
    assert 'numDigits="6"' in text
    assert "lang=hi" in text
    assert "Polly.Aditi" in text


def test_ivr_language_selection_english(client):
    """Selecting 2 configures English language and prompts for PIN code."""
    response = client.post(
        "/webhook/voice/lang",
        data={"Digits": "2", "From": "+919876543210"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    text = response.text
    assert "<Gather" in text
    assert 'numDigits="6"' in text
    assert "lang=en" in text
    assert "Polly.Kajal" in text


def test_ivr_pincode_resolution_mapped(client):
    """Entering valid PIN (828104) reads 3-day forecast and offers 'press 9 to repeat'."""
    response = client.post(
        "/webhook/voice/pincode?lang=en",
        data={"Digits": "828104", "From": "+919876543210"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    text = response.text
    assert "<Say" in text
    assert "Weather forecast for" in text
    assert "Day 1:" in text
    assert "Day 2:" in text
    assert "Day 3:" in text
    assert "Press 9 to repeat" in text
    assert 'action="/webhook/voice/action?gp=111722&amp;lang=en"' in text or "gp=" in text


def test_ivr_pincode_resolution_unmapped_honest(client):
    """Entering unmapped PIN (999999) reports honestly that the PIN is not mapped."""
    response = client.post(
        "/webhook/voice/pincode?lang=en",
        data={"Digits": "999999", "From": "+919876543210"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    text = response.text
    assert "is not currently mapped" in text
    assert "enter another" in text.lower()


def test_ivr_action_repeat(client):
    """Pressing 9 repeats the 3-day forecast."""
    response = client.post(
        "/webhook/voice/action?gp=111722&lang=en",
        data={"Digits": "9", "From": "+919876543210"},
        headers={"X-Mock-Mode": "true"}
    )
    assert response.status_code == 200
    text = response.text
    assert "Day 1:" in text
    assert "<Gather" in text
