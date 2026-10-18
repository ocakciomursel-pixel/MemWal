"""Tests for empty and non-JSON HTTP responses (issue #1219).

Mirrors packages/sdk/test/json-body.test.mjs.
"""

from __future__ import annotations

import json
from typing import Any

import httpx
import nacl.signing
import pytest
import respx

from memwal.client import (
    MemWal,
    MemWalError,
    MemWalJsonBodyError,
    MemWalSync,
)
from memwal.utils import bytes_to_hex

_TEST_SEED = b"\x01" * 32
_TEST_KEY = nacl.signing.SigningKey(_TEST_SEED)
_TEST_KEY_HEX = bytes_to_hex(bytes(_TEST_KEY))
_TEST_ACCOUNT_ID = "0xabc123"
_TEST_SERVER = "http://localhost:8000"


def _version_payload() -> dict[str, Any]:
    return {
        "relayerVersion": "0.1.0",
        "apiVersion": "1.0.0",
        "minSupportedSdk": {
            "typescript": "0.0.4",
            "python": "0.1.0",
            "mcp": "0.0.1",
        },
        "featureFlags": {"runtime.versionEndpoint": True},
        "deprecations": [],
        "build": {},
    }


def _mock_version() -> None:
    respx.get(f"{_TEST_SERVER}/version").mock(
        return_value=httpx.Response(200, json=_version_payload())
    )


@pytest.fixture
def memwal_client() -> MemWal:
    return MemWal.create(
        key=_TEST_KEY_HEX,
        account_id=_TEST_ACCOUNT_ID,
        server_url=_TEST_SERVER,
    )


@respx.mock
async def test_health_rejects_empty_200(memwal_client: MemWal) -> None:
    respx.get(f"{_TEST_SERVER}/health").mock(return_value=httpx.Response(200, content=b""))
    with pytest.raises(MemWalJsonBodyError) as exc_info:
        await memwal_client.health()

    err = exc_info.value
    assert isinstance(err, MemWalError)
    assert not isinstance(err, json.JSONDecodeError)
    assert err.status == 200
    assert "empty body" in str(err)
    assert "MemWal: HTTP 200 response had an empty body; expected JSON" in str(err)


@respx.mock
async def test_health_rejects_non_json_200(memwal_client: MemWal) -> None:
    respx.get(f"{_TEST_SERVER}/health").mock(
        return_value=httpx.Response(200, content=b"nope", headers={"content-type": "text/plain"})
    )
    with pytest.raises(MemWalJsonBodyError) as exc_info:
        await memwal_client.health()

    err = exc_info.value
    assert isinstance(err, MemWalError)
    assert not isinstance(err, json.JSONDecodeError)
    assert err.status == 200
    assert "response was not JSON" in str(err)
    assert "MemWal: HTTP 200 response was not JSON" in str(err)


@respx.mock
async def test_compatibility_rejects_empty_200(memwal_client: MemWal) -> None:
    respx.get(f"{_TEST_SERVER}/version").mock(return_value=httpx.Response(200, content=b"   "))
    with pytest.raises(MemWalJsonBodyError) as exc_info:
        await memwal_client.compatibility()

    err = exc_info.value
    assert err.status == 200
    assert "empty body" in str(err)


@respx.mock
async def test_compatibility_rejects_non_json_200(memwal_client: MemWal) -> None:
    respx.get(f"{_TEST_SERVER}/version").mock(
        return_value=httpx.Response(200, content=b"<html>502 Bad Gateway</html>")
    )
    with pytest.raises(MemWalJsonBodyError) as exc_info:
        await memwal_client.compatibility()

    err = exc_info.value
    assert err.status == 200
    assert "response was not JSON" in str(err)


async def _fake_seal_session() -> str:
    return "test-session"


@respx.mock
async def test_remember_rejects_empty_202(memwal_client: MemWal) -> None:
    _mock_version()
    memwal_client._build_seal_session = _fake_seal_session  # type: ignore
    respx.post(f"{_TEST_SERVER}/api/remember").mock(return_value=httpx.Response(202, content=b""))

    with pytest.raises(MemWalJsonBodyError) as exc_info:
        await memwal_client.remember("hello")

    err = exc_info.value
    assert isinstance(err, MemWalError)
    assert not isinstance(err, json.JSONDecodeError)
    assert err.status == 202
    assert "empty body" in str(err)


@respx.mock
async def test_remember_rejects_non_json_202(memwal_client: MemWal) -> None:
    _mock_version()
    memwal_client._build_seal_session = _fake_seal_session  # type: ignore
    respx.post(f"{_TEST_SERVER}/api/remember").mock(
        return_value=httpx.Response(202, content=b"not-json")
    )

    with pytest.raises(MemWalJsonBodyError) as exc_info:
        await memwal_client.remember("hello")

    err = exc_info.value
    assert err.status == 202
    assert "response was not JSON" in str(err)


@respx.mock
async def test_remember_and_wait_does_not_poll_on_empty_202(memwal_client: MemWal) -> None:
    _mock_version()
    memwal_client._build_seal_session = _fake_seal_session  # type: ignore
    respx.post(f"{_TEST_SERVER}/api/remember").mock(return_value=httpx.Response(202, content=b""))
    poll_route = respx.get(f"{_TEST_SERVER}/api/remember/job-1").mock(
        return_value=httpx.Response(200, json={"status": "done"})
    )

    with pytest.raises(MemWalJsonBodyError) as exc_info:
        await memwal_client.remember_and_wait("hello", timeout_ms=5_000)

    err = exc_info.value
    assert err.status == 202
    assert "empty body" in str(err)
    assert poll_route.call_count == 0


@respx.mock
async def test_recall_rejects_empty_200(memwal_client: MemWal) -> None:
    _mock_version()
    memwal_client._build_seal_session = _fake_seal_session  # type: ignore
    respx.post(f"{_TEST_SERVER}/api/recall").mock(return_value=httpx.Response(200, content=b""))

    with pytest.raises(MemWalJsonBodyError) as exc_info:
        await memwal_client.recall("preferences")

    err = exc_info.value
    assert err.status == 200
    assert "empty body" in str(err)


@respx.mock
def test_sync_health_rejects_empty_200() -> None:
    respx.get(f"{_TEST_SERVER}/health").mock(return_value=httpx.Response(200, content=b""))
    sync_client = MemWalSync.create(
        key=_TEST_KEY_HEX,
        account_id=_TEST_ACCOUNT_ID,
        server_url=_TEST_SERVER,
    )
    with pytest.raises(MemWalJsonBodyError) as exc_info:
        sync_client.health()

    assert exc_info.value.status == 200
    assert "empty body" in str(exc_info.value)
