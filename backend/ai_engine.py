def get_ai_suggestions(conflicts):
    suggestions = []

    for conflict in conflicts:
        if conflict["severity"] == "CRITICAL":
            suggestions.append({
                "type": "EMERGENCY STOP",
                "train": conflict["train_b"],
                "train_name": conflict["train_b_name"],
                "action": f"🔴 STOP {conflict['train_b_name']} immediately!",
                "reason": f"Only {conflict['distance_km']}km from {conflict['train_a_name']}",
                "priority": "HIGH"
            })
        elif conflict["severity"] == "WARNING":
            suggestions.append({
                "type": "SLOW DOWN",
                "train": conflict["train_b"],
                "train_name": conflict["train_b_name"],
                "action": f"🟡 Slow down {conflict['train_b_name']} to 30 km/h",
                "reason": f"Getting close to {conflict['train_a_name']}",
                "priority": "MEDIUM"
            })

    if not suggestions:
        suggestions.append({
            "type": "ALL CLEAR",
            "action": "🟢 All trains running safely",
            "reason": "No conflicts detected",
            "priority": "LOW"
        })

    return suggestions