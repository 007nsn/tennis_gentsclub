"""
Tennis Buddies Club - Backend API Tests
Tests: Auth, Season Standings, Opponent Scout, Strategy Bot, Chatroom, Match Reminders
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@tennis.com"
ADMIN_PASSWORD = "admin123"
MEMBER_EMAIL = "player@tennis.com"
MEMBER_PASSWORD = "player123"


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_admin_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        print(f"✓ Admin login successful - role: {data['user']['role']}")
    
    def test_login_member_success(self):
        """Test member login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        assert response.status_code == 200, f"Member login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "member", f"Expected member role, got {data['user']['role']}"
        print(f"✓ Member login successful - role: {data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestSeasonStandings:
    """Season Standings endpoint tests"""
    
    def test_get_season_standings(self):
        """Test getting season standings - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/season-standings")
        assert response.status_code == 200, f"Season standings failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of standings"
        print(f"✓ Season standings returned {len(data)} players")
        
        # Verify structure if data exists
        if len(data) > 0:
            player = data[0]
            required_fields = ["player_id", "player_name", "matches_played", "wins", "losses", "win_rate", "points"]
            for field in required_fields:
                assert field in player, f"Missing field: {field}"
            print(f"✓ First player: {player['player_name']} - {player['points']} points")


class TestSoloLadder:
    """Solo Ladder endpoint tests"""
    
    def test_get_solo_ladder(self):
        """Test getting solo ladder - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/solo-ladder")
        assert response.status_code == 200, f"Solo ladder failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of players"
        print(f"✓ Solo ladder returned {len(data)} players")


class TestEducation:
    """Education/Articles endpoint tests"""
    
    def test_get_articles(self):
        """Test getting articles - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/articles")
        assert response.status_code == 200, f"Articles failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of articles"
        print(f"✓ Articles returned {len(data)} items")


class TestChatroom:
    """Chatroom endpoint tests - requires authentication"""
    
    @pytest.fixture
    def member_token(self):
        """Get member auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Member login failed")
    
    def test_chatroom_requires_auth(self):
        """Test chatroom requires authentication"""
        response = requests.get(f"{BASE_URL}/api/chatroom")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✓ Chatroom correctly requires authentication")
    
    def test_get_chatroom_messages(self, member_token):
        """Test getting chatroom messages with auth"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.get(f"{BASE_URL}/api/chatroom", headers=headers)
        assert response.status_code == 200, f"Chatroom get failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of messages"
        print(f"✓ Chatroom returned {len(data)} messages")
        
        # Check for match reminders in messages
        reminder_count = sum(1 for msg in data if "MATCH REMINDER" in msg.get("content", ""))
        print(f"✓ Found {reminder_count} match reminders in chatroom")


class TestOpponentScout:
    """Opponent Scout (Gemini AI) endpoint tests"""
    
    @pytest.fixture
    def member_token(self):
        """Get member auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Member login failed")
    
    def test_opponent_scout_requires_auth(self):
        """Test opponent scout requires authentication"""
        response = requests.post(f"{BASE_URL}/api/opponent-scout", json={
            "opponent_name": "Test",
            "playstyle": "Aggressive",
            "strengths": "Strong serve",
            "weaknesses": "Weak backhand"
        })
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✓ Opponent scout correctly requires authentication")
    
    def test_opponent_scout_generates_strategy(self, member_token):
        """Test opponent scout generates AI strategy - may take 10-20 seconds"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/opponent-scout", json={
            "opponent_name": "Test Opponent",
            "playstyle": "Aggressive baseliner",
            "strengths": "Powerful forehand, fast footwork",
            "weaknesses": "Inconsistent backhand, struggles with high balls"
        }, headers=headers, timeout=60)
        
        assert response.status_code == 200, f"Opponent scout failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "strategy" in data, "Missing strategy field"
        assert "key_tactics" in data, "Missing key_tactics field"
        assert "warnings" in data, "Missing warnings field"
        assert len(data["strategy"]) > 0, "Strategy is empty"
        
        print(f"✓ Opponent scout generated strategy: {data['strategy'][:100]}...")
        print(f"✓ Key tactics count: {len(data['key_tactics'])}")
        print(f"✓ Warnings count: {len(data['warnings'])}")


class TestStrategyBot:
    """Strategy Bot (Gemini AI) endpoint tests"""
    
    @pytest.fixture
    def member_token(self):
        """Get member auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Member login failed")
    
    def test_strategy_bot_requires_auth(self):
        """Test strategy bot requires authentication"""
        response = requests.post(f"{BASE_URL}/api/strategy-bot", json={
            "message": "When should I poach?"
        })
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("✓ Strategy bot correctly requires authentication")
    
    def test_strategy_bot_responds(self, member_token):
        """Test strategy bot responds to questions - may take 10-20 seconds"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/strategy-bot", json={
            "message": "When should I poach in doubles?"
        }, headers=headers, timeout=60)
        
        assert response.status_code == 200, f"Strategy bot failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "response" in data, "Missing response field"
        assert "session_id" in data, "Missing session_id field"
        assert len(data["response"]) > 0, "Response is empty"
        
        print(f"✓ Strategy bot responded: {data['response'][:100]}...")
        print(f"✓ Session ID: {data['session_id'][:20]}...")


class TestMatchReminders:
    """Match Reminders endpoint tests - admin only"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    @pytest.fixture
    def member_token(self):
        """Get member auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": MEMBER_EMAIL,
            "password": MEMBER_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Member login failed")
    
    def test_match_reminder_requires_admin(self, member_token):
        """Test match reminder requires admin role"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.post(f"{BASE_URL}/api/match-reminders", json={
            "match_date": "2026-01-19",
            "message": "Test reminder"
        }, headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
        print("✓ Match reminder correctly requires admin role")
    
    def test_create_match_reminder(self, admin_token):
        """Test admin can create match reminder"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/match-reminders", json={
            "match_date": "2026-01-19",
            "message": "Test reminder from automated tests - matches start at 9 AM!"
        }, headers=headers)
        
        assert response.status_code == 200, f"Create reminder failed: {response.text}"
        data = response.json()
        assert "message" in data, "Missing message field"
        assert "id" in data, "Missing id field"
        print(f"✓ Match reminder created successfully: {data['id']}")


class TestAdminPanel:
    """Admin Panel endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_get_pending_matches(self, admin_token):
        """Test getting pending matches"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/matches", params={"status": "pending"}, headers=headers)
        assert response.status_code == 200, f"Get matches failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of matches"
        print(f"✓ Pending matches: {len(data)}")
    
    def test_get_settings(self, admin_token):
        """Test getting club settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/settings", headers=headers)
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        data = response.json()
        assert "num_courts" in data, "Missing num_courts"
        print(f"✓ Settings: {data['num_courts']} courts, location: {data.get('default_location', 'N/A')}")
    
    def test_get_upcoming_sundays(self, admin_token):
        """Test getting upcoming Sundays for scheduling"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/availability/upcoming-sundays", headers=headers)
        assert response.status_code == 200, f"Get sundays failed: {response.text}"
        data = response.json()
        assert "sundays" in data, "Missing sundays field"
        assert len(data["sundays"]) >= 1, "Expected at least 1 Sunday"
        print(f"✓ Upcoming Sundays: {data['sundays']}")


class TestSchedules:
    """Schedule endpoint tests"""
    
    def test_get_schedules(self):
        """Test getting schedules - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/schedules")
        assert response.status_code == 200, f"Get schedules failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of schedules"
        print(f"✓ Schedules: {len(data)} found")


class TestStats:
    """Stats endpoint tests"""
    
    def test_get_stats(self):
        """Test getting dashboard stats - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"Get stats failed: {response.text}"
        data = response.json()
        assert "total_members" in data, "Missing total_members"
        assert "total_teams" in data, "Missing total_teams"
        assert "total_matches" in data, "Missing total_matches"
        print(f"✓ Stats: {data['total_members']} members, {data['total_teams']} teams, {data['total_matches']} matches")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
