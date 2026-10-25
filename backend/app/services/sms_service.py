import logging
import httpx
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """
    Handles live SMS dispatch for OTP verification across Indian mobile numbers.
    Supports Fast2SMS (India-native), Twilio, and Simulated fallback.
    """

    @classmethod
    async def send_otp(cls, mobile_number: str, otp_code: str) -> Dict[str, Any]:
        clean_mobile = mobile_number.strip().replace(" ", "").replace("-", "")
        if clean_mobile.startswith("+91"):
            clean_mobile = clean_mobile[3:]

        # 1. Fast2SMS (Indian Gateway)
        fast2sms_key = getattr(settings, "FAST2SMS_API_KEY", "")
        if fast2sms_key:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(
                        "https://www.fast2sms.com/dev/bulkV2",
                        headers={
                            "authorization": fast2sms_key,
                            "Content-Type": "application/json",
                        },
                        json={
                            "variables_values": otp_code,
                            "route": "otp",
                            "numbers": clean_mobile,
                        },
                    )
                    data = res.json()
                    if data.get("return") is True:
                        return {
                            "success": True,
                            "provider": "FAST2SMS",
                            "message": f"Real SMS successfully sent to +91 {clean_mobile}",
                        }
                    else:
                        logger.warning(f"Fast2SMS returned error: {data}")
            except Exception as e:
                logger.error(f"Failed to send SMS via Fast2SMS: {e}")

        # 2. Twilio
        twilio_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        twilio_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        twilio_from = getattr(settings, "TWILIO_PHONE_NUMBER", "")
        if twilio_sid and twilio_token and twilio_from:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    res = await client.post(
                        f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json",
                        auth=(twilio_sid, twilio_token),
                        data={
                            "From": twilio_from,
                            "To": f"+91{clean_mobile}",
                            "Body": f"Your UBFD Bank Verification Code is: {otp_code}. Valid for 10 minutes.",
                        },
                    )
                    if res.status_code in (200, 201):
                        return {
                            "success": True,
                            "provider": "TWILIO",
                            "message": f"Real SMS successfully sent via Twilio to +91 {clean_mobile}",
                        }
            except Exception as e:
                logger.error(f"Failed to send SMS via Twilio: {e}")

        # 3. Simulated fallback when no SMS credit/provider key is in .env
        return {
            "success": False,
            "provider": "SIMULATED",
            "message": (
                f"No cellular SMS gateway API key configured in .env. "
                f"Use instant verification code {otp_code} (or click Auto-fill) to activate."
            ),
            "otp_code": otp_code,
        }
