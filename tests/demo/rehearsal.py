

from pathlib import Path

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def load_document(filename):
    path = FIXTURES / filename
    return path.read_text(encoding="utf-8")


def extract_medication_status(document):
    for line in document.splitlines():
        if "StudyMed A" in line and "—" in line:
            status = line.split("—", 1)[1].split(",", 1)[0].strip()

            if status in ("active", "discontinued"):
                return status, line.strip()

    return None, None


def main():
    hospital_b = load_document("hospital_b.txt")
    clinic_c = load_document("clinic_c.txt")

    status_b, evidence_b = extract_medication_status(hospital_b)
    status_c, evidence_c = extract_medication_status(clinic_c)

    print("=" * 55)
    print("SAFEMED — SYNTHETIC DEMO REHEARSAL")
    print("=" * 55)

    print("Patient: SM001")
    print("Medication: StudyMed A (fictional)")
    print()

    print("HOSPITAL B")
    print("Status:", status_b)
    print("Evidence:", evidence_b)
    print()

    print("CLINIC C")
    print("Status:", status_c)
    print("Evidence:", evidence_c)
    print()

    if status_b and status_c and status_b != status_c:
        print("POTENTIAL DISCREPANCY DETECTED")
        print("Action: Clinician review required")
    else:
        print("No discrepancy established by this check")

    print()
    print("NOTE: Rule-based rehearsal using synthetic records.")
    print("Not a clinical AI system or medical recommendation.")


if __name__ == "__main__":
    main()
