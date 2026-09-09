from __future__ import annotations

from services.digital_twin.api import DigitalTwinApi
from services.digital_twin.state_store import StateStore
from services.digital_twin.weather_store import WeatherStore
from services.planning_api.live_feed import LIVE_FEED_TOPICS, route_message


class TestRouteMessage:
    def test_train_position_updates_the_digital_twin(self):
        twin = DigitalTwinApi(StateStore())
        weather = WeatherStore()
        message = {
            "train_id": "TRN-900",
            "section": "SEC-A",
            "chainage_km": 12.0,
            "speed_kmph": 80.0,
            "direction": "UP",
            "timestamp": "2026-01-01T00:00:00+00:00",
        }

        route_message("train.position.v1", message, twin=twin, weather=weather)

        section_state = twin.get_section_state("SEC-A")
        assert [t["train_id"] for t in section_state["trains"]] == ["TRN-900"]

    def test_weather_updates_the_weather_store_not_the_twin(self):
        twin = DigitalTwinApi(StateStore())
        weather = WeatherStore()
        message = {
            "section": "SEC-B",
            "condition": "fog",
            "severity": 4,
            "speed_restriction_kmph": 30.0,
            "timestamp": "2026-01-01T00:00:00+00:00",
        }

        route_message("weather.v1", message, twin=twin, weather=weather)

        assert weather.effective_speed_restriction_kmph("SEC-B") == 30.0
        assert twin.get_network_state()["SEC-B"]["trains"] == []

    def test_live_feed_topics_cover_every_digital_twin_and_weather_topic(self):
        assert set(LIVE_FEED_TOPICS) == {
            "train.position.v1",
            "sensor.axle.v1",
            "sensor.hotbox.v1",
            "weather.v1",
        }
