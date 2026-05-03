"""Backend tests for Submit Result / Round-Robin score submission.

Covers:
- /api/weekly-events/with-schedules route (regression: must NOT collide with /weekly-events/{event_id})
- POST /api/weekly-events/{event_id}/submit-score (admin + non-admin allowed, validation, edits)
- solo_players.wins +1/undo behavior on edits
- Regression: GET /weekly-events/upcoming, GET /weekly-events/{event_id}
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tennis-gents.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@tennis.com"
ADMIN_PASSWORD = "admin123"


# ---------------- Fixtures ----------------

@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def member_creds():
    """Register (or reuse) a non-admin member for permission testing."""
    email = f"TEST_member_{uuid.uuid4().hex[:8]}@tennis.com"
    password = "tennis2025"
    name = f"TEST_Member_{uuid.uuid4().hex[:6]}"
    r = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "name": name, "phone": "555-0100", "password": password},
        timeout=30,
    )
    assert r.status_code == 200, f"Member register failed: {r.status_code} {r.text}"
    data = r.json()
    return {"email": email, "password": password, "token": data["token"], "user": data["user"]}


@pytest.fixture(scope="session")
def member_headers(member_creds):
    return {"Authorization": f"Bearer {member_creds['token']}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def seeded_event(admin_headers):
    """Find the seeded event with a generated_schedule (newest first)."""
    r = requests.get(f"{BASE_URL}/api/weekly-events/with-schedules", headers=admin_headers, timeout=30)
    assert r.status_code == 200, f"with-schedules failed: {r.status_code} {r.text}"
    events = r.json()
    assert isinstance(events, list) and len(events) > 0, "No events with schedules seeded"
    return events[0]


def _get_player_wins(admin_headers, player_id):
    r = requests.get(f"{BASE_URL}/api/solo-ladder", headers=admin_headers, timeout=30)
    assert r.status_code == 200
    for p in r.json():
        if p.get("id") == player_id:
            return p.get("wins", 0)
    return None


# ---------------- 1) Route ordering / regression ----------------

class TestRouteOrdering:
    def test_with_schedules_not_treated_as_event_id(self, admin_headers):
        """The literal route /weekly-events/with-schedules must resolve and return a list,
        NOT a 404 'Event not found' from the {event_id} handler."""
        r = requests.get(f"{BASE_URL}/api/weekly-events/with-schedules", headers=admin_headers, timeout=30)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert isinstance(body, list), f"Expected list, got {type(body).__name__}"
        # If any events present, validate shape
        if body:
            ev = body[0]
            for k in ("id", "event_date", "generated_schedule"):
                assert k in ev, f"Missing field {k} in with-schedules response"
            assert isinstance(ev["generated_schedule"], list)

    def test_with_schedules_newest_first(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/weekly-events/with-schedules", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        events = r.json()
        if len(events) >= 2:
            dates = [e["event_date"] for e in events]
            assert dates == sorted(dates, reverse=True), f"Not newest-first: {dates}"

    def test_with_schedules_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/weekly-events/with-schedules", timeout=30)
        assert r.status_code in (401, 403), f"Expected auth required, got {r.status_code}"

    def test_upcoming_regression(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/weekly-events/upcoming", headers=admin_headers, timeout=30)
        assert r.status_code == 200, f"upcoming endpoint regressed: {r.status_code} {r.text}"
        assert isinstance(r.json(), list)

    def test_get_event_by_id_regression(self, admin_headers, seeded_event):
        eid = seeded_event["id"]
        r = requests.get(f"{BASE_URL}/api/weekly-events/{eid}", headers=admin_headers, timeout=30)
        assert r.status_code == 200, f"GET by id regressed: {r.status_code} {r.text}"
        body = r.json()
        assert body["id"] == eid
        assert "generated_schedule" in body


# ---------------- 2) Submit-score validation ----------------

class TestSubmitScoreValidation:
    def test_404_when_event_id_not_found(self, admin_headers):
        bogus = "nonexistent-" + uuid.uuid4().hex
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{bogus}/submit-score",
            json={"round_num": 1, "court": 1, "score_a": 6, "score_b": 4},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_404_when_round_not_found(self, admin_headers, seeded_event):
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": 999, "court": 1, "score_a": 6, "score_b": 4},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 for missing round, got {r.status_code}: {r.text}"
        assert "Round" in r.text

    def test_404_when_court_not_found(self, admin_headers, seeded_event):
        round_num = seeded_event["generated_schedule"][0]["round"]
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": round_num, "court": 99, "score_a": 6, "score_b": 4},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 for missing court, got {r.status_code}: {r.text}"
        assert "court" in r.text.lower() or "Match" in r.text

    def test_400_when_scores_equal(self, admin_headers, seeded_event):
        sched = seeded_event["generated_schedule"]
        round_num = sched[0]["round"]
        court = sched[0]["matches"][0]["court"]
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": round_num, "court": court, "score_a": 5, "score_b": 5},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 for tie, got {r.status_code}: {r.text}"

    def test_400_when_score_negative(self, admin_headers, seeded_event):
        sched = seeded_event["generated_schedule"]
        round_num = sched[0]["round"]
        court = sched[0]["matches"][0]["court"]
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": round_num, "court": court, "score_a": -1, "score_b": 4},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 for negative score, got {r.status_code}: {r.text}"

    def test_400_when_score_too_high(self, admin_headers, seeded_event):
        sched = seeded_event["generated_schedule"]
        round_num = sched[0]["round"]
        court = sched[0]["matches"][0]["court"]
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": round_num, "court": court, "score_a": 21, "score_b": 4},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 for score>20, got {r.status_code}: {r.text}"


# ---------------- 3) Wins delta on submit + edit ----------------

class TestWinsDelta:
    def test_admin_submit_unscored_match_increments_winner_wins(self, admin_headers, seeded_event):
        """Submit a fresh match (round 2) and assert winner team gets +1 wins, losers unchanged."""
        # Refresh event to get current state
        r = requests.get(f"{BASE_URL}/api/weekly-events/{seeded_event['id']}", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        ev = r.json()
        # Find an unscored match
        target = None
        for rd in ev["generated_schedule"]:
            for m in rd["matches"]:
                if m.get("score_a") is None:
                    target = (rd["round"], m)
                    break
            if target:
                break
        if not target:
            pytest.skip("No unscored match available; test_edit will cover delta logic")

        round_num, match = target
        team_a_ids = [p["id"] for p in match["team_a"]]
        team_b_ids = [p["id"] for p in match["team_b"]]

        before_a = [_get_player_wins(admin_headers, pid) for pid in team_a_ids]
        before_b = [_get_player_wins(admin_headers, pid) for pid in team_b_ids]

        # A wins
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": round_num, "court": match["court"], "score_a": 6, "score_b": 3},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, f"submit-score failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("ok") is True
        assert body.get("winner") == "a"
        assert body.get("score_a") == 6 and body.get("score_b") == 3

        after_a = [_get_player_wins(admin_headers, pid) for pid in team_a_ids]
        after_b = [_get_player_wins(admin_headers, pid) for pid in team_b_ids]

        for ba, aa in zip(before_a, after_a):
            assert aa == ba + 1, f"Winner wins not incremented: {ba} -> {aa}"
        for bb, ab in zip(before_b, after_b):
            assert ab == bb, f"Loser wins changed: {bb} -> {ab}"

    def test_edit_score_undoes_prev_winner_and_applies_new(self, admin_headers, seeded_event):
        """Already-scored match: flip the winner. Old winners -1, new winners +1.
        Net for both teams should be a swap, not double-count."""
        # Refresh event to find a scored match
        r = requests.get(f"{BASE_URL}/api/weekly-events/{seeded_event['id']}", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        ev = r.json()
        target = None
        for rd in ev["generated_schedule"]:
            for m in rd["matches"]:
                if m.get("score_a") is not None and m.get("score_b") is not None:
                    target = (rd["round"], m)
                    break
            if target:
                break
        assert target is not None, "Need a scored match to test edit logic"
        round_num, match = target
        team_a_ids = [p["id"] for p in match["team_a"]]
        team_b_ids = [p["id"] for p in match["team_b"]]
        prev_winner_a = match["score_a"] > match["score_b"]

        before_a = [_get_player_wins(admin_headers, pid) for pid in team_a_ids]
        before_b = [_get_player_wins(admin_headers, pid) for pid in team_b_ids]

        # Flip the result
        new_a, new_b = (3, 6) if prev_winner_a else (6, 3)
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": round_num, "court": match["court"], "score_a": new_a, "score_b": new_b},
            headers=admin_headers, timeout=30,
        )
        assert r.status_code == 200, f"edit submit failed: {r.status_code} {r.text}"
        new_winner = r.json()["winner"]
        assert new_winner == ("b" if prev_winner_a else "a")

        after_a = [_get_player_wins(admin_headers, pid) for pid in team_a_ids]
        after_b = [_get_player_wins(admin_headers, pid) for pid in team_b_ids]

        if prev_winner_a:
            # A was winner, now B wins: A should -1, B should +1
            for ba, aa in zip(before_a, after_a):
                assert aa == ba - 1, f"Prev winner A wins not decremented: {ba} -> {aa}"
            for bb, ab in zip(before_b, after_b):
                assert ab == bb + 1, f"New winner B wins not incremented: {bb} -> {ab}"
        else:
            for ba, aa in zip(before_a, after_a):
                assert aa == ba + 1, f"New winner A wins not incremented: {ba} -> {aa}"
            for bb, ab in zip(before_b, after_b):
                assert ab == bb - 1, f"Prev winner B wins not decremented: {bb} -> {ab}"

        # Restore back to original to keep test idempotent
        restore_a, restore_b = (6, 3) if prev_winner_a else (3, 6)
        rr = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": round_num, "court": match["court"], "score_a": restore_a, "score_b": restore_b},
            headers=admin_headers, timeout=30,
        )
        assert rr.status_code == 200


# ---------------- 4) Non-admin permission ----------------

class TestNonAdminCanSubmit:
    def test_member_can_submit_score(self, admin_headers, member_headers, seeded_event):
        # Use any match (re-update), member should succeed (any logged-in user allowed)
        sched = seeded_event["generated_schedule"]
        round_num = sched[0]["round"]
        court = sched[0]["matches"][0]["court"]
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": round_num, "court": court, "score_a": 6, "score_b": 2},
            headers=member_headers, timeout=30,
        )
        assert r.status_code == 200, f"Non-admin submit failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("ok") is True

        # Verify via GET that score was persisted and submitted_by_name reflects member
        g = requests.get(f"{BASE_URL}/api/weekly-events/{seeded_event['id']}", headers=admin_headers, timeout=30)
        assert g.status_code == 200
        for rd in g.json()["generated_schedule"]:
            if rd["round"] == round_num:
                for m in rd["matches"]:
                    if m["court"] == court:
                        assert m["score_a"] == 6 and m["score_b"] == 2
                        assert m.get("submitted_by_name")  # not empty

    def test_unauthenticated_cannot_submit(self, seeded_event):
        sched = seeded_event["generated_schedule"]
        r = requests.post(
            f"{BASE_URL}/api/weekly-events/{seeded_event['id']}/submit-score",
            json={"round_num": sched[0]["round"], "court": sched[0]["matches"][0]["court"], "score_a": 6, "score_b": 4},
            timeout=30,
        )
        assert r.status_code in (401, 403), f"Expected auth required, got {r.status_code}"
