import pytest

from memwal.client import MemWal, MemWalSync
from memwal.mock import MemWalMock, MemWalMockSync
from memwal.types import MemWalConfig, RecallParams, RememberBulkItem


def test_memwal_config_rejects_empty_namespace():
    with pytest.raises(ValueError, match="namespace cannot be empty"):
        MemWalConfig(
            key="11" * 32,
            account_id="0x1",
            namespace="",
        )


def test_memwal_create_rejects_empty_namespace():
    with pytest.raises(ValueError, match="namespace cannot be empty"):
        MemWal.create(
            key="11" * 32,
            account_id="0x1",
            namespace="",
        )


def test_memwal_sync_create_rejects_empty_namespace():
    with pytest.raises(ValueError, match="namespace cannot be empty"):
        MemWalSync.create(
            key="11" * 32,
            account_id="0x1",
            namespace="",
        )


def test_memwal_mock_rejects_empty_namespace():
    with pytest.raises(ValueError, match="namespace cannot be empty"):
        MemWalMock(namespace="")

    with pytest.raises(ValueError, match="namespace cannot be empty"):
        MemWalMock.create(namespace="")


@pytest.mark.asyncio
async def test_remember_preserves_explicit_empty_namespace():
    client = MemWal(MemWalConfig(key="11" * 32, account_id="0x1", namespace="default"))
    captured_payload = {}

    async def fake_signed_request(method, path, body=None, **kwargs):
        nonlocal captured_payload
        captured_payload = body
        return {"job_id": "job-1", "status": "pending"}

    client._signed_request = fake_signed_request
    await client.remember("hello", namespace="")
    assert captured_payload.get("namespace") == ""


@pytest.mark.asyncio
async def test_recall_preserves_explicit_empty_namespace():
    client = MemWal(MemWalConfig(key="11" * 32, account_id="0x1", namespace="default"))
    captured_payload = {}

    async def fake_signed_request(method, path, body=None, **kwargs):
        nonlocal captured_payload
        captured_payload = body
        return {"results": []}

    client._signed_request = fake_signed_request
    await client.recall(RecallParams(query="hello", namespace=""))
    assert captured_payload.get("namespace") == ""


@pytest.mark.asyncio
async def test_remember_bulk_preserves_explicit_empty_namespace():
    client = MemWal(MemWalConfig(key="11" * 32, account_id="0x1", namespace="default"))
    captured_payload = {}

    async def fake_signed_request(method, path, body=None, **kwargs):
        nonlocal captured_payload
        captured_payload = body
        return {"job_ids": ["job-1"], "total": 1, "status": "pending"}

    client._signed_request = fake_signed_request
    await client.remember_bulk([RememberBulkItem(text="hello", namespace="")])
    assert captured_payload["items"][0]["namespace"] == ""


@pytest.mark.asyncio
async def test_mock_remember_rejects_explicit_empty_namespace():
    mock = MemWalMock(namespace="default")
    with pytest.raises(ValueError, match="namespace cannot be empty"):
        await mock.remember("hello", namespace="")
