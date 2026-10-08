"""
Test script for Hugging Face Mistral-7B chatbot integration
Run this to verify your setup is working correctly.
"""

import os
import sys
import json
from dotenv import load_dotenv

# Add backend to path
BASE_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
sys.path.insert(0, BACKEND_DIR)

# Load backend/.env so local API keys work during tests.
load_dotenv(os.path.join(BACKEND_DIR, '.env'))

def test_huggingface_setup():
    """Test if Hugging Face API key is configured."""
    api_key = os.getenv('HUGGINGFACE_API_KEY')
    
    if not api_key:
        print("❌ HUGGINGFACE_API_KEY not set!")
        print("   Please set your API key:")
        print("   - Windows: set HUGGINGFACE_API_KEY=hf_xxxxx")
        print("   - Mac/Linux: export HUGGINGFACE_API_KEY=hf_xxxxx")
        print("   - Or create backend/.env file with HUGGINGFACE_API_KEY=hf_xxxxx")
        return False
    
    if not api_key.startswith('hf_'):
        print("⚠️ Warning: API key doesn't start with 'hf_'")
        return False

    if 'YOUR_TOKEN_HERE' in api_key or len(api_key) < 20:
        print("❌ HUGGINGFACE_API_KEY looks like a placeholder or invalid value")
        return False
    
    print(f"✅ API key found: {api_key[:20]}...")
    return True


def test_imports():
    """Test if all required modules can be imported."""
    modules = [
        ('requests', 'requests'),
        ('huggingface_hub', 'huggingface-hub'),
        ('flask', 'flask'),
        ('numpy', 'numpy'),
    ]
    
    print("\nChecking imports...")
    all_ok = True
    
    for module_name, pip_name in modules:
        try:
            __import__(module_name)
            print(f"✅ {module_name} installed")
        except ImportError:
            print(f"❌ {module_name} NOT installed")
            print(f"   Run: pip install {pip_name}")
            all_ok = False
    
    return all_ok


def test_api_connection():
    """Test connection to Hugging Face API."""
    try:
        from utils.huggingface_ai import call_mistral_api
        
        print("\nTesting Hugging Face API connection...")
        
        test_prompt = "Hello, how are you? Please respond with one short sentence."
        response = call_mistral_api(test_prompt, max_tokens=50)
        
        if response:
            print(f"✅ API connection successful!")
            print(f"   Response: {response[:100]}...")
            return True
        else:
            print(f"❌ API returned empty response")
            print(f"   Check your API key and internet connection")
            return False
            
    except Exception as e:
        print(f"❌ API connection failed: {str(e)}")
        return False


def test_chatbot_logic():
    """Test the chatbot response function."""
    try:
        from utils.huggingface_ai import generate_ai_response
        
        print("\nTesting chatbot response generation...")
        
        response = generate_ai_response(
            message="What are some health tips?",
            conversation_history=[],
            user_role='patient',
            use_fallback=True  # Use fallback for testing
        )
        
        if response and response.get('message'):
            print(f"✅ Response generated successfully")
            print(f"   Type: {response.get('type')}")
            print(f"   Message preview: {response.get('message')[:80]}...")
            return True
        else:
            print(f"❌ Failed to generate response")
            return False
            
    except Exception as e:
        print(f"❌ Error in chatbot logic: {str(e)}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("AI-Powered Chatbot Setup Verification")
    print("=" * 60)
    
    tests = [
        ("Hugging Face API Key", test_huggingface_setup),
        ("Module Imports", test_imports),
        ("Hugging Face API Connection", test_api_connection),
        ("Chatbot Response Logic", test_chatbot_logic),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'─' * 60}")
        print(f"Test: {test_name}")
        print(f"{'─' * 60}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'=' * 60}")
    print("SUMMARY")
    print(f"{'=' * 60}")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nResult: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Your chatbot is ready to use.")
        print("\nNext steps:")
        print("1. Start the backend: python app.py")
        print("2. Start the frontend: npm start")
        print("3. Open the app and test the chatbot")
        return 0
    else:
        print("\n⚠️ Some tests failed. Please fix the issues above.")
        return 1


if __name__ == '__main__':
    sys.exit(main())
