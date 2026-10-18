import asyncio
import httpx
import pytest

from memwal import MemWal
from memwal.types import MemWalConfig, RecallResult


@pytest.mark.asyncio
async def test_cancelling_one_concurrent_recall_does_not_cancel_another():
    config_started = asyncio.Event()
    release_config = asyncio.Event()
    second_waiter_entered = asyncio.Event()
    build_entries = 0

    async def handle(request):
        if request.url.path == "/version":
            return httpx.Response(200, json={
                "apiVersion": "1.0.0", "relayerVersion": "0.1.0",
                "minSupportedSdk": {"python": "0.1.0"},
            })
        if request.url.path == "/config":
            config_started.set()
            await release_config.wait()
            return httpx.Response(200, json={
                "packageId": "0x" + "22" * 32,
                "network": "local", "suiRpcUrl": "https://mock-sui.test/",
            })
        if request.url.host == "mock-sui.test":
            return httpx.Response(200, json={"result": {"data": {"version": "1"}}})
        if request.url.path == "/api/recall":
            return httpx.Response(200, json={"results": [], "total": 0})
        raise AssertionError(f"Unexpected mocked request: {request.method} {request.url}")

    client = MemWal.create(
        key="11" * 32,
        account_id="0x" + "33" * 32,
        server_url="https://mock-relayer.test",
    )
    client._client = httpx.AsyncClient(transport=httpx.MockTransport(handle))
    original_build = client._build_seal_session

    async def observed_build():
        nonlocal build_entries
        build_entries += 1
        if build_entries == 2:
            second_waiter_entered.set()
        return await original_build()

    client._build_seal_session = observed_build

    try:
        # Case 1: Cancel creator (first caller)
        first = asyncio.create_task(client.recall("first query"))
        await config_started.wait()
        second = asyncio.create_task(client.recall("second query"))
        await second_waiter_entered.wait()
        await asyncio.sleep(0)

        # Cancel the first task
        first.cancel()
        await asyncio.sleep(0)
        release_config.set()

        outcomes = await asyncio.gather(first, second, return_exceptions=True)
        assert isinstance(outcomes[0], asyncio.CancelledError), f"Expected first to be cancelled, got {outcomes[0]}"
        assert isinstance(outcomes[1], RecallResult), f"Expected second to succeed, got {outcomes[1]}"

        # Independent retry succeeds
        retry = await client.recall("third retry")
        assert isinstance(retry, RecallResult)
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_cancelling_waiter_does_not_cancel_creator():
    config_started = asyncio.Event()
    release_config = asyncio.Event()
    second_waiter_entered = asyncio.Event()
    build_entries = 0

    async def handle(request):
        if request.url.path == "/version":
            return httpx.Response(200, json={
                "apiVersion": "1.0.0", "relayerVersion": "0.1.0",
                "minSupportedSdk": {"python": "0.1.0"},
            })
        if request.url.path == "/config":
            config_started.set()
            await release_config.wait()
            return httpx.Response(200, json={
                "packageId": "0x" + "22" * 32,
                "network": "local", "suiRpcUrl": "https://mock-sui.test/",
            })
        if request.url.host == "mock-sui.test":
            return httpx.Response(200, json={"result": {"data": {"version": "1"}}})
        if request.url.path == "/api/recall":
            return httpx.Response(200, json={"results": [], "total": 0})
        raise AssertionError(f"Unexpected mocked request: {request.method} {request.url}")

    client = MemWal.create(
        key="11" * 32,
        account_id="0x" + "33" * 32,
        server_url="https://mock-relayer.test",
    )
    client._client = httpx.AsyncClient(transport=httpx.MockTransport(handle))
    original_build = client._build_seal_session

    async def observed_build():
        nonlocal build_entries
        build_entries += 1
        if build_entries == 2:
            second_waiter_entered.set()
        return await original_build()

    client._build_seal_session = observed_build

    try:
        # Case 2: Cancel waiter (second caller)
        first = asyncio.create_task(client.recall("first query"))
        await config_started.wait()
        second = asyncio.create_task(client.recall("second query"))
        await second_waiter_entered.wait()
        await asyncio.sleep(0)

        # Cancel the second task
        second.cancel()
        await asyncio.sleep(0)
        release_config.set()

        outcomes = await asyncio.gather(first, second, return_exceptions=True)
        assert isinstance(outcomes[0], RecallResult), f"Expected first to succeed, got {outcomes[0]}"
        assert isinstance(outcomes[1], asyncio.CancelledError), f"Expected second to be cancelled, got {outcomes[1]}"

        # Independent retry succeeds
        retry = await client.recall("third retry")
        assert isinstance(retry, RecallResult)
    finally:
        await client.close()
