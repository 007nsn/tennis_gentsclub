import requests
import sys
from datetime import datetime, timezone
import uuid

class TennisBuddiesAPITester:
    def __init__(self, base_url="https://doubles-ladder.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.admin_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_team_id = None
        self.created_schedule_id = None
        self.created_article_id = None
        self.created_announcement_id = None
        self.test_user_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if use_admin and self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.text:
                    try:
                        return True, response.json()
                    except:
                        return True, response.text
                return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_registration_flow(self):
        """Test user registration - create test users"""
        print(f"\n{'='*50}")
        print("TESTING USER REGISTRATION FLOW")
        print(f"{'='*50}")
        
        # Register a test user (will be member since admin already exists)
        timestamp = str(int(datetime.now().timestamp()))
        member_data = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@tennis.com", 
            "password": "password123"
        }
        
        success, response = self.run_test(
            "Register Test User",
            "POST",
            "auth/register",
            200,
            data=member_data
        )
        
        if success and 'token' in response and 'user' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.test_user_id = response['user']['id']
            print(f"✅ Test user registered with role: {response['user']['role']}")
        else:
            print("❌ Test user registration failed")
            return False
            
        # For admin operations, we'll need to use existing admin credentials
        # Let's try to get admin token by registering with known admin email or use a test admin
        admin_data = {
            "name": f"Test Admin {timestamp}",
            "email": f"testadmin{timestamp}@tennis.com",
            "password": "password123"
        }
        
        success, response = self.run_test(
            "Register Test Admin",
            "POST",
            "auth/register",
            200,
            data=admin_data
        )
        
        if success and 'token' in response:
            # Even if not admin, we'll use this token for some tests
            if response['user']['role'] == 'admin':
                self.admin_token = response['token']
                self.admin_id = response['user']['id']
                print("✅ Got admin token")
            else:
                print("⚠️ No admin token available, some admin tests will be skipped")
                
        return True

    def test_login_flow(self):
        """Test user login"""
        print(f"\n{'='*50}")
        print("TESTING LOGIN FLOW")
        print(f"{'='*50}")
        
        # Try login with admin credentials
        admin_login = {
            "email": f"admin{str(int(datetime.now().timestamp()))}@tennis.com",
            "password": "password123"
        }
        
        # We need to use a known email, so let's get it from registration response
        # For now, test with any credentials to see auth flow
        success, response = self.run_test(
            "Admin Login",
            "POST", 
            "auth/login",
            401,  # Expected to fail with unknown credentials
            data=admin_login
        )
        
        return True

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print(f"\n{'='*50}")
        print("TESTING AUTH ENDPOINTS")
        print(f"{'='*50}")
        
        # Test /auth/me endpoint
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            use_admin=False
        )
        
        # Test get all users
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200,
            use_admin=False
        )
        
        return success

    def test_team_management(self):
        """Test team management"""
        print(f"\n{'='*50}")
        print("TESTING TEAM MANAGEMENT")
        print(f"{'='*50}")
        
        # Get teams (should work without auth)
        success, response = self.run_test(
            "Get Teams",
            "GET",
            "teams",
            200
        )
        
        # Create team (requires admin)
        if self.admin_token and self.test_user_id:
            team_data = {
                "name": f"Test Team {datetime.now().strftime('%H%M%S')}",
                "member_ids": [self.test_user_id]
            }
            
            success, response = self.run_test(
                "Create Team",
                "POST",
                "teams",
                200,
                data=team_data,
                use_admin=True
            )
            
            if success and 'id' in response:
                self.created_team_id = response['id']
                print(f"✅ Created team with ID: {self.created_team_id}")
        
        return success

    def test_solo_ladder(self):
        """Test solo ladder"""
        print(f"\n{'='*50}")
        print("TESTING SOLO LADDER")
        print(f"{'='*50}")
        
        success, response = self.run_test(
            "Get Solo Ladder",
            "GET",
            "solo-ladder",
            200
        )
        
        return success

    def test_match_management(self):
        """Test match management"""
        print(f"\n{'='*50}")
        print("TESTING MATCH MANAGEMENT")
        print(f"{'='*50}")
        
        # Get all matches
        success, response = self.run_test(
            "Get All Matches",
            "GET",
            "matches",
            200
        )
        
        # Get pending matches
        success, response = self.run_test(
            "Get Pending Matches",
            "GET",
            "matches?status=pending",
            200
        )
        
        # Submit a match result (requires auth)
        if self.token and self.created_team_id:
            match_data = {
                "match_type": "singles",
                "player_a_id": self.user_id,
                "player_b_id": self.admin_id,
                "score_a": 6,
                "score_b": 4,
                "match_date": datetime.now(timezone.utc).isoformat()
            }
            
            success, response = self.run_test(
                "Submit Match Result",
                "POST",
                "matches",
                200,
                data=match_data,
                use_admin=False
            )
            
            if success and 'id' in response:
                match_id = response['id']
                
                # Test match approval (requires admin)
                success, response = self.run_test(
                    "Approve Match",
                    "PUT",
                    f"matches/{match_id}/approve",
                    200,
                    use_admin=True
                )
        
        return success

    def test_schedule_management(self):
        """Test schedule management"""
        print(f"\n{'='*50}")
        print("TESTING SCHEDULE MANAGEMENT")  
        print(f"{'='*50}")
        
        # Get schedules
        success, response = self.run_test(
            "Get Schedules",
            "GET",
            "schedules",
            200
        )
        
        # Create schedule (requires admin)
        if self.admin_token:
            schedule_data = {
                "title": f"Test Schedule {datetime.now().strftime('%H%M%S')}",
                "description": "Test schedule description",
                "match_date": "2024-12-15",
                "match_time": "10:00",
                "location": "Test Court",
                "teams": ["Team A", "Team B"]
            }
            
            success, response = self.run_test(
                "Create Schedule",
                "POST",
                "schedules",
                200,
                data=schedule_data,
                use_admin=True
            )
            
            if success and 'id' in response:
                self.created_schedule_id = response['id']
        
        return success

    def test_education_articles(self):
        """Test education/articles management"""
        print(f"\n{'='*50}")
        print("TESTING EDUCATION ARTICLES")
        print(f"{'='*50}")
        
        # Get articles
        success, response = self.run_test(
            "Get All Articles",
            "GET", 
            "articles",
            200
        )
        
        # Get articles by category
        success, response = self.run_test(
            "Get Articles by Category",
            "GET",
            "articles?category=technique",
            200
        )
        
        # Create article (requires admin)
        if self.admin_token:
            article_data = {
                "title": f"Test Article {datetime.now().strftime('%H%M%S')}",
                "content": "This is a test article about tennis techniques.",
                "category": "technique",
                "video_url": "https://youtube.com/watch?v=example",
                "image_url": "https://example.com/image.jpg"
            }
            
            success, response = self.run_test(
                "Create Article",
                "POST",
                "articles",
                200,
                data=article_data,
                use_admin=True
            )
            
            if success and 'id' in response:
                self.created_article_id = response['id']
                
                # Test get single article
                success, response = self.run_test(
                    "Get Single Article",
                    "GET",
                    f"articles/{self.created_article_id}",
                    200
                )
        
        return success

    def test_announcements(self):
        """Test announcements"""
        print(f"\n{'='*50}")
        print("TESTING ANNOUNCEMENTS")
        print(f"{'='*50}")
        
        # Get announcements
        success, response = self.run_test(
            "Get Announcements", 
            "GET",
            "announcements",
            200
        )
        
        # Create announcement (requires admin)
        if self.admin_token:
            announcement_data = {
                "title": f"Test Announcement {datetime.now().strftime('%H%M%S')}",
                "content": "This is a test announcement.",
                "priority": "normal"
            }
            
            success, response = self.run_test(
                "Create Announcement",
                "POST",
                "announcements", 
                200,
                data=announcement_data,
                use_admin=True
            )
            
            if success and 'id' in response:
                self.created_announcement_id = response['id']
        
        return success

    def test_chat_functionality(self):
        """Test AI chat functionality"""
        print(f"\n{'='*50}")
        print("TESTING AI CHAT FUNCTIONALITY")
        print(f"{'='*50}")
        
        if self.token:
            chat_data = {
                "message": "What are some basic tennis techniques?"
            }
            
            success, response = self.run_test(
                "Send Chat Message",
                "POST",
                "chat",
                200,
                data=chat_data,
                use_admin=False
            )
            
            if success:
                print(f"✅ Chat response received: {response.get('content', '')[:100]}...")
            
            # Test chat history
            success, response = self.run_test(
                "Get Chat History",
                "GET",
                "chat/history", 
                200,
                use_admin=False
            )
        
        return success

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        print(f"\n{'='*50}")
        print("TESTING STATS ENDPOINT")
        print(f"{'='*50}")
        
        success, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "stats",
            200
        )
        
        if success and isinstance(response, dict):
            print(f"✅ Stats received: {response}")
        
        return success

    def test_availability_system(self):
        """Test availability system for Sundays"""
        print(f"\n{'='*50}")
        print("TESTING AVAILABILITY SYSTEM")
        print(f"{'='*50}")
        
        # Get upcoming Sundays
        success, response = self.run_test(
            "Get Upcoming Sundays",
            "GET",
            "availability/upcoming-sundays",
            200
        )
        
        if success and 'sundays' in response and len(response['sundays']) > 0:
            sunday_date = response['sundays'][0]
            print(f"✅ Got upcoming Sundays: {response['sundays']}")
            
            # Set availability for Sunday (requires auth)
            if self.token:
                availability_data = {
                    "date": sunday_date,
                    "available": True
                }
                
                success, response = self.run_test(
                    "Set Availability for Sunday",
                    "POST",
                    "availability",
                    200,
                    data=availability_data,
                    use_admin=False
                )
                
                if success:
                    print(f"✅ Set availability for {sunday_date}")
                    
                    # Get availability for that date
                    success, response = self.run_test(
                        "Get Availability for Date",
                        "GET",
                        f"availability?date={sunday_date}",
                        200
                    )
                    
                    if success:
                        print(f"✅ Retrieved availability data: {len(response)} entries")
        
        return success

    def test_round_robin_generation(self):
        """Test round robin generation"""
        print(f"\n{'='*50}")
        print("TESTING ROUND ROBIN GENERATION")
        print(f"{'='*50}")
        
        # This requires admin token and available players
        if not self.admin_token:
            print("⚠️ Skipping round robin test - no admin token")
            return True
            
        # Get upcoming Sundays first
        success, response = self.run_test(
            "Get Sundays for Round Robin",
            "GET",
            "availability/upcoming-sundays",
            200
        )
        
        if success and 'sundays' in response and len(response['sundays']) > 0:
            sunday_date = response['sundays'][0]
            
            # Try to generate round robin (might fail if not enough players)
            round_robin_data = {
                "date": sunday_date,
                "num_courts": 2,
                "match_duration_minutes": 30,
                "start_time": "09:00"
            }
            
            success, response = self.run_test(
                "Generate Round Robin Schedule",
                "POST",
                "schedules/generate-round-robin",
                400,  # Expect 400 if not enough players
                data=round_robin_data,
                use_admin=True
            )
            
            # This is expected to fail with not enough players, which is fine
            print("✅ Round robin endpoint tested (expected to need more players)")
        
        return True

    def test_messages_system(self):
        """Test player-admin messaging system"""
        print(f"\n{'='*50}")
        print("TESTING MESSAGES SYSTEM")
        print(f"{'='*50}")
        
        if self.token:
            # Send message to admin
            message_data = {
                "content": "Test message from player to admin"
            }
            
            success, response = self.run_test(
                "Send Message to Admin",
                "POST",
                "messages",
                200,
                data=message_data,
                use_admin=False
            )
            
            if success:
                print("✅ Message sent to admin")
                
                # Get messages
                success, response = self.run_test(
                    "Get Messages",
                    "GET",
                    "messages",
                    200,
                    use_admin=False
                )
                
                if success:
                    print(f"✅ Retrieved messages: {len(response)} messages")
                    
                # Get unread count
                success, response = self.run_test(
                    "Get Unread Message Count",
                    "GET",
                    "messages/unread-count",
                    200,
                    use_admin=False
                )
        
        return success

    def test_settings_management(self):
        """Test club settings management"""
        print(f"\n{'='*50}")
        print("TESTING SETTINGS MANAGEMENT")
        print(f"{'='*50}")
        
        if self.admin_token:
            # Get current settings
            success, response = self.run_test(
                "Get Club Settings",
                "GET",
                "settings",
                200,
                use_admin=True
            )
            
            if success:
                print(f"✅ Retrieved settings: {response}")
                
                # Update settings
                settings_data = {
                    "num_courts": 3,
                    "default_location": "Test Tennis Club",
                    "match_duration_minutes": 45,
                    "default_start_time": "10:00"
                }
                
                success, response = self.run_test(
                    "Update Club Settings",
                    "PUT",
                    "settings",
                    200,
                    data=settings_data,
                    use_admin=True
                )
                
                if success:
                    print("✅ Settings updated successfully")
        else:
            print("⚠️ Skipping settings test - no admin token")
        
        return True

    def cleanup_test_data(self):
        """Clean up test data"""
        print(f"\n{'='*50}")
        print("CLEANING UP TEST DATA")
        print(f"{'='*50}")
        
        if self.admin_token:
            # Delete created resources
            if self.created_team_id:
                self.run_test("Delete Test Team", "DELETE", f"teams/{self.created_team_id}", 200, use_admin=True)
            
            if self.created_schedule_id:
                self.run_test("Delete Test Schedule", "DELETE", f"schedules/{self.created_schedule_id}", 200, use_admin=True)
                
            if self.created_article_id:
                self.run_test("Delete Test Article", "DELETE", f"articles/{self.created_article_id}", 200, use_admin=True)
                
            if self.created_announcement_id:
                self.run_test("Delete Test Announcement", "DELETE", f"announcements/{self.created_announcement_id}", 200, use_admin=True)
        """Clean up test data"""
        print(f"\n{'='*50}")
        print("CLEANING UP TEST DATA")
        print(f"{'='*50}")
        
        if self.admin_token:
            # Delete created resources
            if self.created_team_id:
                self.run_test("Delete Test Team", "DELETE", f"teams/{self.created_team_id}", 200, use_admin=True)
            
            if self.created_schedule_id:
                self.run_test("Delete Test Schedule", "DELETE", f"schedules/{self.created_schedule_id}", 200, use_admin=True)
                
            if self.created_article_id:
                self.run_test("Delete Test Article", "DELETE", f"articles/{self.created_article_id}", 200, use_admin=True)
                
            if self.created_announcement_id:
                self.run_test("Delete Test Announcement", "DELETE", f"announcements/{self.created_announcement_id}", 200, use_admin=True)

def main():
    print("🎾 Starting Tennis Buddies Club API Testing...")
    print(f"Base URL: https://doubles-ladder.preview.emergentagent.com/api")
    
    tester = TennisBuddiesAPITester()
    
    # Test sequence
    try:
        # 1. Test registration flow (creates admin + member users)
        if not tester.test_registration_flow():
            print("❌ Registration flow failed, stopping tests")
            return 1
        
        # 2. Test authentication endpoints
        tester.test_auth_endpoints()
        
        # 3. Test team management
        tester.test_team_management()
        
        # 4. Test solo ladder
        tester.test_solo_ladder()
        
        # 5. Test match management
        tester.test_match_management()
        
        # 6. Test schedule management  
        tester.test_schedule_management()
        
        # 7. Test education articles
        tester.test_education_articles()
        
        # 8. Test announcements
        tester.test_announcements()
        
        # 9. Test AI chat functionality
        tester.test_chat_functionality()
        
        # 10. Test stats endpoint
        tester.test_stats_endpoint()
        
        # 11. Test availability system
        tester.test_availability_system()
        
        # 12. Test round robin generation
        tester.test_round_robin_generation()
        
        # 13. Test messages system
        tester.test_messages_system()
        
        # 14. Test settings management
        tester.test_settings_management()
        
        # Cleanup
        tester.cleanup_test_data()
        
    except Exception as e:
        print(f"❌ Testing failed with error: {e}")
        return 1
    
    # Print final results
    print(f"\n{'='*50}")
    print("FINAL TEST RESULTS")
    print(f"{'='*50}")
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"📊 Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())