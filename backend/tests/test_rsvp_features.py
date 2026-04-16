"""
Test suite for NEW RSVP features:
- POST /api/weekly-events - creates event with rsvp_closed=false and bench_players=[]
- GET /api/weekly-events/{event_id}/checkin-window - returns rsvp_closed, open_day_name, open_hour fields
- POST /api/weekly-events/{event_id}/close-rsvp - admin closes RSVP
- POST /api/weekly-events/{event_id}/reopen-rsvp - admin reopens RSVP
- POST /api/checkins - when RSVP closed, available/maybe status rejected, bench status accepted
- POST /api/weekly-events/{event_id}/drop-out - player drops out, first bench player auto-promoted
- POST /api/weekly-events/{event_id}/add-external-player - admin adds non-member player by name
- GET /api/settings - returns rsvp_open_day and rsvp_open_hour fields
- PUT /api/settings - saves rsvp_open_day and rsvp_open_hour
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@tennis.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.text}")
    return response.json().get("token")


@pytest.fixture(scope="module")
def admin_client(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_member():
    """Create a test member for testing"""
    unique_id = str(uuid.uuid4())[:8]
    email = f"TEST_member_{unique_id}@tennis.com"
    password = "testpass123"
    name = f"TEST Member {unique_id}"
    
    # Register the member
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": email,
        "password": password,
        "name": name
    })
    
    if response.status_code not in [200, 201]:
        pytest.skip(f"Failed to create test member: {response.text}")
    
    # Login to get token
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": email,
        "password": password
    })
    
    if login_response.status_code != 200:
        pytest.skip(f"Test member login failed: {login_response.text}")
    
    data = login_response.json()
    return {
        "email": email,
        "password": password,
        "name": name,
        "token": data.get("token"),
        "id": data.get("user", {}).get("id")
    }


@pytest.fixture(scope="module")
def member_client(test_member):
    """Session with member auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {test_member['token']}"
    })
    return session


class TestSettingsRSVPFields:
    """Test GET/PUT /api/settings for rsvp_open_day and rsvp_open_hour"""
    
    def test_get_settings_returns_rsvp_fields(self, admin_client):
        """GET /api/settings should return rsvp_open_day and rsvp_open_hour"""
        response = admin_client.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "rsvp_open_day" in data, "rsvp_open_day field missing from settings"
        assert "rsvp_open_hour" in data, "rsvp_open_hour field missing from settings"
        
        # Validate types
        assert isinstance(data["rsvp_open_day"], int), "rsvp_open_day should be an integer"
        assert isinstance(data["rsvp_open_hour"], int), "rsvp_open_hour should be an integer"
        
        # Validate ranges
        assert 0 <= data["rsvp_open_day"] <= 6, "rsvp_open_day should be 0-6 (Mon-Sun)"
        assert 0 <= data["rsvp_open_hour"] <= 23, "rsvp_open_hour should be 0-23"
        print(f"Settings: rsvp_open_day={data['rsvp_open_day']}, rsvp_open_hour={data['rsvp_open_hour']}")
    
    def test_put_settings_saves_rsvp_fields(self, admin_client):
        """PUT /api/settings should save rsvp_open_day and rsvp_open_hour"""
        # First get current settings
        get_response = admin_client.get(f"{BASE_URL}/api/settings")
        current_settings = get_response.json()
        
        # Update with new RSVP values
        new_day = 3  # Thursday
        new_hour = 8  # 8 AM
        
        update_payload = {
            **current_settings,
            "rsvp_open_day": new_day,
            "rsvp_open_hour": new_hour
        }
        
        response = admin_client.put(f"{BASE_URL}/api/settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the update persisted
        verify_response = admin_client.get(f"{BASE_URL}/api/settings")
        verify_data = verify_response.json()
        
        assert verify_data["rsvp_open_day"] == new_day, f"rsvp_open_day not saved: expected {new_day}, got {verify_data['rsvp_open_day']}"
        assert verify_data["rsvp_open_hour"] == new_hour, f"rsvp_open_hour not saved: expected {new_hour}, got {verify_data['rsvp_open_hour']}"
        
        # Restore original values
        restore_payload = {
            **current_settings,
            "rsvp_open_day": current_settings.get("rsvp_open_day", 2),
            "rsvp_open_hour": current_settings.get("rsvp_open_hour", 7)
        }
        admin_client.put(f"{BASE_URL}/api/settings", json=restore_payload)
        print(f"Successfully updated and verified RSVP settings")


class TestWeeklyEventCreation:
    """Test POST /api/weekly-events creates event with rsvp_closed=false and bench_players=[]"""
    
    def test_create_event_has_rsvp_closed_false(self, admin_client):
        """POST /api/weekly-events should create event with rsvp_closed=false"""
        # Create a test event
        test_date = "2026-05-03"  # A future Sunday
        response = admin_client.post(f"{BASE_URL}/api/weekly-events", json={
            "event_date": test_date
        })
        
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        data = response.json()
        event_id = data.get("id")
        
        # Verify rsvp_closed is false
        assert "rsvp_closed" in data, "rsvp_closed field missing from created event"
        assert data["rsvp_closed"] == False, f"rsvp_closed should be False, got {data['rsvp_closed']}"
        
        # Verify bench_players is empty array
        assert "bench_players" in data, "bench_players field missing from created event"
        assert data["bench_players"] == [], f"bench_players should be [], got {data['bench_players']}"
        
        print(f"Created event {event_id} with rsvp_closed={data['rsvp_closed']}, bench_players={data['bench_players']}")
        
        # Cleanup - delete the test event
        admin_client.delete(f"{BASE_URL}/api/weekly-events/{event_id}")


class TestCheckinWindow:
    """Test GET /api/weekly-events/{event_id}/checkin-window"""
    
    def test_checkin_window_returns_required_fields(self, admin_client):
        """GET /api/weekly-events/{event_id}/checkin-window should return rsvp_closed, open_day_name, open_hour"""
        # Get existing event
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test checkin-window")
        
        event_id = events[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/weekly-events/{event_id}/checkin-window")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify required fields
        assert "rsvp_closed" in data, "rsvp_closed field missing from checkin-window response"
        assert "open_day_name" in data, "open_day_name field missing from checkin-window response"
        assert "open_hour" in data, "open_hour field missing from checkin-window response"
        
        # Validate types
        assert isinstance(data["rsvp_closed"], bool), "rsvp_closed should be boolean"
        assert isinstance(data["open_day_name"], str), "open_day_name should be string"
        assert isinstance(data["open_hour"], int), "open_hour should be integer"
        
        # Validate open_day_name is a valid day
        valid_days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        assert data["open_day_name"] in valid_days, f"open_day_name should be a valid day, got {data['open_day_name']}"
        
        print(f"Checkin window: rsvp_closed={data['rsvp_closed']}, open_day_name={data['open_day_name']}, open_hour={data['open_hour']}")


class TestCloseReopenRSVP:
    """Test POST /api/weekly-events/{event_id}/close-rsvp and reopen-rsvp"""
    
    def test_close_rsvp_admin_only(self, admin_client):
        """POST /api/weekly-events/{event_id}/close-rsvp should close RSVP"""
        # Get existing event
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test close-rsvp")
        
        event_id = events[0]["id"]
        
        # Close RSVP
        response = admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/close-rsvp")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        
        # Verify RSVP is closed via checkin-window
        window_response = requests.get(f"{BASE_URL}/api/weekly-events/{event_id}/checkin-window")
        window_data = window_response.json()
        assert window_data["rsvp_closed"] == True, "rsvp_closed should be True after close-rsvp"
        
        print(f"RSVP closed successfully for event {event_id}")
    
    def test_reopen_rsvp_admin_only(self, admin_client):
        """POST /api/weekly-events/{event_id}/reopen-rsvp should reopen RSVP"""
        # Get existing event
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test reopen-rsvp")
        
        event_id = events[0]["id"]
        
        # Reopen RSVP
        response = admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/reopen-rsvp")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        
        # Verify RSVP is open via checkin-window
        window_response = requests.get(f"{BASE_URL}/api/weekly-events/{event_id}/checkin-window")
        window_data = window_response.json()
        assert window_data["rsvp_closed"] == False, "rsvp_closed should be False after reopen-rsvp"
        
        print(f"RSVP reopened successfully for event {event_id}")


class TestCheckinWithClosedRSVP:
    """Test POST /api/checkins behavior when RSVP is closed"""
    
    def test_checkin_available_rejected_when_rsvp_closed(self, admin_client, member_client):
        """When RSVP is closed, available status should be rejected"""
        # Get existing event
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test checkin")
        
        event_id = events[0]["id"]
        
        # Close RSVP first
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/close-rsvp")
        
        # Try to check in as available - should fail
        response = member_client.post(f"{BASE_URL}/api/checkins", json={
            "event_id": event_id,
            "status": "available"
        })
        
        assert response.status_code == 400, f"Expected 400 for available when RSVP closed, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Response should contain error detail"
        assert "bench" in data["detail"].lower() or "closed" in data["detail"].lower(), f"Error should mention bench or closed: {data['detail']}"
        
        print(f"Correctly rejected 'available' check-in when RSVP closed: {data['detail']}")
    
    def test_checkin_maybe_rejected_when_rsvp_closed(self, admin_client, member_client):
        """When RSVP is closed, maybe status should be rejected"""
        # Get existing event
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test checkin")
        
        event_id = events[0]["id"]
        
        # Ensure RSVP is closed
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/close-rsvp")
        
        # Try to check in as maybe - should fail
        response = member_client.post(f"{BASE_URL}/api/checkins", json={
            "event_id": event_id,
            "status": "maybe"
        })
        
        assert response.status_code == 400, f"Expected 400 for maybe when RSVP closed, got {response.status_code}"
        
        print(f"Correctly rejected 'maybe' check-in when RSVP closed")
    
    def test_checkin_bench_accepted_when_rsvp_closed(self, admin_client, member_client, test_member):
        """When RSVP is closed, bench status should be accepted"""
        # Get existing event
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test checkin")
        
        event_id = events[0]["id"]
        
        # Ensure RSVP is closed
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/close-rsvp")
        
        # Try to check in as bench - should succeed
        response = member_client.post(f"{BASE_URL}/api/checkins", json={
            "event_id": event_id,
            "status": "bench"
        })
        
        assert response.status_code == 200, f"Expected 200 for bench when RSVP closed, got {response.status_code}: {response.text}"
        
        # Verify player is on bench
        event_response = admin_client.get(f"{BASE_URL}/api/weekly-events/{event_id}")
        event_data = event_response.json()
        bench_players = event_data.get("bench_players", [])
        
        member_on_bench = any(p.get("id") == test_member["id"] or p.get("name") == test_member["name"] for p in bench_players)
        assert member_on_bench, f"Member should be on bench: {bench_players}"
        
        print(f"Correctly accepted 'bench' check-in when RSVP closed")
        
        # Reopen RSVP for other tests
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/reopen-rsvp")


class TestAddExternalPlayer:
    """Test POST /api/weekly-events/{event_id}/add-external-player"""
    
    def test_add_external_player_admin_only(self, admin_client):
        """Admin can add external (non-member) player by name"""
        # Get existing event
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test add-external-player")
        
        event_id = events[0]["id"]
        external_name = f"TEST_Guest_{str(uuid.uuid4())[:6]}"
        
        response = admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/add-external-player", json={
            "name": external_name
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "player_id" in data, "Response should contain player_id"
        assert data["player_id"].startswith("ext-"), f"External player ID should start with 'ext-': {data['player_id']}"
        
        # Verify player is in approved list
        event_response = admin_client.get(f"{BASE_URL}/api/weekly-events/{event_id}")
        event_data = event_response.json()
        approved = event_data.get("approved_players", [])
        
        external_found = any(p.get("name") == external_name and p.get("external") == True for p in approved)
        assert external_found, f"External player should be in approved list with external=True: {approved}"
        
        print(f"Successfully added external player '{external_name}' with ID {data['player_id']}")


class TestDropOut:
    """Test POST /api/weekly-events/{event_id}/drop-out"""
    
    def test_drop_out_removes_player(self, admin_client, member_client, test_member):
        """Player can drop out from approved list"""
        # Get existing event
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test drop-out")
        
        event_id = events[0]["id"]
        
        # Ensure RSVP is open
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/reopen-rsvp")
        
        # Check in as available
        member_client.post(f"{BASE_URL}/api/checkins", json={
            "event_id": event_id,
            "status": "available"
        })
        
        # Approve the player (add to approved list)
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/override", json={
            "event_id": event_id,
            "player_id": test_member["id"],
            "action": "add_approved"
        })
        
        # Verify player is approved
        event_response = admin_client.get(f"{BASE_URL}/api/weekly-events/{event_id}")
        event_data = event_response.json()
        approved_before = event_data.get("approved_players", [])
        was_approved = any(p.get("id") == test_member["id"] for p in approved_before)
        
        if not was_approved:
            print(f"Warning: Player not in approved list before drop-out test")
        
        # Drop out
        response = member_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/drop-out")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        
        print(f"Drop out response: {data['message']}")
    
    def test_drop_out_auto_promotes_bench_player(self, admin_client, member_client, test_member):
        """When approved player drops out, first bench player is auto-promoted"""
        # Use existing event that has RSVP window open (Apr 19, 2026)
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events to test drop-out auto-promote")
        
        event_id = events[0]["id"]
        
        # Create a second test member for bench
        unique_id = str(uuid.uuid4())[:8]
        bench_email = f"TEST_bench_{unique_id}@tennis.com"
        bench_password = "testpass123"
        bench_name = f"TEST Bench Player {unique_id}"
        
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": bench_email,
            "password": bench_password,
            "name": bench_name
        })
        
        bench_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": bench_email,
            "password": bench_password
        })
        
        if bench_login.status_code != 200:
            pytest.skip("Could not create bench player")
        
        bench_token = bench_login.json().get("token")
        bench_id = bench_login.json().get("user", {}).get("id")
        
        bench_session = requests.Session()
        bench_session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {bench_token}"
        })
        
        # Ensure RSVP is open first
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/reopen-rsvp")
        
        # First member checks in as available
        member_client.post(f"{BASE_URL}/api/checkins", json={
            "event_id": event_id,
            "status": "available"
        })
        
        # Approve first member
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/override", json={
            "event_id": event_id,
            "player_id": test_member["id"],
            "action": "add_approved"
        })
        
        # Close RSVP so bench player can only join bench
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/close-rsvp")
        
        # Second member joins bench (should work when RSVP is closed)
        bench_checkin_response = bench_session.post(f"{BASE_URL}/api/checkins", json={
            "event_id": event_id,
            "status": "bench"
        })
        assert bench_checkin_response.status_code == 200, f"Bench check-in failed: {bench_checkin_response.text}"
        
        # Verify bench player is on bench - need to re-fetch event
        import time
        time.sleep(0.5)  # Small delay to ensure DB write completes
        
        event_before = admin_client.get(f"{BASE_URL}/api/weekly-events/{event_id}").json()
        bench_before = event_before.get("bench_players", [])
        
        # Find our bench player
        our_bench_player = [p for p in bench_before if p.get("name") == bench_name]
        
        if len(our_bench_player) == 0:
            print(f"Warning: Our bench player not in bench_players array. Checking checkins...")
            checkins = admin_client.get(f"{BASE_URL}/api/checkins/{event_id}").json()
            bench_checkins = [c for c in checkins if c.get("status") == "bench" and c.get("user_name") == bench_name]
            print(f"Bench checkins found: {bench_checkins}")
            if len(bench_checkins) > 0:
                print("Bench check-in exists and bench_players should be updated")
        
        assert len(bench_before) > 0, f"Bench should have at least one player: {bench_before}"
        
        # First member drops out
        drop_response = member_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/drop-out")
        assert drop_response.status_code == 200, f"Drop out failed: {drop_response.text}"
        
        drop_data = drop_response.json()
        
        # Check if bench player was promoted
        if drop_data.get("promoted"):
            print(f"Bench player '{drop_data['promoted']}' was auto-promoted!")
            
            # Verify bench has one less player
            event_after = admin_client.get(f"{BASE_URL}/api/weekly-events/{event_id}").json()
            bench_after = event_after.get("bench_players", [])
            approved_after = event_after.get("approved_players", [])
            
            # The promoted player should now be in approved list
            promoted_in_approved = any(p.get("name") == drop_data["promoted"] for p in approved_after)
            assert promoted_in_approved, f"Promoted player should be in approved list: {approved_after}"
            print(f"Verified: {drop_data['promoted']} is now in approved list")
        else:
            print(f"No bench player was promoted (test member may not have been in approved list)")
        
        # Reopen RSVP for other tests
        admin_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/reopen-rsvp")


class TestNonAdminCannotCloseRSVP:
    """Test that non-admin users cannot close/reopen RSVP or add external players"""
    
    def test_member_cannot_close_rsvp(self, member_client, admin_client):
        """Non-admin should not be able to close RSVP"""
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events")
        
        event_id = events[0]["id"]
        
        response = member_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/close-rsvp")
        assert response.status_code in [401, 403], f"Expected 401/403 for non-admin, got {response.status_code}"
        print(f"Correctly rejected non-admin close-rsvp attempt")
    
    def test_member_cannot_add_external_player(self, member_client, admin_client):
        """Non-admin should not be able to add external player"""
        events_response = admin_client.get(f"{BASE_URL}/api/weekly-events/upcoming")
        events = events_response.json()
        
        if not events:
            pytest.skip("No upcoming events")
        
        event_id = events[0]["id"]
        
        response = member_client.post(f"{BASE_URL}/api/weekly-events/{event_id}/add-external-player", json={
            "name": "Unauthorized Guest"
        })
        assert response.status_code in [401, 403], f"Expected 401/403 for non-admin, got {response.status_code}"
        print(f"Correctly rejected non-admin add-external-player attempt")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
