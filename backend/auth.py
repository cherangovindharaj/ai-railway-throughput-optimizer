import bcrypt
from database import get_connection
import re

def validate_password_strength(password: str) -> str:
    """
    Validates password strength
    Returns 'success' or error message
    """
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r'[0-9]', password):
        return "Password must contain at least one number"
    if not re.search(r'[!@#$%^&*(),.?\":{}|<>]', password):
        return "Password must contain at least one special character"
    return "success"

def hash_password(plain_password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )

def get_user_by_email(email: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    return user

def get_user_by_empid(emp_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE emp_id = ?", (emp_id,))
    user = cursor.fetchone()
    conn.close()
    return user

def login_user(email, plain_password):
    user = get_user_by_email(email)
    if not user:
        return None, "not_found"
    if not verify_password(plain_password, user["password"]):
        return None, "wrong_password"
    if user["status"] == "pending":
        return None, "pending"
    if user["status"] == "rejected":
        return None, "rejected"
    return {
        "id":       user["emp_id"],
        "name":     user["name"],
        "email":    user["email"],
        "role":     user["role"],
        "division": user["division"],
        "status":   user["status"]
    }, "success"

def create_user(emp_id, name, email, plain_password, division):
    pwd_check = validate_password_strength(plain_password)
    if pwd_check != "success":
        return f"weak_password:{pwd_check}"
    
    if get_user_by_email(email):
        return "email_exists"
    if get_user_by_empid(emp_id):
        return "empid_exists"
    try:
        hashed = hash_password(plain_password)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO users (emp_id, name, email, password, role, division, status)
            VALUES (?, ?, ?, ?, 'Pending', ?, 'pending')
        """, (emp_id, name, email, hashed, division))
        conn.commit()
        conn.close()
        return "success"
    except Exception as e:
        return f"error: {str(e)}"

def get_all_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, emp_id, name, email, role, division, status, created_at FROM users")
    users = cursor.fetchall()
    conn.close()
    return [dict(u) for u in users]

def get_pending_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, emp_id, name, email, role, division, status, created_at FROM users WHERE status = 'pending'")
    users = cursor.fetchall()
    conn.close()
    return [dict(u) for u in users]

def approve_user(emp_id, role, division):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users SET status = 'approved', role = ?, division = ?
            WHERE emp_id = ?
        """, (role, division, emp_id))
        conn.commit()
        conn.close()
        return "success"
    except Exception as e:
        return f"error: {str(e)}"

def reject_user(emp_id):
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET status = 'rejected' WHERE emp_id = ?", (emp_id,))
        conn.commit()
        conn.close()
        return "success"
    except Exception as e:
        return f"error: {str(e)}"

def get_user_profile(emp_id: str):
    """Get full profile of a user"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, emp_id, name, email, role, 
               division, phone, status, created_at 
        FROM users WHERE emp_id = ?
    """, (emp_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return dict(user)
    return None

def update_user_profile(emp_id: str, name: str, phone: str, division: str):
    """Update user profile details"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE users 
            SET name = ?, phone = ?, division = ?
            WHERE emp_id = ?
        """, (name, phone, division, emp_id))
        conn.commit()
        conn.close()
        return "success"
    except Exception as e:
        return f"error: {str(e)}"

def reset_password(emp_id: str, email: str, new_password: str):
    """
    Reset password after verifying emp_id + email match
    """
    # Verify user exists with matching emp_id AND email
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM users WHERE emp_id = ? AND email = ?",
        (emp_id, email)
    )
    user = cursor.fetchone()
    conn.close()

    if not user:
        return "user_not_found"

    if user["status"] == "rejected":
        return "account_rejected"

    # Encrypt new password
    hashed = hash_password(new_password)

    # Update password in database
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET password = ? WHERE emp_id = ?",
            (hashed, emp_id)
        )
        conn.commit()
        conn.close()
        return "success"
    except Exception as e:
        return f"error: {str(e)}"



def change_password(emp_id: str, old_password: str, new_password: str):
    """
    Change password — verifies old password first
    """
    user = get_user_by_empid(emp_id)
    if not user:
        return "user_not_found"
    if not verify_password(old_password, user["password"]):
        return "wrong_password"
    try:
        hashed = hash_password(new_password)
        conn   = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE users SET password = ? WHERE emp_id = ?",
            (hashed, emp_id)
        )
        conn.commit()
        conn.close()
        return "success"
    except Exception as e:
        return f"error: {str(e)}"
