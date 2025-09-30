#!/usr/bin/env python3

import requests
import io
from datetime import datetime

def test_audition_flow():
    base_url = "https://host-dashboard-8.preview.emergentagent.com/api"
    
    # Register host user
    host_bigo_id = f"testhost_{datetime.now().strftime('%H%M%S')}"
    register_data = {
        "bigo_id": host_bigo_id,
        "password": "testpass123",
        "name": "Test Host",
        "email": f"{host_bigo_id}@test.com",
        "timezone": "UTC"
    }
    
    print("🔐 Registering host user...")
    response = requests.post(f"{base_url}/auth/register", json=register_data)
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.status_code} - {response.text}")
        return
    
    token = response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    print("✅ Host registered successfully")
    
    # Initialize upload
    print("📤 Initializing upload...")
    init_data = {
        "filename": "test.mp4",
        "content_type": "video/mp4", 
        "total_chunks": 2,
        "file_size": 1048576
    }
    
    response = requests.post(f"{base_url}/audition/upload/init", json=init_data, headers=headers)
    if response.status_code != 200:
        print(f"❌ Init failed: {response.status_code} - {response.text}")
        return
    
    upload_data = response.json()
    upload_id = upload_data['upload_id']
    submission_id = upload_data['submission_id']
    
    print(f"✅ Upload initialized - ID: {upload_id}")
    
    # Upload chunks
    for chunk_idx in [0, 1]:
        print(f"📦 Uploading chunk {chunk_idx}...")
        test_data = b"test video chunk data " * 100
        files = {'chunk': ('chunk.mp4', io.BytesIO(test_data), 'video/mp4')}
        params = {'upload_id': upload_id, 'chunk_index': chunk_idx}
        
        response = requests.post(f"{base_url}/audition/upload/chunk", 
                               files=files, params=params, 
                               headers={'Authorization': f'Bearer {token}'})
        
        if response.status_code != 200:
            print(f"❌ Chunk {chunk_idx} failed: {response.status_code} - {response.text}")
            return
        
        print(f"✅ Chunk {chunk_idx} uploaded")
    
    # Complete upload
    print("🏁 Completing upload...")
    params = {'upload_id': upload_id}
    response = requests.post(f"{base_url}/audition/upload/complete", 
                           params=params, headers=headers)
    
    if response.status_code != 200:
        print(f"❌ Complete failed: {response.status_code} - {response.text}")
        print("Backend logs might have more details")
        return
    
    print("✅ Upload completed successfully!")
    print(f"📝 Submission ID: {submission_id}")

if __name__ == "__main__":
    test_audition_flow()