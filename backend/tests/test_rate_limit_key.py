"""Tests for trusted-proxy-aware client IP resolution used by rate limiting.

The HTTP limiter and the WebSocket connection tracker must agree on a single
trust model: X-Forwarded-For is only honoured when the immediate socket peer is
a configured trusted proxy, otherwise the socket peer address wins.

Trust is configured the way an operator configures it -- TRUSTED_PROXIES in the
environment or in backend/.env -- never by patching an attribute onto the
settings singleton, because an attribute that only exists under test proves
nothing about production.
"""

import inspect
from collections.abc import Iterator, MutableMapping
from ipaddress import ip_network
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError
from starlette.requests import Request
from starlette.websockets import WebSocket

from worth_it import config
from worth_it.api.dependencies import (
    get_client_ip,
    get_http_client_ip,
    get_trusted_proxies,
    limiter,
    resolve_client_ip,
)


def _encode_headers(headers: dict[str, str] | None) -> list[tuple[bytes, bytes]]:
    return [(key.lower().encode(), value.encode()) for key, value in (headers or {}).items()]


def _make_websocket(peer_host: str | None, headers: dict[str, str] | None = None) -> WebSocket:
    scope = {
        "type": "websocket",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "scheme": "ws",
        "path": "/ws",
        "raw_path": b"/ws",
        "query_string": b"",
        "root_path": "",
        "headers": _encode_headers(headers),
        "client": (peer_host, 54321) if peer_host else None,
        "server": ("testserver", 80),
        "subprotocols": [],
    }

    async def receive() -> dict:
        return {"type": "websocket.connect"}

    async def send(message: MutableMapping[str, Any]) -> None:
        return None

    return WebSocket(scope, receive=receive, send=send)


def _make_request(peer_host: str | None, headers: dict[str, str] | None = None) -> Request:
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "POST",
        "scheme": "http",
        "path": "/api/scenario",
        "raw_path": b"/api/scenario",
        "query_string": b"",
        "root_path": "",
        "headers": _encode_headers(headers),
        "client": (peer_host, 54321) if peer_host else None,
        "server": ("testserver", 80),
    }
    return Request(scope)


def _trust(monkeypatch: pytest.MonkeyPatch, value: str) -> None:
    """Configure trusted proxies the way an operator does: through the environment."""
    monkeypatch.setenv("TRUSTED_PROXIES", value)


@pytest.fixture(autouse=True)
def env_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    """Resolve settings against a throwaway .env that starts out non-existent.

    Yields the path so a test can write it and exercise file-based configuration.
    """
    monkeypatch.delenv("TRUSTED_PROXIES", raising=False)
    path = tmp_path / ".env"
    monkeypatch.setitem(config.EnvSettings.model_config, "env_file", path)
    config.reset_settings_cache()
    yield path
    config.reset_settings_cache()


def _count_env_resolutions(monkeypatch: pytest.MonkeyPatch) -> list[str]:
    """Record every build of settings from the environment: one .env parse each."""
    builds: list[str] = []

    class CountingEnvSettings(config.EnvSettings):
        def __init__(self, **kwargs: Any) -> None:
            builds.append("parse")
            super().__init__(**kwargs)

    monkeypatch.setattr(config, "EnvSettings", CountingEnvSettings)
    return builds


class TestTrustedProxyConfiguration:
    """TRUSTED_PROXIES must be a real, declared, documented setting."""

    def test_trusted_proxies_is_a_declared_setting(self) -> None:
        # EnvSettings uses extra="ignore", so an undeclared name is silently dropped
        # and the whole trusted-proxy model ships inert.
        assert "TRUSTED_PROXIES" in config.EnvSettings.model_fields

    def test_configuration_from_the_env_file_is_honoured(self, env_file: Path) -> None:
        env_file.write_text("TRUSTED_PROXIES=10.0.0.0/8\n")

        request = _make_request("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})

        assert get_trusted_proxies() == (ip_network("10.0.0.0/8"),)
        assert get_http_client_ip(request) == "203.0.113.9"

    def test_configuration_from_the_environment_is_honoured(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")

        request = _make_request("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})

        assert get_http_client_ip(request) == "203.0.113.9"

    def test_comma_separated_list_parses_into_ip_networks(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, " 10.0.0.0/8 , 192.168.0.0/16 ,, 2001:db8::/32 ")

        configured = config.Settings.TRUSTED_PROXIES

        assert configured == (
            ip_network("10.0.0.0/8"),
            ip_network("192.168.0.0/16"),
            ip_network("2001:db8::/32"),
        )

    def test_bare_address_is_accepted_as_a_single_host_network(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.5")

        assert get_trusted_proxies() == (ip_network("10.0.0.5/32"),)

    def test_host_bits_are_tolerated(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Operators write the proxy's own address with the subnet mask all the time.
        _trust(monkeypatch, "10.1.2.3/8")

        assert get_trusted_proxies() == (ip_network("10.0.0.0/8"),)

    def test_default_is_to_trust_nothing(self) -> None:
        assert get_trusted_proxies() == ()
        assert config.Settings.TRUSTED_PROXIES == ()

    def test_malformed_entry_is_rejected_loudly(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Silently dropping a typo is how this setting shipped inert in the first
        # place; a misconfigured proxy list must stop the process, not degrade.
        _trust(monkeypatch, "10.0.0.0/8, nonsense")

        with pytest.raises(ValidationError, match="nonsense"):
            get_trusted_proxies()

    def test_env_example_documents_the_setting(self) -> None:
        example = (Path(config.__file__).resolve().parents[2] / ".env.example").read_text()

        assert "TRUSTED_PROXIES" in example


class TestUntrustedPeer:
    """Without a trusted proxy in front, X-Forwarded-For is attacker-controlled."""

    def test_spoofed_forwarded_header_is_ignored_on_websocket(self) -> None:
        websocket = _make_websocket("198.51.100.7", {"x-forwarded-for": "1.2.3.4"})

        assert get_client_ip(websocket) == "198.51.100.7"

    def test_spoofed_forwarded_header_is_ignored_on_http(self) -> None:
        request = _make_request("198.51.100.7", {"x-forwarded-for": "1.2.3.4"})

        assert get_http_client_ip(request) == "198.51.100.7"

    def test_spoofed_chain_is_ignored_entirely(self) -> None:
        websocket = _make_websocket(
            "198.51.100.7", {"x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12"}
        )

        assert get_client_ip(websocket) == "198.51.100.7"

    def test_default_configuration_trusts_nothing(self) -> None:
        request = _make_request("198.51.100.7", {"x-forwarded-for": "1.2.3.4"})

        assert get_http_client_ip(request) == "198.51.100.7"

    def test_missing_socket_peer_falls_back_to_unknown(self) -> None:
        websocket = _make_websocket(None, {"x-forwarded-for": "1.2.3.4"})

        assert get_client_ip(websocket) == "unknown"


class TestTrustedPeer:
    """With the peer in the trusted list, X-Forwarded-For carries the real client."""

    def test_forwarded_header_is_honoured_for_trusted_peer(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        websocket = _make_websocket("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})

        assert get_client_ip(websocket) == "203.0.113.9"

    def test_forwarded_header_is_honoured_on_http_limiter_key(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        request = _make_request("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})

        assert get_http_client_ip(request) == "203.0.113.9"

    def test_two_clients_behind_one_proxy_get_distinct_keys(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        first = _make_request("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})
        second = _make_request("10.0.0.5", {"x-forwarded-for": "203.0.113.10"})

        assert get_http_client_ip(first) != get_http_client_ip(second)

    def test_exact_address_entry_is_supported(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _trust(monkeypatch, "10.0.0.5")
        trusted = _make_websocket("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})
        untrusted = _make_websocket("10.0.0.6", {"x-forwarded-for": "203.0.113.9"})

        assert get_client_ip(trusted) == "203.0.113.9"
        assert get_client_ip(untrusted) == "10.0.0.6"


class TestForwardedChain:
    """A multi-hop chain resolves to the right-most address we did not vouch for."""

    def test_rightmost_untrusted_hop_wins(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _trust(monkeypatch, "10.0.0.0/8, 192.168.0.0/16")
        websocket = _make_websocket(
            "10.0.0.5",
            {"x-forwarded-for": "1.2.3.4, 203.0.113.9, 192.168.1.1"},
        )

        assert get_client_ip(websocket) == "203.0.113.9"

    def test_fully_trusted_chain_resolves_to_the_origin_hop(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8, 192.168.0.0/16")
        websocket = _make_websocket(
            "10.0.0.5",
            {"x-forwarded-for": "192.168.4.4, 10.0.0.9, 192.168.1.1"},
        )

        assert get_client_ip(websocket) == "192.168.4.4"

    @pytest.mark.parametrize(
        "forwarded",
        [
            "203.0.113.9",
            "not-an-ip, 203.0.113.9",
            "unknown, 203.0.113.9",
            "203.0.113.1:5555, 203.0.113.9",
            "[2001:db8::1], 203.0.113.9",
            '"unknown", 203.0.113.9',
            "_obfuscated, 203.0.113.9",
        ],
    )
    def test_unparseable_hop_is_skipped_not_fatal(
        self, monkeypatch: pytest.MonkeyPatch, forwarded: str
    ) -> None:
        # Abandoning the chain on one bad hop lets any client prepend a junk token
        # to force itself onto the shared proxy bucket.
        _trust(monkeypatch, "10.0.0.0/8")
        websocket = _make_websocket("10.0.0.5", {"x-forwarded-for": forwarded})

        assert get_client_ip(websocket) == "203.0.113.9"

    def test_junk_prefix_cannot_merge_clients_onto_the_proxy_bucket(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        first = _make_request("10.0.0.5", {"x-forwarded-for": "junk, 203.0.113.9"})
        second = _make_request("10.0.0.5", {"x-forwarded-for": "junk, 198.51.100.4"})

        assert get_http_client_ip(first) == "203.0.113.9"
        assert get_http_client_ip(second) == "198.51.100.4"

    @pytest.mark.parametrize(
        ("forwarded", "expected"),
        [
            # Azure Front Door and some ALB/NLB configurations emit ip:port.
            ("203.0.113.1:5555, 10.0.0.9", "203.0.113.1"),
            ("[2001:db8::1]:443, 10.0.0.9", "2001:db8::1"),
            ("[2001:db8::1], 10.0.0.9", "2001:db8::1"),
            ("2001:db8::1, 10.0.0.9", "2001:db8::1"),
        ],
    )
    def test_load_balancer_hop_shapes_are_normalised(
        self, monkeypatch: pytest.MonkeyPatch, forwarded: str, expected: str
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        websocket = _make_websocket("10.0.0.5", {"x-forwarded-for": forwarded})

        assert get_client_ip(websocket) == expected

    def test_chain_without_any_parseable_hop_falls_back_to_socket_peer(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        websocket = _make_websocket("10.0.0.5", {"x-forwarded-for": "unknown, garbage"})

        assert get_client_ip(websocket) == "10.0.0.5"

    def test_empty_forwarded_header_falls_back_to_socket_peer(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        websocket = _make_websocket("10.0.0.5", {"x-forwarded-for": "   "})

        assert get_client_ip(websocket) == "10.0.0.5"

    def test_ipv6_hop_is_normalised(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        websocket = _make_websocket(
            "10.0.0.5", {"x-forwarded-for": "2001:0db8:0000:0000:0000:0000:0000:0001"}
        )

        assert get_client_ip(websocket) == "2001:db8::1"

    def test_trusted_ipv6_proxy_hop_is_walked_past(self, monkeypatch: pytest.MonkeyPatch) -> None:
        _trust(monkeypatch, "10.0.0.0/8, 2001:db8::/32")
        websocket = _make_websocket(
            "10.0.0.5", {"x-forwarded-for": "203.0.113.9, [2001:db8::1]:443"}
        )

        assert get_client_ip(websocket) == "203.0.113.9"


class TestHttpWebSocketParity:
    """Both surfaces must derive the same identity from the same request shape."""

    @pytest.mark.parametrize(
        ("trusted", "peer", "forwarded"),
        [
            ("", "198.51.100.7", "1.2.3.4"),
            ("10.0.0.0/8", "10.0.0.5", "203.0.113.9"),
            ("10.0.0.0/8, 192.168.0.0/16", "10.0.0.5", "1.2.3.4, 203.0.113.9, 192.168.1.1"),
            ("10.0.0.0/8", "10.0.0.5", "not-an-ip, 203.0.113.9"),
            ("10.0.0.0/8", "10.0.0.5", "203.0.113.1:5555, 10.0.0.9"),
            ("10.0.0.0/8", "10.0.0.5", "unknown, garbage"),
        ],
    )
    def test_http_and_websocket_agree(
        self,
        monkeypatch: pytest.MonkeyPatch,
        trusted: str,
        peer: str,
        forwarded: str,
    ) -> None:
        _trust(monkeypatch, trusted)
        headers = {"x-forwarded-for": forwarded}

        assert get_http_client_ip(_make_request(peer, headers)) == get_client_ip(
            _make_websocket(peer, headers)
        )

    def test_both_surfaces_delegate_to_the_same_resolver(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        headers = {"x-forwarded-for": "203.0.113.9"}

        assert resolve_client_ip(_make_request("10.0.0.5", headers)) == "203.0.113.9"
        assert resolve_client_ip(_make_websocket("10.0.0.5", headers)) == "203.0.113.9"


class TestSettingsResolutionIsCached:
    """Resolving a rate-limit key reads settings; it must not re-parse .env each time.

    Settings are read on every request and on every Monte Carlo batch, so an
    uncached read turns a plain attribute access into a synchronous disk read on
    the hot path.
    """

    def test_repeated_key_resolution_parses_the_environment_once(
        self, monkeypatch: pytest.MonkeyPatch, env_file: Path
    ) -> None:
        env_file.write_text("TRUSTED_PROXIES=10.0.0.0/8\n")
        builds = _count_env_resolutions(monkeypatch)
        config.reset_settings_cache()
        request = _make_request("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})

        for _ in range(20):
            assert get_http_client_ip(request) == "203.0.113.9"

        assert len(builds) == 1

    def test_repeated_class_attribute_reads_parse_the_environment_once(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # monte_carlo.py reads Settings.MAX_SIMULATIONS once per simulation call.
        builds = _count_env_resolutions(monkeypatch)
        config.reset_settings_cache()

        for _ in range(20):
            assert config.Settings.MAX_SIMULATIONS == 10000

        assert len(builds) == 1

    def test_reset_settings_cache_forces_a_fresh_parse(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        builds = _count_env_resolutions(monkeypatch)
        config.reset_settings_cache()

        assert get_trusted_proxies() == ()
        config.reset_settings_cache()
        assert get_trusted_proxies() == ()

        assert len(builds) == 2

    def test_environment_change_is_picked_up_without_a_manual_reset(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        # Caching must not freeze configuration; the cache keys off what it read.
        request = _make_request("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})
        assert get_http_client_ip(request) == "10.0.0.5"

        _trust(monkeypatch, "10.0.0.0/8")

        assert get_http_client_ip(request) == "203.0.113.9"

    def test_env_file_change_is_picked_up_after_a_reset(self, env_file: Path) -> None:
        env_file.write_text("TRUSTED_PROXIES=10.0.0.0/8\n")
        assert get_trusted_proxies() == (ip_network("10.0.0.0/8"),)

        env_file.write_text("TRUSTED_PROXIES=\n")
        config.reset_settings_cache()

        assert get_trusted_proxies() == ()


class TestLimiterWiring:
    """The limiter must actually use the shared resolver, not the raw socket peer."""

    def test_limiter_key_func_is_the_trusted_proxy_resolver(self) -> None:
        assert limiter._key_func is get_http_client_ip

    def test_limiter_key_func_exposes_a_request_parameter(self) -> None:
        # slowapi only forwards the request when the key func's parameter is named "request".
        assert "request" in inspect.signature(limiter._key_func).parameters

    def test_limiter_key_separates_clients_behind_a_trusted_proxy(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        _trust(monkeypatch, "10.0.0.0/8")
        first = _make_request("10.0.0.5", {"x-forwarded-for": "203.0.113.9"})
        second = _make_request("10.0.0.5", {"x-forwarded-for": "198.51.100.4"})

        assert limiter._key_func(first) == "203.0.113.9"
        assert limiter._key_func(second) == "198.51.100.4"
