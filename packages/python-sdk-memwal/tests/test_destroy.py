import pytest

from memwal.client import MemWal, MemWalError, MemWalSync
from memwal.types import MemWalConfig


def test_destroy_wipes_keys_and_rejects_reads():
    config = MemWalConfig(key="11" * 32, account_id="0x1", server_url="https://relayer.example")
    client = MemWal(config)

    assert client._private_key_hex != ""
    assert client._signing_key is not None
    assert client._destroyed is False

    client.destroy()

    assert client._private_key_hex == ""
    assert client._signing_key is None
    assert client._destroyed is True

    # Accessing public key after destroy raises MemWalError
    with pytest.raises(MemWalError, match="client was destroyed; its keys are wiped"):
        import asyncio
        asyncio.run(client.get_public_key_hex())


@pytest.mark.asyncio
async def test_destroy_rejects_requests_without_calling_server():
    config = MemWalConfig(key="11" * 32, account_id="0x1", server_url="https://relayer.example")
    client = MemWal(config)
    client.destroy()

    with pytest.raises(MemWalError, match="client was destroyed; its keys are wiped"):
        await client.recall("test")

    with pytest.raises(MemWalError, match="client was destroyed; its keys are wiped"):
        await client.remember("test")


def test_sync_client_destroy():
    client = MemWalSync.create(key="11" * 32, account_id="0x1", server_url="https://relayer.example")
    assert client._inner._private_key_hex != ""

    client.destroy()

    assert client._inner._private_key_hex == ""
    assert client._inner._signing_key is None
    assert client._inner._destroyed is True

    with pytest.raises(MemWalError, match="client was destroyed; its keys are wiped"):
        client.get_public_key_hex()

    with pytest.raises(MemWalError, match="client was destroyed; its keys are wiped"):
        client.recall("test")
