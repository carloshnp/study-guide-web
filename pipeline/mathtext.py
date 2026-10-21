"""Plain-text titles for the site's chapter and section indexes.

The guides are authored in markdown with inline LaTeX (``$\\sigma = N/A$``,
``$Ax = b$``, ``$O(n \\log n)$``), which is fine inside a page and wrong in a
title: the reader sees ``$\\phi = TL/(GJ)$`` in the browser tab, in the chapter
list and in the progress sidebar. `plain_math` renders those spans to a compact
unicode string, so a title reads "de onde sai φ = TL/(GJ)" instead of the raw
source. The chapter body keeps the original heading untouched.
"""

from __future__ import annotations

import re

MATH_RE = re.compile(r"\$\$(?P<block>.+?)\$\$|\$(?P<inline>[^$]+?)\$", re.DOTALL)

SYMBOLS: dict[str, str] = {
    "alpha": "α",
    "beta": "β",
    "gamma": "γ",
    "delta": "δ",
    "Delta": "Δ",
    "epsilon": "ε",
    "varepsilon": "ε",
    "zeta": "ζ",
    "eta": "η",
    "theta": "θ",
    "Theta": "Θ",
    "kappa": "κ",
    "lambda": "λ",
    "Lambda": "Λ",
    "mu": "μ",
    "nu": "ν",
    "xi": "ξ",
    "pi": "π",
    "Pi": "Π",
    "rho": "ρ",
    "sigma": "σ",
    "Sigma": "Σ",
    "tau": "τ",
    "upsilon": "υ",
    "phi": "φ",
    "varphi": "φ",
    "Phi": "Φ",
    "chi": "χ",
    "psi": "ψ",
    "omega": "ω",
    "Omega": "Ω",
    "le": "≤",
    "leq": "≤",
    "ge": "≥",
    "geq": "≥",
    "ne": "≠",
    "neq": "≠",
    "approx": "≈",
    "equiv": "≡",
    "sim": "~",
    "gg": "≫",
    "ll": "≪",
    "times": "×",
    "cdot": "·",
    "pm": "±",
    "infty": "∞",
    "to": "→",
    "rightarrow": "→",
    "Rightarrow": "⇒",
    "in": "∈",
    "sum": "Σ",
    "int": "∫",
    "partial": "∂",
    "sqrt": "√",
    "lvert": "|",
    "rvert": "|",
    "vert": "|",
    "cdotp": "·",
}

# Commands whose argument is text and should be kept verbatim (braces removed).
TEXT_COMMANDS = (
    "text",
    "textrm",
    "textbf",
    "textit",
    "mathrm",
    "mathbf",
    "mathit",
    "operatorname",
    "mathbb",
    "mathcal",
    "mathfrak",
    "mathsf",
    "mathtt",
    "boldsymbol",
    "mbox",
)

FUNCTION_COMMANDS = ("ln", "log", "exp", "sin", "cos", "tan", "max", "min", "lim", "sup", "inf")

SPACING_COMMANDS = ("quad", "qquad", "left", "right", "big", "Big", "bigl", "bigr", ";", ",", "!", ":", " ")

SUBSCRIPT_DIGITS = str.maketrans("0123456789+-=()", "₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎")
SUPERSCRIPT_DIGITS = str.maketrans("0123456789+-=()", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾")

SCRIPT_RE = re.compile(r"(?P<marker>[_^])\{(?P<braced>[^{}]*)\}|(?P<bare>[_^])(?P<single>[A-Za-z0-9])")
FRAC_RE = re.compile(r"\\frac\{(?P<num>[^{}]*)\}\{(?P<den>[^{}]*)\}")
SQRT_RE = re.compile(r"\\sqrt\{(?P<body>[^{}]*)\}")
TEXT_ARG_RE = re.compile(r"\\(?P<command>%s)\{(?P<body>[^{}]*)\}" % "|".join(TEXT_COMMANDS))
COMMAND_RE = re.compile(r"\\(?P<command>[A-Za-z]+)")


def _script(marker: str, body: str) -> str:
    table = SUBSCRIPT_DIGITS if marker == "_" else SUPERSCRIPT_DIGITS
    converted = body.translate(table)
    if converted != body:
        return converted
    return f"{marker}{body}" if marker == "_" else f"^{body}"


def _plain_span(span: str) -> str:
    """Turn the inside of a ``$...$`` span into readable text."""
    text = span
    text = FRAC_RE.sub(lambda match: f"{match.group('num')}/{match.group('den')}", text)
    text = SQRT_RE.sub(lambda match: f"√{match.group('body')}", text)
    text = TEXT_ARG_RE.sub(lambda match: match.group("body"), text)
    text = SCRIPT_RE.sub(
        lambda match: _script(
            match.group("marker") or match.group("bare"),
            match.group("braced") if match.group("braced") is not None else match.group("single"),
        ),
        text,
    )
    text = re.sub(r"\\[,;:! ]", " ", text)
    text = re.sub(r"\\(?:%s)\b" % "|".join(SPACING_COMMANDS), " ", text)

    def command(match: re.Match[str]) -> str:
        name = match.group("command")
        if name in SYMBOLS:
            return SYMBOLS[name]
        if name in FUNCTION_COMMANDS:
            return name
        return name

    text = COMMAND_RE.sub(command, text)
    text = text.replace("{,}", ",").replace("{", "").replace("}", "")
    text = text.replace("~", " ")
    return re.sub(r"\s{2,}", " ", text).strip()


def plain_math(text: str) -> str:
    """Replace every inline or display math span in `text` by plain unicode."""
    if "$" not in text:
        return text
    converted = MATH_RE.sub(
        lambda match: _plain_span(
            match.group("block") if match.group("block") is not None else match.group("inline")
        ),
        text,
    )
    return re.sub(r"\s{2,}", " ", converted).strip()
