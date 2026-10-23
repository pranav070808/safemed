
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from tests.demo.rehearsal import (
    load_document,
    extract_medication_status,
)


class TestDemoRehearsal(unittest.TestCase):

    def test_hospital_b_status(self):
        document = load_document("hospital_b.txt")
        status, evidence = extract_medication_status(document)

        self.assertEqual(status, "discontinued")
        self.assertIn("StudyMed A", evidence)

    def test_clinic_c_status(self):
        document = load_document("clinic_c.txt")
        status, evidence = extract_medication_status(document)

        self.assertEqual(status, "active")
        self.assertIn("StudyMed A", evidence)

    def test_potential_discrepancy(self):
        hospital_b = load_document("hospital_b.txt")
        clinic_c = load_document("clinic_c.txt")

        status_b, _ = extract_medication_status(hospital_b)
        status_c, _ = extract_medication_status(clinic_c)

        self.assertNotEqual(status_b, status_c)


if __name__ == "__main__":
    unittest.main()
