#!/usr/bin/env python3
"""
Test script to validate the interview agent setup.
Run this script to check if all required dependencies and API keys are properly configured.
"""

import os
import sys
from dotenv import load_dotenv

def test_environment_variables():
    """Test if all required environment variables are set"""
    print("🔍 Checking environment variables...")
    
    load_dotenv('.env.local')
    
    required_vars = [
        'LIVEKIT_URL',
        'LIVEKIT_API_KEY', 
        'LIVEKIT_API_SECRET',
        'GROQ_API_KEY',
        'CARTESIA_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"  ✅ {var}: Set")
        else:
            print(f"  ❌ {var}: Missing")
            missing_vars.append(var)
    
    return len(missing_vars) == 0, missing_vars

def test_dependencies():
    """Test if all required Python packages are installed"""
    print("\n🔍 Checking Python dependencies...")
    
    required_packages = [
        'livekit',
        'groq',
        'cartesia',
        'python-dotenv'
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"  ✅ {package}: Installed")
        except ImportError:
            print(f"  ❌ {package}: Not installed")
            missing_packages.append(package)
    
    return len(missing_packages) == 0, missing_packages

def test_interview_config():
    """Test if interview configuration files are properly set up"""
    print("\n🔍 Checking interview configuration...")
    
    try:
        from interview_config import ROLE_TEMPLATES, SkillLevel, SOFTWARE_ENGINEER_TEMPLATE
        print("  ✅ interview_config.py: Valid")
        
        # Test if software engineer template is properly configured
        se_template = ROLE_TEMPLATES.get("Software Engineer")
        if se_template:
            print(f"  ✅ Software Engineer template: {len(se_template.competencies)} competencies")
            return True, None
        else:
            print("  ❌ Software Engineer template: Missing")
            return False, "Software Engineer template not found"
            
    except Exception as e:
        print(f"  ❌ interview_config.py: Error - {str(e)}")
        return False, str(e)

def test_api_connections():
    """Test basic API connectivity (without making actual calls)"""
    print("\n🔍 Testing API key formats...")
    
    load_dotenv('.env.local')
    
    # Test Groq key format  
    groq_key = os.getenv('GROQ_API_KEY')
    if groq_key and groq_key.startswith('gsk_'):
        print("  ✅ Groq API key: Valid format")
    else:
        print("  ⚠️  Groq API key: Invalid format (should start with 'gsk_')")
    
    # Test LiveKit URL format
    livekit_url = os.getenv('LIVEKIT_URL')
    if livekit_url and (livekit_url.startswith('wss://') or livekit_url.startswith('ws://')):
        print("  ✅ LiveKit URL: Valid format")
    else:
        print("  ⚠️  LiveKit URL: Invalid format (should start with 'wss://' or 'ws://')")
    
    return True, None

def test_agent_import():
    """Test if the main agent module can be imported"""
    print("\n🔍 Testing agent import...")
    
    try:
        from agent import InterviewAgent, get_interview_instructions
        print("  ✅ agent.py: Successfully imported")
        
        # Test agent initialization
        instructions = get_interview_instructions("Software Engineer", "Test Candidate", "mid")
        if instructions and len(instructions) > 100:
            print("  ✅ Interview instructions: Generated successfully")
            return True, None
        else:
            print("  ❌ Interview instructions: Too short or empty")
            return False, "Interview instructions generation failed"
            
    except Exception as e:
        print(f"  ❌ agent.py: Import error - {str(e)}")
        return False, str(e)

def main():
    """Run all tests and provide summary"""
    print("🚀 Interview Agent Setup Test\n")
    print("This script will validate your environment configuration.")
    print("=" * 50)
    
    all_tests_passed = True
    
    # Run all test functions
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Python Dependencies", test_dependencies), 
        ("Interview Configuration", test_interview_config),
        ("API Key Formats", test_api_connections),
        ("Agent Import", test_agent_import)
    ]
    
    results = {}
    for test_name, test_func in tests:
        passed, error = test_func()
        results[test_name] = (passed, error)
        if not passed:
            all_tests_passed = False
    
    # Print summary
    print("\n" + "=" * 50)
    print("📋 TEST SUMMARY")
    print("=" * 50)
    
    for test_name, (passed, error) in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}")
        if error:
            print(f"     Error: {error}")
    
    print("\n" + "=" * 50)
    if all_tests_passed:
        print("🎉 All tests passed! Your interview agent is ready to use.")
        print("\nTo start the agent, run:")
        print("  python agent.py")
    else:
        print("⚠️  Some tests failed. Please fix the issues above before running the agent.")
        print("\nCommon solutions:")
        print("- Install missing packages: pip install -r requirements.txt")
        print("- Create .env.local file with your API keys (see SETUP.md)")
        print("- Check API key formats and validity")
    
    print("=" * 50)
    return 0 if all_tests_passed else 1

if __name__ == "__main__":
    sys.exit(main()) 