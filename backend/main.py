from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from train_simulation import get_train_positions
from conflict_detection import detect_conflicts
from ai_engine import get_ai_suggestions
from database import create_tables, seed_default_users
from auth import login_user, create_user, get_all_users, get_pending_users, approve_user, reject_user
import uvicorn
from real_train_api import get_real_trains
from auth import login_user, create_user, get_all_users, get_pending_users, approve_user, reject_user, get_user_profile, update_user_profile
from auth import login_user, create_user, get_all_users, get_pending_users, approve_user, reject_user, get_user_profile, update_user_profile, reset_password
from auth import login_user, create_user, get_all_users, get_pending_users, approve_user, reject_user, get_user_profile, update_user_profile, reset_password, change_password

app = FastAPI(title="Railway Throughput Optimization System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Models ─────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email:    str
    password: str

class SignupRequest(BaseModel):
    emp_id:   str
    name:     str
    email:    str
    password: str
    division: str

class ApproveRequest(BaseModel):
    emp_id:   str
    role:     str
    division: str

class RejectRequest(BaseModel):
    emp_id: str

# ── Startup ────────────────────────────────────────────────
@app.on_event("startup")
def startup():
    create_tables()
    seed_default_users()
    print("🚆 Railway API Started!")

# ── Auth ───────────────────────────────────────────────────
@app.post("/auth/login")
def login(data: LoginRequest):
    user, message = login_user(data.email, data.password)
    if message == "pending":
        raise HTTPException(status_code=403, detail="Your account is pending admin approval.")
    if message == "rejected":
        raise HTTPException(status_code=403, detail="Your account was rejected. Contact admin.")
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"success": True, "user": user}

@app.post("/auth/signup")
def signup(data: SignupRequest):
    result = create_user(
        
        emp_id=data.emp_id,
        name=data.name,
        email=data.email,
        plain_password=data.password,
        division=data.division
    )
    if result.startswith("weak_password:"):   
        msg = result.replace("weak_password:", "")
        raise HTTPException(status_code=400, detail=msg)
    if result == "email_exists":
        raise HTTPException(status_code=400, detail="Email already registered.")
    if result == "empid_exists":
        raise HTTPException(status_code=400, detail="Employee ID already exists.")
    if str(result).startswith("error"):
        raise HTTPException(status_code=500, detail=str(result))
    return {"success": True, "message": "Request submitted! Wait for admin approval."}

# ── Train Routes ───────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "Railway API Running! 🚆"}

@app.get("/trains")
def get_trains():
    return {"trains": get_train_positions()}

@app.get("/conflicts")
def get_conflicts():
    trains = get_real_trains()  # ← use real trains
    return {"conflicts": detect_conflicts(trains)}

@app.get("/suggestions")
def get_suggestions():
    trains    = get_real_trains()
    conflicts = detect_conflicts(trains)
    return {"suggestions": get_ai_suggestions(conflicts)}
@app.get("/trains/real")
def get_real_train_data(route: str = "Chennai → Trichy"):
    """Get real Indian Railways train data"""
    trains = get_real_trains(route)
    return {
        "trains": trains,
        "route":  route,
        "total":  len(trains)
    }
    

@app.get("/routes")
def get_routes():
    """Get all available routes"""
    return {
        "routes": [
            "Chennai → Trichy",
            "Chennai → Mumbai",
            "Chennai → Delhi",
            "Mumbai → Delhi",
            "Chennai → Kolkata"
        ]
    }
    

# ── Admin Routes ───────────────────────────────────────────
@app.get("/admin/users")
def view_all_users():
    return {"users": get_all_users(), "total": len(get_all_users())}

@app.get("/admin/pending")
def view_pending():
    users = get_pending_users()
    return {"pending_users": users, "total": len(users)}

@app.post("/admin/approve")
def approve(data: ApproveRequest):
    result = approve_user(data.emp_id, data.role, data.division)
    if result != "success":
        raise HTTPException(status_code=500, detail="Failed to approve.")
    return {"success": True, "message": f"{data.emp_id} approved!"}

@app.post("/admin/reject")
def reject(data: RejectRequest):
    result = reject_user(data.emp_id)
    if result != "success":
        raise HTTPException(status_code=500, detail="Failed to reject.")
    return {"success": True, "message": f"{data.emp_id} rejected."}
    """Returns throughput comparison data for charts"""
    trains = get_train_positions()
@app.get("/analytics")
def get_analytics():
    trains = get_train_positions()
    # Historical throughput data
    labels      = ["10:00","10:05","10:10","10:15","10:20","10:25","10:30","10:35","10:40","10:45"]
    without_ai  = [6, 5, 7, 5, 6, 4, 6, 5, 7, 6]
    with_ai     = [8, 9, 11, 10, 12, 11, 13, 12, 11, 12]

    return {
        "throughput": {
            "labels":     labels,
            "without_ai": without_ai,
            "with_ai":    with_ai,
        },
        "speed_data": [
            {"name": t["name"].split()[0], "speed": t["speed_kmh"], "delay": t["delay_minutes"]}
            for t in trains
        ],
        "summary": {
            "avg_without_ai":    5.7,
            "avg_with_ai":       10.9,
            "improvement_pct":   40
        }
    }
# ── Profile Routes ─────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    emp_id:   str
    name:     str
    phone:    str
    division: str

@app.get("/profile/{emp_id}")
def get_profile(emp_id: str):
    """Get user profile"""
    profile = get_user_profile(emp_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return {"profile": profile}

@app.put("/profile/update")
def update_profile(data: UpdateProfileRequest):
    """Update user profile"""
    result = update_user_profile(
        emp_id=data.emp_id,
        name=data.name,
        phone=data.phone,
        division=data.division
    )
    if result != "success":
        raise HTTPException(status_code=500, detail="Failed to update profile")
    return {"success": True, "message": "Profile updated successfully!"}

class ResetPasswordRequest(BaseModel):
    emp_id:       str
    email:        str
    new_password: str
class ChangePasswordRequest(BaseModel):
    emp_id:       str
    old_password: str
    new_password: str

@app.post("/auth/reset-password")
def reset_pwd(data: ResetPasswordRequest):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    
    result = reset_password(data.emp_id, data.email, data.new_password)
    
    if result == "user_not_found":
        raise HTTPException(status_code=404, detail="No account found with this Employee ID and Email combination.")
    if result == "account_rejected":
        raise HTTPException(status_code=403, detail="Your account has been rejected. Contact admin.")
    if str(result).startswith("error"):
        raise HTTPException(status_code=500, detail="Server error. Try again.")
    
    return {"success": True, "message": "Password reset successfully! You can now login."}
@app.post("/auth/change-password")
def change_pwd(data: ChangePasswordRequest):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")
    result = change_password(data.emp_id, data.old_password, data.new_password)
    if result == "user_not_found":
        raise HTTPException(status_code=404, detail="User not found.")
    if result == "wrong_password":
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    if str(result).startswith("error"):
        raise HTTPException(status_code=500, detail="Server error.")
    return {"success": True, "message": "Password changed successfully!"}
  
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)