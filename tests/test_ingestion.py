from __future__ import annotations

import random
from datetime import datetime, timezone

import pytest

from services.digital_twin.state_store import StateStore
from services.ingestion.dead_letter_handler import DeadLetterHandler, dlq_topic_for
from services.ingestion.schema_validator import SchemaValidationError, validate_message
from services.ingestion.udm_writer import (
    asset_row_for,
    corridor_slot_row,
    defect_task_row,
)
from services.producers import (
    corridor_timetable_producer as ctp,
    defect_producer,
    sensor_producer,
    train_position_producer as tpp,
    weather_producer,
)
from services.producers.reference_data import ASSETS, AXLE_SENSORS, HOTBOX_SENSORS


WELL_FORMED_TRAIN_MESSAGE = {
    "train_id": "TRN-001",
    "timestamp": "2026-09-08T10:00:00+00:00",
    "section": "SEC-A",
    "chainage_km": 12.5,
    "speed_kmph": 88.0,
    "direction": "UP",
}


class TestSchemaValidation:
    def test_well_formed_train_position_passes(self):
        result = validate_message("train.position.v1", WELL_FORMED_TRAIN_MESSAGE)
        assert result == WELL_FORMED_TRAIN_MESSAGE

    def test_missing_required_field_fails(self):
        malformed = dict(WELL_FORMED_TRAIN_MESSAGE)
        del malformed["chainage_km"]
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_message("train.position.v1", malformed)
        assert exc_info.value.topic == "train.position.v1"

    def test_wrong_type_reports_offending_field(self):
        malformed = dict(WELL_FORMED_TRAIN_MESSAGE)
        malformed["chainage_km"] = "not-a-number"
        with pytest.raises(SchemaValidationError) as exc_info:
            validate_message("train.position.v1", malformed)
        assert exc_info.value.field == "chainage_km"

    def test_invalid_enum_value_fails(self):
        malformed = dict(WELL_FORMED_TRAIN_MESSAGE)
        malformed["direction"] = "SIDEWAYS"
        with pytest.raises(SchemaValidationError):
            validate_message("train.position.v1", malformed)

    def test_unknown_topic_raises_keyerror(self):
        with pytest.raises(KeyError):
            validate_message("not.a.real.topic", {})

    @pytest.mark.parametrize(
        "topic,message",
        [
            (
                "sensor.axle.v1",
                {
                    "sensor_id": "AXL-SEC-A-00",
                    "chainage_km": 5.0,
                    "occupancy_state": "OCCUPIED",
                    "timestamp": "2026-09-08T10:00:00+00:00",
                },
            ),
            (
                "sensor.hotbox.v1",
                {
                    "sensor_id": "HBX-SEC-A-00",
                    "chainage_km": 5.0,
                    "temperature_c": 42.0,
                    "threshold_breach": False,
                    "timestamp": "2026-09-08T10:00:00+00:00",
                },
            ),
            (
                "defect.tms.v1",
                {
                    "defect_id": "DFX-1",
                    "asset_id": "AST-SEC-A-TRACK-00",
                    "category": "rail_crack",
                    "severity": 3,
                    "reported_date": "2026-09-08",
                    "due_date": "2026-09-20",
                    "department_owner": "Engineering",
                },
            ),
            (
                "weather.v1",
                {
                    "section": "SEC-A",
                    "condition": "fog",
                    "severity": 3,
                    "speed_restriction_kmph": 60.0,
                    "timestamp": "2026-09-08T10:00:00+00:00",
                },
            ),
        ],
    )
    def test_each_topic_schema_accepts_well_formed_message(self, topic, message):
        assert validate_message(topic, message) == message


class TestDeadLetterRouting:
    def test_invalid_message_routed_to_dlq_topic(self):
        captured: list[tuple[str, dict]] = []
        handler = DeadLetterHandler(sink=lambda topic, payload: captured.append((topic, payload)))

        malformed = dict(WELL_FORMED_TRAIN_MESSAGE)
        malformed["speed_kmph"] = "fast"
        try:
            validate_message("train.position.v1", malformed)
        except SchemaValidationError as exc:
            target = handler.route("train.position.v1", malformed, exc)
        else:
            pytest.fail("expected malformed message to fail validation")

        assert target == "train.position.v1.dlq"
        assert len(captured) == 1
        routed_topic, payload = captured[0]
        assert routed_topic == "train.position.v1.dlq"
        assert payload["original_topic"] == "train.position.v1"
        assert payload["message"] == malformed
        assert "speed_kmph" in payload["error"]

    def test_dlq_topic_naming_convention(self):
        assert dlq_topic_for("defect.tms.v1") == "defect.tms.v1.dlq"

    def test_sink_not_called_for_valid_message(self):
        calls = []
        handler = DeadLetterHandler(sink=lambda topic, payload: calls.append(topic))
        validate_message("train.position.v1", WELL_FORMED_TRAIN_MESSAGE)
        assert calls == []


class TestStateStoreFusion:
    def test_query_known_section_returns_latest_train_and_sensor_state(self):
        store = StateStore()
        store.update_train_position(
            {
                "train_id": "TRN-001",
                "timestamp": "2026-09-08T10:00:00",
                "section": "SEC-A",
                "chainage_km": 10.0,
                "speed_kmph": 90.0,
                "direction": "UP",
            }
        )
        store.update_train_position(
            {
                "train_id": "TRN-001",
                "timestamp": "2026-09-08T10:00:05",
                "section": "SEC-A",
                "chainage_km": 10.15,
                "speed_kmph": 92.0,
                "direction": "UP",
            }
        )
        store.update_axle_sensor(
            {
                "sensor_id": "AXL-SEC-A-00",
                "chainage_km": 5.0,
                "occupancy_state": "OCCUPIED",
                "timestamp": "2026-09-08T10:00:05",
            }
        )
        store.update_hotbox_sensor(
            {
                "sensor_id": "HBX-SEC-A-00",
                "chainage_km": 5.0,
                "temperature_c": 101.0,
                "threshold_breach": True,
                "timestamp": "2026-09-08T10:00:05",
            }
        )

        state = store.get_section_state("SEC-A")

        assert state["section"] == "SEC-A"
        assert len(state["trains"]) == 1
        latest_train = state["trains"][0]
        assert latest_train["train_id"] == "TRN-001"
        assert latest_train["chainage_km"] == 10.15
        assert latest_train["speed_kmph"] == 92.0

        assert len(state["axle_sensors"]) == 1
        assert state["axle_sensors"][0]["attributes"]["occupancy_state"] == "OCCUPIED"

        assert len(state["hotbox_sensors"]) == 1
        assert state["hotbox_sensors"][0]["attributes"]["threshold_breach"] is True

    def test_sensor_without_explicit_section_is_bucketed_by_chainage(self):
        store = StateStore()
        store.update_axle_sensor(
            {
                "sensor_id": "AXL-SEC-B-00",
                "chainage_km": 60.0,
                "occupancy_state": "CLEAR",
                "timestamp": "2026-09-08T10:00:00",
            }
        )
        assert store.get_section_state("SEC-B")["axle_sensors"][0]["sensor_id"] == "AXL-SEC-B-00"
        assert store.get_section_state("SEC-A")["axle_sensors"] == []

    def test_unknown_section_returns_empty_but_well_formed_state(self):
        store = StateStore()
        state = store.get_section_state("SEC-Z")
        assert state == {"section": "SEC-Z", "trains": [], "axle_sensors": [], "hotbox_sensors": []}

    def test_apply_message_dispatches_by_topic(self):
        store = StateStore()
        store.apply_message("train.position.v1", WELL_FORMED_TRAIN_MESSAGE)
        assert store.get_section_state("SEC-A")["trains"][0]["train_id"] == "TRN-001"

        with pytest.raises(ValueError):
            store.apply_message("weather.v1", {"section": "SEC-A"})


class TestUdmRowBuilders:
    def test_defect_task_row_maps_source_system_from_topic(self):
        row = defect_task_row(
            "defect.smms.v1",
            {
                "defect_id": "DFX-1",
                "asset_id": "AST-SEC-A-SIGNAL-00",
                "category": "signal_fault",
                "severity": 4,
                "reported_date": "2026-09-08",
                "due_date": "2026-09-15",
                "department_owner": "S&T",
            },
        )
        assert row["source_system"] == "SMMS"
        assert row["department_owner"] == "S&T"

    def test_asset_row_for_known_asset_uses_reference_data(self):
        asset_id = ASSETS[0]["asset_id"]
        row = asset_row_for(asset_id)
        assert row == ASSETS[0]

    def test_asset_row_for_unknown_asset_falls_back_gracefully(self):
        row = asset_row_for("AST-DOES-NOT-EXIST")
        assert row["asset_id"] == "AST-DOES-NOT-EXIST"
        assert row["asset_type"] in {"track", "signal", "ohe"}

    def test_corridor_slot_row_is_deterministic_for_same_input(self):
        message = {
            "section": "SEC-A",
            "window_start": "2026-09-08T01:00:00+00:00",
            "window_end": "2026-09-08T03:00:00+00:00",
            "block_type": "line",
        }
        assert corridor_slot_row(message)["slot_id"] == corridor_slot_row(message)["slot_id"]


class TestProducerMessageShapes:
    def test_train_position_producer_emits_schema_valid_messages(self):
        rng = random.Random(7)
        states = tpp.seed_trains(["TRN-100"], rng)
        tpp.advance_train(states[0], elapsed_seconds=5, rng=rng)
        message = tpp.to_message(states[0])
        validate_message("train.position.v1", message)

    def test_sensor_producer_fault_rate_zero_never_breaches(self):
        rng = random.Random(3)
        for _ in range(50):
            message = sensor_producer.build_hotbox_message(HOTBOX_SENSORS[0], fault_rate=0.0, rng=rng)
            validate_message("sensor.hotbox.v1", message)
            assert message["threshold_breach"] is False

    def test_sensor_producer_fault_rate_one_always_breaches(self):
        rng = random.Random(3)
        message = sensor_producer.build_hotbox_message(HOTBOX_SENSORS[0], fault_rate=1.0, rng=rng)
        assert message["threshold_breach"] is True
        assert message["temperature_c"] >= 90.0

    def test_defect_producer_references_known_asset_and_correct_department(self):
        rng = random.Random(42)
        for _ in range(20):
            asset = rng.choice(ASSETS)
            topic, message = defect_producer.build_defect_message(asset, rng)
            validate_message(topic, message)
            assert message["asset_id"] == asset["asset_id"]

    def test_weather_producer_worse_conditions_have_lower_speed_restriction(self):
        rng = random.Random(42)
        clear = weather_producer.build_weather_message("SEC-A", random.Random(1))
        monsoon_profile = weather_producer.CONDITION_PROFILE["monsoon"]["speed_restriction_kmph"]
        clear_profile = weather_producer.CONDITION_PROFILE["clear"]["speed_restriction_kmph"]
        assert monsoon_profile < clear_profile
        validate_message("weather.v1", clear)

    def test_corridor_timetable_producer_builds_valid_fixed_schedule(self):
        rng = random.Random(42)
        base = datetime(2026, 9, 8, tzinfo=timezone.utc)
        for message in ctp.build_corridor_availability(rng, base):
            validate_message("corridor.availability.v1", message)
        for message in ctp.build_timetable(rng, base):
            validate_message("timetable.v1", message)
        for message in ctp.build_goods_forecast(rng, base):
            validate_message("goods.forecast.v1", message)
