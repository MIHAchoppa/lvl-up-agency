import requests
import json
import io
from datetime import datetime

# Test the full flow and debug the video streaming issue
base_url = "https://bugzapper-beans.preview.emergentagent.com"
api_url = f"{base_url}/api"

# 1. Register host
host_bigo_id = f"debughost_{datetime.now().strftime('%H%M%S')}"
register_data = {
    "bigo_id": host_bigo_id,
    "password": "hostpass123",
    "name": "Debug Host",
    "email": f"{host_bigo_id}@test.com",
    "timezone": "UTC"
}

print("🔍 Registering host...")
response = requests.post(f"{api_url}/auth/register", json=register_data)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    host_token = response.json()['access_token']
    print(f"✅ Host token obtained")
else:
    print(f"❌ Failed: {response.text}")
    exit(1)

# 2. Login admin
print("\n🔍 Admin login...")
admin_data = {"bigo_id": "Admin", "password": "admin333"}
response = requests.post(f"{api_url}/auth/login", json=admin_data)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    admin_token = response.json()['access_token']
    print(f"✅ Admin token obtained")
else:
    print(f"❌ Failed: {response.text}")
    exit(1)

# 3. Upload init
print("\n🔍 Upload init...")
init_data = {
    "filename": "debug_test.mp4",
    "content_type": "video/mp4",
    "total_chunks": 2,
    "file_size": 1048576
}
headers = {'Authorization': f'Bearer {host_token}'}
response = requests.post(f"{api_url}/audition/upload/init", json=init_data, headers=headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    upload_id = response.json()['upload_id']
    submission_id = response.json()['submission_id']
    print(f"✅ Upload ID: {upload_id}")
    print(f"✅ Submission ID: {submission_id}")
else:
    print(f"❌ Failed: {response.text}")
    exit(1)

# 4. Upload chunks
for chunk_idx in [0, 1]:
    print(f"\n🔍 Upload chunk {chunk_idx}...")
    test_data = b"debug video chunk data " * 100
    files = {'chunk': ('chunk.mp4', io.BytesIO(test_data), 'video/mp4')}
    params = {'upload_id': upload_id, 'chunk_index': chunk_idx}
    response = requests.post(f"{api_url}/audition/upload/chunk", files=files, params=params, headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code != 200:
        print(f"❌ Failed: {response.text}")
        exit(1)

# 5. Complete upload
print(f"\n🔍 Complete upload...")
params = {'upload_id': upload_id}
response = requests.post(f"{api_url}/audition/upload/complete", params=params, headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

# 6. Check submission status
print(f"\n🔍 Check auditions list...")
admin_headers = {'Authorization': f'Bearer {admin_token}'}
response = requests.get(f"{api_url}/admin/auditions", headers=admin_headers)
print(f"Status: {response.status_code}")
if response.status_code == 200:
    auditions = response.json()
    our_submission = next((a for a in auditions if a.get('id') == submission_id), None)
    if our_submission:
        print(f"✅ Found submission:")
        print(f"   Status: {our_submission.get('status')}")
        print(f"   Video URL: {our_submission.get('video_url')}")
        print(f"   Name: {our_submission.get('name')}")
    else:
        print(f"❌ Submission not found")

# 7. Try to stream video
print(f"\n🔍 Try to stream video...")
response = requests.get(f"{api_url}/admin/auditions/{submission_id}/video", headers=admin_headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")