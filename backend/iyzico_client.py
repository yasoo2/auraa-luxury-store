"""
iyzico — taking a card payment from anywhere in the world.

Why this provider and not Stripe or PayPal: neither will take this shop's
money. Stripe operates in 46 countries and Turkey is not one of them, and
PayPal lost its Turkish licence in 2016 and cannot pay out to a Turkish
account. iyzico is what shops in Turkey actually use, and it accepts Visa,
Mastercard and Amex issued in any country, in 15 currencies.

Two things here are worth reading before changing anything.

**The redirect is never the proof.** The customer's browser comes back from
iyzico with a token. Anyone can navigate to that URL with any token they like.
The only thing that decides whether an order is paid is what iyzico says when
*we* ask it, over our own authenticated connection, and only if the signature
on that answer verifies against our secret key. A browser is not a witness.

**The signature algorithms are theirs, not ours.** They are transcribed from
the official iyzipay-python client, which is HMAC-SHA256 over a fixed field
order joined by colons. The field order is not arbitrary and must not be
"tidied": get it wrong and every genuine payment is rejected, or worse, a
forged one is accepted.

The SDK itself is not used: it speaks over a blocking http.client, which
inside an async request handler stalls the whole server.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import os
import random
import string
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class IyzicoError(Exception):
    """iyzico refused, or answered something we will not act on."""


API_KEY = os.getenv("IYZICO_API_KEY", "")
SECRET_KEY = os.getenv("IYZICO_SECRET_KEY", "")

# Production by default, sandbox only when asked for out loud.
#
# The other way round is a trap: keys set, base URL forgotten, every order
# marked paid by a sandbox that never moved a lira. A shop that cannot tell a
# real payment from a rehearsal ships goods for free. Pointing production keys
# at the live host fails loudly instead, which is the failure you want.
SANDBOX = os.getenv("IYZICO_SANDBOX", "").strip().lower() in ("1", "true", "yes")
BASE_URL = "sandbox-api.iyzipay.com" if SANDBOX else "api.iyzipay.com"

# What the card is charged in. The catalogue is priced in SAR, which iyzico
# does not settle, so the amount is converted before it is charged and the
# converted figure is shown to the customer before they are sent anywhere.
CURRENCY = os.getenv("IYZICO_CURRENCY", "USD").strip().upper()

TIMEOUT = httpx.Timeout(20.0, connect=10.0)


def is_configured() -> bool:
    return bool(API_KEY and SECRET_KEY)


def mode() -> str:
    return "sandbox" if SANDBOX else "production"


def _random_string(size: int = 8) -> str:
    return "".join(random.SystemRandom().choice(string.ascii_letters + string.digits)
                   for _ in range(size))


def _authorization(path: str, random_str: str, body: str) -> str:
    """The IYZWSv2 header: HMAC-SHA256 over randomKey + path + body."""
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"),
        (random_str + path + body).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    params = f"apiKey:{API_KEY}&randomKey:{random_str}&signature:{signature}"
    return "IYZWSv2 " + base64.b64encode(params.encode()).decode()


def _strip_zero(number: str) -> str:
    """iyzico signs "1" where its JSON says 1.0. Their rule, reproduced."""
    return number[:-2] if number.endswith(".0") else number


def _verify(fields: List[str], signature: str) -> bool:
    expected = hmac.new(
        SECRET_KEY.encode("utf-8"),
        ":".join(fields).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    # Compared in constant time: a byte-by-byte comparison leaks, through its
    # own timing, how much of a forged signature was right so far.
    return hmac.compare_digest(expected, signature or "")


async def _post(path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if not is_configured():
        raise IyzicoError("iyzico is not configured")

    body = json.dumps(payload)
    random_str = _random_string()
    headers = {
        "Accept": "application/json",
        "Content-type": "application/json",
        "x-iyzi-rnd": random_str,
        "Authorization": _authorization(path, random_str, body),
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(f"https://{BASE_URL}{path}", content=body, headers=headers)
    except httpx.HTTPError as e:
        raise IyzicoError(f"could not reach iyzico: {e}") from e

    try:
        data = response.json()
    except ValueError as e:
        raise IyzicoError(f"iyzico answered {response.status_code} with no JSON") from e

    if data.get("status") != "success":
        # errorMessage is written for the shopper; errorCode identifies it.
        raise IyzicoError(
            f"{data.get('errorMessage') or 'iyzico refused the request'}"
            f" [{data.get('errorCode') or response.status_code}]"
        )
    return data


def _money(amount: float) -> str:
    """iyzico wants a plain decimal string, and refuses "93.1100000001"."""
    return f"{round(float(amount), 2):.2f}"


async def create_checkout_form(
    *,
    conversation_id: str,
    basket_id: str,
    amount: float,
    callback_url: str,
    buyer: Dict[str, Any],
    address: Dict[str, Any],
    basket_items: List[Dict[str, Any]],
    locale: str = "tr",
) -> Dict[str, Any]:
    """
    Open a payment session and get the hosted page to send the customer to.

    `amount` is already in CURRENCY — converting it is the caller's job,
    because the caller is the one that must refuse to charge anything at all
    when the exchange rate is unknown.
    """
    total = _money(amount)
    payload = {
        "locale": locale,
        "conversationId": conversation_id,
        # price is the basket's worth, paidPrice is what the card is charged.
        # They are equal here: the shop adds nothing at the till.
        "price": total,
        "paidPrice": total,
        "currency": CURRENCY,
        "basketId": basket_id,
        "paymentGroup": "PRODUCT",
        "callbackUrl": callback_url,
        "buyer": buyer,
        "shippingAddress": address,
        "billingAddress": address,
        "basketItems": basket_items,
    }

    data = await _post("/payment/iyzipos/checkoutform/initialize/ecom", payload)

    token = data.get("token")
    if not token:
        raise IyzicoError("iyzico returned no payment token")
    if not _verify([str(data.get("conversationId") or ""), str(token)], data.get("signature")):
        raise IyzicoError("iyzico's answer failed signature verification")

    return {
        "token": token,
        "payment_page_url": data.get("paymentPageUrl"),
        "form_content": data.get("checkoutFormContent"),
        "expires_in": data.get("tokenExpireTime"),
    }


async def retrieve_checkout_form(*, token: str, conversation_id: str, locale: str = "tr") -> Dict[str, Any]:
    """
    Ask iyzico what actually happened, and refuse to believe anything else.

    Returns the payment as iyzico describes it, with `paid` set only when the
    answer both says SUCCESS and carries a signature that verifies.
    """
    data = await _post("/payment/iyzipos/checkoutform/auth/ecom/detail", {
        "locale": locale,
        "conversationId": conversation_id,
        "token": token,
    })

    signed = _verify(
        [
            str(data.get("paymentStatus") or ""),
            str(data.get("paymentId") or ""),
            str(data.get("currency") or ""),
            str(data.get("basketId") or ""),
            str(data.get("conversationId") or ""),
            _strip_zero(str(data.get("paidPrice"))),
            _strip_zero(str(data.get("price"))),
            str(token),
        ],
        data.get("signature"),
    )
    if not signed:
        # Never fall through to "well, it said SUCCESS". An unverified answer
        # is an answer from nobody in particular.
        raise IyzicoError("iyzico's answer failed signature verification")

    return {
        "paid": data.get("paymentStatus") == "SUCCESS",
        "payment_status": data.get("paymentStatus"),
        "payment_id": data.get("paymentId"),
        "paid_price": data.get("paidPrice"),
        "price": data.get("price"),
        "currency": data.get("currency"),
        "basket_id": data.get("basketId"),
        "conversation_id": data.get("conversationId"),
        "error_message": data.get("errorMessage"),
    }


def _reset_for_tests(**overrides: Any) -> None:
    """Tests drive the module-level configuration through this, not by hand."""
    global API_KEY, SECRET_KEY, SANDBOX, BASE_URL, CURRENCY
    API_KEY = overrides.get("api_key", API_KEY)
    SECRET_KEY = overrides.get("secret_key", SECRET_KEY)
    SANDBOX = overrides.get("sandbox", SANDBOX)
    BASE_URL = overrides.get("base_url", BASE_URL)
    CURRENCY = overrides.get("currency", CURRENCY)
