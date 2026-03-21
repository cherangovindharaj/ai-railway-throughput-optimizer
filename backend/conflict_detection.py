SAFE_DISTANCE_KM = 10  # Minimum safe distance between trains

def detect_conflicts(trains):
    conflicts = []

    # Compare every pair of trains
    for i in range(len(trains)):
        for j in range(i + 1, len(trains)):
            train_a = trains[i]
            train_b = trains[j]

            distance = abs(train_a["position_km"] - train_b["position_km"])

            if distance < SAFE_DISTANCE_KM:
                severity = "CRITICAL" if distance < 3 else "WARNING"

                conflicts.append({
                    "train_a": train_a["id"],
                    "train_b": train_b["id"],
                    "train_a_name": train_a["name"],
                    "train_b_name": train_b["name"],
                    "distance_km": round(distance, 2),
                    "severity": severity,
                    "location_km": round(train_a["position_km"], 2),
                    "message": f"{train_a['name']} and {train_b['name']} are only {round(distance,2)}km apart!"
                })

    return conflicts