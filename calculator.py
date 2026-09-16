import ast
import math
import tkinter as tk


def _safe_eval(node):
    if isinstance(node, ast.Expression):
        return _safe_eval(node.body)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("数値以外は計算できません")
    if isinstance(node, ast.BinOp):
        left = _safe_eval(node.left)
        right = _safe_eval(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            if right == 0:
                raise ValueError("0で割ることはできません")
            return left / right
        if isinstance(node.op, ast.Pow):
            return left ** right
        raise ValueError("対応していない演算です")
    if isinstance(node, ast.UnaryOp):
        operand = _safe_eval(node.operand)
        if isinstance(node.op, ast.UAdd):
            return +operand
        if isinstance(node.op, ast.USub):
            return -operand
        raise ValueError("対応していない単項演算です")
    raise ValueError("計算式を解析できませんでした")


def evaluate_expression(expression):
    text = expression.strip()
    if not text:
        raise ValueError("式が空です")
    try:
        tree = ast.parse(text, mode="eval")
        result = _safe_eval(tree)
        return result
    except (SyntaxError, TypeError, ValueError):
        raise ValueError("計算式が正しくありません")


class CalculatorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Python 電卓")
        self.root.geometry("320x430")
        self.root.resizable(False, False)

        self.expression = ""

        self.display = tk.Entry(
            root,
            font=("Segoe UI", 28),
            justify="right",
            bd=10,
            relief="flat",
            bg="#f3f4f6",
        )
        self.display.grid(row=0, column=0, columnspan=4, sticky="nsew", padx=10, pady=(10, 8))

        buttons = [
            ("C", 1, 0, "action"),
            ("(", 1, 1, "symbol"),
            (")", 1, 2, "symbol"),
            ("/", 1, 3, "operator"),
            ("7", 2, 0, "digit"),
            ("8", 2, 1, "digit"),
            ("9", 2, 2, "digit"),
            ("*", 2, 3, "operator"),
            ("4", 3, 0, "digit"),
            ("5", 3, 1, "digit"),
            ("6", 3, 2, "digit"),
            ("-", 3, 3, "operator"),
            ("1", 4, 0, "digit"),
            ("2", 4, 1, "digit"),
            ("3", 4, 2, "digit"),
            ("+", 4, 3, "operator"),
            ("0", 5, 0, "digit"),
            (".", 5, 1, "digit"),
            ("=", 5, 2, "equals"),
            ("<-", 5, 3, "backspace"),
        ]

        for label, row, col, kind in buttons:
            button = tk.Button(
                root,
                text=label,
                font=("Segoe UI", 18, "bold"),
                command=lambda value=label, type_=kind: self.handle_click(value, type_),
                bg="#eaeaea" if type_ != "operator" else "#f7cb7c",
                fg="#1a1a1a",
                width=4,
                height=2,
            )
            button.grid(row=row, column=col, sticky="nsew", padx=4, pady=4)

        for i in range(4):
            root.grid_columnconfigure(i, weight=1)
        for i in range(6):
            root.grid_rowconfigure(i, weight=1)

        self.display.bind("<KeyPress>", self.handle_keypress)
        self.display.insert(0, "0")

    def handle_keypress(self, event):
        if event.keysym in {"Return", "equal"}:
            self.calculate()
        elif event.keysym == "BackSpace":
            self.backspace()
        elif event.keysym == "Escape":
            self.clear()
        elif event.char and event.char.isdigit() or event.char in ".+-*/()":
            self.append(event.char)

    def handle_click(self, value, kind):
        if kind == "digit":
            self.append(value)
        elif kind == "operator":
            self.append(value)
        elif kind == "symbol":
            self.append(value)
        elif kind == "action":
            self.clear()
        elif kind == "backspace":
            self.backspace()
        elif kind == "equals":
            self.calculate()

    def append(self, value):
        if self.display.get() == "0" and value not in {".", "+", "-", "*", "/", "(", ")"}:
            self.display.delete(0, tk.END)
        self.display.insert(tk.END, value)

    def backspace(self):
        current = self.display.get()
        if current:
            self.display.delete(len(current) - 1, tk.END)
            if not self.display.get():
                self.display.insert(0, "0")

    def clear(self):
        self.display.delete(0, tk.END)
        self.display.insert(0, "0")

    def calculate(self):
        text = self.display.get().strip()
        if not text or text == "0":
            return
        try:
            result = evaluate_expression(text)
            if isinstance(result, float) and result.is_integer():
                result = int(result)
            self.display.delete(0, tk.END)
            self.display.insert(0, str(result))
        except ValueError:
            self.display.delete(0, tk.END)
            self.display.insert(0, "Error")


def main():
    root = tk.Tk()
    CalculatorApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
