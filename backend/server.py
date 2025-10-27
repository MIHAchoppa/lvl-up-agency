import os
import logging
from fastapi import FastAPI
from pymongo import MongoClient

# Initialize FastAPI app
app = FastAPI()

# Connect to the database
client = MongoClient(os.getenv("MONGODB_URI"))
db = client[os.getenv("DB_NAME")]

# Import services
from services.email_service import EmailService

# Instantiate email service
email_service = EmailService(db=db)

# Outreach endpoint
@app.post("/outreach")
async def outreach(email: str, subject: str, message: str):
    try:
        # Send email using the EmailService
        result = await email_service.send_email(to_email=email, subject=subject, plain_text=message)
        # Persist send results
        # TODO: Implement logic to update contacted_count/failed_count
        return {"success": result['success'], "meta": result}
    except Exception as e:
        logging.error(f"Error sending outreach email: {e}")
        return {"success": False, "error": str(e)}

# Additional endpoints and logic
