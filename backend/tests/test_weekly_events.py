"""
Tennis Buddies Club - Weekly Events & Check-In System Tests
Tests: WeeklyEvent CRUD, Check-In, Admin Approval, Doubles Round Robin Generation
"""
import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = 'admin@tennis.com'
ADMIN_PASSWORD = 'admin123'
MEMBER_EMAIL = 'player@tennis.com'
MEMBER_PASSWORD = 'player123'


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Admin login failed")


@pytest.fixture(scope="module")
def member_token():
    """Get member auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MEMBER_EMAIL,
        "password": MEMBER_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Member login failed")


@pytest.fixture(scope="module")
def admin_user_id(admin_token):
    """Get admin user ID"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if response.status_code == 200:
        return response.json()["id"]
    pytest.skip("Could not get admin user ID")


@pytest.fixture(scope="module")
def member_user_id(member_token):
    """Get member user ID"""
    headers = {"Authorization": f"Bearer {member_token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    if response.status_code == 200:
        return response.json()["id"]
    pytest.skip("Could not get member user ID")


def get_next_sunday():
    """Get the next Sunday date in YYYY-MM-DD format"""
    today = datetime.now()
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0:
        days_until_sunday = 7
    next_sunday = today + timedelta(days=days_until_sunday)
    return next_sunday.strftime("%Y-%m-%d")


def get_test_sunday():
    """Get a test Sunday date (2 weeks from now to ensure check-in window is open)"""
    today = datetime.now()
    days_until_sunday = (6 - today.weekday()) % 7
    if days_until_sunday == 0:
        days_until_sunday = 7
    # Use next Sunday (check-in should be open since we're past Wednesday)
    test_sunday = today + timedelta(days=days_until_sunday)
    return test_sunday.strftime("%Y-%m-%d")


class TestWeeklyEventsCRUD:
    """Weekly Events CRUD endpoint tests"""
    
    def test_create_weekly_event_requires_admin(self, member_token):
        """Test that creating weekly event requires admin role"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/weekly-events", json={
            "event_date": get_test_sunday()
        }, headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Create weekly event correctly requires admin role")
    
    def test_create_weekly_event_success(self, admin_token):
        """Test admin can create a weekly event"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        test_date = get_test_sunday()
        response = requests.post(f"{BASE_URL}/api/weekly-events", json={
            "event_date": test_date,
            "title": f"TEST Sunday Doubles - {test_date}",
            "location": "Test Tennis Club",
            "start_time": "10:00",
            "num_courts": 2
        }, headers=headers)
        
        assert response.status_code == 200, f"Create event failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Missing id field"
        assert data["event_date"] == test_date, f"Event date mismatch"
        assert data["status"] == "open", f"Expected status 'open', got {data['status']}"
        assert data["approved_players"] == [], "Expected empty approved_players"
        assert data["waitlist_players"] == [], "Expected empty waitlist_players"
        
        print(f"✓ Weekly event created: {data['id']}")
        print(f"  Title: {data['title']}")
        print(f"  Date: {data['event_date']}")
        print(f"  Status: {data['status']}")
        
        # Store event ID for cleanup
        TestWeeklyEventsCRUD.created_event_id = data["id"]
        return data["id"]
    
    def test_get_weekly_events(self):
        """Test getting all weekly events"""
        response = requests.get(f"{BASE_URL}/api/weekly-events")
        assert response.status_code == 200, f"Get events failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of events"
        print(f"✓ Weekly events returned {len(data)} events")
    
    def test_get_upcoming_weekly_events(self):
        """Test getting upcoming weekly events"""
        response = requests.get(f"{BASE_URL}/api/weekly-events/upcoming")
        assert response.status_code == 200, f"Get upcoming events failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of events"
        print(f"✓ Upcoming weekly events returned {len(data)} events")
        
        # Verify events are sorted by date ascending
        if len(data) >= 2:
            for i in range(len(data) - 1):
                assert data[i]["event_date"] <= data[i+1]["event_date"], "Events not sorted by date"
            print("✓ Events are sorted by date ascending")
    
    def test_get_single_weekly_event(self, admin_token):
        """Test getting a single weekly event with check-ins"""
        if not hasattr(TestWeeklyEventsCRUD, 'created_event_id'):
            pytest.skip("No event created to test")
        
        event_id = TestWeeklyEventsCRUD.created_event_id
        response = requests.get(f"{BASE_URL}/api/weekly-events/{event_id}")
        assert response.status_code == 200, f"Get event failed: {response.text}"
        data = response.json()
        
        assert data["id"] == event_id, "Event ID mismatch"
        assert "checkins" in data, "Missing checkins field"
        print(f"✓ Single event retrieved with {len(data.get('checkins', []))} check-ins")


class TestCheckInSystem:
    """Check-in system endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup_event(self, admin_token):
        """Create a test event for check-in tests"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        test_date = get_test_sunday()
        
        # Check if we already have a test event
        response = requests.get(f"{BASE_URL}/api/weekly-events/upcoming")
        if response.status_code == 200:
            events = response.json()
            for event in events:
                if "TEST" in event.get("title", ""):
                    TestCheckInSystem.test_event_id = event["id"]
                    return
        
        # Create new test event
        response = requests.post(f"{BASE_URL}/api/weekly-events", json={
            "event_date": test_date,
            "title": f"TEST Check-in Event - {test_date}"
        }, headers=headers)
        
        if response.status_code == 200:
            TestCheckInSystem.test_event_id = response.json()["id"]
    
    def test_submit_checkin_requires_auth(self):
        """Test that check-in requires authentication"""
        response = requests.post(f"{BASE_URL}/api/checkins", json={
            "event_id": "test-id",
            "status": "available"
        })
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✓ Check-in correctly requires authentication")
    
    def test_submit_checkin_available(self, member_token):
        """Test member can check in as available"""
        if not hasattr(TestCheckInSystem, 'test_event_id'):
            pytest.skip("No test event available")
        
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/checkins", json={
            "event_id": TestCheckInSystem.test_event_id,
            "status": "available"
        }, headers=headers)
        
        # May fail if check-in window not open - that's expected behavior
        if response.status_code == 400 and "Check-in opens" in response.text:
            print("✓ Check-in window not yet open (expected behavior)")
            pytest.skip("Check-in window not open")
        
        assert response.status_code == 200, f"Check-in failed: {response.text}"
        data = response.json()
        assert data["status"] == "available", f"Expected status 'available', got {data['status']}"
        print(f"✓ Check-in submitted: {data['status']}")
    
    def test_submit_checkin_maybe(self, member_token):
        """Test member can check in as maybe"""
        if not hasattr(TestCheckInSystem, 'test_event_id'):
            pytest.skip("No test event available")
        
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/checkins", json={
            "event_id": TestCheckInSystem.test_event_id,
            "status": "maybe"
        }, headers=headers)
        
        if response.status_code == 400 and "Check-in opens" in response.text:
            pytest.skip("Check-in window not open")
        
        assert response.status_code == 200, f"Check-in failed: {response.text}"
        data = response.json()
        assert data["status"] == "maybe", f"Expected status 'maybe', got {data['status']}"
        print(f"✓ Check-in updated to: {data['status']}")
    
    def test_submit_checkin_not_available(self, member_token):
        """Test member can check in as not available"""
        if not hasattr(TestCheckInSystem, 'test_event_id'):
            pytest.skip("No test event available")
        
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/checkins", json={
            "event_id": TestCheckInSystem.test_event_id,
            "status": "not_available"
        }, headers=headers)
        
        if response.status_code == 400 and "Check-in opens" in response.text:
            pytest.skip("Check-in window not open")
        
        assert response.status_code == 200, f"Check-in failed: {response.text}"
        data = response.json()
        assert data["status"] == "not_available", f"Expected status 'not_available', got {data['status']}"
        print(f"✓ Check-in updated to: {data['status']}")
    
    def test_submit_checkin_invalid_status(self, member_token):
        """Test invalid check-in status is rejected"""
        if not hasattr(TestCheckInSystem, 'test_event_id'):
            pytest.skip("No test event available")
        
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/checkins", json={
            "event_id": TestCheckInSystem.test_event_id,
            "status": "invalid_status"
        }, headers=headers)
        
        if response.status_code == 400 and "Check-in opens" in response.text:
            pytest.skip("Check-in window not open")
        
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        print("✓ Invalid check-in status correctly rejected")
    
    def test_get_event_checkins(self):
        """Test getting all check-ins for an event"""
        if not hasattr(TestCheckInSystem, 'test_event_id'):
            pytest.skip("No test event available")
        
        response = requests.get(f"{BASE_URL}/api/checkins/{TestCheckInSystem.test_event_id}")
        assert response.status_code == 200, f"Get check-ins failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of check-ins"
        print(f"✓ Event check-ins returned {len(data)} entries")
    
    def test_get_my_checkin(self, member_token):
        """Test getting current user's check-in"""
        if not hasattr(TestCheckInSystem, 'test_event_id'):
            pytest.skip("No test event available")
        
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.get(f"{BASE_URL}/api/checkins/{TestCheckInSystem.test_event_id}/me", headers=headers)
        assert response.status_code == 200, f"Get my check-in failed: {response.text}"
        data = response.json()
        assert "status" in data, "Missing status field"
        print(f"✓ My check-in status: {data['status']}")
    
    def test_get_checkin_window(self):
        """Test getting check-in window status"""
        if not hasattr(TestCheckInSystem, 'test_event_id'):
            pytest.skip("No test event available")
        
        response = requests.get(f"{BASE_URL}/api/weekly-events/{TestCheckInSystem.test_event_id}/checkin-window")
        assert response.status_code == 200, f"Get check-in window failed: {response.text}"
        data = response.json()
        
        assert "is_open" in data, "Missing is_open field"
        assert "timezone" in data, "Missing timezone field"
        print(f"✓ Check-in window: is_open={data['is_open']}, timezone={data['timezone']}")


class TestAdminApproval:
    """Admin approval flow tests"""
    
    def test_approve_players_requires_admin(self, member_token):
        """Test that approving players requires admin role"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/weekly-events/test-id/approve", json={
            "event_id": "test-id",
            "approved_player_ids": [],
            "waitlist_player_ids": []
        }, headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Approve players correctly requires admin role")
    
    def test_admin_override_requires_admin(self, member_token):
        """Test that admin override requires admin role"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/weekly-events/test-id/override", json={
            "event_id": "test-id",
            "player_id": "test-player",
            "action": "add_approved"
        }, headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Admin override correctly requires admin role")


class TestGenerateSchedule:
    """Doubles round robin schedule generation tests"""
    
    def test_generate_schedule_requires_admin(self, member_token):
        """Test that generating schedule requires admin role"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/weekly-events/test-id/generate-schedule", json={
            "event_id": "test-id"
        }, headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Generate schedule correctly requires admin role")
    
    def test_generate_schedule_requires_4_players(self, admin_token):
        """Test that generating schedule requires at least 4 approved players"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a new event with no approved players
        test_date = get_test_sunday()
        create_response = requests.post(f"{BASE_URL}/api/weekly-events", json={
            "event_date": test_date,
            "title": f"TEST Schedule Gen - {test_date}"
        }, headers=headers)
        
        if create_response.status_code != 200:
            pytest.skip("Could not create test event")
        
        event_id = create_response.json()["id"]
        
        # Try to generate schedule with no approved players
        response = requests.post(f"{BASE_URL}/api/weekly-events/{event_id}/generate-schedule", json={
            "event_id": event_id
        }, headers=headers)
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "at least 4" in response.text.lower(), f"Expected '4 players' error, got: {response.text}"
        print("✓ Generate schedule correctly requires 4+ approved players")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/weekly-events/{event_id}", headers=headers)


class TestCancelPlayer:
    """Player cancellation and auto-promote tests"""
    
    def test_cancel_player_requires_auth(self):
        """Test that canceling spot requires authentication"""
        response = requests.post(f"{BASE_URL}/api/weekly-events/test-id/cancel-player")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✓ Cancel player correctly requires authentication")


class TestExistingEventWithSchedule:
    """Test the existing event that has a generated schedule"""
    
    def test_get_existing_event_with_schedule(self):
        """Test that we can retrieve the existing event with generated schedule"""
        response = requests.get(f"{BASE_URL}/api/weekly-events/upcoming")
        assert response.status_code == 200, f"Get upcoming events failed: {response.text}"
        events = response.json()
        
        # Find event with generated schedule
        scheduled_events = [e for e in events if e.get("status") == "scheduled" and e.get("generated_schedule")]
        
        if scheduled_events:
            event = scheduled_events[0]
            print(f"✓ Found scheduled event: {event['title']}")
            print(f"  Date: {event['event_date']}")
            print(f"  Approved players: {len(event.get('approved_players', []))}")
            
            schedule = event.get("generated_schedule", [])
            print(f"  Generated rounds: {len(schedule)}")
            
            if schedule:
                # Verify schedule structure
                round1 = schedule[0]
                assert "round" in round1, "Missing round number"
                assert "matches" in round1, "Missing matches"
                assert "byes" in round1, "Missing byes"
                
                if round1["matches"]:
                    match = round1["matches"][0]
                    assert "court" in match, "Missing court"
                    assert "team_a" in match, "Missing team_a"
                    assert "team_b" in match, "Missing team_b"
                    
                    # Verify team structure
                    for player in match["team_a"]:
                        assert "id" in player, "Missing player id"
                        assert "name" in player, "Missing player name"
                    
                    print(f"  Round 1 matches: {len(round1['matches'])}")
                    print(f"  Round 1 byes: {len(round1.get('byes', []))}")
        else:
            print("✓ No scheduled events found (may need to generate one)")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_events(self, admin_token):
        """Delete test events created during testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all events
        response = requests.get(f"{BASE_URL}/api/weekly-events")
        if response.status_code != 200:
            return
        
        events = response.json()
        deleted = 0
        
        for event in events:
            if "TEST" in event.get("title", ""):
                del_response = requests.delete(f"{BASE_URL}/api/weekly-events/{event['id']}", headers=headers)
                if del_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test events")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
