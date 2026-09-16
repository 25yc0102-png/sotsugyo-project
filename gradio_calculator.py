import ast


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


def calculate_expression(expression: str) -> str:
    text = (expression or "").strip()
    if not text:
        raise ValueError("式が空です")
    try:
        tree = ast.parse(text, mode="eval")
        result = _safe_eval(tree)
        if isinstance(result, float) and result.is_integer():
            result = int(result)
        return str(result)
    except (SyntaxError, TypeError, ValueError):
        raise ValueError("計算式が正しくありません")


try:
    import gradio as gr

    def app_interface(expression: str):
        try:
            return calculate_expression(expression)
        except ValueError as exc:
            return str(exc)

    demo = gr.Interface(
        fn=app_interface,
        inputs=gr.Textbox(label="計算式", placeholder="例: (10 + 5) * 2"),
        outputs=gr.Textbox(label="結果"),
        title="電卓",
        description="数式を入力して計算できます。",
    )

    if __name__ == "__main__":
        demo.launch()
except ImportError:
    demo = None
