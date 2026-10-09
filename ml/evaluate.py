import json
import os
import numpy as np
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, classification_report
)

def evaluate_model_performance(model, X_test, y_test, labels=['LOW', 'MEDIUM', 'HIGH']):
    """
    Evaluates classification model performance on actual test data.
    Does not use fabricated numbers.
    """
    y_pred = model.predict(X_test)
    
    acc = float(accuracy_score(y_test, y_pred))
    prec = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
    rec = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
    f1 = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
    
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    
    # Class-wise report
    report = classification_report(y_test, y_pred, labels=labels, output_dict=True, zero_division=0)
    
    results = {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "labels": labels,
        "confusion_matrix": cm.tolist(),
        "per_class": {
            lbl: {
                "precision": round(report[lbl]["precision"], 4),
                "recall": round(report[lbl]["recall"], 4),
                "f1_score": round(report[lbl]["f1-score"], 4),
                "support": int(report[lbl]["support"])
            }
            for lbl in labels if lbl in report
        }
    }
    
    return results

def save_evaluation_metrics(metrics, output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=2)
    print(f"Saved model evaluation metrics to {output_path}")
