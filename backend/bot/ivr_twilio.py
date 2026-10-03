#!/usr/bin/env python3
"""
SIH26074 - Twilio Interactive Voice Response (IVR) Webhook Adapter
-------------------------------------------------------------------
Voice portal delivering downscaled agro-meteorological advisories in
Hindi and English over standard phone calls.

Endpoints:
- POST /webhook/voice: Greets caller and prompts for language (1 for Hindi, 2 for English).
- POST /webhook/voice/lang: Captures language selection and prompts for 6-digit PIN.
- POST /webhook/voice/pincode: Resolves PIN via data/pincode_gp_map.csv, reports honesty
  if unmapped, reads 3-day forecast and advisory via <Say>, and handles "press 9 to repeat".
- POST /webhook/voice/action: Handles repeat (key 9) or new PIN entry (key 0).

Reuses bot.core logic directly with zero duplication.
"""

import os
import logging
from typing import Dict, Any, Optional

from fastapi import APIRouter, Request, Response, Form, Header, HTTPException, Query, status
from dotenv import load_dotenv

from backend.bot.core import lookup_pincode, get_ivr_speech_data
from backend.bot.sms_twilio import is_mock_mode, validate_twilio_signature

load_dotenv()
logger = logging.getLogger("IVR_Twilio")

router = APIRouter(prefix="/webhook/voice", tags=["SMS Bot & IVR"])

TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")


def xml_response(twiml_content: str) -> Response:
    """Wraps TwiML string into an application/xml FastAPI Response with explicit UTF-8 encoding."""
    header = '<?xml version="1.0" encoding="UTF-8"?>\n'
    return Response(content=(header + twiml_content).encode("utf-8"), media_type="application/xml; charset=utf-8")


@router.post("", summary="Initial IVR Inbound Voice Call Entry")
@router.post("/", include_in_schema=False)
async def handle_inbound_call(
    request: Request,
    From: str = Form(default=""),
    To: str = Form(default=""),
    CallSid: Optional[str] = Form(default=None),
    x_twilio_signature: Optional[str] = Header(None, alias="X-Twilio-Signature")
):
    """
    Entry point for inbound voice call.
    Greets caller and asks to press 1 for Hindi or 2 for English.
    """
    mock = is_mock_mode(request)
    form_data = await request.form()
    params_dict = {k: v for k, v in form_data.items()}

    if not mock:
        full_url = str(request.url)
        forwarded_proto = request.headers.get("x-forwarded-proto")
        if forwarded_proto and full_url.startswith("http://") and forwarded_proto == "https":
            full_url = "https://" + full_url[7:]
        auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        if not validate_twilio_signature(full_url, params_dict, x_twilio_signature, auth_token):
            logger.warning(f"Rejected IVR call from {From}: Invalid Twilio signature.")
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid Twilio signature.")
    else:
        logger.info(f"[MOCK MODE] Voice signature validation bypassed for call from {From}.")

    logger.info(f"Incoming voice call from {From} (CallSid: {CallSid})")

    twiml = (
        "<Response>\n"
        '    <Gather numDigits="1" action="/webhook/voice/lang" method="POST" timeout="8">\n'
        '        <Say voice="Polly.Aditi" language="hi-IN">किसान मौसम सेवा में आपका स्वागत है। हिंदी के लिए 1 दबाएं।</Say>\n'
        '        <Say voice="Polly.Kajal" language="en-IN">Welcome to Kisan Weather Service. For English, press 2.</Say>\n'
        "    </Gather>\n"
        '    <Say voice="Polly.Aditi" language="hi-IN">कोई विकल्प नहीं चुना गया। धन्यवाद।</Say>\n'
        "    <Hangup/>\n"
        "</Response>"
    )
    return xml_response(twiml)


@router.post("/lang", summary="IVR Language Selection")
async def handle_language_selection(
    request: Request,
    Digits: str = Form(default="1"),
    From: str = Form(default=""),
    x_twilio_signature: Optional[str] = Header(None, alias="X-Twilio-Signature")
):
    """
    Captures language choice (1 for Hindi, 2 for English) and prompts for 6-digit PIN.
    """
    lang = "hi" if Digits.strip() == "1" else "en"
    logger.info(f"Caller {From} selected language: {lang} (Digits: {Digits})")

    if lang == "hi":
        prompt = (
            "<Response>\n"
            f'    <Gather numDigits="6" action="/webhook/voice/pincode?lang={lang}" method="POST" timeout="10">\n'
            '        <Say voice="Polly.Aditi" language="hi-IN">कृपया अपने क्षेत्र का छह अंकों का पिन कोड दर्ज करें।</Say>\n'
            "    </Gather>\n"
            '    <Say voice="Polly.Aditi" language="hi-IN">पिन कोड प्राप्त नहीं हुआ। कृपया दोबारा कॉल करें।</Say>\n'
            "    <Hangup/>\n"
            "</Response>"
        )
    else:
        prompt = (
            "<Response>\n"
            f'    <Gather numDigits="6" action="/webhook/voice/pincode?lang={lang}" method="POST" timeout="10">\n'
            '        <Say voice="Polly.Kajal" language="en-IN">Please enter your six digit postal PIN code.</Say>\n'
            "    </Gather>\n"
            '    <Say voice="Polly.Kajal" language="en-IN">No PIN code received. Goodbye.</Say>\n'
            "    <Hangup/>\n"
            "</Response>"
        )
    return xml_response(prompt)


@router.post("/pincode", summary="IVR PIN Code Resolution & Forecast Delivery")
async def handle_pincode_entry(
    request: Request,
    Digits: str = Form(default=""),
    lang: str = Query(default="en"),
    From: str = Form(default="")
):
    """
    Resolves 6-digit PIN code against pincode_gp_map.csv.
    - If missing: Honestly reports that the PIN is not mapped yet, offers retry.
    - If mapped: Delivers downscaled 3-day forecast & advisory, offers 'press 9 to repeat'.
    """
    pin = Digits.strip()
    logger.info(f"Caller {From} entered PIN code: '{pin}', lang: {lang}")

    gp_info = lookup_pincode(pin)

    # 1. Missing / Unmapped PIN Handling
    if not gp_info:
        logger.info(f"PIN {pin} is unmapped in pincode_gp_map.csv")
        if lang == "hi":
            twiml = (
                "<Response>\n"
                f'    <Say voice="Polly.Aditi" language="hi-IN">क्षमा करें, पिन कोड {pin} अभी किसी पंचायत से मैप नहीं है।</Say>\n'
                f'    <Gather numDigits="6" action="/webhook/voice/pincode?lang={lang}" method="POST" timeout="10">\n'
                '        <Say voice="Polly.Aditi" language="hi-IN">कृपया कोई दूसरा छह अंकों का पिन कोड दर्ज करें।</Say>\n'
                "    </Gather>\n"
                '    <Say voice="Polly.Aditi" language="hi-IN">धन्यवाद।</Say>\n'
                "    <Hangup/>\n"
                "</Response>"
            )
        else:
            twiml = (
                "<Response>\n"
                f'    <Say voice="Polly.Kajal" language="en-IN">Sorry, PIN code {pin} is not currently mapped to an agricultural Panchayat.</Say>\n'
                f'    <Gather numDigits="6" action="/webhook/voice/pincode?lang={lang}" method="POST" timeout="10">\n'
                '        <Say voice="Polly.Kajal" language="en-IN">Please enter another six digit PIN code.</Say>\n'
                "    </Gather>\n"
                '    <Say voice="Polly.Kajal" language="en-IN">Thank you. Goodbye.</Say>\n'
                "    <Hangup/>\n"
                "</Response>"
            )
        return xml_response(twiml)

    # 2. Mapped PIN: Deliver Forecast and Advisory
    gp_code = gp_info["gp_code"]
    speech_data = get_ivr_speech_data(gp_code=gp_code, lang=lang)
    speech_text = speech_data["speech_text"]
    voice = speech_data["voice"]
    voice_lang = speech_data["voice_lang"]

    twiml = (
        "<Response>\n"
        f'    <Gather numDigits="1" action="/webhook/voice/action?gp={gp_code}&amp;lang={lang}" method="POST" timeout="10">\n'
        f'        <Say voice="{voice}" language="{voice_lang}">{speech_text}</Say>\n'
        "    </Gather>\n"
        f'    <Say voice="{voice}" language="{voice_lang}">Call complete. Thank you.</Say>\n'
        "    <Hangup/>\n"
        "</Response>"
    )
    return xml_response(twiml)


@router.post("/action", summary="IVR Repeat or Change PIN Action")
async def handle_ivr_action(
    request: Request,
    Digits: str = Form(default=""),
    gp: int = Query(default=111722),
    lang: str = Query(default="en"),
    From: str = Form(default="")
):
    """
    Handles user action keypress after forecast playback:
    - Key '9': Repeats the forecast and advisory.
    - Key '0': Re-prompts for a new PIN code.
    - Other/Timeout: Hangs up gracefully.
    """
    key = Digits.strip()
    logger.info(f"Caller {From} pressed action key: '{key}' for GP {gp}, lang {lang}")

    if key == "9":
        # Repeat forecast
        speech_data = get_ivr_speech_data(gp_code=gp, lang=lang)
        speech_text = speech_data["speech_text"]
        voice = speech_data["voice"]
        voice_lang = speech_data["voice_lang"]

        twiml = (
            "<Response>\n"
            f'    <Gather numDigits="1" action="/webhook/voice/action?gp={gp}&amp;lang={lang}" method="POST" timeout="10">\n'
            f'        <Say voice="{voice}" language="{voice_lang}">{speech_text}</Say>\n'
            "    </Gather>\n"
            f'    <Say voice="{voice}" language="{voice_lang}">Goodbye.</Say>\n'
            "    <Hangup/>\n"
            "</Response>"
        )
        return xml_response(twiml)

    elif key == "0":
        # Prompt for new PIN
        if lang == "hi":
            twiml = (
                "<Response>\n"
                f'    <Gather numDigits="6" action="/webhook/voice/pincode?lang={lang}" method="POST" timeout="10">\n'
                '        <Say voice="Polly.Aditi" language="hi-IN">कृपया नया छह अंकों का पिन कोड दर्ज करें।</Say>\n'
                "    </Gather>\n"
                "    <Hangup/>\n"
                "</Response>"
            )
        else:
            twiml = (
                "<Response>\n"
                f'    <Gather numDigits="6" action="/webhook/voice/pincode?lang={lang}" method="POST" timeout="10">\n'
                '        <Say voice="Polly.Kajal" language="en-IN">Please enter a new six digit PIN code.</Say>\n'
                "    </Gather>\n"
                "    <Hangup/>\n"
                "</Response>"
            )
        return xml_response(twiml)

    else:
        # Graceful exit
        farewell = "किसान सेवा से जुड़ने के लिए धन्यवाद।" if lang == "hi" else "Thank you for using Kisan Weather Advisory. Goodbye."
        voice = "Polly.Aditi" if lang == "hi" else "Polly.Kajal"
        voice_lang = "hi-IN" if lang == "hi" else "en-IN"
        twiml = (
            "<Response>\n"
            f'    <Say voice="{voice}" language="{voice_lang}">{farewell}</Say>\n'
            "    <Hangup/>\n"
            "</Response>"
        )
        return xml_response(twiml)
