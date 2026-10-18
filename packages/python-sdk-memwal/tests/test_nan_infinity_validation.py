"""Tests for NaN / Infinity and limit validation (issue #1218)."""

from __future__ import annotations

import httpx
import nacl.signing
import pytest
import respx

from memwal.client import MemWal, MemWalSync
from memwal.types import (
    RecallManualOptions,
    RecallParams,
    RememberManualOptions,
    ScoringWeights,
)
from memwal.utils import bytes_to_hex

_TEST_SEED = b"\x01" * 32
_TEST_KEY = nacl.signing.SigningKey(_TEST_SEED)
_TEST_KEY_HEX = bytes_to_hex(bytes(_TEST_KEY))
_TEST_ACCOUNT_ID = "0xabc123"
_TEST_SERVER = "http://localhost:8000"


def _mock_version() -> None:
    respx.get(f"{_TEST_SERVER}/version").mock(
        return_value=httpx.Response(
            200,
            json={
                "relayerVersion": "0.1.0",
                "apiVersion": "1.0.0",
                "minSupportedSdk": {"python": "0.1.0"},
                "featureFlags": {},
                "deprecations": [],
                "build": {},
            },
        )
    )


@pytest.fixture
def memwal_client() -> MemWal:
    return MemWal.create(
        key=_TEST_KEY_HEX,
        account_id=_TEST_ACCOUNT_ID,
        server_url=_TEST_SERVER,
    )


@respx.mock
async def test_recall_manual_rejects_nan_and_infinity_in_vector(memwal_client: MemWal) -> None:
    _mock_version()
    with pytest.raises(ValueError, match=r"vector\[1\] must be a finite number"):
        await memwal_client.recall_manual(RecallManualOptions(vector=[0.1, float("nan"), 0.5]))

    with pytest.raises(ValueError, match=r"vector\[2\] must be a finite number"):
        await memwal_client.recall_manual(RecallManualOptions(vector=[0.1, 0.2, float("inf")]))

    with pytest.raises(ValueError, match=r"vector\[0\] must be a finite number"):
        await memwal_client.recall_manual(RecallManualOptions(vector=[float("-inf")]))


@respx.mock
async def test_remember_manual_rejects_nan_in_vector(memwal_client: MemWal) -> None:
    _mock_version()
    with pytest.raises(ValueError, match=r"vector\[0\] must be a finite number"):
        await memwal_client.remember_manual(
            RememberManualOptions(
                encrypted_data="dGVzdA==",
                vector=[float("nan"), 1.0],
            )
        )


@respx.mock
async def test_recall_manual_rejects_invalid_limit(memwal_client: MemWal) -> None:
    _mock_version()
    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.recall_manual(
            RecallManualOptions(vector=[0.1, 0.2], limit=float("nan"))
        )

    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.recall_manual(RecallManualOptions(vector=[0.1, 0.2], limit=-1))


@respx.mock
async def test_recall_rejects_nan_fractional_and_negative_limit(memwal_client: MemWal) -> None:
    _mock_version()
    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.recall("test", limit=float("nan"))

    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.recall("test", limit=-5)

    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.recall("test", limit=2.5)  # type: ignore

    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.recall(RecallParams(query="test", limit=float("nan")))  # type: ignore


@respx.mock
async def test_recall_rejects_invalid_max_distance(memwal_client: MemWal) -> None:
    _mock_version()
    with pytest.raises(ValueError, match=r"max_distance must be a non-negative finite number"):
        await memwal_client.recall("test", max_distance=float("nan"))

    with pytest.raises(ValueError, match=r"max_distance must be a non-negative finite number"):
        await memwal_client.recall("test", max_distance=float("inf"))

    with pytest.raises(ValueError, match=r"max_distance must be a non-negative finite number"):
        await memwal_client.recall("test", max_distance=-0.5)


@respx.mock
async def test_restore_rejects_nan_and_negative_limit(memwal_client: MemWal) -> None:
    _mock_version()
    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.restore("ns", limit=float("nan"))

    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.restore("ns", limit=-5)


@respx.mock
async def test_list_namespaces_rejects_nan_and_negative_limit(memwal_client: MemWal) -> None:
    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.list_namespaces(limit=float("nan"))  # type: ignore

    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.list_namespaces(limit=-1)


@respx.mock
async def test_ask_rejects_nan_and_negative_limit(memwal_client: MemWal) -> None:
    _mock_version()
    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.ask("test question", limit=float("nan"))  # type: ignore

    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        await memwal_client.ask("test question", limit=-1)


@respx.mock
async def test_signed_request_json_dumps_disallows_nan(memwal_client: MemWal) -> None:
    _mock_version()
    with pytest.raises(ValueError, match=r"Out of range float values are not JSON compliant"):
        await memwal_client._signed_request("POST", "/api/test", {"bad_float": float("nan")})


def test_scoring_weights_rejects_nan_or_inf() -> None:
    with pytest.raises(ValueError, match=r"scoring_weight semantic must be a finite number"):
        ScoringWeights(semantic=float("nan")).to_wire()

    with pytest.raises(ValueError, match=r"scoring_weight recency must be a finite number"):
        ScoringWeights(recency=float("inf")).to_wire()


def test_sync_client_validation() -> None:
    sync_client = MemWalSync.create(
        key=_TEST_KEY_HEX,
        account_id=_TEST_ACCOUNT_ID,
        server_url=_TEST_SERVER,
    )
    with pytest.raises(ValueError, match=r"limit must be a non-negative integer"):
        sync_client.restore("ns", limit=-1)
