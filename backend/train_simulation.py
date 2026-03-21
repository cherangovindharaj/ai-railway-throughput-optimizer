import random
import time

# Real Indian Railway stations (Chennai to Trichy route)
STATIONS = [
    {"name": "Chennai Central",  "km": 0},
    {"name": "Villupuram",       "km": 162},
    {"name": "Vridhachalam",     "km": 214},
    {"name": "Trichy",           "km": 336},
]

# 5 trains running on this section
TRAINS = [
    {"id": "T001", "name": "Chennai Express",   "speed": 80},
    {"id": "T002", "name": "Trichy Mail",        "speed": 70},
    {"id": "T003", "name": "Pallavan Express",   "speed": 90},
    {"id": "T004", "name": "Rock Fort Express",  "speed": 75},
    {"id": "T005", "name": "Cholan Express",     "speed": 65},
]

# Track each train's position
train_positions = {
    "T001": 0,
    "T002": 50,
    "T003": 100,
    "T004": 180,
    "T005": 250,
}

def get_train_positions():
    global train_positions
    result = []

    for train in TRAINS:
        tid = train["id"]

        # Move train forward (simulate real-time movement)
        move = random.uniform(1, 5)
        train_positions[tid] = (train_positions[tid] + move) % 336

        # Find current station
        current_station = STATIONS[0]["name"]
        for station in STATIONS:
            if train_positions[tid] >= station["km"]:
                current_station = station["name"]

        # Random small delay simulation
        delay = random.randint(0, 10)

        result.append({
            "id": tid,
            "name": train["name"],
            "position_km": round(train_positions[tid], 2),
            "speed_kmh": train["speed"] + random.randint(-5, 5),
            "current_station": current_station,
            "delay_minutes": delay,
            "status": "Running"
        })

    return result