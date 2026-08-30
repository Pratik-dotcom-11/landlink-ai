"""
Languages package. Exports registry and initializes English, Hindi, and Bengali handlers.
"""
from .base import BaseLanguageHandler, LanguageRegistry
from .english import EnglishLanguageHandler
from .hindi import HindiLanguageHandler
from .bengali import BengaliLanguageHandler

# Register built-in language handlers
LanguageRegistry.register(EnglishLanguageHandler())
LanguageRegistry.register(HindiLanguageHandler())
LanguageRegistry.register(BengaliLanguageHandler())

__all__ = [
    "BaseLanguageHandler",
    "LanguageRegistry",
    "EnglishLanguageHandler",
    "HindiLanguageHandler",
    "BengaliLanguageHandler",
]
