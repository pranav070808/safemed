
from pathlib import Path
import unittest

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"


def read_fixture(filename):
    return (FIXTURES / filename).read_text(encoding="utf-8")


class TestSyntheticFixtures(unittest.TestCase):

    def test_all_documents_exist(self):
        for filename in (
            "hospital_a.txt",
            "hospital_b.txt",
            "clinic_c.txt",
        ):
            with self.subTest(filename=filename):
                self.assertTrue((FIXTURES / filename).is_file())

    def test_patient_reference_is_consistent(self):
        for filename in (
            "hospital_a.txt",
            "hospital_b.txt",
            "clinic_c.txt",
        ):
            with self.subTest(filename=filename):
                content = read_fixture(filename)
                self.assertIn("Patient reference: SM001", content)

    def test_same_date_status_discrepancy(self):
        hospital_b = read_fixture("hospital_b.txt")
        clinic_c = read_fixture("clinic_c.txt")

        self.assertIn("18 October 2026", hospital_b)
        self.assertIn("18 October 2026", clinic_c)

        self.assertIn("StudyMed A — discontinued", hospital_b)
        self.assertIn("StudyMed A — active", clinic_c)

    def test_missing_dose_is_documented(self):
        clinic_c = read_fixture("clinic_c.txt")

        self.assertIn(
            "Dose and route: not stated",
            clinic_c
        )

    def test_documents_are_synthetic(self):
        for filename in (
            "hospital_a.txt",
            "hospital_b.txt",
            "clinic_c.txt",
        ):
            with self.subTest(filename=filename):
                content = read_fixture(filename)
                self.assertIn("fictional medication name", content)


if __name__ == "__main__":
    unittest.main()
