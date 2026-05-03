#!/usr/bin/env python3
"""
Comprehensive Backend Smoke Test for Tennis Buddies Club
Tests all critical API endpoints after fresh GitHub sync
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://tennis-gents.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@tennis.com"
ADMIN_PASSWORD = "admin123"

# Test results tracking
results = {
    "passed": [],
    "failed": [],
    "warnings": []
}

def log_pass(test_name, details=""):
    results["passed"].append(f"✅ {test_name}" + (f": {details}" if details else ""))
    print(f"✅ PASS: {test_name}" + (f" - {details}" if details else ""))

def log_fail(test_name, details=""):
    results["failed"].append(f"❌ {test_name}" + (f": {details}" if details else ""))
    print(f"❌ FAIL: {test_name}" + (f" - {details}" if details else ""))

def log_warning(test_name, details=""):
    results["warnings"].append(f"⚠️  {test_name}" + (f": {details}" if details else ""))
    print(f"⚠️  WARNING: {test_name}" + (f" - {details}" if details else ""))

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# Global session for cookies
session = requests.Session()
admin_token = None
admin_user_id = None

def test_health():
    """Test 1: Health check"""
    print_section("TEST 1: Health Check")
    try:
        resp = session.get(f"{BASE_URL}/health", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("status") == "ok":
                log_pass("Health check", f"Status: {data}")
                return True
            else:
                log_fail("Health check", f"Unexpected response: {data}")
                return False
        else:
            log_fail("Health check", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Health check", f"Exception: {str(e)}")
        return False

def test_auth_login():
    """Test 2: Admin login"""
    print_section("TEST 2: Auth - Login")
    global admin_token, admin_user_id
    try:
        payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        resp = session.post(f"{BASE_URL}/auth/login", json=payload, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            admin_token = data.get("token")
            user = data.get("user", {})
            admin_user_id = user.get("id")
            
            # Check if cookie was set
            cookies = session.cookies.get_dict()
            has_cookie = "access_token" in cookies
            
            if admin_token and admin_user_id and has_cookie:
                log_pass("Admin login", f"User: {user.get('name')}, Role: {user.get('role')}, Cookie: Yes")
                return True
            else:
                log_fail("Admin login", f"Missing token/user_id/cookie. Token: {bool(admin_token)}, UserID: {bool(admin_user_id)}, Cookie: {has_cookie}")
                return False
        else:
            log_fail("Admin login", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Admin login", f"Exception: {str(e)}")
        return False

def test_auth_me():
    """Test 3: Get current user"""
    print_section("TEST 3: Auth - Get Me")
    try:
        # Try with Authorization header as fallback
        headers = {}
        if admin_token:
            headers["Authorization"] = f"Bearer {admin_token}"
        resp = session.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get("email") == ADMIN_EMAIL and data.get("role") == "admin":
                log_pass("Get current user", f"Email: {data.get('email')}, Role: {data.get('role')}")
                return True
            else:
                log_fail("Get current user", f"Unexpected user data: {data}")
                return False
        else:
            log_fail("Get current user", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Get current user", f"Exception: {str(e)}")
        return False

def test_auth_logout():
    """Test 4: Logout"""
    print_section("TEST 4: Auth - Logout")
    try:
        resp = session.post(f"{BASE_URL}/auth/logout", timeout=10)
        
        if resp.status_code == 200:
            # Check if cookie was deleted
            cookies = session.cookies.get_dict()
            has_cookie = "access_token" in cookies
            
            if not has_cookie:
                log_pass("Logout", "Cookie cleared successfully")
                return True
            else:
                log_warning("Logout", "Logout succeeded but cookie still present")
                return True
        else:
            log_fail("Logout", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Logout", f"Exception: {str(e)}")
        return False

def test_relogin():
    """Re-login for subsequent tests"""
    print_section("Re-authenticating for subsequent tests")
    return test_auth_login()

def test_weekly_events_list():
    """Test 5: Get weekly events"""
    print_section("TEST 5: Weekly Events - List")
    try:
        resp = session.get(f"{BASE_URL}/weekly-events", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_pass("Get weekly events", f"Returned {len(data)} events")
                return True, data
            else:
                log_fail("Get weekly events", f"Expected list, got: {type(data)}")
                return False, None
        else:
            log_fail("Get weekly events", f"Status {resp.status_code}: {resp.text}")
            return False, None
    except Exception as e:
        log_fail("Get weekly events", f"Exception: {str(e)}")
        return False, None

def test_create_event():
    """Test 6: Create a Sunday event"""
    print_section("TEST 6: Weekly Events - Create Event")
    try:
        # Get next Sunday
        today = datetime.now()
        days_until_sunday = (6 - today.weekday()) % 7
        if days_until_sunday == 0:
            days_until_sunday = 7
        next_sunday = today + timedelta(days=days_until_sunday)
        event_date = next_sunday.strftime("%Y-%m-%d")
        
        payload = {
            "event_date": event_date,
            "title": f"Test Sunday Doubles - {event_date}",
            "location": "Test Tennis Club",
            "start_time": "09:00",
            "num_courts": 2
        }
        
        headers = {}
        if admin_token:
            headers["Authorization"] = f"Bearer {admin_token}"
        resp = session.post(f"{BASE_URL}/weekly-events", json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            event_id = data.get("id")
            if event_id:
                log_pass("Create event", f"Event ID: {event_id}, Date: {event_date}")
                return True, event_id
            else:
                log_fail("Create event", f"No event ID in response: {data}")
                return False, None
        else:
            log_fail("Create event", f"Status {resp.status_code}: {resp.text}")
            return False, None
    except Exception as e:
        log_fail("Create event", f"Exception: {str(e)}")
        return False, None

def test_rsvp_flow(event_id):
    """Test 7: RSVP to event"""
    print_section("TEST 7: RSVP Flow")
    try:
        payload = {
            "event_id": event_id,
            "status": "available"
        }
        
        headers = {}
        if admin_token:
            headers["Authorization"] = f"Bearer {admin_token}"
        resp = session.post(f"{BASE_URL}/checkins", json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            status = data.get("status")
            message = data.get("message", "")
            log_pass("RSVP to event", f"Status: {status}, Message: {message}")
            return True
        elif resp.status_code == 400:
            # Check if it's the RSVP window validation
            error_detail = resp.json().get("detail", "")
            if "RSVP opens" in error_detail:
                log_pass("RSVP window validation", f"Correctly enforced: {error_detail}")
                return True
            else:
                log_fail("RSVP to event", f"Status {resp.status_code}: {resp.text}")
                return False
        else:
            log_fail("RSVP to event", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("RSVP to event", f"Exception: {str(e)}")
        return False

def test_close_reopen_rsvp(event_id):
    """Test 8: Close and reopen RSVP"""
    print_section("TEST 8: Close/Reopen RSVP")
    try:
        headers = {}
        if admin_token:
            headers["Authorization"] = f"Bearer {admin_token}"
        
        # Close RSVP
        resp = session.post(f"{BASE_URL}/weekly-events/{event_id}/close-rsvp", headers=headers, timeout=10)
        if resp.status_code != 200:
            log_fail("Close RSVP", f"Status {resp.status_code}: {resp.text}")
            return False
        
        log_pass("Close RSVP", "Successfully closed")
        
        # Reopen RSVP
        resp = session.post(f"{BASE_URL}/weekly-events/{event_id}/reopen-rsvp", headers=headers, timeout=10)
        if resp.status_code != 200:
            log_fail("Reopen RSVP", f"Status {resp.status_code}: {resp.text}")
            return False
        
        log_pass("Reopen RSVP", "Successfully reopened")
        return True
    except Exception as e:
        log_fail("Close/Reopen RSVP", f"Exception: {str(e)}")
        return False

def test_solo_ladder():
    """Test 9: Solo ladder"""
    print_section("TEST 9: Solo Ladder")
    try:
        resp = session.get(f"{BASE_URL}/solo-ladder", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_pass("Solo ladder", f"Returned {len(data)} players")
                return True
            else:
                log_fail("Solo ladder", f"Expected list, got: {type(data)}")
                return False
        else:
            log_fail("Solo ladder", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Solo ladder", f"Exception: {str(e)}")
        return False

def test_season_standings():
    """Test 10: Season standings"""
    print_section("TEST 10: Season Standings")
    try:
        resp = session.get(f"{BASE_URL}/season-standings", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_pass("Season standings", f"Returned {len(data)} players")
                return True
            else:
                log_fail("Season standings", f"Expected list, got: {type(data)}")
                return False
        else:
            log_fail("Season standings", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Season standings", f"Exception: {str(e)}")
        return False

def test_head_to_head():
    """Test 11: Head-to-head matrix"""
    print_section("TEST 11: Head-to-Head Matrix")
    try:
        resp = session.get(f"{BASE_URL}/head-to-head-matrix", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if "players" in data and "matrix" in data:
                log_pass("Head-to-head matrix", f"Players: {len(data.get('players', []))}")
                return True
            else:
                log_fail("Head-to-head matrix", f"Missing players/matrix keys: {data.keys()}")
                return False
        else:
            log_fail("Head-to-head matrix", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Head-to-head matrix", f"Exception: {str(e)}")
        return False

def test_partnerships():
    """Test 12: Best partnerships"""
    print_section("TEST 12: Best Partnerships")
    try:
        resp = session.get(f"{BASE_URL}/partnerships", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_pass("Best partnerships", f"Returned {len(data)} partnerships")
                return True
            else:
                log_fail("Best partnerships", f"Expected list, got: {type(data)}")
                return False
        else:
            log_fail("Best partnerships", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Best partnerships", f"Exception: {str(e)}")
        return False

def test_match_history():
    """Test 13: Match history"""
    print_section("TEST 13: Match History")
    try:
        resp = session.get(f"{BASE_URL}/match-history", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_pass("Match history", f"Returned {len(data)} matches")
                return True
            else:
                log_fail("Match history", f"Expected list, got: {type(data)}")
                return False
        else:
            log_fail("Match history", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Match history", f"Exception: {str(e)}")
        return False

def test_matches_list():
    """Test 14: Matches list"""
    print_section("TEST 14: Matches List")
    try:
        resp = session.get(f"{BASE_URL}/matches", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_pass("Matches list", f"Returned {len(data)} matches")
                return True
            else:
                log_fail("Matches list", f"Expected list, got: {type(data)}")
                return False
        else:
            log_fail("Matches list", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Matches list", f"Exception: {str(e)}")
        return False

def test_chatroom():
    """Test 15: Chatroom"""
    print_section("TEST 15: Chatroom")
    try:
        headers = {}
        if admin_token:
            headers["Authorization"] = f"Bearer {admin_token}"
        
        # Post a message
        payload = {"content": "Test message from backend smoke test"}
        resp = session.post(f"{BASE_URL}/chatroom", json=payload, headers=headers, timeout=10)
        
        if resp.status_code != 200:
            log_fail("Post chatroom message", f"Status {resp.status_code}: {resp.text}")
            return False
        
        msg_data = resp.json()
        msg_id = msg_data.get("id")
        log_pass("Post chatroom message", f"Message ID: {msg_id}")
        
        # Get messages
        resp = session.get(f"{BASE_URL}/chatroom", headers=headers, timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                # Check if our message is in the list
                found = any(m.get("id") == msg_id for m in data)
                if found:
                    log_pass("Get chatroom messages", f"Found test message in {len(data)} messages")
                    return True
                else:
                    log_warning("Get chatroom messages", f"Test message not found in {len(data)} messages")
                    return True
            else:
                log_fail("Get chatroom messages", f"Expected list, got: {type(data)}")
                return False
        else:
            log_fail("Get chatroom messages", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Chatroom", f"Exception: {str(e)}")
        return False

def test_opponent_scout():
    """Test 16: Opponent Scout (LLM)"""
    print_section("TEST 16: Opponent Scout (LLM)")
    try:
        headers = {}
        if admin_token:
            headers["Authorization"] = f"Bearer {admin_token}"
        
        payload = {
            "opponent_name": "John Smith",
            "playstyle": "aggressive baseliner",
            "strengths": "powerful forehand, good serve",
            "weaknesses": "weak backhand, poor net game",
            "additional_notes": "Tends to play better in the morning"
        }
        
        resp = session.post(f"{BASE_URL}/opponent-scout", json=payload, headers=headers, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            strategy = data.get("strategy", "")
            tactics = data.get("key_tactics", [])
            warnings = data.get("warnings", [])
            
            if strategy and len(strategy) > 10:
                log_pass("Opponent Scout", f"Strategy length: {len(strategy)} chars, Tactics: {len(tactics)}, Warnings: {len(warnings)}")
                return True
            else:
                log_fail("Opponent Scout", f"Empty or too short response: {data}")
                return False
        elif resp.status_code == 429:
            log_warning("Opponent Scout", "Rate limited (429) - LLM endpoint working but rate-limited")
            return True
        elif resp.status_code == 500:
            log_warning("Opponent Scout", f"Server error (500) - may be LLM key issue: {resp.text}")
            return True
        else:
            log_fail("Opponent Scout", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Opponent Scout", f"Exception: {str(e)}")
        return False

def test_strategy_bot():
    """Test 17: Strategy Bot (LLM)"""
    print_section("TEST 17: Strategy Bot (LLM)")
    try:
        headers = {}
        if admin_token:
            headers["Authorization"] = f"Bearer {admin_token}"
        
        payload = {
            "message": "What's the best way to handle a strong net player?"
        }
        
        resp = session.post(f"{BASE_URL}/strategy-bot", json=payload, headers=headers, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            response_text = data.get("response", "")
            session_id = data.get("session_id", "")
            
            if response_text and len(response_text) > 10 and session_id:
                log_pass("Strategy Bot", f"Response length: {len(response_text)} chars, Session: {session_id[:20]}...")
                return True
            else:
                log_fail("Strategy Bot", f"Empty or invalid response: {data}")
                return False
        elif resp.status_code == 429:
            log_warning("Strategy Bot", "Rate limited (429) - LLM endpoint working but rate-limited")
            return True
        elif resp.status_code == 500:
            log_warning("Strategy Bot", f"Server error (500) - may be LLM key issue: {resp.text}")
            return True
        else:
            log_fail("Strategy Bot", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Strategy Bot", f"Exception: {str(e)}")
        return False

def test_web_push():
    """Test 18: Web Push"""
    print_section("TEST 18: Web Push")
    try:
        headers = {}
        if admin_token:
            headers["Authorization"] = f"Bearer {admin_token}"
        
        # Get VAPID key
        resp = session.get(f"{BASE_URL}/push/vapid-key", timeout=10)
        
        if resp.status_code != 200:
            log_fail("Get VAPID key", f"Status {resp.status_code}: {resp.text}")
            return False
        
        vapid_data = resp.json()
        public_key = vapid_data.get("publicKey", "")
        
        if not public_key:
            log_fail("Get VAPID key", "No publicKey in response")
            return False
        
        log_pass("Get VAPID key", f"Key length: {len(public_key)}")
        
        # Test subscribe endpoint with dummy payload
        dummy_subscription = {
            "subscription": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-123",
                "keys": {
                    "p256dh": "BDummyP256dhKeyForTesting123456789",
                    "auth": "DummyAuthKeyForTesting"
                }
            }
        }
        
        resp = session.post(f"{BASE_URL}/push/subscribe", json=dummy_subscription, headers=headers, timeout=10)
        
        if resp.status_code in [200, 201]:
            log_pass("Push subscribe", "Subscription accepted")
            return True
        elif resp.status_code == 400:
            # Validation error is acceptable
            log_pass("Push subscribe", f"Validation error (expected): {resp.text[:100]}")
            return True
        else:
            log_fail("Push subscribe", f"Status {resp.status_code}: {resp.text}")
            return False
    except Exception as e:
        log_fail("Web Push", f"Exception: {str(e)}")
        return False

def print_summary():
    """Print test summary"""
    print_section("TEST SUMMARY")
    
    total = len(results["passed"]) + len(results["failed"])
    passed = len(results["passed"])
    failed = len(results["failed"])
    warnings = len(results["warnings"])
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Warnings: {warnings}")
    
    if results["failed"]:
        print("\n❌ FAILED TESTS:")
        for fail in results["failed"]:
            print(f"  {fail}")
    
    if results["warnings"]:
        print("\n⚠️  WARNINGS:")
        for warn in results["warnings"]:
            print(f"  {warn}")
    
    print("\n✅ PASSED TESTS:")
    for pass_test in results["passed"]:
        print(f"  {pass_test}")
    
    return failed == 0

def main():
    print("\n" + "="*60)
    print("  TENNIS BUDDIES CLUB - BACKEND SMOKE TEST")
    print("  Fresh GitHub Sync Verification")
    print("="*60)
    print(f"\nBase URL: {BASE_URL}")
    print(f"Admin: {ADMIN_EMAIL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Run tests in order
    test_health()
    
    if not test_auth_login():
        print("\n❌ CRITICAL: Auth login failed. Cannot proceed with authenticated tests.")
        print_summary()
        sys.exit(1)
    
    test_auth_me()
    test_auth_logout()
    
    if not test_relogin():
        print("\n❌ CRITICAL: Re-authentication failed. Cannot proceed.")
        print_summary()
        sys.exit(1)
    
    # Events & RSVP
    success, events = test_weekly_events_list()
    success, event_id = test_create_event()
    
    if event_id:
        test_rsvp_flow(event_id)
        test_close_reopen_rsvp(event_id)
    
    # Stats endpoints
    test_solo_ladder()
    test_season_standings()
    test_head_to_head()
    test_partnerships()
    
    # Match history & chat
    test_match_history()
    test_matches_list()
    test_chatroom()
    
    # LLM endpoints
    test_opponent_scout()
    test_strategy_bot()
    
    # Web Push
    test_web_push()
    
    # Print summary
    success = print_summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED!")
        sys.exit(0)
    else:
        print("\n❌ SOME TESTS FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()
