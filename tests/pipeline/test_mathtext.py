from __future__ import annotations

from pipeline.mathtext import plain_math


def test_title_without_math_is_untouched() -> None:
    assert plain_math("Grandezas fundamentais e unidades") == "Grandezas fundamentais e unidades"


def test_greek_letters_become_unicode() -> None:
    assert (
        plain_math(r"Deformação por torção: a distorção $\gamma$ e o ângulo de rotação $\phi$")
        == "Deformação por torção: a distorção γ e o ângulo de rotação φ"
    )


def test_text_commands_lose_their_wrapper() -> None:
    assert plain_math(r"A estabilidade do composto $\text{Mg}_2\text{Si}$") == (
        "A estabilidade do composto Mg₂Si"
    )


def test_relation_and_function_symbols() -> None:
    assert plain_math(r"$|m_{jk}| \le 1$") == "|m_jk| ≤ 1"
    assert plain_math(r"$O(n \log n)$") == "O(n log n)"
    assert plain_math(r"$1/\sqrt{d_k}$") == "1/√d_k"
    assert plain_math(r"$b^2 \gg 4ac$") == "b² ≫ 4ac"


def test_fraction_and_decimal_comma() -> None:
    assert plain_math(r"Por que $0{,}1$ não é binário") == "Por que 0,1 não é binário"
    assert plain_math(r"a forma $\frac{a}{b}$ do quociente") == "a forma a/b do quociente"


def test_display_math_span() -> None:
    assert plain_math(r"O sistema $$\sigma = \frac{N}{A}$$ fecha") == "O sistema σ = N/A fecha"


def test_unknown_command_keeps_its_name() -> None:
    assert plain_math(r"$\mathbf{x} \in \mathbb{R}^n$") == "x ∈ R^n"
