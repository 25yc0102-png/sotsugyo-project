import unittest

from calculator import evaluate_expression


class CalculatorTests(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(evaluate_expression("12 + 8"), 20)

    def test_subtraction(self):
        self.assertEqual(evaluate_expression("20 - 7"), 13)

    def test_multiplication(self):
        self.assertEqual(evaluate_expression("6 * 9"), 54)

    def test_division(self):
        self.assertEqual(evaluate_expression("81 / 9"), 9)

    def test_parentheses(self):
        self.assertEqual(evaluate_expression("(10 + 5) * 2"), 30)


if __name__ == "__main__":
    unittest.main()
