
from pathlib import Path

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"

def load_document(filename):
    return (FIXTURES / filename).read_text(encoding="utf-8")

def extract_status(text):
    for line in text.splitlines():
        if "StudyMed A" in line and "—" in line:
            status = line.split("—", 1)[1].split(",", 1)[0].strip()
            if status in {"active", "discontinued"}:
                return status, line.strip()
    return None, None

def main():
    hospital_b = load_document("hospital_b.txt")
    clinic_c = load_document("clinic_c.txt")

    status_b, evidence_b = extract_status(hospital_b)
    status_c, evidence_c = extract_status(clinic_c)

    print("SAFEMED — SYNTHETIC DEMO REHEARSAL")
    print("Patient: SM001")
    print("Medication: StudyMed A")
    print()

    print(f"Hospital B status: {status_b}")
    print(f"Evidence: {evidence_b}")
    print()
    print(f"Clinic C status: {status_c}")
    print(f"Evidence: {evidence_c}")
    print()

    if status_b and status_c and status_b != status_c:
        print("RESULT: Potential discrepancy — clinician review needed")
    else:
        print("RESULT: No discrepancy established by this check")

    print()
    print("NOTE: Fixture-based rehearsal only; not clinical AI.")

if __name__ == "__main__":
    main()
